import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { createServer as createViteServer } from 'vite';
import { createInitialSeedState } from './src/data/seedData.ts';
import {
  computeDashboardStats,
  computeNextPostStatusOnTeacherEdit,
  createDefaultTeacherPermissions,
  evaluateTeacherAuthorization,
} from './src/domain/governance.ts';
import type {
  AdminUser,
  DatabaseState,
  NotificationItem,
  PermissionKey,
  TeacherActionType,
  TeacherPermissions,
} from './src/domain/types.ts';

const PORT = Number(process.env.PORT || 3002);
const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  crypto.randomBytes(32).toString('hex');

interface SessionRecord {
  uid: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin';
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  adminSession?: SessionRecord;
}

// Shared backend state store
const dbState: DatabaseState = createInitialSeedState();
let initialSetupClaimed = false;
const revokedTokens = new Set<string>();

function signJwtToken(payload: Omit<SessionRecord, 'iat' | 'exp'>, ttlSeconds = 12 * 60 * 60): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload: SessionRecord = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const signingInput = `${header}.${body}`;
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${sig}`;
}

function verifyJwtToken(token: string): SessionRecord | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sig] = parts;
  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
      alg?: string;
      typ?: string;
    };
    if (header.alg !== 'HS256') return null;

    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const parsed = JSON.parse(
      Buffer.from(bodyB64, 'base64url').toString('utf8')
    ) as SessionRecord;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!parsed.exp || nowSeconds >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getLiveKitConfig() {
  const url = process.env.LIVEKIT_URL?.trim() || '';
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() || '';
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() || '';
  return {
    configured: Boolean(url && apiKey && apiSecret),
    url,
    apiKey,
    apiSecret,
  };
}

function appendAudit(
  actor: SessionRecord,
  action: string,
  targetType: string,
  targetId: string,
  summary: string
) {
  dbState.auditLogs.unshift({
    id: `log_${crypto.randomBytes(4).toString('hex')}`,
    actorId: actor.uid,
    actorEmail: actor.email,
    action,
    targetType,
    targetId,
    summary,
    createdAt: new Date().toISOString(),
  });
}

function pushNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) {
  dbState.notifications.unshift({
    ...item,
    id: `notif_${crypto.randomBytes(4).toString('hex')}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const session = verifyJwtToken(token);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired Super Admin session.' });
    return;
  }

  const authorizedAdmin = dbState.admins.find(
    (a) => a.uid === session.uid && a.email.toLowerCase() === session.email.toLowerCase()
  );
  if (!authorizedAdmin) {
    res.status(403).json({ error: 'Administrator account is no longer authorized.' });
    return;
  }

  req.adminSession = session;
  next();
}

function buildAdminPayload() {
  return {
    state: dbState,
    stats: computeDashboardStats(dbState),
    livekitConfigured: getLiveKitConfig().configured,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // =========================================================================
  // 1. AUTHENTICATION & INITIAL SETUP (Protected Super Admin Access via JWT)
  // =========================================================================
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    res.json({
      setupRequired: !initialSetupClaimed,
      authMode: 'jwt',
      livekitConfigured: getLiveKitConfig().configured,
      schoolName: dbState.siteSettings.schoolName,
      schoolLogo: dbState.siteSettings.schoolLogo,
    });
  });

  // First-run initial Super Admin setup (locks permanently once claimed)
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    if (initialSetupClaimed) {
      res.status(409).json({
        error: 'Initial Super Admin has already been configured. Sign in with your authorized email.',
      });
      return;
    }
    const { email, fullName } = req.body as {
      email?: string;
      fullName?: string;
    };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'A valid administrator email is required.' });
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      res.status(400).json({ error: 'Administrator full name is required.' });
      return;
    }

    const primaryAdmin = dbState.admins[0];
    const uid = primaryAdmin ? primaryAdmin.uid : 'admin_primary';
    const now = new Date().toISOString();

    if (primaryAdmin) {
      primaryAdmin.email = cleanEmail;
      primaryAdmin.fullName = cleanName;
      primaryAdmin.lastLoginAt = now;
    } else {
      dbState.admins.push({
        uid,
        email: cleanEmail,
        fullName: cleanName,
        role: 'super_admin',
        createdBy: 'initial_setup',
        createdAt: now,
        lastLoginAt: now,
      });
    }

    initialSetupClaimed = true;

    const token = signJwtToken({
      uid,
      email: cleanEmail,
      fullName: cleanName,
      role: 'super_admin',
    });
    const session = verifyJwtToken(token)!;
    appendAudit(
      session,
      'INITIAL_ADMIN_SETUP',
      'admin',
      uid,
      `Configured primary Super Admin (${cleanEmail}).`
    );
    res.status(201).json({
      token,
      admin: dbState.admins.find((a) => a.email.toLowerCase() === cleanEmail),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    if (!initialSetupClaimed) {
      res.status(409).json({
        error: 'Initial Super Admin setup must be completed first.',
      });
      return;
    }
    const { email } = req.body as { email?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'A valid administrator email is required.' });
      return;
    }

    const adminProfile = dbState.admins.find(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    if (!adminProfile) {
      res.status(403).json({
        error: 'Account is not authorized as a Sunshine School Super Admin.',
      });
      return;
    }

    adminProfile.lastLoginAt = new Date().toISOString();
    const token = signJwtToken({
      uid: adminProfile.uid,
      email: adminProfile.email,
      fullName: adminProfile.fullName,
      role: adminProfile.role,
    });
    const session = verifyJwtToken(token)!;
    appendAudit(
      session,
      'ADMIN_LOGIN',
      'admin',
      adminProfile.uid,
      `Super Admin signed in via JWT session (${adminProfile.email}).`
    );
    res.json({ token, admin: adminProfile });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) {
      revokedTokens.add(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const admin = dbState.admins.find(
      (a) => a.uid === session.uid || a.email.toLowerCase() === session.email.toLowerCase()
    );
    res.json({
      admin: admin || {
        uid: session.uid,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
        createdAt: new Date().toISOString(),
      },
    });
  });

  // =========================================================================
  // 2. PROTECTED SUPER ADMIN ENDPOINTS
  // =========================================================================
  app.get('/api/admin/state', requireSuperAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json(buildAdminPayload());
  });

  // Only existing authorized Super Admins can create additional administrators
  app.post('/api/admin/admins', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const { email, fullName, role } = req.body as {
      email?: string;
      fullName?: string;
      role?: 'super_admin' | 'admin';
    };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanName || cleanName.length < 2) {
      res.status(400).json({
        error: 'Valid administrator email and full name are required.',
      });
      return;
    }
    if (dbState.admins.some((a) => a.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'An administrator with this email already exists.' });
      return;
    }
    const uid = `admin_${crypto.randomBytes(5).toString('hex')}`;
    const newAdmin: AdminUser = {
      uid,
      email: cleanEmail,
      fullName: cleanName,
      role: role === 'admin' ? 'admin' : 'super_admin',
      createdBy: session.uid,
      createdAt: new Date().toISOString(),
    };
    dbState.admins.push(newAdmin);
    appendAudit(
      session,
      'CREATE_ADMIN',
      'admin',
      uid,
      `Authorized administrator account ${cleanName} (${cleanEmail}) with role ${newAdmin.role}.`
    );
    res.status(201).json(buildAdminPayload());
  });

  // Teacher Approval / Management / Permissions
  app.post('/api/admin/teachers/:id/approve', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const teacher = dbState.teachers.find((t) => t.uid === req.params.id);
    if (!teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }
    teacher.status = 'approved';
    teacher.rejectionReason = undefined;
    teacher.suspensionReason = undefined;
    teacher.reviewedAt = new Date().toISOString();
    teacher.reviewedBy = session.uid;
    if (!dbState.teacherPermissions[teacher.uid]) {
      dbState.teacherPermissions[teacher.uid] = createDefaultTeacherPermissions(
        teacher.uid,
        session.uid
      );
    } else {
      dbState.teacherPermissions[teacher.uid].isSuspended = false;
      dbState.teacherPermissions[teacher.uid].updatedAt = new Date().toISOString();
      dbState.teacherPermissions[teacher.uid].updatedBy = session.uid;
    }
    pushNotification({
      recipientRole: 'teacher',
      recipientId: teacher.uid,
      category: 'moderation_decision',
      title: 'Teacher Account Approved',
      message: 'Your Sunshine School teacher registration has been approved. You may now sign in.',
      targetId: teacher.uid,
    });
    appendAudit(
      session,
      'APPROVE_TEACHER',
      'teacher',
      teacher.uid,
      `Approved teacher registration for ${teacher.fullName} (${teacher.employeeId}).`
    );
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/teachers/:id/reject', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const { reason } = req.body as { reason?: string };
    const teacher = dbState.teachers.find((t) => t.uid === req.params.id);
    if (!teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }
    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      res.status(400).json({ error: 'A rejection reason is required.' });
      return;
    }
    teacher.status = 'rejected';
    teacher.rejectionReason = cleanReason;
    teacher.reviewedAt = new Date().toISOString();
    teacher.reviewedBy = session.uid;
    pushNotification({
      recipientRole: 'teacher',
      recipientId: teacher.uid,
      category: 'moderation_decision',
      title: 'Teacher Registration Rejected',
      message: `Your registration was declined: ${cleanReason}`,
      targetId: teacher.uid,
    });
    appendAudit(
      session,
      'REJECT_TEACHER',
      'teacher',
      teacher.uid,
      `Rejected ${teacher.fullName}: ${cleanReason}`
    );
    res.json(buildAdminPayload());
  });

  app.patch('/api/admin/teachers/:id', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const teacher = dbState.teachers.find((t) => t.uid === req.params.id);
    if (!teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }
    const { fullName, phone, department, designation, employeeId } = req.body as Partial<{
      fullName: string;
      phone: string;
      department: string;
      designation: string;
      employeeId: string;
    }>;
    if (fullName?.trim()) teacher.fullName = fullName.trim();
    if (phone !== undefined) teacher.phone = phone.trim();
    if (department?.trim()) teacher.department = department.trim();
    if (designation?.trim()) teacher.designation = designation.trim();
    if (employeeId?.trim()) teacher.employeeId = employeeId.trim();
    appendAudit(
      session,
      'UPDATE_TEACHER',
      'teacher',
      teacher.uid,
      `Updated profile metadata for ${teacher.fullName}.`
    );
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/teachers/:id/suspend', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const { suspended, reason } = req.body as { suspended?: boolean; reason?: string };
    const teacher = dbState.teachers.find((t) => t.uid === req.params.id);
    if (!teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }
    const nextSuspended = Boolean(suspended);
    teacher.status = nextSuspended ? 'suspended' : 'approved';
    teacher.suspensionReason = nextSuspended
      ? (reason || 'Suspended by Super Admin').trim()
      : undefined;
    teacher.reviewedAt = new Date().toISOString();
    teacher.reviewedBy = session.uid;

    if (!dbState.teacherPermissions[teacher.uid]) {
      dbState.teacherPermissions[teacher.uid] = createDefaultTeacherPermissions(
        teacher.uid,
        session.uid
      );
    }
    dbState.teacherPermissions[teacher.uid].isSuspended = nextSuspended;
    dbState.teacherPermissions[teacher.uid].updatedAt = new Date().toISOString();
    dbState.teacherPermissions[teacher.uid].updatedBy = session.uid;

    appendAudit(
      session,
      nextSuspended ? 'SUSPEND_TEACHER' : 'REACTIVATE_TEACHER',
      'teacher',
      teacher.uid,
      `${nextSuspended ? 'Suspended' : 'Reactivated'} teacher ${teacher.fullName}.`
    );
    res.json(buildAdminPayload());
  });

  app.delete('/api/admin/teachers/:id', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const idx = dbState.teachers.findIndex((t) => t.uid === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }
    const [removed] = dbState.teachers.splice(idx, 1);
    delete dbState.teacherPermissions[removed.uid];
    appendAudit(
      session,
      'DELETE_TEACHER',
      'teacher',
      removed.uid,
      `Deleted teacher account ${removed.fullName} (${removed.email}).`
    );
    res.json(buildAdminPayload());
  });

  app.put('/api/admin/teachers/:id/permissions', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const teacher = dbState.teachers.find((t) => t.uid === req.params.id);
    if (!teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }
    const current =
      dbState.teacherPermissions[teacher.uid] ||
      createDefaultTeacherPermissions(teacher.uid, session.uid);

    const allowedKeys: PermissionKey[] = [
      'allowDashboardAccess',
      'allowCreatePosts',
      'allowPhotoUploads',
      'allowVideoUploads',
      'allowAdvertisementSubmission',
      'allowLiveStreamingRequests',
      'allowLiveBroadcasting',
      'allowEventCreation',
      'allowCommentsAndInteractions',
      'isSuspended',
    ];
    const updates = req.body as Partial<Record<PermissionKey, boolean>>;
    const next: TeacherPermissions = { ...current };
    for (const key of allowedKeys) {
      if (typeof updates[key] === 'boolean') {
        next[key] = updates[key]!;
      }
    }
    next.updatedAt = new Date().toISOString();
    next.updatedBy = session.uid;
    dbState.teacherPermissions[teacher.uid] = next;

    if (typeof updates.isSuspended === 'boolean') {
      teacher.status = updates.isSuspended ? 'suspended' : 'approved';
      if (!updates.isSuspended) {
        teacher.suspensionReason = undefined;
      }
    }

    appendAudit(
      session,
      'UPDATE_TEACHER_PERMISSIONS',
      'teacherPermissions',
      teacher.uid,
      `Updated permission matrix for ${teacher.fullName} (suspended=${next.isSuspended}).`
    );
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/teachers/:id/check-guard', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { action } = req.body as { action?: TeacherActionType };
    if (!action) {
      res.status(400).json({ error: 'action is required.' });
      return;
    }
    const teacher = dbState.teachers.find((t) => t.uid === req.params.id);
    const perms = dbState.teacherPermissions[req.params.id];
    const check = evaluateTeacherAuthorization(teacher, perms, action);
    res.json({
      allowed: check.allowed,
      reason: check.reason,
      enforcedStatus: check.allowed ? 200 : 403,
    });
  });

  // Posts Moderation
  app.post('/api/admin/posts/:id/moderate', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const { status, rejectionReason } = req.body as {
      status?: 'approved' | 'rejected' | 'pending';
      rejectionReason?: string;
    };
    const post = dbState.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Valid moderation status is required.' });
      return;
    }
    if (status === 'rejected' && !(rejectionReason || '').trim()) {
      res.status(400).json({ error: 'Rejection reason is required when rejecting a post.' });
      return;
    }
    post.status = status;
    post.rejectionReason = status === 'rejected' ? rejectionReason?.trim() : undefined;
    post.reviewedBy = session.uid;
    post.updatedAt = new Date().toISOString();

    pushNotification({
      recipientRole: 'teacher',
      recipientId: post.teacherId,
      category: 'moderation_decision',
      title: `Post ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Moved to Pending'}`,
      message:
        status === 'approved'
          ? `"${post.caption}" is now published on Sunshine School Social.`
          : status === 'rejected'
          ? `"${post.caption}" was rejected: ${post.rejectionReason}`
          : `"${post.caption}" requires re-approval.`,
      targetId: post.id,
    });
    appendAudit(
      session,
      `POST_${status.toUpperCase()}`,
      'post',
      post.id,
      `${status} post "${post.caption}" by ${post.teacherName}.`
    );
    res.json(buildAdminPayload());
  });

  app.patch('/api/admin/posts/:id', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const post = dbState.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { caption, description, category } = req.body as Partial<{
      caption: string;
      description: string;
      category: string;
    }>;
    if (caption?.trim()) post.caption = caption.trim();
    if (description !== undefined) post.description = description.trim();
    if (category?.trim()) post.category = category.trim();
    post.updatedAt = new Date().toISOString();
    appendAudit(
      session,
      'EDIT_POST',
      'post',
      post.id,
      `Edited caption/details for post "${post.caption}".`
    );
    res.json(buildAdminPayload());
  });

  app.delete('/api/admin/posts/:id', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const idx = dbState.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const [removed] = dbState.posts.splice(idx, 1);
    appendAudit(
      session,
      'DELETE_POST',
      'post',
      removed.id,
      `Deleted post "${removed.caption}" by ${removed.teacherName}.`
    );
    res.json(buildAdminPayload());
  });

  // Advertisements Management
  app.post('/api/admin/advertisements/:id/moderate', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const ad = dbState.advertisements.find((a) => a.id === req.params.id);
    if (!ad) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }
    const {
      status,
      isActive,
      rejectionReason,
      title,
      description,
      destinationUrl,
      startDate,
      endDate,
    } = req.body as Partial<{
      status: 'pending' | 'approved' | 'rejected';
      isActive: boolean;
      rejectionReason: string;
      title: string;
      description: string;
      destinationUrl: string;
      startDate: string;
      endDate: string;
    }>;

    if (status === 'rejected' && !(rejectionReason || '').trim()) {
      res.status(400).json({ error: 'Rejection reason is required.' });
      return;
    }
    if (status) {
      ad.status = status;
      if (status === 'approved' && isActive === undefined) {
        ad.isActive = true;
      }
      if (status !== 'approved') {
        ad.isActive = false;
      }
      ad.rejectionReason = status === 'rejected' ? rejectionReason?.trim() : undefined;
    }
    if (typeof isActive === 'boolean') {
      ad.isActive = ad.status === 'approved' ? isActive : false;
    }
    if (title?.trim()) ad.title = title.trim();
    if (description !== undefined) ad.description = description.trim();
    if (destinationUrl?.trim()) ad.destinationUrl = destinationUrl.trim();
    if (startDate?.trim()) ad.startDate = startDate.trim();
    if (endDate?.trim()) ad.endDate = endDate.trim();
    ad.reviewedBy = session.uid;

    if (status) {
      pushNotification({
        recipientRole: 'teacher',
        recipientId: ad.teacherId,
        category: 'moderation_decision',
        title: `Advertisement ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message:
          status === 'approved'
            ? `"${ad.title}" has been approved for the Sunshine School sidebar.`
            : `"${ad.title}" was rejected: ${ad.rejectionReason}`,
        targetId: ad.id,
      });
    }
    appendAudit(
      session,
      'MODERATE_ADVERTISEMENT',
      'advertisement',
      ad.id,
      `Updated advertisement "${ad.title}" (status=${ad.status}, active=${ad.isActive}).`
    );
    res.json(buildAdminPayload());
  });

  app.delete('/api/admin/advertisements/:id', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const idx = dbState.advertisements.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Advertisement not found.' });
      return;
    }
    const [removed] = dbState.advertisements.splice(idx, 1);
    appendAudit(
      session,
      'DELETE_ADVERTISEMENT',
      'advertisement',
      removed.id,
      `Deleted advertisement "${removed.title}".`
    );
    res.json(buildAdminPayload());
  });

  // Live Streaming Management & LiveKit Backend APIs
  app.post('/api/admin/live-streams/:id/moderate', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const stream = dbState.liveStreams.find((l) => l.id === req.params.id);
    if (!stream) {
      res.status(404).json({ error: 'Live stream not found.' });
      return;
    }
    const { status, rejectionReason, recordingStatus, deleteRecording } = req.body as {
      status?: 'pending' | 'approved' | 'scheduled' | 'live' | 'completed' | 'rejected';
      rejectionReason?: string;
      recordingStatus?: 'none' | 'pending_review' | 'approved' | 'rejected';
      deleteRecording?: boolean;
    };

    if (status === 'rejected' && !(rejectionReason || '').trim()) {
      res.status(400).json({ error: 'Rejection reason is required.' });
      return;
    }
    if (status) {
      stream.status = status;
      stream.rejectionReason = status === 'rejected' ? rejectionReason?.trim() : undefined;
      pushNotification({
        recipientRole: 'teacher',
        recipientId: stream.teacherId,
        category: 'moderation_decision',
        title: `Live Event ${status === 'approved' || status === 'scheduled' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Updated'}`,
        message:
          status === 'rejected'
            ? `Live stream "${stream.title}" was declined: ${stream.rejectionReason}`
            : `Live stream "${stream.title}" status is now ${status}.`,
        targetId: stream.id,
      });
    }
    if (deleteRecording) {
      stream.recordingUrl = undefined;
      stream.recordingStatus = 'none';
    } else if (recordingStatus) {
      stream.recordingStatus = recordingStatus;
    }

    appendAudit(
      session,
      'MODERATE_LIVESTREAM',
      'liveStream',
      stream.id,
      `Moderated live event "${stream.title}" (status=${stream.status}, recording=${stream.recordingStatus || 'none'}).`
    );
    res.json(buildAdminPayload());
  });

  app.get('/api/livekit/rooms', requireSuperAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const lk = getLiveKitConfig();
    if (!lk.configured) {
      res.json({
        configured: false,
        rooms: dbState.liveStreams
          .filter((l) => l.status === 'live')
          .map((l) => ({
            name: l.roomName,
            numParticipants: l.viewerCount,
            streamId: l.id,
            title: l.title,
          })),
      });
      return;
    }
    try {
      const client = new RoomServiceClient(lk.url, lk.apiKey, lk.apiSecret);
      const rooms = await client.listRooms();
      res.json({ configured: true, rooms });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to query LiveKit rooms.',
      });
    }
  });

  app.post('/api/livekit/token', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const { roomName } = req.body as { roomName?: string };
    if (!roomName) {
      res.status(400).json({ error: 'roomName is required.' });
      return;
    }
    const lk = getLiveKitConfig();
    if (!lk.configured) {
      res.json({
        configured: false,
        roomName,
        url: '',
        token: null,
        message: 'Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in Secrets to connect live WebRTC streams.',
      });
      return;
    }
    const at = new AccessToken(lk.apiKey, lk.apiSecret, {
      identity: `superadmin_${session.uid}`,
      name: `${session.fullName} (Super Admin Monitor)`,
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: false,
      canSubscribe: true,
    });
    const jwt = await at.toJwt();
    res.json({ configured: true, roomName, url: lk.url, token: jwt });
  });

  app.post('/api/livekit/rooms/:streamId/stop', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const stream = dbState.liveStreams.find((l) => l.id === req.params.streamId);
    if (!stream) {
      res.status(404).json({ error: 'Live stream not found.' });
      return;
    }
    const lk = getLiveKitConfig();
    let livekitTerminated = false;
    if (lk.configured) {
      try {
        const client = new RoomServiceClient(lk.url, lk.apiKey, lk.apiSecret);
        await client.deleteRoom(stream.roomName);
        livekitTerminated = true;
      } catch {
        // Room may already be closed on LiveKit server; proceed to terminate local state
      }
    }

    stream.status = 'completed';
    stream.endedAt = new Date().toISOString();
    if (!stream.recordingUrl) {
      stream.recordingUrl = '/media/homecoming-recording.mp4';
    }
    stream.recordingStatus = 'pending_review';

    pushNotification({
      recipientRole: 'teacher',
      recipientId: stream.teacherId,
      category: 'system',
      title: 'Live Broadcast Terminated by Super Admin',
      message: `Your live stream "${stream.title}" was stopped immediately by Super Admin.`,
      targetId: stream.id,
    });
    appendAudit(
      session,
      'TERMINATE_LIVESTREAM',
      'liveStream',
      stream.id,
      `Immediately terminated active live stream "${stream.title}" (room=${stream.roomName}, livekitApi=${livekitTerminated}).`
    );
    res.json({ ...buildAdminPayload(), livekitTerminated });
  });

  // Public Users, Reports, Notifications, Website Settings
  app.post('/api/admin/users/:id/status', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const user = dbState.users.find((u) => u.uid === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Public user not found.' });
      return;
    }
    const { status, reason } = req.body as { status?: 'active' | 'suspended'; reason?: string };
    if (!status || !['active', 'suspended'].includes(status)) {
      res.status(400).json({ error: 'Valid user status is required.' });
      return;
    }
    user.status = status;
    user.suspensionReason = status === 'suspended' ? (reason || 'Policy violation').trim() : undefined;
    appendAudit(
      session,
      status === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
      'user',
      user.uid,
      `${status === 'suspended' ? 'Suspended' : 'Reactivated'} public user ${user.fullName}.`
    );
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/reports/:id/resolve', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const report = dbState.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    const { status, resolutionNote, removeTarget } = req.body as {
      status?: 'resolved_removed' | 'dismissed';
      resolutionNote?: string;
      removeTarget?: boolean;
    };
    if (!status || !['resolved_removed', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'Valid resolution status is required.' });
      return;
    }
    report.status = status;
    report.resolutionNote = (resolutionNote || '').trim();
    report.resolvedAt = new Date().toISOString();

    if (removeTarget && report.targetType === 'post') {
      const targetPost = dbState.posts.find((p) => p.id === report.targetId);
      if (targetPost) targetPost.status = 'rejected';
    }
    if (removeTarget && report.targetType === 'user') {
      const targetUser = dbState.users.find((u) => u.uid === report.targetId);
      if (targetUser) targetUser.status = 'suspended';
    }

    appendAudit(
      session,
      'RESOLVE_REPORT',
      'report',
      report.id,
      `Marked report on ${report.targetType} (${report.targetId}) as ${status}.`
    );
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/notifications/:id/read', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const notif = dbState.notifications.find((n) => n.id === req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    const { isRead } = req.body as { isRead?: boolean };
    notif.isRead = typeof isRead === 'boolean' ? isRead : true;
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/notifications/mark-all-read', requireSuperAdmin, (_req: AuthenticatedRequest, res: Response) => {
    for (const n of dbState.notifications) {
      if (n.recipientRole === 'super_admin') {
        n.isRead = true;
      }
    }
    res.json(buildAdminPayload());
  });

  app.post('/api/admin/settings', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    const incoming = req.body as Partial<DatabaseState['siteSettings']>;
    dbState.siteSettings = {
      ...dbState.siteSettings,
      ...incoming,
      socialLinks: {
        ...dbState.siteSettings.socialLinks,
        ...(incoming.socialLinks || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    appendAudit(
      session,
      'UPDATE_SITE_SETTINGS',
      'siteSettings',
      'global',
      `Updated Sunshine School Website Settings (teacherRegistrationEnabled=${dbState.siteSettings.teacherRegistrationEnabled}).`
    );
    res.json(buildAdminPayload());
  });

  // =========================================================================
  // 3. SHARED TEACHER & PUBLIC BACKEND ENDPOINTS (Enforces Super Admin Rules)
  // =========================================================================
  app.post('/api/teachers/register', (req: Request, res: Response) => {
    if (!dbState.siteSettings.teacherRegistrationEnabled) {
      res.status(403).json({
        error: 'Teacher registration is currently disabled by Super Admin.',
      });
      return;
    }
    const { fullName, email, phone, employeeId, department, designation } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      employeeId?: string;
      department?: string;
      designation?: string;
    };
    if (!fullName?.trim() || !email?.trim() || !employeeId?.trim() || !department?.trim()) {
      res.status(400).json({ error: 'Required teacher registration fields are missing.' });
      return;
    }
    const uid = `teacher_${crypto.randomBytes(5).toString('hex')}`;
    const newTeacher = {
      uid,
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      department: department.trim(),
      designation: designation?.trim() || 'Faculty',
      status: 'pending' as const,
      registeredAt: new Date().toISOString(),
    };
    dbState.teachers.unshift(newTeacher);
    pushNotification({
      recipientRole: 'super_admin',
      recipientId: 'admin_primary',
      category: 'teacher_registration',
      title: 'New Teacher Registration Request',
      message: `${newTeacher.fullName} (${newTeacher.department}) submitted registration for approval.`,
      targetSection: 'teacher-approvals',
      targetId: newTeacher.uid,
    });
    res.status(201).json({ teacher: newTeacher });
  });

  app.post('/api/teacher/authorize-action', (req: Request, res: Response) => {
    const { teacherId, action } = req.body as {
      teacherId?: string;
      action?: TeacherActionType;
    };
    if (!teacherId || !action) {
      res.status(400).json({ error: 'teacherId and action are required.' });
      return;
    }
    const teacher = dbState.teachers.find((t) => t.uid === teacherId);
    const perms = dbState.teacherPermissions[teacherId];
    const check = evaluateTeacherAuthorization(teacher, perms, action);
    if (!check.allowed) {
      res.status(403).json({ allowed: false, reason: check.reason });
      return;
    }
    res.json({ allowed: true, reason: check.reason });
  });

  app.post('/api/teacher/posts', (req: Request, res: Response) => {
    const { teacherId, caption, description, category, photos, videos } = req.body as {
      teacherId?: string;
      caption?: string;
      description?: string;
      category?: string;
      photos?: string[];
      videos?: string[];
    };
    const teacher = dbState.teachers.find((t) => t.uid === teacherId);
    const perms = teacherId ? dbState.teacherPermissions[teacherId] : undefined;

    const baseCheck = evaluateTeacherAuthorization(teacher, perms, 'create_post');
    if (!baseCheck.allowed) {
      res.status(403).json({ error: baseCheck.reason });
      return;
    }
    if (photos && photos.length > 0) {
      const photoCheck = evaluateTeacherAuthorization(teacher, perms, 'upload_photo');
      if (!photoCheck.allowed) {
        res.status(403).json({ error: photoCheck.reason });
        return;
      }
    }
    if (videos && videos.length > 0) {
      const videoCheck = evaluateTeacherAuthorization(teacher, perms, 'upload_video');
      if (!videoCheck.allowed) {
        res.status(403).json({ error: videoCheck.reason });
        return;
      }
    }

    const postId = `post_${crypto.randomBytes(5).toString('hex')}`;
    const newPost = {
      id: postId,
      teacherId: teacher!.uid,
      teacherName: teacher!.fullName,
      caption: (caption || '').trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      mediaType: (
        photos?.length && videos?.length
          ? 'mixed'
          : videos?.length
          ? 'video'
          : photos?.length
          ? 'photo'
          : 'text'
      ) as 'photo' | 'video' | 'mixed' | 'text',
      photos: photos || [],
      videos: videos || [],
      status: dbState.siteSettings.requirePostApproval ? ('pending' as const) : ('approved' as const),
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      videoViewsCount: 0,
      submittedAt: new Date().toISOString(),
    };
    dbState.posts.unshift(newPost);
    pushNotification({
      recipientRole: 'super_admin',
      recipientId: 'admin_primary',
      category: 'post_submission',
      title: 'New Teacher Post Submitted',
      message: `${teacher!.fullName} submitted "${newPost.caption}".`,
      targetSection: 'post-approvals',
      targetId: postId,
    });
    res.status(201).json({ post: newPost });
  });

  app.put('/api/teacher/posts/:id', (req: Request, res: Response) => {
    const post = dbState.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { teacherId, caption, description } = req.body as {
      teacherId?: string;
      caption?: string;
      description?: string;
    };
    if (!teacherId || post.teacherId !== teacherId) {
      res.status(403).json({ error: 'Only the post author can edit this post.' });
      return;
    }
    if (caption?.trim()) post.caption = caption.trim();
    if (description !== undefined) post.description = description.trim();
    post.status = computeNextPostStatusOnTeacherEdit(post.status);
    post.updatedAt = new Date().toISOString();
    res.json({ post });
  });

  app.get('/api/public/feed', (_req: Request, res: Response) => {
    res.json({
      siteSettings: dbState.siteSettings,
      posts: dbState.posts.filter((p) => p.status === 'approved'),
      advertisements: dbState.advertisements.filter(
        (a) => a.status === 'approved' && a.isActive
      ),
      liveStreams: dbState.liveStreams.filter(
        (l) =>
          l.status === 'live' ||
          l.status === 'scheduled' ||
          l.status === 'approved' ||
          (l.status === 'completed' && l.recordingStatus === 'approved')
      ),
    });
  });

  // =========================================================================
  // 4. VITE DEV MIDDLEWARE OR PRODUCTION STATIC DIST
  // =========================================================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunshine School Super Admin server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

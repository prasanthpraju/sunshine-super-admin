import type {
  AdminUser,
  DashboardStats,
  DatabaseState,
  LiveStreamStatus,
  ModerationStatus,
  PermissionKey,
  RecordingStatus,
  SiteSettings,
  TeacherActionType,
} from '../domain/types';

export interface AuthStatusResponse {
  setupRequired: boolean;
  authMode?: 'jwt';
  livekitConfigured: boolean;
  schoolName: string;
  schoolLogo: string;
}

export interface AdminPayload {
  state: DatabaseState;
  stats: DashboardStats;
  livekitConfigured: boolean;
}

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const API_BASE_URL = (RAW_API_BASE || '/api').replace(/\/+$/, '');

function buildApiUrl(endpoint: string): string {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalized}`;
}

// Keep JWT Bearer token strictly in JS memory (never localStorage/sessionStorage)
let inMemoryToken: string | null = null;

export function setSessionToken(token: string | null) {
  inMemoryToken = token;
}

export function getSessionToken(): string | null {
  return inMemoryToken;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network connection failed';
    throw new Error(`Unable to reach backend API (${API_BASE_URL}): ${detail}`);
  }

  const rawText = await res.text();
  let parsed: ({ error?: string } & T) | null = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as { error?: string } & T;
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/setup') {
      setSessionToken(null);
    }
    throw new Error(
      parsed?.error || `Request to ${endpoint} failed with status ${res.status}.`
    );
  }

  if (!parsed) {
    throw new Error(`Invalid JSON response received from ${endpoint}.`);
  }

  return parsed;
}

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  return apiRequest<AuthStatusResponse>('/auth/status');
}

export async function setupInitialAdmin(params: {
  fullName: string;
  email: string;
}): Promise<{ token: string; admin: AdminUser }> {
  const res = await apiRequest<{ token: string; admin: AdminUser }>('/auth/setup', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  setSessionToken(res.token);
  return res;
}

export async function loginAdmin(email: string): Promise<{ token: string; admin: AdminUser }> {
  const res = await apiRequest<{ token: string; admin: AdminUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  setSessionToken(res.token);
  return res;
}

export async function getCurrentAdmin(): Promise<{ admin: AdminUser }> {
  return apiRequest<{ admin: AdminUser }>('/auth/me');
}

export async function logoutAdmin(): Promise<void> {
  const hadToken = Boolean(inMemoryToken);
  try {
    if (hadToken) {
      await apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
    }
  } catch (err) {
    console.warn('Logout revocation notice:', err);
  } finally {
    setSessionToken(null);
  }
}

export async function fetchAdminState(): Promise<AdminPayload> {
  return apiRequest<AdminPayload>('/admin/state');
}

export async function createAdditionalAdmin(params: {
  fullName: string;
  email: string;
  role: 'super_admin' | 'admin';
}): Promise<AdminPayload> {
  return apiRequest<AdminPayload>('/admin/admins', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function approveTeacher(uid: string): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/teachers/${uid}/approve`, {
    method: 'POST',
  });
}

export async function rejectTeacher(uid: string, reason: string): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/teachers/${uid}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function updateTeacherInfo(
  uid: string,
  updates: {
    fullName?: string;
    phone?: string;
    department?: string;
    designation?: string;
    employeeId?: string;
  }
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/teachers/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function suspendTeacher(
  uid: string,
  suspended: boolean,
  reason?: string
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/teachers/${uid}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ suspended, reason }),
  });
}

export async function deleteTeacher(uid: string): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/teachers/${uid}`, {
    method: 'DELETE',
  });
}

export async function updateTeacherPermissions(
  uid: string,
  updates: Partial<Record<PermissionKey, boolean>>
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/teachers/${uid}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function verifyTeacherActionGuard(
  teacherId: string,
  action: TeacherActionType
): Promise<{ allowed: boolean; reason: string; status: number }> {
  const res = await apiRequest<{
    allowed: boolean;
    reason: string;
    enforcedStatus: number;
  }>(`/admin/teachers/${teacherId}/check-guard`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  return { allowed: res.allowed, reason: res.reason, status: res.enforcedStatus };
}

export async function moderatePost(
  id: string,
  status: ModerationStatus,
  rejectionReason?: string
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/posts/${id}/moderate`, {
    method: 'POST',
    body: JSON.stringify({ status, rejectionReason }),
  });
}

export async function editPost(
  id: string,
  updates: { caption?: string; description?: string; category?: string }
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deletePost(id: string): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/posts/${id}`, {
    method: 'DELETE',
  });
}

export async function moderateAdvertisement(
  id: string,
  updates: {
    status?: ModerationStatus;
    isActive?: boolean;
    rejectionReason?: string;
    title?: string;
    description?: string;
    destinationUrl?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(
    `/admin/advertisements/${id}/moderate`,
    {
      method: 'POST',
      body: JSON.stringify(updates),
    }
  );
}

export async function deleteAdvertisement(id: string): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/advertisements/${id}`, {
    method: 'DELETE',
  });
}

export async function moderateLiveStream(
  id: string,
  updates: {
    status?: LiveStreamStatus;
    rejectionReason?: string;
    recordingStatus?: RecordingStatus;
    deleteRecording?: boolean;
  }
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/live-streams/${id}/moderate`, {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function stopLiveBroadcast(
  streamId: string
): Promise<AdminPayload & { livekitTerminated: boolean }> {
  return apiRequest<AdminPayload & { livekitTerminated: boolean }>(
    `/livekit/rooms/${streamId}/stop`,
    {
      method: 'POST',
    }
  );
}

export async function getLiveKitMonitorToken(roomName: string): Promise<{
  configured: boolean;
  roomName: string;
  url: string;
  token: string | null;
  message?: string;
}> {
  return apiRequest('/livekit/token', {
    method: 'POST',
    body: JSON.stringify({ roomName }),
  });
}

export async function updatePublicUserStatus(
  uid: string,
  status: 'active' | 'suspended',
  reason?: string
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/users/${uid}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  });
}

export async function resolveReport(
  id: string,
  params: {
    status: 'resolved_removed' | 'dismissed';
    resolutionNote?: string;
    removeTarget?: boolean;
  }
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/reports/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function markNotificationRead(
  id: string,
  isRead: boolean
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>(`/admin/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({ isRead }),
  });
}

export async function markAllNotificationsRead(): Promise<AdminPayload> {
  return apiRequest<AdminPayload>('/admin/notifications/mark-all-read', {
    method: 'POST',
  });
}

export async function updateSiteSettings(
  updates: Partial<SiteSettings>
): Promise<AdminPayload> {
  return apiRequest<AdminPayload>('/admin/settings', {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function fetchPublicFeedPreview(): Promise<{
  siteSettings: SiteSettings;
  posts: DatabaseState['posts'];
  advertisements: DatabaseState['advertisements'];
  liveStreams: DatabaseState['liveStreams'];
}> {
  return apiRequest('/public/feed');
}

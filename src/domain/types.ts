export type AdminRole = 'super_admin' | 'admin';

export interface AdminUser {
  uid: string;
  email: string;
  fullName: string;
  role: AdminRole;
  avatarUrl?: string;
  createdBy?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type TeacherStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Teacher {
  uid: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  profilePhoto?: string;
  status: TeacherStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  registeredAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface TeacherPermissions {
  teacherId: string;
  allowDashboardAccess: boolean;
  allowCreatePosts: boolean;
  allowPhotoUploads: boolean;
  allowVideoUploads: boolean;
  allowAdvertisementSubmission: boolean;
  allowLiveStreamingRequests: boolean;
  allowLiveBroadcasting: boolean;
  allowEventCreation: boolean;
  allowCommentsAndInteractions: boolean;
  isSuspended: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export type PermissionKey = Exclude<
  keyof TeacherPermissions,
  'teacherId' | 'updatedAt' | 'updatedBy'
>;

export type TeacherActionType =
  | 'dashboard_access'
  | 'create_post'
  | 'upload_photo'
  | 'upload_video'
  | 'submit_advertisement'
  | 'request_live_stream'
  | 'start_live_broadcast'
  | 'create_event'
  | 'post_comment';

export interface PublicUser {
  uid: string;
  fullName: string;
  email: string;
  role: 'parent' | 'student' | 'alumni' | 'community';
  avatarUrl?: string;
  status: 'active' | 'suspended';
  suspensionReason?: string;
  createdAt: string;
}

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Post {
  id: string;
  teacherId: string;
  teacherName: string;
  caption: string;
  description?: string;
  category: string;
  mediaType: 'photo' | 'video' | 'mixed' | 'text';
  photos: string[];
  videos: string[];
  status: ModerationStatus;
  rejectionReason?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  videoViewsCount: number;
  submittedAt: string;
  updatedAt?: string;
  reviewedBy?: string;
}

export interface Advertisement {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  videoUrl?: string;
  destinationUrl: string;
  status: ModerationStatus;
  isActive: boolean;
  rejectionReason?: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  submittedAt: string;
  reviewedBy?: string;
}

export type LiveStreamStatus =
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'rejected';

export type RecordingStatus = 'none' | 'pending_review' | 'approved' | 'rejected';

export interface LiveStream {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  category: string;
  thumbnailUrl?: string;
  roomName: string;
  status: LiveStreamStatus;
  rejectionReason?: string;
  viewerCount: number;
  durationSeconds: number;
  recordingUrl?: string;
  recordingStatus?: RecordingStatus;
  scheduledAt: string;
  requestedAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'user' | 'admin';
  body: string;
  status: 'visible' | 'flagged' | 'removed';
  createdAt: string;
}

export interface LikeItem {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export type NotificationCategory =
  | 'teacher_registration'
  | 'post_submission'
  | 'ad_submission'
  | 'live_request'
  | 'content_report'
  | 'moderation_decision'
  | 'system';

export interface NotificationItem {
  id: string;
  recipientRole: 'super_admin' | 'teacher';
  recipientId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  isRead: boolean;
  targetSection?: NavSection;
  targetId?: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'post' | 'comment' | 'user' | 'liveStream';
  targetId: string;
  targetPreview?: string;
  reason: string;
  status: 'open' | 'resolved_removed' | 'dismissed';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface SiteSettings {
  schoolName: string;
  schoolLogo: string;
  schoolProfileImage: string;
  websiteDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    youtube: string;
    x: string;
  };
  teacherRegistrationEnabled: boolean;
  publicRegistrationEnabled: boolean;
  requirePostApproval: boolean;
  requireAdApproval: boolean;
  requireLiveApproval: boolean;
  autoFilterFlaggedComments: boolean;
  maxLiveDurationMinutes: number;
  maxConcurrentAds: number;
  updatedAt: string;
}

export interface DashboardStats {
  totalTeachers: number;
  pendingTeacherRegistrations: number;
  approvedTeachers: number;
  suspendedTeachers: number;
  totalPublicUsers: number;
  totalPosts: number;
  pendingPosts: number;
  approvedPosts: number;
  totalPhotos: number;
  totalVideos: number;
  pendingAdvertisements: number;
  activeAdvertisements: number;
  pendingLiveRequests: number;
  activeLiveStreams: number;
  totalLikes: number;
  totalShares: number;
  totalVideoViews: number;
}

export interface DatabaseState {
  admins: AdminUser[];
  teachers: Teacher[];
  teacherPermissions: Record<string, TeacherPermissions>;
  users: PublicUser[];
  posts: Post[];
  advertisements: Advertisement[];
  liveStreams: LiveStream[];
  comments: CommentItem[];
  likes: LikeItem[];
  notifications: NotificationItem[];
  reports: ReportItem[];
  auditLogs: AuditLog[];
  siteSettings: SiteSettings;
}

export type NavSection =
  | 'dashboard'
  | 'teacher-management'
  | 'teacher-approvals'
  | 'teacher-permissions'
  | 'public-users'
  | 'all-posts'
  | 'post-approvals'
  | 'photos'
  | 'videos'
  | 'advertisements'
  | 'advertisement-approvals'
  | 'live-streaming'
  | 'live-approvals'
  | 'active-live-streams'
  | 'completed-live-streams'
  | 'content-reports'
  | 'notifications'
  | 'website-settings';

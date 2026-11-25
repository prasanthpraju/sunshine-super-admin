import type {
  DashboardStats,
  DatabaseState,
  ModerationStatus,
  Post,
  Teacher,
  TeacherActionType,
  TeacherPermissions,
} from './types';

export function createDefaultTeacherPermissions(
  teacherId: string,
  updatedBy = 'system'
): TeacherPermissions {
  return {
    teacherId,
    allowDashboardAccess: true,
    allowCreatePosts: true,
    allowPhotoUploads: true,
    allowVideoUploads: true,
    allowAdvertisementSubmission: false,
    allowLiveStreamingRequests: true,
    allowLiveBroadcasting: false,
    allowEventCreation: true,
    allowCommentsAndInteractions: true,
    isSuspended: false,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

export function evaluateTeacherAuthorization(
  teacher: Teacher | undefined,
  permissions: TeacherPermissions | undefined,
  action: TeacherActionType
): { allowed: boolean; reason: string } {
  if (!teacher) {
    return { allowed: false, reason: 'Teacher account not found.' };
  }
  if (teacher.status === 'pending') {
    return {
      allowed: false,
      reason: 'Teacher registration is pending Super Admin approval.',
    };
  }
  if (teacher.status === 'rejected') {
    return {
      allowed: false,
      reason: 'Teacher registration was rejected by Super Admin.',
    };
  }
  if (teacher.status === 'suspended' || permissions?.isSuspended) {
    return {
      allowed: false,
      reason: 'Teacher account is suspended. Suspension overrides all permissions.',
    };
  }
  if (!permissions) {
    return {
      allowed: false,
      reason: 'Teacher permissions profile has not been initialized.',
    };
  }
  if (!permissions.allowDashboardAccess) {
    return {
      allowed: false,
      reason: 'Dashboard access is disabled for this teacher.',
    };
  }

  switch (action) {
    case 'dashboard_access':
      return { allowed: true, reason: 'Dashboard access authorized.' };
    case 'create_post':
      return permissions.allowCreatePosts
        ? { allowed: true, reason: 'Post creation authorized.' }
        : { allowed: false, reason: 'Allow Create Posts permission is disabled.' };
    case 'upload_photo':
      return permissions.allowCreatePosts && permissions.allowPhotoUploads
        ? { allowed: true, reason: 'Photo upload authorized.' }
        : {
            allowed: false,
            reason: !permissions.allowCreatePosts
              ? 'Allow Create Posts permission is disabled.'
              : 'Allow Photo Uploads permission is disabled.',
          };
    case 'upload_video':
      return permissions.allowCreatePosts && permissions.allowVideoUploads
        ? { allowed: true, reason: 'Video upload authorized.' }
        : {
            allowed: false,
            reason: !permissions.allowCreatePosts
              ? 'Allow Create Posts permission is disabled.'
              : 'Allow Video Uploads permission is disabled.',
          };
    case 'submit_advertisement':
      return permissions.allowAdvertisementSubmission
        ? { allowed: true, reason: 'Advertisement submission authorized.' }
        : {
            allowed: false,
            reason: 'Allow Advertisement Submission permission is disabled.',
          };
    case 'request_live_stream':
      return permissions.allowLiveStreamingRequests
        ? { allowed: true, reason: 'Live streaming request authorized.' }
        : {
            allowed: false,
            reason: 'Allow Live Streaming Requests permission is disabled.',
          };
    case 'start_live_broadcast':
      return permissions.allowLiveBroadcasting
        ? { allowed: true, reason: 'Live broadcasting authorized.' }
        : {
            allowed: false,
            reason: 'Allow Live Broadcasting permission is disabled.',
          };
    case 'create_event':
      return permissions.allowEventCreation
        ? { allowed: true, reason: 'Event creation authorized.' }
        : { allowed: false, reason: 'Allow Event Creation permission is disabled.' };
    case 'post_comment':
      return permissions.allowCommentsAndInteractions
        ? { allowed: true, reason: 'Comments and interactions authorized.' }
        : {
            allowed: false,
            reason: 'Allow Comments and Interactions permission is disabled.',
          };
  }
}

export function computeDashboardStats(state: DatabaseState): DashboardStats {
  const suspendedTeacherCount = state.teachers.filter(
    (t) =>
      t.status === 'suspended' ||
      Boolean(state.teacherPermissions[t.uid]?.isSuspended)
  ).length;

  const totalPhotos = state.posts.reduce(
    (acc, post) => acc + (post.photos?.length ?? 0),
    0
  );
  const totalVideos = state.posts.reduce(
    (acc, post) => acc + (post.videos?.length ?? 0),
    0
  );

  const totalLikesFromPosts = state.posts.reduce(
    (acc, post) => acc + (post.likesCount ?? 0),
    0
  );

  return {
    totalTeachers: state.teachers.length,
    pendingTeacherRegistrations: state.teachers.filter(
      (t) => t.status === 'pending'
    ).length,
    approvedTeachers: state.teachers.filter(
      (t) =>
        t.status === 'approved' && !state.teacherPermissions[t.uid]?.isSuspended
    ).length,
    suspendedTeachers: suspendedTeacherCount,
    totalPublicUsers: state.users.length,
    totalPosts: state.posts.length,
    pendingPosts: state.posts.filter((p) => p.status === 'pending').length,
    approvedPosts: state.posts.filter((p) => p.status === 'approved').length,
    totalPhotos,
    totalVideos,
    pendingAdvertisements: state.advertisements.filter(
      (a) => a.status === 'pending'
    ).length,
    activeAdvertisements: state.advertisements.filter(
      (a) => a.status === 'approved' && a.isActive
    ).length,
    pendingLiveRequests: state.liveStreams.filter((l) => l.status === 'pending')
      .length,
    activeLiveStreams: state.liveStreams.filter((l) => l.status === 'live')
      .length,
    totalLikes: Math.max(totalLikesFromPosts, state.likes.length),
    totalShares: state.posts.reduce((acc, p) => acc + (p.sharesCount ?? 0), 0),
    totalVideoViews: state.posts.reduce(
      (acc, p) => acc + (p.videoViewsCount ?? 0),
      0
    ),
  };
}

export function computeAdCtr(impressions: number, clicks: number): number {
  if (!impressions || impressions <= 0) {
    return 0;
  }
  return Number(((clicks / impressions) * 100).toFixed(2));
}

export function computeNextPostStatusOnTeacherEdit(
  currentStatus: ModerationStatus
): ModerationStatus {
  if (currentStatus === 'approved') {
    return 'pending';
  }
  return 'pending';
}

export interface PostFilters {
  status?: ModerationStatus | 'all';
  mediaType?: 'all' | 'photo' | 'video';
  teacherId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function filterPosts(posts: Post[], filters: PostFilters): Post[] {
  const searchLower = filters.search?.trim().toLowerCase() ?? '';
  return posts.filter((post) => {
    if (filters.status && filters.status !== 'all' && post.status !== filters.status) {
      return false;
    }
    if (filters.mediaType === 'photo' && (post.photos?.length ?? 0) === 0) {
      return false;
    }
    if (filters.mediaType === 'video' && (post.videos?.length ?? 0) === 0) {
      return false;
    }
    if (filters.teacherId && filters.teacherId !== 'all' && post.teacherId !== filters.teacherId) {
      return false;
    }
    const postDay = post.submittedAt.slice(0, 10);
    if (filters.dateFrom && postDay < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && postDay > filters.dateTo) {
      return false;
    }
    if (searchLower) {
      const hay = `${post.caption} ${post.description ?? ''} ${post.teacherName} ${post.category}`.toLowerCase();
      if (!hay.includes(searchLower)) {
        return false;
      }
    }
    return true;
  });
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

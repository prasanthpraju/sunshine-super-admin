import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdCtr,
  computeDashboardStats,
  computeNextPostStatusOnTeacherEdit,
  createDefaultTeacherPermissions,
  evaluateTeacherAuthorization,
  filterPosts,
  formatDuration,
} from './governance';
import type { DatabaseState, Post, Teacher } from './types';

function makeTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    uid: 'teacher_1',
    employeeId: 'EMP-101',
    fullName: 'Elena Vance',
    email: 'elena@sunshineschool.edu',
    department: 'Science',
    designation: 'Senior Lecturer',
    status: 'approved',
    registeredAt: '2026-10-01T08:00:00Z',
    ...overrides,
  };
}

test('teacher authorization blocks pending, rejected, and suspended teachers regardless of switches', () => {
  const perms = createDefaultTeacherPermissions('teacher_1');
  perms.allowVideoUploads = true;
  perms.allowLiveBroadcasting = true;

  const pendingTeacher = makeTeacher({ status: 'pending' });
  assert.equal(evaluateTeacherAuthorization(pendingTeacher, perms, 'dashboard_access').allowed, false);

  const rejectedTeacher = makeTeacher({ status: 'rejected' });
  assert.equal(evaluateTeacherAuthorization(rejectedTeacher, perms, 'create_post').allowed, false);

  const approvedTeacher = makeTeacher({ status: 'approved' });
  const suspendedPerms = { ...perms, isSuspended: true };
  const result = evaluateTeacherAuthorization(approvedTeacher, suspendedPerms, 'upload_video');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /suspended/i);
});

test('teacher authorization enforces Teacher A vs Teacher B individual permission switches', () => {
  const teacherA = makeTeacher({ uid: 'teacher_a' });
  const permsA = {
    ...createDefaultTeacherPermissions('teacher_a'),
    allowDashboardAccess: true,
    allowCreatePosts: true,
    allowPhotoUploads: true,
    allowVideoUploads: true,
    allowAdvertisementSubmission: false,
    allowLiveStreamingRequests: true,
    allowLiveBroadcasting: true,
  };

  assert.equal(evaluateTeacherAuthorization(teacherA, permsA, 'upload_video').allowed, true);
  assert.equal(evaluateTeacherAuthorization(teacherA, permsA, 'submit_advertisement').allowed, false);
  assert.equal(evaluateTeacherAuthorization(teacherA, permsA, 'start_live_broadcast').allowed, true);

  const teacherB = makeTeacher({ uid: 'teacher_b' });
  const permsB = {
    ...createDefaultTeacherPermissions('teacher_b'),
    allowDashboardAccess: true,
    allowCreatePosts: true,
    allowPhotoUploads: true,
    allowVideoUploads: false,
    allowAdvertisementSubmission: true,
    allowLiveStreamingRequests: false,
    allowLiveBroadcasting: false,
  };

  assert.equal(evaluateTeacherAuthorization(teacherB, permsB, 'upload_photo').allowed, true);
  assert.equal(evaluateTeacherAuthorization(teacherB, permsB, 'upload_video').allowed, false);
  assert.equal(evaluateTeacherAuthorization(teacherB, permsB, 'submit_advertisement').allowed, true);
  assert.equal(evaluateTeacherAuthorization(teacherB, permsB, 'request_live_stream').allowed, false);
});

test('editing an approved post by a teacher always requires fresh Super Admin approval', () => {
  assert.equal(computeNextPostStatusOnTeacherEdit('approved'), 'pending');
  assert.equal(computeNextPostStatusOnTeacherEdit('rejected'), 'pending');
});

test('advertisement CTR handles zero impressions safely and rounds to 2 decimals', () => {
  assert.equal(computeAdCtr(0, 0), 0);
  assert.equal(computeAdCtr(2500, 125), 5);
  assert.equal(computeAdCtr(1234, 47), 3.81);
});

test('formatDuration formats seconds into MM:SS and HH:MM:SS', () => {
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(3661), '01:01:01');
});

test('filterPosts filters by status, media type, teacher, and search text', () => {
  const posts: Post[] = [
    {
      id: 'p1',
      teacherId: 't1',
      teacherName: 'Elena Vance',
      caption: 'Robotics Lab Demo',
      category: 'STEM',
      mediaType: 'video',
      photos: [],
      videos: ['video.mp4'],
      status: 'pending',
      likesCount: 10,
      commentsCount: 2,
      sharesCount: 1,
      videoViewsCount: 50,
      submittedAt: '2026-11-20T10:00:00Z',
    },
    {
      id: 'p2',
      teacherId: 't2',
      teacherName: 'Marcus Reed',
      caption: 'Autumn Art Exhibition',
      category: 'Arts',
      mediaType: 'photo',
      photos: ['art.jpg'],
      videos: [],
      status: 'approved',
      likesCount: 20,
      commentsCount: 4,
      sharesCount: 3,
      videoViewsCount: 0,
      submittedAt: '2026-11-21T10:00:00Z',
    },
  ];

  assert.equal(filterPosts(posts, { status: 'pending' }).length, 1);
  assert.equal(filterPosts(posts, { mediaType: 'photo' }).length, 1);
  assert.equal(filterPosts(posts, { teacherId: 't1', search: 'robotics' }).length, 1);
  assert.equal(filterPosts(posts, { dateFrom: '2026-11-21' }).length, 1);
});

test('computeDashboardStats aggregates all KPIs accurately without comments', () => {
  const state: DatabaseState = {
    admins: [],
    teachers: [
      makeTeacher({ uid: 't1', status: 'approved' }),
      makeTeacher({ uid: 't2', status: 'pending' }),
      makeTeacher({ uid: 't3', status: 'suspended' }),
    ],
    teacherPermissions: {
      t1: createDefaultTeacherPermissions('t1'),
      t3: { ...createDefaultTeacherPermissions('t3'), isSuspended: true },
    },
    users: [
      {
        uid: 'u1',
        fullName: 'Parent One',
        email: 'parent@example.com',
        role: 'parent',
        status: 'active',
        createdAt: '2026-11-01T00:00:00Z',
      },
    ],
    posts: [
      {
        id: 'p1',
        teacherId: 't1',
        teacherName: 'Elena Vance',
        caption: 'Science Fair',
        category: 'STEM',
        mediaType: 'mixed',
        photos: ['a.jpg', 'b.jpg'],
        videos: ['v.mp4'],
        status: 'approved',
        likesCount: 42,
        commentsCount: 6,
        sharesCount: 9,
        videoViewsCount: 310,
        submittedAt: '2026-11-15T12:00:00Z',
      },
    ],
    advertisements: [
      {
        id: 'ad1',
        teacherId: 't1',
        teacherName: 'Elena Vance',
        title: 'STEM Camp',
        destinationUrl: 'https://sunshineschool.edu/camp',
        status: 'approved',
        isActive: true,
        startDate: '2026-11-01T00:00:00Z',
        endDate: '2026-12-01T00:00:00Z',
        impressions: 1000,
        clicks: 80,
        submittedAt: '2026-11-01T00:00:00Z',
      },
    ],
    liveStreams: [
      {
        id: 'ls1',
        teacherId: 't1',
        teacherName: 'Elena Vance',
        title: 'Morning Assembly',
        category: 'Campus',
        roomName: 'room-assembly',
        status: 'live',
        viewerCount: 120,
        durationSeconds: 600,
        scheduledAt: '2026-11-23T09:00:00Z',
        requestedAt: '2026-11-22T09:00:00Z',
      },
    ],
    comments: [],
    likes: [],
    notifications: [],
    reports: [],
    auditLogs: [],
    siteSettings: {
      schoolName: 'Sunshine School',
      schoolLogo: '',
      schoolProfileImage: '',
      websiteDescription: 'Test',
      contactEmail: 'info@sunshineschool.edu',
      contactPhone: '555-0100',
      contactAddress: '100 Sunshine Way',
      socialLinks: { facebook: '', instagram: '', youtube: '', x: '' },
      teacherRegistrationEnabled: true,
      publicRegistrationEnabled: true,
      requirePostApproval: true,
      requireAdApproval: true,
      requireLiveApproval: true,
      autoFilterFlaggedComments: true,
      maxLiveDurationMinutes: 120,
      maxConcurrentAds: 5,
      updatedAt: '2026-11-01T00:00:00Z',
    },
  };

  const stats = computeDashboardStats(state);
  assert.equal(stats.totalTeachers, 3);
  assert.equal(stats.pendingTeacherRegistrations, 1);
  assert.equal(stats.approvedTeachers, 1);
  assert.equal(stats.suspendedTeachers, 1);
  assert.equal(stats.totalPhotos, 2);
  assert.equal(stats.totalVideos, 1);
  assert.equal(stats.activeAdvertisements, 1);
  assert.equal(stats.activeLiveStreams, 1);
  assert.equal(stats.totalLikes, 42);
  assert.equal(stats.totalShares, 9);
  assert.equal(stats.totalVideoViews, 310);
  assert.equal('totalComments' in stats, false);
});

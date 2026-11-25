import React, { useCallback, useEffect, useState } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminShell } from './components/layout/AdminShell';
import { AdvertisementsView } from './components/views/AdvertisementsView';
import { DashboardView } from './components/views/DashboardView';
import { LiveStreamingView } from './components/views/LiveStreamingView';
import { PostsAndMediaView } from './components/views/PostsAndMediaView';
import {
  NotificationsView,
  WebsiteSettingsView,
} from './components/views/SystemAndSettingsViews';
import { TeachersView } from './components/views/TeachersView';
import { UsersModerationView } from './components/views/UsersModerationView';
import type { AdminUser, NavSection } from './domain/types';
import {
  approveTeacher,
  createAdditionalAdmin,
  deleteAdvertisement,
  deletePost,
  deleteTeacher,
  editPost,
  fetchAdminState,
  getAuthStatus,
  getCurrentAdmin,
  getLiveKitMonitorToken,
  getSessionToken,
  logoutAdmin,
  markAllNotificationsRead,
  markNotificationRead,
  moderateAdvertisement,
  moderateLiveStream,
  moderatePost,
  rejectTeacher,
  resolveReport,
  setSessionToken,
  stopLiveBroadcast,
  suspendTeacher,
  updatePublicUserStatus,
  updateSiteSettings,
  updateTeacherInfo,
  updateTeacherPermissions,
  verifyTeacherActionGuard,
  type AdminPayload,
  type AuthStatusResponse,
} from './services/adminApi';

function SuperAdminApp() {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [payload, setPayload] = useState<AdminPayload | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [initializing, setInitializing] = useState(true);
  const [bootError, setBootError] = useState('');
  const [actionError, setActionError] = useState('');

  const loadDashboardState = useCallback(async () => {
    try {
      const data = await fetchAdminState();
      setPayload(data);
      setActionError('');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to load administrative state.'
      );
    }
  }, []);

  const initializeConsole = useCallback(async () => {
    setInitializing(true);
    setBootError('');
    try {
      const status = await getAuthStatus();
      setAuthStatus(status);
      if (getSessionToken()) {
        try {
          const current = await getCurrentAdmin();
          setAdmin(current.admin);
          const data = await fetchAdminState();
          setPayload(data);
        } catch {
          setSessionToken(null);
          setAdmin(null);
          setPayload(null);
        }
      }
    } catch (err) {
      setBootError(
        err instanceof Error ? err.message : 'Unable to reach backend server.'
      );
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void initializeConsole();
  }, [initializeConsole]);

  const handleAuthenticated = async (loggedInAdmin: AdminUser) => {
    setAdmin(loggedInAdmin);
    await loadDashboardState();
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setAdmin(null);
    setPayload(null);
    setActiveSection('dashboard');
    try {
      const status = await getAuthStatus();
      setAuthStatus(status);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to refresh authentication status.'
      );
    }
  };

  const runMutation = async (fn: () => Promise<AdminPayload>) => {
    try {
      setActionError('');
      const updated = await fn();
      setPayload(updated);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Action could not be completed.'
      );
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-sm text-slate-600">
          Initializing Sunshine School Super Admin Console...
        </div>
      </div>
    );
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h1 className="text-base font-semibold text-slate-900">
            Backend Connection Error
          </h1>
          <p className="text-sm text-rose-700 break-words">
            {bootError || 'Unable to connect to the Sunshine School backend API.'}
          </p>
          <button
            type="button"
            onClick={() => void initializeConsole()}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Protected route gate: unauthenticated users cannot access any admin screen
  if (!admin || !payload) {
    return (
      <LoginScreen
        authStatus={authStatus}
        onAuthenticated={(adm) => void handleAuthenticated(adm)}
      />
    );
  }

  const unreadNotifications = payload.state.notifications.filter(
    (n) => n.recipientRole === 'super_admin' && !n.isRead
  ).length;
  const openReportsCount = payload.state.reports.filter(
    (r) => r.status === 'open'
  ).length;

  return (
    <AdminShell
      activeSection={activeSection}
      onNavigate={setActiveSection}
      onLogout={() => void handleLogout()}
      admin={admin}
      stats={payload.stats}
      unreadNotifications={unreadNotifications}
      openReportsCount={openReportsCount}
      siteSettings={payload.state.siteSettings}
    >
      {actionError && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center justify-between gap-4"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeSection === 'dashboard' && (
        <DashboardView
          stats={payload.stats}
          state={payload.state}
          onNavigate={setActiveSection}
        />
      )}

      {(activeSection === 'teacher-management' ||
        activeSection === 'teacher-approvals' ||
        activeSection === 'teacher-permissions') && (
        <TeachersView
          mode={
            activeSection === 'teacher-approvals'
              ? 'approvals'
              : activeSection === 'teacher-permissions'
              ? 'permissions'
              : 'management'
          }
          state={payload.state}
          onApprove={(uid) => runMutation(() => approveTeacher(uid))}
          onReject={(uid, reason) => runMutation(() => rejectTeacher(uid, reason))}
          onUpdateTeacher={(uid, updates) =>
            runMutation(() => updateTeacherInfo(uid, updates))
          }
          onSuspendTeacher={(uid, suspended, reason) =>
            runMutation(() => suspendTeacher(uid, suspended, reason))
          }
          onDeleteTeacher={(uid) => runMutation(() => deleteTeacher(uid))}
          onUpdatePermissions={(uid, updates) =>
            runMutation(() => updateTeacherPermissions(uid, updates))
          }
          onToggleRegistration={(enabled) =>
            runMutation(() =>
              updateSiteSettings({ teacherRegistrationEnabled: enabled })
            )
          }
          onVerifyActionGuard={(teacherId, action) =>
            verifyTeacherActionGuard(teacherId, action)
          }
        />
      )}

      {(activeSection === 'all-posts' ||
        activeSection === 'post-approvals' ||
        activeSection === 'photos' ||
        activeSection === 'videos') && (
        <PostsAndMediaView
          key={activeSection}
          mode={
            activeSection === 'post-approvals'
              ? 'approvals'
              : activeSection === 'photos'
              ? 'photos'
              : activeSection === 'videos'
              ? 'videos'
              : 'all'
          }
          state={payload.state}
          onModeratePost={(id, status, reason) =>
            runMutation(() => moderatePost(id, status, reason))
          }
          onEditPost={(id, updates) => runMutation(() => editPost(id, updates))}
          onDeletePost={(id) => runMutation(() => deletePost(id))}
        />
      )}

      {(activeSection === 'advertisements' ||
        activeSection === 'advertisement-approvals') && (
        <AdvertisementsView
          key={activeSection}
          mode={activeSection === 'advertisement-approvals' ? 'approvals' : 'all'}
          state={payload.state}
          onModerateAd={(id, updates) =>
            runMutation(() => moderateAdvertisement(id, updates))
          }
          onDeleteAd={(id) => runMutation(() => deleteAdvertisement(id))}
        />
      )}

      {(activeSection === 'live-streaming' ||
        activeSection === 'live-approvals' ||
        activeSection === 'active-live-streams' ||
        activeSection === 'completed-live-streams') && (
        <LiveStreamingView
          key={activeSection}
          mode={
            activeSection === 'live-approvals'
              ? 'approvals'
              : activeSection === 'active-live-streams'
              ? 'active'
              : activeSection === 'completed-live-streams'
              ? 'completed'
              : 'all'
          }
          state={payload.state}
          livekitConfigured={payload.livekitConfigured}
          onModerateStream={(id, updates) =>
            runMutation(() => moderateLiveStream(id, updates))
          }
          onStopBroadcast={(streamId) =>
            runMutation(() => stopLiveBroadcast(streamId))
          }
          onSuspendTeacher={(uid, suspended, reason) =>
            runMutation(() => suspendTeacher(uid, suspended, reason))
          }
          onGetMonitorToken={(roomName) => getLiveKitMonitorToken(roomName)}
        />
      )}

      {(activeSection === 'public-users' ||
        activeSection === 'content-reports') && (
        <UsersModerationView
          key={activeSection}
          mode={activeSection === 'content-reports' ? 'reports' : 'users'}
          state={payload.state}
          onUpdateUserStatus={(uid, status, reason) =>
            runMutation(() => updatePublicUserStatus(uid, status, reason))
          }
          onResolveReport={(id, params) =>
            runMutation(() => resolveReport(id, params))
          }
        />
      )}

      {activeSection === 'notifications' && (
        <NotificationsView
          state={payload.state}
          onMarkRead={(id, isRead) =>
            runMutation(() => markNotificationRead(id, isRead))
          }
          onMarkAllRead={() => runMutation(() => markAllNotificationsRead())}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'website-settings' && (
        <WebsiteSettingsView
          state={payload.state}
          onSaveSettings={(updates) =>
            runMutation(() => updateSiteSettings(updates))
          }
          onCreateAdmin={(params) =>
            runMutation(() => createAdditionalAdmin(params))
          }
        />
      )}
    </AdminShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SuperAdminApp />
    </ErrorBoundary>
  );
}

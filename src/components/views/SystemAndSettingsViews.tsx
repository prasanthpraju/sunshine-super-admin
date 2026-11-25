import React, { useState } from 'react';
import {
  CheckCheck,
  ExternalLink,
  MailOpen,
  Plus,
  Save,
  ShieldPlus,
} from 'lucide-react';
import { SCHOOL_ASSETS } from '../../data/seedData';
import type {
  DatabaseState,
  NavSection,
  SiteSettings,
} from '../../domain/types';
import { fetchPublicFeedPreview } from '../../services/adminApi';
import { SafeImage, StatusBadge, ToggleSwitch } from '../ui/CommonPrimitives';

export function NotificationsView({
  state,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: {
  state: DatabaseState;
  onMarkRead: (id: string, isRead: boolean) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onNavigate: (section: NavSection) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const adminNotifications = state.notifications.filter(
    (n) => n.recipientRole === 'super_admin'
  );
  const items =
    filter === 'unread'
      ? adminNotifications.filter((n) => !n.isRead)
      : adminNotifications;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({adminNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              filter === 'unread'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unread ({adminNotifications.filter((n) => !n.isRead).length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => void onMarkAllRead()}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No notifications in this filter.
          </div>
        ) : (
          items.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                notif.isRead ? 'bg-white' : 'bg-amber-50/40'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">{notif.title}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {notif.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                  {!notif.isRead && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-900 rounded">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700">{notif.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.targetSection && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!notif.isRead) void onMarkRead(notif.id, true);
                      onNavigate(notif.targetSection!);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800"
                  >
                    Open Queue
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onMarkRead(notif.id, !notif.isRead)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <MailOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{notif.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function WebsiteSettingsView({
  state,
  onSaveSettings,
  onCreateAdmin,
}: {
  state: DatabaseState;
  onSaveSettings: (updates: Partial<SiteSettings>) => Promise<void>;
  onCreateAdmin: (params: {
    fullName: string;
    email: string;
    role: 'super_admin' | 'admin';
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<SiteSettings>(state.siteSettings);
  const [savedNotice, setSavedNotice] = useState('');
  const [publicFeedSummary, setPublicFeedSummary] = useState<{
    posts: number;
    ads: number;
    streams: number;
  } | null>(null);

  // Additional Admin provisioning form (only accessible to authorized Super Admins)
  const [newAdmin, setNewAdmin] = useState({
    fullName: '',
    email: '',
    role: 'admin' as 'super_admin' | 'admin',
  });
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice('');
    await onSaveSettings(form);
    setSavedNotice('Website settings saved and propagated to public feed API.');
  };

  const handleCheckPublicFeed = async () => {
    const feed = await fetchPublicFeedPreview();
    setPublicFeedSummary({
      posts: feed.posts.length,
      ads: feed.advertisements.length,
      streams: feed.liveStreams.length,
    });
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    try {
      await onCreateAdmin(newAdmin);
      setAdminSuccess(`Authorized administrator ${newAdmin.email} added for Super Admin JWT sign-in.`);
      setNewAdmin({ fullName: '', email: '', role: 'admin' });
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to create administrator.');
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-6">
        {savedNotice && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800"
          >
            {savedNotice}
          </div>
        )}

        {/* School Identity & Branding */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                School Identity &amp; Public Branding
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Updates reflect across the Public Website header, profile banner, and footer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCheckPublicFeed()}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 inline-flex items-center gap-1.5 self-start"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Verify Public API State</span>
            </button>
          </div>

          {publicFeedSummary && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
              GET /api/public/feed → {publicFeedSummary.posts} approved posts ·{' '}
              {publicFeedSummary.ads} active sidebar ads · {publicFeedSummary.streams} public live events
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={form.schoolName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, schoolName: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Website Description
                </label>
                <textarea
                  rows={3}
                  value={form.websiteDescription}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      websiteDescription: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    School Logo URL
                  </label>
                  <input
                    type="text"
                    value={form.schoolLogo}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, schoolLogo: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    School Profile Image URL
                  </label>
                  <input
                    type="text"
                    value={form.schoolProfileImage}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        schoolProfileImage: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-700">Live Branding Preview</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <SafeImage
                  src={form.schoolProfileImage || SCHOOL_ASSETS.campusBanner}
                  alt="School Profile Preview"
                  className="w-full h-36 object-cover"
                />
                <div className="p-4 flex items-center gap-3 bg-white">
                  <SafeImage
                    src={form.schoolLogo || SCHOOL_ASSETS.logo}
                    alt="School Logo Preview"
                    className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                  />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 truncate">
                      {form.schoolName}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {form.websiteDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Social Media Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Campus Address
              </label>
              <input
                type="text"
                value={form.contactAddress}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactAddress: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['facebook', 'instagram', 'youtube', 'x'] as const).map((net) => (
              <div key={net}>
                <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">
                  {net} URL
                </label>
                <input
                  type="url"
                  value={form.socialLinks[net]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      socialLinks: {
                        ...prev.socialLinks,
                        [net]: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Registration, Moderation, Live Streaming & Advertisement Policies */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
            Registration, Moderation, Live &amp; Advertisement Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'teacherRegistrationEnabled' as const,
                title: 'Teacher Registration',
                desc: 'Allow new teachers to submit registration requests.',
              },
              {
                key: 'publicRegistrationEnabled' as const,
                title: 'Public User Registration',
                desc: 'Allow parents, students, and alumni to create community accounts.',
              },
              {
                key: 'requirePostApproval' as const,
                title: 'Require Super Admin Post Approval',
                desc: 'Hold teacher posts in Pending Approvals before public visibility.',
              },
              {
                key: 'requireAdApproval' as const,
                title: 'Require Advertisement Approval',
                desc: 'Require Super Admin approval before ads appear in the public sidebar.',
              },
              {
                key: 'requireLiveApproval' as const,
                title: 'Require Live Stream Request Approval',
                desc: 'Block teachers from starting broadcasts without prior live approval.',
              },
            ].map((toggle) => (
              <div
                key={toggle.key}
                className="flex items-center justify-between gap-4 p-4 border border-slate-200 rounded-lg"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{toggle.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{toggle.desc}</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(form[toggle.key])}
                  onChange={(next) =>
                    setForm((prev) => ({ ...prev, [toggle.key]: next }))
                  }
                  label={toggle.title}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Max Live Stream Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={form.maxLiveDurationMinutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxLiveDurationMinutes: Number(e.target.value) || 60,
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Max Concurrent Sidebar Advertisements
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.maxConcurrentAds}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxConcurrentAds: Number(e.target.value) || 4,
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Save Website Settings</span>
            </button>
          </div>
        </section>
      </form>

      {/* Authorized Administrators Management */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Authorized Super Administrators
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin registration is closed to the public. Only existing authorized Super Admins can provision additional administrator accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {state.admins.map((adm) => (
              <div
                key={adm.uid}
                className="p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">{adm.fullName}</p>
                  <p className="text-slate-500">{adm.email}</p>
                </div>
                <StatusBadge status={adm.role === 'super_admin' ? 'approved' : 'active'} />
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddAdmin}
            className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <ShieldPlus className="w-4 h-4" aria-hidden="true" />
              <span>Provision Additional Administrator</span>
            </div>
            {adminError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                {adminError}
              </p>
            )}
            {adminSuccess && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                {adminSuccess}
              </p>
            )}
            <input
              type="text"
              required
              placeholder="Full Name"
              value={newAdmin.fullName}
              onChange={(e) =>
                setNewAdmin((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              required
              placeholder="admin@sunshineschool.edu"
              value={newAdmin.email}
              onChange={(e) =>
                setNewAdmin((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
            <select
              value={newAdmin.role}
              onChange={(e) =>
                setNewAdmin((prev) => ({
                  ...prev,
                  role: e.target.value as 'super_admin' | 'admin',
                }))
              }
              aria-label="Administrator role"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Authorized administrators sign in with this email via JWT authentication.
            </p>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Authorize Administrator</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

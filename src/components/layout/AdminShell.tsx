import React, { useState } from 'react';
import {
  Bell,
  CheckSquare,
  FileText,
  Film,
  Flag,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Radio,
  Settings,
  Shield,
  Tv,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { SCHOOL_ASSETS } from '../../data/seedData';
import type { AdminUser, DashboardStats, NavSection, SiteSettings } from '../../domain/types';
import { SafeImage } from '../ui/CommonPrimitives';

interface NavGroup {
  label: string;
  items: {
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    badgeCount?: number;
  }[];
}

export function AdminShell({
  activeSection,
  onNavigate,
  onLogout,
  admin,
  stats,
  unreadNotifications,
  openReportsCount,
  siteSettings,
  children,
}: {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  onLogout: () => void;
  admin: AdminUser;
  stats: DashboardStats;
  unreadNotifications: number;
  openReportsCount: number;
  siteSettings: SiteSettings;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
      ],
    },
    {
      label: 'Faculty Governance',
      items: [
        {
          id: 'teacher-management',
          label: 'Teacher Management',
          icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
        {
          id: 'teacher-approvals',
          label: 'Teacher Approvals',
          icon: <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: stats.pendingTeacherRegistrations,
        },
        {
          id: 'teacher-permissions',
          label: 'Teacher Permissions',
          icon: <Shield className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
      ],
    },
    {
      label: 'Community & Content',
      items: [
        {
          id: 'public-users',
          label: 'Public Users',
          icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
        {
          id: 'all-posts',
          label: 'All Posts',
          icon: <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
        {
          id: 'post-approvals',
          label: 'Post Approvals',
          icon: <CheckSquare className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: stats.pendingPosts,
        },
        {
          id: 'photos',
          label: 'Photos',
          icon: <ImageIcon className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
        {
          id: 'videos',
          label: 'Videos',
          icon: <Film className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
      ],
    },
    {
      label: 'Advertisements',
      items: [
        {
          id: 'advertisements',
          label: 'Advertisements',
          icon: <Megaphone className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
        {
          id: 'advertisement-approvals',
          label: 'Advertisement Approvals',
          icon: <CheckSquare className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: stats.pendingAdvertisements,
        },
      ],
    },
    {
      label: 'Live Streaming',
      items: [
        {
          id: 'live-streaming',
          label: 'Live Streaming',
          icon: <Tv className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
        {
          id: 'live-approvals',
          label: 'Live Approvals',
          icon: <CheckSquare className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: stats.pendingLiveRequests,
        },
        {
          id: 'active-live-streams',
          label: 'Active Live Streams',
          icon: <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: stats.activeLiveStreams,
        },
        {
          id: 'completed-live-streams',
          label: 'Completed Live Streams',
          icon: <Video className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
      ],
    },
    {
      label: 'Moderation & System',
      items: [
        {
          id: 'content-reports',
          label: 'Content Reports',
          icon: <Flag className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: openReportsCount,
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />,
          badgeCount: unreadNotifications,
        },
        {
          id: 'website-settings',
          label: 'Website Settings',
          icon: <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />,
        },
      ],
    },
  ];

  const activeTitle =
    navGroups.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label ||
    'Dashboard';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <SafeImage
            src={siteSettings.schoolLogo || SCHOOL_ASSETS.logo}
            alt={siteSettings.schoolName}
            className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-slate-900 truncate">
              {siteSettings.schoolName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">Super Admin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav
        aria-label="Super Admin Sidebar Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5"
      >
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="px-2.5 pb-0.5 text-[11px] font-semibold text-slate-400 tracking-wide">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span
                        className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-rose-700 hover:bg-rose-50 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="truncate">{siteSettings.schoolName}</span>
                <span aria-hidden="true">/</span>
                <span className="text-slate-900 font-medium truncate">{activeTitle}</span>
              </div>
              <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              aria-label={`Notifications (${unreadNotifications} unread)`}
              className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-600 text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <SafeImage
                src={admin.avatarUrl || SCHOOL_ASSETS.adminAvatar}
                alt={admin.fullName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight whitespace-nowrap">
                  {admin.fullName}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight whitespace-nowrap">
                  {admin.email}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

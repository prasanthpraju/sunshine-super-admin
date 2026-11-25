import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type {
  DashboardStats,
  DatabaseState,
  NavSection,
} from '../../domain/types';
import { StatusBadge } from '../ui/CommonPrimitives';

interface KpiCardItem {
  label: string;
  value: number;
  targetSection?: NavSection;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export function DashboardView({
  stats,
  state,
  onNavigate,
}: {
  stats: DashboardStats;
  state: DatabaseState;
  onNavigate: (section: NavSection) => void;
}) {
  const statGroups: { title: string; items: KpiCardItem[] }[] = [
    {
      title: 'Faculty & Community',
      items: [
        { label: 'Total Teachers', value: stats.totalTeachers, targetSection: 'teacher-management' },
        {
          label: 'Pending Teacher Registrations',
          value: stats.pendingTeacherRegistrations,
          targetSection: 'teacher-approvals',
          tone: stats.pendingTeacherRegistrations > 0 ? 'warning' : 'default',
        },
        { label: 'Approved Teachers', value: stats.approvedTeachers, targetSection: 'teacher-management', tone: 'success' },
        {
          label: 'Suspended Teachers',
          value: stats.suspendedTeachers,
          targetSection: 'teacher-permissions',
          tone: stats.suspendedTeachers > 0 ? 'danger' : 'default',
        },
        { label: 'Total Public Users', value: stats.totalPublicUsers, targetSection: 'public-users' },
      ],
    },
    {
      title: 'Content & Media',
      items: [
        { label: 'Total Posts', value: stats.totalPosts, targetSection: 'all-posts' },
        {
          label: 'Pending Posts',
          value: stats.pendingPosts,
          targetSection: 'post-approvals',
          tone: stats.pendingPosts > 0 ? 'warning' : 'default',
        },
        { label: 'Approved Posts', value: stats.approvedPosts, targetSection: 'all-posts', tone: 'success' },
        { label: 'Total Photos', value: stats.totalPhotos, targetSection: 'photos' },
        { label: 'Total Videos', value: stats.totalVideos, targetSection: 'videos' },
      ],
    },
    {
      title: 'Advertisements & Live',
      items: [
        {
          label: 'Pending Advertisements',
          value: stats.pendingAdvertisements,
          targetSection: 'advertisement-approvals',
          tone: stats.pendingAdvertisements > 0 ? 'warning' : 'default',
        },
        { label: 'Active Advertisements', value: stats.activeAdvertisements, targetSection: 'advertisements', tone: 'success' },
        {
          label: 'Pending Live Requests',
          value: stats.pendingLiveRequests,
          targetSection: 'live-approvals',
          tone: stats.pendingLiveRequests > 0 ? 'warning' : 'default',
        },
        {
          label: 'Active Live Streams',
          value: stats.activeLiveStreams,
          targetSection: 'active-live-streams',
          tone: stats.activeLiveStreams > 0 ? 'danger' : 'default',
        },
      ],
    },
    {
      title: 'Audience Engagement',
      items: [
        { label: 'Total Likes', value: stats.totalLikes, targetSection: 'all-posts' },
        { label: 'Total Shares', value: stats.totalShares, targetSection: 'all-posts' },
        { label: 'Total Video Views', value: stats.totalVideoViews, targetSection: 'videos' },
      ],
    },
  ];

  const pendingQueueCount =
    stats.pendingTeacherRegistrations +
    stats.pendingPosts +
    stats.pendingAdvertisements +
    stats.pendingLiveRequests;

  return (
    <div className="space-y-8">
      {/* Top Priority Governance Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Campus Governance Overview
          </h2>
          <p className="text-sm text-slate-600">
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {pendingQueueCount}
            </span>{' '}
            items awaiting Super Admin review across teacher registrations, posts, advertisements, and live stream requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('teacher-approvals')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
          >
            Review Approvals ({pendingQueueCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('active-live-streams')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            Monitor Live ({stats.activeLiveStreams})
          </button>
        </div>
      </div>

      {/* Database Statistics Organized Cleanly */}
      <div className="space-y-6">
        {statGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wide">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {group.items.map((item) => {
                const valueColor =
                  item.tone === 'warning'
                    ? 'text-amber-700'
                    : item.tone === 'danger'
                    ? 'text-rose-700'
                    : item.tone === 'success'
                    ? 'text-emerald-700'
                    : 'text-slate-900';

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.targetSection && onNavigate(item.targetSection)}
                    className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors group flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600 leading-snug">
                        {item.label}
                      </span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`font-mono text-2xl font-bold tabular-nums ${valueColor}`}
                    >
                      {item.value.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Recent Moderation Audit Trail Snapshot */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Administrative Actions
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('content-reports')}
            className="text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            View Audit History
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {state.auditLogs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StatusBadge status={log.action.includes('SUSPEND') || log.action.includes('REJECT') || log.action.includes('TERMINATE') ? 'rejected' : 'approved'} />
                <span className="font-medium text-slate-900 truncate">{log.summary}</span>
              </div>
              <div className="text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0">
                {log.actorEmail} · {log.createdAt.slice(0, 10)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

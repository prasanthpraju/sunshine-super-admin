import React, { useMemo, useState } from 'react';
import {
  Eye,
  Search,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import type { DatabaseState, PublicUser, ReportItem } from '../../domain/types';
import { ConfirmDialog, SafeImage, StatusBadge } from '../ui/CommonPrimitives';

export function UsersModerationView({
  mode,
  state,
  onUpdateUserStatus,
  onResolveReport,
}: {
  mode: 'users' | 'reports';
  state: DatabaseState;
  onUpdateUserStatus: (
    uid: string,
    status: 'active' | 'suspended',
    reason?: string
  ) => Promise<void>;
  onResolveReport: (
    id: string,
    params: {
      status: 'resolved_removed' | 'dismissed';
      resolutionNote?: string;
      removeTarget?: boolean;
    }
  ) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [reportTab, setReportTab] = useState<'reports' | 'history'>('reports');
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [suspendUserTarget, setSuspendUserTarget] = useState<PublicUser | null>(null);
  const [resolveTarget, setResolveTarget] = useState<{
    report: ReportItem;
    action: 'resolved_removed' | 'dismissed';
  } | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.users.filter((u) => {
      if (!q) return true;
      return `${u.fullName} ${u.email} ${u.role}`.toLowerCase().includes(q);
    });
  }, [state.users, search]);

  return (
    <div className="space-y-6">
      {mode === 'users' && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search public users by name, email, or role..."
                aria-label="Search public users"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <p className="text-xs text-slate-500">
              Public visitors browse approved content freely; accounts are required for likes, shares, and content reports.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Community Role</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/75">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{user.fullName}</p>
                            <p className="text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-700 font-medium">
                        {user.role}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                        {user.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Profile</span>
                          </button>
                          {user.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => setSuspendUserTarget(user)}
                              className="px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 inline-flex items-center gap-1"
                            >
                              <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Suspend</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void onUpdateUserStatus(user.uid, 'active')}
                              className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 inline-flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {mode === 'reports' && (
        <>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setReportTab('reports')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                reportTab === 'reports'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reported Content &amp; Users ({state.reports.length})
            </button>
            <button
              type="button"
              onClick={() => setReportTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                reportTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Moderation History ({state.auditLogs.length})
            </button>
          </div>

          {reportTab === 'reports' ? (
            <div className="space-y-3">
              {state.reports.map((report) => (
                <article
                  key={report.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <StatusBadge status={report.status} />
                      <span className="capitalize font-medium text-slate-700">
                        {report.targetType} report
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Reported by {report.reporterName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {report.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {report.reason}
                    </p>
                    {report.targetPreview && (
                      <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                        Target: {report.targetPreview}
                      </p>
                    )}
                    {report.resolutionNote && (
                      <p className="text-xs text-emerald-700">
                        Resolution: {report.resolutionNote}
                      </p>
                    )}
                  </div>

                  {report.status === 'open' && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setResolveTarget({ report, action: 'resolved_removed' })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700"
                      >
                        Remove Content &amp; Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setResolveTarget({ report, action: 'dismissed' })
                        }
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        Dismiss Report
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Summary</th>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {state.auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/75">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{log.summary}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {log.actorEmail}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {log.createdAt.slice(0, 19).replace('T', ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Profile for ${selectedUser.fullName}`}
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Public User Profile
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-3.5">
                <SafeImage
                  src={selectedUser.avatarUrl}
                  alt={selectedUser.fullName}
                  className="w-14 h-14 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {selectedUser.fullName}
                    </h4>
                    <StatusBadge status={selectedUser.status} />
                  </div>
                  <p className="text-slate-500 mt-0.5">{selectedUser.email}</p>
                  <p className="capitalize text-slate-700 font-medium mt-0.5">
                    {selectedUser.role} · Joined {selectedUser.createdAt.slice(0, 10)}
                  </p>
                </div>
              </div>
              {selectedUser.suspensionReason && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  <strong>Suspension Reason:</strong> {selectedUser.suspensionReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(suspendUserTarget)}
        title={`Suspend ${suspendUserTarget?.fullName || ''}`}
        description="Suspended public users cannot interact with posts or submit reports."
        confirmLabel="Suspend Account"
        tone="danger"
        requireReason
        reasonLabel="Suspension Reason"
        onCancel={() => setSuspendUserTarget(null)}
        onConfirm={(reason) => {
          if (suspendUserTarget) {
            void onUpdateUserStatus(suspendUserTarget.uid, 'suspended', reason);
            setSuspendUserTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(resolveTarget)}
        title={
          resolveTarget?.action === 'resolved_removed'
            ? 'Remove Reported Content & Resolve'
            : 'Dismiss Report'
        }
        description="This action will be recorded in the permanent moderation audit history."
        confirmLabel={
          resolveTarget?.action === 'resolved_removed'
            ? 'Remove & Resolve'
            : 'Dismiss Report'
        }
        tone={resolveTarget?.action === 'resolved_removed' ? 'danger' : 'default'}
        requireReason
        reasonLabel="Moderation Note"
        onCancel={() => setResolveTarget(null)}
        onConfirm={(note) => {
          if (resolveTarget) {
            void onResolveReport(resolveTarget.report.id, {
              status: resolveTarget.action,
              resolutionNote: note,
              removeTarget: resolveTarget.action === 'resolved_removed',
            });
            setResolveTarget(null);
          }
        }}
      />
    </div>
  );
}

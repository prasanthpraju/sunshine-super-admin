import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Edit3,
  Eye,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import type {
  DatabaseState,
  PermissionKey,
  Teacher,
  TeacherActionType,
  TeacherPermissions,
} from '../../domain/types';
import { createDefaultTeacherPermissions } from '../../domain/governance';
import {
  ConfirmDialog,
  SafeImage,
  StatusBadge,
  ToggleSwitch,
} from '../ui/CommonPrimitives';

const PERMISSION_ITEMS: {
  key: Exclude<PermissionKey, 'isSuspended'>;
  label: string;
  description: string;
}[] = [
  {
    key: 'allowDashboardAccess',
    label: 'Allow Dashboard Access',
    description: 'Permits authenticated teacher sign-in to the Teacher Website.',
  },
  {
    key: 'allowCreatePosts',
    label: 'Allow Create Posts',
    description: 'Permits submitting new campus posts for moderation.',
  },
  {
    key: 'allowPhotoUploads',
    label: 'Allow Photo Uploads',
    description: 'Allows attaching image galleries to teacher posts.',
  },
  {
    key: 'allowVideoUploads',
    label: 'Allow Video Uploads',
    description: 'Allows uploading MP4/video clips to teacher posts.',
  },
  {
    key: 'allowAdvertisementSubmission',
    label: 'Allow Advertisement Submission',
    description: 'Allows submitting promotional campaigns for sidebar approval.',
  },
  {
    key: 'allowLiveStreamingRequests',
    label: 'Allow Live Streaming Requests',
    description: 'Allows requesting scheduled live events.',
  },
  {
    key: 'allowLiveBroadcasting',
    label: 'Allow Live Broadcasting',
    description: 'Permits starting approved LiveKit room broadcasts.',
  },
  {
    key: 'allowEventCreation',
    label: 'Allow Event Creation',
    description: 'Permits scheduling academic and extracurricular campus events.',
  },
  {
    key: 'allowCommentsAndInteractions',
    label: 'Allow Comments and Interactions',
    description: 'Permits posting replies and engaging on campus threads.',
  },
];

export function TeachersView({
  mode,
  state,
  onApprove,
  onReject,
  onUpdateTeacher,
  onSuspendTeacher,
  onDeleteTeacher,
  onUpdatePermissions,
  onToggleRegistration,
  onVerifyActionGuard,
}: {
  mode: 'management' | 'approvals' | 'permissions';
  state: DatabaseState;
  onApprove: (uid: string) => Promise<void>;
  onReject: (uid: string, reason: string) => Promise<void>;
  onUpdateTeacher: (
    uid: string,
    updates: {
      fullName: string;
      phone: string;
      department: string;
      designation: string;
      employeeId: string;
    }
  ) => Promise<void>;
  onSuspendTeacher: (uid: string, suspended: boolean, reason?: string) => Promise<void>;
  onDeleteTeacher: (uid: string) => Promise<void>;
  onUpdatePermissions: (
    uid: string,
    updates: Partial<Record<PermissionKey, boolean>>
  ) => Promise<void>;
  onToggleRegistration: (enabled: boolean) => Promise<void>;
  onVerifyActionGuard: (
    teacherId: string,
    action: TeacherActionType
  ) => Promise<{ allowed: boolean; reason: string; status: number }>;
}) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>(
    mode === 'approvals' ? 'pending' : 'all'
  );

  const [rejectTarget, setRejectTarget] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Teacher | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    department: '',
    designation: '',
    employeeId: '',
  });
  const [guardCheckResult, setGuardCheckResult] = useState<{
    teacherId: string;
    action: TeacherActionType;
    allowed: boolean;
    reason: string;
    status: number;
  } | null>(null);

  const departments = useMemo(() => {
    const set = new Set(state.teachers.map((t) => t.department));
    return Array.from(set).sort();
  }, [state.teachers]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.teachers.filter((t) => {
      if (mode === 'approvals' && t.status !== 'pending') return false;
      if (mode === 'management' && statusFilter !== 'all' && t.status !== statusFilter)
        return false;
      if (
        mode === 'permissions' &&
        t.status !== 'approved' &&
        t.status !== 'suspended'
      ) {
        return false;
      }
      if (departmentFilter !== 'all' && t.department !== departmentFilter) return false;
      if (q) {
        const hay = `${t.fullName} ${t.email} ${t.employeeId} ${t.department} ${t.designation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.teachers, mode, statusFilter, departmentFilter, search]);

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setEditForm({
      fullName: t.fullName,
      phone: t.phone || '',
      department: t.department,
      designation: t.designation,
      employeeId: t.employeeId,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    await onUpdateTeacher(editingTeacher.uid, editForm);
    setEditingTeacher(null);
  };

  const runGuardCheck = async (teacherId: string, action: TeacherActionType) => {
    const res = await onVerifyActionGuard(teacherId, action);
    setGuardCheckResult({ teacherId, action, ...res });
  };

  return (
    <div className="space-y-6">
      {/* Global Teacher Registration Control Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Teacher Registration Control
            </h2>
            <StatusBadge
              status={state.siteSettings.teacherRegistrationEnabled ? 'active' : 'inactive'}
            />
          </div>
          <p className="text-xs text-slate-600">
            {state.siteSettings.teacherRegistrationEnabled
              ? 'Registration is open. New teacher requests appear in Teacher Approvals and cannot access the dashboard until approved.'
              : 'Registration is closed. New teachers cannot submit registration requests via the Teacher Website or API.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
            {state.siteSettings.teacherRegistrationEnabled
              ? 'Enable Registration'
              : 'Disable Registration'}
          </span>
          <ToggleSwitch
            checked={state.siteSettings.teacherRegistrationEnabled}
            onChange={(next) => void onToggleRegistration(next)}
            label="Toggle teacher registration"
          />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, or email..."
            aria-label="Search teachers"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {mode === 'management' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode 1 & 2: Teacher Management / Teacher Approvals Table */}
      {mode !== 'permissions' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {filteredTeachers.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-900">
                No teachers match the current filter
              </p>
              <p className="text-xs text-slate-500">
                {mode === 'approvals'
                  ? 'All pending teacher registration requests have been reviewed.'
                  : 'Try clearing your search or department filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Department &amp; Role</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.uid} className="hover:bg-slate-50/75">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={teacher.profilePhoto}
                            alt={teacher.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 whitespace-nowrap">
                              {teacher.fullName}
                            </p>
                            <p className="text-slate-500 truncate">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {teacher.employeeId}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 whitespace-nowrap">
                          {teacher.department}
                        </p>
                        <p className="text-slate-500 whitespace-nowrap">
                          {teacher.designation}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {teacher.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {teacher.registeredAt.slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={teacher.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailTeacher(teacher)}
                            aria-label={`View details for ${teacher.fullName}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Details</span>
                          </button>

                          {teacher.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => void onApprove(teacher.uid)}
                                aria-label={`Approve ${teacher.fullName}`}
                                className="px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1 whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(teacher)}
                                aria-label={`Reject ${teacher.fullName}`}
                                className="px-2.5 py-1.5 text-xs font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 inline-flex items-center gap-1 whitespace-nowrap"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {mode === 'management' && teacher.status !== 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(teacher)}
                                aria-label={`Edit ${teacher.fullName}`}
                                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {teacher.status === 'suspended' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onSuspendTeacher(teacher.uid, false)
                                  }
                                  aria-label={`Reactivate ${teacher.fullName}`}
                                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Reactivate</span>
                                </button>
                              ) : teacher.status === 'approved' ? (
                                <button
                                  type="button"
                                  onClick={() => setSuspendTarget(teacher)}
                                  aria-label={`Suspend ${teacher.fullName}`}
                                  className="px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Suspend</span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(teacher)}
                                aria-label={`Delete ${teacher.fullName}`}
                                className="p-1.5 text-rose-600 hover:text-rose-800 border border-rose-200 rounded-md hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Granular Teacher Permissions Matrix */}
      {mode === 'permissions' && (
        <div className="space-y-5">
          {guardCheckResult && (
            <div
              role="status"
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                guardCheckResult.allowed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {guardCheckResult.allowed ? (
                  <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  <strong className="font-mono">
                    POST /api/teacher/authorize-action ({guardCheckResult.status})
                  </strong>{' '}
                  · {guardCheckResult.reason}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGuardCheckResult(null)}
                className="underline font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {filteredTeachers.map((teacher) => {
            const perms: TeacherPermissions =
              state.teacherPermissions[teacher.uid] ||
              createDefaultTeacherPermissions(teacher.uid);
            const suspended = teacher.status === 'suspended' || perms.isSuspended;

            return (
              <section
                key={teacher.uid}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <SafeImage
                      src={teacher.profilePhoto}
                      alt={teacher.fullName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-slate-900">
                          {teacher.fullName}
                        </h3>
                        <StatusBadge status={suspended ? 'suspended' : 'approved'} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {teacher.employeeId} · {teacher.department} · {teacher.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-rose-50/70 border border-rose-200">
                      <Lock className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />
                      <span className="text-xs font-semibold text-rose-900 whitespace-nowrap">
                        Suspend Teacher (Overrides All)
                      </span>
                      <ToggleSwitch
                        checked={suspended}
                        onChange={(next) =>
                          void onUpdatePermissions(teacher.uid, {
                            isSuspended: next,
                          })
                        }
                        label={`Suspend ${teacher.fullName}`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void runGuardCheck(teacher.uid, 'upload_video')
                      }
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                    >
                      Test API Guard: Video Upload
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-slate-100">
                  {PERMISSION_ITEMS.map((item) => {
                    const enabled = perms[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`bg-white p-4 flex items-center justify-between gap-4 ${
                          suspended ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={enabled}
                          disabled={suspended}
                          onChange={(next) =>
                            void onUpdatePermissions(teacher.uid, {
                              [item.key]: next,
                            })
                          }
                          label={`${item.label} for ${teacher.fullName}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Teacher Details & Activity Modal */}
      {detailTeacher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${detailTeacher.fullName}`}
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Faculty Profile &amp; Activity
              </h3>
              <button
                type="button"
                onClick={() => setDetailTeacher(null)}
                aria-label="Close teacher details"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5 text-sm">
              <div className="flex items-center gap-4">
                <SafeImage
                  src={detailTeacher.profilePhoto}
                  alt={detailTeacher.fullName}
                  className="w-16 h-16 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">
                      {detailTeacher.fullName}
                    </h4>
                    <StatusBadge status={detailTeacher.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {detailTeacher.designation} · {detailTeacher.department}
                  </p>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">
                    {detailTeacher.employeeId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {detailTeacher.email}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {detailTeacher.phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Registered Date</p>
                  <p className="font-mono text-slate-900 mt-0.5">
                    {detailTeacher.registeredAt.slice(0, 10)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Reviewed Date</p>
                  <p className="font-mono text-slate-900 mt-0.5">
                    {detailTeacher.reviewedAt
                      ? detailTeacher.reviewedAt.slice(0, 10)
                      : 'Pending Review'}
                  </p>
                </div>
              </div>

              {(detailTeacher.rejectionReason || detailTeacher.suspensionReason) && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <strong>Reason:</strong>{' '}
                  {detailTeacher.rejectionReason || detailTeacher.suspensionReason}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Teacher Activity Summary</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                      {
                        state.posts.filter((p) => p.teacherId === detailTeacher.uid)
                          .length
                      }
                    </p>
                    <p className="text-[11px] text-slate-500">Posts</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                      {
                        state.advertisements.filter(
                          (a) => a.teacherId === detailTeacher.uid
                        ).length
                      }
                    </p>
                    <p className="text-[11px] text-slate-500">Advertisements</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                      {
                        state.liveStreams.filter(
                          (l) => l.teacherId === detailTeacher.uid
                        ).length
                      }
                    </p>
                    <p className="text-[11px] text-slate-500">Live Streams</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingTeacher.fullName}`}
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit Teacher Information
              </h3>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.employeeId}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, employeeId: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={editForm.department}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, department: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  required
                  value={editForm.designation}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, designation: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title={`Reject ${rejectTarget?.fullName || ''}`}
        description="Provide a rejection reason. Pending and rejected teachers cannot access the Teacher Dashboard."
        confirmLabel="Reject Registration"
        tone="danger"
        requireReason
        reasonLabel="Rejection Reason"
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) {
            void onReject(rejectTarget.uid, reason);
            setRejectTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        title={`Suspend ${suspendTarget?.fullName || ''}`}
        description="Suspending this teacher immediately overrides all granted permissions and blocks all API actions."
        confirmLabel="Suspend Teacher"
        tone="danger"
        requireReason
        reasonLabel="Suspension Reason"
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (suspendTarget) {
            void onSuspendTeacher(suspendTarget.uid, true, reason);
            setSuspendTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.fullName || ''}`}
        description="This permanently deletes the teacher account and revokes their permissions profile."
        confirmLabel="Delete Account"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void onDeleteTeacher(deleteTarget.uid);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

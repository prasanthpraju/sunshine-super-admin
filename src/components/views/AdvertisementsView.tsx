import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  ExternalLink,
  Film,
  Trash2,
  X,
} from 'lucide-react';
import { computeAdCtr } from '../../domain/governance';
import type { Advertisement, DatabaseState, ModerationStatus } from '../../domain/types';
import {
  ConfirmDialog,
  MediaPreviewModal,
  SafeImage,
  StatusBadge,
  ToggleSwitch,
} from '../ui/CommonPrimitives';

export function AdvertisementsView({
  mode,
  state,
  onModerateAd,
  onDeleteAd,
}: {
  mode: 'all' | 'approvals';
  state: DatabaseState;
  onModerateAd: (
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
  ) => Promise<void>;
  onDeleteAd: (id: string) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | ModerationStatus>(
    mode === 'approvals' ? 'pending' : 'all'
  );
  const [previewAd, setPreviewAd] = useState<Advertisement | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Advertisement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null);
  const [editTarget, setEditTarget] = useState<Advertisement | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    destinationUrl: '',
    startDate: '',
    endDate: '',
  });

  const filteredAds = useMemo(() => {
    const activeFilter = mode === 'approvals' ? 'pending' : statusFilter;
    return state.advertisements.filter((ad) =>
      activeFilter === 'all' ? true : ad.status === activeFilter
    );
  }, [state.advertisements, mode, statusFilter]);

  const openEdit = (ad: Advertisement) => {
    setEditTarget(ad);
    setEditForm({
      title: ad.title,
      description: ad.description || '',
      destinationUrl: ad.destinationUrl,
      startDate: ad.startDate.slice(0, 10),
      endDate: ad.endDate.slice(0, 10),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    await onModerateAd(editTarget.id, {
      title: editForm.title,
      description: editForm.description,
      destinationUrl: editForm.destinationUrl,
      startDate: `${editForm.startDate}T00:00:00.000Z`,
      endDate: `${editForm.endDate}T23:59:59.000Z`,
    });
    setEditTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-600">
          Only <strong>approved</strong> and <strong>active</strong> advertisements appear in the right sidebar of the Public Website.
        </p>
        {mode === 'all' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredAds.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-900">
            No advertisements in this view
          </p>
          <p className="text-xs text-slate-500">
            Teacher-submitted promotions appear here automatically for approval and scheduling.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAds.map((ad) => {
            const ctr = computeAdCtr(ad.impressions, ad.clicks);
            return (
              <article
                key={ad.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row gap-5"
              >
                <button
                  type="button"
                  onClick={() => setPreviewAd(ad)}
                  className="lg:w-72 shrink-0 aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group text-left"
                >
                  <SafeImage
                    src={ad.bannerUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                  {ad.videoUrl && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-950/80 text-white text-[11px] inline-flex items-center gap-1">
                      <Film className="w-3 h-3" aria-hidden="true" />
                      Video Preview
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">
                          {ad.teacherName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Submitted {ad.submittedAt.slice(0, 10)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Schedule: {ad.startDate.slice(0, 10)} to {ad.endDate.slice(0, 10)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ad.status} />
                        {ad.status === 'approved' && (
                          <StatusBadge status={ad.isActive ? 'active' : 'inactive'} />
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{ad.title}</h3>
                    {ad.description && (
                      <p className="text-sm text-slate-600">{ad.description}</p>
                    )}
                    <p className="text-xs font-mono text-slate-600 inline-flex items-center gap-1 break-all">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{ad.destinationUrl}</span>
                    </p>
                  </div>

                  {/* Metrics + Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-5 text-xs">
                      <div>
                        <span className="text-slate-500">Impressions</span>
                        <p className="font-mono font-bold tabular-nums text-slate-900 text-sm">
                          {ad.impressions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Clicks</span>
                        <p className="font-mono font-bold tabular-nums text-slate-900 text-sm">
                          {ad.clicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">CTR</span>
                        <p className="font-mono font-bold tabular-nums text-slate-900 text-sm">
                          {ctr}%
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ad.status === 'approved' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 mr-1">
                          <span className="text-xs font-medium text-slate-700">
                            Sidebar Active
                          </span>
                          <ToggleSwitch
                            checked={ad.isActive}
                            onChange={(next) =>
                              void onModerateAd(ad.id, { isActive: next })
                            }
                            label={`Toggle active state for ${ad.title}`}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openEdit(ad)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Edit &amp; Schedule</span>
                      </button>

                      {ad.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() =>
                            void onModerateAd(ad.id, {
                              status: 'approved',
                              isActive: true,
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Approve &amp; Activate</span>
                        </button>
                      )}

                      {ad.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => setRejectTarget(ad)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(ad)}
                        aria-label={`Delete advertisement ${ad.title}`}
                        className="p-1.5 text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <MediaPreviewModal
        open={Boolean(previewAd)}
        title={previewAd?.title || ''}
        subtitle={previewAd ? `Submitted by ${previewAd.teacherName}` : undefined}
        photos={previewAd?.bannerUrl ? [previewAd.bannerUrl] : []}
        videos={previewAd?.videoUrl ? [previewAd.videoUrl] : []}
        description={previewAd?.description}
        onClose={() => setPreviewAd(null)}
      />

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit and schedule advertisement"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit &amp; Schedule Advertisement
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Advertisement Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  value={editForm.destinationUrl}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      destinationUrl: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.endDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Reject Advertisement"
        description="Rejected advertisements will not be published to the Public Website sidebar."
        confirmLabel="Reject Advertisement"
        tone="danger"
        requireReason
        reasonLabel="Rejection Reason"
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) {
            void onModerateAd(rejectTarget.id, {
              status: 'rejected',
              isActive: false,
              rejectionReason: reason,
            });
            setRejectTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Advertisement"
        description={`Delete "${deleteTarget?.title || ''}" permanently?`}
        confirmLabel="Delete Advertisement"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void onDeleteAd(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  Eye,
  Film,
  Image as ImageIcon,
  Play,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { filterPosts } from '../../domain/governance';
import type { DatabaseState, ModerationStatus, Post } from '../../domain/types';
import {
  ConfirmDialog,
  MediaPreviewModal,
  SafeImage,
  StatusBadge,
} from '../ui/CommonPrimitives';

export function PostsAndMediaView({
  mode,
  state,
  onModeratePost,
  onEditPost,
  onDeletePost,
}: {
  mode: 'all' | 'approvals' | 'photos' | 'videos';
  state: DatabaseState;
  onModeratePost: (
    id: string,
    status: ModerationStatus,
    rejectionReason?: string
  ) => Promise<void>;
  onEditPost: (
    id: string,
    updates: { caption: string; description: string; category: string }
  ) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | 'all'>(
    mode === 'approvals' ? 'pending' : 'all'
  );
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video'>(
    mode === 'photos' ? 'photo' : mode === 'videos' ? 'video' : 'all'
  );
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Post | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [editTarget, setEditTarget] = useState<Post | null>(null);
  const [editForm, setEditForm] = useState({
    caption: '',
    description: '',
    category: '',
  });

  const filtered = useMemo(
    () =>
      filterPosts(state.posts, {
        status: mode === 'approvals' ? 'pending' : statusFilter,
        mediaType:
          mode === 'photos' ? 'photo' : mode === 'videos' ? 'video' : mediaFilter,
        teacherId: teacherFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search,
      }),
    [state.posts, mode, statusFilter, mediaFilter, teacherFilter, dateFrom, dateTo, search]
  );

  const openEdit = (post: Post) => {
    setEditTarget(post);
    setEditForm({
      caption: post.caption,
      description: post.description || '',
      category: post.category,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    await onEditPost(editTarget.id, editForm);
    setEditTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search captions, descriptions, categories, or teacher..."
              aria-label="Search posts"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode !== 'approvals' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
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

            {(mode === 'all' || mode === 'approvals') && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['all', 'photo', 'video'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMediaFilter(m)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize whitespace-nowrap ${
                      mediaFilter === m
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m === 'all' ? 'All Media' : m === 'photo' ? 'Photos' : 'Videos'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            aria-label="Filter by teacher"
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value="all">All Teachers</option>
            {state.teachers.map((t) => (
              <option key={t.uid} value={t.uid}>
                {t.fullName}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-slate-600">
            <span>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-md font-mono text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 text-slate-600">
            <span>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-md font-mono text-xs"
            />
          </label>
          {(dateFrom || dateTo || teacherFilter !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setTeacherFilter('all');
                setSearch('');
              }}
              className="text-xs font-medium text-slate-700 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Dedicated Photos Gallery Mode */}
      {mode === 'photos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <button
                type="button"
                onClick={() => setPreviewPost(post)}
                className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden group text-left"
              >
                <SafeImage
                  src={post.photos[0]}
                  alt={post.caption}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
                <span className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded bg-slate-900/80 text-white text-[11px] font-mono tabular-nums">
                  {post.photos.length} photo{post.photos.length > 1 ? 's' : ''}
                </span>
              </button>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 truncate">
                    {post.teacherName} · {post.category}
                  </span>
                  <StatusBadge status={post.status} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                  {post.caption}
                </h3>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewPost(post)}
                    className="font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Open Gallery</span>
                  </button>
                  {post.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => void onModeratePost(post.id, 'approved')}
                      className="px-2.5 py-1 font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Dedicated Videos Gallery Mode */}
      {mode === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div className="bg-slate-950 aspect-video relative">
                <video
                  src={post.videos[0]}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {post.teacherName} · {post.videoViewsCount.toLocaleString()} views
                  </span>
                  <StatusBadge status={post.status} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{post.caption}</h3>
                {post.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{post.description}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewPost(post)}
                    className="font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Full Screen Player</span>
                  </button>
                  <div className="flex items-center gap-2">
                    {post.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => void onModeratePost(post.id, 'approved')}
                        className="px-2.5 py-1 font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(post)}
                      className="px-2.5 py-1 font-medium text-rose-700 border border-rose-200 rounded-md hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Standard Posts & Post Approvals List */}
      {(mode === 'all' || mode === 'approvals') && (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-900">
                No posts match your filters
              </p>
              <p className="text-xs text-slate-500">
                Approved posts publish immediately to Sunshine School Social. Rejected posts never appear publicly.
              </p>
            </div>
          ) : (
            filtered.map((post) => (
              <article
                key={post.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row gap-5"
              >
                {/* Media Preview Thumbnail */}
                {(post.photos.length > 0 || post.videos.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setPreviewPost(post)}
                    className="lg:w-64 shrink-0 aspect-video lg:aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 relative group border border-slate-200"
                    aria-label={`Preview media for ${post.caption}`}
                  >
                    {post.photos[0] ? (
                      <SafeImage
                        src={post.photos[0]}
                        alt={post.caption}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-1.5">
                        <Film className="w-6 h-6" aria-hidden="true" />
                        <span className="text-xs font-medium">Play Video Clip</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-950/80 text-white px-2 py-1 rounded text-[11px] font-mono tabular-nums">
                      {post.photos.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" aria-hidden="true" />
                          {post.photos.length}
                        </span>
                      )}
                      {post.videos.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Film className="w-3 h-3" aria-hidden="true" />
                          {post.videos.length}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* Post Details & Controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">
                          {post.teacherName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{post.teacherId}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {post.submittedAt.slice(0, 10)}
                        </span>
                      </div>
                      <StatusBadge status={post.status} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {post.caption}
                    </h3>
                    {post.description && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {post.description}
                      </p>
                    )}
                    {post.rejectionReason && (
                      <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                        Rejection reason: {post.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-500">
                      <span>{post.likesCount} likes</span>
                      <span>{post.sharesCount} shares</span>
                      {post.videos.length > 0 && (
                        <span>{post.videoViewsCount} views</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(post.photos.length > 0 || post.videos.length > 0) && (
                        <button
                          type="button"
                          onClick={() => setPreviewPost(post)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Preview Media</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Edit Caption</span>
                      </button>

                      {post.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => void onModeratePost(post.id, 'approved')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Approve</span>
                        </button>
                      )}

                      {post.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => setRejectTarget(post)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 inline-flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(post)}
                        aria-label={`Delete post ${post.caption}`}
                        className="p-1.5 text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      <MediaPreviewModal
        open={Boolean(previewPost)}
        title={previewPost?.caption || ''}
        subtitle={
          previewPost
            ? `${previewPost.teacherName} · ${previewPost.category}`
            : undefined
        }
        photos={previewPost?.photos}
        videos={previewPost?.videos}
        description={previewPost?.description}
        onClose={() => setPreviewPost(null)}
      />

      {/* Edit Post Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit post caption"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit Post Caption
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
                  Caption
                </label>
                <input
                  type="text"
                  required
                  value={editForm.caption}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, caption: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
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
                Save Caption
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Reject Post Submission"
        description="Rejected posts never appear on the Public Website. The teacher will receive a notification with your reason."
        confirmLabel="Reject Post"
        tone="danger"
        requireReason
        reasonLabel="Rejection Reason"
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) {
            void onModeratePost(rejectTarget.id, 'rejected', reason);
            setRejectTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Post"
        description={`Permanently delete "${deleteTarget?.caption || ''}"? This cannot be undone.`}
        confirmLabel="Delete Post"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void onDeletePost(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

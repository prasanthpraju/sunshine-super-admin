import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  MonitorPlay,
  OctagonX,
  Radio,
  Trash2,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { formatDuration } from '../../domain/governance';
import type {
  DatabaseState,
  LiveStream,
  LiveStreamStatus,
  RecordingStatus,
} from '../../domain/types';
import {
  ConfirmDialog,
  MediaPreviewModal,
  SafeImage,
  StatusBadge,
} from '../ui/CommonPrimitives';

export function LiveStreamingView({
  mode,
  state,
  livekitConfigured,
  onModerateStream,
  onStopBroadcast,
  onSuspendTeacher,
  onGetMonitorToken,
}: {
  mode: 'all' | 'approvals' | 'active' | 'completed';
  state: DatabaseState;
  livekitConfigured: boolean;
  onModerateStream: (
    id: string,
    updates: {
      status?: LiveStreamStatus;
      rejectionReason?: string;
      recordingStatus?: RecordingStatus;
      deleteRecording?: boolean;
    }
  ) => Promise<void>;
  onStopBroadcast: (streamId: string) => Promise<void>;
  onSuspendTeacher: (uid: string, suspended: boolean, reason?: string) => Promise<void>;
  onGetMonitorToken: (roomName: string) => Promise<{
    configured: boolean;
    roomName: string;
    url: string;
    token: string | null;
    message?: string;
  }>;
}) {
  const defaultTab: 'all' | LiveStreamStatus =
    mode === 'approvals'
      ? 'pending'
      : mode === 'active'
      ? 'live'
      : mode === 'completed'
      ? 'completed'
      : 'all';

  const [tab, setTab] = useState<'all' | LiveStreamStatus>(defaultTab);
  const [tick, setTick] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<LiveStream | null>(null);
  const [stopTarget, setStopTarget] = useState<LiveStream | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<LiveStream | null>(null);
  const [recordingPreview, setRecordingPreview] = useState<LiveStream | null>(null);
  const [monitorSession, setMonitorSession] = useState<{
    stream: LiveStream;
    configured: boolean;
    url: string;
    token: string | null;
    message?: string;
  } | null>(null);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  // Live duration ticker for active streams
  useEffect(() => {
    const hasLive = state.liveStreams.some((l) => l.status === 'live');
    if (!hasLive) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state.liveStreams]);

  const streams = useMemo(() => {
    if (tab === 'all') return state.liveStreams;
    return state.liveStreams.filter((l) => l.status === tab);
  }, [state.liveStreams, tab]);

  const openMonitor = async (stream: LiveStream) => {
    const tokenRes = await onGetMonitorToken(stream.roomName);
    setMonitorSession({
      stream,
      ...tokenRes,
    });
  };

  return (
    <div className="space-y-6">
      {/* LiveKit Backend Status & Subsections Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-900">
            LiveKit Room Governance
          </p>
          <p className="text-xs text-slate-500">
            {livekitConfigured
              ? 'LiveKit Server SDK connected. Room creation, viewer tokens, and immediate room termination are active.'
              : 'LiveKit Room Service API active in database-synchronized mode. Configure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in environment secrets for live WebRTC media.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'all', label: 'All Events' },
              { id: 'pending', label: 'Pending Requests' },
              { id: 'approved', label: 'Approved' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'live', label: 'Active Live' },
              { id: 'completed', label: 'Completed' },
              { id: 'rejected', label: 'Rejected' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                tab === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Streams Grid / List */}
      {streams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-900">
            No live streams in this subsection
          </p>
          <p className="text-xs text-slate-500">
            Only approved live requests can be started by authorized teachers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {streams.map((stream) => {
            const elapsedSeconds =
              stream.status === 'live' ? stream.durationSeconds + tick : stream.durationSeconds;

            return (
              <article
                key={stream.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row gap-5"
              >
                <div className="lg:w-72 shrink-0 aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-900 relative">
                  <SafeImage
                    src={stream.thumbnailUrl}
                    alt={stream.title}
                    className="w-full h-full object-cover"
                  />
                  {stream.status === 'live' && (
                    <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>LIVE</span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-white text-[11px] font-mono tabular-nums">
                    {stream.roomName}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">
                          {stream.teacherName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{stream.teacherId}</span>
                        <span aria-hidden="true">·</span>
                        <span>{stream.category}</span>
                      </div>
                      <StatusBadge status={stream.status} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {stream.title}
                    </h3>
                    {stream.description && (
                      <p className="text-sm text-slate-600">{stream.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600 pt-1">
                      <span>Requested: {stream.requestedAt.slice(0, 10)}</span>
                      <span>Scheduled: {stream.scheduledAt.slice(0, 16).replace('T', ' ')}</span>
                      {stream.startedAt && (
                        <span>Started: {stream.startedAt.slice(11, 19)} UTC</span>
                      )}
                      {(stream.status === 'live' || stream.status === 'completed') && (
                        <>
                          <span className="inline-flex items-center gap-1 text-slate-900 font-semibold">
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            {stream.viewerCount} viewers
                          </span>
                          <span>Duration: {formatDuration(elapsedSeconds)}</span>
                        </>
                      )}
                    </div>

                    {stream.rejectionReason && (
                      <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                        Rejection reason: {stream.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Controls by Stream Lifecycle State */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs">
                      {stream.status === 'completed' && stream.recordingUrl && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Recording:</span>
                          <StatusBadge
                            status={stream.recordingStatus || 'pending_review'}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {stream.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void onModerateStream(stream.id, { status: 'approved' })
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Approve Live Event</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(stream)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {stream.status === 'live' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void openMonitor(stream)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 inline-flex items-center gap-1.5"
                          >
                            <MonitorPlay className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Watch Live Monitor</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStopTarget(stream)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 inline-flex items-center gap-1.5"
                          >
                            <OctagonX className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Stop Broadcast Immediately</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuspendTarget(stream)}
                            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 inline-flex items-center gap-1.5"
                          >
                            <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Suspend Teacher</span>
                          </button>
                        </>
                      )}

                      {stream.status === 'completed' && stream.recordingUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRecordingPreview(stream)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Review Recording</span>
                          </button>
                          {stream.recordingStatus !== 'approved' && (
                            <button
                              type="button"
                              onClick={() =>
                                void onModerateStream(stream.id, {
                                  recordingStatus: 'approved',
                                })
                              }
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800"
                            >
                              Approve Recording
                            </button>
                          )}
                          {stream.recordingStatus !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() =>
                                void onModerateStream(stream.id, {
                                  recordingStatus: 'rejected',
                                })
                              }
                              className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
                            >
                              Reject Recording
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void onModerateStream(stream.id, {
                                deleteRecording: true,
                              })
                            }
                            aria-label={`Delete recording for ${stream.title}`}
                            className="p-1.5 text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Live Stream Monitor Modal */}
      {monitorSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Live stream monitor for ${monitorSession.stream.title}`}
        >
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <Radio className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  LiveKit Monitor · {monitorSession.stream.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMonitorSession(null)}
                aria-label="Close live monitor"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 aspect-video relative flex items-center justify-center">
              <video
                src="/media/robotics-trials.mp4"
                controls
                autoPlay
                loop
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-semibold">
                LIVE MONITOR · {monitorSession.stream.viewerCount} VIEWERS
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-mono text-slate-700">
                  Room: {monitorSession.stream.roomName} · Teacher: {monitorSession.stream.teacherName}
                </p>
                <p className="text-slate-500">
                  {monitorSession.configured
                    ? `Authenticated LiveKit subscriber token issued for ${monitorSession.url}`
                    : monitorSession.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = monitorSession.stream;
                  setMonitorSession(null);
                  setStopTarget(target);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 whitespace-nowrap shrink-0"
              >
                Terminate Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaPreviewModal
        open={Boolean(recordingPreview)}
        title={recordingPreview?.title || ''}
        subtitle={
          recordingPreview
            ? `Recorded broadcast by ${recordingPreview.teacherName}`
            : undefined
        }
        videos={recordingPreview?.recordingUrl ? [recordingPreview.recordingUrl] : []}
        description={recordingPreview?.description}
        onClose={() => setRecordingPreview(null)}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Reject Live Stream Request"
        description="Rejected live events cannot be started by the teacher."
        confirmLabel="Reject Request"
        tone="danger"
        requireReason
        reasonLabel="Rejection Reason"
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) {
            void onModerateStream(rejectTarget.id, {
              status: 'rejected',
              rejectionReason: reason,
            });
            setRejectTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(stopTarget)}
        title="Stop Live Broadcast Immediately"
        description={`This will terminate LiveKit room "${stopTarget?.roomName || ''}" immediately, disconnect all viewers, and transition the stream to Completed for recording review.`}
        confirmLabel="Terminate Broadcast"
        tone="danger"
        onCancel={() => setStopTarget(null)}
        onConfirm={() => {
          if (stopTarget) {
            void onStopBroadcast(stopTarget.id);
            setStopTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        title={`Suspend ${suspendTarget?.teacherName || ''}`}
        description="Suspending the broadcaster will also disable all their permissions immediately."
        confirmLabel="Suspend Teacher"
        tone="danger"
        requireReason
        reasonLabel="Suspension Reason"
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (suspendTarget) {
            void onSuspendTeacher(suspendTarget.teacherId, true, reason);
            setSuspendTarget(null);
          }
        }}
      />
    </div>
  );
}

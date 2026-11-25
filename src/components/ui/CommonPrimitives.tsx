import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  PauseCircle,
  Radio,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const configs: Record<
    string,
    { label: string; classes: string; icon: React.ReactNode }
  > = {
    approved: {
      label: 'Approved',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    active: {
      label: 'Active',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    visible: {
      label: 'Visible',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    pending: {
      label: 'Pending',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    pending_review: {
      label: 'Pending Review',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    scheduled: {
      label: 'Scheduled',
      classes: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    live: {
      label: 'Live Now',
      classes: 'bg-red-50 text-red-700 border-red-200',
      icon: <Radio className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    completed: {
      label: 'Completed',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    rejected: {
      label: 'Rejected',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    removed: {
      label: 'Removed',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    suspended: {
      label: 'Suspended',
      classes: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    flagged: {
      label: 'Flagged',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    open: {
      label: 'Open Report',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    resolved_removed: {
      label: 'Resolved',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    dismissed: {
      label: 'Dismissed',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    inactive: {
      label: 'Inactive',
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  };

  const cfg = configs[normalized] || {
    label: status,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${cfg.classes}`}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}

export function SafeImage({
  src,
  alt,
  className = '',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 border border-slate-200 ${className}`}
        aria-label={alt}
      >
        <ImageIcon className="w-5 h-5" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-slate-900' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'default',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Provide a clear reason...',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireReason && !reason.trim()) {
      setError('Please enter a reason before continuing.');
      return;
    }
    const val = reason.trim();
    setReason('');
    setError('');
    onConfirm(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={() => {
              setReason('');
              setError('');
              onCancel();
            }}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
          {requireReason && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                {reasonLabel}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                placeholder={reasonPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setReason('');
              setError('');
              onCancel();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg whitespace-nowrap ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function MediaPreviewModal({
  open,
  title,
  subtitle,
  photos = [],
  videos = [],
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  photos?: string[];
  videos?: string[];
  description?: string;
  onClose: () => void;
}) {
  const mediaItems = [
    ...photos.map((url) => ({ type: 'photo' as const, url })),
    ...videos.map((url) => ({ type: 'video' as const, url })),
  ];
  const [index, setIndex] = useState(0);

  if (!open) return null;

  const current = mediaItems[index] || mediaItems[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Media preview for ${title}`}
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media preview"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 flex-1 flex items-center justify-center relative min-h-[340px] max-h-[60vh] overflow-hidden">
          {current ? (
            current.type === 'photo' ? (
              <SafeImage
                src={current.url}
                alt={title}
                className="max-h-[58vh] w-auto object-contain"
              />
            ) : (
              <video
                key={current.url}
                src={current.url}
                controls
                autoPlay
                className="max-h-[58vh] w-full object-contain"
              />
            )
          ) : (
            <p className="text-sm text-slate-400">No attached media.</p>
          )}

          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous media item"
                onClick={() =>
                  setIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white shadow"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Next media item"
                onClick={() => setIndex((prev) => (prev + 1) % mediaItems.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white shadow"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {(description || mediaItems.length > 1) && (
          <div className="p-5 border-t border-slate-200 space-y-3 bg-white">
            {description && (
              <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
            )}
            {mediaItems.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {mediaItems.map((item, idx) => (
                  <button
                    key={`${item.url}-${idx}`}
                    type="button"
                    onClick={() => setIndex(idx)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${
                      idx === index
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.type === 'photo' ? `Photo ${idx + 1}` : `Video ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

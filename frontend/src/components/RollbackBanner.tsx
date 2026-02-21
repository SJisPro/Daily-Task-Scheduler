import React from 'react';
import { ArrowUturnLeftIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CopyTargetType } from '../types';

interface RollbackBannerProps {
  isVisible: boolean;
  taskCount: number;
  onRollback: () => void;
  onDismiss: () => void;
  type: CopyTargetType;
  rollingBack?: boolean;
}

const LABEL_MAP: Record<CopyTargetType, string> = {
  weekdays: 'weekdays (Mon–Fri)',
  weekend: 'the weekend (Sat–Sun)',
  week: 'the whole week',
  month: 'the next 30 days',
};

const RollbackBanner: React.FC<RollbackBannerProps> = ({
  isVisible,
  taskCount,
  onRollback,
  onDismiss,
  type,
  rollingBack = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-up">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(20,184,166,0.35)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(20,184,166,0.15)',
        }}
      >
        {/* Top teal accent line */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #14b8a6, #a855f7, #14b8a6)' }} />

        <div className="p-4 flex items-start gap-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)' }}
          >
            <CheckCircleIcon className="w-5 h-5 text-primary-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-100 text-sm">Tasks Duplicated! 🎉</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              <span className="text-primary-400 font-semibold">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>{' '}
              copied to {LABEL_MAP[type] ?? type}.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                id="rollback-undo-btn"
                onClick={onRollback}
                disabled={rollingBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200"
                style={{
                  background: rollingBack
                    ? 'rgba(20,184,166,0.4)'
                    : 'linear-gradient(135deg,#14b8a6,#0d9488)',
                  boxShadow: rollingBack ? 'none' : '0 3px 10px rgba(20,184,166,0.4)',
                  cursor: rollingBack ? 'not-allowed' : 'pointer',
                }}
              >
                {rollingBack ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Undoing...
                  </>
                ) : (
                  <>
                    <ArrowUturnLeftIcon className="w-3 h-3" />
                    Undo
                  </>
                )}
              </button>
              <button
                id="rollback-dismiss-btn"
                onClick={onDismiss}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            id="rollback-close-btn"
            onClick={onDismiss}
            className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors p-1"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RollbackBanner;

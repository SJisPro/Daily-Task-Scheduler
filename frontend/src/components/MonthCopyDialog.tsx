import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { MonthCopyType } from '../types';

interface MonthCopyDialogProps {
  isOpen: boolean;
  taskCount: number;
  sourceDate: string;
  onSelect: (type: MonthCopyType) => void;
  onCancel: () => void;
  copying: boolean;
  singleTask?: boolean;
}

interface OptionCard {
  type: MonthCopyType;
  emoji: string;
  label: string;
  description: string;
  gradient: string;
  borderNormal: string;
  borderHover: string;
  badge: { bg: string; color: string; border: string };
  badgeText: string;
  group: 'current' | 'next';
}

const OPTIONS: OptionCard[] = [
  // ── Current month ─────────────────────────────────────────────────────────
  {
    type: 'month_weekdays',
    emoji: '💼',
    label: 'This Month — Weekdays',
    description: 'Copies to all remaining weekdays (Mon–Fri) in the current month.',
    gradient: 'rgba(59,130,246,0.08)',
    borderNormal: 'rgba(59,130,246,0.2)',
    borderHover: 'rgba(59,130,246,0.5)',
    badge: { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: 'rgba(59,130,246,0.25)' },
    badgeText: 'Remaining weekdays',
    group: 'current',
  },
  {
    type: 'month_weekend',
    emoji: '🌴',
    label: 'This Month — Weekends',
    description: 'Copies to all remaining weekend days (Sat & Sun) in the current month.',
    gradient: 'rgba(245,158,11,0.08)',
    borderNormal: 'rgba(245,158,11,0.2)',
    borderHover: 'rgba(245,158,11,0.5)',
    badge: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
    badgeText: 'Remaining weekends',
    group: 'current',
  },
  {
    type: 'month_all',
    emoji: '📆',
    label: 'This Month — All Days',
    description: 'Copies to every remaining day in the current calendar month.',
    gradient: 'rgba(168,85,247,0.08)',
    borderNormal: 'rgba(168,85,247,0.2)',
    borderHover: 'rgba(168,85,247,0.5)',
    badge: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
    badgeText: 'All remaining days',
    group: 'current',
  },
  // ── Next month ────────────────────────────────────────────────────────────
  {
    type: 'next_month_weekdays',
    emoji: '🗂️',
    label: 'Next Month — Weekdays',
    description: 'Copies to all weekdays (Mon–Fri) in next calendar month.',
    gradient: 'rgba(20,184,166,0.08)',
    borderNormal: 'rgba(20,184,166,0.2)',
    borderHover: 'rgba(20,184,166,0.5)',
    badge: { bg: 'rgba(20,184,166,0.12)', color: '#2dd4bf', border: 'rgba(20,184,166,0.25)' },
    badgeText: '~21 days',
    group: 'next',
  },
  {
    type: 'next_month_weekend',
    emoji: '🏖️',
    label: 'Next Month — Weekends',
    description: 'Copies to all weekend days (Sat & Sun) in next calendar month.',
    gradient: 'rgba(236,72,153,0.08)',
    borderNormal: 'rgba(236,72,153,0.2)',
    borderHover: 'rgba(236,72,153,0.5)',
    badge: { bg: 'rgba(236,72,153,0.12)', color: '#f472b6', border: 'rgba(236,72,153,0.25)' },
    badgeText: '~8 days',
    group: 'next',
  },
  {
    type: 'next_month_all',
    emoji: '🗓️',
    label: 'Next Month — All Days',
    description: 'Copies to every single day of next calendar month.',
    gradient: 'rgba(34,197,94,0.08)',
    borderNormal: 'rgba(34,197,94,0.2)',
    borderHover: 'rgba(34,197,94,0.5)',
    badge: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
    badgeText: '28-31 days',
    group: 'next',
  },
];

const MonthCopyDialog: React.FC<MonthCopyDialogProps> = ({
  isOpen, taskCount, sourceDate, onSelect, onCancel, copying, singleTask,
}) => {
  if (!isOpen) return null;

  const currentMonth = OPTIONS.filter(o => o.group === 'current');
  const nextMonth = OPTIONS.filter(o => o.group === 'next');

  const renderOption = (opt: OptionCard) => (
    <button
      key={opt.type}
      id={`month-copy-option-${opt.type}`}
      onClick={() => onSelect(opt.type)}
      disabled={copying}
      className="w-full text-left rounded-2xl p-3.5 transition-all duration-200"
      style={{
        background: opt.gradient,
        border: `1.5px solid ${opt.borderNormal}`,
        opacity: copying ? 0.5 : 1,
        cursor: copying ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!copying) {
          (e.currentTarget as HTMLButtonElement).style.border = `1.5px solid ${opt.borderHover}`;
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 20px rgba(0,0,0,0.3)`;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.border = `1.5px solid ${opt.borderNormal}`;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl leading-none flex-shrink-0">{opt.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-200 text-sm">{opt.label}</span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: opt.badge.bg, color: opt.badge.color, border: `1px solid ${opt.badge.border}` }}
            >
              {opt.badgeText}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{opt.description}</p>
        </div>
        <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-lg animate-slide-up rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.97)',
          border: '1px solid rgba(51,65,85,0.7)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(168,85,247,0.12)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between sticky top-0 z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.15) 100%)',
            borderBottom: '1px solid rgba(51,65,85,0.5)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold text-slate-100">Copy to Month</h2>
            <p className="text-sm text-slate-400 mt-1">
              {singleTask ? (
                <span className="text-accent-400 font-semibold">1 task</span>
              ) : (
                <span className="text-accent-400 font-semibold">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
              )}
              {' '}from <span className="text-slate-200 font-medium">{sourceDate}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              ✅ Duplicate titles on same day are automatically skipped. Past days are never copied to.
            </p>
          </div>
          <button
            id="month-copy-dialog-close"
            onClick={onCancel}
            disabled={copying}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 ml-3"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2.5">
              📅 Current Month
            </p>
            <div className="space-y-2">{currentMonth.map(renderOption)}</div>
          </div>

          <div className="divider" />

          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2.5">
              ➡️ Next Month
            </p>
            <div className="space-y-2">{nextMonth.map(renderOption)}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            id="month-copy-dialog-cancel"
            onClick={onCancel}
            disabled={copying}
            className="btn-secondary w-full"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthCopyDialog;

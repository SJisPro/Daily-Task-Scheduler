import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Task, CopyTargetType } from '../types';

interface SingleTaskCopyDialogProps {
  isOpen: boolean;
  task: Task | null;
  onSelect: (type: CopyTargetType) => void;
  onCancel: () => void;
  copying: boolean;
}

type Section = 'week' | 'month';

interface OptionCard {
  type: CopyTargetType;
  emoji: string;
  label: string;
  description: string;
  gradient: string;
  borderNormal: string;
  borderHover: string;
  color: string;
  group: 'this_week' | 'next_week' | 'current_month' | 'next_month';
}

const WEEK_OPTIONS: OptionCard[] = [
  {
    type: 'weekdays',
    emoji: '💼',
    label: 'This Week Weekdays',
    description: 'Remaining Mon–Fri this week',
    gradient: 'rgba(59,130,246,0.07)',
    borderNormal: 'rgba(59,130,246,0.2)',
    borderHover: 'rgba(59,130,246,0.5)',
    color: '#93c5fd',
    group: 'this_week',
  },
  {
    type: 'weekend',
    emoji: '🌴',
    label: 'This Week Weekend',
    description: 'Sat & Sun this week',
    gradient: 'rgba(245,158,11,0.07)',
    borderNormal: 'rgba(245,158,11,0.2)',
    borderHover: 'rgba(245,158,11,0.5)',
    color: '#fbbf24',
    group: 'this_week',
  },
  {
    type: 'week',
    emoji: '📆',
    label: 'This Entire Week',
    description: 'All remaining days this week',
    gradient: 'rgba(168,85,247,0.07)',
    borderNormal: 'rgba(168,85,247,0.2)',
    borderHover: 'rgba(168,85,247,0.5)',
    color: '#c084fc',
    group: 'this_week',
  },
  {
    type: 'next_week_weekdays',
    emoji: '🗂️',
    label: 'Next Week Weekdays',
    description: 'Mon–Fri next week',
    gradient: 'rgba(20,184,166,0.07)',
    borderNormal: 'rgba(20,184,166,0.2)',
    borderHover: 'rgba(20,184,166,0.5)',
    color: '#2dd4bf',
    group: 'next_week',
  },
  {
    type: 'next_week_weekend',
    emoji: '🏖️',
    label: 'Next Week Weekend',
    description: 'Sat & Sun next week',
    gradient: 'rgba(236,72,153,0.07)',
    borderNormal: 'rgba(236,72,153,0.2)',
    borderHover: 'rgba(236,72,153,0.5)',
    color: '#f472b6',
    group: 'next_week',
  },
  {
    type: 'next_week',
    emoji: '🗓️',
    label: 'Entire Next Week',
    description: 'All 7 days next week',
    gradient: 'rgba(34,197,94,0.07)',
    borderNormal: 'rgba(34,197,94,0.2)',
    borderHover: 'rgba(34,197,94,0.5)',
    color: '#4ade80',
    group: 'next_week',
  },
];

const MONTH_OPTIONS: OptionCard[] = [
  {
    type: 'month_weekdays',
    emoji: '💼',
    label: 'This Month Weekdays',
    description: 'Remaining weekdays this month',
    gradient: 'rgba(59,130,246,0.07)',
    borderNormal: 'rgba(59,130,246,0.2)',
    borderHover: 'rgba(59,130,246,0.5)',
    color: '#93c5fd',
    group: 'current_month',
  },
  {
    type: 'month_weekend',
    emoji: '🌴',
    label: 'This Month Weekends',
    description: 'Remaining weekends this month',
    gradient: 'rgba(245,158,11,0.07)',
    borderNormal: 'rgba(245,158,11,0.2)',
    borderHover: 'rgba(245,158,11,0.5)',
    color: '#fbbf24',
    group: 'current_month',
  },
  {
    type: 'month_all',
    emoji: '📆',
    label: 'Entire Remaining Month',
    description: 'All remaining days this month',
    gradient: 'rgba(168,85,247,0.07)',
    borderNormal: 'rgba(168,85,247,0.2)',
    borderHover: 'rgba(168,85,247,0.5)',
    color: '#c084fc',
    group: 'current_month',
  },
  {
    type: 'next_month_weekdays',
    emoji: '🗂️',
    label: 'Next Month Weekdays',
    description: 'All weekdays next month',
    gradient: 'rgba(20,184,166,0.07)',
    borderNormal: 'rgba(20,184,166,0.2)',
    borderHover: 'rgba(20,184,166,0.5)',
    color: '#2dd4bf',
    group: 'next_month',
  },
  {
    type: 'next_month_weekend',
    emoji: '🏖️',
    label: 'Next Month Weekends',
    description: 'All weekends next month',
    gradient: 'rgba(236,72,153,0.07)',
    borderNormal: 'rgba(236,72,153,0.2)',
    borderHover: 'rgba(236,72,153,0.5)',
    color: '#f472b6',
    group: 'next_month',
  },
  {
    type: 'next_month_all',
    emoji: '🗓️',
    label: 'Entire Next Month',
    description: 'Every day next month',
    gradient: 'rgba(34,197,94,0.07)',
    borderNormal: 'rgba(34,197,94,0.2)',
    borderHover: 'rgba(34,197,94,0.5)',
    color: '#4ade80',
    group: 'next_month',
  },
];

const SingleTaskCopyDialog: React.FC<SingleTaskCopyDialogProps> = ({
  isOpen, task, onSelect, onCancel, copying,
}) => {
  const [activeSection, setActiveSection] = useState<Section>('week');
  if (!isOpen || !task) return null;

  const renderOption = (opt: OptionCard) => (
    <button
      key={opt.type}
      id={`single-copy-${opt.type}`}
      onClick={() => onSelect(opt.type)}
      disabled={copying}
      className="w-full text-left rounded-xl p-3 transition-all duration-200 flex items-center gap-3"
      style={{
        background: opt.gradient,
        border: `1px solid ${opt.borderNormal}`,
        opacity: copying ? 0.5 : 1,
        cursor: copying ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!copying) {
          (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${opt.borderHover}`;
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px rgba(0,0,0,0.25)`;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${opt.borderNormal}`;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      <span className="text-lg">{opt.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: opt.color }}>{opt.label}</div>
        <div className="text-[11px] text-slate-500">{opt.description}</div>
      </div>
      <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  const weekOptions = WEEK_OPTIONS;
  const monthOptions = MONTH_OPTIONS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-md animate-slide-up rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.97)',
          border: '1px solid rgba(51,65,85,0.7)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(168,85,247,0.15) 100%)',
            borderBottom: '1px solid rgba(51,65,85,0.5)',
          }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-100">Copy Task</h2>
            <p className="text-xs text-primary-400 font-semibold mt-0.5 truncate">"{task.title}"</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Duplicate-title days are skipped · Past days never copied
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={copying}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 ml-3"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
          {(['week', 'month'] as Section[]).map(sec => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className="flex-1 py-3 text-sm font-semibold transition-all duration-200"
              style={{
                color: activeSection === sec ? '#14b8a6' : '#64748b',
                borderBottom: activeSection === sec ? '2px solid #14b8a6' : '2px solid transparent',
                background: activeSection === sec ? 'rgba(20,184,166,0.06)' : 'transparent',
              }}
            >
              {sec === 'week' ? '📅 Week' : '🗓️ Month'}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {activeSection === 'week' ? (
            <>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">This Week</p>
                <div className="space-y-1.5">{weekOptions.filter(o => o.group === 'this_week').map(renderOption)}</div>
              </div>
              <div className="divider" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Next Week</p>
                <div className="space-y-1.5">{weekOptions.filter(o => o.group === 'next_week').map(renderOption)}</div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">This Month</p>
                <div className="space-y-1.5">{monthOptions.filter(o => o.group === 'current_month').map(renderOption)}</div>
              </div>
              <div className="divider" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Next Month</p>
                <div className="space-y-1.5">{monthOptions.filter(o => o.group === 'next_month').map(renderOption)}</div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex-shrink-0">
          <button onClick={onCancel} disabled={copying} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleTaskCopyDialog;

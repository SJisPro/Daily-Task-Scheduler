import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { WeekCopyType } from '../types';

interface WeekCopyDialogProps {
    isOpen: boolean;
    taskCount: number;
    sourceDate: string;
    onSelect: (type: WeekCopyType) => void;
    onCancel: () => void;
    copying: boolean;
}

interface OptionCard {
    type: WeekCopyType;
    emoji: string;
    label: string;
    subtitle: string;
    description: string;
    gradient: string;
    borderNormal: string;
    borderHover: string;
    badge: { bg: string; color: string; border: string };
    badgeText: string;
}

const OPTIONS: OptionCard[] = [
    {
        type: 'weekdays',
        emoji: '💼',
        label: 'Monday – Friday',
        subtitle: 'Weekdays only',
        description: 'Perfect for work or school tasks. Copies to all 5 weekdays of this week.',
        gradient: 'rgba(59,130,246,0.08)',
        borderNormal: 'rgba(59,130,246,0.2)',
        borderHover: 'rgba(59,130,246,0.5)',
        badge: { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: 'rgba(59,130,246,0.25)' },
        badgeText: 'Up to 4 days',
    },
    {
        type: 'weekend',
        emoji: '🌴',
        label: 'Saturday & Sunday',
        subtitle: 'Weekend only',
        description: 'For leisure or personal tasks. Copies to Saturday and Sunday of this week.',
        gradient: 'rgba(245,158,11,0.08)',
        borderNormal: 'rgba(245,158,11,0.2)',
        borderHover: 'rgba(245,158,11,0.5)',
        badge: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
        badgeText: 'Up to 2 days',
    },
    {
        type: 'week',
        emoji: '📆',
        label: 'Entire Week',
        subtitle: 'Monday – Sunday',
        description: "Copies to every day of this calendar week (Mon–Sun), skipping today's date.",
        gradient: 'rgba(168,85,247,0.08)',
        borderNormal: 'rgba(168,85,247,0.2)',
        borderHover: 'rgba(168,85,247,0.5)',
        badge: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
        badgeText: 'Up to 6 days',
    },
];

const WeekCopyDialog: React.FC<WeekCopyDialogProps> = ({
    isOpen,
    taskCount,
    sourceDate,
    onSelect,
    onCancel,
    copying,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        >
            <div
                className="w-full max-w-lg animate-slide-up rounded-3xl overflow-hidden"
                style={{
                    background: 'rgba(10,15,30,0.96)',
                    border: '1px solid rgba(51,65,85,0.7)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(20,184,166,0.12)',
                }}
            >
                {/* Header */}
                <div
                    className="px-6 py-5 flex items-start justify-between"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(168,85,247,0.15) 100%)',
                        borderBottom: '1px solid rgba(51,65,85,0.5)',
                    }}
                >
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Copy Tasks to Week</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            <span className="text-primary-400 font-semibold">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>{' '}
                            from <span className="text-slate-200 font-medium">{sourceDate}</span>
                        </p>
                    </div>
                    <button
                        id="week-copy-dialog-close"
                        onClick={onCancel}
                        disabled={copying}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Options */}
                <div className="px-6 py-5 space-y-3">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-4">
                        Choose which days to copy to:
                    </p>

                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            id={`week-copy-option-${opt.type}`}
                            onClick={() => onSelect(opt.type)}
                            disabled={copying}
                            className="w-full text-left rounded-2xl p-4 transition-all duration-200 group"
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
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 24px rgba(0,0,0,0.4)`;
                                }
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.border = `1.5px solid ${opt.borderNormal}`;
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none flex-shrink-0 mt-0.5">{opt.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-200 text-sm">{opt.label}</span>
                                        <span
                                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{ background: opt.badge.bg, color: opt.badge.color, border: `1px solid ${opt.badge.border}` }}
                                        >
                                            {opt.badgeText}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">{opt.subtitle}</p>
                                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{opt.description}</p>
                                </div>
                                <svg className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <div className="divider mb-4" />
                    <button
                        id="week-copy-dialog-cancel"
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

export default WeekCopyDialog;

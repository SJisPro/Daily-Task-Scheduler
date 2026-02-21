import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { WeekCopyType } from '../types';

interface WeekCopyDialogProps {
    isOpen: boolean;
    taskCount: number;
    sourceDate: string;           // formatted display string e.g. "Monday, Feb 21"
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
    border: string;
    badge: string;
    badgeText: string;
}

const OPTIONS: OptionCard[] = [
    {
        type: 'weekdays',
        emoji: '💼',
        label: 'Monday – Friday',
        subtitle: 'Weekdays only',
        description: 'Perfect for work or school tasks. Copies to all 5 weekdays of this week (excluding today if it already falls on a weekday).',
        gradient: 'from-blue-50 to-indigo-50',
        border: 'border-blue-200 hover:border-blue-400',
        badge: 'bg-blue-100 text-blue-700',
        badgeText: 'Up to 4 days',
    },
    {
        type: 'weekend',
        emoji: '🌴',
        label: 'Saturday & Sunday',
        subtitle: 'Weekend only',
        description: 'For leisure or personal tasks. Copies to the Saturday and Sunday of this week.',
        gradient: 'from-amber-50 to-orange-50',
        border: 'border-amber-200 hover:border-amber-400',
        badge: 'bg-amber-100 text-amber-700',
        badgeText: 'Up to 2 days',
    },
    {
        type: 'week',
        emoji: '📆',
        label: 'Entire Week',
        subtitle: 'Monday – Sunday',
        description: 'Copies to every day of this calendar week (Mon–Sun), skipping today\'s date.',
        gradient: 'from-violet-50 to-purple-50',
        border: 'border-violet-200 hover:border-violet-400',
        badge: 'bg-violet-100 text-violet-700',
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                style={{ animation: 'scaleIn 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-6 py-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Copy Tasks to Week</h2>
                        <p className="text-primary-100 text-sm mt-1">
                            {taskCount} task{taskCount !== 1 ? 's' : ''} from <span className="font-semibold text-white">{sourceDate}</span>
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={copying}
                        className="text-white/70 hover:text-white transition-colors mt-0.5"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                    <p className="text-sm text-gray-500 mb-1">
                        Choose which days of this week you'd like to copy your tasks to:
                    </p>

                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            onClick={() => onSelect(opt.type)}
                            disabled={copying}
                            className={`
                w-full text-left rounded-xl border-2 p-4 transition-all duration-200
                bg-gradient-to-br ${opt.gradient} ${opt.border}
                ${copying ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]'}
              `}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none mt-0.5">{opt.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-800 text-base">{opt.label}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${opt.badge}`}>
                                            {opt.badgeText}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 mt-0.5">{opt.subtitle}</p>
                                    <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{opt.description}</p>
                                </div>
                                {copying ? null : (
                                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                    <button
                        onClick={onCancel}
                        disabled={copying}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
        </div>
    );
};

export default WeekCopyDialog;

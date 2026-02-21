/**
 * ReminderPanel.tsx
 *
 * A modal panel that shows existing reminders for a task and lets the user
 * add new ones or delete existing ones.
 *
 * Props:
 *   taskId        – the task to manage reminders for
 *   taskTitle     – display string
 *   isOpen
 *   onClose
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    BellIcon, PlusIcon, TrashIcon, XMarkIcon,
    ClockIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import {
    reminderApi, Reminder, ReminderCreate, ReminderRecurrence,
    getLocalTzOffsetMinutes,
} from '../services/reminders';
import {
    BEFORE_OPTIONS, RECURRENCE_OPTIONS, WEEKDAY_OPTIONS,
} from '../hooks/useReminders';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReminderPanelProps {
    taskId: number;
    taskTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending: { label: 'Scheduled', color: '#2dd4bf' },
    due: { label: 'Due now!', color: '#f59e0b' },
    acknowledged: { label: 'Done', color: '#4ade80' },
    snoozed: { label: 'Snoozed', color: '#c084fc' },
};

const TYPE_LABEL: Record<string, string> = {
    exact: 'At task time',
    before: 'Before task time',
    missed: 'Missed task alert',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ReminderPanel: React.FC<ReminderPanelProps> = ({
    taskId, taskTitle, isOpen, onClose,
}) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [reminderType, setReminderType] = useState<'exact' | 'before'>('exact');
    const [beforeMinutes, setBeforeMinutes] = useState(0);
    const [recurrence, setRecurrence] = useState<ReminderRecurrence>(null);
    const [customDays, setCustomDays] = useState<number[]>([]);

    // ── Load existing reminders ──────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        setError(null);
        try {
            const res = await reminderApi.getByTask(taskId);
            setReminders(res.data);
        } catch {
            setError('Could not load reminders.');
        } finally {
            setLoading(false);
        }
    }, [taskId, isOpen]);

    useEffect(() => { load(); }, [load]);

    // ── Add reminder ─────────────────────────────────────────────────────────
    const handleAdd = async () => {
        setSaving(true);
        setError(null);
        try {
            const body: ReminderCreate = {
                task_id: taskId,
                reminder_type: reminderType,
                before_minutes: reminderType === 'before' ? beforeMinutes : 0,
                recurrence: recurrence ?? undefined,
                recurrence_days: recurrence === 'custom' ? customDays.sort().join(',') : undefined,
                tz_offset_minutes: getLocalTzOffsetMinutes(),
            };
            await reminderApi.create(body);
            await load();
            // Reset form
            setReminderType('exact');
            setBeforeMinutes(0);
            setRecurrence(null);
            setCustomDays([]);
        } catch (err: any) {
            const msg = err?.response?.data?.detail ?? 'Failed to create reminder.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSaving(false);
        }
    };

    // ── Delete reminder ──────────────────────────────────────────────────────
    const handleDelete = async (id: number) => {
        try {
            await reminderApi.delete(id);
            setReminders(prev => prev.filter(r => r.id !== id));
        } catch {
            setError('Failed to delete reminder.');
        }
    };

    // ── Toggle custom day ────────────────────────────────────────────────────
    const toggleDay = (d: number) => {
        setCustomDays(prev =>
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
        );
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div
                className="w-full max-w-lg animate-slide-up rounded-3xl overflow-hidden flex flex-col"
                style={{
                    background: 'rgba(10,15,30,0.97)',
                    border: '1px solid rgba(51,65,85,0.7)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(20,184,166,0.1)',
                    maxHeight: '90vh',
                }}
            >
                {/* ── Header ─────────────────────────────────────────────────────── */}
                <div
                    className="px-6 py-5 flex items-center justify-between flex-shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(168,85,247,0.12) 100%)',
                        borderBottom: '1px solid rgba(51,65,85,0.5)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)' }}
                        >
                            <BellAlertIcon className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-100">Reminders</h2>
                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">{taskTitle}</p>
                        </div>
                    </div>
                    <button
                        id="reminder-panel-close"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ─────────────────────────────────────────────── */}
                <div className="overflow-y-auto flex-1">

                    {/* ── Existing reminders ─────────────────────────────────────────── */}
                    <div className="px-6 pt-5 pb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Active Reminders
                        </p>

                        {loading && (
                            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Loading…
                            </div>
                        )}

                        {!loading && reminders.length === 0 && (
                            <div
                                className="rounded-xl px-4 py-6 text-center"
                                style={{ border: '1px dashed rgba(51,65,85,0.5)' }}
                            >
                                <BellIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No reminders set</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {reminders.map(r => {
                                const statusInfo = STATUS_LABEL[r.status] ?? { label: r.status, color: '#94a3b8' };
                                const label = r.reminder_type === 'before' && r.before_minutes > 0
                                    ? `${r.before_minutes} min before`
                                    : TYPE_LABEL[r.reminder_type];
                                const recurrenceLabel = r.recurrence
                                    ? RECURRENCE_OPTIONS.find(o => o.value === r.recurrence)?.label ?? r.recurrence
                                    : 'One-time';

                                return (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between rounded-xl px-4 py-3 group/item"
                                        style={{
                                            background: 'rgba(30,41,59,0.6)',
                                            border: '1px solid rgba(51,65,85,0.4)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <ClockIcon className="w-4 h-4 text-primary-400 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-200">{label}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {recurrenceLabel}
                                                    {r.next_fire_at && (
                                                        <span className="ml-2"> · next: {new Date(r.next_fire_at + 'Z').toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: `${statusInfo.color}18`,
                                                    color: statusInfo.color,
                                                    border: `1px solid ${statusInfo.color}33`,
                                                }}
                                            >
                                                {statusInfo.label}
                                            </span>
                                            <button
                                                id={`reminder-delete-${r.id}`}
                                                onClick={() => handleDelete(r.id)}
                                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100"
                                                style={{ background: 'rgba(239,68,68,0.08)' }}
                                                title="Delete reminder"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Add new reminder form ─────────────────────────────────────── */}
                    <div
                        className="mx-6 mb-6 rounded-2xl p-5"
                        style={{
                            background: 'rgba(20,184,166,0.04)',
                            border: '1px solid rgba(20,184,166,0.15)',
                        }}
                    >
                        <p className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <PlusIcon className="w-3.5 h-3.5" /> Add Reminder
                        </p>

                        {/* Reminder type */}
                        <div className="mb-4">
                            <label className="label">When to remind</label>
                            <div className="flex gap-2">
                                {(['exact', 'before'] as const).map(t => (
                                    <button
                                        key={t}
                                        id={`reminder-type-${t}`}
                                        onClick={() => setReminderType(t)}
                                        className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                                        style={reminderType === t
                                            ? { background: 'rgba(20,184,166,0.2)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.4)' }
                                            : { background: 'rgba(30,41,59,0.7)', color: '#64748b', border: '1px solid rgba(51,65,85,0.5)' }
                                        }
                                    >
                                        {t === 'exact' ? '🔔 At task time' : '⏰ Before task time'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Before minutes selector */}
                        {reminderType === 'before' && (
                            <div className="mb-4">
                                <label className="label">How far in advance</label>
                                <div className="flex flex-wrap gap-2">
                                    {BEFORE_OPTIONS.filter(o => o.value > 0).map(o => (
                                        <button
                                            key={o.value}
                                            id={`reminder-before-${o.value}`}
                                            onClick={() => setBeforeMinutes(o.value)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                            style={beforeMinutes === o.value
                                                ? { background: 'rgba(20,184,166,0.2)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.4)' }
                                                : { background: 'rgba(30,41,59,0.7)', color: '#64748b', border: '1px solid rgba(51,65,85,0.4)' }
                                            }
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recurrence */}
                        <div className="mb-4">
                            <label className="label">Repeat</label>
                            <div className="flex flex-wrap gap-2">
                                {RECURRENCE_OPTIONS.map(o => (
                                    <button
                                        key={String(o.value)}
                                        id={`reminder-recurrence-${o.value ?? 'none'}`}
                                        onClick={() => setRecurrence(o.value as ReminderRecurrence)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={recurrence === o.value
                                            ? { background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }
                                            : { background: 'rgba(30,41,59,0.7)', color: '#64748b', border: '1px solid rgba(51,65,85,0.4)' }
                                        }
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom weekday picker */}
                        {recurrence === 'custom' && (
                            <div className="mb-4">
                                <label className="label">Choose days</label>
                                <div className="flex gap-1.5">
                                    {WEEKDAY_OPTIONS.map(d => (
                                        <button
                                            key={d.value}
                                            id={`reminder-day-${d.value}`}
                                            onClick={() => toggleDay(d.value)}
                                            className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                                            style={customDays.includes(d.value)
                                                ? { background: 'rgba(168,85,247,0.25)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.5)' }
                                                : { background: 'rgba(30,41,59,0.7)', color: '#475569', border: '1px solid rgba(51,65,85,0.4)' }
                                            }
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <p className="text-xs text-red-400 mb-3 px-1 font-medium">{error}</p>
                        )}

                        {/* Submit */}
                        <button
                            id="reminder-add-btn"
                            onClick={handleAdd}
                            disabled={saving || (reminderType === 'before' && beforeMinutes === 0) || (recurrence === 'custom' && customDays.length === 0)}
                            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200"
                            style={{
                                background: saving ? 'rgba(20,184,166,0.4)' : 'linear-gradient(135deg,#14b8a6,#0d9488)',
                                boxShadow: saving ? 'none' : '0 4px 14px rgba(20,184,166,0.4)',
                                cursor: saving ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {saving ? 'Saving…' : '＋ Add Reminder'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReminderPanel;

/**
 * useReminders.ts – Fully automatic daily notification system.
 *
 * Three automatic notifications every day — no per-task setup required:
 *
 *  1. 09:00 AM  → "Morning Schedule": lists every task scheduled today.
 *  2. T−10 min  → "Pre-task alert":   fires 10 minutes before each task
 *                  that is scheduled for TODAY and not yet completed.
 *  3. 11:59 PM  → "Daily Report":     summary of completed vs missed tasks.
 *
 * State is stored in localStorage so a notification is never shown twice
 * for the same day, even across page refreshes.
 *
 * The hook polls every 60 seconds (aligns with the browser's minute tick).
 * It calls the existing GET /api/tasks/?date= endpoint — no new backend
 * routes are needed.
 *
 * Usage — already mounted once in <App>:
 *   useReminders();
 */

import { useEffect, useRef, useCallback } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { taskApi } from '../services/api';
import { Task } from '../types';

const POLL_MS = 60_000; // 60 seconds
const STORAGE_KEY = 'daily_reminders_shown';

// ─── localStorage helpers ──────────────────────────────────────────────────────

interface ShownToday {
    /** Date this record applies to, "yyyy-MM-dd" */
    date: string;
    /** True once the 9 AM morning schedule notification has fired */
    morning_schedule: boolean;
    /** True once the 11:59 PM daily report notification has fired */
    daily_report: boolean;
    /** task.id values for which the 10-min pre-task alert has already fired */
    tasks: number[];
}

function getShownToday(): ShownToday {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed: ShownToday = JSON.parse(raw);
            if (parsed.date === today) return parsed;
        }
    } catch { /* ignore parse errors */ }
    // New day — start fresh
    return { date: today, morning_schedule: false, daily_report: false, tasks: [] };
}

function saveShown(data: ShownToday) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ─── Notification helpers ──────────────────────────────────────────────────────

function canNotify(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
}

function fireNotification(title: string, body: string, tag: string) {
    if (!canNotify()) return;
    const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag,             // replaces previous notification with same tag
        requireInteraction: false,
    });
    n.onclick = () => { window.focus(); n.close(); };
}

/** "14:30" → "2:30 PM" */
function fmt12(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── The three notification types ─────────────────────────────────────────────

function sendMorningSchedule(tasks: Task[]) {
    const pending = tasks
        .filter(t => !t.is_completed)
        .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

    if (pending.length === 0) {
        fireNotification(
            '📅 Good morning! No tasks today',
            'You have a free day — enjoy! 🎉',
            'morning-schedule',
        );
        return;
    }

    // Show up to 5 tasks; notification body can't hold unlimited text
    const lines = pending
        .slice(0, 5)
        .map(t => `${fmt12(t.scheduled_time)}  ${t.title}`)
        .join('\n');
    const overflow = pending.length > 5 ? `\n…and ${pending.length - 5} more` : '';

    fireNotification(
        `📅 Good morning! ${pending.length} task${pending.length !== 1 ? 's' : ''} today`,
        lines + overflow,
        'morning-schedule',
    );
}

function sendPreTaskAlert(task: Task) {
    fireNotification(
        `⏰ Starting in 10 min — ${task.title}`,
        task.description
            ? `${fmt12(task.scheduled_time)}  ·  ${task.description}`
            : `Scheduled at ${fmt12(task.scheduled_time)}`,
        `pre-task-${task.id}`,
    );
}

function sendDailyReport(tasks: Task[]) {
    if (tasks.length === 0) {
        fireNotification(
            '🌙 Daily Report',
            'No tasks were scheduled today.',
            'daily-report',
        );
        return;
    }

    const completed = tasks.filter(t => t.is_completed);
    const missed = tasks.filter(t => !t.is_completed);

    const parts: string[] = [];
    if (completed.length > 0) parts.push(`✅ Completed: ${completed.length}`);
    if (missed.length > 0) parts.push(`❌ Missed: ${missed.length}`);

    const missedNames = missed
        .slice(0, 3)
        .map(t => t.title)
        .join(', ');

    fireNotification(
        `🌙 Day complete — ${completed.length}/${tasks.length} done`,
        parts.join('  ·  ') + (missedNames ? `\nMissed: ${missedNames}` : ''),
        'daily-report',
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReminders() {
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Request notification permission once on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const poll = useCallback(async () => {
        if (!canNotify()) return;

        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const h = now.getHours();
        const m = now.getMinutes();

        const shown = getShownToday();
        let changed = false;

        // Fetch today's tasks — single call reused by all three checks
        let tasks: Task[] = [];
        try {
            const res = await taskApi.getAll(today);
            tasks = res.data || [];
        } catch {
            return; // backend not ready — try again next tick
        }

        // ── 1. Morning schedule at exactly 09:00 ─────────────────────────────────
        // The poll runs every 60 s so it will land within the 09:00 minute window.
        if (h === 9 && m === 0 && !shown.morning_schedule) {
            sendMorningSchedule(tasks);
            shown.morning_schedule = true;
            changed = true;
        }

        // ── 2. Pre-task alerts — 10 minutes before each upcoming task ─────────────
        for (const task of tasks) {
            if (task.is_completed) continue; // already done
            if (shown.tasks.includes(task.id)) continue; // already alerted

            // Build a Date for the task's scheduled time on today's date
            const [th, tm] = task.scheduled_time.split(':').map(Number);
            const taskDt = new Date(now);
            taskDt.setHours(th, tm, 0, 0);

            // differenceInMinutes floors towards zero → window [9, 11] covers the
            // full 60-second poll granularity around the 10-min mark
            const diffMin = differenceInMinutes(taskDt, now);
            if (diffMin >= 9 && diffMin <= 11) {
                sendPreTaskAlert(task);
                shown.tasks = [...shown.tasks, task.id];
                changed = true;
            }
        }

        // ── 3. Daily report at 23:59 ─────────────────────────────────────────────
        if (h === 23 && m === 59 && !shown.daily_report) {
            sendDailyReport(tasks);
            shown.daily_report = true;
            changed = true;
        }

        if (changed) saveShown(shown);
    }, []);

    useEffect(() => {
        poll(); // run immediately on mount
        pollRef.current = setInterval(poll, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [poll]);
}

// ─── Re-exports kept for backward-compatibility with ReminderPanel.tsx ────────
// (ReminderPanel is no longer imported anywhere but still compiles cleanly)

/** @deprecated Reminders are now automatic — no per-task configuration needed */
export const SNOOZE_OPTIONS: { label: string; value: number }[] = [];
/** @deprecated */
export const BEFORE_OPTIONS: { label: string; value: number }[] = [];
/** @deprecated */
export const RECURRENCE_OPTIONS: { label: string; value: string | null }[] = [];
/** @deprecated */
export const WEEKDAY_OPTIONS: { label: string; value: number }[] = [];

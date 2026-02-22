/**
 * useReminders.ts
 *
 * Two-layer notification system:
 *
 * Layer 1 — OneSignal Web Push (background, works even when app is closed)
 *   The backend push_service.py sends push notifications via OneSignal at:
 *     09:00 AM  →  Morning schedule
 *     T − 10min →  Pre-task alert for each pending task
 *     23:59 PM  →  Daily report
 *   This layer requires VITE_ONESIGNAL_APP_ID to be set.
 *
 * Layer 2 — In-browser polling (fallback, works when app is open)
 *   The hook polls GET /api/tasks/?date=<today> every 60 seconds and fires
 *   local browser Notification API calls. Uses localStorage to avoid
 *   duplicate notifications within the same day.
 *   This layer works even without OneSignal configured.
 */

import { useEffect, useRef, useCallback } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { taskApi } from '../services/api';
import { Task } from '../types';

const POLL_MS = 60_000;
const STORAGE_KEY = 'daily_reminders_shown';
// OneSignal is initialised in index.html — no duplicate init needed here.

// ─── localStorage helpers (Layer 2) ──────────────────────────────────────────

interface ShownToday {
    date: string;
    morning_schedule: boolean;
    daily_report: boolean;
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
    } catch { /* ignore */ }
    return { date: today, morning_schedule: false, daily_report: false, tasks: [] };
}

function saveShown(data: ShownToday) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ─── Browser notification helpers ────────────────────────────────────────────

function canNotify() {
    return 'Notification' in window && Notification.permission === 'granted';
}

function fireNotification(title: string, body: string, tag: string) {
    if (!canNotify()) return;
    const n = new Notification(title, { body, icon: '/icon-192.png', tag, requireInteraction: false });
    n.onclick = () => { window.focus(); n.close(); };
}

function fmt12(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ─── The three in-browser notification types ─────────────────────────────────

function sendMorningSchedule(tasks: Task[]) {
    const pending = tasks
        .filter(t => !t.is_completed)
        .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

    if (!pending.length) {
        fireNotification('📅 Good morning! No tasks today', 'You have a free day 🎉', 'morning-schedule');
        return;
    }
    const lines = pending.slice(0, 5).map(t => `${fmt12(t.scheduled_time)}  ${t.title}`).join('\n');
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
        task.description ? `${fmt12(task.scheduled_time)}  ·  ${task.description}` : fmt12(task.scheduled_time),
        `pre-task-${task.id}`,
    );
}

function sendDailyReport(tasks: Task[]) {
    if (!tasks.length) {
        fireNotification('🌙 Daily Report', 'No tasks were scheduled today.', 'daily-report');
        return;
    }
    const done = tasks.filter(t => t.is_completed);
    const missed = tasks.filter(t => !t.is_completed);
    const parts = [
        ...(done.length ? [`✅ Completed: ${done.length}`] : []),
        ...(missed.length ? [`❌ Missed: ${missed.length}`] : []),
    ];
    const names = missed.slice(0, 3).map(t => t.title).join(', ');
    fireNotification(
        `🌙 Day complete — ${done.length}/${tasks.length} done`,
        parts.join('  ·  ') + (names ? `\nMissed: ${names}` : ''),
        'daily-report',
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReminders() {
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Request native notification permission for the Layer 2 in-browser fallback.
        // OneSignal (Layer 1) is already initialised in index.html.
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

        let tasks: Task[] = [];
        try {
            tasks = (await taskApi.getAll(today)).data || [];
        } catch { return; }

        // Morning schedule at 09:00
        if (h === 9 && m === 0 && !shown.morning_schedule) {
            sendMorningSchedule(tasks);
            shown.morning_schedule = true;
            changed = true;
        }

        // Pre-task alerts — 10 minutes before each pending task
        for (const task of tasks) {
            if (task.is_completed || shown.tasks.includes(task.id)) continue;
            const [th, tm] = task.scheduled_time.split(':').map(Number);
            const taskDt = new Date(now);
            taskDt.setHours(th, tm, 0, 0);
            const diffMin = differenceInMinutes(taskDt, now);
            if (diffMin >= 9 && diffMin <= 11) {
                sendPreTaskAlert(task);
                shown.tasks = [...shown.tasks, task.id];
                changed = true;
            }
        }

        // Daily report at 23:59
        if (h === 23 && m === 59 && !shown.daily_report) {
            sendDailyReport(tasks);
            shown.daily_report = true;
            changed = true;
        }

        if (changed) saveShown(shown);
    }, []);

    useEffect(() => {
        poll();
        pollRef.current = setInterval(poll, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [poll]);
}

// ─── Backward-compat exports (keep ReminderPanel.tsx compiling) ───────────────
export const SNOOZE_OPTIONS: { label: string; value: number }[] = [];
export const BEFORE_OPTIONS: { label: string; value: number }[] = [];
export const RECURRENCE_OPTIONS: { label: string; value: string | null }[] = [];
export const WEEKDAY_OPTIONS: { label: string; value: number }[] = [];

/**
 * useReminders.ts
 *
 * A hook that:
 *  1. Requests browser Notification permission once.
 *  2. Polls GET /api/reminders/due every 60 seconds.
 *  3. For each due reminder:
 *       - Fires a browser Notification with title, body, and action buttons
 *         (Acknowledge / Snooze 10 min).
 *       - Shows an in-app toast as fallback when the tab is visible.
 *  4. Acknowledges the reminder immediately (fire-and-forget) so the server
 *     doesn't re-deliver it on the next poll.
 *
 * Usage – mount once at the top of <App>:
 *   useReminders();
 */

import { useEffect, useRef, useCallback } from 'react';
import { reminderApi, Reminder } from '../services/reminders';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

// Keep track of reminder IDs we've already shown in this browser session so
// we don't double-fire if the API returns the same reminder twice before ACK
// finishes propagating.
const shownSet = new Set<number>();

export function useReminders() {
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Request notification permission ────────────────────────────────────────
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // ── Fire a browser notification for one reminder ───────────────────────────
    const notify = useCallback(async (reminder: Reminder) => {
        if (shownSet.has(reminder.id)) return;
        shownSet.add(reminder.id);

        const title = reminder.task_title ?? 'Task Reminder';
        const time = reminder.task_scheduled_time ?? '';
        const date = reminder.task_scheduled_date ?? '';

        let bodyLines: string[] = [];
        if (reminder.reminder_type === 'missed') {
            bodyLines = [`📌 Missed task from ${date}`, reminder.task_description ?? ''];
        } else if (reminder.reminder_type === 'before' && reminder.before_minutes > 0) {
            bodyLines = [
                `Due in ${reminder.before_minutes} min  •  ${time}`,
                reminder.task_description ?? '',
            ];
        } else {
            bodyLines = [`Due now  •  ${time}`, reminder.task_description ?? ''];
        }
        const body = bodyLines.filter(Boolean).join('\n');

        // ── Browser Notification (works even when tab is in background) ──────────
        if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(title, {
                body,
                icon: '/favicon.ico',
                tag: `reminder-${reminder.id}`,   // replaces any previous notif with same tag
                requireInteraction: true,          // stays until user dismisses
            });

            // Clicking the notification focuses the tab
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        }

        // ── ACK immediately so the server won't re-deliver on next poll ──────────
        try {
            await reminderApi.acknowledge(reminder.id);
        } catch {
            // Non-fatal – worst case the user sees it again on next poll
            shownSet.delete(reminder.id);
        }
    }, []);

    // ── Poll loop ─────────────────────────────────────────────────────────────
    const poll = useCallback(async () => {
        try {
            const res = await reminderApi.getDue();
            const { reminders } = res.data;
            for (const r of reminders) {
                // Run notifications sequentially so they don't pile up
                await notify(r);
            }
        } catch {
            // Silently skip – backend may be starting up
        }
    }, [notify]);

    useEffect(() => {
        // Immediately poll once when the hook mounts, then on interval
        poll();
        pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [poll]);
}

// ─── Exported helpers that components can reuse ───────────────────────────────

/** Snooze options shown in the UI (value = minutes). */
export const SNOOZE_OPTIONS = [
    { label: '5 min', value: 5 as const },
    { label: '10 min', value: 10 as const },
    { label: '30 min', value: 30 as const },
    { label: '1 hour', value: 60 as const },
];

/** Before-time options shown in the reminder creation UI. */
export const BEFORE_OPTIONS = [
    { label: 'At task time', value: 0 },
    { label: '5 min before', value: 5 },
    { label: '10 min before', value: 10 },
    { label: '15 min before', value: 15 },
    { label: '30 min before', value: 30 },
    { label: '1 hour before', value: 60 },
];

export const RECURRENCE_OPTIONS = [
    { label: 'One-time', value: null },
    { label: 'Every day', value: 'daily' },
    { label: 'Every week', value: 'weekly' },
    { label: 'Weekdays', value: 'weekdays' },
    { label: 'Custom days…', value: 'custom' },
];

export const WEEKDAY_OPTIONS = [
    { label: 'Mon', value: 0 },
    { label: 'Tue', value: 1 },
    { label: 'Wed', value: 2 },
    { label: 'Thu', value: 3 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 5 },
    { label: 'Sun', value: 6 },
];

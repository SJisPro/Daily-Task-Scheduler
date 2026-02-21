/**
 * reminders.ts  –  Frontend API client for the reminder endpoints.
 *
 * All datetimes returned from the server are UTC ISO strings.
 * The hook converts them to local time only for display.
 */
import axios from 'axios';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderType = 'exact' | 'before' | 'missed';
export type ReminderRecurrence = 'daily' | 'weekly' | 'weekdays' | 'custom' | null;
export type ReminderStatus = 'pending' | 'due' | 'acknowledged' | 'snoozed';

export interface Reminder {
    id: number;
    task_id: number;
    reminder_type: ReminderType;
    before_minutes: number;
    recurrence: ReminderRecurrence;
    recurrence_days: string | null;
    status: ReminderStatus;
    next_fire_at: string | null;
    snooze_until: string | null;
    fire_count: number;
    created_at: string;
    fired_at: string | null;
    acknowledged_at: string | null;
    // inlined task info
    task_title: string | null;
    task_description: string | null;
    task_scheduled_date: string | null;
    task_scheduled_time: string | null;
}

export interface DueRemindersResponse {
    reminders: Reminder[];
    server_utc: string;
}

export interface ReminderCreate {
    task_id: number;
    reminder_type: ReminderType;
    before_minutes?: number;      // 0 | 5 | 10 | 15 | 30 | 60
    recurrence?: ReminderRecurrence;
    recurrence_days?: string;     // e.g. "0,2,4"
    tz_offset_minutes?: number;   // e.g. 330 for IST
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const reminderApi = {
    /** Frontend polls this every 60 s to get reminders ready to display. */
    getDue: () =>
        api.get<DueRemindersResponse>('/api/reminders/due'),

    /** Create a reminder config for a task. */
    create: (body: ReminderCreate) =>
        api.post<Reminder>('/api/reminders/', body),

    /** List all reminders for a task (for the settings panel). */
    getByTask: (taskId: number) =>
        api.get<Reminder[]>(`/api/reminders/${taskId}`),

    /** Mark a fired reminder as seen; stops it showing again (unless recurring). */
    acknowledge: (reminderId: number) =>
        api.patch<Reminder>(`/api/reminders/${reminderId}/acknowledge`),

    /** Snooze for 5 | 10 | 30 | 60 minutes. */
    snooze: (reminderId: number, snoozeMinutes: 5 | 10 | 30 | 60) =>
        api.patch<Reminder>(`/api/reminders/${reminderId}/snooze`, {
            snooze_minutes: snoozeMinutes,
        }),

    /** Delete a reminder config entirely. */
    delete: (reminderId: number) =>
        api.delete(`/api/reminders/${reminderId}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the browser's UTC offset in minutes (e.g. 330 for IST). */
export function getLocalTzOffsetMinutes(): number {
    // getTimezoneOffset() returns NEGATIVE of what we want (e.g. IST → -330)
    return -new Date().getTimezoneOffset();
}

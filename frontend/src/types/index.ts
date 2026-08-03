export interface Task {
  id: number;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  reminder_sent: boolean;
  is_missed: boolean;
}

export interface TaskCreate {
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  is_completed?: boolean;
}

export type ViewMode = 'day' | 'week' | 'month' | 'roadmap';

/** All copy-target modes exposed by the duplicate endpoint */
export type WeekCopyType =
  | 'weekdays' | 'weekend' | 'week'
  | 'next_week_weekdays' | 'next_week_weekend' | 'next_week';

export type MonthCopyType =
  | 'month_weekdays' | 'month_weekend' | 'month_all'
  | 'next_month_weekdays' | 'next_month_weekend' | 'next_month_all';

export type CopyTargetType = WeekCopyType | MonthCopyType;

// ─── Analytics types ─────────────────────────────────────────────────────────

export interface DayAnalytics {
  date: string;
  weekday: string;
  total: number;
  completed: number;
  missed: number;
  pending: number;
  completion_pct: number;
}

export interface WeekAnalyticsResponse {
  start_date: string;
  end_date: string;
  days: DayAnalytics[];
}

export interface MonthAnalyticsResponse {
  year: number;
  month: number;
  days: DayAnalytics[];
}

export interface InsightsSummary {
  total_tasks: number;
  total_completed: number;
  total_missed: number;
  overall_completion_pct: number;
  current_streak: number;
  avg_tasks_per_day: number;
}

export interface InsightsResponse {
  start_date: string;
  end_date: string;
  summary: InsightsSummary;
  best_day: DayAnalytics | null;
  worst_day: DayAnalytics | null;
  weekday_breakdown: Record<string, { total: number; completed: number; days: number }>;
  suggestions: string[];
}

// ─── Roadmap types ──────────────────────────────────────────────────────────

export interface PeriodResource {
  id: number;
  period_id: number;
  title: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface RoadmapPeriod {
  id: number;
  roadmap_id: number;
  period_index: number;
  label: string | null;
  topics: string | null;
  created_at: string;
  updated_at: string;
  resources: PeriodResource[];
  tasks_status: boolean[] | null;
  is_complete: boolean;
  completed_at: string | null;
  revision_notes: string | null;
  notes_file_path: string | null;
  notes_generating: boolean;
}

export interface Roadmap {
  id: number;
  title: string;
  description?: string | null;
  period_type: 'week' | 'month';
  total_periods: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  periods: RoadmapPeriod[];
}

export interface RoadmapListItem {
  id: number;
  title: string;
  description?: string | null;
  period_type: 'week' | 'month';
  total_periods: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface RoadmapCreate {
  title: string;
  description?: string;
  period_type: 'week' | 'month';
  total_periods: number;
}

export interface RoadmapUpdate {
  title?: string;
  description?: string;
  period_type?: 'week' | 'month';
  total_periods?: number;
}

export interface PeriodUpdate {
  label?: string;
  topics?: string;
}

export interface ResourceCreate {
  title: string;
  url: string;
  sort_order?: number;
}

export interface ResourceUpdate {
  title?: string;
  url?: string;
  sort_order?: number;
}

// ─── Roadmap Report types ────────────────────────────────────────────────────

export interface RoadmapPeriodStatus {
  period_id: number;
  period_index: number;
  label: string | null;
  is_complete: boolean;
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
  completed_at: string | null;
}

export interface RoadmapReport {
  roadmap_id: number;
  title: string;
  period_type: string;
  total_periods: number;
  completed_periods: number;
  overall_pct: number;
  started_at: string | null;
  completed_at: string | null;
  elapsed_days: number | null;
  planned_days: number | null;
  is_on_track: boolean | null;
  periods: RoadmapPeriodStatus[];
}

export interface AiRecommendation {
  title: string;
  description: string;
  estimated_months: number;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
}

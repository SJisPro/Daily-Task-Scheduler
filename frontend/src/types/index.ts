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

/** The four copy-target modes exposed by the duplicate endpoint */
export type WeekCopyType = 'weekdays' | 'weekend' | 'week';
export type CopyTargetType = WeekCopyType | 'month';

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
}

export interface Roadmap {
  id: number;
  title: string;
  description?: string | null;
  period_type: 'week' | 'month';
  total_periods: number;
  created_at: string;
  updated_at: string;
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

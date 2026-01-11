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

export type ViewMode = 'day' | 'week' | 'month';

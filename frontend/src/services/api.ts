import axios from 'axios';
import { Task, TaskCreate, TaskUpdate, CopyTargetType } from '../types';

const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  // Strip trailing slash if present
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

console.log('API Base URL configured as:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const taskApi = {
  getAll: (date?: string) =>
    api.get<Task[]>('/api/tasks/', { params: { date } }),

  getById: (id: number) =>
    api.get<Task>(`/api/tasks/${id}`),

  create: (task: TaskCreate) =>
    api.post<Task>('/api/tasks/', task),

  update: (id: number, task: TaskUpdate) =>
    api.put<Task>(`/api/tasks/${id}`, task),

  complete: (id: number) =>
    api.patch<Task>(`/api/tasks/${id}/complete`),

  uncomplete: (id: number) =>
    api.patch<Task>(`/api/tasks/${id}/uncomplete`),

  delete: (id: number) =>
    api.delete(`/api/tasks/${id}`),

  getWeek: (startDate: string) =>
    api.get<Task[]>(`/api/tasks/week/${startDate}`),

  getMonth: (year: number, month: number) =>
    api.get<Task[]>(`/api/tasks/month/${year}/${month}`),

  duplicateTasks: (sourceDate: string, targetType: CopyTargetType) =>
    api.post<Task[]>(`/api/tasks/duplicate?source_date=${sourceDate}&target_type=${targetType}`),

  batchDelete: (taskIds: number[]) =>
    api.post<{ message: string; deleted_count: number; deleted_ids: number[] }>('/api/tasks/batch-delete', { task_ids: taskIds }),

  deleteByDate: (date: string) =>
    api.delete<{ message: string; deleted_count: number; deleted_ids: number[] }>(`/api/tasks/date/${date}`),

  deleteByWeek: (startDate: string) =>
    api.delete<{ message: string; deleted_count: number; deleted_ids: number[] }>(`/api/tasks/week/${startDate}`),

  deleteByMonth: (year: number, month: number) =>
    api.delete<{ message: string; deleted_count: number; deleted_ids: number[] }>(`/api/tasks/month/${year}/${month}`),
};

export default api;


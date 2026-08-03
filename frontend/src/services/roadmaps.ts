import api from './api';
import {
  Roadmap,
  RoadmapListItem,
  RoadmapCreate,
  RoadmapUpdate,
  RoadmapPeriod,
  PeriodUpdate,
  PeriodResource,
  ResourceCreate,
  ResourceUpdate,
  RoadmapReport,
  AiRecommendation,
} from '../types';

export const roadmapApi = {
  // ─── Roadmaps ───────────────────────────────────────────────────────────────
  list: () =>
    api.get<RoadmapListItem[]>('/api/roadmaps/'),

  get: (id: number) =>
    api.get<Roadmap>(`/api/roadmaps/${id}`),

  create: (payload: RoadmapCreate) =>
    api.post<Roadmap>('/api/roadmaps/', payload),

  update: (id: number, payload: RoadmapUpdate) =>
    api.put<Roadmap>(`/api/roadmaps/${id}`, payload),

  delete: (id: number) =>
    api.delete(`/api/roadmaps/${id}`),

  // Start tracking
  startRoadmap: (id: number) =>
    api.post<Roadmap>(`/api/roadmaps/${id}/start`, {}),

  // Progress report
  getReport: (id: number) =>
    api.get<RoadmapReport>(`/api/roadmaps/${id}/report`),

  // ─── Periods ────────────────────────────────────────────────────────────────
  updatePeriod: (roadmapId: number, periodId: number, payload: PeriodUpdate) =>
    api.put<RoadmapPeriod>(`/api/roadmaps/${roadmapId}/periods/${periodId}`, payload),

  toggleTask: (roadmapId: number, periodId: number, taskIndex: number) =>
    api.post<RoadmapPeriod>(
      `/api/roadmaps/${roadmapId}/periods/${periodId}/toggle-task`,
      { task_index: taskIndex },
    ),

  // ─── Resources ──────────────────────────────────────────────────────────────
  addResource: (roadmapId: number, periodId: number, payload: ResourceCreate) =>
    api.post<PeriodResource>(
      `/api/roadmaps/${roadmapId}/periods/${periodId}/resources`,
      payload,
    ),

  updateResource: (
    roadmapId: number,
    periodId: number,
    resourceId: number,
    payload: ResourceUpdate,
  ) =>
    api.put<PeriodResource>(
      `/api/roadmaps/${roadmapId}/periods/${periodId}/resources/${resourceId}`,
      payload,
    ),

  deleteResource: (roadmapId: number, periodId: number, resourceId: number) =>
    api.delete(
      `/api/roadmaps/${roadmapId}/periods/${periodId}/resources/${resourceId}`,
    ),

  // ─── AI Notes ───────────────────────────────────────────────────────────────
  getNotes: (roadmapId: number, periodId: number) =>
    api.get<{ period_id: number; label: string | null; content: string | null; file_path: string | null; is_generating: boolean }>(
      `/api/roadmaps/${roadmapId}/periods/${periodId}/notes`,
    ),

  generateNotes: (roadmapId: number, periodId: number) =>
    api.post<{ status: string; message: string }>(
      `/api/roadmaps/${roadmapId}/periods/${periodId}/generate-notes`,
      {},
    ),

  getNotesDownloadUrl: (roadmapId: number, periodId: number) =>
    `/api/roadmaps/${roadmapId}/periods/${periodId}/notes/download`,

  // ─── AI Features ─────────────────────────────────────────────────────────────
  getAiRecommendations: () =>
    api.get<AiRecommendation[]>('/api/roadmaps/ai-recommendations'),

  aiCreate: (payload: { title: string; description?: string }) =>
    api.post<Roadmap>('/api/roadmaps/ai-create', payload),
};

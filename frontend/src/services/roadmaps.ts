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

  // ─── Periods ────────────────────────────────────────────────────────────────
  updatePeriod: (roadmapId: number, periodId: number, payload: PeriodUpdate) =>
    api.put<RoadmapPeriod>(`/api/roadmaps/${roadmapId}/periods/${periodId}`, payload),

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
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  PlayIcon,
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { roadmapApi } from '../services/roadmaps';
import {
  Roadmap,
  RoadmapListItem,
  RoadmapPeriod,
  PeriodResource,
  RoadmapReport,
  AiRecommendation,
} from '../types';

// ─── Tiny sub-components ──────────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div
      className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
      style={{ borderColor: 'rgba(20,184,166,0.3)', borderTopColor: '#14b8a6' }}
    />
  </div>
);

// ─── Congrats Modal ───────────────────────────────────────────────────────────

const SKILL_LEVEL_COLOR: Record<string, string> = {
  Beginner: '#22c55e',
  Intermediate: '#f59e0b',
  Advanced: '#ef4444',
};

interface CongratsModalProps {
  roadmapTitle: string;
  onClose: () => void;
  onAiCreate: (title: string) => void;
}

const CongratsModal: React.FC<CongratsModalProps> = ({ roadmapTitle, onClose, onAiCreate }) => {
  const [recs, setRecs] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roadmapApi.getAiRecommendations()
      .then(r => setRecs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
        style={{ border: '1px solid rgba(20,184,166,0.4)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.15) 0%, transparent 70%)' }} />
        <div className="h-1 absolute top-0 left-0 right-0 rounded-t-3xl"
          style={{ background: 'linear-gradient(90deg,#14b8a6,#a855f7,#ec4899)' }} />

        <div className="text-center mb-6 pt-2">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-extrabold text-slate-100 mb-1">Roadmap Complete!</h2>
          <p className="text-slate-400 text-sm">
            You've completed <span className="text-primary-400 font-bold">"{roadmapTitle}"</span>. That's a huge achievement!
          </p>
        </div>

        {/* AI Recommendations */}
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-slate-200">AI-Recommended Next Roadmaps</span>
            <span className="text-[10px] text-slate-500 ml-auto">Personalised for you</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: '#a78bfa' }} />
              <span className="text-xs text-slate-400">Gemini is analysing your journey…</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <div key={i}
                  className="rounded-xl p-3 transition-all duration-200"
                  style={{ background: 'rgba(51,65,85,0.3)', border: '1px solid rgba(51,65,85,0.5)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                      style={{ background: 'linear-gradient(135deg,#14b8a6,#a855f7)', color: '#fff' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-200">{rec.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: `${SKILL_LEVEL_COLOR[rec.skill_level]}22`, color: SKILL_LEVEL_COLOR[rec.skill_level] }}>
                          {rec.skill_level}
                        </span>
                        <span className="text-[10px] text-slate-500">{rec.estimated_months}mo</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{rec.description}</p>
                    </div>
                    <button
                      onClick={() => { onClose(); onAiCreate(rec.title); }}
                      className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-200"
                      style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.35)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.2)')}
                      title="Generate this roadmap with AI"
                    >
                      <SparklesIcon className="w-3 h-3" />
                      Create
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <TrophyIcon className="w-4 h-4" />
          Continue Your Journey
        </button>
      </div>
    </div>
  );
};

// ─── AI Create Overlay ────────────────────────────────────────────────────────

const AiCreatingOverlay: React.FC<{ title: string }> = ({ title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
    <div className="glass rounded-3xl p-8 w-full max-w-sm text-center"
      style={{ border: '1px solid rgba(139,92,246,0.4)' }}>
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(20,184,166,0.3))', border: '2px solid rgba(139,92,246,0.4)' }}>
        <SparklesIcon className="w-8 h-8 text-violet-400 animate-pulse" />
      </div>
      <h3 className="text-xl font-bold text-slate-100 mb-2">Building Your Roadmap</h3>
      <p className="text-sm text-violet-400 font-semibold mb-1">{title}</p>
      <p className="text-xs text-slate-400 mb-6">Gemini is designing your personalised learning path with tasks and resources…</p>
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#a78bfa', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── AI Create Modal (manual topic entry) ─────────────────────────────────────

interface AICreateModalProps {
  initialTitle?: string;
  onClose: () => void;
  onCreated: (r: Roadmap) => void;
}

const AICreateModal: React.FC<AICreateModalProps> = ({ initialTitle = '', onClose, onCreated }) => {
  const [topic, setTopic] = useState(initialTitle);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Auto-start if we have a title (coming from recommendation click)
  useEffect(() => {
    if (initialTitle) handleCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await roadmapApi.aiCreate({ title: topic.trim() });
      onCreated(res.data);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'AI generation failed. Please try again.';
      setError(msg);
      setCreating(false);
    }
  };

  if (creating) return <AiCreatingOverlay title={topic} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="glass rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative"
        style={{ border: '1px solid rgba(139,92,246,0.35)' }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1 absolute top-0 left-0 right-0 rounded-t-3xl"
          style={{ background: 'linear-gradient(90deg,#a855f7,#14b8a6,#ec4899)' }} />

        <div className="flex items-center gap-3 mb-5 pt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#a855f7,#14b8a6)' }}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Generate Roadmap with AI</h3>
            <p className="text-xs text-slate-400">Gemini will build a full learning plan for you</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">What do you want to learn?</label>
            <input
              id="ai-topic-input"
              className="input-field"
              placeholder="e.g. Kubernetes, Rust, Machine Learning, System Design…"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className="rounded-xl p-3 text-xs text-slate-400"
            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <p className="flex items-start gap-2">
              <SparklesIcon className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
              AI will design the structure, tasks, and suggested learning resources. Duration is chosen based on topic complexity.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              id="ai-create-submit-btn"
              onClick={handleCreate}
              disabled={!topic.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}
            >
              <SparklesIcon className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Roadmap Report Panel ─────────────────────────────────────────────────────

const RoadmapReportPanel: React.FC<{ roadmapId: number }> = ({ roadmapId }) => {
  const [report, setReport] = useState<RoadmapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    roadmapApi.getReport(roadmapId)
      .then(r => setReport(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, roadmapId]);

  const pctColor = (pct: number) => pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <button
        id="roadmap-report-toggle"
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{ borderBottom: open ? '1px solid rgba(51,65,85,0.4)' : 'none' }}
        onClick={() => setOpen(v => !v)}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.05)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
      >
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-bold text-slate-200">Roadmap Progress Report</span>
        </div>
        {open ? <ChevronUpIcon className="w-4 h-4 text-slate-500" /> : <ChevronDownIcon className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-7 h-7 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: '#14b8a6', borderRightColor: 'rgba(20,184,166,0.3)' }} />
            </div>
          ) : report ? (
            <>
              {/* Overall progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Overall Progress</span>
                  <span className="text-sm font-extrabold" style={{ color: pctColor(report.overall_pct) }}>
                    {report.overall_pct}%
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${report.overall_pct}%`, background: 'linear-gradient(90deg,#14b8a6,#a855f7)' }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {report.completed_periods} of {report.total_periods} {report.period_type === 'month' ? 'months' : 'weeks'} complete
                </div>
              </div>

              {/* Time stats */}
              {report.started_at && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.2)' }}>
                    <div className="text-xl font-extrabold text-primary-400">{report.elapsed_days ?? 0}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Days Elapsed</div>
                  </div>
                  <div className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <div className="text-xl font-extrabold text-accent-400">{report.planned_days ?? 0}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Days Planned</div>
                  </div>
                  <div className="rounded-xl p-3 text-center col-span-2 sm:col-span-1"
                    style={{
                      background: report.is_on_track ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                      border: `1px solid ${report.is_on_track ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                    <div className="text-xl font-extrabold" style={{ color: report.is_on_track ? '#22c55e' : '#ef4444' }}>
                      {report.is_on_track ? 'On Track' : 'Behind'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Status</div>
                  </div>
                </div>
              )}

              {/* Per-period timeline */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Period Timeline</div>
                <div className="space-y-1.5">
                  {report.periods.map(p => (
                    <div key={p.period_id} className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{
                        background: p.is_complete ? 'rgba(34,197,94,0.08)' : 'rgba(15,23,42,0.5)',
                        border: p.is_complete ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(51,65,85,0.3)',
                      }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: p.is_complete ? 'rgba(34,197,94,0.2)' : 'rgba(51,65,85,0.4)',
                          color: p.is_complete ? '#22c55e' : '#64748b',
                        }}>
                        {p.is_complete
                          ? <CheckCircleIcon className="w-3.5 h-3.5" />
                          : <span className="text-[10px] font-bold">{p.period_index + 1}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-300 truncate">{p.label || `Period ${p.period_index + 1}`}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.total_tasks > 0
                            ? `${p.completed_tasks}/${p.total_tasks} tasks · ${p.completion_pct}%`
                            : 'No tasks added'}
                        </div>
                      </div>
                      {p.is_complete && p.completed_at && (
                        <div className="text-[9px] text-emerald-500 font-medium flex-shrink-0">
                          {new Date(p.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-2">No data yet. Start the roadmap first.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Create-Roadmap Modal ─────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: (r: Roadmap) => void;
}

const CreateRoadmapModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [periodType, setPeriodType] = useState<'week' | 'month'>('month');
  const [totalPeriods, setTotalPeriods] = useState(5);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await roadmapApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        period_type: periodType,
        total_periods: totalPeriods,
      });
      onCreated(res.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ border: '1px solid rgba(20,184,166,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 4px 14px rgba(20,184,166,0.4)' }}
          >
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Create Roadmap</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Roadmap Title *</label>
            <input
              id="rm-title"
              className="input-field"
              placeholder="e.g. SRE Learning Path"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              id="rm-description"
              className="input-field resize-none"
              rows={2}
              placeholder="Optional overview..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Period Type</label>
              <div
                className="flex rounded-xl overflow-hidden"
                style={{ border: '1.5px solid rgba(51,65,85,0.8)' }}
              >
                {(['month', 'week'] as const).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    id={`rm-period-type-${pt}`}
                    onClick={() => setPeriodType(pt)}
                    className="flex-1 py-2 text-sm font-semibold transition-all duration-200"
                    style={
                      periodType === pt
                        ? { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', color: '#fff' }
                        : { background: 'rgba(15,23,42,0.7)', color: '#94a3b8' }
                    }
                  >
                    {pt === 'month' ? '📅 Monthly' : '📆 Weekly'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">
                # of {periodType === 'month' ? 'Months' : 'Weeks'}
              </label>
              <input
                id="rm-total-periods"
                type="number"
                min={1}
                max={104}
                className="input-field"
                value={totalPeriods}
                onChange={e => setTotalPeriods(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={saving || !title.trim()}
            >
              {saving ? 'Creating…' : 'Create Roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Resource Row ─────────────────────────────────────────────────────────────

interface ResourceRowProps {
  resource: PeriodResource;
  roadmapId: number;
  periodId: number;
  onDelete: (id: number) => void;
  onUpdate: (r: PeriodResource) => void;
}

const ResourceRow: React.FC<ResourceRowProps> = ({ resource, roadmapId, periodId, onDelete, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [url, setUrl] = useState(resource.url);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const res = await roadmapApi.updateResource(roadmapId, periodId, resource.id, {
        title: title.trim(),
        url: url.trim(),
      });
      onUpdate(res.data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await roadmapApi.deleteResource(roadmapId, periodId, resource.id);
    onDelete(resource.id);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <input
          className="input-field !py-1.5 !text-xs flex-1"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Link title"
        />
        <input
          className="input-field !py-1.5 !text-xs flex-1"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://..."
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: 'rgba(20,184,166,0.2)', color: '#2dd4bf' }}
          title="Save"
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
          title="Cancel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg group transition-colors"
      style={{ background: 'rgba(15,23,42,0.4)' }}
    >
      <LinkIcon className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
      <a
        href={resource.url}
        target="_blank"
        rel="noreferrer"
        className="flex-1 text-xs text-teal-300 hover:text-teal-200 truncate flex items-center gap-1 transition-colors"
      >
        {resource.title}
        <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-60 flex-shrink-0" />
      </a>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          title="Edit"
        >
          <PencilIcon className="w-3 h-3" />
        </button>
        <button
          onClick={handleDelete}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ─── Markdown Viewer ──────────────────────────────────────────────────────────
// Lightweight inline markdown renderer — no external deps needed

const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (text: string): React.ReactNode => {
    // Bold **text** and `code`
    const parts: React.ReactNode[] = [];
    let rest = text;
    let key = 0;
    while (rest.length > 0) {
      const boldMatch = rest.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
      const codeMatch = rest.match(/^(.*?)`([^`]+)`(.*)/s);
      if (boldMatch && (!codeMatch || rest.indexOf('**') <= rest.indexOf('`'))) {
        if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
        parts.push(<strong key={key++} className="text-white font-semibold">{boldMatch[2]}</strong>);
        rest = boldMatch[3];
      } else if (codeMatch) {
        if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
        parts.push(
          <code key={key++}
            className="text-[11px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: 'rgba(15,23,42,0.7)', color: '#7dd3fc' }}>
            {codeMatch[2]}
          </code>
        );
        rest = codeMatch[3];
      } else {
        parts.push(<span key={key++}>{rest}</span>);
        break;
      }
    }
    return parts.length === 1 ? parts[0] : parts;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.replace(/^`+/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(51,65,85,0.6)' }}>
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono" style={{ background: 'rgba(15,23,42,0.8)', color: '#64748b' }}>
              {lang}
            </div>
          )}
          <pre className="text-xs font-mono leading-relaxed p-3 overflow-x-auto"
            style={{ background: 'rgba(8,14,36,0.8)', color: '#94a3b8' }}>
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Tables
    if (line.includes('|') && lines[i + 1]?.includes('---')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        if (!lines[i].includes('---')) {
          tableRows.push(lines[i].split('|').filter(c => c.trim() !== '').map(c => c.trim()));
        }
        i++;
      }
      elements.push(
        <div key={i} className="my-3 overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(51,65,85,0.4)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(139,92,246,0.12)' }}>
                {tableRows[0]?.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 text-left text-violet-300 font-semibold">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-300">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold mt-5 mb-2 pb-1"
          style={{ color: '#a78bfa', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-teal-400 mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={i} className="text-sm font-medium text-sky-400 mt-2 mb-1">{line.slice(5)}</h4>);
    // Horizontal rule
    } else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-4" style={{ borderColor: 'rgba(51,65,85,0.5)' }} />);
    // Blockquote
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="my-2 px-3 py-1 text-xs italic text-slate-400"
          style={{ borderLeft: '3px solid rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.05)' }}>
          {renderInline(line.slice(2))}
        </blockquote>
      );
    // Bullet list
    } else if (line.match(/^[\s]*[-*+] /)) {
      const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
      const text = line.replace(/^[\s]*[-*+] /, '');
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed my-0.5"
          style={{ paddingLeft: `${Math.max(0, indent * 4)}px` }}>
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#a78bfa' }} />
          <span>{renderInline(text)}</span>
        </div>
      );
    // Numbered list
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\. /, '');
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed my-0.5 pl-1">
          <span className="font-bold flex-shrink-0" style={{ color: '#a78bfa', minWidth: '1.2rem' }}>{num}.</span>
          <span>{renderInline(text)}</span>
        </div>
      );
    // Empty line → spacer
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    // Normal paragraph
    } else {
      elements.push(
        <p key={i} className="text-xs text-slate-300 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return (
    <div className="text-slate-300 leading-relaxed"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      {elements}
    </div>
  );
};

// ─── Period Card ──────────────────────────────────────────────────────────────

interface PeriodCardProps {
  period: RoadmapPeriod;
  roadmapId: number;
  periodLabel: string;
  onUpdate: (p: RoadmapPeriod) => void;
}

const PeriodCard: React.FC<PeriodCardProps> = ({ period, roadmapId, periodLabel, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [editingTopics, setEditingTopics] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [label, setLabel] = useState(period.label || periodLabel);
  const [topics, setTopics] = useState(period.topics || '');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesGenerating, setNotesGenerating] = useState(false);
  const [notesContent, setNotesContent] = useState<string | null>(period.revision_notes || null);
  const [notesFilePath, setNotesFilePath] = useState<string | null>(period.notes_file_path || null);

  // Detect if notes are a fallback placeholder (old or new format)
  const isFallbackNotes = (content: string | null): boolean => {
    if (!content) return false;
    return (
      content.includes('[DONE] Topics Covered') ||
      content.includes('Revision Notes --') ||
      content.includes('auto-generated. Set GEMINI_API_KEY') ||
      content.includes('These notes were auto-generated')
    );
  };

  // Poll for notes while generating (every 5s) — only stop when real AI notes arrive
  useEffect(() => {
    if (!notesGenerating) return;
    const interval = setInterval(async () => {
      try {
        const res = await roadmapApi.getNotes(roadmapId, period.id);
        const content = res.data.content;
        // Only accept if content exists AND is not a fallback placeholder
        if (content && !isFallbackNotes(content)) {
          setNotesContent(content);
          setNotesFilePath(res.data.file_path || null);
          setNotesGenerating(false);
          setShowNotes(true);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [notesGenerating, roadmapId, period.id]);

  // Add resource state
  const [showAddResource, setShowAddResource] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [addingRes, setAddingRes] = useState(false);
  const [resources, setResources] = useState<PeriodResource[]>(period.resources);

  // Sync local state when parent updates period
  useEffect(() => {
    setLabel(period.label || periodLabel);
    setTopics(period.topics || '');
    setResources(period.resources);
    if (period.revision_notes) {
      setNotesContent(period.revision_notes);
      setNotesFilePath(period.notes_file_path || null);
    }
  }, [period, periodLabel]);

  // Poll for notes while generating (every 5s)
  useEffect(() => {
    if (!notesGenerating) return;
    const interval = setInterval(async () => {
      try {
        const res = await roadmapApi.getNotes(roadmapId, period.id);
        if (res.data.content) {
          setNotesContent(res.data.content);
          setNotesFilePath(res.data.file_path || null);
          setNotesGenerating(false);
          setShowNotes(true);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [notesGenerating, roadmapId, period.id]);

  const saveLabel = async () => {
    setSaving(true);
    try {
      const res = await roadmapApi.updatePeriod(roadmapId, period.id, { label });
      onUpdate(res.data);
      setEditingLabel(false);
    } finally {
      setSaving(false);
    }
  };

  const saveTopics = async () => {
    setSaving(true);
    try {
      const res = await roadmapApi.updatePeriod(roadmapId, period.id, { topics });
      onUpdate(res.data);
      setEditingTopics(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (taskIndex: number) => {
    setToggling(taskIndex);
    try {
      const res = await roadmapApi.toggleTask(roadmapId, period.id, taskIndex);
      onUpdate(res.data);
      // If period just became complete, start polling for AI notes
      if (res.data.is_complete && !notesContent) {
        setNotesGenerating(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const handleGenerateNotes = async () => {
    setNotesGenerating(true);
    setNotesContent(null);   // clear old content so spinner shows
    setShowNotes(true);      // auto-expand so user sees progress
    try {
      await roadmapApi.generateNotes(roadmapId, period.id);
    } catch (e) {
      console.error(e);
      setNotesGenerating(false);
    }
  };

  const handleAddResource = async () => {
    if (!resTitle.trim() || !resUrl.trim()) return;
    setAddingRes(true);
    try {
      const res = await roadmapApi.addResource(roadmapId, period.id, {
        title: resTitle.trim(),
        url: resUrl.trim(),
        sort_order: resources.length,
      });
      setResources(prev => [...prev, res.data]);
      setResTitle('');
      setResUrl('');
      setShowAddResource(false);
    } finally {
      setAddingRes(false);
    }
  };

  const taskLines = (period.topics || '').split('\n').filter(l => l.trim());
  const taskStatus = period.tasks_status || [];
  const allDone = taskLines.length > 0 && taskLines.every((_, i) => taskStatus[i]);
  const doneCount = taskStatus.filter(Boolean).length;

  return (
    <div
      className="glass-light rounded-2xl overflow-hidden transition-all duration-300 group"
      style={{
        border: period.is_complete
          ? '1px solid rgba(34,197,94,0.35)'
          : expanded
          ? '1px solid rgba(20,184,166,0.25)'
          : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Period number / complete indicator */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300"
          style={
            period.is_complete
              ? { background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', boxShadow: '0 4px 12px rgba(34,197,94,0.35)' }
              : expanded
              ? { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', color: '#fff', boxShadow: '0 4px 12px rgba(20,184,166,0.3)' }
              : { background: 'rgba(15,23,42,0.6)', color: '#94a3b8' }
          }
        >
          {period.is_complete ? <CheckIcon className="w-4 h-4" /> : period.period_index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {editingLabel ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                className="input-field !py-1 !text-sm flex-1"
                value={label}
                onChange={e => setLabel(e.target.value)}
                autoFocus
              />
              <button onClick={saveLabel} disabled={saving}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(20,184,166,0.2)', color: '#2dd4bf' }}>
                <CheckIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingLabel(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold text-slate-200 truncate">{period.label || periodLabel}</h3>
              {period.is_complete && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>COMPLETE</span>
              )}
              <button
                id={`period-edit-label-${period.id}`}
                onClick={e => { e.stopPropagation(); setEditingLabel(true); setExpanded(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-0.5">
            {taskLines.length > 0 && (
              <span className="text-xs text-slate-500">
                {doneCount}/{taskLines.length} tasks
              </span>
            )}
            <span className="text-xs text-slate-500">
              {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Task progress mini-bar */}
        {taskLines.length > 0 && (
          <div className="w-16 flex-shrink-0 hidden sm:block">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(doneCount / taskLines.length * 100)}%`,
                  background: allDone ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#14b8a6,#a855f7)',
                }} />
            </div>
          </div>
        )}

        <div className="flex-shrink-0 text-slate-500">
          {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

          {/* ── Tasks / Topics section ── */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="label !mb-0 flex items-center gap-1.5">
                <BookOpenIcon className="w-3.5 h-3.5" />
                Tasks / Topics
              </span>
              {!editingTopics && (
                <button
                  id={`period-edit-topics-${period.id}`}
                  onClick={() => setEditingTopics(true)}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                >
                  <PencilIcon className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            {editingTopics ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="input-field resize-none font-mono !text-xs leading-relaxed"
                  rows={6}
                  placeholder={`• Introduction to SRE\n• SLOs and SLAs\n• Error budgets\n• Incident response`}
                  value={topics}
                  onChange={e => setTopics(e.target.value)}
                  autoFocus
                />
                <p className="text-[10px] text-slate-500">
                  Each non-empty line becomes a checkable task. Existing completion status is preserved where line text matches.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setEditingTopics(false)} className="btn-secondary text-xs !py-1.5 flex-1">Cancel</button>
                  <button onClick={saveTopics} disabled={saving} className="btn-primary text-xs !py-1.5 flex-1">
                    {saving ? 'Saving…' : 'Save Tasks'}
                  </button>
                </div>
              </div>
            ) : taskLines.length > 0 ? (
              <div className="space-y-1.5">
                {taskLines.map((line, i) => {
                  const done = taskStatus[i] ?? false;
                  return (
                    <button
                      key={i}
                      id={`period-task-${period.id}-${i}`}
                      onClick={() => handleToggleTask(i)}
                      disabled={toggling === i}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all duration-200 group/task"
                      style={{
                        background: done ? 'rgba(34,197,94,0.08)' : 'rgba(15,23,42,0.4)',
                        border: done ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(51,65,85,0.4)',
                      }}
                    >
                      {/* Checkbox */}
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
                        style={{
                          background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(51,65,85,0.5)',
                          border: done ? 'none' : '1.5px solid rgba(100,116,139,0.6)',
                        }}>
                        {toggling === i
                          ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          : done ? <CheckIcon className="w-3 h-3 text-white" /> : null
                        }
                      </div>
                      <span className={`text-xs leading-relaxed flex-1 ${done ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                        {line.replace(/^[•\-*]\s*/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                onClick={() => setEditingTopics(true)}
                className="w-full py-3 rounded-xl text-xs text-slate-500 text-center transition-colors hover:text-slate-300"
                style={{ border: '1px dashed rgba(51,65,85,0.6)' }}
              >
                + Click to add tasks for this period
              </button>
            )}
          </div>

          {/* ── AI Notes (shown when period is complete or generating) ── */}
          {(period.is_complete || notesContent || notesGenerating) && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)' }}>
              {/* Notes header */}
              <div className="flex items-center justify-between p-3">
                <button
                  onClick={() => setShowNotes(v => !v)}
                  className="flex items-center gap-2 text-xs font-bold"
                  style={{ color: '#a78bfa' }}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  📚 AI Study Notes
                  {showNotes ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                </button>
                <div className="flex items-center gap-2">
                  {notesGenerating ? (
                    <span className="text-[10px] text-violet-400 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping inline-block" />
                      Generating with Gemini…
                    </span>
                  ) : notesContent ? (
                    <>
                      {notesFilePath && !isFallbackNotes(notesContent) && (
                        <a
                          href={`http://localhost:8000${roadmapApi.getNotesDownloadUrl(roadmapId, period.id)}`}
                          download
                          className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                          style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          ⬇ Download .md
                        </a>
                      )}
                      {!isFallbackNotes(notesContent) && (
                        <button
                          onClick={handleGenerateNotes}
                          className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                          style={{ background: 'rgba(51,65,85,0.4)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          🔄 Regenerate
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </div>

              {/* Fallback warning banner — shown prominently when notes are placeholder */}
              {notesContent && isFallbackNotes(notesContent) && !notesGenerating && (
                <div className="mx-3 mb-3 rounded-xl p-3"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-400 mb-0.5">Placeholder notes — AI generation failed</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        These notes were not generated by AI (Gemini quota was exceeded when this period was completed).
                        Click <strong className="text-amber-300">Regenerate with AI</strong> to get comprehensive notes now.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateNotes}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-200"
                      style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(139,92,246,0.2))', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,rgba(245,158,11,0.4),rgba(139,92,246,0.3))')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(139,92,246,0.2))')}
                    >
                      <SparklesIcon className="w-3.5 h-3.5" />
                      ⚡ Regenerate with AI
                    </button>
                  </div>
                </div>
              )}

              {/* Notes body */}
              {showNotes && (
                <div className="px-4 pb-4">
                  {notesGenerating && !notesContent ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
                        style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: '#a78bfa' }} />
                      <p className="text-xs text-violet-400">Gemini is writing comprehensive notes…</p>
                      <p className="text-[10px] text-slate-500">This takes 15–30 seconds. Notes auto-appear when ready.</p>
                    </div>
                  ) : notesContent ? (
                    <div className="notes-markdown-viewer">
                      <MarkdownViewer content={notesContent} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* ── Resources section ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label !mb-0 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Resources
              </span>
              <button
                id={`period-add-resource-${period.id}`}
                onClick={() => setShowAddResource(v => !v)}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
              >
                <PlusIcon className="w-3 h-3" />
                Add Link
              </button>
            </div>

            {showAddResource && (
              <div className="flex flex-col gap-2 p-3 rounded-xl mb-2"
                style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(20,184,166,0.2)' }}>
                <input
                  className="input-field !py-1.5 !text-xs"
                  placeholder="Link title"
                  value={resTitle}
                  onChange={e => setResTitle(e.target.value)}
                  id={`resource-title-${period.id}`}
                />
                <input
                  className="input-field !py-1.5 !text-xs"
                  placeholder="https://..."
                  value={resUrl}
                  onChange={e => setResUrl(e.target.value)}
                  id={`resource-url-${period.id}`}
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddResource(false); setResTitle(''); setResUrl(''); }}
                    className="btn-secondary text-xs !py-1.5 flex-1">Cancel</button>
                  <button onClick={handleAddResource}
                    disabled={addingRes || !resTitle.trim() || !resUrl.trim()}
                    className="btn-primary text-xs !py-1.5 flex-1">
                    {addingRes ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {resources.length === 0 && !showAddResource && (
                <p className="text-xs text-slate-600 italic">No resource links yet.</p>
              )}
              {resources.map(r => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  roadmapId={roadmapId}
                  periodId={period.id}
                  onDelete={id => setResources(prev => prev.filter(x => x.id !== id))}
                  onUpdate={updated => setResources(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Roadmap Detail View ──────────────────────────────────────────────────────

interface RoadmapDetailProps {
  roadmapId: number;
  onBack: () => void;
  onDeleted: () => void;
  onAiCreate: (title: string) => void;
}

const RoadmapDetail: React.FC<RoadmapDetailProps> = ({ roadmapId, onBack, onDeleted, onAiCreate }) => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerDesc, setHeaderDesc] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [congratsShown, setCongratsShown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roadmapApi.get(roadmapId);
      setRoadmap(res.data);
      setHeaderTitle(res.data.title);
      setHeaderDesc(res.data.description || '');
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => { load(); }, [load]);

  // Show congrats modal when roadmap is newly completed
  useEffect(() => {
    if (roadmap?.completed_at && !congratsShown) {
      setShowCongrats(true);
      setCongratsShown(true);
    }
  }, [roadmap?.completed_at, congratsShown]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await roadmapApi.startRoadmap(roadmapId);
      setRoadmap(res.data);
    } finally {
      setStarting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this roadmap? This cannot be undone.')) return;
    setDeleting(true);
    await roadmapApi.delete(roadmapId);
    onDeleted();
  };

  const saveHeader = async () => {
    if (!roadmap) return;
    setSavingHeader(true);
    try {
      const res = await roadmapApi.update(roadmapId, {
        title: headerTitle,
        description: headerDesc || undefined,
      });
      setRoadmap(res.data);
      setEditingHeader(false);
    } finally {
      setSavingHeader(false);
    }
  };

  const handlePeriodUpdate = (updated: RoadmapPeriod) => {
    setRoadmap(prev => {
      if (!prev) return prev;
      const newPeriods = prev.periods.map(p => p.id === updated.id ? updated : p);
      // Check if all periods are now complete
      const allComplete = newPeriods.length > 0 && newPeriods.every(p => p.is_complete);
      return {
        ...prev,
        periods: newPeriods,
        completed_at: allComplete ? (prev.completed_at || new Date().toISOString()) : null,
      };
    });
  };

  if (loading) return <Spinner />;
  if (!roadmap) return <p className="text-slate-500">Roadmap not found.</p>;

  const ptLabel = roadmap.period_type === 'month' ? 'Month' : 'Week';
  const completedPeriods = roadmap.periods.filter(p => p.is_complete).length;
  const overallPct = roadmap.total_periods > 0
    ? Math.floor(completedPeriods / roadmap.total_periods * 100)
    : 0;
  const elapsedDays = roadmap.started_at
    ? Math.max(0, Math.floor((Date.now() - new Date(roadmap.started_at).getTime()) / 86400000))
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Back + Header */}
      <div className="glass rounded-2xl p-5 shadow-card">
        <div className="flex items-start gap-4">
          <button id="roadmap-back-btn" onClick={onBack} className="btn-secondary !px-3 !py-2 flex-shrink-0 text-xs mt-0.5">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            {editingHeader ? (
              <div className="flex flex-col gap-3">
                <input className="input-field" value={headerTitle}
                  onChange={e => setHeaderTitle(e.target.value)} autoFocus />
                <textarea className="input-field resize-none" rows={2} placeholder="Description…"
                  value={headerDesc} onChange={e => setHeaderDesc(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => setEditingHeader(false)} className="btn-secondary text-sm flex-1">Cancel</button>
                  <button onClick={saveHeader} disabled={savingHeader} className="btn-primary text-sm flex-1">
                    {savingHeader ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold"
                    style={{ background: 'linear-gradient(90deg,#2dd4bf,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {roadmap.title}
                  </h2>
                  {roadmap.completed_at && (
                    <span className="badge badge-teal text-[10px]">🏆 Completed</span>
                  )}
                  <button id="roadmap-edit-header" onClick={() => setEditingHeader(true)}
                    className="text-slate-500 hover:text-slate-300 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
                {roadmap.description && (
                  <p className="text-sm text-slate-400 mt-1">{roadmap.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="badge badge-teal">
                    {roadmap.total_periods} {ptLabel}{roadmap.total_periods !== 1 ? 's' : ''}
                  </span>
                  <span className="badge badge-purple capitalize">{roadmap.period_type}ly</span>
                  <span className="text-xs text-slate-500">
                    Created {new Date(roadmap.created_at).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
          {!editingHeader && (
            <button id="roadmap-delete-btn" onClick={handleDelete} disabled={deleting}
              className="btn-danger !px-3 !py-2 text-xs flex-shrink-0">
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Start button / time tracker ── */}
        {!editingHeader && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
            {!roadmap.started_at ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Ready to begin? Starting will track your time and progress.</p>
                </div>
                <button
                  id="roadmap-start-btn"
                  onClick={handleStart}
                  disabled={starting}
                  className="btn-primary flex items-center gap-2 flex-shrink-0 text-sm"
                >
                  <PlayIcon className="w-4 h-4" />
                  {starting ? 'Starting…' : 'Start Roadmap'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-primary-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      Started {elapsedDays === 0 ? 'today' : `${elapsedDays} day${elapsedDays !== 1 ? 's' : ''} ago`}
                    </span>
                    {roadmap.completed_at && (
                      <span className="text-xs font-bold text-emerald-400 ml-1">— Completed!</span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold" style={{ color: overallPct >= 80 ? '#22c55e' : overallPct >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {overallPct}% done
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${overallPct}%`,
                      background: overallPct === 100
                        ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                        : 'linear-gradient(90deg,#14b8a6,#a855f7)',
                    }} />
                </div>
                <div className="text-[10px] text-slate-500">
                  {completedPeriods} of {roadmap.total_periods} {ptLabel.toLowerCase()}s complete
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Period Cards */}
      <div className="flex flex-col gap-3">
        {roadmap.periods.map((period, idx) => (
          <PeriodCard
            key={period.id}
            period={period}
            roadmapId={roadmap.id}
            periodLabel={`${ptLabel} ${idx + 1}`}
            onUpdate={handlePeriodUpdate}
          />
        ))}
      </div>

      {/* Roadmap Report Panel */}
      {roadmap.started_at && <RoadmapReportPanel roadmapId={roadmap.id} />}

      {/* Congrats Modal */}
      {showCongrats && (
        <CongratsModal
          roadmapTitle={roadmap.title}
          onClose={() => setShowCongrats(false)}
          onAiCreate={(title) => { setShowCongrats(false); onAiCreate(title); }}
        />
      )}
    </div>
  );
};

// ─── Roadmap List View ────────────────────────────────────────────────────────

interface RoadmapListProps {
  onSelect: (id: number) => void;
  onCreate: () => void;
  onAiCreate: () => void;
}

const RoadmapList: React.FC<RoadmapListProps> = ({ onSelect, onCreate, onAiCreate }) => {
  const [items, setItems] = useState<RoadmapListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roadmapApi.list();
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero / CTA */}
      <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ border: '1px solid rgba(20,184,166,0.15)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 6px 20px rgba(20,184,166,0.4)' }}>
          <MapIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold"
            style={{ background: 'linear-gradient(90deg,#2dd4bf,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Learning Roadmaps
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Plan your learning journey — week by week or month by month. Track progress, tick off tasks, and get revision notes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            id="ai-generate-roadmap-btn"
            onClick={onAiCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(20,184,166,0.15))', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,rgba(139,92,246,0.4),rgba(20,184,166,0.25))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(20,184,166,0.15))')}
          >
            <SparklesIcon className="w-4 h-4" />
            Generate with AI
          </button>
          <button id="create-roadmap-btn" onClick={onCreate} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            New Roadmap
          </button>
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ border: '1px dashed rgba(51,65,85,0.6)' }}>
          <MapIcon className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-medium">No roadmaps yet</p>
          <p className="text-sm text-slate-600 max-w-xs">Create your first roadmap to start organising your learning plan.</p>
          <button id="create-first-roadmap" onClick={onCreate} className="btn-primary mt-2 flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Create Roadmap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const isStarted = !!item.started_at;
            const isComplete = !!item.completed_at;
            return (
              <button
                key={item.id}
                id={`roadmap-card-${item.id}`}
                onClick={() => onSelect(item.id)}
                className="text-left glass-light rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 group"
                style={{ border: isComplete ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = isComplete
                    ? '1px solid rgba(34,197,94,0.45)'
                    : '1px solid rgba(20,184,166,0.25)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = isComplete
                    ? '1px solid rgba(34,197,94,0.25)'
                    : '1px solid rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}>
                    {isComplete ? '🏆' : item.period_type === 'month' ? '📅' : '📆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-200 truncate">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge badge-teal text-[10px]">
                    {item.total_periods} {item.period_type === 'month' ? 'Month' : 'Week'}{item.total_periods !== 1 ? 's' : ''}
                  </span>
                  <span className="badge badge-purple text-[10px] capitalize">{item.period_type}ly</span>
                  {isComplete && <span className="badge text-[10px]" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>Done</span>}
                  {isStarted && !isComplete && <span className="badge text-[10px]" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>In Progress</span>}
                </div>
                <p className="text-[10px] text-slate-600">
                  Created {new Date(item.created_at).toLocaleDateString()}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main RoadmapView ─────────────────────────────────────────────────────────

const RoadmapView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAiCreate, setShowAiCreate] = useState(false);
  const [aiCreateTitle, setAiCreateTitle] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (r: Roadmap) => {
    setShowCreate(false);
    setShowAiCreate(false);
    setAiCreateTitle('');
    setSelectedId(r.id);
    setRefreshKey(k => k + 1);
  };

  const handleDeleted = () => {
    setSelectedId(null);
    setRefreshKey(k => k + 1);
  };

  const openAiCreate = (title = '') => {
    setAiCreateTitle(title);
    setShowAiCreate(true);
  };

  return (
    <div className="pb-8">
      {selectedId !== null ? (
        <RoadmapDetail
          key={selectedId}
          roadmapId={selectedId}
          onBack={() => setSelectedId(null)}
          onDeleted={handleDeleted}
          onAiCreate={openAiCreate}
        />
      ) : (
        <RoadmapList
          key={refreshKey}
          onSelect={setSelectedId}
          onCreate={() => setShowCreate(true)}
          onAiCreate={() => openAiCreate()}
        />
      )}

      {showCreate && (
        <CreateRoadmapModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {showAiCreate && (
        <AICreateModal
          initialTitle={aiCreateTitle}
          onClose={() => { setShowAiCreate(false); setAiCreateTitle(''); }}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default RoadmapView;

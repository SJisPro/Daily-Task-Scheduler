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
} from '@heroicons/react/24/outline';
import { roadmapApi } from '../services/roadmaps';
import {
  Roadmap,
  RoadmapListItem,
  RoadmapPeriod,
  PeriodResource,
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

  // Add resource state
  const [showAddResource, setShowAddResource] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [addingRes, setAddingRes] = useState(false);
  const [resources, setResources] = useState<PeriodResource[]>(period.resources);

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

  const totalTopicLines = topics.split('\n').filter(l => l.trim()).length;

  return (
    <div
      className="glass-light rounded-2xl overflow-hidden transition-all duration-300 group"
      style={{ border: expanded ? '1px solid rgba(20,184,166,0.25)' : '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Period number bubble */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{
            background: expanded
              ? 'linear-gradient(135deg,#14b8a6,#0d9488)'
              : 'rgba(15,23,42,0.6)',
            color: expanded ? '#fff' : '#94a3b8',
            boxShadow: expanded ? '0 4px 12px rgba(20,184,166,0.3)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          {period.period_index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {editingLabel ? (
            <div
              className="flex items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <input
                className="input-field !py-1 !text-sm flex-1"
                value={label}
                onChange={e => setLabel(e.target.value)}
                autoFocus
              />
              <button
                onClick={saveLabel}
                disabled={saving}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(20,184,166,0.2)', color: '#2dd4bf' }}
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingLabel(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold text-slate-200 truncate">
                {period.label || periodLabel}
              </h3>
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
            <span className="text-xs text-slate-500">
              {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </span>
            {totalTopicLines > 0 && (
              <span className="text-xs text-slate-500">
                {totalTopicLines} topic{totalTopicLines !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-slate-500">
          {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Topics section */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="label !mb-0 flex items-center gap-1.5">
                <BookOpenIcon className="w-3.5 h-3.5" />
                Topics to Cover
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
                  Tip: Prefix a line with ✅ to mark it complete.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setEditingTopics(false)} className="btn-secondary text-xs !py-1.5 flex-1">
                    Cancel
                  </button>
                  <button onClick={saveTopics} disabled={saving} className="btn-primary text-xs !py-1.5 flex-1">
                    {saving ? 'Saving…' : 'Save Topics'}
                  </button>
                </div>
              </div>
            ) : topics ? (
              <div
                className="rounded-xl p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono"
                style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.5)' }}
              >
                {topics.split('\n').map((line, i) => (
                  <div
                    key={i}
                    className={line.trim().startsWith('✅') ? 'text-teal-400' : ''}
                  >
                    {line || '\u00a0'}
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setEditingTopics(true)}
                className="w-full py-3 rounded-xl text-xs text-slate-500 text-center transition-colors hover:text-slate-300"
                style={{ border: '1px dashed rgba(51,65,85,0.6)' }}
              >
                + Click to add topics for this period
              </button>
            )}
          </div>

          {/* Resources section */}
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
              <div
                className="flex flex-col gap-2 p-3 rounded-xl mb-2"
                style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(20,184,166,0.2)' }}
              >
                <input
                  className="input-field !py-1.5 !text-xs"
                  placeholder="Link title (e.g. SRE Book – Chapter 1)"
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
                  <button
                    onClick={() => { setShowAddResource(false); setResTitle(''); setResUrl(''); }}
                    className="btn-secondary text-xs !py-1.5 flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddResource}
                    disabled={addingRes || !resTitle.trim() || !resUrl.trim()}
                    className="btn-primary text-xs !py-1.5 flex-1"
                  >
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
}

const RoadmapDetail: React.FC<RoadmapDetailProps> = ({ roadmapId, onBack, onDeleted }) => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerDesc, setHeaderDesc] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

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

  const handlePeriodUpdate = (updated: any) => {
    setRoadmap(prev =>
      prev
        ? {
            ...prev,
            periods: prev.periods.map(p =>
              p.id === updated.id ? { ...p, ...updated } : p,
            ),
          }
        : prev,
    );
  };

  if (loading) return <Spinner />;
  if (!roadmap) return <p className="text-slate-500">Roadmap not found.</p>;

  const ptLabel = roadmap.period_type === 'month' ? 'Month' : 'Week';

  return (
    <div className="flex flex-col gap-6">
      {/* Back + Header */}
      <div className="glass rounded-2xl p-5 shadow-card">
        <div className="flex items-start gap-4">
          <button
            id="roadmap-back-btn"
            onClick={onBack}
            className="btn-secondary !px-3 !py-2 flex-shrink-0 text-xs mt-0.5"
          >
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            {editingHeader ? (
              <div className="flex flex-col gap-3">
                <input
                  className="input-field"
                  value={headerTitle}
                  onChange={e => setHeaderTitle(e.target.value)}
                  autoFocus
                />
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Description…"
                  value={headerDesc}
                  onChange={e => setHeaderDesc(e.target.value)}
                />
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
                  <h2
                    className="text-xl font-bold"
                    style={{ background: 'linear-gradient(90deg,#2dd4bf,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {roadmap.title}
                  </h2>
                  <button
                    id="roadmap-edit-header"
                    onClick={() => setEditingHeader(true)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
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
            <button
              id="roadmap-delete-btn"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger !px-3 !py-2 text-xs flex-shrink-0"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
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
    </div>
  );
};

// ─── Roadmap List View ────────────────────────────────────────────────────────

interface RoadmapListProps {
  onSelect: (id: number) => void;
  onCreate: () => void;
}

const RoadmapList: React.FC<RoadmapListProps> = ({ onSelect, onCreate }) => {
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
      <div
        className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ border: '1px solid rgba(20,184,166,0.15)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 6px 20px rgba(20,184,166,0.4)' }}
        >
          <MapIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2
            className="text-lg font-bold"
            style={{ background: 'linear-gradient(90deg,#2dd4bf,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Learning Roadmaps
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Plan your learning journey — week by week or month by month. Add topics and resource links for each period.
          </p>
        </div>
        <button
          id="create-roadmap-btn"
          onClick={onCreate}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          New Roadmap
        </button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div
          className="glass rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ border: '1px dashed rgba(51,65,85,0.6)' }}
        >
          <MapIcon className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-medium">No roadmaps yet</p>
          <p className="text-sm text-slate-600 max-w-xs">
            Create your first roadmap to start organising your learning plan.
          </p>
          <button id="create-first-roadmap" onClick={onCreate} className="btn-primary mt-2 flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Create Roadmap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <button
              key={item.id}
              id={`roadmap-card-${item.id}`}
              onClick={() => onSelect(item.id)}
              className="text-left glass-light rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 group"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.border = '1px solid rgba(20,184,166,0.25)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}
                >
                  {item.period_type === 'month' ? '📅' : '📆'}
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
                <span className="badge badge-purple text-[10px] capitalize">
                  {item.period_type}ly
                </span>
              </div>
              <p className="text-[10px] text-slate-600">
                Created {new Date(item.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main RoadmapView ─────────────────────────────────────────────────────────

const RoadmapView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (r: Roadmap) => {
    setShowCreate(false);
    setSelectedId(r.id);
    setRefreshKey(k => k + 1);
  };

  const handleDeleted = () => {
    setSelectedId(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="pb-8">
      {selectedId !== null ? (
        <RoadmapDetail
          key={selectedId}
          roadmapId={selectedId}
          onBack={() => setSelectedId(null)}
          onDeleted={handleDeleted}
        />
      ) : (
        <RoadmapList
          key={refreshKey}
          onSelect={setSelectedId}
          onCreate={() => setShowCreate(true)}
        />
      )}

      {showCreate && (
        <CreateRoadmapModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default RoadmapView;

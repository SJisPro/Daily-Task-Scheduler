/**
 * InlineAnalyticsPanel
 * ─────────────────────
 * A collapsible analytics dashboard that embeds directly into
 * WeekView (mode='weekly') or MonthView (mode='monthly').
 *
 * Props:
 *   mode       – 'weekly' | 'monthly'
 *   startDate  – ISO date string for the start of the week (weekly mode)
 *   year       – year number (monthly mode)
 *   month      – 1-based month number (monthly mode)
 */
import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
  Area, AreaChart,
  TooltipProps,
} from 'recharts';
import {
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FireIcon,
  TrophyIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { taskApi } from '../services/api';
import {
  DayAnalytics,
  WeekAnalyticsResponse,
  MonthAnalyticsResponse,
  InsightsResponse,
} from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const pctColor = (pct: number) => pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
const pctBg = (pct: number) =>
  pct >= 80 ? 'rgba(34,197,94,0.45)' :
  pct >= 50 ? 'rgba(245,158,11,0.45)' : 'rgba(239,68,68,0.45)';

const PIE_COLORS = ['#14b8a6', '#a855f7', '#ec4899', '#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];

// ─── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip: React.FC<TooltipProps<number, string>> = (props) => {
  const { active, payload } = props as any;
  const label = (props as any).label;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(51,65,85,0.8)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-slate-200 mb-2">{label}</p>
      {(payload as any[]).map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-xs mb-0.5">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Sort key helper ──────────────────────────────────────────────────────────

type SortKey = 'date' | 'total' | 'completed' | 'missed' | 'pct';
type SortDir = 'asc' | 'desc';

// ─── DataTable ────────────────────────────────────────────────────────────────

const DataTable: React.FC<{ days: DayAnalytics[]; accentColor: string }> = ({ days, accentColor }) => {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const today = format(new Date(), 'yyyy-MM-dd');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...days].sort((a, b) => {
    let va: number | string, vb: number | string;
    switch (sortKey) {
      case 'date': va = a.date; vb = b.date; break;
      case 'total': va = a.total; vb = b.total; break;
      case 'completed': va = a.completed; vb = b.completed; break;
      case 'missed': va = a.missed; vb = b.missed; break;
      case 'pct': va = a.completion_pct; vb = b.completion_pct; break;
      default: va = a.date; vb = b.date;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = days.reduce((a, d) => a + d.total, 0);
  const done = days.reduce((a, d) => a + d.completed, 0);
  const miss = days.reduce((a, d) => a + d.missed, 0);
  const pct = total ? Math.round(done / total * 100) : 0;

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="py-2.5 px-3 text-left cursor-pointer select-none" onClick={() => handleSort(k)}>
      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {label}
        {sortKey === k && <span className="text-primary-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px]">
          <thead style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
            <tr>
              <Th label="Day" k="date" />
              <Th label="Total" k="total" />
              <Th label="Done" k="completed" />
              <Th label="Missed" k="missed" />
              <Th label="Rate" k="pct" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => {
              const isToday = d.date === today;
              return (
                <tr key={d.date}
                  style={{
                    background: isToday ? 'rgba(20,184,166,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    borderLeft: isToday ? `3px solid ${accentColor}` : '3px solid transparent',
                  }}>
                  <td className="py-2 px-3">
                    <div className="text-xs font-semibold text-slate-300">{d.weekday}</div>
                    <div className="text-[10px] text-slate-600">{d.date}</div>
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-400">{d.total}</td>
                  <td className="py-2 px-3 text-xs text-emerald-400 font-semibold">{d.completed}</td>
                  <td className="py-2 px-3 text-xs text-red-400 font-semibold">{d.missed}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: pctBg(d.completion_pct), color: pctColor(d.completion_pct) }}>
                      {d.completion_pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ borderTop: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.8)' }}>
            <tr>
              <td className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase">Totals</td>
              <td className="py-2.5 px-3 text-xs font-bold text-slate-300">{total}</td>
              <td className="py-2.5 px-3 text-xs font-bold text-emerald-400">{done}</td>
              <td className="py-2.5 px-3 text-xs font-bold text-red-400">{miss}</td>
              <td className="py-2.5 px-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: pctBg(pct), color: pctColor(pct) }}>
                  {pct}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ─── InsightsPanel ────────────────────────────────────────────────────────────

const InsightsPanel: React.FC<{ ins: InsightsResponse }> = ({ ins }) => {
  const s = ins.summary;
  const suggestions = ins.suggestions || [];

  const wdData = Object.entries(ins.weekday_breakdown).map(([day, val]) => ({
    name: day.slice(0, 3),
    rate: val.days > 0 ? Math.round(val.completed / val.total * 100) : 0,
  }));

  const pieData = [
    { name: 'Completed', value: s.total_completed },
    { name: 'Missed', value: s.total_missed },
    { name: 'Pending', value: Math.max(0, s.total_tasks - s.total_completed - s.total_missed) },
  ].filter(d => d.value > 0);

  const PIE_SLICE = ['#22c55e', '#ef4444', '#f59e0b'];

  const stats = [
    { label: 'Completion', value: `${s.overall_completion_pct}%`, color: pctColor(s.overall_completion_pct) },
    { label: 'Streak', value: `${s.current_streak}d`, color: '#f59e0b', icon: <FireIcon className="w-3.5 h-3.5" /> },
    { label: 'Avg/Day', value: s.avg_tasks_per_day.toFixed(1), color: '#a855f7' },
    { label: 'Missed', value: s.total_missed, color: '#ef4444' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((st, i) => (
          <div key={i} className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {st.icon}
              <span className="text-xl font-extrabold" style={{ color: st.color }}>{st.value}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{st.label}</div>
          </div>
        ))}
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ins.best_day && (
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <TrophyIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Best Day</div>
              <div className="text-xs font-semibold text-slate-200">{ins.best_day.weekday} · {ins.best_day.completion_pct}%</div>
            </div>
          </div>
        )}
        {ins.worst_day && (
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Needs Attention</div>
              <div className="text-xs font-semibold text-slate-200">{ins.worst_day.weekday} · {ins.worst_day.completion_pct}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Overall Split</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_SLICE[i % PIE_SLICE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday bar */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">By Weekday (%)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={wdData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {wdData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(20,184,166,0.04)', border: '1px solid rgba(20,184,166,0.15)' }}>
          <p className="text-xs font-bold text-primary-400 uppercase tracking-widest flex items-center gap-1.5">
            <LightBulbIcon className="w-3.5 h-3.5" /> Insights & Suggestions
          </p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.3)' }}>
              {i === 0 ? <TrophyIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                : i < 2 ? <ExclamationTriangleIcon className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                : <CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />}
              <p className="text-xs text-slate-300 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Weekly analytics content ─────────────────────────────────────────────────

const WeeklyContent: React.FC<{ weekStart: Date }> = ({ weekStart }) => {
  const [weekData, setWeekData] = useState<WeekAnalyticsResponse | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'table' | 'insights'>('charts');

  useEffect(() => {
    setLoading(true);
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    Promise.all([
      taskApi.getWeekAnalytics(start),
      taskApi.getInsights(start, end),
    ]).then(([wd, ins]) => {
      setWeekData(wd.data);
      setInsights(ins.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [weekStart]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#14b8a6', borderRightColor: 'rgba(20,184,166,0.3)' }} />
    </div>
  );

  if (!weekData) return <p className="text-slate-500 text-sm text-center py-4">No data for this week.</p>;

  const days = weekData.days;
  const barData = days.map(d => ({
    name: d.weekday.slice(0, 3),
    Completed: d.completed,
    Missed: d.missed,
    Pending: d.pending,
  }));
  const areaData = days.map(d => ({ name: d.weekday.slice(0, 3), 'Completion %': d.completion_pct }));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.4)' }}>
        {(['charts', 'table', 'insights'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200"
            style={activeTab === t
              ? { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', color: '#fff' }
              : { color: '#64748b' }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'charts' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Daily Task Breakdown</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={16} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Missed" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Completion % Trend</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="wkGradInline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(20,184,166,0.3)' }} />
                <Area type="monotone" dataKey="Completion %" stroke="#14b8a6" strokeWidth={2.5}
                  fill="url(#wkGradInline)" dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'table' && <DataTable days={days} accentColor="#14b8a6" />}

      {activeTab === 'insights' && insights && (
        <InsightsPanel ins={insights} />
      )}
    </div>
  );
};

// ─── Monthly analytics content ────────────────────────────────────────────────

const MonthlyContent: React.FC<{ year: number; month: number }> = ({ year, month }) => {
  const [monthData, setMonthData] = useState<MonthAnalyticsResponse | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'table' | 'insights'>('charts');

  useEffect(() => {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    Promise.all([
      taskApi.getMonthAnalytics(year, month),
      taskApi.getInsights(startDate, endStr),
    ]).then(([md, ins]) => {
      setMonthData(md.data);
      setInsights(ins.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [year, month]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#a855f7', borderRightColor: 'rgba(168,85,247,0.3)' }} />
    </div>
  );

  if (!monthData) return <p className="text-slate-500 text-sm text-center py-4">No data for this month.</p>;

  const days = monthData.days;
  const barData = days.map(d => ({
    name: d.date.slice(8),
    Completed: d.completed,
    Missed: d.missed,
    Pending: d.pending,
  }));
  const areaData = days.map(d => ({ name: d.date.slice(8), 'Completion %': d.completion_pct }));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.4)' }}>
        {(['charts', 'table', 'insights'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200"
            style={activeTab === t
              ? { background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff' }
              : { color: '#64748b' }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'charts' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Monthly Task Breakdown</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={8} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Missed" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Completion % Trend</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="moGradInline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(168,85,247,0.3)' }} />
                <Area type="monotone" dataKey="Completion %" stroke="#a855f7" strokeWidth={2.5}
                  fill="url(#moGradInline)" dot={false}
                  activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'table' && <DataTable days={days} accentColor="#a855f7" />}

      {activeTab === 'insights' && insights && (
        <InsightsPanel ins={insights} />
      )}
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────

interface InlineAnalyticsPanelProps {
  mode: 'weekly' | 'monthly';
  weekStart?: Date;
  year?: number;
  month?: number;
}

const InlineAnalyticsPanel: React.FC<InlineAnalyticsPanelProps> = ({ mode, weekStart, year, month }) => {
  const [open, setOpen] = useState(false);
  const accentColor = mode === 'weekly' ? '#14b8a6' : '#a855f7';

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'rgba(10,15,30,0.8)', border: `1px solid ${open ? (mode === 'weekly' ? 'rgba(20,184,166,0.3)' : 'rgba(168,85,247,0.3)') : 'rgba(51,65,85,0.4)'}` }}>
      {/* Toggle header */}
      <button
        id={`${mode}-analytics-toggle`}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{ borderBottom: open ? '1px solid rgba(51,65,85,0.4)' : 'none' }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `rgba(${mode === 'weekly' ? '20,184,166' : '168,85,247'},0.05)`}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${accentColor},${mode === 'weekly' ? '#0d9488' : '#7c3aed'})`, boxShadow: `0 4px 12px ${accentColor}40` }}>
            <ChartBarIcon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-slate-200">
              {mode === 'weekly' ? 'Weekly' : 'Monthly'} Analytics
            </span>
            <p className="text-[10px] text-slate-500">
              {open ? 'Click to collapse' : 'Charts · table · insights'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!open && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${accentColor}20`, color: accentColor }}>
              Show ▼
            </span>
          )}
          {open
            ? <ChevronUpIcon className="w-4 h-4 text-slate-500" />
            : <ChevronDownIcon className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="p-4">
          {mode === 'weekly' && weekStart ? (
            <WeeklyContent weekStart={weekStart} />
          ) : mode === 'monthly' && year !== undefined && month !== undefined ? (
            <MonthlyContent year={year} month={month} />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InlineAnalyticsPanel;

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
  Area, AreaChart,
  TooltipProps,
} from 'recharts';
import { taskApi } from '../services/api';
import {
  DayAnalytics, WeekAnalyticsResponse, MonthAnalyticsResponse, InsightsResponse,
} from '../types';
import {
  ChevronLeftIcon, ChevronRightIcon,
  FireIcon, TrophyIcon, LightBulbIcon, ExclamationTriangleIcon,
  CheckCircleIcon, XCircleIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

type Tab = 'weekly' | 'monthly';

// ─── colour helpers ───────────────────────────────────────────────────────────
const pctColor = (pct: number) => pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
const heatBg   = (pct: number, total: number) =>
  total === 0 ? 'rgba(30,41,59,0.5)' :
  pct >= 80   ? 'rgba(34,197,94,0.25)'  :
  pct >= 50   ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)';
const heatBorder = (pct: number, total: number) =>
  total === 0 ? 'rgba(51,65,85,0.3)' :
  pct >= 80   ? 'rgba(34,197,94,0.45)'  :
  pct >= 50   ? 'rgba(245,158,11,0.45)' : 'rgba(239,68,68,0.45)';

// ─── shared custom tooltip ────────────────────────────────────────────────────
const CustomTooltip: React.FC<TooltipProps<number, string>> = (props) => {
  const { active, payload } = props as any;
  const label = (props as any).label;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(51,65,85,0.8)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-slate-200 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-xs mb-0.5">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── stat card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color: string; bg: string; border: string; icon: React.ReactNode }> =
  ({ label, value, sub, color, bg, border, icon }) => (
  <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-2" style={{ background: bg, border: `1px solid ${border}` }}>
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-3xl sm:text-4xl font-extrabold leading-none" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px] text-slate-500 font-medium">{sub}</div>}
  </div>
);

// ─── section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> =
  ({ title, subtitle, children }) => (
  <div className="rounded-2xl overflow-hidden"
    style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(51,65,85,0.45)' }}>
    <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
      <h3 className="font-bold text-slate-100 text-base">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── loading spinner ──────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
      style={{ borderTopColor: '#14b8a6', borderRightColor: 'rgba(20,184,166,0.3)' }} />
  </div>
);

// ─── data table ──────────────────────────────────────────────────────────────
const DataTable: React.FC<{ days: DayAnalytics[] }> = ({ days }) => {
  const [sortKey, setSortKey] = useState<keyof DayAnalytics>('date');
  const [sortAsc, setSortAsc] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  const sorted = [...days].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleSort = (key: keyof DayAnalytics) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const cols: { key: keyof DayAnalytics; label: string }[] = [
    { key: 'weekday', label: 'Day' },
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Total' },
    { key: 'completed', label: '✅ Done' },
    { key: 'missed', label: '❌ Missed' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'completion_pct', label: '% Rate' },
  ];

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(51,65,85,0.4)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
            {cols.map(col => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer select-none transition-colors hover:text-primary-400"
                onClick={() => handleSort(col.key)}
              >
                {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => {
            const isToday = d.date === today;
            return (
              <tr
                key={d.date}
                className="transition-colors"
                style={{
                  background: isToday
                    ? 'rgba(20,184,166,0.07)'
                    : i % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(20,30,50,0.4)',
                  borderBottom: '1px solid rgba(51,65,85,0.2)',
                }}
              >
                <td className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap">
                  {d.weekday.slice(0, 3)}
                  {isToday && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(20,184,166,0.2)', color: '#2dd4bf' }}>TODAY</span>}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{d.date}</td>
                <td className="px-4 py-3 font-bold text-slate-200">{d.total}</td>
                <td className="px-4 py-3 font-semibold text-emerald-400">{d.completed}</td>
                <td className="px-4 py-3 font-semibold text-red-400">{d.missed}</td>
                <td className="px-4 py-3 font-semibold text-amber-400">{d.pending}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)', minWidth: '40px' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${d.completion_pct}%`, background: pctColor(d.completion_pct) }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right flex-shrink-0" style={{ color: pctColor(d.completion_pct) }}>
                      {d.completion_pct}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* Summary row */}
        {days.length > 0 && (() => {
          const total = days.reduce((s, d) => s + d.total, 0);
          const done = days.reduce((s, d) => s + d.completed, 0);
          const missed = days.reduce((s, d) => s + d.missed, 0);
          const pending = days.reduce((s, d) => s + d.pending, 0);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <tfoot>
              <tr style={{ background: 'rgba(20,184,166,0.06)', borderTop: '1px solid rgba(20,184,166,0.25)' }}>
                <td className="px-4 py-3 font-extrabold text-primary-400 text-xs uppercase tracking-widest" colSpan={2}>Totals</td>
                <td className="px-4 py-3 font-extrabold text-slate-100">{total}</td>
                <td className="px-4 py-3 font-extrabold text-emerald-400">{done}</td>
                <td className="px-4 py-3 font-extrabold text-red-400">{missed}</td>
                <td className="px-4 py-3 font-extrabold text-amber-400">{pending}</td>
                <td className="px-4 py-3 font-extrabold" style={{ color: pctColor(pct) }}>{pct}%</td>
              </tr>
            </tfoot>
          );
        })()}
      </table>
    </div>
  );
};

// ─── insights panel ───────────────────────────────────────────────────────────
const InsightsPanel: React.FC<{ insights: InsightsResponse | null; loading: boolean }> = ({ insights, loading }) => {
  if (loading) return <Spinner />;
  if (!insights) return <p className="text-slate-500 text-sm text-center py-6">No insights yet.</p>;
  const { summary, best_day, worst_day, suggestions } = insights;

  // Weekday breakdown for pie chart
  const wdData = Object.entries(insights.weekday_breakdown).map(([name, v]) => ({
    name,
    rate: v.days > 0 ? Math.round((v.completed / (v.total || 1)) * 100) : 0,
    total: v.total,
  })).sort((a, b) => b.rate - a.rate);

  const PIE_COLORS = ['#14b8a6', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#ec4899'];

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Completion" value={`${summary.overall_completion_pct}%`}
          sub={`${summary.total_completed} of ${summary.total_tasks} tasks`}
          color="#14b8a6" bg="rgba(20,184,166,0.07)" border="rgba(20,184,166,0.25)"
          icon={<CheckCircleIcon className="w-4 h-4" />} />
        <StatCard label="Streak" value={summary.current_streak}
          sub="consecutive days completed"
          color="#f59e0b" bg="rgba(245,158,11,0.07)" border="rgba(245,158,11,0.25)"
          icon={<FireIcon className="w-4 h-4" />} />
        <StatCard label="Avg / Day" value={summary.avg_tasks_per_day}
          sub="tasks scheduled per day"
          color="#a855f7" bg="rgba(168,85,247,0.07)" border="rgba(168,85,247,0.25)"
          icon={<ChartBarIcon className="w-4 h-4" />} />
        <StatCard label="Missed" value={summary.total_missed}
          color="#ef4444" bg="rgba(239,68,68,0.07)" border="rgba(239,68,68,0.25)"
          icon={<XCircleIcon className="w-4 h-4" />} />
        {best_day && (
          <StatCard label="Best Day 🏆" value={`${best_day.completion_pct}%`}
            sub={`${best_day.weekday} · ${best_day.date}`}
            color="#22c55e" bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.25)"
            icon={<TrophyIcon className="w-4 h-4" />} />
        )}
        {worst_day && (
          <StatCard label="Needs Work" value={`${worst_day.completion_pct}%`}
            sub={`${worst_day.weekday} · ${worst_day.date}`}
            color="#ef4444" bg="rgba(239,68,68,0.07)" border="rgba(239,68,68,0.25)"
            icon={<ExclamationTriangleIcon className="w-4 h-4" />} />
        )}
      </div>

      {/* Completion donut + weekday breakdown */}
      {wdData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Overall Split</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: summary.total_completed },
                    { name: 'Missed', value: summary.total_missed },
                    { name: 'Pending', value: summary.total_tasks - summary.total_completed - summary.total_missed },
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Weekday bar */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">By Weekday (% done)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={wdData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {wdData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <LightBulbIcon className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-slate-100">AI Insights & Suggestions</span>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl animate-fade-in"
              style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.3)', animationDelay: `${i * 60}ms` }}>
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold mt-0.5"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>
                {i + 1}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── nav bar for period switching ─────────────────────────────────────────────
const PeriodNav: React.FC<{
  label: string; sublabel?: string;
  onPrev: () => void; onNext: () => void;
}> = ({ label, sublabel, onPrev, onNext }) => (
  <div className="rounded-2xl p-3 sm:p-4 flex items-center justify-between"
    style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(51,65,85,0.45)' }}>
    <button onClick={onPrev} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 transition-all duration-200"
      style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)' }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.15)'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.4)'}>
      <ChevronLeftIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Prev</span>
    </button>
    <div className="text-center">
      <div className="font-bold text-slate-100 text-sm sm:text-lg">{label}</div>
      {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
    </div>
    <button onClick={onNext} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 transition-all duration-200"
      style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)' }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.15)'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.4)'}>
      <span className="hidden sm:inline">Next</span>
      <ChevronRightIcon className="w-4 h-4" />
    </button>
  </div>
);

// ─── heatmap (monthly) ────────────────────────────────────────────────────────
const MonthHeatmap: React.FC<{ days: DayAnalytics[] }> = ({ days }) => {
  if (!days.length) return null;
  const today = format(new Date(), 'yyyy-MM-dd');
  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fd = new Date(days[0].date + 'T12:00:00').getDay();
  const offset = fd === 0 ? 6 : fd - 1;

  return (
    <div>
      <div className="grid grid-cols-7 mb-1 px-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">{d[0]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(d => (
          <div key={d.date}
            className="aspect-square rounded-lg flex flex-col items-center justify-center relative group cursor-default transition-all duration-200"
            style={{ background: heatBg(d.completion_pct, d.total), border: `1px solid ${heatBorder(d.completion_pct, d.total)}` }}
            title={`${d.date}: ${d.completed}/${d.total} (${d.completion_pct}%)`}>
            <div className={`text-[9px] sm:text-[11px] font-bold ${d.date === today ? 'text-primary-300' : 'text-slate-300'}`}>
              {new Date(d.date + 'T12:00:00').getDate()}
            </div>
            {d.total > 0 && (
              <div className="text-[8px] font-semibold" style={{ color: pctColor(d.completion_pct) }}>{d.completion_pct}%</div>
            )}
            {/* Hover tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 hidden group-hover:block pointer-events-none">
              <div className="bg-slate-900 text-slate-200 text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl border border-slate-700 leading-relaxed">
                <div className="font-bold">{d.weekday.slice(0,3)}, {d.date}</div>
                <div className="text-emerald-400">✅ {d.completed} done</div>
                <div className="text-amber-400">⏳ {d.pending} pending</div>
                <div className="text-red-400">❌ {d.missed} missed</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
        {[['rgba(34,197,94,0.4)', '≥80%'], ['rgba(245,158,11,0.4)', '50–79%'], ['rgba(239,68,68,0.4)', '<50%'], ['rgba(30,41,59,0.6)', 'No tasks']].map(([bg, lbl]) => (
          <div key={lbl} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: bg }} />
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ReportView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('weekly');


  // ── weekly state ────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekData, setWeekData] = useState<WeekAnalyticsResponse | null>(null);
  const [weekInsights, setWeekInsights] = useState<InsightsResponse | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekInsLoading, setWeekInsLoading] = useState(false);

  // ── monthly state ───────────────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [monthData, setMonthData] = useState<MonthAnalyticsResponse | null>(null);
  const [monthInsights, setMonthInsights] = useState<InsightsResponse | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthInsLoading, setMonthInsLoading] = useState(false);



  // ── load weekly ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'weekly') return;
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr   = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    setWeekLoading(true); setWeekInsLoading(true);
    taskApi.getWeekAnalytics(startStr).then(r => setWeekData(r.data)).catch(console.error).finally(() => setWeekLoading(false));
    taskApi.getInsights(startStr, endStr).then(r => setWeekInsights(r.data)).catch(console.error).finally(() => setWeekInsLoading(false));
  }, [weekStart, tab]);

  // ── load monthly ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'monthly') return;
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth() + 1;
    const startStr = `${y}-${String(m).padStart(2,'0')}-01`;
    const endStr   = `${y}-${String(m).padStart(2,'0')}-${String(new Date(y, m, 0).getDate()).padStart(2,'0')}`;
    setMonthLoading(true); setMonthInsLoading(true);
    taskApi.getMonthAnalytics(y, m).then(r => setMonthData(r.data)).catch(console.error).finally(() => setMonthLoading(false));
    taskApi.getInsights(startStr, endStr).then(r => setMonthInsights(r.data)).catch(console.error).finally(() => setMonthInsLoading(false));
  }, [currentMonth, tab]);

  // ── chart data builders ─────────────────────────────────────────────────────
  const buildBarData = (days: DayAnalytics[]) =>
    days.map(d => ({
      name: d.weekday.slice(0, 3),
      Completed: d.completed,
      Missed: d.missed,
      Pending: d.pending,
      pct: d.completion_pct,
      date: d.date,
    }));

  const buildLineData = (days: DayAnalytics[]) =>
    days.map(d => ({
      name: d.weekday.slice(0, 3),
      'Completion %': d.completion_pct,
      Total: d.total,
      date: d.date,
    }));

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-4 py-2 space-y-5 animate-fade-in">

      {/* ── Page header ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #14b8a6 0%, #a855f7 50%, #ec4899 100%)' }} />
        <div className="px-5 sm:px-7 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 4px 14px rgba(20,184,166,0.4)' }}>
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">Analytics Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500 ml-12">Interactive charts & reports to track your productivity.</p>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderTop: '1px solid rgba(51,65,85,0.4)' }}>
          {(['weekly', 'monthly'] as Tab[]).map(t => (
            <button key={t} id={`report-tab-${t}`} onClick={() => setTab(t)}
              className="flex-1 py-3.5 text-sm font-bold transition-all duration-200"
              style={{
                color: tab === t ? '#14b8a6' : '#64748b',
                borderBottom: tab === t ? '2px solid #14b8a6' : '2px solid transparent',
                background: tab === t ? 'rgba(20,184,166,0.06)' : 'transparent',
              }}>
              {t === 'weekly' ? '📅 Weekly Report' : '🗓️ Monthly Report'}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════ WEEKLY TAB ════════════════ */}
      {tab === 'weekly' && (
        <>
          <PeriodNav
            label={`${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
            sublabel={weekData ? `${weekData.days.reduce((s,d)=>s+d.total,0)} tasks · ${weekData.days.reduce((s,d)=>s+d.completed,0)} completed` : undefined}
            onPrev={() => setWeekStart(subWeeks(weekStart, 1))}
            onNext={() => setWeekStart(addWeeks(weekStart, 1))}
          />

          {weekLoading ? <Spinner /> : weekData && (
            <>
              {/* Stacked bar chart */}
              <Section title="📊 Daily Task Breakdown" subtitle="Stacked view of completed, missed and pending tasks per day">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={buildBarData(weekData.days)} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
                    <Bar dataKey="Missed"    stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                    <Bar dataKey="Pending"   stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              {/* Completion % line chart */}
              <Section title="📈 Completion Rate Trend" subtitle="Daily completion percentage across the week">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={buildLineData(weekData.days)}>
                    <defs>
                      <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} formatter={(v) => [`${String(v)}%`, 'Completion Rate']} cursor={{ stroke: 'rgba(20,184,166,0.3)' }} />
                    <Area type="monotone" dataKey="Completion %" stroke="#14b8a6" strokeWidth={2.5}
                      fill="url(#wkGrad)" dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>

              {/* Data table */}
              <Section title="📋 Day-by-Day Data Table" subtitle="Click column headers to sort">
                <DataTable days={weekData.days} />
              </Section>
            </>
          )}

          {/* Insights */}
          <Section title="💡 Insights & Suggestions" subtitle="Personalised analysis of your productivity patterns">
            <InsightsPanel insights={weekInsights} loading={weekInsLoading} />
          </Section>
        </>
      )}

      {/* ════════════════ MONTHLY TAB ════════════════ */}
      {tab === 'monthly' && (
        <>
          <PeriodNav
            label={format(currentMonth, 'MMMM yyyy')}
            sublabel={monthData ? `${monthData.days.reduce((s,d)=>s+d.total,0)} tasks · ${monthData.days.reduce((s,d)=>s+d.completed,0)} completed` : undefined}
            onPrev={() => setCurrentMonth(subMonths(currentMonth, 1))}
            onNext={() => setCurrentMonth(addMonths(currentMonth, 1))}
          />

          {monthLoading ? <Spinner /> : monthData && (
            <>
              {/* Heatmap */}
              <Section title="🗓️ Completion Heatmap" subtitle="Colour-coded calendar showing how each day performed">
                <MonthHeatmap days={monthData.days} />
              </Section>

              {/* Stacked bar — show every 3rd day label for readability */}
              <Section title="📊 Monthly Task Breakdown" subtitle="Completed · Missed · Pending per day">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={buildBarData(monthData.days)} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                      interval={2} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="Completed" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Missed"    stackId="a" fill="#ef4444" />
                    <Bar dataKey="Pending"   stackId="a" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              {/* Completion % area chart */}
              <Section title="📈 Monthly Completion Trend" subtitle="Rolling completion rate across the month">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={buildLineData(monthData.days)}>
                    <defs>
                      <linearGradient id="moGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} formatter={(v) => [`${String(v)}%`, 'Completion Rate']} cursor={{ stroke: 'rgba(168,85,247,0.3)' }} />
                    <Area type="monotone" dataKey="Completion %" stroke="#a855f7" strokeWidth={2.5}
                      fill="url(#moGrad)" dot={false}
                      activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>

              {/* Sortable data table */}
              <Section title="📋 Full Month Data Table" subtitle="Click column headers to sort">
                <DataTable days={monthData.days} />
              </Section>
            </>
          )}

          {/* Insights */}
          <Section title="💡 Insights & Suggestions" subtitle="Personalised analysis of your monthly productivity">
            <InsightsPanel insights={monthInsights} loading={monthInsLoading} />
          </Section>
        </>
      )}
    </div>
  );
};

export default ReportView;

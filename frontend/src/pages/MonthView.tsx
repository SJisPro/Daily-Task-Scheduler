import React, { useState, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, getDay,
} from 'date-fns';
import { Task, TaskCreate } from '../types';
import { taskApi } from '../services/api';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import RollbackBanner from '../components/RollbackBanner';
import {
  ChevronLeftIcon, ChevronRightIcon, TrashIcon,
  PlusIcon, DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

const MonthView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSourceDate, setDuplicateSourceDate] = useState<string>('');
  const [duplicateType, setDuplicateType] = useState<'week' | 'month' | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicatedTaskIds, setDuplicatedTaskIds] = useState<number[]>([]);
  const [showRollbackBanner, setShowRollbackBanner] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  useEffect(() => { loadMonthTasks(); }, [currentMonth]);

  const loadMonthTasks = async () => {
    setLoading(true); setError(null);
    try {
      const response = await taskApi.getMonth(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
      setTasks(response.data || []);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to load tasks.');
    } finally { setLoading(false); }
  };

  const handleCreateTask = async (taskData: TaskCreate) => {
    try { await taskApi.create(taskData); loadMonthTasks(); }
    catch (e) { console.error(e); }
  };

  const handleUpdateTask = async (taskData: TaskCreate) => {
    if (!editingTask) return;
    try { await taskApi.update(editingTask.id, taskData); loadMonthTasks(); setEditingTask(null); }
    catch (e) { console.error(e); }
  };

  const handleEdit = (task: Task) => { setEditingTask(task); setIsFormOpen(true); };

  const getTasksForDate = (date: Date) =>
    tasks.filter(t => t.scheduled_date === format(date, 'yyyy-MM-dd'));

  const navigateMonth = (dir: 'prev' | 'next') =>
    setCurrentMonth(dir === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));

  const handleDuplicateClick = (date: Date, type: 'week' | 'month') => {
    if (getTasksForDate(date).length === 0) {
      alert(`No tasks for ${format(date, 'MMMM d, yyyy')}!`); return;
    }
    setDuplicateSourceDate(format(date, 'yyyy-MM-dd'));
    setDuplicateType(type);
    setShowDuplicateDialog(true);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateType || !duplicateSourceDate) return;
    setDuplicating(true);
    try {
      const response = await taskApi.duplicateTasks(duplicateSourceDate, duplicateType);
      setDuplicatedTaskIds(response.data.map(t => t.id));
      setShowDuplicateDialog(false);
      setDuplicateType(null);
      setDuplicateSourceDate('');
      setShowRollbackBanner(true);
      loadMonthTasks();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to duplicate tasks.');
    } finally { setDuplicating(false); }
  };

  const handleRollback = async () => {
    if (!duplicatedTaskIds.length) return;
    setRollingBack(true);
    try {
      await taskApi.batchDelete(duplicatedTaskIds);
      setShowRollbackBanner(false);
      setDuplicatedTaskIds([]);
      loadMonthTasks();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to rollback.');
    } finally { setRollingBack(false); }
  };

  const handleDismissRollback = () => {
    setShowRollbackBanner(false);
    setTimeout(() => setDuplicatedTaskIds([]), 30000);
  };

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const response = await taskApi.deleteByMonth(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
      setShowDeleteAllDialog(false);
      alert(`Deleted ${response.data.deleted_count} task(s)!`);
      loadMonthTasks();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete tasks.');
    } finally { setDeletingAll(false); }
  };

  // Calendar math
  let monthStart = new Date(), monthEnd = new Date(), daysInMonth: Date[] = [], adjustedFirstDay = 0;
  const today = new Date();
  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  try {
    monthStart = startOfMonth(currentMonth);
    monthEnd = endOfMonth(currentMonth);
    daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const fd = getDay(monthStart);
    adjustedFirstDay = fd === 0 ? 6 : fd - 1;
  } catch { daysInMonth = []; adjustedFirstDay = 0; }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#14b8a6', borderRightColor: 'rgba(20,184,166,0.3)' }} />
          <p className="text-slate-500 font-medium text-sm">Loading month…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-red-400 font-semibold mb-1">Error loading tasks</p>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button onClick={loadMonthTasks} className="btn-danger">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-2 space-y-6 animate-fade-in">
      {/* Month header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(20,30,50,0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(51,65,85,0.5)',
        }}
      >
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #14b8a6, #a855f7)' }} />
        <div className="p-5 flex items-center justify-between">
          <button
            id="month-prev-btn"
            onClick={() => navigateMonth('prev')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all duration-200"
            style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.4)'}
          >
            <ChevronLeftIcon className="w-4 h-4" /> Prev
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-100">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} this month
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <button
                id="month-delete-all-btn"
                onClick={() => setShowDeleteAllDialog(true)}
                className="btn-danger flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" /> Delete All
              </button>
            )}
            <button
              id="month-next-btn"
              onClick={() => navigateMonth('next')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all duration-200"
              style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.15)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.4)'}
            >
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(20,30,50,0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(51,65,85,0.4)',
        }}
      >
        {/* Weekday headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
          {WEEK_DAYS.map(day => (
            <div key={day}
              className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest"
              style={{ borderRight: day !== 'Sun' ? '1px solid rgba(51,65,85,0.25)' : undefined }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" style={{ borderRight: '1px solid rgba(51,65,85,0.15)', borderBottom: '1px solid rgba(51,65,85,0.15)' }} />
          ))}

          {/* Day cells */}
          {daysInMonth.map((day, di) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, today);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isHovered = hoveredDay === dateStr;
            const completedCount = dayTasks.filter(t => t.is_completed).length;
            const colIndex = (adjustedFirstDay + di) % 7;
            const isLastCol = colIndex === 6;

            return (
              <div
                key={`day-${day.getTime()}-${di}`}
                className="relative transition-all duration-200 cursor-pointer"
                style={{
                  minHeight: '100px',
                  borderRight: !isLastCol ? '1px solid rgba(51,65,85,0.2)' : undefined,
                  borderBottom: '1px solid rgba(51,65,85,0.2)',
                  background: isToday
                    ? 'rgba(20,184,166,0.07)'
                    : isHovered
                      ? 'rgba(51,65,85,0.25)'
                      : 'transparent',
                }}
                onMouseEnter={() => setHoveredDay(dateStr)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => {
                  if (isSameMonth(day, currentMonth)) {
                    setSelectedDate(dateStr);
                    setEditingTask(null);
                    setIsFormOpen(true);
                  }
                }}
              >
                {/* Day number */}
                <div className="p-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1.5"
                    style={isToday
                      ? { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', color: '#fff', boxShadow: '0 3px 10px rgba(20,184,166,0.5)' }
                      : { color: isSameMonth(day, currentMonth) ? '#cbd5e1' : '#334155' }
                    }
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Task count pill */}
                  {dayTasks.length > 0 && isSameMonth(day, currentMonth) && (
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.5)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(completedCount / dayTasks.length) * 100}%`,
                            background: completedCount === dayTasks.length
                              ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                              : 'linear-gradient(90deg,#14b8a6,#0d9488)',
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium">{completedCount}/{dayTasks.length}</span>
                    </div>
                  )}

                  {/* Task chips */}
                  {dayTasks.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      onClick={e => { e.stopPropagation(); handleEdit(task); }}
                      className="truncate rounded px-1.5 py-0.5 mb-0.5 text-[10px] font-medium transition-all duration-150"
                      style={{
                        background: task.is_completed ? 'rgba(34,197,94,0.12)' : 'rgba(20,184,166,0.1)',
                        color: task.is_completed ? '#4ade80' : '#2dd4bf',
                        border: task.is_completed ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(20,184,166,0.2)',
                        textDecoration: task.is_completed ? 'line-through' : undefined,
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[10px] text-slate-600 font-medium px-1">+{dayTasks.length - 2} more</div>
                  )}

                  {/* Action buttons on hover */}
                  {isHovered && isSameMonth(day, currentMonth) && (
                    <div className="mt-1.5 space-y-1 animate-fade-in" onClick={e => e.stopPropagation()}>
                      <button
                        id={`month-add-task-${dateStr}`}
                        onClick={e => { e.stopPropagation(); setSelectedDate(dateStr); setEditingTask(null); setIsFormOpen(true); }}
                        className="w-full py-1 rounded-lg text-[10px] font-semibold text-primary-400 flex items-center justify-center gap-0.5 transition-colors"
                        style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}
                      >
                        <PlusIcon className="w-3 h-3" />Add
                      </button>
                      {dayTasks.length > 0 && (
                        <div className="flex gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); handleDuplicateClick(day, 'week'); }}
                            className="flex-1 py-1 rounded-lg text-[9px] font-semibold transition-colors"
                            style={{ background: 'rgba(20,184,166,0.08)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.2)' }}
                          >
                            <DocumentDuplicateIcon className="w-2.5 h-2.5 inline mr-0.5" />Wk
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDuplicateClick(day, 'month'); }}
                            className="flex-1 py-1 rounded-lg text-[9px] font-semibold transition-colors"
                            style={{ background: 'rgba(168,85,247,0.08)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}
                          >
                            <DocumentDuplicateIcon className="w-2.5 h-2.5 inline mr-0.5" />Mo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <TaskForm
        task={editingTask}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); setSelectedDate(''); }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        initialDate={selectedDate}
      />

      {showDuplicateDialog && duplicateSourceDate && duplicateType && (
        <ConfirmDialog
          isOpen={showDuplicateDialog}
          title={`Duplicate to ${duplicateType === 'week' ? 'Week' : 'Month'}`}
          message={`Copy all tasks from ${format(new Date(duplicateSourceDate), 'MMMM d, yyyy')} to the next ${duplicateType === 'week' ? '6 days' : '30 days'}?`}
          confirmText={duplicating ? 'Duplicating…' : 'Duplicate'}
          cancelText="Cancel"
          onConfirm={handleDuplicateConfirm}
          onCancel={() => { setShowDuplicateDialog(false); setDuplicateType(null); setDuplicateSourceDate(''); }}
          type="info"
        />
      )}

      <RollbackBanner
        isVisible={showRollbackBanner}
        taskCount={duplicatedTaskIds.length}
        onRollback={handleRollback}
        onDismiss={handleDismissRollback}
        type={duplicateType || 'month'}
        rollingBack={rollingBack}
      />

      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        title="Delete All Tasks"
        message={`Delete all ${tasks.length} task(s) for ${format(currentMonth, 'MMMM yyyy')}? This cannot be undone.`}
        confirmText={deletingAll ? 'Deleting…' : 'Delete All'}
        cancelText="Cancel"
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default MonthView;

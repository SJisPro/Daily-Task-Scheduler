import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Task, TaskCreate } from '../types';
import { taskApi } from '../services/api';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import RollbackBanner from '../components/RollbackBanner';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const WeekView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    try { return startOfWeek(new Date(), { weekStartsOn: 1 }); }
    catch { return new Date(); }
  });
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

  useEffect(() => { loadWeekTasks(); }, [weekStart]);

  const loadWeekTasks = async () => {
    setLoading(true); setError(null);
    try {
      const response = await taskApi.getWeek(format(weekStart, 'yyyy-MM-dd'));
      setTasks(response.data || []);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to load tasks.');
    } finally { setLoading(false); }
  };

  const handleCreateTask = async (taskData: TaskCreate) => {
    try { await taskApi.create(taskData); loadWeekTasks(); }
    catch (error) { console.error(error); }
  };

  const handleUpdateTask = async (taskData: TaskCreate) => {
    if (!editingTask) return;
    try { await taskApi.update(editingTask.id, taskData); loadWeekTasks(); setEditingTask(null); }
    catch (error) { console.error(error); }
  };

  const handleComplete = async (id: number) => {
    try { await taskApi.complete(id); loadWeekTasks(); }
    catch (error) { console.error(error); }
  };

  const handleUncomplete = async (id: number) => {
    try { await taskApi.uncomplete(id); loadWeekTasks(); }
    catch (error) { console.error(error); }
  };

  const handleEdit = (task: Task) => { setEditingTask(task); setIsFormOpen(true); };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this task?')) {
      try { await taskApi.delete(id); loadWeekTasks(); }
      catch (error) { console.error(error); }
    }
  };

  const getTasksForDay = (date: Date) => tasks.filter(t => t.scheduled_date === format(date, 'yyyy-MM-dd'));
  const navigateWeek = (dir: 'prev' | 'next') => setWeekStart(addDays(weekStart, dir === 'next' ? 7 : -7));

  let weekDays: Date[] = [];
  const today = new Date();
  try {
    weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  } catch { weekDays = []; }

  const handleDuplicateClick = (date: Date, type: 'week' | 'month') => {
    if (getTasksForDay(date).length === 0) {
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
      loadWeekTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to duplicate tasks.');
    } finally { setDuplicating(false); }
  };

  const handleRollback = async () => {
    if (!duplicatedTaskIds.length) return;
    setRollingBack(true);
    try {
      await taskApi.batchDelete(duplicatedTaskIds);
      setShowRollbackBanner(false);
      setDuplicatedTaskIds([]);
      loadWeekTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to rollback.');
    } finally { setRollingBack(false); }
  };

  const handleDismissRollback = () => {
    setShowRollbackBanner(false);
    setTimeout(() => setDuplicatedTaskIds([]), 30000);
  };

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const response = await taskApi.deleteByWeek(format(weekStart, 'yyyy-MM-dd'));
      setShowDeleteAllDialog(false);
      alert(`Deleted ${response.data.deleted_count} task(s)!`);
      loadWeekTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete tasks.');
    } finally { setDeletingAll(false); }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#14b8a6', borderRightColor: 'rgba(20,184,166,0.3)' }} />
          <p className="text-slate-500 font-medium text-sm">Loading week…</p>
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
          <button onClick={loadWeekTasks} className="btn-danger">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-4 py-2 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Week header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(20,30,50,0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(51,65,85,0.5)',
        }}
      >
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #14b8a6, #a855f7)' }} />
        <div className="p-3 sm:p-5 flex items-center justify-between gap-2">
          <button
            id="week-prev-btn"
            onClick={() => navigateWeek('prev')}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all duration-200 flex-shrink-0"
            style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.4)'}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="text-center min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-slate-100 truncate">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} this week
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {tasks.length > 0 && (
              <button
                id="week-delete-all-btn"
                onClick={() => setShowDeleteAllDialog(true)}
                className="btn-danger flex items-center gap-1 sm:gap-2 !px-3 sm:!px-4"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Delete All</span>
              </button>
            )}
            <button
              id="week-next-btn"
              onClick={() => navigateWeek('next')}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all duration-200"
              style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.15)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,65,85,0.4)'}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week grid — 7 cols on desktop, stacked on mobile */}
      <div className="hidden sm:grid grid-cols-7 gap-3">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;
          const completedDay = dayTasks.filter(t => t.is_completed).length;

          return (
            <div
              key={index}
              className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
              style={{
                background: isToday
                  ? 'rgba(20,184,166,0.08)'
                  : 'rgba(20,30,50,0.6)',
                backdropFilter: 'blur(12px)',
                border: isToday
                  ? '1px solid rgba(20,184,166,0.4)'
                  : '1px solid rgba(51,65,85,0.4)',
                boxShadow: isToday ? '0 0 20px rgba(20,184,166,0.1)' : undefined,
                opacity: isPast ? 0.7 : 1,
                minHeight: '320px',
              }}
            >
              {/* Day header */}
              <div
                className="p-3 text-center"
                style={{
                  borderBottom: `1px solid ${isToday ? 'rgba(20,184,166,0.25)' : 'rgba(51,65,85,0.4)'}`,
                  background: isToday ? 'rgba(20,184,166,0.1)' : 'rgba(15,23,42,0.4)',
                }}
              >
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-primary-400' : 'text-slate-500'}`}>
                  {format(day, 'EEE')}
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto ${isToday ? 'text-slate-900' : 'text-slate-300'}`}
                  style={isToday ? { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 3px 10px rgba(20,184,166,0.5)' } : undefined}
                >
                  {format(day, 'd')}
                </div>
                {dayTasks.length > 0 && (
                  <div className="mt-1.5 text-[10px] text-slate-500 font-medium">
                    {completedDay}/{dayTasks.length}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <div className="text-center text-slate-600 text-[11px] py-6 font-medium">
                    No tasks
                  </div>
                ) : (
                  dayTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-2 rounded-xl text-xs cursor-pointer transition-all duration-200 group/task"
                      style={{
                        background: task.is_completed
                          ? 'rgba(34,197,94,0.08)'
                          : 'rgba(20,184,166,0.06)',
                        border: task.is_completed
                          ? '1px solid rgba(34,197,94,0.25)'
                          : '1px solid rgba(20,184,166,0.2)',
                      }}
                      onClick={() => handleEdit(task)}
                    >
                      <div
                        className={`font-semibold leading-snug ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {task.title}
                      </div>
                      <div className="text-slate-600 mt-0.5 text-[10px]">⏰ {task.scheduled_time}</div>

                      <div className="flex gap-1 mt-1.5 opacity-0 group-hover/task:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); task.is_completed ? handleUncomplete(task.id) : handleComplete(task.id); }}
                          className="flex-1 flex items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors"
                          style={{
                            background: task.is_completed ? 'rgba(34,197,94,0.15)' : 'rgba(20,184,166,0.15)',
                            color: task.is_completed ? '#4ade80' : '#2dd4bf',
                          }}
                        >
                          <CheckIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                          className="flex items-center justify-center px-2 py-1 rounded-lg text-[10px] transition-colors"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Day footer */}
              <div className="p-2 space-y-1.5" style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
                <button
                  id={`week-add-task-${format(day, 'yyyy-MM-dd')}`}
                  onClick={() => { setSelectedDate(format(day, 'yyyy-MM-dd')); setEditingTask(null); setIsFormOpen(true); }}
                  className="w-full py-2 rounded-xl text-[11px] font-semibold text-primary-400 transition-all duration-200"
                  style={{ border: '1px dashed rgba(20,184,166,0.3)', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.06)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                >
                  <PlusIcon className="w-3 h-3 inline mr-1" />Add
                </button>
                {dayTasks.length > 0 && (
                  <div className="flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleDuplicateClick(day, 'week'); }}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200"
                      style={{ background: 'rgba(20,184,166,0.08)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.2)' }}
                      title="Copy to week"
                    >
                      <DocumentDuplicateIcon className="w-3 h-3 inline mr-0.5" />Wk
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDuplicateClick(day, 'month'); }}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200"
                      style={{ background: 'rgba(168,85,247,0.08)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}
                      title="Copy to month"
                    >
                      <DocumentDuplicateIcon className="w-3 h-3 inline mr-0.5" />Mo
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked day list */}
      <div className="sm:hidden space-y-3">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;
          const completedDay = dayTasks.filter(t => t.is_completed).length;

          return (
            <div
              key={index}
              className="rounded-2xl overflow-hidden"
              style={{
                background: isToday ? 'rgba(20,184,166,0.08)' : 'rgba(20,30,50,0.6)',
                backdropFilter: 'blur(12px)',
                border: isToday ? '1px solid rgba(20,184,166,0.4)' : '1px solid rgba(51,65,85,0.4)',
                boxShadow: isToday ? '0 0 20px rgba(20,184,166,0.1)' : undefined,
                opacity: isPast ? 0.75 : 1,
              }}
            >
              {/* Day header row */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  borderBottom: `1px solid ${isToday ? 'rgba(20,184,166,0.25)' : 'rgba(51,65,85,0.4)'}`,
                  background: isToday ? 'rgba(20,184,166,0.1)' : 'rgba(15,23,42,0.4)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isToday ? 'text-slate-900' : 'text-slate-300'}`}
                    style={isToday ? { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 3px 10px rgba(20,184,166,0.5)' } : undefined}
                  >
                    {format(day, 'd')}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${isToday ? 'text-primary-400' : 'text-slate-200'}`}>
                      {format(day, 'EEEE')}
                    </div>
                    <div className="text-xs text-slate-500">{format(day, 'MMM d, yyyy')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dayTasks.length > 0 && (
                    <span className="text-xs text-slate-400 font-medium">{completedDay}/{dayTasks.length}</span>
                  )}
                  <button
                    id={`week-mobile-add-task-${format(day, 'yyyy-MM-dd')}`}
                    onClick={() => { setSelectedDate(format(day, 'yyyy-MM-dd')); setEditingTask(null); setIsFormOpen(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-400 transition-all duration-200"
                    style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.08)' }}
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Tasks */}
              {dayTasks.length === 0 ? (
                <div className="px-4 py-4 text-center text-slate-600 text-xs font-medium">No tasks scheduled</div>
              ) : (
                <div className="p-3 space-y-2">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
                      style={{
                        background: task.is_completed ? 'rgba(34,197,94,0.08)' : 'rgba(20,184,166,0.06)',
                        border: task.is_completed ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(20,184,166,0.15)',
                      }}
                    >
                      <button
                        onClick={() => task.is_completed ? handleUncomplete(task.id) : handleComplete(task.id)}
                        className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                        style={task.is_completed
                          ? { background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderColor: '#22c55e' }
                          : { borderColor: '#14b8a6', background: 'transparent' }
                        }
                      >
                        {task.is_completed && <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => handleEdit(task)}>
                        <div className={`text-sm font-semibold truncate ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">⏰ {task.scheduled_time}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 transition-colors"
                        style={{ background: 'rgba(239,68,68,0.08)' }}
                      >
                        <XMarkIcon className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
        type={duplicateType || 'week'}
        rollingBack={rollingBack}
      />

      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        title="Delete All Tasks"
        message={`Delete all ${tasks.length} task(s) for this week? This cannot be undone.`}
        confirmText={deletingAll ? 'Deleting…' : 'Delete All'}
        cancelText="Cancel"
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default WeekView;

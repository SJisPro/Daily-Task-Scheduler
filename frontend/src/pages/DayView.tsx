import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Task, TaskCreate, CopyTargetType } from '../types';
import { taskApi } from '../services/api';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import RollbackBanner from '../components/RollbackBanner';
import WeekCopyDialog from '../components/WeekCopyDialog';
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ListBulletIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const DayView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWeekCopyDialog, setShowWeekCopyDialog] = useState(false);
  const [showMonthCopyDialog, setShowMonthCopyDialog] = useState(false);
  const [duplicateType, setDuplicateType] = useState<CopyTargetType | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicatedTaskIds, setDuplicatedTaskIds] = useState<number[]>([]);
  const [showRollbackBanner, setShowRollbackBanner] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await taskApi.getAll(selectedDate);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: TaskCreate) => {
    try { await taskApi.create(taskData); loadTasks(); }
    catch (error) { console.error('Error creating task:', error); }
  };

  const handleUpdateTask = async (taskData: TaskCreate) => {
    if (!editingTask) return;
    try { await taskApi.update(editingTask.id, taskData); loadTasks(); setEditingTask(null); }
    catch (error) { console.error('Error updating task:', error); }
  };

  const handleComplete = async (id: number) => {
    try { await taskApi.complete(id); loadTasks(); }
    catch (error) { console.error('Error completing task:', error); }
  };

  const handleUncomplete = async (id: number) => {
    try { await taskApi.uncomplete(id); loadTasks(); }
    catch (error) { console.error('Error uncompleting task:', error); }
  };

  const handleEdit = (task: Task) => { setEditingTask(task); setIsFormOpen(true); };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try { await taskApi.delete(id); loadTasks(); }
      catch (error) { console.error('Error deleting task:', error); }
    }
  };

  const handleWeekCopyClick = () => {
    if (tasks.length === 0) { alert('No tasks to duplicate for this day!'); return; }
    setShowWeekCopyDialog(true);
  };

  const handleMonthCopyClick = () => {
    if (tasks.length === 0) { alert('No tasks to duplicate for this day!'); return; }
    setDuplicateType('month');
    setShowMonthCopyDialog(true);
  };

  const handleDuplicateConfirm = async (type: CopyTargetType) => {
    setDuplicating(true);
    try {
      const response = await taskApi.duplicateTasks(selectedDate, type);
      const createdTaskIds = response.data.map(task => task.id);
      setDuplicatedTaskIds(createdTaskIds);
      setDuplicateType(type);
      setShowWeekCopyDialog(false);
      setShowMonthCopyDialog(false);
      setShowRollbackBanner(true);
      loadTasks();
    } catch (error: any) {
      console.error('Error duplicating tasks:', error);
      alert(error.response?.data?.detail || 'Failed to duplicate tasks. Please try again.');
    } finally {
      setDuplicating(false);
    }
  };

  const handleRollback = async () => {
    if (duplicatedTaskIds.length === 0) return;
    setRollingBack(true);
    try {
      await taskApi.batchDelete(duplicatedTaskIds);
      setShowRollbackBanner(false);
      setDuplicatedTaskIds([]);
      loadTasks();
    } catch (error: any) {
      console.error('Error rolling back tasks:', error);
      alert(error.response?.data?.detail || 'Failed to rollback tasks. Please try again.');
    } finally {
      setRollingBack(false);
    }
  };

  const handleDismissRollback = () => {
    setShowRollbackBanner(false);
    setTimeout(() => setDuplicatedTaskIds([]), 30000);
  };

  const handleDeleteAllClick = () => {
    if (tasks.length === 0) { alert('No tasks to delete for this day!'); return; }
    setShowDeleteAllDialog(true);
  };

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const response = await taskApi.deleteByDate(selectedDate);
      setShowDeleteAllDialog(false);
      alert(`Successfully deleted ${response.data.deleted_count} task(s)!`);
      loadTasks();
    } catch (error: any) {
      console.error('Error deleting all tasks:', error);
      alert(error.response?.data?.detail || 'Failed to delete tasks. Please try again.');
    } finally {
      setDeletingAll(false);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  const completedCount = tasks.filter(t => t.is_completed).length;
  const pendingCount = tasks.length - completedCount;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="max-w-4xl mx-auto px-4 py-2 space-y-6 animate-fade-in">
      {/* ── Header card ── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(20,30,50,0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(51,65,85,0.5)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top gradient strip */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #14b8a6, #a855f7, #ec4899)' }} />

        <div className="p-6">
          {/* Date row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDaysIcon className="w-5 h-5 text-primary-400" />
                {isToday && (
                  <span className="badge-teal text-[11px]">Today</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-100">
                {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
              </h2>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <input
                id="day-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field !w-auto text-xs px-3 py-2"
                style={{ minWidth: '140px' }}
              />
              <button
                id="day-new-task-btn"
                onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                New Task
              </button>
              {tasks.length > 0 && (
                <>
                  <button
                    id="day-delete-all-btn"
                    onClick={handleDeleteAllClick}
                    className="btn-danger flex items-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete All
                  </button>
                  <button
                    id="day-copy-week-btn"
                    onClick={handleWeekCopyClick}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-primary-300"
                    style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.1)'}
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Copy to Week
                  </button>
                  <button
                    id="day-copy-month-btn"
                    onClick={handleMonthCopyClick}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-accent-300"
                    style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.1)'}
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Copy to Month
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Done</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{completedCount}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
              </div>
              <div className="text-3xl font-bold text-amber-400">{pendingCount}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <ListBulletIcon className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
              </div>
              <div className="text-3xl font-bold text-primary-400">{tasks.length}</div>
            </div>
          </div>

          {/* Progress bar */}
          {tasks.length > 0 && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                <span>Progress</span>
                <span className="text-primary-400">{progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(51,65,85,0.6)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #14b8a6, #a855f7)',
                    boxShadow: '0 0 8px rgba(20,184,166,0.5)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tasks list ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#14b8a6', borderRightColor: 'rgba(20,184,166,0.3)' }}
          />
          <p className="text-slate-500 font-medium text-sm">Loading tasks…</p>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div
          className="rounded-3xl p-16 text-center animate-fade-in"
          style={{
            background: 'rgba(20,30,50,0.6)',
            border: '1px dashed rgba(51,65,85,0.6)',
          }}
        >
          <div className="text-6xl mb-4 animate-float">📋</div>
          <h3 className="text-lg font-bold text-slate-300 mb-2">No tasks scheduled</h3>
          <p className="text-slate-500 text-sm mb-6">Start by creating your first task for this day.</p>
          <button
            id="day-empty-new-task-btn"
            onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Create a Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals & Banners */}
      <TaskForm
        task={editingTask}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        initialDate={selectedDate}
      />

      <WeekCopyDialog
        isOpen={showWeekCopyDialog}
        taskCount={tasks.length}
        sourceDate={format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMM d')}
        onSelect={(type) => handleDuplicateConfirm(type)}
        onCancel={() => setShowWeekCopyDialog(false)}
        copying={duplicating}
      />

      <ConfirmDialog
        isOpen={showMonthCopyDialog}
        title="Copy Tasks to Month"
        message={`This will copy all ${tasks.length} task(s) from ${format(new Date(selectedDate + 'T12:00:00'), 'MMMM d, yyyy')} to the next 30 days. Continue?`}
        confirmText={duplicating ? 'Copying…' : 'Copy to Month'}
        cancelText="Cancel"
        onConfirm={() => handleDuplicateConfirm('month')}
        onCancel={() => { setShowMonthCopyDialog(false); setDuplicateType(null); }}
        type="info"
      />

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
        message={`Are you sure you want to delete all ${tasks.length} task(s) for ${format(new Date(selectedDate), 'MMMM d, yyyy')}? This action cannot be undone.`}
        confirmText={deletingAll ? 'Deleting…' : 'Delete All'}
        cancelText="Cancel"
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default DayView;

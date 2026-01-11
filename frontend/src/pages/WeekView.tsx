import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Task, TaskCreate } from '../types';
import { taskApi } from '../services/api';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import RollbackBanner from '../components/RollbackBanner';
import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';

const WeekView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    try {
      return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    } catch (err) {
      console.error('Error initializing week start:', err);
      return new Date();
    }
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

  useEffect(() => {
    loadWeekTasks();
  }, [weekStart]);

  const loadWeekTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const response = await taskApi.getWeek(startDate);
      setTasks(response.data || []);
    } catch (error: any) {
      console.error('Error loading week tasks:', error);
      setError(error.response?.data?.detail || 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: TaskCreate) => {
    try {
      await taskApi.create(taskData);
      loadWeekTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskData: TaskCreate) => {
    if (!editingTask) return;
    try {
      await taskApi.update(editingTask.id, taskData);
      loadWeekTasks();
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await taskApi.complete(id);
      loadWeekTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleUncomplete = async (id: number) => {
    try {
      await taskApi.uncomplete(id);
      loadWeekTasks();
    } catch (error) {
      console.error('Error uncompleting task:', error);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskApi.delete(id);
        loadWeekTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getTasksForDay = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.scheduled_date === dateStr);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart(addDays(weekStart, direction === 'next' ? 7 : -7));
  };

  // Calculate week days safely - must happen before early returns
  let weekDays: Date[] = [];
  const today = new Date();

  try {
    if (weekStart && weekStart instanceof Date && !isNaN(weekStart.getTime())) {
      weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      console.warn('Invalid weekStart, using fallback');
      const fallbackWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      weekDays = Array.from({ length: 7 }, (_, i) => addDays(fallbackWeekStart, i));
    }
  } catch (err) {
    console.error('Error calculating week days:', err);
    // Fallback to current week
    try {
      const fallbackWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      weekDays = Array.from({ length: 7 }, (_, i) => addDays(fallbackWeekStart, i));
    } catch (fallbackErr) {
      console.error('Fallback also failed:', fallbackErr);
      weekDays = [];
    }
  }

  const handleDuplicateClick = (date: Date, type: 'week' | 'month') => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = getTasksForDay(date);

    if (dayTasks.length === 0) {
      alert(`No tasks to duplicate for ${format(date, 'MMMM d, yyyy')}!`);
      return;
    }

    setDuplicateSourceDate(dateStr);
    setDuplicateType(type);
    setShowDuplicateDialog(true);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateType || !duplicateSourceDate) return;

    setDuplicating(true);
    try {
      const response = await taskApi.duplicateTasks(duplicateSourceDate, duplicateType);
      const createdTaskIds = response.data.map(task => task.id);
      setDuplicatedTaskIds(createdTaskIds);
      setShowDuplicateDialog(false);
      setDuplicateType(null);
      setDuplicateSourceDate('');
      setShowRollbackBanner(true);
      loadWeekTasks();
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
      alert(`Successfully rolled back ${duplicatedTaskIds.length} task(s)!`);
      loadWeekTasks();
    } catch (error: any) {
      console.error('Error rolling back tasks:', error);
      alert(error.response?.data?.detail || 'Failed to rollback tasks. Please try again.');
    } finally {
      setRollingBack(false);
    }
  };

  const handleDismissRollback = () => {
    setShowRollbackBanner(false);
    // Clear IDs after a delay to allow rollback if user changes mind
    setTimeout(() => {
      setDuplicatedTaskIds([]);
    }, 30000); // Clear after 30 seconds
  };

  const handleDeleteAllClick = () => {
    if (tasks.length === 0) {
      alert('No tasks to delete for this week!');
      return;
    }
    setShowDeleteAllDialog(true);
  };

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const response = await taskApi.deleteByWeek(startDate);
      setShowDeleteAllDialog(false);
      alert(`Successfully deleted ${response.data.deleted_count} task(s)!`);
      loadWeekTasks();
    } catch (error: any) {
      console.error('Error deleting all tasks:', error);
      alert(error.response?.data?.detail || 'Failed to delete tasks. Please try again.');
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600">Loading week tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-semibold mb-2">Error loading tasks</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={loadWeekTasks}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            ← Previous Week
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            {tasks.length > 0 && (
              <button
                onClick={handleDeleteAllClick}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                title="Delete all tasks for this week"
              >
                <TrashIcon className="w-4 h-4" />
                Delete All
              </button>
            )}
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            Next Week →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays && Array.isArray(weekDays) && weekDays.length > 0 ? weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;

          return (
            <div
              key={index}
              className={`
                bg-white rounded-xl shadow-md p-4 min-h-[400px]
                ${isToday ? 'ring-2 ring-primary-500' : ''}
                ${isPast ? 'opacity-75' : ''}
              `}
            >
              <div className="text-center mb-4">
                <div className={`text-sm font-medium ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                  {format(day, 'EEE')}
                </div>
                <div
                  className={`
                    text-2xl font-bold mt-1
                    ${isToday ? 'text-primary-600' : 'text-gray-800'}
                  `}
                >
                  {format(day, 'd')}
                </div>
                {isToday && (
                  <div className="text-xs text-primary-500 mt-1">Today</div>
                )}
              </div>

              <div className="space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No tasks
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`
                        p-2 rounded-lg text-sm cursor-pointer transition-all
                        ${task.is_completed
                          ? 'bg-green-50 border border-green-200 line-through'
                          : 'bg-primary-50 border border-primary-200 hover:bg-primary-100'
                        }
                      `}
                      onClick={() => handleEdit(task)}
                    >
                      <div className="font-medium text-gray-800">{task.title}</div>
                      <div className="text-xs text-gray-600 mt-1">🕐 {task.scheduled_time}</div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            task.is_completed ? handleUncomplete(task.id) : handleComplete(task.id);
                          }}
                          className={`
                            text-xs px-2 py-1 rounded
                            ${task.is_completed
                              ? 'bg-green-200 text-green-800'
                              : 'bg-primary-200 text-primary-800'
                            }
                          `}
                        >
                          {task.is_completed ? '✓' : '○'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-200 text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setSelectedDate(format(day, 'yyyy-MM-dd'));
                    setEditingTask(null);
                    setIsFormOpen(true);
                  }}
                  className="w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-dashed border-primary-300"
                >
                  + Add Task
                </button>
                {dayTasks.length > 0 && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateClick(day, 'week');
                      }}
                      className="flex-1 py-1.5 text-xs bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                      title="Copy tasks to whole week"
                    >
                      <DocumentDuplicateIcon className="w-3 h-3" />
                      Week
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateClick(day, 'month');
                      }}
                      className="flex-1 py-1.5 text-xs bg-accent-100 text-accent-700 hover:bg-accent-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                      title="Copy tasks to whole month"
                    >
                      <DocumentDuplicateIcon className="w-3 h-3" />
                      Month
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="col-span-7 text-center py-8 text-gray-500">
            No days to display
          </div>
        )}
      </div>

      <TaskForm
        task={editingTask}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
          setSelectedDate('');
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
      />

      {showDuplicateDialog && duplicateSourceDate && duplicateType && (
        <ConfirmDialog
          isOpen={showDuplicateDialog}
          title={`Duplicate Tasks to ${duplicateType === 'week' ? 'Week' : 'Month'}`}
          message={`This will copy all tasks from ${format(new Date(duplicateSourceDate), 'MMMM d, yyyy')} to the next ${duplicateType === 'week' ? '6 days' : '30 days'}. Continue?`}
          confirmText={duplicating ? 'Duplicating...' : 'Duplicate'}
          cancelText="Cancel"
          onConfirm={handleDuplicateConfirm}
          onCancel={() => {
            setShowDuplicateDialog(false);
            setDuplicateType(null);
            setDuplicateSourceDate('');
          }}
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
        message={`Are you sure you want to delete all ${tasks.length} task(s) for this week (${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')})? This action cannot be undone.`}
        confirmText={deletingAll ? 'Deleting...' : 'Delete All'}
        cancelText="Cancel"
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default WeekView;


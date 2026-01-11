import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { Task, TaskCreate } from '../types';
import { taskApi } from '../services/api';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import RollbackBanner from '../components/RollbackBanner';
import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';

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

  useEffect(() => {
    loadMonthTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const loadMonthTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await taskApi.getMonth(year, month);
      setTasks(response.data || []);
    } catch (error: any) {
      console.error('Error loading month tasks:', error);
      setError(error.response?.data?.detail || 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: TaskCreate) => {
    try {
      await taskApi.create(taskData);
      loadMonthTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskData: TaskCreate) => {
    if (!editingTask) return;
    try {
      await taskApi.update(editingTask.id, taskData);
      loadMonthTasks();
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
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
        loadMonthTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.scheduled_date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const handleDuplicateClick = (date: Date, type: 'week' | 'month') => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = getTasksForDate(date);

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
      loadMonthTasks();
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
      loadMonthTasks();
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
      alert('No tasks to delete for this month!');
      return;
    }
    setShowDeleteAllDialog(true);
  };

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await taskApi.deleteByMonth(year, month);
      setShowDeleteAllDialog(false);
      alert(`Successfully deleted ${response.data.deleted_count} task(s)!`);
      loadMonthTasks();
    } catch (error: any) {
      console.error('Error deleting all tasks:', error);
      alert(error.response?.data?.detail || 'Failed to delete tasks. Please try again.');
    } finally {
      setDeletingAll(false);
    }
  };

  // Calculate month dates safely - must happen before early returns
  let monthStart: Date = new Date();
  let monthEnd: Date = new Date();
  let daysInMonth: Date[] = [];
  let adjustedFirstDay: number = 0;
  const today = new Date();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  try {
    if (currentMonth && currentMonth instanceof Date && !isNaN(currentMonth.getTime())) {
      monthStart = startOfMonth(currentMonth);
      monthEnd = endOfMonth(currentMonth);
      daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Get first day of week for the month start
      // getDay returns 0 (Sunday) to 6 (Saturday)
      // We want Monday (1) to be 0, so we adjust
      const firstDayOfWeek = getDay(monthStart);
      // Convert: Sunday (0) -> 6, Monday (1) -> 0, Tuesday (2) -> 1, etc.
      adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    } else {
      console.warn('Invalid currentMonth, using fallback');
      const fallbackDate = new Date();
      monthStart = startOfMonth(fallbackDate);
      monthEnd = endOfMonth(fallbackDate);
      daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      adjustedFirstDay = 0;
    }
  } catch (err) {
    console.error('Error calculating month dates:', err);
    // Fallback to current month if calculation fails
    try {
      const fallbackDate = new Date();
      monthStart = startOfMonth(fallbackDate);
      monthEnd = endOfMonth(fallbackDate);
      daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      adjustedFirstDay = 0;
    } catch (fallbackErr) {
      console.error('Fallback also failed:', fallbackErr);
      daysInMonth = [];
      adjustedFirstDay = 0;
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600">Loading month tasks...</p>
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
            onClick={loadMonthTasks}
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
            onClick={() => navigateMonth('prev')}
            className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            ← Previous Month
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            {tasks.length > 0 && (
              <button
                onClick={handleDeleteAllClick}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                title="Delete all tasks for this month"
              >
                <TrashIcon className="w-4 h-4" />
                Delete All
              </button>
            )}
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            Next Month →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month starts */}
          {adjustedFirstDay >= 0 && Array.from({ length: adjustedFirstDay }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square"></div>
          ))}

          {/* Days of the month */}
          {daysInMonth && daysInMonth.length > 0 ? daysInMonth.map((day, dayIndex) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, today);
            const taskCount = dayTasks.length;
            const completedCount = dayTasks.filter(t => t.is_completed).length;

            return (
              <div
                key={`day-${day.getTime()}-${dayIndex}`}
                className={`
                  aspect-square border-2 rounded-lg p-2 transition-all
                  ${isToday
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }
                  ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${isToday ? 'text-primary-700' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                </div>
                {taskCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <div className={`
                        w-2 h-2 rounded-full
                        ${completedCount === taskCount ? 'bg-green-500' : 'bg-primary-500'}
                      `}></div>
                      <span className="text-xs text-gray-600">
                        {completedCount}/{taskCount}
                      </span>
                    </div>
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(task);
                        }}
                        className={`
                          text-xs px-1 py-0.5 rounded truncate cursor-pointer
                          ${task.is_completed
                            ? 'bg-green-100 text-green-800 line-through'
                            : 'bg-primary-100 text-primary-800'
                          }
                        `}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {taskCount > 2 && (
                      <div className="text-xs text-gray-500">
                        +{taskCount - 2} more
                      </div>
                    )}
                  </div>
                )}
                {taskCount > 0 && isSameMonth(day, currentMonth) && (
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateClick(day, 'week');
                      }}
                      className="flex-1 py-1 text-[10px] bg-primary-100 text-primary-700 hover:bg-primary-200 rounded transition-colors"
                      title="Copy to week"
                    >
                      📅 Week
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateClick(day, 'month');
                      }}
                      className="flex-1 py-1 text-[10px] bg-accent-100 text-accent-700 hover:bg-accent-200 rounded transition-colors"
                      title="Copy to month"
                    >
                      📆 Month
                    </button>
                  </div>
                )}
                {isSameMonth(day, currentMonth) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(format(day, 'yyyy-MM-dd'));
                      setEditingTask(null);
                      setIsFormOpen(true);
                    }}
                    className="w-full mt-1 py-1 text-[10px] text-gray-600 hover:bg-gray-100 rounded transition-colors border border-dashed border-gray-300"
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          }) : (
            <div className="col-span-7 text-center py-8 text-gray-500">
              No days to display
            </div>
          )}
        </div>
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
        type={duplicateType || 'month'}
        rollingBack={rollingBack}
      />

      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        title="Delete All Tasks"
        message={`Are you sure you want to delete all ${tasks.length} task(s) for ${format(currentMonth, 'MMMM yyyy')}? This action cannot be undone.`}
        confirmText={deletingAll ? 'Deleting...' : 'Delete All'}
        cancelText="Cancel"
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default MonthView;


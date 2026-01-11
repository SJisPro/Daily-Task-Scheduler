import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Task, TaskCreate } from '../types';
import { taskApi } from '../services/api';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import RollbackBanner from '../components/RollbackBanner';
import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';

const DayView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateType, setDuplicateType] = useState<'week' | 'month' | null>(null);
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
    try {
      await taskApi.create(taskData);
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskData: TaskCreate) => {
    if (!editingTask) return;
    try {
      await taskApi.update(editingTask.id, taskData);
      loadTasks();
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await taskApi.complete(id);
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleUncomplete = async (id: number) => {
    try {
      await taskApi.uncomplete(id);
      loadTasks();
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
        loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleDuplicateClick = (type: 'week' | 'month') => {
    if (tasks.length === 0) {
      alert('No tasks to duplicate for this day!');
      return;
    }
    setDuplicateType(type);
    setShowDuplicateDialog(true);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateType) return;

    setDuplicating(true);
    try {
      const response = await taskApi.duplicateTasks(selectedDate, duplicateType);
      const createdTaskIds = response.data.map(task => task.id);
      setDuplicatedTaskIds(createdTaskIds);
      setShowDuplicateDialog(false);
      setDuplicateType(null);
      setShowRollbackBanner(true);
      // Optionally reload tasks
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
      alert(`Successfully rolled back ${duplicatedTaskIds.length} task(s)!`);
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
    // Clear IDs after a delay to allow rollback if user changes mind
    setTimeout(() => {
      setDuplicatedTaskIds([]);
    }, 30000); // Clear after 30 seconds
  };

  const handleDeleteAllClick = () => {
    if (tasks.length === 0) {
      alert('No tasks to delete for this day!');
      return;
    }
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

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.scheduled_time < b.scheduled_time) return -1;
    if (a.scheduled_time > b.scheduled_time) return 1;
    return 0;
  });

  const completedCount = tasks.filter(t => t.is_completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
          </h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => {
                setEditingTask(null);
                setIsFormOpen(true);
              }}
              className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-md hover:shadow-lg font-medium"
            >
              + New Task
            </button>
            {tasks.length > 0 && (
              <button
                onClick={handleDeleteAllClick}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                title="Delete all tasks for this day"
              >
                <TrashIcon className="w-4 h-4" />
                Delete All
              </button>
            )}
            {tasks.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleDuplicateClick('week')}
                  className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-all font-medium flex items-center gap-2"
                  title="Duplicate tasks to whole week"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  Copy to Week
                </button>
                <button
                  onClick={() => handleDuplicateClick('month')}
                  className="px-4 py-2 bg-accent-100 text-accent-700 rounded-lg hover:bg-accent-200 transition-all font-medium flex items-center gap-2"
                  title="Duplicate tasks to whole month"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  Copy to Month
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-600 font-medium">Completed</div>
            <div className="text-2xl font-bold text-green-700">{completedCount}</div>
          </div>
          <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-sm text-orange-600 font-medium">Pending</div>
            <div className="text-2xl font-bold text-orange-700">{pendingCount}</div>
          </div>
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-600 font-medium">Total</div>
            <div className="text-2xl font-bold text-blue-700">{tasks.length}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No tasks for this day</h3>
          <p className="text-gray-500">Create your first task to get started!</p>
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

      <TaskForm
        task={editingTask}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        initialDate={selectedDate}
      />

      {showDuplicateDialog && duplicateType && (
        <ConfirmDialog
          isOpen={showDuplicateDialog}
          title={`Duplicate Tasks to ${duplicateType === 'week' ? 'Week' : 'Month'}`}
          message={`This will copy all ${tasks.length} task(s) from ${format(new Date(selectedDate), 'MMMM d, yyyy')} to ${duplicateType === 'week' ? 'all 7 days of the week' : 'all days of the month'}. Continue?`}
          confirmText={duplicating ? 'Duplicating...' : 'Duplicate'}
          cancelText="Cancel"
          onConfirm={handleDuplicateConfirm}
          onCancel={() => {
            setShowDuplicateDialog(false);
            setDuplicateType(null);
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
        message={`Are you sure you want to delete all ${tasks.length} task(s) for ${format(new Date(selectedDate), 'MMMM d, yyyy')}? This action cannot be undone.`}
        confirmText={deletingAll ? 'Deleting...' : 'Delete All'}
        cancelText="Cancel"
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default DayView;


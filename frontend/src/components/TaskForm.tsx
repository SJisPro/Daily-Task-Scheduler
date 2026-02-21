import React, { useState, useEffect } from 'react';
import { Task, TaskCreate } from '../types';
import { XMarkIcon, CalendarDaysIcon, ClockIcon, DocumentTextIcon, TagIcon } from '@heroicons/react/24/outline';

interface TaskFormProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: TaskCreate) => void;
  initialDate?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, isOpen, onClose, onSubmit, initialDate }) => {
  const [formData, setFormData] = useState<TaskCreate>({
    title: '',
    description: '',
    scheduled_date: initialDate || new Date().toISOString().split('T')[0],
    scheduled_time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        scheduled_date: task.scheduled_date,
        scheduled_time: task.scheduled_time,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        scheduled_date: initialDate || new Date().toISOString().split('T')[0],
        scheduled_time: new Date().toTimeString().slice(0, 5),
      });
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onSubmit(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md animate-slide-up rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(51,65,85,0.7)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 40px rgba(20,184,166,0.1)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(20,184,166,0.3)' }}>
                <TagIcon className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {task ? 'Edit Task' : 'New Task'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {task ? 'Update your task details' : 'Schedule a new task'}
                </p>
              </div>
            </div>
            <button
              id="task-form-close"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="label" htmlFor="task-title">Task Title</label>
            <input
              id="task-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="task-description">
              <span className="flex items-center gap-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5" />
                Description <span className="normal-case font-normal text-slate-600">(optional)</span>
              </span>
            </label>
            <textarea
              id="task-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field resize-none"
              rows={3}
              placeholder="Add more details..."
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="task-date">
                <span className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  Date
                </span>
              </label>
              <input
                id="task-date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="task-time">
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5" />
                  Time
                </span>
              </label>
              <input
                id="task-time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-2">
            <button
              id="task-form-cancel"
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              id="task-form-submit"
              type="submit"
              className="btn-primary flex-1"
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;

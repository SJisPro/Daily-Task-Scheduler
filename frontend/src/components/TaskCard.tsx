import React, { useState } from 'react';
import { Task } from '../types';
import {
  CheckIcon, PencilSquareIcon, TrashIcon,
  ClockIcon, CalendarDaysIcon, ExclamationCircleIcon, BellIcon,
} from '@heroicons/react/24/outline';
import ReminderPanel from './ReminderPanel';

interface TaskCardProps {
  task: Task;
  onComplete: (id: number) => void;
  onUncomplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onUncomplete, onEdit, onDelete }) => {
  const [reminderOpen, setReminderOpen] = useState(false);

  const isOverdue = !task.is_completed &&
    new Date(`${task.scheduled_date}T${task.scheduled_time}`) < new Date();

  const statusColor = task.is_completed
    ? 'rgba(34,197,94,0.18)'
    : isOverdue
      ? 'rgba(239,68,68,0.18)'
      : 'rgba(20,184,166,0.18)';

  const borderColor = task.is_completed
    ? 'rgba(34,197,94,0.4)'
    : isOverdue
      ? 'rgba(239,68,68,0.4)'
      : 'rgba(20,184,166,0.35)';

  const accentLine = task.is_completed
    ? '#22c55e'
    : isOverdue
      ? '#ef4444'
      : '#14b8a6';

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300 group animate-fade-in"
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${borderColor}`,
          boxShadow: `0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${statusColor}, inset 0 1px 0 rgba(255,255,255,0.07)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`;
        }}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accentLine }} />

        <div className="flex items-start justify-between p-4 pl-5">
          {/* Main content */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Complete toggle */}
            <button
              id={`task-complete-${task.id}`}
              onClick={() => task.is_completed ? onUncomplete(task.id) : onComplete(task.id)}
              className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 mt-0.5"
              style={task.is_completed
                ? { background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderColor: '#22c55e', boxShadow: '0 0 12px rgba(34,197,94,0.5)' }
                : { borderColor: accentLine, background: 'transparent' }
              }
            >
              {task.is_completed && <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />}
            </button>

            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-base leading-tight transition-all duration-200 ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-100'}`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2">{task.description}</p>
              )}

              <div className="flex items-center flex-wrap gap-3 mt-2.5">
                <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  {task.scheduled_date}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {task.scheduled_time}
                </span>
                {task.is_completed ? (
                  <span className="flex items-center gap-1 badge-green text-[11px]">
                    <CheckIcon className="w-3 h-3" /> Completed
                  </span>
                ) : task.is_missed ? (
                  <span className="flex items-center gap-1 badge-red text-[11px]">
                    <ExclamationCircleIcon className="w-3 h-3" /> Missed
                  </span>
                ) : isOverdue ? (
                  <span className="badge-amber text-[11px]">Overdue</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action buttons — always visible on touch devices, hover-reveal on desktop */}
          <div className="flex gap-1 ml-2 sm:ml-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            {/* Bell – opens reminder panel */}
            <button
              id={`task-reminder-${task.id}`}
              onClick={() => setReminderOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-primary-400 active:text-primary-400 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="Manage reminders"
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.12)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'}
            >
              <BellIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              id={`task-edit-${task.id}`}
              onClick={() => onEdit(task)}
              className="p-2 rounded-xl text-slate-400 hover:text-primary-400 active:text-primary-400 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="Edit task"
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.12)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'}
            >
              <PencilSquareIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              id={`task-delete-${task.id}`}
              onClick={() => onDelete(task.id)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 active:text-red-400 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="Delete task"
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'}
            >
              <TrashIcon className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Reminder Panel modal */}
      <ReminderPanel
        taskId={task.id}
        taskTitle={task.title}
        isOpen={reminderOpen}
        onClose={() => setReminderOpen(false)}
      />
    </>
  );
};

export default TaskCard;

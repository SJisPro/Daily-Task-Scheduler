import React from 'react';
import { Task } from '../types';
import { CheckIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface TaskCardProps {
  task: Task;
  onComplete: (id: number) => void;
  onUncomplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onUncomplete, onEdit, onDelete }) => {
  const isOverdue = !task.is_completed &&
    new Date(`${task.scheduled_date}T${task.scheduled_time}`) < new Date();

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md p-4 mb-3 transition-all duration-200
        ${task.is_completed ? 'opacity-60 border-l-4 border-green-500' : ''}
        ${isOverdue ? 'border-l-4 border-red-500 bg-red-50' : ''}
        ${!task.is_completed && !isOverdue ? 'border-l-4 border-primary-500' : ''}
        hover:shadow-lg hover:scale-[1.02]
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => task.is_completed ? onUncomplete(task.id) : onComplete(task.id)}
              className={`
                flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                transition-all duration-200
                ${task.is_completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-primary-400 hover:border-primary-600'
                }
              `}
            >
              {task.is_completed && (
                <CheckIcon className="w-4 h-4 text-white" />
              )}
            </button>
            <div className="flex-1">
              <h3
                className={`
                  font-semibold text-lg
                  ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-800'}
                `}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>📅 {task.scheduled_date}</span>
                <span>🕐 {task.scheduled_time}</span>
                {task.is_completed ? (
                  <span className="text-green-600">✓ Completed</span>
                ) : task.is_missed ? (
                  <span className="text-red-600 font-medium">⚠ Missed</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
            title="Edit task"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete task"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;


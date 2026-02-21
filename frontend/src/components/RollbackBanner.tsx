import React from 'react';
import { ArrowUturnLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CopyTargetType } from '../types';

interface RollbackBannerProps {
  isVisible: boolean;
  taskCount: number;
  onRollback: () => void;
  onDismiss: () => void;
  type: CopyTargetType;
  rollingBack?: boolean;
}

const RollbackBanner: React.FC<RollbackBannerProps> = ({
  isVisible,
  taskCount,
  onRollback,
  onDismiss,
  type,
  rollingBack = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-primary-500 p-4 max-w-md mx-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <ArrowUturnLeftIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-1">
              Tasks Duplicated Successfully!
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {taskCount} task{taskCount !== 1 ? 's' : ''} copied to{' '}
              {type === 'weekdays' ? 'weekdays (Mon–Fri)'
                : type === 'weekend' ? 'the weekend (Sat–Sun)'
                  : type === 'week' ? 'the whole week'
                    : 'the month'}.
              {' '}Want to undo?
            </p>
            <div className="flex gap-2">
              <button
                onClick={onRollback}
                disabled={rollingBack}
                className={`flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${rollingBack ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
                  }`}
              >
                {rollingBack ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Rolling back...
                  </>
                ) : (
                  <>
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    Undo
                  </>
                )}
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RollbackBanner;


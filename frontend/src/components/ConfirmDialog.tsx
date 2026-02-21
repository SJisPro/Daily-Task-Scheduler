import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning',
}) => {
  if (!isOpen) return null;

  const configs = {
    warning: {
      iconBg: 'rgba(245,158,11,0.15)',
      iconBorder: 'rgba(245,158,11,0.3)',
      iconColor: '#fbbf24',
      Icon: ExclamationTriangleIcon,
      btnStyle: { background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 14px rgba(245,158,11,0.4)' },
      glow: 'rgba(245,158,11,0.08)',
    },
    danger: {
      iconBg: 'rgba(239,68,68,0.15)',
      iconBorder: 'rgba(239,68,68,0.3)',
      iconColor: '#f87171',
      Icon: ExclamationTriangleIcon,
      btnStyle: { background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' },
      glow: 'rgba(239,68,68,0.08)',
    },
    info: {
      iconBg: 'rgba(20,184,166,0.15)',
      iconBorder: 'rgba(20,184,166,0.3)',
      iconColor: '#2dd4bf',
      Icon: InformationCircleIcon,
      btnStyle: { background: 'linear-gradient(135deg,#14b8a6,#0d9488)', boxShadow: '0 4px 14px rgba(20,184,166,0.4)' },
      glow: 'rgba(20,184,166,0.08)',
    },
  };

  const cfg = configs[type];
  const { Icon } = cfg;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm animate-scale-in rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(15,23,42,0.96)',
          border: '1px solid rgba(51,65,85,0.7)',
          boxShadow: `0 25px 80px rgba(0,0,0,0.7), 0 0 60px ${cfg.glow}`,
        }}
      >
        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: cfg.iconBg, border: `1px solid ${cfg.iconBorder}` }}
            >
              <Icon className="w-6 h-6" style={{ color: cfg.iconColor }} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-100 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
            </div>

            {/* Close */}
            <button
              id="confirm-dialog-close"
              onClick={onCancel}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              id="confirm-dialog-cancel"
              onClick={onCancel}
              className="btn-secondary flex-1"
            >
              {cancelText}
            </button>
            <button
              id="confirm-dialog-confirm"
              onClick={onConfirm}
              className="flex-1 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
              style={cfg.btnStyle}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

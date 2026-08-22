'use client';

import { useEffect } from 'react';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
  duration?: number;
}

// Shared success/error notification — replaces window.alert() so feedback
// doesn't block the page, and looks the same across every admin page.
export default function Toast({ toast, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-[70] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-lg shadow-lg border px-4 py-3 ${
          isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
        }`}
      >
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

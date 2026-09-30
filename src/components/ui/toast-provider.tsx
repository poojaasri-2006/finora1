'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: Toast['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-sm w-full bg-white rounded-lg shadow-lg border p-4 flex items-start gap-3 animate-slide-in ${
              toast.type === 'success'
                ? 'border-green-200'
                : toast.type === 'error'
                ? 'border-red-200'
                : toast.type === 'warning'
                ? 'border-yellow-200'
                : 'border-blue-200'
            }`}
          >
            <span className="text-lg">
              {toast.type === 'success'
                ? '✓'
                : toast.type === 'error'
                ? '✕'
                : toast.type === 'warning'
                ? '⚠'
                : 'ℹ'}
            </span>
            <div className="flex-1">
              <p className="font-medium text-slate-900 text-sm">{toast.title}</p>
              {toast.message && (
                <p className="text-slate-600 text-sm mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

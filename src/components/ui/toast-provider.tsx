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
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                toast.type === 'success'
                  ? 'bg-green-500'
                  : toast.type === 'error'
                  ? 'bg-red-500'
                  : toast.type === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
            />
            <div className="flex-1">
              <p className="font-medium text-slate-900 text-sm">{toast.title}</p>
              {toast.message && (
                <p className="text-slate-600 text-sm mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className="text-slate-400 hover:text-slate-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
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

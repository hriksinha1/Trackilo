import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toast = {
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('error', title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
    info: (title: string, message?: string) => addToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            const icons = {
              success: <CheckCircle2 className="text-[#2F7D5A] shrink-0" size={18} />,
              warning: <AlertTriangle className="text-[#B7791F] shrink-0" size={18} />,
              error: <AlertCircle className="text-[#B84A4A] shrink-0" size={18} />,
              info: <Info className="text-[#3478A6] shrink-0" size={18} />,
            };

            const borders = {
              success: 'border-[#BDE4CD] bg-white',
              warning: 'border-[#F6DBA9] bg-white',
              error: 'border-[#F7C5C5] bg-white',
              info: 'border-[#C1DFFA] bg-white',
            };

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${borders[t.type]}`}
              >
                {icons[t.type]}
                <div className="flex-1 text-sm min-w-0">
                  <div className="font-semibold text-[#18312F] leading-tight">{t.title}</div>
                  {t.message && <div className="text-xs text-[#5F716E] mt-1 leading-relaxed">{t.message}</div>}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-stone-400 hover:text-stone-600 transition-colors p-0.5 rounded-md"
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      toast: {
        success: (t: string) => console.log('Toast:', t),
        error: (t: string) => console.error('Toast:', t),
        warning: (t: string) => console.warn('Toast:', t),
        info: (t: string) => console.info('Toast:', t),
      }
    };
  }
  return context;
}

"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { CheckCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastVariant = "success" | "info" | "warning";

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 3000);
    return () => clearTimeout(timer);
  }, [t.id, onDismiss]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-accent-green" />,
    info: <Info className="w-4 h-4 text-accent-blue" />,
    warning: <AlertTriangle className="w-4 h-4 text-accent-orange" />,
  };

  const bgColors = {
    success: "border-accent-green/20 bg-accent-green/5",
    info: "border-accent-blue/20 bg-accent-blue/5",
    warning: "border-accent-orange/20 bg-accent-orange/5",
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg bg-white ${bgColors[t.variant]} animate-slide-up`}>
      {icons[t.variant]}
      <span className="text-sm text-surface-800 flex-1">{t.message}</span>
      <button onClick={() => onDismiss(t.id)} className="text-surface-400 hover:text-surface-600">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

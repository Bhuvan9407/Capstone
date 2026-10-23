import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastCtx = createContext(null);
let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message, kind = 'success', detail = '') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind, detail }]);
    setTimeout(() => dismiss(id), 5200);
  }, [dismiss]);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(92vw,26rem)]" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 shadow-pop text-sm text-white flex items-start gap-2 ${
              t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-rose-600' : t.kind === 'warn' ? 'bg-amber-500' : 'bg-navy'
            }`}
          >
            <span className="flex-1">
              {t.message}
              {t.detail ? <span className="block text-white/80 mt-0.5">{t.detail}</span> : null}
            </span>
            <button onClick={() => dismiss(t.id)} className="text-white/80 hover:text-white" aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);

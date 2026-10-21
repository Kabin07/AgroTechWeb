import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useI18n } from "../i18n";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const { t } = useI18n();

  const show = useCallback((msg, type = "success") => {
    clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Turns backend error codes into a translated message.
  const showError = useCallback(
    (err) => {
      const code = err?.code;
      const key = code && code !== "unknown" ? `err_${code}` : null;
      const text = key ? t(key) : null;
      show(text && text !== key ? text : err?.message || t("somethingWrong"), "error");
    },
    [show, t]
  );

  return (
    <ToastContext.Provider value={{ show, showError }}>
      {children}
      {toast && (
        <div className={`app-toast ${toast.type}`} role="status" aria-live="polite">
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

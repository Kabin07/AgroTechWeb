// Small shared UI pieces used across pages.
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useI18n } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import { CROPS, cropName } from "../../data/crops";
import { speak, speechOutputSupported, stopSpeaking, useSpeechRecognition } from "../../hooks/useSpeech";
import { useToast } from "../../context/ToastContext";

export function VoiceButton({ onResult, className = "", title }) {
  const { t, speechLang } = useI18n();
  const toast = useToast();
  const { supported, listening, start, stop } = useSpeechRecognition({ lang: speechLang, onResult });
  return (
    <button
      type="button"
      className={`icon-btn ${listening ? "listening" : ""} ${className}`}
      onClick={() => {
        if (!supported) return toast.show(t("voiceNotSupported"), "error");
        return listening ? stop() : start();
      }}
      title={title || t("speak")}
      aria-label={title || t("speak")}
      aria-pressed={listening}
    >
      {listening ? "⏹" : "🎤"}
    </button>
  );
}

export function SpeakButton({ text, label, className = "" }) {
  const { t, speechLang } = useI18n();
  const [speaking, setSpeaking] = React.useState(false);
  if (!speechOutputSupported()) return null;
  return (
    <button
      type="button"
      className={`btn-app btn-secondary-app btn-sm ${className}`}
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
        } else {
          setSpeaking(true);
          speak(text, speechLang, { onEnd: () => setSpeaking(false) });
        }
      }}
    >
      {speaking ? "⏹" : "🔊"} {label || t("listen")}
    </button>
  );
}

export function CropPicker({ value, onChange, crops = CROPS }) {
  const { lang } = useI18n();
  return (
    <div className="crop-grid" role="radiogroup">
      {crops.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          className={`crop-tile ${value === c.id ? "selected" : ""}`}
          onClick={() => onChange(c.id)}
        >
          <span className="emoji" aria-hidden>{c.emoji}</span>
          {cropName(c.id, lang)}
        </button>
      ))}
    </div>
  );
}

export function CropSelect({ value, onChange, id }) {
  const { t, lang } = useI18n();
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("selectCrop")}</option>
      {CROPS.map((c) => (
        <option key={c.id} value={c.id}>
          {c.emoji} {cropName(c.id, lang)}
        </option>
      ))}
    </select>
  );
}

const STATUS_STYLE = {
  available: ["#166534", "#dcfce7", "🟢"],
  open: ["#166534", "#dcfce7", "🟢"],
  pending: ["#1d4ed8", "#dbeafe", "⏳"],
  requested: ["#1d4ed8", "#dbeafe", "📋"],
  accepted: ["#92400e", "#fef3c7", "🤝"],
  assigned: ["#92400e", "#fef3c7", "🚚"],
  in_transit: ["#b45309", "#ffedd5", "🚚"],
  delivered: ["#15803d", "#dcfce7", "✅"],
  sold: ["#374151", "#e5e7eb", "✔️"],
  closed: ["#374151", "#e5e7eb", "✔️"],
  withdrawn: ["#374151", "#e5e7eb", "⏸"],
  cancelled: ["#dc2626", "#fee2e2", "✖"],
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  const [color, bg, icon] = STATUS_STYLE[status] || ["#374151", "#e5e7eb", "•"];
  return (
    <span className="status-badge" style={{ color, background: bg }}>
      {icon} {t(`status_${status}`)}
    </span>
  );
}

export function EmptyState({ emoji = "🌱", text }) {
  return (
    <div className="empty-state">
      <span className="emoji" aria-hidden>{emoji}</span>
      {text}
    </div>
  );
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  if (loading) return <div className="container-narrow page muted">{t("loading")}</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

export function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <div className="small muted mt-2">{hint}</div>}
    </div>
  );
}

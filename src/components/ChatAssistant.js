// Floating chat + voice assistant ("Krishi Sahayak"), available on every page.
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { askAssistant } from "../services/assistant";
import { speak, speechOutputSupported, stopSpeaking, useSpeechRecognition } from "../hooks/useSpeech";
import PredictionCard from "./PredictionCard";

const AUTO_SPEAK_KEY = "agrotech.autoSpeak";

export default function ChatAssistant() {
  const { t, lang, speechLang } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return window.localStorage.getItem(AUTO_SPEAK_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Other parts of the app can open the assistant: window.dispatchEvent(new Event("agrotech:assistant"))
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("agrotech:assistant", openIt);
    return () => window.removeEventListener("agrotech:assistant", openIt);
  }, []);

  async function send(text) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: "user", text: clean }]);
    setBusy(true);
    try {
      const res = await askAssistant({ text: clean, lang, history, state: user?.state || "", page: location.pathname });
      setMessages((m) => [...m, { role: "assistant", ...res }]);
      if (autoSpeak) speak(res.text, speechLang);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: t("somethingWrong") }]);
    } finally {
      setBusy(false);
    }
  }

  const voice = useSpeechRecognition({ lang: speechLang, onResult: (text) => send(text) });

  function toggleAutoSpeak() {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (!next) stopSpeaking();
    try {
      window.localStorage.setItem(AUTO_SPEAK_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
  }

  if (!open) {
    return (
      <button className="assistant-fab" onClick={() => setOpen(true)} aria-label={t("assistantTitle")}>
        <span className="emoji" aria-hidden>🎤</span>
        <span className="label">{t("homeAskAssistant")}</span>
      </button>
    );
  }

  const suggestions = [t("assistantSuggestion1"), t("assistantSuggestion2"), t("assistantSuggestion3")];

  return (
    <section className="assistant-panel" aria-label={t("assistantTitle")}>
      <div className="assistant-head">
        <span style={{ fontSize: 28 }} aria-hidden>🧑‍🌾</span>
        <div style={{ flex: 1 }}>
          <h3>{t("assistantTitle")}</h3>
          <small>{t("assistantSubtitle")}</small>
        </div>
        {speechOutputSupported() && (
          <button onClick={toggleAutoSpeak} title={t("assistantAutoSpeak")} aria-pressed={autoSpeak} aria-label={t("assistantAutoSpeak")}>
            {autoSpeak ? "🔊" : "🔇"}
          </button>
        )}
        <button
          onClick={() => {
            stopSpeaking();
            voice.stop();
            setOpen(false);
          }}
          aria-label={t("close")}
        >
          ✕
        </button>
      </div>

      <div className="assistant-msgs" ref={listRef}>
        <div className="bubble assistant">{t("assistantWelcome")}</div>
        {messages.length === 0 && (
          <div className="bubble-actions">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
            {m.prediction && (
              <div className="mt-3" style={{ whiteSpace: "normal" }}>
                <PredictionCard prediction={m.prediction} compact />
              </div>
            )}
            {m.role === "assistant" && (
              <div className="bubble-actions">
                {m.action && (
                  <Link className="chip" to={m.action.to} onClick={() => setOpen(window.innerWidth > 640)}>
                    ➜ {t(m.action.labelKey)}
                  </Link>
                )}
                {speechOutputSupported() && (
                  <button className="chip" onClick={() => speak(m.text, speechLang)}>🔊 {t("listen")}</button>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">{t("assistantThinking")}</div>}
      </div>

      {voice.listening && <div className="listening-hint">🎙️ {voice.interim || t("assistantListening")}</div>}
      {voice.error && voice.error !== "no-speech" && voice.error !== "aborted" && (
        <div className="listening-hint">{voice.error === "unsupported" ? t("voiceNotSupported") : t("voiceError")}</div>
      )}

      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <button
          type="button"
          className={`icon-btn assistant-mic-big ${voice.listening ? "listening" : ""}`}
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
          aria-label={t("speak")}
        >
          {voice.listening ? "⏹" : "🎤"}
        </button>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("assistantPlaceholder")}
          aria-label={t("assistantPlaceholder")}
        />
        <button type="submit" className="icon-btn" disabled={!input.trim() || busy} aria-label={t("submit")}>➤</button>
      </form>
    </section>
  );
}

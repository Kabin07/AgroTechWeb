// Shown on the first visit so people can pick their language before reading anything.
import React, { useState } from "react";
import { hasChosenLanguage, LANGUAGES, useI18n } from "../i18n";

export default function LanguagePicker() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(() => !hasChosenLanguage());
  if (!open) return null;
  return (
    <div className="modal-backdrop-app" role="dialog" aria-modal="true" aria-labelledby="lang-title">
      <div className="modal-app">
        <h2 id="lang-title" style={{ textAlign: "center" }}>🌐 {t("chooseLanguage")}</h2>
        <p className="muted" style={{ textAlign: "center" }}>Choose language · भाषा चुनें · மொழி · భాష · ಭಾಷೆ · ഭാഷ · भाषा · ভাষা</p>
        <div className="lang-grid">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-tile ${lang === l.code ? "selected" : ""}`}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
            >
              {l.native}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

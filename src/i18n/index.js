import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./translations/en";
import hi from "./translations/hi";
import ta from "./translations/ta";
import te from "./translations/te";
import kn from "./translations/kn";
import ml from "./translations/ml";
import mr from "./translations/mr";
import bn from "./translations/bn";

// speech: BCP-47 tag used for voice input (SpeechRecognition) and read-aloud (speechSynthesis).
export const LANGUAGES = [
  { code: "en", native: "English", speech: "en-IN" },
  { code: "hi", native: "हिन्दी", speech: "hi-IN" },
  { code: "ta", native: "தமிழ்", speech: "ta-IN" },
  { code: "te", native: "తెలుగు", speech: "te-IN" },
  { code: "kn", native: "ಕನ್ನಡ", speech: "kn-IN" },
  { code: "ml", native: "മലയാളം", speech: "ml-IN" },
  { code: "mr", native: "मराठी", speech: "mr-IN" },
  { code: "bn", native: "বাংলা", speech: "bn-IN" },
];

export const DICTIONARIES = { en, hi, ta, te, kn, ml, mr, bn };

const STORAGE_KEY = "agrotech.lang";

function initialLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && DICTIONARIES[saved]) return saved;
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en").slice(0, 2);
  return DICTIONARIES[nav] ? nav : "en";
}

export function hasChosenLanguage() {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return true;
  }
}

export function translate(lang, key, params) {
  const dict = DICTIONARIES[lang] || en;
  let text = dict[key] ?? en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.split(`{${k}}`).join(v == null ? "" : String(v));
    });
  }
  return text;
}

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  const setLang = useCallback((code) => {
    if (!DICTIONARIES[code]) return;
    setLangState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
    return {
      lang,
      setLang,
      speechLang: meta.speech,
      t: (key, params) => translate(lang, key, params),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

// ₹ amounts with Indian digit grouping (1,23,456).
export function formatINR(amount, { decimals } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const d = decimals ?? (n < 100 && n % 1 !== 0 ? 2 : 0);
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";
}

export function formatDate(value, lang = "en") {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(`${lang}-IN`, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(value).slice(0, 10);
  }
}

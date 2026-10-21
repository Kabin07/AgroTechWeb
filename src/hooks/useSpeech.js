// Voice input (speech-to-text) and read-aloud (text-to-speech) using the browser's
// built-in Web Speech API. No server or API key needed.
// Support: Chrome / Edge / Android Chrome have both. Safari has read-aloud and partial
// voice input. Firefox has read-aloud only. We feature-detect and hide buttons otherwise.

import { useCallback, useEffect, useRef, useState } from "react";

function getRecognitionClass() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export const speechInputSupported = () => Boolean(getRecognitionClass());
export const speechOutputSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function useSpeechRecognition({ lang, onResult }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => () => recRef.current?.abort(), []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionClass();
    if (!Recognition) {
      setError("unsupported");
      return;
    }
    recRef.current?.abort();
    stopSpeaking();
    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      setListening(true);
      setError(null);
      setInterim("");
    };
    rec.onresult = (event) => {
      let finalText = "";
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else partial += text;
      }
      setInterim(partial);
      if (finalText.trim()) onResultRef.current?.(finalText.trim());
    };
    rec.onerror = (event) => setError(event.error || "error");
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError("error");
    }
  }, [lang]);

  return { supported: speechInputSupported(), listening, interim, error, start, stop };
}

let voicesCache = [];
function loadVoices() {
  if (!speechOutputSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) voicesCache = voices;
  return voicesCache;
}
if (speechOutputSupported()) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function hasVoiceFor(speechLang) {
  const base = speechLang.slice(0, 2);
  return loadVoices().some((v) => v.lang?.toLowerCase().startsWith(base));
}

export function speak(text, speechLang, { onEnd } = {}) {
  if (!speechOutputSupported() || !text) return false;
  window.speechSynthesis.cancel();
  // Emojis and symbols sound odd when read aloud.
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/₹\s?/g, "₹ ");
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = speechLang;
  const base = speechLang.slice(0, 2);
  const voices = loadVoices();
  const voice =
    voices.find((v) => v.lang?.toLowerCase() === speechLang.toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(base));
  if (voice) utterance.voice = voice;
  utterance.rate = 0.92; // slightly slower is easier to follow
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (speechOutputSupported()) window.speechSynthesis.cancel();
}

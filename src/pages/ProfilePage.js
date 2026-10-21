import React, { useState } from "react";
import { LANGUAGES, translate, useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { STATES } from "../data/crops";
import { Field, VoiceButton } from "../components/common";

const ROLES = [
  { id: "farmer", emoji: "👨‍🌾" },
  { id: "buyer", emoji: "🛒" },
  { id: "transporter", emoji: "🚚" },
];

export default function ProfilePage() {
  const { t, setLang } = useI18n();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    role: user.role || "farmer",
    preferred_language: user.preferred_language || "en",
    state: user.state || "",
    district: user.district || "",
    village: user.village || "",
    phone: user.phone || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.show(t("required"), "error");
    setBusy(true);
    try {
      await updateProfile({ ...form, full_name: form.full_name.trim() });
      setLang(form.preferred_language);
      toast.show(translate(form.preferred_language, "profileSaved"));
    } catch (err) {
      toast.showError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-narrow page" style={{ maxWidth: 560 }}>
      <form className="card-app" onSubmit={save}>
        <h2>👤 {t("profileTitle")}</h2>
        <p className="muted small">{t("profileSubtitle")}</p>

        <Field label={t("authFullName")} htmlFor="pf-name">
          <div className="input-with-mic">
            <input id="pf-name" className="input" value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} />
            <VoiceButton onResult={set("full_name")} />
          </div>
        </Field>

        <Field label={t("authWhoAreYou")}>
          <div className="role-grid">
            {ROLES.map((r) => (
              <button key={r.id} type="button" className={`role-tile ${form.role === r.id ? "selected" : ""}`} onClick={() => set("role")(r.id)} aria-pressed={form.role === r.id}>
                <span className="emoji" aria-hidden>{r.emoji}</span>
                {t(r.id)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("chooseLanguage")} htmlFor="pf-lang">
          <select id="pf-lang" className="select" value={form.preferred_language} onChange={(e) => set("preferred_language")(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
          </select>
        </Field>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label={t("state")} htmlFor="pf-state">
            <select id="pf-state" className="select" value={form.state} onChange={(e) => set("state")(e.target.value)}>
              <option value="">—</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label={t("district")} htmlFor="pf-district">
            <input id="pf-district" className="input" value={form.district} onChange={(e) => set("district")(e.target.value)} />
          </Field>
        </div>
        <Field label={t("village")} htmlFor="pf-village">
          <input id="pf-village" className="input" value={form.village} onChange={(e) => set("village")(e.target.value)} />
        </Field>
        <Field label={t("authPhone")} htmlFor="pf-phone" hint={t("profilePhoneHint")}>
          <input id="pf-phone" className="input" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
        </Field>

        <button className="btn-app btn-primary-app btn-block" disabled={busy}>{busy ? t("loading") : `💾 ${t("save")}`}</button>
      </form>
    </div>
  );
}

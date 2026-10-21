import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { backend } from "../services/backend";
import { STATES } from "../data/crops";
import { Field, VoiceButton } from "../components/common";

const ROLES = [
  { id: "farmer", emoji: "👨‍🌾" },
  { id: "buyer", emoji: "🛒" },
  { id: "transporter", emoji: "🚚" },
];

const HOME_FOR_ROLE = { farmer: "/farmer", buyer: "/buyer", transporter: "/transport" };

// Indian numbers: accept 10 digits and add +91 (Supabase needs E.164 format).
function toE164(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export default function AuthPage() {
  const { t, lang } = useI18n();
  const { user, mode } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [isRegister, setIsRegister] = useState(true);
  const [method, setMethod] = useState("phone"); // phone | email (Supabase mode only)
  const [role, setRole] = useState("farmer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from || HOME_FOR_ROLE[user.role] || "/"} replace />;

  const profile = { fullName: fullName.trim(), role, state, district, language: lang };

  async function handle(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.showError(e);
    } finally {
      setBusy(false);
    }
  }

  function needs(...values) {
    if (values.some((v) => !String(v || "").trim())) {
      toast.show(t("required"), "error");
      return false;
    }
    return true;
  }

  const submitDemo = () =>
    needs(fullName) &&
    handle(async () => {
      await backend.demoLogin({ ...profile, phone });
      navigate(from || HOME_FOR_ROLE[role]);
    });

  const submitEmail = () =>
    handle(async () => {
      if (isRegister) {
        if (!needs(fullName, email, password)) return;
        const { needsConfirmation } = await backend.signUpWithEmail({ ...profile, email, password, phone });
        if (needsConfirmation) {
          toast.show(t("authCheckEmail"));
          setIsRegister(false);
        }
      } else {
        if (!needs(email, password)) return;
        await backend.signInWithEmail({ email, password });
      }
    });

  const submitPhone = () =>
    handle(async () => {
      if (!otpSent) {
        if (!needs(phone) || (isRegister && !needs(fullName))) return;
        await backend.sendOtp({ ...profile, phone: toE164(phone) });
        setOtpSent(true);
        toast.show(t("authOtpSent", { phone: toE164(phone) }));
      } else {
        if (!needs(otp)) return;
        await backend.verifyOtp({ phone: toE164(phone), token: otp.trim() });
      }
    });

  const onSubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "local") submitDemo();
    else if (method === "email") submitEmail();
    else submitPhone();
  };

  const showProfileFields = mode === "local" || isRegister;

  return (
    <div className="container-narrow page" style={{ maxWidth: 520 }}>
      <form className="card-app" onSubmit={onSubmit}>
        <h2>{t("authTitle")}</h2>
        {mode === "local" ? (
          <p className="muted small">🧪 {t("authDemoNote")}</p>
        ) : (
          <>
            <div className="segmented mb-3">
              <button type="button" className={isRegister ? "active" : ""} onClick={() => setIsRegister(true)}>{t("authRegister")}</button>
              <button type="button" className={!isRegister ? "active" : ""} onClick={() => setIsRegister(false)}>{t("authLogin")}</button>
            </div>
            <div className="segmented mb-3">
              <button type="button" className={method === "phone" ? "active" : ""} onClick={() => setMethod("phone")}>📱 {t("authUsePhone")}</button>
              <button type="button" className={method === "email" ? "active" : ""} onClick={() => setMethod("email")}>✉️ {t("authUseEmail")}</button>
            </div>
          </>
        )}

        {showProfileFields && (
          <>
            <Field label={t("authWhoAreYou")}>
              <div className="role-grid">
                {ROLES.map((r) => (
                  <button key={r.id} type="button" className={`role-tile ${role === r.id ? "selected" : ""}`} onClick={() => setRole(r.id)} aria-pressed={role === r.id}>
                    <span className="emoji" aria-hidden>{r.emoji}</span>
                    {t(r.id)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("authFullName")} htmlFor="name">
              <div className="input-with-mic">
                <input id="name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                <VoiceButton onResult={(text) => setFullName(text)} />
              </div>
            </Field>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <Field label={t("state")} htmlFor="state">
                <select id="state" className="select" value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">—</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={t("district")} htmlFor="district">
                <input id="district" className="input" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {(mode === "local" || method === "phone") && (
          <Field label={t("authPhone")} htmlFor="phone" hint={mode !== "local" ? t("authPhoneHint") : null}>
            <input id="phone" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" disabled={otpSent} autoComplete="tel" />
          </Field>
        )}

        {mode !== "local" && method === "phone" && otpSent && (
          <Field label={t("authOtp")} htmlFor="otp">
            <input id="otp" className="input" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} autoComplete="one-time-code" />
          </Field>
        )}

        {mode !== "local" && method === "email" && (
          <>
            <Field label={t("authEmail")} htmlFor="email">
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label={t("authPassword")} htmlFor="password">
              <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} />
            </Field>
          </>
        )}

        <button className="btn-app btn-primary-app btn-block mt-2" disabled={busy}>
          {busy
            ? t("loading")
            : mode === "local"
            ? t("authContinue")
            : method === "phone"
            ? otpSent ? t("authVerifyOtp") : t("authSendOtp")
            : isRegister ? t("authRegister") : t("authLogin")}
        </button>
      </form>
    </div>
  );
}

import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LANGUAGES, useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut, mode } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: "/", label: t("navHome"), end: true },
    { to: "/prices", label: `📈 ${t("navPrices")}` },
    { to: "/farmer", label: `👨‍🌾 ${t("navFarmer")}` },
    { to: "/buyer", label: `🛒 ${t("navBuyer")}` },
    { to: "/transport", label: `🚚 ${t("navTransport")}` },
  ];

  return (
    <>
      <nav className="navbar-app">
        <div className="navbar-inner">
          <Link to="/" className="brand">🌾 {t("appName")}</Link>
          <div className="nav-links">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link-app ${isActive ? "active" : ""}`}>
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-right">
            <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t("chooseLanguage")}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
              ))}
            </select>
            {user ? (
              <>
                <span className="nav-user" title={user.full_name}>
                  {user.role === "farmer" ? "👨‍🌾" : user.role === "buyer" ? "🛒" : "🚚"} {user.full_name}
                </span>
                <button
                  className="nav-link-app"
                  style={{ cursor: "pointer" }}
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                >
                  {t("navLogout")}
                </button>
              </>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `nav-link-app ${isActive ? "active" : ""}`}>
                {t("navLogin")}
              </NavLink>
            )}
          </div>
        </div>
      </nav>
      {mode === "local" && <div className="demo-banner">🧪 {t("demoModeBanner")}</div>}
    </>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { CROPS, cropName } from "../data/crops";

export default function HomePage() {
  const { t, lang } = useI18n();
  const openAssistant = () => window.dispatchEvent(new Event("agrotech:assistant"));

  const tiles = [
    { to: "/prices", emoji: "📈", label: t("homeCheckPrice") },
    { to: "/farmer", emoji: "👨‍🌾", label: t("homeSellCrop") },
    { to: "/buyer", emoji: "🛒", label: t("homeBuyCrop") },
    { to: "/transport", emoji: "🚚", label: t("homeBookTransport") },
  ];

  const steps = [
    { emoji: "📈", title: t("homeStep1Title"), desc: t("homeStep1Desc") },
    { emoji: "📝", title: t("homeStep2Title"), desc: t("homeStep2Desc") },
    { emoji: "🤝", title: t("homeStep3Title"), desc: t("homeStep3Desc") },
    { emoji: "🚚", title: t("homeStep4Title"), desc: t("homeStep4Desc") },
  ];

  return (
    <div>
      <section className="home-hero">
        <div className="container-narrow">
          <span className="home-badge">🌾 {t("homeBadge")}</span>
          <h1>{t("homeTitle")}</h1>
          <p>{t("homeSubtitle")}</p>
          <div className="action-tiles">
            {tiles.map((tile) => (
              <Link key={tile.to} to={tile.to} className="action-tile">
                <span className="emoji" aria-hidden>{tile.emoji}</span>
                {tile.label}
              </Link>
            ))}
            <button className="action-tile" onClick={openAssistant}>
              <span className="emoji" aria-hidden>🎤</span>
              {t("homeAskAssistant")}
            </button>
          </div>
          <p className="mt-3" style={{ fontSize: 15 }}>💡 {t("homeVoiceTip")}</p>
        </div>
      </section>

      <section className="container-narrow page" style={{ paddingBottom: 48 }}>
        <h2 style={{ textAlign: "center" }}>{t("homeHowTitle")}</h2>
        <div className="grid mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {steps.map((s, i) => (
            <div key={s.title} className="step-card">
              <div className="small muted" style={{ fontWeight: 800, letterSpacing: 1 }}>{i + 1}</div>
              <div className="emoji" aria-hidden>{s.emoji}</div>
              <h4 className="mt-2">{s.title}</h4>
              <p className="muted small" style={{ margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-4" style={{ textAlign: "center" }}>{t("homeCropsTitle")}</h2>
        <div className="row-wrap mt-3" style={{ justifyContent: "center" }}>
          {CROPS.map((c) => (
            <Link key={c.id} to={`/prices?crop=${c.id}`} className="chip">
              {c.emoji} {cropName(c.id, lang)}
            </Link>
          ))}
        </div>
      </section>

      <footer className="footer-app">© {new Date().getFullYear()} AgroTech · {t("tagline")}</footer>
    </div>
  );
}

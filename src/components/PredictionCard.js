import React from "react";
import { formatINR, formatDate, useI18n } from "../i18n";
import { cropEmoji, cropName } from "../data/crops";
import { adviceText } from "../services/assistant";
import { SpeakButton } from "./common";
import PriceChart from "./PriceChart";

export default function PredictionCard({ prediction, compact = false, earnings }) {
  const { t, lang } = useI18n();
  if (!prediction) return null;
  const { current, forecasts, advice, msp } = prediction;
  const f15 = forecasts.find((f) => f.days === 15);
  const advise = adviceText(prediction, lang);
  const wait = advice.action === "wait";

  const speech = t("priceSpeechSummary", {
    crop: cropName(prediction.cropId, lang),
    price: current.perKg,
    future: f15.perKg,
    advice: advise,
  });

  return (
    <div className={compact ? "" : "card-app"}>
      <div className="row-wrap">
        <span style={{ fontSize: compact ? 28 : 40 }} aria-hidden>{cropEmoji(prediction.cropId)}</span>
        <div>
          <div className="small muted">{t("priceToday")} · {prediction.state || t("allIndia")}</div>
          <div className="price-big" style={compact ? { fontSize: "1.8rem" } : undefined}>
            {formatINR(current.perKg, { decimals: current.perKg < 10 ? 1 : 0 })}
            <span className="price-unit"> / {t("kg")}</span>
          </div>
          <div className="small muted">
            {t("priceRange", { min: current.lowPerKg, max: current.highPerKg })}
            {current.markets > 0 && ` · ${t("priceMarkets", { count: current.markets })}`}
          </div>
        </div>
        <div className="spacer" />
        {!compact && <SpeakButton text={speech} label={t("priceListenSummary")} />}
      </div>

      <div className="forecast-grid mt-3">
        {forecasts.map((f) => (
          <div className="forecast-cell" key={f.days}>
            <div className="small muted">{t(`priceIn${f.days}`)}</div>
            <b>₹{f.perKg}</b>
            <div className={`small chg ${f.changePct > 0 ? "up" : f.changePct < 0 ? "down" : ""}`}>
              {f.changePct > 0 ? "▲" : f.changePct < 0 ? "▼" : "●"} {Math.abs(f.changePct)}%
            </div>
            {!compact && <div className="small muted">₹{f.lowPerKg}–{f.highPerKg}</div>}
          </div>
        ))}
      </div>

      <div className={`advice-box mt-3 ${wait ? "wait" : "sell"}`}>
        <span className="emoji" aria-hidden>{wait ? "⏳" : "💰"}</span>
        <div>
          <b>{advise}</b>
          {!compact && (
            <div className="small">
              {advice.perishable
                ? t("pricePerishableWhy")
                : wait
                ? t("priceAdviceWaitWhy", { pct: advice.expectedGainPct })
                : t("priceAdviceSellNowWhy")}
            </div>
          )}
        </div>
      </div>

      {msp && (
        <div className="small mt-2">
          🏛️ {t("priceMsp", { price: msp.perKg })} <span className="muted">({msp.label})</span>
          {advice.belowMsp && <div className="tag red mt-2">{t("priceBelowMsp")}</div>}
        </div>
      )}

      {earnings && earnings.gross > 0 && (
        <div className="card-app mt-3" style={{ background: "#f0fdf4" }}>
          <div className="small muted">{t("priceYourEarning")} · {t("priceForQty", { qty: earnings.quantityKg, grade: earnings.quality })}</div>
          <div className="row-wrap mt-2">
            <div><div className="small muted">{t("priceGross")}</div><b>{formatINR(earnings.gross)}</b></div>
            <div><div className="small muted">{t("priceTransportCost")}</div><b>− {formatINR(earnings.transport)}</b></div>
            <div><div className="small muted">{t("priceNetEarning")}</div><b style={{ fontSize: "1.3rem", color: "#14532d" }}>{formatINR(earnings.net)}</b></div>
          </div>
        </div>
      )}

      {!compact && (
        <>
          <div className="mt-4">
            <h4 style={{ fontSize: "1.05rem" }}>📈 {t("priceTrend")}: {t(`priceTrend_${prediction.trend}`)}</h4>
            <PriceChart prediction={prediction} />
          </div>

          {prediction.topMarkets.length > 0 && (
            <div className="mt-4">
              <h4 style={{ fontSize: "1.05rem" }}>🏪 {t("priceTopMarkets")}</h4>
              <table className="market-table">
                <tbody>
                  {prediction.topMarkets.map((m) => (
                    <tr key={`${m.market}-${m.district}`}>
                      <td>{m.market}<div className="small muted">{[m.district, m.state].filter(Boolean).join(", ")}</div></td>
                      <td>₹{m.perKg}/{t("kg")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="small muted mt-3">
        {t("priceConfidence")}: <b>{t(`conf_${prediction.confidence}`)}</b> · {t("priceSource")}: {t(`source_${prediction.source}`)}
        {prediction.fetchedAt && ` · ${t("priceUpdated", { time: formatDate(prediction.fetchedAt, lang) })}`}
      </div>
      {!compact && <div className="small muted mt-2">ℹ️ {t("priceDisclaimer")}</div>}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { getCrop, STATES } from "../data/crops";
import { getPrediction } from "../services/marketData";
import { estimateEarnings } from "../pricing/predictor";
import { estimateTransportCost } from "../pricing/transportCost";
import { CropPicker, Field, VoiceButton } from "../components/common";
import PredictionCard from "../components/PredictionCard";
import { parseIntent } from "../services/intent";

export default function PricesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [cropId, setCropId] = useState(() => (getCrop(params.get("crop")) ? getCrop(params.get("crop")).id : ""));
  const [state, setState] = useState(user?.state || "");
  const [quantity, setQuantity] = useState(params.get("qty") || "");
  const [quality, setQuality] = useState("B");
  const [distance, setDistance] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cropId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    getPrediction(cropId, { state })
      .then((p) => active && setPrediction(p))
      .catch(() => active && setError(t("somethingWrong")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cropId, state, t]);

  function chooseCrop(id) {
    setCropId(id);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("crop", id);
      return next;
    }, { replace: true });
  }

  function onVoice(text) {
    const parsed = parseIntent(text);
    if (parsed.cropId) chooseCrop(parsed.cropId);
    if (parsed.quantityKg) setQuantity(String(parsed.quantityKg));
  }

  const transport = estimateTransportCost({ distanceKm: distance, quantityKg: quantity });
  const earnings =
    prediction && Number(quantity) > 0
      ? { ...estimateEarnings(prediction, { quantityKg: quantity, quality, transportCost: transport.cost }), quantityKg: quantity, quality }
      : null;

  return (
    <div>
      <div className="page-hero">
        <div className="container-narrow">
          <h1>📈 {t("priceTitle")}</h1>
          <p>{t("priceSubtitle")}</p>
        </div>
      </div>
      <div className="container-narrow page">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="card-app">
            <div className="row-wrap mb-3">
              <h3 className="card-title" style={{ margin: 0 }}>{t("selectCrop")}</h3>
              <div className="spacer" />
              <VoiceButton onResult={onVoice} title={t("priceVoiceHint")} />
            </div>
            <CropPicker value={cropId} onChange={chooseCrop} />

            <div className="grid grid-2 mt-3" style={{ gap: 12 }}>
              <Field label={t("state")} htmlFor="p-state">
                <select id="p-state" className="select" value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">{t("allIndia")}</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={`${t("quantity")} (${t("kg")}) – ${t("optional")}`} htmlFor="p-qty">
                <input id="p-qty" className="input" type="number" step="any" inputMode="decimal" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label={t("farmerQuality")} htmlFor="p-quality">
                <select id="p-quality" className="select" value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="A">{t("qualityA")}</option>
                  <option value="B">{t("qualityB")}</option>
                  <option value="C">{t("qualityC")}</option>
                </select>
              </Field>
              <Field label={`${t("transportDistance")} – ${t("optional")}`} htmlFor="p-dist">
                <input id="p-dist" className="input" type="number" step="any" inputMode="decimal" min="0" value={distance} onChange={(e) => setDistance(e.target.value)} />
              </Field>
            </div>
          </div>

          <div>
            {!cropId && <div className="empty-state"><span className="emoji">👈</span>{t("pricePickCrop")}</div>}
            {cropId && loading && <div className="card-app muted">⏳ {t("loading")}</div>}
            {cropId && error && <div className="card-app tag red">{error}</div>}
            {cropId && !loading && prediction && <PredictionCard prediction={prediction} earnings={earnings} />}
          </div>
        </div>
      </div>
    </div>
  );
}

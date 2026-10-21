import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDate, formatINR, formatNumber, useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { useToast } from "../context/ToastContext";
import { cropEmoji, cropName, getCrop } from "../data/crops";
import { estimateTransportCost, suggestVehicle, VEHICLES } from "../pricing/transportCost";
import { parseIntent } from "../services/intent";
import { CropSelect, EmptyState, Field, StatusBadge, VoiceButton } from "../components/common";

const FILTERS = ["all", "requested", "assigned", "in_transit", "delivered"];

export default function TransportPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { jobs, run } = useData();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const isTransporter = user.role === "transporter";

  async function act(fn, successKey) {
    try {
      await run(fn);
      if (successKey) toast.show(t(successKey));
      return true;
    } catch (e) {
      toast.showError(e);
      return false;
    }
  }

  const visible = jobs.filter((j) => j.status !== "cancelled" && (filter === "all" || j.status === filter));
  const stats = {
    open: jobs.filter((j) => j.status === "requested").length,
    mine: jobs.filter((j) => j.transporter_id === user.id && j.status !== "delivered").length,
    delivered: jobs.filter((j) => j.status === "delivered").length,
  };

  return (
    <div>
      <div className="page-hero">
        <div className="container-narrow">
          <h1>🚚 {t("transportTitle")}</h1>
          <p>{t("welcomeUser", { name: user.full_name })} · {t("transportSubtitle")}</p>
          <div className="stats-row">
            <div className="stat-chip"><b>{stats.open}</b><span>{t("transportOpenJobs")}</span></div>
            {isTransporter && <div className="stat-chip"><b>{stats.mine}</b><span>{t("transportMyJobs")}</span></div>}
            <div className="stat-chip"><b>{stats.delivered}</b><span>{t("status_delivered")}</span></div>
          </div>
        </div>
      </div>

      <div className="container-narrow page">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <RequestForm act={act} />
          <div className="card-app">
            <h3 className="card-title">ℹ️ {t("transportHowTitle")}</h3>
            <p className="muted">{isTransporter ? t("transportHowTransporter") : t("transportHowOthers")}</p>
            <div className="grid" style={{ gap: 8 }}>
              {Object.values(VEHICLES).map((v) => (
                <div key={v.id} className="row-wrap small">
                  <span style={{ fontSize: 26 }} aria-hidden>{v.emoji}</span>
                  <b>{t(`vehicle_${v.id}`)}</b>
                  <span className="muted">~₹{v.ratePerKm}/km</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="row-wrap mt-4 mb-3">
          <h2 style={{ margin: 0 }}>📦 {t("transportJobs")}</h2>
          <div className="spacer" />
          <div className="row-wrap">
            {FILTERS.map((f) => (
              <button key={f} className={`chip ${filter === f ? "" : ""}`} style={filter === f ? { background: "#15803d", color: "#fff" } : undefined} onClick={() => setFilter(f)}>
                {f === "all" ? t("filterAll") : t(`status_${f}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid" style={{ gap: 12 }}>
          {visible.length === 0 && <EmptyState emoji="🚚" text={t("transportNoJobs")} />}
          {visible.map((j) => (
            <JobRow key={j.id} job={j} user={user} act={act} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestForm({ act }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [crop, setCrop] = useState(() => getCrop(params.get("crop"))?.id || "");
  const [quantity, setQuantity] = useState(params.get("qty") || "");
  const [from, setFrom] = useState([user.district, user.state].filter(Boolean).join(", "));
  const [to, setTo] = useState("");
  const [distance, setDistance] = useState("");
  const [vehicle, setVehicle] = useState("");

  const chosenVehicle = vehicle || suggestVehicle(quantity);
  const estimate = estimateTransportCost({ distanceKm: distance, quantityKg: quantity, vehicle: chosenVehicle });

  async function submit(e) {
    e.preventDefault();
    if (!crop || !from.trim() || !to.trim()) return toast.show(t("required"), "error");
    const ok = await act(
      (b) =>
        b.createTransportJob({
          crop,
          quantity_kg: Number(quantity) || null,
          from_location: from.trim(),
          to_location: to.trim(),
          vehicle_type: chosenVehicle,
          distance_km: Number(distance) || null,
          estimated_cost: estimate.cost || null,
        }),
      "transportRequested"
    );
    if (ok) {
      setTo("");
      setDistance("");
    }
  }

  return (
    <form className="card-app" onSubmit={submit}>
      <div className="row-wrap mb-3">
        <h3 className="card-title" style={{ margin: 0 }}>🚛 {t("transportNewRequest")}</h3>
        <div className="spacer" />
        <VoiceButton
          onResult={(text) => {
            const p = parseIntent(text);
            if (p.cropId) setCrop(p.cropId);
            if (p.quantityKg) setQuantity(String(p.quantityKg));
          }}
        />
      </div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <Field label={t("crop")} htmlFor="t-crop">
          <CropSelect id="t-crop" value={crop} onChange={setCrop} />
        </Field>
        <Field label={`${t("quantity")} (${t("kg")})`} htmlFor="t-qty">
          <input id="t-qty" className="input" type="number" step="any" inputMode="decimal" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label={t("from")} htmlFor="t-from">
          <input id="t-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("to")} htmlFor="t-to">
          <input id="t-to" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label={t("transportDistance")} htmlFor="t-dist">
          <input id="t-dist" className="input" type="number" step="any" inputMode="decimal" min="1" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </Field>
        <Field label={t("transportVehicle")} htmlFor="t-veh">
          <select id="t-veh" className="select" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            <option value="">{t("transportAutoVehicle", { vehicle: t(`vehicle_${suggestVehicle(quantity)}`) })}</option>
            {Object.values(VEHICLES).map((v) => <option key={v.id} value={v.id}>{v.emoji} {t(`vehicle_${v.id}`)}</option>)}
          </select>
        </Field>
      </div>
      {estimate.cost > 0 && (
        <div className="advice-box sell mb-3">
          <span className="emoji" aria-hidden>{VEHICLES[estimate.vehicle].emoji}</span>
          <div>
            <b>{t("transportEstimate", { cost: formatINR(estimate.cost) })}</b>
            <div className="small">
              {t("transportEstimateDetail", { trips: estimate.trips, perKg: estimate.perKg })}
            </div>
          </div>
        </div>
      )}
      <button className="btn-app btn-primary-app btn-block">🚚 {t("transportRequest")}</button>
    </form>
  );
}

function JobRow({ job: j, user, act }) {
  const { t, lang } = useI18n();
  const mine = j.transporter_id === user.id;
  return (
    <div className="list-row">
      <span className="emoji" aria-hidden>{VEHICLES[j.vehicle_type]?.emoji || "🚚"}</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div className="item-title">
          <span aria-hidden>{cropEmoji(j.crop)}</span> {cropName(j.crop, lang)}
          {j.quantity_kg ? <span className="small muted"> · {formatNumber(j.quantity_kg)} {t("kg")}</span> : null}
        </div>
        <div>📍 <b>{j.from_location}</b> → <b>{j.to_location}</b></div>
        <div className="small muted">
          {t(`vehicle_${j.vehicle_type}`)}
          {j.distance_km ? ` · ${j.distance_km} km` : ""}
          {j.estimated_cost ? ` · ~${formatINR(j.estimated_cost)}` : ""}
          {" · "}{formatDate(j.created_at, lang)}
        </div>
        <div className="small muted">
          {t("transportBy", { name: j.created_by_name })}
          {j.transporter_name ? ` · 🚚 ${j.transporter_name}` : ""}
        </div>
      </div>
      <StatusBadge status={j.status} />
      <div className="row-wrap">
        {user.role === "transporter" && j.status === "requested" && (
          <button className="btn-app btn-primary-app btn-sm" onClick={() => act((b) => b.claimTransportJob(j.id), "transportClaimed")}>🙋 {t("transportClaim")}</button>
        )}
        {mine && j.status === "assigned" && (
          <button className="btn-app btn-amber-app btn-sm" onClick={() => act((b) => b.advanceTransportJob(j.id), "transportUpdated")}>🚚 {t("transportStart")}</button>
        )}
        {mine && j.status === "in_transit" && (
          <button className="btn-app btn-primary-app btn-sm" onClick={() => act((b) => b.advanceTransportJob(j.id), "transportUpdated")}>✅ {t("transportDeliver")}</button>
        )}
        {j.created_by === user.id && j.status === "requested" && (
          <button className="btn-app btn-danger-app btn-sm" onClick={() => act((b) => b.cancelTransportJob(j.id), null)}>✖ {t("cancel")}</button>
        )}
      </div>
    </div>
  );
}

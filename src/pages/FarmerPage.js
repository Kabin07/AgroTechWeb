import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDate, formatINR, formatNumber, useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { useToast } from "../context/ToastContext";
import { cropEmoji, cropName, getCrop } from "../data/crops";
import { getPrediction } from "../services/marketData";
import { suggestedPricePerKg } from "../pricing/predictor";
import { parseIntent } from "../services/intent";
import { CropPicker, EmptyState, Field, StatusBadge, VoiceButton } from "../components/common";
import OrderHistory from "../components/OrderHistory";

export default function FarmerPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { listings, requests, orders, run } = useData();
  const toast = useToast();
  const [params] = useSearchParams();
  const [tab, setTab] = useState("sell");

  const myListings = listings.filter((l) => l.farmer_id === user.id && l.status !== "withdrawn");
  const openRequests = requests.filter((r) => r.status === "open" && r.buyer_id !== user.id);
  const myOrders = orders.filter((o) => o.farmer_id === user.id);
  const pendingOrders = myOrders.filter((o) => o.status === "pending");
  const activeOrders = myOrders.filter((o) => ["accepted", "in_transit"].includes(o.status));

  const tabs = [
    { id: "sell", label: `🌱 ${t("farmerTabSell")}` },
    { id: "requests", label: `📋 ${t("farmerTabRequests")}`, count: openRequests.length },
    { id: "orders", label: `🛒 ${t("farmerTabOrders")}`, count: pendingOrders.length },
    { id: "history", label: `📜 ${t("farmerTabHistory")}` },
  ];

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

  return (
    <div>
      <div className="page-hero">
        <div className="container-narrow">
          <h1>👨‍🌾 {t("farmerTitle")}</h1>
          <p>{t("welcomeUser", { name: user.full_name })} · {t("farmerSubtitle")}</p>
          <div className="stats-row">
            <div className="stat-chip"><b>{myListings.filter((l) => l.status === "available").length}</b><span>{t("statsListed")}</span></div>
            <div className="stat-chip"><b>{openRequests.length}</b><span>{t("statsRequests")}</span></div>
            <div className="stat-chip"><b>{pendingOrders.length}</b><span>{t("statsPending")}</span></div>
            <div className="stat-chip"><b>{activeOrders.length}</b><span>{t("statsActive")}</span></div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <div className="container-narrow" style={{ display: "flex" }}>
          {tabs.map((tb) => (
            <button key={tb.id} className={`tab-btn ${tab === tb.id ? "active" : ""}`} onClick={() => setTab(tb.id)}>
              {tb.label}
              {tb.count > 0 && <span className="count-badge">{tb.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="container-narrow page">
        {tab === "sell" && <SellTab user={user} params={params} myListings={myListings} act={act} />}

        {tab === "requests" && (
          <div className="grid grid-cards">
            {openRequests.length === 0 && <EmptyState emoji="📭" text={t("farmerNoRequests")} />}
            {openRequests.map((r) => (
              <RequestCard key={r.id} request={r} user={user} onAccept={(price) =>
                act((b) => b.acceptRequest(r.id, { price_per_kg: price, pickup_location: userLocation(user) }), "farmerRequestAccepted")
              } />
            ))}
          </div>
        )}

        {tab === "orders" && (
          <div className="grid" style={{ gap: 12 }}>
            {pendingOrders.length === 0 && <EmptyState emoji="🛍️" text={t("farmerNoOrders")} />}
            {pendingOrders.map((o) => (
              <div key={o.id} className="list-row">
                <span className="emoji" aria-hidden>{cropEmoji(o.crop)}</span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="item-title">{cropName(o.crop, lang)} · {formatNumber(o.quantity_kg)} {t("kg")}</div>
                  <div className="small muted">{t("buyer")}: {o.buyer_name} · {formatDate(o.created_at, lang)}</div>
                  <div className="small">₹{o.price_per_kg}/{t("kg")} · {t("total")}: <b>{formatINR(o.total_amount)}</b></div>
                  {o.drop_location && <div className="small muted">📍 {o.drop_location}</div>}
                </div>
                <StatusBadge status={o.status} />
                <div className="row-wrap">
                  <button className="btn-app btn-primary-app btn-sm" onClick={() => act((b) => b.respondToOrder(o.id, true), "farmerOrderAccepted")}>✅ {t("farmerAcceptOrder")}</button>
                  <button className="btn-app btn-danger-app btn-sm" onClick={() => act((b) => b.respondToOrder(o.id, false), "farmerOrderRejected")}>✖ {t("farmerReject")}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "history" && <OrderHistory orders={myOrders} me={user.id} />}
      </div>
    </div>
  );
}

function userLocation(user) {
  return [user.district, user.state].filter(Boolean).join(", ");
}

function SellTab({ user, params, myListings, act }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [cropId, setCropId] = useState(() => getCrop(params.get("crop"))?.id || "");
  const [quantity, setQuantity] = useState(params.get("qty") || "");
  const [price, setPrice] = useState(params.get("price") || "");
  const [quality, setQuality] = useState("B");
  const [location, setLocation] = useState(userLocation(user));
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    setPrediction(null);
    if (!cropId) return undefined;
    let active = true;
    getPrediction(cropId, { state: user.state || "" })
      .then((p) => active && setPrediction(p))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cropId, user.state]);

  const suggested = useMemo(() => suggestedPricePerKg(prediction, quality), [prediction, quality]);

  function onVoice(text) {
    const parsed = parseIntent(text);
    if (parsed.cropId) setCropId(parsed.cropId);
    if (parsed.quantityKg) setQuantity(String(parsed.quantityKg));
    if (parsed.pricePerKg) setPrice(String(parsed.pricePerKg));
    if (!parsed.cropId && !parsed.quantityKg && !parsed.pricePerKg) toast.show(t("voiceNotUnderstood"), "error");
  }

  async function submit(e) {
    e.preventDefault();
    if (!cropId || !(Number(quantity) > 0) || !(Number(price) > 0)) return toast.show(t("required"), "error");
    const ok = await act(
      (b) => b.createListing({ crop: cropId, quantity_kg: Number(quantity), price_per_kg: Number(price), quality_grade: quality, location }),
      null
    );
    if (!ok) return;
    toast.show(t("farmerListed", { crop: cropName(cropId, lang) }));
    setQuantity("");
    setPrice("");
  }

  return (
    <div className="grid grid-2" style={{ alignItems: "start" }}>
      <form className="card-app" onSubmit={submit}>
        <div className="row-wrap mb-3">
          <h3 className="card-title" style={{ margin: 0 }}>🌱 {t("farmerListTitle")}</h3>
          <div className="spacer" />
          <VoiceButton onResult={onVoice} title={t("farmerVoiceHint")} />
        </div>
        <p className="small muted">🎤 {t("farmerVoiceHint")}</p>
        <Field label={t("selectCrop")}>
          <CropPicker value={cropId} onChange={setCropId} />
        </Field>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label={t("farmerQuantityKg")} htmlFor="f-qty">
            <input id="f-qty" className="input" type="number" step="any" inputMode="decimal" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="500" />
          </Field>
          <Field label={t("farmerQuality")} htmlFor="f-quality">
            <select id="f-quality" className="select" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="A">{t("qualityA")}</option>
              <option value="B">{t("qualityB")}</option>
              <option value="C">{t("qualityC")}</option>
            </select>
          </Field>
        </div>
        <Field label={t("farmerPricePerKg")} htmlFor="f-price">
          <input id="f-price" className="input" type="number" step="any" inputMode="decimal" min="0.5" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={suggested ? String(suggested) : "20"} />
        </Field>
        {suggested && (
          <div className="advice-box sell mb-3" style={{ fontSize: 15 }}>
            <span className="emoji" aria-hidden>💡</span>
            <div style={{ flex: 1 }}>
              {t("farmerSuggested", { price: suggested })}
              <div className="small muted">{t(`source_${prediction.source}`)}</div>
            </div>
            <button type="button" className="btn-app btn-secondary-app btn-sm" onClick={() => setPrice(String(suggested))}>{t("farmerUseSuggested")}</button>
          </div>
        )}
        <Field label={t("location")} htmlFor="f-loc">
          <input id="f-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("yourLocation")} />
        </Field>
        {Number(quantity) > 0 && Number(price) > 0 && (
          <p className="small">{t("total")}: <b>{formatINR(Number(quantity) * Number(price))}</b></p>
        )}
        <button className="btn-app btn-primary-app btn-block">➕ {t("farmerAddListing")}</button>
      </form>

      <div>
        <h3 className="card-title">{t("farmerMyListings")} ({myListings.length})</h3>
        {myListings.length === 0 && <EmptyState emoji="🌾" text={t("noData")} />}
        <div className="grid" style={{ gap: 12 }}>
          {myListings.map((l) => (
            <div key={l.id} className="list-row">
              <span className="emoji" aria-hidden>{cropEmoji(l.crop)}</span>
              <div style={{ flex: 1 }}>
                <div className="item-title">{cropName(l.crop, lang)}</div>
                <div className="small muted">{formatNumber(l.quantity_kg)} {t("kg")} · {t(`quality${l.quality_grade}`)}</div>
              </div>
              <span className="tag amber">₹{l.price_per_kg}/{t("kg")}</span>
              <StatusBadge status={l.status} />
              {l.status === "available" && (
                <button className="btn-app btn-danger-app btn-sm" onClick={() => act((b) => b.withdrawListing(l.id), "farmerWithdrawn")}>{t("farmerWithdraw")}</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request: r, user, onAccept }) {
  const { t, lang } = useI18n();
  const [price, setPrice] = useState(r.target_price_per_kg ? String(r.target_price_per_kg) : "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="item-card">
      <div className="emoji-banner" aria-hidden>{cropEmoji(r.crop)}</div>
      <div className="item-body">
        <div className="item-title">{cropName(r.crop, lang)}</div>
        <div className="row-wrap">
          <span className="tag blue">👤 {r.buyer_name}</span>
          <span className="tag">📦 {formatNumber(r.quantity_kg)} {t("kg")}</span>
          {r.target_price_per_kg && <span className="tag amber">🎯 ₹{r.target_price_per_kg}/{t("kg")}</span>}
        </div>
        {r.location && <div className="small muted">📍 {r.location}</div>}
        <Field label={t("farmerOfferPrice")} htmlFor={`rp-${r.id}`}>
          <input id={`rp-${r.id}`} className="input" type="number" step="any" inputMode="decimal" min="0.5" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <button
          className="btn-app btn-primary-app btn-block"
          disabled={busy || !(Number(price) > 0)}
          onClick={async () => {
            setBusy(true);
            await onAccept(Number(price));
            setBusy(false);
          }}
        >
          ✅ {t("farmerAcceptRequest")}
        </button>
      </div>
    </div>
  );
}

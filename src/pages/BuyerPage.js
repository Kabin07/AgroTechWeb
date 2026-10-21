import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatINR, formatNumber, useI18n } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { useToast } from "../context/ToastContext";
import { cropEmoji, cropName, getCrop } from "../data/crops";
import { getPrediction } from "../services/marketData";
import { parseIntent } from "../services/intent";
import { CropSelect, EmptyState, Field, VoiceButton } from "../components/common";
import OrderHistory from "../components/OrderHistory";

function userLocation(user) {
  return [user.district, user.state].filter(Boolean).join(", ");
}

// Today's mandi price per crop, used to tell buyers whether a listing is a good deal.
function useMarketRates(cropIds, state) {
  const [rates, setRates] = useState({});
  const key = [...new Set(cropIds)].sort().join(",");
  useEffect(() => {
    let active = true;
    key.split(",").filter(Boolean).forEach((id) => {
      getPrediction(id, { state })
        .then((p) => active && setRates((r) => ({ ...r, [id]: p.current.perKg })))
        .catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [key, state]);
  return rates;
}

export default function BuyerPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { listings, requests, orders, run } = useData();
  const toast = useToast();
  const [params] = useSearchParams();

  const [reqCrop, setReqCrop] = useState(() => getCrop(params.get("crop"))?.id || "");
  const [reqQty, setReqQty] = useState(params.get("qty") || "");
  const [reqPrice, setReqPrice] = useState(params.get("price") || "");
  const [reqLocation, setReqLocation] = useState(userLocation(user));
  const [search, setSearch] = useState("");

  const available = listings.filter((l) => l.status === "available" && l.farmer_id !== user.id);
  const myRequests = requests.filter((r) => r.buyer_id === user.id);
  const myOrders = orders.filter((o) => o.buyer_id === user.id);
  const rates = useMarketRates(available.map((l) => l.crop), user.state || "");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    const parsedCrop = parseIntent(q).cropId;
    return available.filter((l) => l.crop === parsedCrop || cropName(l.crop, lang).toLowerCase().includes(q) || l.farmer_name.toLowerCase().includes(q));
  }, [available, search, lang]);

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

  async function postRequirement(e) {
    e.preventDefault();
    if (!reqCrop || !(Number(reqQty) > 0)) return toast.show(t("required"), "error");
    const ok = await act(
      (b) => b.createRequest({ crop: reqCrop, quantity_kg: Number(reqQty), target_price_per_kg: Number(reqPrice) || null, location: reqLocation }),
      "buyerPosted"
    );
    if (ok) {
      setReqQty("");
      setReqPrice("");
    }
  }

  function onVoice(text) {
    const parsed = parseIntent(text);
    if (parsed.cropId) setReqCrop(parsed.cropId);
    if (parsed.quantityKg) setReqQty(String(parsed.quantityKg));
    if (parsed.pricePerKg) setReqPrice(String(parsed.pricePerKg));
  }

  return (
    <div>
      <div className="page-hero">
        <div className="container-narrow">
          <h1>🛒 {t("buyerTitle")}</h1>
          <p>{t("welcomeUser", { name: user.full_name })} · {t("buyerSubtitle")}</p>
          <div className="stats-row">
            <div className="stat-chip"><b>{available.length}</b><span>{t("buyerAvailable")}</span></div>
            <div className="stat-chip"><b>{myRequests.filter((r) => r.status === "open").length}</b><span>{t("buyerMyRequirements")}</span></div>
            <div className="stat-chip"><b>{myOrders.length}</b><span>{t("buyerMyOrders")}</span></div>
          </div>
        </div>
      </div>

      <div className="container-narrow page">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <form className="card-app" onSubmit={postRequirement}>
            <div className="row-wrap mb-3">
              <h3 className="card-title" style={{ margin: 0 }}>🌱 {t("buyerAddRequirement")}</h3>
              <div className="spacer" />
              <VoiceButton onResult={onVoice} />
            </div>
            <Field label={t("crop")} htmlFor="b-crop">
              <CropSelect id="b-crop" value={reqCrop} onChange={setReqCrop} />
            </Field>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <Field label={`${t("quantity")} (${t("kg")})`} htmlFor="b-qty">
                <input id="b-qty" className="input" type="number" step="any" inputMode="decimal" min="1" value={reqQty} onChange={(e) => setReqQty(e.target.value)} />
              </Field>
              <Field label={`${t("buyerTargetPrice")} – ${t("optional")}`} htmlFor="b-price">
                <input id="b-price" className="input" type="number" step="any" inputMode="decimal" min="0" value={reqPrice} onChange={(e) => setReqPrice(e.target.value)} />
              </Field>
            </div>
            <Field label={t("buyerDeliveryLocation")} htmlFor="b-loc">
              <input id="b-loc" className="input" value={reqLocation} onChange={(e) => setReqLocation(e.target.value)} />
            </Field>
            <button className="btn-app btn-primary-app btn-block">➕ {t("buyerPost")}</button>
          </form>

          <div className="card-app">
            <h3 className="card-title">📋 {t("buyerMyRequirements")}</h3>
            {myRequests.length === 0 && <p className="muted">{t("noData")}</p>}
            <div className="grid" style={{ gap: 8 }}>
              {myRequests.map((r) => (
                <div key={r.id} className="row-wrap" style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 12px" }}>
                  <span style={{ fontSize: 24 }} aria-hidden>{cropEmoji(r.crop)}</span>
                  <b>{cropName(r.crop, lang)}</b>
                  <span className="tag">{formatNumber(r.quantity_kg)} {t("kg")}</span>
                  {r.target_price_per_kg && <span className="tag amber">₹{r.target_price_per_kg}</span>}
                  <span className="spacer" />
                  <span className="small">{t(`status_${r.status}`)}</span>
                  {r.status === "open" && (
                    <button type="button" className="btn-app btn-danger-app btn-sm" onClick={() => act((b) => b.closeRequest(r.id), null)}>✖</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="row-wrap mt-4 mb-3">
          <h2 style={{ margin: 0 }}>🛒 {t("buyerAvailable")}</h2>
          <div className="spacer" />
          <input className="input" style={{ maxWidth: 280 }} placeholder={`🔍 ${t("buyerSearch")}`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("buyerSearch")} />
        </div>
        <div className="grid grid-cards">
          {filtered.length === 0 && <EmptyState emoji="🌾" text={t("buyerNoCrops")} />}
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} marketRate={rates[l.crop]} defaultDrop={userLocation(user)}
              onBuy={(qty, drop) => act((b) => b.placeOrder(l.id, { quantity_kg: qty, drop_location: drop }), "buyerOrderPlaced")} />
          ))}
        </div>

        <h2 className="mt-4 mb-3">📦 {t("buyerMyOrders")}</h2>
        <OrderHistory orders={myOrders} me={user.id} />
      </div>
    </div>
  );
}

function ListingCard({ listing: l, marketRate, defaultDrop, onBuy }) {
  const { t, lang } = useI18n();
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(String(l.quantity_kg));
  const [drop, setDrop] = useState(defaultDrop);
  const [busy, setBusy] = useState(false);
  const crop = getCrop(l.crop);

  let deal = null;
  if (marketRate) {
    if (l.price_per_kg <= marketRate) deal = <span className="tag">👍 {t("buyerGoodDeal")}</span>;
    else if (l.price_per_kg > marketRate * 1.15) deal = <span className="tag red">⚠️ {t("buyerAboveMarket")}</span>;
  }

  return (
    <div className="item-card">
      {crop?.image ? <img src={crop.image} alt={cropName(l.crop, lang)} loading="lazy" /> : <div className="emoji-banner" aria-hidden>{cropEmoji(l.crop)}</div>}
      <div className="item-body">
        <div className="item-title"><span aria-hidden>{cropEmoji(l.crop)}</span> {cropName(l.crop, lang)}</div>
        <div className="small muted">{t("soldBy", { name: l.farmer_name })}{l.location ? ` · 📍 ${l.location}` : ""}</div>
        <div className="row-wrap">
          <span className="tag">📦 {formatNumber(l.quantity_kg)} {t("kg")}</span>
          <span className="tag amber">₹{l.price_per_kg}/{t("kg")}</span>
          <span className="tag blue">{t(`quality${l.quality_grade || "B"}`)}</span>
        </div>
        {marketRate && <div className="small muted">{t("buyerMarketRate", { price: marketRate })} {deal}</div>}
        <div className="spacer" />
        {!buying ? (
          <button className="btn-app btn-primary-app btn-block" onClick={() => setBuying(true)}>{t("buyerBuy")}</button>
        ) : (
          <div>
            <Field label={t("buyerBuyQty")} htmlFor={`q-${l.id}`}>
              <input id={`q-${l.id}`} className="input" type="number" step="any" inputMode="decimal" min="1" max={l.quantity_kg} value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label={t("buyerDeliveryLocation")} htmlFor={`d-${l.id}`}>
              <input id={`d-${l.id}`} className="input" value={drop} onChange={(e) => setDrop(e.target.value)} />
            </Field>
            {Number(qty) > 0 && <p className="small">{t("total")}: <b>{formatINR(Number(qty) * l.price_per_kg)}</b></p>}
            <div className="row-wrap">
              <button
                className="btn-app btn-primary-app"
                style={{ flex: 1 }}
                disabled={busy || !(Number(qty) > 0)}
                onClick={async () => {
                  setBusy(true);
                  const ok = await onBuy(Number(qty), drop);
                  setBusy(false);
                  if (ok) setBuying(false);
                }}
              >
                ✅ {t("buyerConfirm")}
              </button>
              <button className="btn-app btn-secondary-app" onClick={() => setBuying(false)}>{t("cancel")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

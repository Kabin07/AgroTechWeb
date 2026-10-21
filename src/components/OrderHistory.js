import React, { useState } from "react";
import { formatDate, formatINR, formatNumber, useI18n } from "../i18n";
import { cropEmoji, cropName } from "../data/crops";
import { backend } from "../services/backend";
import { useToast } from "../context/ToastContext";
import { EmptyState, StatusBadge } from "./common";

export default function OrderHistory({ orders, me }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [contacts, setContacts] = useState({});

  async function showContacts(orderId) {
    try {
      const list = await backend.getOrderContacts(orderId);
      setContacts((c) => ({ ...c, [orderId]: list }));
    } catch (e) {
      toast.showError(e);
    }
  }

  if (!orders.length) return <EmptyState emoji="📦" text={t("noOrders")} />;

  return (
    <div className="grid" style={{ gap: 12 }}>
      {orders.map((o) => (
        <div key={o.id} className="list-row">
          <span className="emoji" aria-hidden>{cropEmoji(o.crop)}</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="item-title">{cropName(o.crop, lang)} · {formatNumber(o.quantity_kg)} {t("kg")}</div>
            <div className="small muted">
              {o.farmer_id === me ? `${t("buyer")}: ${o.buyer_name}` : `${t("farmer")}: ${o.farmer_name}`} · {formatDate(o.created_at, lang)}
            </div>
            <div className="small">
              ₹{o.price_per_kg}/{t("kg")} · {t("total")}: <b>{formatINR(o.total_amount ?? o.quantity_kg * o.price_per_kg)}</b>
            </div>
            {(o.pickup_location || o.drop_location) && (
              <div className="small muted">📍 {o.pickup_location || "—"} → {o.drop_location || "—"}</div>
            )}
            {contacts[o.id] && (
              <div className="row-wrap mt-2">
                {contacts[o.id].length === 0 && <span className="small muted">—</span>}
                {contacts[o.id].map((c) => (
                  <span key={c.id} className="tag blue">
                    {t(c.role)}: {c.full_name} {c.phone ? <a href={`tel:${c.phone}`}>📞 {c.phone}</a> : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <StatusBadge status={o.status} />
            {!contacts[o.id] && o.status !== "cancelled" && (
              <button className="btn-app btn-secondary-app btn-sm" onClick={() => showContacts(o.id)}>📞 {t("contact")}</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

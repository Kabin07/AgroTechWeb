// Helpers for the data.gov.in "Current Daily Price of Various Commodities from
// Various Markets (Mandi)" dataset (Agmarknet). Prices are ₹ per quintal.
// The same logic lives server-side in supabase/functions/_shared/agmarknet.ts.

export const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const API_BASE = "https://api.data.gov.in/resource";

// "21/10/2026" → "2026-10-21"
export function parseArrivalDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

// Field names differ in case between dataset versions (state / State / STATE).
export function normalizeRecord(raw) {
  const r = {};
  Object.keys(raw || {}).forEach((k) => {
    r[k.toLowerCase().replace(/[^a-z]/g, "_")] = raw[k];
  });
  const num = (v) => {
    const n = Number(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const modal = num(r.modal_price ?? r.modal_x0020_price);
  const date = parseArrivalDate(r.arrival_date ?? r.arrival_x0020_date);
  if (!modal || !date) return null;
  return {
    state: String(r.state ?? "").trim(),
    district: String(r.district ?? "").trim(),
    market: String(r.market ?? "").trim(),
    commodity: String(r.commodity ?? "").trim(),
    variety: String(r.variety ?? "").trim(),
    grade: String(r.grade ?? "").trim(),
    date,
    min: num(r.min_price ?? r.min_x0020_price),
    max: num(r.max_price ?? r.max_x0020_price),
    modal,
  };
}

// Keep only the most recent arrival date (the feed sometimes mixes days).
export function latestDayOnly(records) {
  const latest = records.reduce((d, r) => (r.date > d ? r.date : d), "");
  return records.filter((r) => r.date === latest);
}

export async function fetchAgmarknet({ apiKey, commodity, state, signal }) {
  const params = new URLSearchParams({ "api-key": apiKey, format: "json", limit: "1000" });
  params.set("filters[commodity]", commodity);
  const res = await fetch(`${API_BASE}/${AGMARKNET_RESOURCE_ID}?${params}`, { signal });
  if (!res.ok) throw new Error(`data.gov.in responded ${res.status}`);
  const json = await res.json();
  let records = (json.records || []).map(normalizeRecord).filter(Boolean);
  if (state) records = records.filter((r) => r.state.toLowerCase() === state.toLowerCase());
  return latestDayOnly(records);
}

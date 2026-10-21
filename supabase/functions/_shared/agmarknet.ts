// data.gov.in – "Current Daily Price of Various Commodities from Various Markets (Mandi)".
// Free API key: https://data.gov.in (sign up → My Account → API key). Prices are ₹/quintal.
// Mirrors src/services/agmarknet.js in the web app.

export const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

// Commodity names exactly as Agmarknet spells them (must match src/data/crops.js).
export const ALLOWED_COMMODITIES = [
  "Paddy(Dhan)(Common)", "Wheat", "Maize", "Tomato", "Potato", "Onion", "Soyabean",
  "Cotton", "Groundnut", "Dry Chillies", "Turmeric", "Banana", "Brinjal",
  "Arhar (Tur/Red Gram)(Whole)",
];

export interface MandiRecord {
  state: string;
  district: string;
  market: string;
  variety: string;
  grade: string;
  date: string; // YYYY-MM-DD
  min: number | null;
  max: number | null;
  modal: number;
}

export function parseArrivalDate(value: unknown): string | null {
  const s = String(value ?? "").trim();
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

export function normalizeRecord(raw: Record<string, unknown>): MandiRecord | null {
  const r: Record<string, unknown> = {};
  for (const k of Object.keys(raw ?? {})) r[k.toLowerCase().replace(/[^a-z]/g, "_")] = raw[k];
  const num = (v: unknown) => {
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
    variety: String(r.variety ?? "").trim(),
    grade: String(r.grade ?? "").trim(),
    date,
    min: num(r.min_price ?? r.min_x0020_price),
    max: num(r.max_price ?? r.max_x0020_price),
    modal,
  };
}

// Fetches every market's price for one commodity (all India), paging through results.
export async function fetchAgmarknet(apiKey: string, commodity: string): Promise<MandiRecord[]> {
  const pageSize = 1000;
  const out: MandiRecord[] = [];
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const params = new URLSearchParams({
      "api-key": apiKey,
      format: "json",
      limit: String(pageSize),
      offset: String(offset),
    });
    params.set("filters[commodity]", commodity);
    const res = await fetch(`https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}?${params}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`data.gov.in responded ${res.status}`);
    const body = await res.json();
    const page = (body.records ?? []) as Record<string, unknown>[];
    for (const raw of page) {
      const rec = normalizeRecord(raw);
      if (rec) out.push(rec);
    }
    if (page.length < pageSize) break;
  }
  return out;
}

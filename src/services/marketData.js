// Market price data with graceful fallbacks:
//   1. Supabase Edge Function "market-prices" (live Agmarknet data + stored history)
//   2. Supabase cached tables (if the function is down)
//   3. Direct data.gov.in call (demo mode with REACT_APP_DATA_GOV_API_KEY)
//   4. Seasonal reference estimate (always works, clearly labelled)

import { supabase } from "../lib/supabaseClient";
import { DATA_GOV_API_KEY } from "../config";
import { getCrop } from "../data/crops";
import { fetchAgmarknet } from "./agmarknet";
import { predictPrice, median } from "../pricing/predictor";

const CACHE_MS = 10 * 60 * 1000;
const LOCAL_HISTORY_KEY = "agrotech.priceHistory.v1";
const memoryCache = new Map();

function readLocalHistory() {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_HISTORY_KEY)) || {};
  } catch {
    return {};
  }
}

// Builds up history on this device, one point per day, when fetching directly.
function saveLocalSnapshot(key, date, price) {
  try {
    const all = readLocalHistory();
    const series = (all[key] || []).filter((p) => p.date !== date);
    series.push({ date, price });
    all[key] = series.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-120);
    window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: history is optional */
  }
}

async function fromEdgeFunction(crop, state) {
  const { data, error } = await supabase.functions.invoke("market-prices", {
    body: { commodity: crop.agmarknet, state: state || "", days: 90 },
  });
  if (error) throw error;
  if (!data || (!data.records?.length && !data.history?.length)) return null;
  return {
    source: data.source === "live" ? "live" : "cache",
    fetchedAt: data.fetchedAt,
    latestDate: data.latestDate,
    records: data.records || [],
    history: data.history || [],
  };
}

async function fromSupabaseTables(crop, state) {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  let query = supabase
    .from(state ? "market_price_daily" : "market_price_daily_national")
    .select("arrival_date, modal_price")
    .eq("commodity", crop.agmarknet)
    .gte("arrival_date", since)
    .order("arrival_date", { ascending: true });
  if (state) query = query.eq("state", state);
  const { data, error } = await query;
  if (error || !data?.length) return null;
  return {
    source: "cache",
    fetchedAt: null,
    records: [],
    history: data.map((r) => ({ date: r.arrival_date, price: Number(r.modal_price) })),
  };
}

async function fromDataGovDirect(crop, state) {
  const records = await fetchAgmarknet({ apiKey: DATA_GOV_API_KEY, commodity: crop.agmarknet, state });
  if (!records.length) return null;
  const key = `${crop.id}|${state || ""}`;
  saveLocalSnapshot(key, records[0].date, median(records.map((r) => r.modal)));
  return {
    source: "live",
    fetchedAt: new Date().toISOString(),
    latestDate: records[0].date,
    records,
    history: readLocalHistory()[key] || [],
  };
}

export async function getMarketData(cropId, { state = "" } = {}) {
  const crop = getCrop(cropId);
  if (!crop) throw new Error(`Unknown crop: ${cropId}`);
  const cacheKey = `${crop.id}|${state}`;
  const hit = memoryCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const attempts = [];
  if (supabase) attempts.push(() => fromEdgeFunction(crop, state), () => fromSupabaseTables(crop, state));
  if (DATA_GOV_API_KEY) attempts.push(() => fromDataGovDirect(crop, state));

  let data = null;
  const errors = [];
  for (const attempt of attempts) {
    try {
      data = await attempt();
      if (data) break;
    } catch (e) {
      errors.push(e?.message || String(e));
    }
  }
  if (!data) {
    data = {
      source: "reference",
      fetchedAt: null,
      records: [],
      history: readLocalHistory()[cacheKey] || [],
      warning: errors[0] || null,
    };
  }
  memoryCache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function getPrediction(cropId, { state = "" } = {}) {
  const data = await getMarketData(cropId, { state });
  const prediction = predictPrice({ cropId, records: data.records, history: data.history, source: data.source });
  return { ...prediction, fetchedAt: data.fetchedAt, state };
}

// Edge Function: market-prices
// POST { commodity, state?, days? }  → today's mandi prices + daily history for prediction.
// POST { refreshAll: true } with header x-cron-secret → refresh every crop (for a daily cron).
//
// Live data comes from data.gov.in (Agmarknet). Every fetch is stored in market_prices,
// so history builds up day by day and the app keeps working if the API is down.
//
// Secrets: DATA_GOV_API_KEY (required for live data), CRON_SECRET (for refreshAll).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { ALLOWED_COMMODITIES, fetchAgmarknet, type MandiRecord } from "../_shared/agmarknet.ts";

const STALE_MS = 3 * 60 * 60 * 1000; // re-fetch a commodity at most every 3 hours
const ALL_INDIA = ""; // we always fetch all-India data and filter by state when reading

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const apiKey = Deno.env.get("DATA_GOV_API_KEY") ?? "";
const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

function dedupe(commodity: string, records: MandiRecord[]) {
  const rows = new Map<string, Record<string, unknown>>();
  const now = new Date().toISOString();
  for (const r of records) {
    const key = [r.variety, r.grade, r.state, r.district, r.market, r.date].join("|");
    rows.set(key, {
      commodity,
      variety: r.variety,
      grade: r.grade,
      state: r.state,
      district: r.district,
      market: r.market,
      arrival_date: r.date,
      min_price: r.min,
      max_price: r.max,
      modal_price: r.modal,
      source: "agmarknet",
      fetched_at: now,
    });
  }
  return [...rows.values()];
}

async function refresh(commodity: string): Promise<number> {
  try {
    const records = await fetchAgmarknet(apiKey, commodity);
    const rows = dedupe(commodity, records);
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin
        .from("market_prices")
        .upsert(rows.slice(i, i + 500), { onConflict: "commodity,variety,grade,state,district,market,arrival_date" });
      if (error) throw error;
    }
    await admin.from("price_fetch_log").upsert({
      commodity, state: ALL_INDIA, fetched_at: new Date().toISOString(), record_count: rows.length, last_error: null,
    });
    return rows.length;
  } catch (e) {
    await admin.from("price_fetch_log").upsert({
      commodity, state: ALL_INDIA, fetched_at: new Date().toISOString(), record_count: 0, last_error: String(e).slice(0, 500),
    });
    throw e;
  }
}

async function isStale(commodity: string): Promise<boolean> {
  const { data } = await admin
    .from("price_fetch_log")
    .select("fetched_at")
    .eq("commodity", commodity)
    .eq("state", ALL_INDIA)
    .maybeSingle();
  return !data || Date.now() - new Date(data.fetched_at).getTime() > STALE_MS;
}

async function read(commodity: string, state: string, days: number) {
  let latestQuery = admin
    .from("market_prices")
    .select("arrival_date, fetched_at")
    .eq("commodity", commodity)
    .order("arrival_date", { ascending: false })
    .limit(1);
  if (state) latestQuery = latestQuery.eq("state", state);
  const { data: latest } = await latestQuery;
  const latestDate: string | null = latest?.[0]?.arrival_date ?? null;

  let records: unknown[] = [];
  if (latestDate) {
    let q = admin
      .from("market_prices")
      .select("state, district, market, variety, min_price, max_price, modal_price, arrival_date")
      .eq("commodity", commodity)
      .eq("arrival_date", latestDate)
      .limit(3000);
    if (state) q = q.eq("state", state);
    const { data } = await q;
    records = (data ?? []).map((r) => ({
      state: r.state, district: r.district, market: r.market, variety: r.variety,
      min: r.min_price, max: r.max_price, modal: r.modal_price, date: r.arrival_date,
    }));
  }

  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  let hq = admin
    .from(state ? "market_price_daily" : "market_price_daily_national")
    .select("arrival_date, modal_price")
    .eq("commodity", commodity)
    .gte("arrival_date", since)
    .order("arrival_date", { ascending: true });
  if (state) hq = hq.eq("state", state);
  const { data: hist } = await hq;
  const history = (hist ?? []).map((h) => ({ date: h.arrival_date, price: Number(h.modal_price) }));

  return { latestDate, fetchedAt: latest?.[0]?.fetched_at ?? null, records, history };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Scheduled refresh of all crops (see supabase/optional/schedule_price_refresh.sql)
  if (body.refreshAll) {
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) return json({ error: "Forbidden" }, 403);
    if (!apiKey) return json({ error: "DATA_GOV_API_KEY is not set" }, 500);
    const result: Record<string, number | string> = {};
    for (const c of ALLOWED_COMMODITIES) {
      try {
        result[c] = await refresh(c);
      } catch (e) {
        result[c] = `error: ${String(e).slice(0, 120)}`;
      }
    }
    return json({ refreshed: result });
  }

  const commodity = String(body.commodity ?? "");
  const state = String(body.state ?? "").slice(0, 60);
  const days = Math.min(365, Math.max(7, Number(body.days) || 90));
  if (!ALLOWED_COMMODITIES.includes(commodity)) return json({ error: "Unknown commodity" }, 400);

  let warning: string | null = null;
  if (apiKey && (await isStale(commodity))) {
    try {
      await refresh(commodity);
    } catch (e) {
      warning = `Live fetch failed, showing saved data: ${String(e).slice(0, 200)}`;
    }
  } else if (!apiKey) {
    warning = "DATA_GOV_API_KEY is not set; showing saved data only";
  }

  const data = await read(commodity, state, days);
  const ageDays = data.latestDate ? (Date.now() - new Date(data.latestDate).getTime()) / 864e5 : Infinity;
  return json({
    commodity,
    state,
    source: data.records.length && ageDays <= 3 ? "live" : "cache",
    ...data,
    warning,
  });
});

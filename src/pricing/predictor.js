// Crop price prediction.
//
// Inputs are mandi prices in ₹/quintal (as published by Agmarknet). The model is
// deliberately simple and explainable so a farmer can trust it:
//
//   1. Current price  = median modal price across today's markets
//                       (or the latest history point, or a seasonal estimate).
//   2. Trend          = weighted regression on log prices from the last 90 days,
//                       recent days count more, and the trend fades out over time.
//   3. Seasonality    = crop's monthly price pattern (harvest months are cheaper).
//   4. Range          = typical volatility × √days, widened when data is thin.
//   5. Advice         = compare waiting (forecast minus spoilage) with selling now.

import { getCrop } from "../data/crops";

export const HORIZONS = [7, 15, 30];

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 14;
const TREND_DAMPING = 0.95; // per day; the trend's effect stops growing after ~3 weeks
const MAX_MOVE = 0.35; // never predict more than ±35% from trend alone
const WAIT_THRESHOLD = 0.04; // waiting must beat selling now by 4%+

export function median(values) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return NaN;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function toDate(value) {
  if (value instanceof Date) return value;
  // "YYYY-MM-DD" → local midnight (avoids timezone shifts)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

function daysBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / DAY_MS);
}

function normalizedSeason(crop) {
  const s = crop?.season?.length === 12 ? crop.season : new Array(12).fill(1);
  const mean = s.reduce((a, b) => a + b, 0) / 12;
  return s.map((v) => v / mean);
}

// Smoothly interpolated seasonal index (month mid-points are the anchors).
export function seasonalIndex(crop, date) {
  const idx = normalizedSeason(crop);
  const d = toDate(date);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const pos = d.getMonth() + (d.getDate() - 0.5) / daysInMonth - 0.5;
  const i0 = Math.floor(pos);
  const frac = pos - i0;
  return idx[(i0 + 12) % 12] * (1 - frac) + idx[(i0 + 13) % 12] * frac;
}

// Trend and volatility from history: [{ date: "YYYY-MM-DD", price }] (₹/quintal).
export function analyzeHistory(history, asOf, crop) {
  const points = (history || [])
    .filter((p) => Number(p.price) > 0)
    .map((p) => ({ t: daysBetween(asOf, p.date), price: Number(p.price) }))
    .filter((p) => p.t <= 0 && p.t >= -90)
    .sort((a, b) => a.t - b.t);

  const result = { points: points.length, spanDays: 0, slope: 0, volatility: crop?.volatility ?? 0.01 };
  if (points.length < 2) return result;

  result.spanDays = points[points.length - 1].t - points[0].t;

  // Daily volatility from consecutive log changes, scaled by the gap between points.
  const changes = [];
  for (let i = 1; i < points.length; i++) {
    const gap = Math.max(1, points[i].t - points[i - 1].t);
    changes.push(Math.log(points[i].price / points[i - 1].price) / Math.sqrt(gap));
  }
  if (changes.length >= 4) {
    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((a, b) => a + (b - mean) ** 2, 0) / (changes.length - 1);
    // Blend with the crop default so a few noisy days don't dominate.
    const w = Math.min(1, changes.length / 30);
    result.volatility = w * Math.sqrt(variance) + (1 - w) * result.volatility;
  }

  if (points.length < 4 || result.spanDays < 5) return result;

  // Exponentially weighted least squares on log(price) vs day.
  let sw = 0, sx = 0, sy = 0;
  const rows = points.map((p) => {
    const w = Math.pow(0.5, -p.t / HALF_LIFE_DAYS);
    const y = Math.log(p.price);
    sw += w; sx += w * p.t; sy += w * y;
    return { w, x: p.t, y };
  });
  const mx = sx / sw;
  const my = sy / sw;
  let sxx = 0, sxy = 0;
  rows.forEach((r) => {
    sxx += r.w * (r.x - mx) ** 2;
    sxy += r.w * (r.x - mx) * (r.y - my);
  });
  result.slope = sxx > 0 ? sxy / sxx : 0; // log-change per day
  return result;
}

function dampedTrend(slope, days) {
  const total = slope * ((1 - Math.pow(TREND_DAMPING, days)) / (1 - TREND_DAMPING));
  return Math.max(-MAX_MOVE, Math.min(MAX_MOVE, total));
}

function addDays(date, days) {
  const d = new Date(toDate(date));
  d.setDate(d.getDate() + days);
  return d;
}

function confidenceLevel({ source, points, volatility }) {
  let score = { live: 2, cache: 1.5, reference: 0 }[source] ?? 0;
  if (points >= 20) score += 2;
  else if (points >= 7) score += 1;
  if (volatility >= 0.03) score -= 1;
  if (score >= 3.5) return "high";
  if (score >= 1.5) return "medium";
  return "low";
}

// ₹/quintal → ₹/kg, rounded the way farmers say prices: whole rupees, or one decimal below ₹10.
const perKg = (perQuintal) => {
  const kg = perQuintal / 100;
  return kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg);
};

/**
 * @param {object} args
 * @param {string} args.cropId
 * @param {{modal:number,min?:number,max?:number,market?:string,district?:string,state?:string}[]} [args.records] today's market rows (₹/quintal)
 * @param {{date:string, price:number}[]} [args.history] daily average modal prices (₹/quintal)
 * @param {"live"|"cache"|"reference"} [args.source]
 * @param {Date|string} [args.asOf]
 */
export function predictPrice({ cropId, records = [], history = [], source = "reference", asOf = new Date() }) {
  const crop = getCrop(cropId);
  if (!crop) throw new Error(`Unknown crop: ${cropId}`);
  const today = toDate(asOf);

  const modals = records.map((r) => Number(r.modal)).filter((v) => v > 0);
  const sortedHistory = [...history].filter((p) => Number(p.price) > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  const lastHistory = sortedHistory[sortedHistory.length - 1];

  let current;
  let effectiveSource = source;
  if (modals.length) {
    current = median(modals);
  } else if (lastHistory && daysBetween(lastHistory.date, today) <= 14) {
    current = Number(lastHistory.price);
    effectiveSource = source === "live" ? "cache" : source;
  } else {
    // No market data at all: estimate from the reference price and season.
    current = crop.referencePrice * seasonalIndex(crop, today);
    effectiveSource = "reference";
  }

  // Price spread across markets today (25th–75th percentile is more honest than min/max).
  let low = current * 0.85;
  let high = current * 1.15;
  if (modals.length >= 4) {
    const s = [...modals].sort((a, b) => a - b);
    low = s[Math.floor(s.length * 0.25)];
    high = s[Math.min(s.length - 1, Math.ceil(s.length * 0.75) - 1)];
  } else if (records.length) {
    const mins = records.map((r) => Number(r.min)).filter((v) => v > 0);
    const maxs = records.map((r) => Number(r.max)).filter((v) => v > 0);
    if (mins.length) low = Math.min(...mins);
    if (maxs.length) high = Math.max(...maxs);
  }

  const stats = effectiveSource === "reference" ? analyzeHistory([], today, crop) : analyzeHistory(sortedHistory, today, crop);
  // How much we trust the recent trend vs the seasonal pattern.
  const trendWeight = stats.points >= 4 ? Math.min(1, stats.points / 20) * (stats.spanDays >= 14 ? 0.7 : 0.35) : 0;
  const seasonWeight = 1 - trendWeight * 0.6;
  const rangeWiden = effectiveSource === "reference" ? 1.6 : stats.points < 7 ? 1.25 : 1;
  const seasonNow = seasonalIndex(crop, today);

  const forecasts = HORIZONS.map((days) => {
    const trendPct = Math.exp(dampedTrend(stats.slope, days)) - 1;
    const seasonPct = seasonalIndex(crop, addDays(today, days)) / seasonNow - 1;
    const changePct = trendWeight * trendPct + seasonWeight * seasonPct;
    const price = current * (1 + changePct);
    const sigma = Math.min(0.6, stats.volatility * Math.sqrt(days) * rangeWiden);
    return {
      days,
      perQuintal: Math.round(price),
      perKg: perKg(price),
      lowPerKg: perKg(price * Math.exp(-sigma)),
      highPerKg: perKg(price * Math.exp(sigma)),
      changePct: Math.round(changePct * 1000) / 10,
    };
  });

  // Advice: is waiting worth it after spoilage/storage losses?
  let best = { days: 0, gain: 0 };
  forecasts.forEach((f) => {
    const gain = (f.perQuintal * (1 - crop.spoilage * f.days)) / current - 1;
    if (gain > best.gain) best = { days: f.days, gain };
  });
  const confidence = confidenceLevel({ source: effectiveSource, points: stats.points, volatility: stats.volatility });
  const perishable = crop.spoilage >= 0.02;
  const minGain = confidence === "low" ? WAIT_THRESHOLD * 2 : WAIT_THRESHOLD;
  const wait = !perishable && best.gain >= minGain;
  const belowMsp = Boolean(crop.msp && current < crop.msp);

  const mid = forecasts.find((f) => f.days === 15);
  const trend = mid.changePct > 3 ? "up" : mid.changePct < -3 ? "down" : "flat";

  const topMarkets = [...records]
    .filter((r) => Number(r.modal) > 0)
    .sort((a, b) => Number(b.modal) - Number(a.modal))
    .slice(0, 5)
    .map((r) => ({ market: r.market, district: r.district, state: r.state, perKg: perKg(Number(r.modal)) }));

  return {
    cropId: crop.id,
    asOf: today.toISOString().slice(0, 10),
    source: effectiveSource,
    current: {
      perQuintal: Math.round(current),
      perKg: perKg(current),
      lowPerKg: perKg(Math.min(low, current)),
      highPerKg: perKg(Math.max(high, current)),
      markets: modals.length,
    },
    forecasts,
    trend,
    advice: {
      action: wait ? "wait" : "sell_now",
      waitDays: wait ? best.days : 0,
      expectedGainPct: wait ? Math.round(best.gain * 1000) / 10 : 0,
      perishable,
      sellWithinDays: perishable ? 3 : null,
      belowMsp,
    },
    msp: crop.msp ? { perKg: perKg(crop.msp), label: crop.mspLabel } : null,
    confidence,
    history: sortedHistory.slice(-60).map((p) => ({ date: p.date, perKg: perKg(Number(p.price)) })),
    topMarkets,
  };
}

const QUALITY_FACTOR = { A: 1.08, B: 1, C: 0.88 };

export function suggestedPricePerKg(prediction, quality = "B") {
  if (!prediction) return null;
  const factor = QUALITY_FACTOR[quality] ?? 1;
  return Math.round(prediction.current.perKg * factor * 10) / 10;
}

export function estimateEarnings(prediction, { quantityKg, quality = "B", transportCost = 0 }) {
  const qty = Number(quantityKg) || 0;
  const price = suggestedPricePerKg(prediction, quality) || 0;
  const gross = Math.round(qty * price);
  return { pricePerKg: price, gross, transport: Math.round(transportCost), net: Math.round(gross - transportCost) };
}

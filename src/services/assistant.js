// Krishi Sahayak – the farm helper behind the chat and voice assistant.
//
// 1. parseIntent() understands the request offline (crop, quantity, price, intent).
// 2. For price questions we run the price prediction and attach a price card.
// 3. If Supabase is configured and the user is logged in, the "assistant" Edge Function
//    (Claude) writes a friendly answer in the user's language using that data.
//    Otherwise we answer from translated templates, so it always works.

import { supabase } from "../lib/supabaseClient";
import { cropName } from "../data/crops";
import { parseIntent } from "./intent";
import { getPrediction } from "./marketData";
import { translate } from "../i18n";

export function adviceText(prediction, lang) {
  const t = (k, p) => translate(lang, k, p);
  if (!prediction) return "";
  const { advice } = prediction;
  if (advice.perishable) return t("priceAdvicePerishable", { days: advice.sellWithinDays });
  if (advice.action === "wait") return t("priceAdviceWait", { days: advice.waitDays });
  return t("priceAdviceSellNow");
}

export function priceSummaryText(prediction, lang) {
  const f15 = prediction.forecasts.find((f) => f.days === 15);
  return translate(lang, "intentPriceReply", {
    crop: cropName(prediction.cropId, lang),
    price: prediction.current.perKg,
    min: prediction.current.lowPerKg,
    max: prediction.current.highPerKg,
    future: f15.perKg,
    advice: adviceText(prediction, lang),
  });
}

function actionFor(parsed) {
  const q = new URLSearchParams();
  if (parsed.cropId) q.set("crop", parsed.cropId);
  if (parsed.quantityKg) q.set("qty", parsed.quantityKg);
  if (parsed.pricePerKg) q.set("price", parsed.pricePerKg);
  const qs = q.toString() ? `?${q}` : "";
  switch (parsed.intent) {
    case "sell":
      return { to: `/farmer${qs}`, labelKey: "goToSell" };
    case "buy":
      return { to: `/buyer${qs}`, labelKey: "goToBuy" };
    case "transport":
      return { to: `/transport${qs}`, labelKey: "goToTransport" };
    case "price":
      return parsed.cropId ? { to: `/prices${qs}`, labelKey: "goToPrices" } : null;
    default:
      return null;
  }
}

function localReply(parsed, prediction, lang) {
  const t = (k, p) => translate(lang, k, p);
  const crop = parsed.cropId ? cropName(parsed.cropId, lang) : "";
  switch (parsed.intent) {
    case "price":
      return prediction ? priceSummaryText(prediction, lang) : t("intentAskCrop");
    case "sell":
      return crop ? t("intentSellReply", { crop }) : t("intentSellReplyNoCrop");
    case "buy":
      return t("intentBuyReply");
    case "transport":
      return t("intentTransportReply");
    case "help":
      return t("intentHelpReply");
    case "greeting":
      return t("intentGreeting");
    default:
      return t("intentUnknownReply");
  }
}

function predictionContext(prediction, lang) {
  if (!prediction) return null;
  return {
    crop: cropName(prediction.cropId, "en"),
    cropLocal: cropName(prediction.cropId, lang),
    region: prediction.state || "All India",
    dataSource: prediction.source,
    todayPerKg: prediction.current.perKg,
    todayRangePerKg: [prediction.current.lowPerKg, prediction.current.highPerKg],
    marketsReporting: prediction.current.markets,
    forecastPerKg: prediction.forecasts.map((f) => ({ inDays: f.days, price: f.perKg, range: [f.lowPerKg, f.highPerKg] })),
    trend: prediction.trend,
    advice: prediction.advice,
    mspPerKg: prediction.msp?.perKg ?? null,
    confidence: prediction.confidence,
  };
}

async function remoteReply({ text, lang, history, parsed, prediction, page }) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null; // the Edge Function requires a signed-in user
  const messages = [...history.slice(-10), { role: "user", content: text }];
  const { data, error } = await supabase.functions.invoke("assistant", {
    body: {
      language: lang,
      messages,
      context: { page, intent: parsed.intent, quantityKg: parsed.quantityKg, pricePerKg: parsed.pricePerKg, prediction: predictionContext(prediction, lang) },
    },
  });
  if (error || !data?.reply) return null;
  return data.reply;
}

/**
 * @param {{text:string, lang:string, history?:{role:"user"|"assistant", content:string}[], state?:string, page?:string}} args
 * @returns {Promise<{text:string, prediction?:object, action?:{to:string,labelKey:string}, smart:boolean}>}
 */
export async function askAssistant({ text, lang, history = [], state = "", page = "" }) {
  const parsed = parseIntent(text);
  let prediction = null;
  if (parsed.cropId && (parsed.intent === "price" || parsed.intent === "sell")) {
    try {
      prediction = await getPrediction(parsed.cropId, { state });
    } catch {
      prediction = null;
    }
  }

  let reply = null;
  if (supabase) {
    try {
      reply = await remoteReply({ text, lang, history, parsed, prediction, page });
    } catch {
      reply = null;
    }
  }

  return {
    text: reply || localReply(parsed, prediction, lang),
    prediction: parsed.intent === "price" ? prediction : null,
    action: actionFor(parsed),
    smart: Boolean(reply),
  };
}

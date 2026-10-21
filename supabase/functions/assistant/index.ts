// Edge Function: assistant ("Krishi Sahayak")
// POST { language, messages: [{role, content}], context: { page, intent, prediction } }
// → { reply }
//
// Uses Claude to answer farmers in their own language, in short sentences that work
// when read aloud. Price numbers come only from `context.prediction`, which the app
// computes from mandi data, so the model never has to guess prices.
//
// Secrets: ANTHROPIC_API_KEY (required), ASSISTANT_MODEL (optional), ASSISTANT_DAILY_LIMIT (optional).

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const MODEL = Deno.env.get("ASSISTANT_MODEL") ?? "claude-opus-5-5";
const DAILY_LIMIT = Number(Deno.env.get("ASSISTANT_DAILY_LIMIT") ?? "60");
// Server-side refusal fallback is available on these models (Claude API only).
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam", mr: "Marathi", bn: "Bengali",
};

const SYSTEM_PROMPT = `You are "Krishi Sahayak", the chat and voice helper inside AgroTech, an Indian marketplace app where farmers sell crops, buyers buy directly from farmers, and transporters deliver.

Most people you talk to are small farmers, many with limited reading experience, and your reply is often read aloud by the phone's text-to-speech. So:
- Reply only in the language named in the request details, in its own script, using simple everyday village words. Common words like kg, MSP and OTP are fine.
- Keep it short: 2 to 4 plain sentences, under 70 words. No markdown, lists, tables or emojis, because they sound wrong when spoken.

Prices:
- Quote prices only from the market data given in the request details, in rupees per kg. If no market data is given, say you do not have today's rate and suggest opening the Mandi Prices page. Never make up numbers.
- Forecasts are estimates, so say "about" or "may be". Mention the advice (sell now or wait) and why in one short phrase.
- If the data says the price is below MSP, mention selling to the government procurement centre at MSP.

Using the app (explain in these simple steps when asked):
- Sell: open "Sell crop", choose the crop, enter quantity and price, tap "Add to marketplace". The app suggests a fair price.
- Buyer requests tab: a farmer can accept what a buyer needs. New orders tab: accept and ship a buyer's order.
- Buyer page: buy listed crops or post a requirement.
- Transport page: request a vehicle and see the cost estimate. Transporters take a job, tap "Start trip", then "Mark delivered".
- Mandi Prices page: today's rate, 7, 15 and 30 day forecast, and advice.
- The green microphone button lets people speak instead of typing.

For crop diseases, pests, fertiliser doses, loans or insurance, give at most one safe general tip and suggest calling the free Kisan Call Centre on 1800-180-1551 or visiting the nearest Krishi Vigyan Kendra. Never ask for or repeat bank details, OTPs or passwords.`;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

type ChatMessage = { role: "user" | "assistant"; content: string };

function cleanMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const msgs = input
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1000) })) as ChatMessage[];
  while (msgs.length && msgs[0].role !== "user") msgs.shift(); // must start with the user
  return msgs;
}

function requestDetails(language: string, context: Record<string, unknown>): string {
  const lines = [`Reply language: ${LANGUAGE_NAMES[language] ?? "English"}.`];
  if (context.page) lines.push(`The user is on the app page: ${String(context.page).slice(0, 40)}.`);
  if (context.intent) lines.push(`Detected request type: ${String(context.intent).slice(0, 20)}.`);
  if (context.quantityKg) lines.push(`Quantity mentioned: ${Number(context.quantityKg)} kg.`);
  if (context.pricePerKg) lines.push(`Price mentioned: ₹${Number(context.pricePerKg)} per kg.`);
  if (context.prediction) {
    lines.push(`Market data and forecast computed by the app (₹ per kg):\n${JSON.stringify(context.prediction).slice(0, 3000)}`);
  } else {
    lines.push("No market data was provided for this message.");
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  // Only signed-in users may use the assistant (it costs money per request).
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user) return json({ error: "Please log in" }, 401);

  const { data: count, error: usageError } = await admin.rpc("increment_assistant_usage", { p_user_id: auth.user.id });
  if (usageError) return json({ error: "Usage check failed" }, 500);
  if (Number(count) > DAILY_LIMIT) return json({ error: "daily_limit" }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const language = LANGUAGE_NAMES[String(body.language)] ? String(body.language) : "en";
  const messages = cleanMessages(body.messages);
  if (!messages.length) return json({ error: "No message" }, 400);
  const context = (body.context && typeof body.context === "object" ? body.context : {}) as Record<string, unknown>;

  const params: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 2048,
    output_config: { effort: "low" }, // short conversational replies; keeps latency and cost down
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: requestDetails(language, context) },
    ],
    messages,
  };
  if (FALLBACK_MODELS.has(MODEL)) {
    // If a safety classifier declines, the API retries on a suitable model automatically.
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }

  try {
    // deno-lint-ignore no-explicit-any
    const response = await anthropic.beta.messages.create(params as any);
    if (response.stop_reason === "refusal") return json({ reply: null, refused: true });
    const reply = response.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { type: string; text?: string }) => b.text ?? "")
      .join("")
      .trim();
    return json({ reply: reply || null });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "ANTHROPIC_API_KEY is invalid" }, 500);
    if (error instanceof Anthropic.APIError) return json({ error: `Claude API error ${error.status}` }, 502);
    return json({ error: "Assistant unavailable" }, 502);
  }
});

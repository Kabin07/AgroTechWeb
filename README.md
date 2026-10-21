# 🌾 AgroTech – Farmer Marketplace

A multilingual marketplace where **farmers** sell crops, **buyers** buy directly, and
**transporters** deliver. It includes live mandi prices with a **price prediction**, and a
**chat and voice assistant** for farmers who find reading hard.

- 8 languages: English, हिन्दी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, मराठी, বাংলা
- Voice input and read-aloud on every key screen (browser Web Speech API, no extra cost)
- Live mandi prices from the Government of India **Agmarknet** feed (data.gov.in)
- Price forecast for 7 / 15 / 30 days with "sell now / wait" advice, MSP check, and earnings after transport cost
- Supabase backend: login, Postgres with row-level security, realtime updates, Edge Functions
- Works now in **demo mode** (no backend needed); add Supabase keys to go live

---

## Quick start (demo mode)

```bash
npm install
npm start          # http://localhost:3000
```

Without Supabase keys, data is stored in the browser.
Open two tabs to try a full deal: one tab logged in as a farmer and one as a buyer (each tab is its own user). Changes appear in the other tab instantly.

```bash
npm test           # 54 tests: prices, voice/intent parsing, order flow, translations
npm run build      # production build
```

---

## Architecture

```
 Browser (React)                                Supabase
 ┌──────────────────────────────┐              ┌─────────────────────────────────────┐
 │ Pages: Home, Prices, Farmer, │  supabase-js │ Auth (phone OTP / email)            │
 │ Buyer, Transport, Login      │─────────────▶│ Postgres + RLS                      │
 │                              │   realtime   │   profiles, crop_listings,          │
 │ Chat + voice assistant       │◀─────────────│   buyer_requests, orders,           │
 │  • intent parser (offline)   │              │   transport_jobs, market_prices     │
 │  • Web Speech API (voice)    │              │ SQL functions (atomic order flow)   │
 │ Price predictor (pure JS)    │              │ Edge Functions                      │
 │ i18n (8 languages)           │─────────────▶│   market-prices ──▶ data.gov.in     │
 └──────────────────────────────┘              │   assistant ──────▶ Claude API      │
                                               └─────────────────────────────────────┘
```

| Layer | Where | Notes |
|---|---|---|
| Backend interface | `src/services/backend/` | `supabaseBackend.js` and `localBackend.js` (demo) share the same methods |
| Database schema, security, order flow | `supabase/migrations/20261021000000_init.sql` | Orders and deliveries go through SQL functions, so stock can't be oversold |
| Mandi prices | `supabase/functions/market-prices` | Fetches Agmarknet, stores each day, returns today's prices and history |
| AI assistant | `supabase/functions/assistant` | Claude replies in the user's language; requires login; daily limit per user |
| Price prediction | `src/pricing/predictor.js` | Explainable model (see below) |
| Voice & intents | `src/hooks/useSpeech.js`, `src/services/intent.js` | Understands "500 கிலோ வெங்காயம் விற்க", "टमाटर का भाव", "book a truck"… |
| Translations | `src/i18n/translations/*.js` | Tests fail if any language is missing a key |

### How the price prediction works

1. **Today's price**: the median modal price across all reporting mandis (₹/quintal → ₹/kg).
2. **Trend**: a weighted regression over the last 90 days of stored prices. Recent days count more, and the trend's effect fades so short spikes don't dominate.
3. **Seasonality**: each crop's monthly pattern (harvest months are cheaper), from `src/data/crops.js`.
4. **Range**: the crop's volatility × √days. It's wider when there is little data.
5. **Advice**: compares waiting (forecast minus spoilage) with selling now. Fresh vegetables are never told to wait. Prices below MSP are flagged.
6. **Confidence**: high, medium or low, based on how much live data is available.

When live data isn't available, the app falls back to a seasonal estimate. It is clearly labelled *"Estimate (live data not available)"* and marked low confidence.

---

## Setup status (project `fwyxcnytpclcyjmsbojn`)

| Step | Status |
|---|---|
| App points at Supabase (`.env` URL + publishable key) | ✅ Done |
| Email login enabled, "Confirm email" off for testing | ✅ Done (turn "Confirm email" back on before launch) |
| Database schema (`supabase/migrations/…_init.sql` run in SQL editor) | ✅ Done |
| Website on GitHub Pages | ⬜ One click: Settings → Pages → Source: **GitHub Actions** |
| Site URL (Authentication → URL Configuration) | ⬜ `https://kabin07.github.io/AgroTechWeb/` (+ `http://localhost:3000` under Redirect URLs) |
| Edge Functions + secrets | ⬜ Add GitHub secrets (below), then run **Deploy Supabase functions** |
| Mobile OTP (SMS provider) | ⬜ Optional |

## Automatic deployment (GitHub Actions)

| Workflow | What it does | When |
|---|---|---|
| **CI** | Runs all tests and a strict production build | Every push and pull request |
| **Deploy website** | Publishes the app to **https://kabin07.github.io/AgroTechWeb/** | Every push to `main` (or run manually) |
| **Deploy Supabase functions** | Sets function secrets and deploys `market-prices` + `assistant` | Push to `main` touching `supabase/functions`, or run manually |
| **Refresh mandi prices** | Pulls today's Agmarknet prices for all 14 crops into the database | Twice a day (about 12:10 and 19:10 IST) |

Add these under **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Needed for | Where to get it |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Deploying functions | supabase.com → Account (top right) → Access Tokens |
| `DATA_GOV_API_KEY` | Live mandi prices | data.gov.in → Sign up → My Account → API key (free) |
| `ANTHROPIC_API_KEY` | AI chat replies | console.anthropic.com → API Keys |
| `CRON_SECRET` | Scheduled price refresh | Any long random text you make up |

Then open **Actions → Deploy Supabase functions → Run workflow**, followed by **Actions → Refresh mandi prices → Run workflow** to load today's prices.

## Going live with Supabase

### 1. Create the project and database
1. Create a project at <https://supabase.com>.
2. Run the schema with **either** of these:
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - Dashboard: SQL Editor → paste `supabase/migrations/20261021000000_init.sql` → Run

### 2. Connect the web app
```bash
cp .env.example .env.local
# REACT_APP_SUPABASE_URL=https://<ref>.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=<anon or publishable key>
npm start
```
The yellow "Demo mode" banner disappears once the keys are set.

### 3. Login options (Supabase → Authentication → Providers)
- **Email + password**: works out of the box (turn off "Confirm email" for faster testing).
- **Mobile OTP** (best for farmers): enable **Phone** and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal). SMS costs are charged by that provider.
- Add your site URL under Authentication → URL Configuration.

### 4. Deploy the Edge Functions
```bash
npx supabase secrets set DATA_GOV_API_KEY=<key>      # free: data.gov.in → sign up → My Account → API key
npx supabase secrets set ANTHROPIC_API_KEY=<key>     # console.anthropic.com
npx supabase secrets set CRON_SECRET=<any-long-random-string>
# optional: ASSISTANT_MODEL (default claude-opus-5-5), ASSISTANT_DAILY_LIMIT (default 60 per user)

npx supabase functions deploy market-prices --no-verify-jwt
npx supabase functions deploy assistant --no-verify-jwt
```
Both functions do their own access checks. `market-prices` only accepts known crops and fetches at most every 3 hours. `assistant` requires a logged-in user and enforces a daily limit.

### 5. Refresh prices daily
The **Refresh mandi prices** GitHub workflow does this automatically. (Alternative inside Supabase: `supabase/optional/schedule_price_refresh.sql`.) Price history then grows every day even when nobody opens the app, which makes forecasts more accurate.

---

## What needs what

| Feature | Works now (demo) | Needs |
|---|---|---|
| Marketplace, orders, transport flow | ✅ on one device | Supabase project for multiple users and devices |
| Realtime updates between users | ✅ between tabs | Supabase (Realtime is enabled by the migration) |
| Live mandi prices | Seasonal estimate only | `DATA_GOV_API_KEY` (free) |
| Accurate trends | – | A few weeks of stored daily prices (enable step 5) |
| 8 languages, offline voice commands | ✅ | – |
| Voice input | ✅ Chrome, Edge, Android Chrome | Firefox doesn't support voice input; Safari is partial |
| Read-aloud in Indian languages | ✅ where the phone has the voice | Android usually has hi/ta/te/kn/ml/mr/bn voices; some desktops don't |
| Smart AI chat replies | Built-in template replies | `ANTHROPIC_API_KEY` + Supabase login (each message has a small API cost) |
| Mobile OTP login | – | SMS provider in Supabase (paid per SMS) |

**Limits to know**
- Agmarknet reports only the markets that sent data that day. Some crops or states may have few markets, and the forecast then shows lower confidence.
- Transport costs are planning estimates (₹/km rates in `src/pricing/transportCost.js`) and the user enters the distance. A maps API could fill distance automatically later.
- MSP values in `src/data/crops.js` must be updated each season (Kharif 2025-26 and Rabi 2026-27 are included).
- Payments are not included. Orders record the agreed amount, and payment happens off-platform (UPI or cash). Razorpay or UPI integration can be added next.

---

## Project structure

```
src/
  App.js                    routes + providers
  config.js                 env variables
  data/crops.js             14 crops: names in 8 languages, aliases, MSP, seasonality
  pricing/                  predictor.js, transportCost.js (+ tests)
  services/
    backend/                supabaseBackend.js, localBackend.js, errors.js
    marketData.js           live → saved → estimate fallback chain
    agmarknet.js            data.gov.in parsing
    intent.js               multilingual voice/text understanding
    assistant.js            chat logic (local + Claude)
  hooks/useSpeech.js        speech-to-text and text-to-speech
  i18n/                     language provider + 8 translation files
  context/                  Auth, Data (realtime), Toast
  pages/                    Home, Auth, Prices, Farmer, Buyer, Transport, Profile
  components/               Navbar, ChatAssistant, PredictionCard, PriceChart, OrderHistory, common
.github/workflows/          CI, website deploy, Supabase deploy, daily price refresh
supabase/
  migrations/               schema, RLS, SQL functions, realtime
  functions/                market-prices, assistant, _shared
  optional/                 daily price refresh schedule
```

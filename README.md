# PlantApp

Point your camera at a plant. Get back: what it is, how to care for it, whether it looks
healthy right now, and whether you can eat it (and why you'd want to, or definitely shouldn't).

## How it works

```
┌─────────────────┐        photos (base64)        ┌──────────────────┐        ┌────────────┐
│   Mobile app     │ ─────────────────────────────▶│   Node backend    │ ─────▶ │  Gemini    │
│  (Expo / RN)     │◀───────────────────────────── │  (Express proxy)  │◀────── │  3.6 Flash │
└─────────────────┘        structured JSON          └──────────────────┘        └────────────┘
        │
        ▼
  SQLite (on-device history)
```

- **mobile/** — the Expo (React Native + TypeScript) app. Camera capture, results UI, local
  scan history, ads, and the subscription paywall.
- **server/** — a small Express backend. This is where your Gemini API key lives. It's the
  only thing allowed to call Gemini, and it enforces the free daily scan cap.

**Why a backend at all, instead of calling Gemini straight from the phone?** Any API key baked
into a mobile app binary can be extracted and stolen — someone would run up your Gemini bill
on your key within hours of finding it. The backend is non-negotiable for a real launch.

## Key decisions (and why)

| Decision | Choice | Why |
|---|---|---|
| App framework | Expo / React Native | One TypeScript codebase → iOS + Android. Mature libraries exist for every risky piece here (camera, AdMob, RevenueCat). |
| AI model | **Gemini 3.6 Flash** | Native multimodal vision + enforced JSON-schema output in one call, cheap enough to sustain an ads-supported free tier, generous free quota to start. Swap to `gemini-3.6-pro` (one env var, `server/.env`) if you want higher accuracy on rare species at a higher cost. Verified working end-to-end against the live API while building this. |
| Ads | Google AdMob | Banner on Home/Results, one interstitial every N scans (configurable, `EXPO_PUBLIC_INTERSTITIAL_EVERY_N_SCANS`), never shown to Pro users. |
| Subscriptions | RevenueCat | Wraps Apple/Google billing so you don't hand-roll receipt validation. One entitlement (`pro`) = "ads off, unlimited scans." |
| Local storage | SQLite (`expo-sqlite`) | Scan history survives app restarts and works fully offline, even though a new *scan* needs network. |
| Cost protection | Server-side daily free-scan cap | Ads + an LLM call per scan means a single heavy free user can cost you more than they'll ever generate in ad revenue. The cap keeps that bounded. |

## Getting it running locally

### 1. Backend

```bash
cd server
cp .env.example .env
# paste your key from https://aistudio.google.com/app/apikey into GEMINI_API_KEY
npm install
npm run dev
```

Leaves you with `http://localhost:8787`. Hit `http://localhost:8787/health` to confirm it's up.

### 2. Mobile app

```bash
cd mobile
cp .env.example .env
# if testing on a physical phone, set EXPO_PUBLIC_API_BASE_URL to your machine's
# LAN IP, e.g. http://192.168.1.23:8787 — "localhost" on a phone means the phone itself
npm install
npm run start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` / `a` for a simulator/emulator.

The app runs fully out of the box with **no AdMob or RevenueCat accounts required**:
- Ads default to Google's public test ad unit IDs, so banners/interstitials show real test
  creatives without an AdMob account.
- Subscriptions fall back to a "mock free mode" (`mobile/src/services/subscriptions.ts`) when
  no RevenueCat key is set — the paywall screen still renders, purchases are just disabled.

## Turning this into a real, published app

This scaffold gets you a fully working product loop. Three things need your own accounts
before it can ship, because I can't create these on your behalf:

1. **Google AdMob** (https://apps.admob.com) — create an app + ad units, then replace the
   `EXPO_PUBLIC_ADMOB_*` values in `mobile/.env` and the `androidAppId`/`iosAppId` in
   `mobile/app.json`.
2. **RevenueCat** (https://app.revenuecat.com) — connect it to App Store Connect + Google Play
   Console, create a subscription product (e.g. "PlantApp Pro", monthly + annual), and an
   entitlement called `pro`. Drop the RevenueCat keys into `mobile/.env`.
3. **Deploy the server somewhere** (Render, Fly.io, Railway, a small VPS — anything that runs
   Node). Point `EXPO_PUBLIC_API_BASE_URL` at it. Put `GEMINI_API_KEY` in that host's secret
   env vars, never in the mobile build.

Then, before submitting to the stores:
- Replace the placeholder icons/splash in `mobile/assets/` (currently 1x1 px placeholders —
  they exist only so the dev server doesn't error on a missing file).
- Write a real privacy policy (required by both stores, and by AdMob) covering: photos sent to
  Gemini for analysis, and anonymous device usage tracking for the free-scan cap. Link it from
  `app/settings.tsx`.
- Harden `X-Pro-Entitlement` (see `server/src/middleware/freeScanLimit.ts`) — right now the
  server trusts a client-sent header for the Pro bypass, which is fine for development but
  spoofable. Before launch, verify entitlement server-side via a RevenueCat webhook or their
  REST API instead.
- Swap the in-memory rate-limit `Map` in `freeScanLimit.ts` for Redis (or similar) once you're
  running more than one server instance.
- Run `npx expo install --fix` after any dependency changes to keep native module versions
  aligned with your Expo SDK.

## A note on the edibility feature

This is the one place a wrong answer can genuinely hurt someone — several toxic plants have
edible look-alikes (poison hemlock vs. wild carrot, for one). The system prompt in
`server/src/services/gemini.ts` is deliberately conservative: it only marks something edible
when species confidence is reasonably high, and it always attaches a safety disclaimer telling
the user to get a positive ID confirmed by a local expert before eating anything wild. Please
don't relax that prompt without thinking hard about the failure mode.

## Project layout

```
PlantApp/
├── server/                        Express backend (holds the Gemini key)
│   ├── src/
│   │   ├── index.ts               App entry, CORS, rate limiting
│   │   ├── routes/analyze.ts      POST /api/analyze
│   │   ├── services/gemini.ts     Prompt + JSON schema + Gemini call
│   │   ├── middleware/freeScanLimit.ts
│   │   └── types.ts               PlantAnalysis shape (keep in sync with mobile)
│   └── .env.example
└── mobile/                        Expo app
    ├── app/                       Screens (expo-router, file-based)
    │   ├── index.tsx              Home
    │   ├── capture.tsx            Photo picker (camera/library, up to 3 photos)
    │   ├── analyzing.tsx          Loading state, calls the backend
    │   ├── result/[id].tsx        Identification / Care / Health / Edibility
    │   ├── history.tsx
    │   ├── paywall.tsx
    │   └── settings.tsx
    ├── src/
    │   ├── components/            AdBanner, HealthBadge, SectionCard, PrimaryButton
    │   ├── services/              api, storage (SQLite), ads, subscriptions, usageLimiter
    │   ├── state/useAppStore.ts   In-flight capture state (zustand)
    │   └── types/plant.ts         PlantAnalysis shape (keep in sync with server)
    └── .env.example
```

### Keeping types in sync

`server/src/types.ts` and `mobile/src/types/plant.ts` describe the exact same JSON shape and
are currently two hand-maintained copies (simplest option for two independently-deployed
packages). If this grows, pull them into a shared `packages/shared-types` workspace instead of
hand-syncing.

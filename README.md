# PlantApp

Point your camera at a plant. Get back: what it is, how to care for it, whether it looks
healthy right now, and whether you can eat it (and why you'd want to, or definitely shouldn't).

## How it works

```
┌─────────────────┐        photos (base64)        ┌──────────────────┐        ┌────────────┐
│   Mobile app     │ ─────────────────────────────▶│   Node backend    │ ─────▶ │  Gemini 3.5│
│  (Expo / RN)     │◀───────────────────────────── │  (Express proxy)  │◀────── │ Flash-Lite │
└─────────────────┘        structured JSON          └──────────────────┘        └────────────┘
        │
        ▼
  SQLite (on-device history + My Plants) → local watering reminders
```

- **mobile/** — the Expo (React Native + TypeScript) app. Camera capture, results UI, local
  scan history, My Plants with watering reminders, ads, and the one-time "Remove ads" purchase.
- **server/** — a small Express backend. This is where your Gemini API key lives. It's the
  only thing allowed to call Gemini, and it enforces the daily scan cap.

There are **no user accounts**. Everything personal (scans, plants, reminder times) lives on the
phone; reminders are local notifications scheduled by the phone itself, so no push server is
needed; the "Remove ads" purchase is tied to the user's App Store / Play account via RevenueCat.

**Why a backend at all, instead of calling Gemini straight from the phone?** Any API key baked
into a mobile app binary can be extracted and stolen — someone would run up your Gemini bill
on your key within hours of finding it. The backend is non-negotiable for a real launch.

## Key decisions (and why)

| Decision | Choice | Why |
|---|---|---|
| App framework | Expo / React Native | One TypeScript codebase → iOS + Android. Mature libraries exist for every risky piece here (camera, AdMob, RevenueCat). |
| AI model | **Gemini 3.5 Flash-Lite** | Multimodal vision + enforced JSON-schema output in one call. With minimal thinking, medium media resolution, short answers and photos resized to 1024px on the phone, a scan measured **~0.22¢** against the live API. Swap to `gemini-3.6-flash` (one env var, `server/.env`) for more accuracy on tricky species at ~2-3x the cost. The server logs every scan's real token count and cost. |
| Ads | Google AdMob | Gentle by design: banners on browse screens only (Home, My Plants, History, Result), **no interstitials**. The first `EXPO_PUBLIC_FREE_SCANS_PER_DAY` (3) scans each day are free; each extra scan is unlocked by an opt-in rewarded video that plays *while* Gemini works, so it adds no waiting. Policy lives in `mobile/src/services/usageLimiter.ts` and `ads.ts`. |
| Purchases | RevenueCat | One non-consumable "Remove ads" product (entitlement `ad_free`): no banners, no videos. Still subject to the daily cap — a one-time payment can't fund unlimited AI calls. |
| Watering reminders | `expo-notifications` (local) | Gemini returns `care.water.intervalDays`; "Add to My Plants" schedules a reminder at the user's chosen hour on the due day. Rebuilt from the plants table on every app launch. |
| Local storage | SQLite (`expo-sqlite`) | Scan history and My Plants survive app restarts and work fully offline, even though a new *scan* needs network. Photos are resized and copied into the documents dir so the OS can't purge them. |
| Cost protection | Server-side daily scan cap (15) | Applies to everyone. Bounds the worst-case Gemini bill per device. |

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
- Ads default to Google's public test ad unit IDs, so banners and rewarded videos show real
  test creatives without an AdMob account.
- Purchases fall back to a "mock" mode (`mobile/src/services/subscriptions.ts`) when no
  RevenueCat key is set — the Remove ads screen still renders, purchasing is just disabled.

The app uses native modules (AdMob, notifications, image manipulation), so it runs in a
development build (`npx expo run:android` / `run:ios`), not Expo Go. Rebuild after adding any
native dependency.

## Turning this into a real, published app

This scaffold gets you a fully working product loop. Three things need your own accounts
before it can ship, because I can't create these on your behalf:

1. **Google AdMob** (https://apps.admob.com) — create an app + ad units, then replace the
   `EXPO_PUBLIC_ADMOB_*` values in `mobile/.env` and the `androidAppId`/`iosAppId` in
   `mobile/app.json`.
2. **RevenueCat** (https://app.revenuecat.com) — connect it to App Store Connect + Google Play
   Console, create a one-time non-consumable product (e.g. "Remove ads", $2.99) and an
   entitlement called `ad_free`. Drop the RevenueCat keys into `mobile/.env`.
3. **Deploy the server somewhere** (Render, Fly.io, Railway, a small VPS — anything that runs
   Node). Point `EXPO_PUBLIC_API_BASE_URL` at it. Put `GEMINI_API_KEY` in that host's secret
   env vars, never in the mobile build.
4. **Turn on Gemini billing** before launch. The free tier's daily quota is shared by all your
   users, lets Google use submitted photos, and isn't allowed for apps serving the EEA/UK/CH.

Then, before submitting to the stores:
- Replace the placeholder icons/splash in `mobile/assets/` (currently 1x1 px placeholders —
  they exist only so the dev server doesn't error on a missing file).
- Write a real privacy policy (required by both stores, and by AdMob) covering: photos sent to
  Gemini for analysis, and anonymous device usage tracking for the free-scan cap. Link it from
  `app/settings.tsx`.
- Rewarded-video unlocks are enforced on the phone only; the server just guarantees the daily
  cap. If people start bypassing videos at scale, add AdMob server-side verification (SSV).
- Swap the in-memory rate-limit `Map` in `dailyScanCap.ts` for Redis (or similar) once you're
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
│   │   ├── middleware/dailyScanCap.ts
│   │   └── types.ts               PlantAnalysis shape (keep in sync with mobile)
│   └── .env.example
└── mobile/                        Expo app
    ├── app/                       Screens (expo-router, file-based)
    │   ├── index.tsx              Home
    │   ├── capture.tsx            Photo picker (camera/library, up to 3 photos)
    │   ├── analyzing.tsx          Resizes photos, calls the backend, plays rewarded video
    │   ├── result/[id].tsx        Identification / Care / Health / Edibility, Add to My Plants
    │   ├── plants.tsx             My Plants (thirstiest first)
    │   ├── plant/[id].tsx         One plant: watered button, interval, rename
    │   ├── history.tsx
    │   ├── remove-ads.tsx
    │   └── settings.tsx           Reminder time, scans, ads
    ├── src/
    │   ├── components/            AdBanner, HealthBadge, WaterStatusPill, SectionCard, PrimaryButton
    │   ├── services/              api, storage (SQLite), images, ads, subscriptions, usageLimiter,
    │   │                          garden, watering, reminders
    │   ├── state/useAppStore.ts   In-flight scan + ad-free state (zustand)
    │   └── types/plant.ts         PlantAnalysis shape (keep in sync with server)
    └── .env.example
```

### Keeping types in sync

`server/src/types.ts` and `mobile/src/types/plant.ts` describe the exact same JSON shape and
are currently two hand-maintained copies (simplest option for two independently-deployed
packages). If this grows, pull them into a shared `packages/shared-types` workspace instead of
hand-syncing.

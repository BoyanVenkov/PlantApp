# Leafkin

*(repo: PlantApp — app ID `com.leafkin.app`)*

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
  scan history, My Plants with watering reminders, ads, and 14 UI languages.
- **server/** — a small Express backend. This is where your Gemini API key lives. It's the
  only thing allowed to call Gemini, and it enforces the daily scan cap.

There are **no user accounts**. Everything personal (scans, plants, reminder times) lives on the
phone; reminders are local notifications scheduled by the phone itself, so no push server is
needed.

**Why a backend at all, instead of calling Gemini straight from the phone?** Any API key baked
into a mobile app binary can be extracted and stolen — someone would run up your Gemini bill
on your key within hours of finding it. The backend is non-negotiable for a real launch.

## Key decisions (and why)

| Decision | Choice | Why |
|---|---|---|
| App framework | Expo / React Native | One TypeScript codebase → iOS + Android. Mature libraries exist for every risky piece here (camera, AdMob, notifications). |
| AI model | **Gemini 3.5 Flash-Lite** | Multimodal vision + enforced JSON-schema output in one call. With minimal thinking, medium media resolution, short answers and photos resized to 1024px on the phone, a scan measured **~0.22¢** against the live API. Swap to `gemini-3.6-flash` (one env var, `server/.env`) for more accuracy on tricky species at ~2-3x the cost. The server logs every scan's real token count and cost. |
| Ads | Google AdMob | Gentle by design, **no interstitials**: banners on Home and My Plants, and labeled native ad cards styled like the app's own cards (one on Result, one in History after the third scan). The first `EXPO_PUBLIC_FREE_SCANS_PER_DAY` (2) scans each day are free; each extra scan is unlocked by an opt-in rewarded video that plays *while* Gemini works, so it adds no waiting. Policy lives in `mobile/src/services/usageLimiter.ts` and `ads.ts`. There is no paid tier. |
| Languages | `i18next` + `expo-localization` | 14 UI languages (EU + English, Japanese, Korean, plus Russian/Ukrainian/Turkish for the large communities in the EU) in `mobile/src/i18n/locales/`, defaulting to the phone's language, switchable from the 🌐 pill on Home. The app sends the language with each scan and Gemini writes its answer in it. |
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

The app runs fully out of the box with **no AdMob account required**: ads default to
Google's public test ad unit IDs, so banners, native cards and rewarded videos show real test
creatives.

To preview in a browser on your PC, run `npm run dev` in the repo root — it starts the server
and the web build together. Ads, notifications and SQLite are phone-only, so the `*.web.ts(x)`
files stand in for them there (no ads, localStorage instead of SQLite).

The app uses native modules (AdMob, notifications, image manipulation), so it runs in a
development build (`npx expo run:android` / `run:ios`), not Expo Go. Rebuild after adding any
native dependency.

## Turning this into a real, published app

### Testing with a small group (closed testing / TestFlight)

1. **Deploy the server.** `server/Dockerfile` runs on any container host (Railway, Render,
   Fly.io). Set `GEMINI_API_KEY` (and optionally the other `server/.env.example` values) in the
   host's dashboard; the host provides `PORT`. Check `https://<your-server>/health`.
2. **Point the app at it**: put the server's HTTPS URL in `EXPO_PUBLIC_API_BASE_URL` in
   `mobile/eas.json` (both build profiles). `mobile/.env` is gitignored, so EAS cloud builds
   never see it — `eas.json` is where build-time settings live.
3. **Build** (from `mobile/`): `npx eas-cli login`, `npx eas-cli init` (once), then
   - Android test APK you can send to anyone directly: `npx eas-cli build -p android --profile preview`
   - Store builds for Play closed testing / TestFlight: `npx eas-cli build -p all --profile production`,
     then `npx eas-cli submit -p android` / `-p ios`.
4. **Invite testers**: Play Console → Testing → Closed testing (new personal developer accounts
   need 12+ testers opted in for 14 days before production access); App Store Connect →
   TestFlight.

Keep Google's **test** ad IDs during testing — testers tapping real ads can get an AdMob
account suspended for invalid traffic.

### Before a public launch

1. **Google AdMob** (https://apps.admob.com) — create an app + ad units (banner, native,
   rewarded), then put the IDs in `mobile/eas.json` (`EXPO_PUBLIC_ADMOB_*`) and the
   `androidAppId`/`iosAppId` in `mobile/app.json`. Add Google's consent message (UMP, via
   `AdsConsent` in `react-native-google-mobile-ads`) — required for users in the EEA/UK — and the
   iOS App Tracking Transparency prompt.
2. **Turn on Gemini billing**. The free tier's daily quota is shared by all your users, lets
   Google use submitted photos, and isn't allowed for apps serving the EEA/UK/CH. Set a budget
   alert on the Google Cloud project too.

Then, before submitting to the stores:
- App icon, adaptive icon, favicon and splash (`splash-icon.png`) are all drawn from
  `mobile/assets/favicon.svg` (the Leafkin leaf).
- The privacy policy lives in `server/public/privacy.html`, is served at `/privacy` and linked
  from Settings. Fill in its operator/contact placeholders and use that URL in both store
  listings.
- Crash reporting: create a Sentry project, put its DSN in `EXPO_PUBLIC_SENTRY_DSN` in
  `mobile/eas.json`. For readable stack traces, also add the `organization`/`project` options to
  the `@sentry/react-native` plugin in `app.json`, store `SENTRY_AUTH_TOKEN` as an EAS secret, and
  remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json`.
- Set `EXPO_PUBLIC_FEEDBACK_EMAIL` in `mobile/eas.json` to show the "Send feedback" button.
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
    │   └── settings.tsx           Language, reminder time, scans, ads
    ├── src/
    │   ├── components/            AdBanner, NativeAdCard, LanguagePicker, HealthBadge,
    │   │                          WaterStatusPill, SectionCard, PrimaryButton
    │   ├── i18n/                  i18next setup + one JSON file per language
    │   ├── services/              api, storage (SQLite), images, ads, usageLimiter,
    │   │                          garden, watering, reminders (+ *.web.ts browser stand-ins)
    │   ├── state/useAppStore.ts   In-flight scan state (zustand)
    │   └── types/plant.ts         PlantAnalysis shape (keep in sync with server)
    └── .env.example
```

### Keeping types in sync

`server/src/types.ts` and `mobile/src/types/plant.ts` describe the exact same JSON shape and
are currently two hand-maintained copies (simplest option for two independently-deployed
packages). If this grows, pull them into a shared `packages/shared-types` workspace instead of
hand-syncing.

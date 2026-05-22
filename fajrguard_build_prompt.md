# FajrGuard — Full Build Prompt
# Use this with Claude Code, Cursor, or any AI coding assistant
# Run: claude "$(cat fajrguard_build_prompt.md)"

---

## PROJECT OVERVIEW

Build **FajrGuard** — a React Native mobile app (Expo) that:
1. Reminds Muslims to pray all 5 daily prayers (especially Fajr)
2. Fires an escalating alarm that gets progressively louder/more intense
3. The ONLY way to stop the alarm is to perform wudu (Islamic face washing) and have it verified via on-device AI face analysis
4. Uses TensorFlow Lite MobileNetV2 classifier (bundled in app) to detect moisture on the user's face via front camera
5. Separate identity verification ensures only the registered user can stop the alarm

---

## TECH STACK

- **Mobile:** React Native + Expo SDK 51 (managed workflow)
- **Language:** TypeScript throughout
- **Styling:** NativeWind v4 (Tailwind for RN)
- **Camera:** react-native-vision-camera v4
- **ML Inference:** react-native-fast-tflite
- **Face Detection:** @mediapipe/face_detection via vision camera frame processor
- **Alarm:** expo-notifications (critical alerts) + expo-av (audio)
- **Background Tasks:** expo-task-manager + expo-background-fetch
- **Local DB:** expo-sqlite (Drizzle ORM)
- **Secure Storage:** expo-secure-store (face embeddings)
- **Backend:** FastAPI (Python 3.11)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Prayer Times:** Aladhan.com API (cached locally)
- **State Management:** Zustand
- **Navigation:** Expo Router (file-based)
- **Deploy Mobile:** Expo EAS Build
- **Deploy Backend:** Railway

---

## MONOREPO STRUCTURE

```
fajrguard/
├── mobile/                          # Expo React Native app
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── register.tsx         # Face enrollment screen
│   │   │   └── onboarding.tsx       # App intro + permissions
│   │   ├── (tabs)/
│   │   │   ├── index.tsx            # Dashboard / prayer times
│   │   │   ├── streak.tsx           # Prayer streak tracker
│   │   │   └── settings.tsx         # User settings
│   │   ├── alarm.tsx                # Full-screen alarm screen
│   │   ├── verify.tsx               # Wudu verification screen
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── PrayerCard.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── WuduCamera.tsx           # Camera + TFLite inference
│   │   ├── AlarmOverlay.tsx
│   │   ├── StreakCalendar.tsx
│   │   └── IslamicPattern.tsx       # Decorative SVG background
│   ├── hooks/
│   │   ├── usePrayerTimes.ts        # Fetch + cache aladhan.com
│   │   ├── useAlarmEngine.ts        # Alarm scheduling + escalation
│   │   ├── useWuduDetector.ts       # TFLite inference hook
│   │   ├── useFaceVerification.ts   # FaceNet embedding comparison
│   │   └── useStreak.ts             # Prayer streak logic
│   ├── services/
│   │   ├── prayerAPI.ts             # Aladhan.com wrapper
│   │   ├── supabase.ts              # Supabase client
│   │   ├── faceEmbedding.ts         # FaceNet on-device embedding
│   │   └── storage.ts               # SQLite operations (Drizzle)
│   ├── store/
│   │   ├── alarmStore.ts            # Zustand alarm state
│   │   ├── prayerStore.ts           # Prayer times + streak state
│   │   └── userStore.ts             # User profile state
│   ├── assets/
│   │   ├── models/
│   │   │   ├── wudu_detector.tflite # Wet/dry face classifier
│   │   │   └── facenet_mobile.tflite# Face embedding model
│   │   ├── audio/
│   │   │   ├── adhan_fajr.mp3       # Fajr-specific adhan
│   │   │   └── adhan.mp3            # Regular adhan
│   │   └── fonts/
│   ├── constants/
│   │   ├── theme.ts                 # Colors, typography
│   │   └── prayers.ts               # Prayer metadata, Arabic names
│   ├── db/
│   │   ├── schema.ts                # Drizzle schema
│   │   └── migrations/
│   ├── tasks/
│   │   └── alarmTask.ts             # Background alarm task
│   ├── app.json
│   ├── babel.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                         # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py                # Settings from env
│   │   ├── routes/
│   │   │   ├── prayer_times.py      # Proxy + Redis cache aladhan.com
│   │   │   ├── auth.py              # Supabase JWT validation
│   │   │   ├── dataset.py           # Community wet/dry face contribution
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── aladhan.py           # Prayer times fetcher
│   │   │   ├── cache.py             # Redis caching layer
│   │   │   └── image_validator.py   # Validate contributed images
│   │   └── models/
│   │       └── schemas.py           # Pydantic models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.json
│
└── ml/                              # Python ML pipeline (run on Kaggle/Colab)
    │                                   # See fajrguard_wudu_dataset.ipynb
    ├── collect/
    │   ├── scrape_benchmark.py      # Download real wet-face benchmark images
    │   └── download_celeba.py        # Get CelebA via kagglehub
    ├── generate/
    │   └── wetness_synthesis.py     # PHYSICS-BASED procedural wetness (no SD)
    │                                 #   6-pass compositing: wet skin tone,
    │                                 #   contour sheen, edge pooling, caustic
    │                                 #   droplets, micro-texture, gravity streaks
    ├── train/
    │   ├── train_wudu_model.py      # MobileNetV2 transfer learning
    │   └── augment.py               # Albumentations pipeline
    ├── export/
    │   └── export_tflite.py         # INT8 quantized → wudu_detector.tflite
    └── evaluate/
        ├── metrics.py               # Confusion matrix, ROC curve
        └── benchmark_real.py        # Auto-compare generated vs scraped real wet faces
```

---

## SCREEN-BY-SCREEN SPECIFICATION

### 1. Onboarding Screen (`onboarding.tsx`)
- Islamic aesthetic: deep navy + gold (#C9A227) colour scheme
- Arabic calligraphy header: "الصلاة خير من النوم" (Prayer is better than sleep)
- Islamic star pattern SVG background (subtle, low opacity)
- 3 swipeable intro cards explaining the app concept
- Request permissions: camera, notifications, location
- "Begin Setup" CTA → navigates to Register

### 2. Face Registration Screen (`register.tsx`)
- Step 1: Explain face enrollment purpose (privacy note: on-device only)
- Step 2: Open front camera with oval face guide overlay
- Step 3: Capture 5 frames (burst), compute average FaceNet 128-d embedding
- Step 4: Store embedding in expo-secure-store as base64 JSON
- Step 5: Capture reference brightness histogram for lighting calibration
- Step 6: Show enrolled photo preview + "Face Saved" confirmation
- Save embedding locally — NEVER send to server

### 3. Dashboard Screen (`index.tsx`)
- Top: Live clock (large, elegant typography — Cormorant Garamond)
- Next prayer hero card: prayer name (Arabic + English), time, countdown timer
- All 5 prayer rows: Fajr 🌙, Dhuhr ☀️, Asr 🌤, Maghrib 🌅, Isha ✨
- Each row: prayer name, Arabic name, time, checked if done
- Prayer times fetched from Aladhan.com using device geolocation
- Bottom: Today's streak badge + weekly streak visualization

### 4. Alarm Screen (`alarm.tsx`)
- FULL SCREEN takeover — cannot be dismissed normally
- Displays: prayer name in Arabic (large), English name, current time
- Escalation levels every 15 seconds:
  - Level 0 (0-15s): Gentle adhan melody, gold background pulse
  - Level 1 (15-30s): Louder adhan, faster pulse
  - Level 2 (30-60s): Alarm + adhan, screen shakes
  - Level 3 (60-120s): Max volume, screen flashes red/gold rapidly
  - Level 4 (120s+): All of above + phone vibration pattern
- Show hadith about Fajr prayer rotating every 20s
- ONE button: "I've made Wudu" → navigates to Verify
- No back button, no swipe to dismiss, no home button escape (use FLAG_KEEP_SCREEN_ON)

### 5. Wudu Verification Screen (`verify.tsx`)
- Live front camera feed (mirrored, fills screen)
- Oval face guide overlay (colour changes: grey → amber → green as confidence rises)
- Vertical progress bar: "Wudu Confidence" 0–100%
- Status messages:
  - 0-20%: "Wet your face, then look into the camera"
  - 20-50%: "Detecting moisture on skin..."
  - 50-80%: "Moisture confirmed — hold still"
  - 80-99%: "Almost there..."
  - 100%: "✅ Wudu Confirmed — Allahu Akbar!" → alarm stops, screen closes
- Live debug panel (dev mode only): specular ratio, luminance, TFLite score
- Alarm continues playing in background during verification
- Two-stage check:
  1. FaceNet cosine similarity > 0.75 (confirms it's the registered user)
  2. Wudu TFLite classifier score > 0.82 held for 2.5 seconds continuously

### 6. Streak Screen (`streak.tsx`)
- Calendar heatmap of prayer completions
- Per-prayer breakdown: Fajr has special gold highlight (hardest prayer)
- Longest streak badge
- "Perfect Day" indicator (all 5 prayers verified)
- Motivational messages based on streak length

### 7. Settings Screen (`settings.tsx`)
- Alarm sensitivity: slider (adjust wudu confidence threshold 0.70–0.95)
- Alarm intensity cap: limit max escalation level
- Location override: manual city input if GPS unavailable
- Prayer calculation method: dropdown (ISNA, MWL, Egyptian, Karachi, etc.)
- Re-enroll face button
- Notification lead time: 5/10/15 minutes before prayer
- Dark/light theme toggle

---

## ALARM ENGINE SPECIFICATION (`useAlarmEngine.ts`)

```typescript
// Schedule alarms using expo-notifications for all 5 daily prayers
// Each alarm is a critical alert that bypasses silent mode
// Background task monitors if alarm was triggered while app was closed
// On alarm trigger:
//   1. Show AlarmOverlay as full-screen modal
//   2. Start audio playback (expo-av) - adhan audio
//   3. Start escalation timer - increase volume + visual intensity every 15s
//   4. Lock screen with FLAG_KEEP_SCREEN_ON (Android native module)
//   5. Alarm stops ONLY when wuduVerified = true from verify screen
//   6. Log prayer as "completed" in SQLite with timestamp

const ESCALATION_SCHEDULE = [
  { seconds: 0,   volumeMultiplier: 0.4, vibration: false, flashRate: 0    },
  { seconds: 15,  volumeMultiplier: 0.65, vibration: false, flashRate: 0   },
  { seconds: 30,  volumeMultiplier: 0.85, vibration: true,  flashRate: 1500 },
  { seconds: 60,  volumeMultiplier: 1.0,  vibration: true,  flashRate: 800  },
  { seconds: 120, volumeMultiplier: 1.0,  vibration: true,  flashRate: 400  },
];
```

---

## WUDU DETECTION SPECIFICATION (`useWuduDetector.ts`)

```typescript
// Frame processor runs at 5 fps to conserve battery
// Two-stage pipeline:
//
// Stage 1 — Identity Check (FaceNet)
//   - Extract face bounding box via MediaPipe
//   - Crop and normalise to 160x160
//   - Run facenet_mobile.tflite → 128-d embedding
//   - Cosine similarity vs stored registration embedding
//   - Must be > 0.75 to proceed to Stage 2
//
// Stage 2 — Wetness Classification (MobileNetV2)
//   - Use same face crop from Stage 1
//   - Resize to 224x224, normalise to [-1, 1]
//   - Run wudu_detector.tflite → [dry_prob, wet_prob]
//   - wet_prob must exceed THRESHOLD (default 0.82) for 2.5s continuously
//   - If wet_prob drops below threshold, reset timer (no partial credit)
//
// Output: { isVerified: boolean, confidence: number, stage: 'identity' | 'wetness' | 'done' }

const WUDU_THRESHOLD = 0.82;       // configurable in settings
const HOLD_DURATION_MS = 2500;     // must hold wet reading for this long
const INFERENCE_FPS = 5;           // frames per second for inference
```

---

## DATABASE SCHEMA (`db/schema.ts`)

```typescript
// Drizzle ORM schema for expo-sqlite

// prayers table — log of every prayer completion
export const prayers = sqliteTable('prayers', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  prayerId:    text('prayer_id').notNull(),       // 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
  scheduledAt: integer('scheduled_at').notNull(), // Unix timestamp of prayer time
  completedAt: integer('completed_at'),           // Unix timestamp when wudu verified
  alarmDuration: integer('alarm_duration'),       // seconds alarm rang before verified
  wuduConfidence: real('wudu_confidence'),        // final classifier confidence score
  skipped:     integer('skipped').default(0),     // 1 if user explicitly skipped
  createdAt:   integer('created_at').notNull(),
});

// settings table — user preferences
export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
});

// Indexes: prayers(prayerId), prayers(scheduledAt), prayers(completedAt)
```

---

## FASTAPI BACKEND SPECIFICATION

### `routes/prayer_times.py`
```python
# GET /prayer-times?lat={lat}&lng={lng}&date={YYYY-MM-DD}&method={int}
# Proxy to aladhan.com/v1/timings with 24-hour Redis cache per lat/lng/date combo
# Returns: { fajr, dhuhr, asr, maghrib, isha } as ISO time strings
# Fallback: return cached previous day times if aladhan.com is down

# GET /prayer-times/city?city={name}&country={code}
# For manual city input in settings
```

### `routes/dataset.py`
```python
# POST /dataset/contribute
# Authenticated endpoint (Supabase JWT required)
# Body: multipart/form-data with image (JPEG) + label ('wet' | 'dry')
# Server-side validation:
#   - Must contain a face (MediaPipe check)
#   - Image dimensions 200x200 minimum
#   - File size < 2MB
#   - Not a duplicate (perceptual hash check)
# Stores in Supabase Storage bucket: dataset/{label}/{uuid}.jpg
# Inserts metadata row in Supabase DB: contributor_id, label, hash, created_at

# GET /dataset/stats
# Returns: { total_wet: int, total_dry: int, contributors: int }
```

---

## THEME AND DESIGN TOKENS (`constants/theme.ts`)

```typescript
export const colors = {
  background:  '#050C16',   // deep navy black
  surface:     '#0C1A2E',   // slightly lighter navy
  card:        'rgba(255,255,255,0.04)',
  cardBorder:  'rgba(201,162,39,0.18)',
  gold:        '#C9A227',   // primary accent
  goldLight:   '#F0D060',
  goldMuted:   'rgba(201,162,39,0.45)',
  teal:        '#2DD4BF',   // wudu success colour
  green:       '#22C55E',
  red:         '#EF4444',
  textPrimary: '#F0E6D3',
  textMuted:   'rgba(240,230,211,0.4)',
  textDim:     'rgba(240,230,211,0.2)',
};

export const fonts = {
  display: 'CormorantGaramond',   // elegant serif for headings
  arabic:  'NotoNaskhArabic',     // Arabic text
  mono:     'JetBrainsMono',       // countdown timers
  body:    'CormorantGaramond',
};
```

---

## PACKAGE.JSON (mobile)

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-notifications": "~0.28.0",
    "expo-av": "~14.0.0",
    "expo-task-manager": "~11.8.0",
    "expo-background-fetch": "~12.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-sqlite": "~14.0.0",
    "expo-location": "~17.0.0",
    "react-native-vision-camera": "^4.5.0",
    "react-native-fast-tflite": "^1.3.0",
    "nativewind": "^4.0.0",
    "zustand": "^4.5.0",
    "drizzle-orm": "^0.30.0",
    "@supabase/supabase-js": "^2.43.0"
  }
}
```

---

## KEY IMPLEMENTATION NOTES

1. **Alarm cannot be dismissed without wudu** — on Android use `WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON` + `TYPE_APPLICATION_OVERLAY`. On iOS use Critical Alerts entitlement.

2. **TFLite model placeholder** — during development, use the photometric heuristic (specular highlights + luminance analysis) until the real model is trained. The hook interface stays identical — swap model file only.

3. **Prayer time scheduling** — schedule all 5 alarms at app open/resume using expo-notifications. Re-schedule daily in background task at midnight.

4. **Fajr is special** — Fajr alarm uses a different adhan audio file (Fajr-specific adhan includes "prayer is better than sleep" phrase). Fajr also has +1 streak bonus multiplier.

5. **Location permissions** — gracefully degrade to last known location, then to manual city input, then to Abuja, Nigeria defaults.

6. **Model file size** — INT8 quantized MobileNetV2 is ~3.5MB. FaceNet mobile is ~2.6MB. Both bundle fine inside the Expo app.

7. **No internet at Fajr** — prayer times must be pre-cached the night before. Background task at 11pm fetches next day's times.

8. **Privacy by design** — face embedding stored only in expo-secure-store (iOS Keychain / Android Keystore). No face data in SQLite, no cloud upload, no analytics on biometric data.

---

## COMMANDS TO SCAFFOLD

```bash
# Create project
npx create-expo-app fajrguard --template expo-template-blank-typescript
cd fajrguard/mobile

# Install dependencies
npx expo install expo-notifications expo-av expo-task-manager expo-background-fetch expo-secure-store expo-sqlite expo-location
npm install react-native-vision-camera react-native-fast-tflite
npm install nativewind tailwindcss zustand drizzle-orm @supabase/supabase-js

# Backend
cd ../backend
pip install fastapi uvicorn supabase redis httpx mediapipe pillow python-multipart imagehash pydantic-settings

# Start development
npx expo start          # mobile
uvicorn app.main:app --reload  # backend
```

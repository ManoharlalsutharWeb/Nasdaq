/* ============================================================
   VedicAladdin V6 — core/config.js
   Master Configuration — schemaVersion: "6.0"
   V5 fully preserved + V6 additions
   NASDAQ Birth: 08-Feb-1971, 10:00 AM EST, New York
   ============================================================ */
'use strict';

const CONFIG = {

  // ── Build status ──────────────────────────────────────────
  BUILD_STATUS  : "COMPLETE",
  SCHEMA_VERSION: "6.0",
  APP_NAME      : "VedicAladdin — NASDAQ Vedic Intelligence V6",
  VERSION       : "V6.0.0",

  // ── Auth (unchanged from V5) ──────────────────────────────
  AUTH: { user: "Admin", pass: "Guruji@1379" },

  // ── NASDAQ Birth Constants (NEVER CHANGE) ─────────────────
  NASDAQ_BIRTH: {
    year    : 1971,
    month   : 2,
    day     : 8,
    hour    : 10,
    minute  : 0,
    lat     : 40.714,
    lon     : -74.006,
    tz      : -5,       // EST
    label   : "NASDAQ जन्म — 08 फरवरी 1971, 10:00 AM EST, न्यूयॉर्क",
  },

  // ── Vedic calculation standards ───────────────────────────
  AYANAMSHA        : "LAHIRI",
  HOUSE_SYSTEM     : "WHOLE_SIGN",
  DASHA_SYSTEM     : "VIMSHOTTARI",
  SECONDARY_DASHA  : "YOGINI",

  // ── Date range for the Instant Engine ─────────────────────
  DATE_RANGE: {
    min: "1971-01-01",
    max: "2035-12-31",
  },

  // ── V6 Mode Flags ─────────────────────────────────────────
  V6_MODE: {
    INSTANT_ENGINE  : true,   // Any date → 0.5 sec
    THREE_MODE      : true,   // historical / live / forecast
    NY_DEEP_DIVE    : true,   // 6-block NY maximum output
    SMART_SESSIONS  : true,   // Asian/London event-based
    ML_ENGINE       : true,   // Pure-JS pattern matching
    PWA             : true,   // Progressive Web App
    VOICE_HINDI     : true,   // Web Speech API
    WEBSOCKET       : true,   // Live updates
  },

  // ── Three-Mode definitions ────────────────────────────────
  THREE_MODE: {
    HISTORICAL : { label: "इतिहास",    desc: "1971 से आज तक — कोई भी तारीख" },
    LIVE       : { label: "लाइव",      desc: "आज — रियल-टाइम विश्लेषण" },
    FORECAST   : { label: "भविष्यवाणी",desc: "आज से 10 साल आगे तक" },
  },

  // ── Session boundaries (IST) ── V5 preserved ─────────────
  SESSIONS: {
    asian: {
      startIST : "05:30",
      endIST   : "14:00",
      label    : "एशियन सत्र",
      flag     : "🌏",
      markets  : "Nikkei / SGX / Hang Seng",
      utcOffset: 0,
    },
    london: {
      startIST : "13:30",
      endIST   : "22:00",
      label    : "लंदन सत्र",
      flag     : "🇬🇧",
      markets  : "FTSE / DAX / Eurostoxx",
      utcOffset: 0,
    },
    newyork: {
      startIST : "19:00",
      endIST   : "01:30+1",
      label    : "न्यूयॉर्क सत्र",
      flag     : "🗽",
      markets  : "NASDAQ / S&P500 / Dow",
      utcOffset: 0,
    },
    nyopen: {
      startIST : "19:00",
      endIST   : "20:30",
      label    : "NY Open ज़ोन",
      flag     : "⚡",
      markets  : "NASDAQ Futures Open",
    },
  },

  // ── Scoring weights V6 (V5: Kundali 75% → V6 restructured) ─
  WEIGHTS: {
    kundali      : 0.55,   // D1 + key vargas + dasha
    transits     : 0.15,   // transit exactness
    ashtakavarga : 0.15,   // BAV + SAV
    yogas        : 0.10,   // 32 Vedic yogas
    panchang     : 0.05,   // tithi / nakshatra / muhurta
  },

  // ── D60 accuracy gate (V5 preserved) ─────────────────────
  D60_GATE: {
    HIGH  : { weight: 1.0, warning: false },
    MEDIUM: { weight: 0.4, warning: true  },
    LOW   : { weight: 0.0, warning: true, hidden: false },
  },
  BIRTH_TIME_ACCURACY: "HIGH",

  // ── Vedic rules priority (P1 = highest impact) ────────────
  VEDIC_PRIORITY: {
    P1: [
      "vimshottari_dasha",
      "natal_transits",
      "ashtakavarga",
      "yoga_engine",
      "nakshatra",
      "muhurta",
    ],
    P2: [
      "jaimini_chara_dasha",
      "eclipse_engine",
      "shadbala",
      "yogini_dasha",
    ],
    P3: [
      "sarvatobhadra_chakra",
      "tajika_solar_return",
      "sudarshana_chakra",
      "prashna_principles",
      "outer_planets",
    ],
  },

  // ── NY Deep Dive block configuration ─────────────────────
  NY_DEEP_DIVE_BLOCKS: {
    A: { id: "vedic_core",     label: "वैदिक कोर",          layers: 7, enabled: true },
    B: { id: "possibility",    label: "संभावना मानचित्र",    tiers: 5,  enabled: true },
    C: { id: "timing",         label: "इंट्राडे टाइमिंग",   blocks: 14, enabled: true },
    D: { id: "key_moments",    label: "मुख्य क्षण",          enabled: true },
    E: { id: "crash_intel",    label: "क्रैश इंटेलिजेंस",   rules: 21, enabled: true },
    F: { id: "ml_pattern",     label: "ML पैटर्न",           matches: 3, enabled: true },
  },

  // ── Possibility map tiers ─────────────────────────────────
  POSSIBILITY_TIERS: [
    { id: "strong_rally", label: "तेज़ तेजी",  threshold: 1.5,  dir:  1, color: "#00e676" },
    { id: "bull",         label: "तेजी",        threshold: 0.5,  dir:  1, color: "#69f0ae" },
    { id: "flat",         label: "सपाट",        threshold: -0.5, dir:  0, color: "#ffd740" },
    { id: "bear",         label: "मंदी",        threshold: -1.5, dir: -1, color: "#ff6d00" },
    { id: "crash",        label: "क्रैश",       threshold: null, dir: -1, color: "#ff1744" },
  ],

  // ── Muhurta quality scale ─────────────────────────────────
  MUHURTA_QUALITY: {
    "A+": { score: 90, color: "#00e676", label: "उत्तम — अभिजित मुहूर्त" },
    "A" : { score: 75, color: "#69f0ae", label: "शुभ — शुभ होरा" },
    "B" : { score: 60, color: "#b2ff59", label: "सामान्य" },
    "C" : { score: 45, color: "#ffd740", label: "सतर्कता" },
    "D" : { score: 30, color: "#ff6d00", label: "अशुभ होरा" },
    "F" : { score: 10, color: "#ff1744", label: "राहु काल / गुलिका — अवॉइड करें" },
  },

  // ── Signal labels (Hindi) ─────────────────────────────────
  SIGNAL_LABELS: {
    STRONG_BULL : { hi: "प्रबल तेजी",  en: "Strong Rally", color: "#00e676" },
    BULL        : { hi: "तेजी",         en: "Bullish",      color: "#69f0ae" },
    NEUTRAL     : { hi: "सपाट",         en: "Neutral",      color: "#ffd740" },
    BEAR        : { hi: "मंदी",         en: "Bearish",      color: "#ff6d00" },
    STRONG_BEAR : { hi: "प्रबल मंदी",  en: "Strong Crash", color: "#ff1744" },
  },

  // ── Crash risk categories ─────────────────────────────────
  CRASH_CATEGORIES: {
    MINIMAL  : { min: 0,  max: 19, label: "न्यूनतम जोखिम", color: "#00e676" },
    LOW      : { min: 20, max: 39, label: "कम जोखिम",       color: "#69f0ae" },
    MODERATE : { min: 40, max: 59, label: "मध्यम जोखिम",    color: "#ffd740" },
    HIGH     : { min: 60, max: 79, label: "उच्च जोखिम",     color: "#ff6d00" },
    EXTREME  : { min: 80, max: 100,label: "अत्यंत खतरनाक", color: "#ff1744" },
  },

  // ── Smart alert thresholds ────────────────────────────────
  ALERT_THRESHOLDS: {
    ECLIPSE_SHADOW_DAYS : 15,   // days before/after eclipse
    STATIONARY_SPEED    : 0.01, // deg/day
    GRAHA_YUDDHA_ORB    : 1.0,  // degrees
  },

  // ── API config ────────────────────────────────────────────
  API: {
    BASE_URL  : "/api/v1",
    CACHE_MIN : 30,
    KEY_HEADER: "X-API-Key",
    ENDPOINTS : {
      ANALYZE     : "/analyze/:date",
      NY_DEEP_DIVE: "/ny-deep-dive/:date",
      LIVE        : "/signals/live",
      SESSION     : "/session/:name/:date",
      YOGAS       : "/yogas/active",
      MUHURTA     : "/muhurta/:date",
      BACKTEST    : "/backtest/:from/:to",
      OUTCOME     : "/outcome",
    },
  },

  // ── Speed targets (ms) ────────────────────────────────────
  PERF: {
    DATE_CHANGE     : 500,
    NY_DEEP_DIVE    : 1000,
    PDF_EXPORT      : 3000,
    CHART_RENDER    : 1000,
    NATAL_CALC      : 200,
    VARGA_ALL       : 300,
    SINGLE_MODULE   : 2000,
  },

  // ── Validation test dates ─────────────────────────────────
  VALIDATION_DATES: [
    { date: "2000-03-10", expected: "BEAR",       desc: "डॉट-कॉम पीक" },
    { date: "2009-03-09", expected: "BULL",       desc: "संकट तल" },
    { date: "2020-03-23", expected: "BULL",       desc: "COVID तल" },
    { date: "2008-09-15", expected: "STRONG_BEAR",desc: "लेहमैन क्रैश" },
  ],

  // ── Key historical dates for ML ───────────────────────────
  ML_ANCHORS: [
    { date: "2000-03-10", outcome: -0.78, desc: "डॉट-कॉम पीक — बाद में -78%" },
    { date: "2002-10-09", outcome:  1.00, desc: "डॉट-कॉम तल — बाद में +100%" },
    { date: "2008-09-15", outcome: -0.45, desc: "लेहमैन क्रैश — बाद में -45%" },
    { date: "2009-03-09", outcome:  4.00, desc: "संकट तल — बाद में +400%" },
    { date: "2020-02-19", outcome: -0.35, desc: "COVID पीक — 1 माह में -35%" },
    { date: "2020-03-23", outcome:  1.20, desc: "COVID तल — बाद में +120%" },
    { date: "2020-11-09", outcome:  0.15, desc: "वैक्सीन रैली — 1 माह में +15%" },
    { date: "2022-01-04", outcome: -0.35, desc: "रेट हाइक — बाद में -35%" },
    { date: "2022-10-13", outcome:  0.50, desc: "बियर तल — बाद में +50%" },
    { date: "2023-01-01", outcome:  0.45, desc: "AI बुल रन — 1 साल में +45%" },
  ],

  // ── UI theme ──────────────────────────────────────────────
  THEME: {
    BG_PRIMARY  : "#1a1a2e",
    BG_SECONDARY: "#16213e",
    BG_CARD     : "#0f3460",
    ACCENT      : "#FF6B00",     // Saffron
    ACCENT_LIGHT: "#FF8C42",
    TEXT_PRIMARY: "#e0e0e0",
    TEXT_DIM    : "#9e9e9e",
    BULL_COLOR  : "#00e676",
    BEAR_COLOR  : "#ff1744",
    WARN_COLOR  : "#ffd740",
  },

  // ── Required V5 modules (backward compat check) ──────────
  V5_MODULES: [
    "engine/config.js","engine/types.js","engine/time.js",
    "engine/natal.js","engine/varga.js","engine/dasha.js",
    "engine/transits.js","engine/events.js","engine/sessions.js",
    "engine/regime.js","engine/scoring.js","engine/aggregator.js",
    "engine/research.js","engine/verifier.js",
  ],

  // ── V6 all required modules ───────────────────────────────
  V6_MODULES: [
    "core/config.js","core/types.js","core/time.js","core/natal.js",
    "core/varga.js","core/dasha.js","core/transits.js","core/events.js",
    "core/sessions.js","core/regime.js","core/scoring.js","core/aggregator.js",
    "core/research.js","core/verifier.js","core/instant_engine.js","core/date_navigator.js",
    "advanced/ashtakavarga.js","advanced/shadbala.js","advanced/yoga_engine.js",
    "advanced/muhurta_engine.js","advanced/nakshatra_engine.js","advanced/jaimini_engine.js",
    "advanced/eclipse_engine.js","advanced/yogini_dasha.js","advanced/ml_engine.js",
    "advanced/pattern_matcher.js","advanced/backtester.js","advanced/smart_alert.js",
    "advanced/accuracy_tracker.js","advanced/market_fetcher.js",
    "ny_engine/block_a_vedic.js","ny_engine/block_b_probability.js",
    "ny_engine/block_c_timing.js","ny_engine/block_d_moments.js",
    "ny_engine/block_e_crash.js","ny_engine/block_f_ml.js","ny_engine/ny_orchestrator.js",
    "api/server.js","api/websocket.js",
  ],

  // ── Confluence scoring thresholds ─────────────────────────
  CONFLUENCE: {
    HIGH_CONFIDENCE_RULES : 10,   // 10+ rules agree → 90%+ confidence
    MIN_CONFIDENCE        : 20,
    MAX_CONFIDENCE        : 95,
  },

};

// ── Node.js export ────────────────────────────────────────
if (typeof module !== 'undefined') module.exports = CONFIG;
// ── Browser export ────────────────────────────────────────
if (typeof window !== 'undefined') window.CONFIG = CONFIG;

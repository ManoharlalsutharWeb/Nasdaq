/* ============================================================
   NASDAQ Vedic System V5 — engine/config.js
   Build Gate: UI blocks until BUILD_STATUS = "COMPLETE"
   ============================================================ */
'use strict';

const CONFIG = {
  BUILD_STATUS: "COMPLETE",   // Set by verifier after QA passes
  SCHEMA_VERSION: "5.0",
  APP_NAME: "NASDAQ Futures Vedic Prediction System",
  VERSION: "V5.0",
  NASDAQ_BIRTH: { year:1971, month:2, day:8, hour:10, minute:0, lat:40.714, lon:-74.006, tz:-5 },
  AYANAMSHA: "LAHIRI",
  HOUSE_SYSTEM: "WHOLE_SIGN",
  DASHA_SYSTEM: "VIMSHOTTARI",
  AUTH: { user:"Admin", pass:"Guruji@1379" },

  REQUIRED_PAGES: [
    "app/setup.html","app/index.html","app/daily.html",
    "app/sessions.html","app/session_asian.html","app/session_london.html",
    "app/session_ny.html","app/weekly.html","app/monthly.html",
    "app/alerts.html","app/vargas.html",
    ...Array.from({length:60},(_,i)=>`app/vargas/d${String(i+1).padStart(2,'0')}.html`)
  ],

  REQUIRED_MODULES: [
    "engine/config.js","engine/types.js","engine/time.js",
    "engine/natal.js","engine/varga.js","engine/dasha.js",
    "engine/transits.js","engine/events.js","engine/sessions.js",
    "engine/regime.js","engine/scoring.js","engine/aggregator.js",
    "engine/verifier.js"
  ],

  REQUIRED_OUTPUTS_FOR_TODAY: [
    "daily.json","sessions.json","ny_open.json","alerts.json",
    "weekly.json","monthly.json",
    ...Array.from({length:60},(_,i)=>`vargas/d${String(i+1).padStart(2,'0')}.json`),
    "qa/summary.json"
  ],

  // Session boundaries (IST)
  SESSIONS: {
    asian:   { startIST:"05:30", endIST:"14:00", label:"एशियन सत्र",   flag:"🌏", markets:"Tokyo/Nikkei/SGX" },
    london:  { startIST:"13:30", endIST:"22:00", label:"लंदन सत्र",    flag:"🇬🇧", markets:"FTSE/DAX/Eurostoxx" },
    newyork: { startIST:"19:00", endIST:"01:30", label:"न्यूयॉर्क सत्र",flag:"🗽", markets:"NASDAQ/S&P500/Dow" },
    nyopen:  { startIST:"19:00", endIST:"20:30", label:"NY Open Zone", flag:"⚡", markets:"NASDAQ Futures Open" },
  },

  // Kundali-first weights (total = 1.0)
  WEIGHTS: {
    kundali:  0.60,   // D1 + vargas + dasha context
    transits: 0.25,   // transit exactness windows
    panchang: 0.10,   // tithi/nakshatra/hora/muhurta
    other:    0.05,   // KP/Gann/Merriman as confirmation
  },

  // D60 birth-time accuracy gate
  D60_GATE: {
    HIGH:   { weight:1.0, warning:false },
    MEDIUM: { weight:0.4, warning:true  },
    LOW:    { weight:0.0, warning:true, hidden:false },
  },

  BIRTH_TIME_ACCURACY: "HIGH", // For NASDAQ (known exact time)
};

if(typeof module !== 'undefined') module.exports = CONFIG;
if(typeof window !== 'undefined') window.CONFIG = CONFIG;

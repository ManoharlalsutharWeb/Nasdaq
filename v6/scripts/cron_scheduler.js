/* ============================================================
   VedicAladdin V6 — scripts/cron_scheduler.js
   Automated Daily/Weekly Report Generation (IST timezone)
   ============================================================ */
'use strict';

require('dotenv').config();
const cron = require('node-cron');

// Load engine
global.NATAL      = require('../core/natal');
global.DASHA      = require('../core/dasha');
global.TRANSITS   = require('../core/transits');
global.EVENTS     = require('../core/events');
global.VARGA      = require('../core/varga');
global.SESSIONS   = require('../core/sessions');
global.REGIME     = require('../core/regime');
global.SCORING    = require('../core/scoring');
global.AGGREGATOR = require('../core/aggregator');
global.INSTANT_ENGINE = require('../core/instant_engine');

const AGGREGATOR = global.AGGREGATOR;

function todayIST() {
  return new Date(new Date().getTime() + 5.5 * 3600000).toISOString().split('T')[0];
}

function log(msg) {
  console.log(`[CRON] ${new Date().toISOString()} — ${msg}`);
}

// ── 00:01 IST — Generate daily analysis ────────────────────
cron.schedule('1 0 * * *', () => {
  try {
    const today = todayIST();
    log(`दैनिक विश्लेषण शुरू: ${today}`);
    const daily = AGGREGATOR.buildDaily(today);
    log(`दैनिक पूर्ण: ${daily.finalCall} | विश्वास: ${daily.finalConfidence}%`);
  } catch (e) {
    log('दैनिक विश्लेषण विफल: ' + e.message);
  }
}, { timezone: 'Asia/Kolkata' });

// ── 07:30 IST — Morning summary ────────────────────────────
cron.schedule('30 7 * * *', () => {
  try {
    const today  = todayIST();
    const result = AGGREGATOR.runInstantAnalysis ? AGGREGATOR.runInstantAnalysis(today)
                 : { signal:'NEUTRAL', confidence:50 };
    log(`सुबह सारांश: ${today} — ${result.signal} (${result.confidence}%)`);
  } catch (e) {
    log('सुबह सारांश विफल: ' + e.message);
  }
}, { timezone: 'Asia/Kolkata' });

// ── 13:00 IST — Pre-London alert check ─────────────────────
cron.schedule('0 13 * * *', () => {
  try {
    const today = todayIST();
    log(`लंदन पूर्व-सत्र जाँच: ${today}`);
    const alerts = AGGREGATOR.buildAlerts(today);
    if (alerts.hasCrashRisk) log(`⚠️ Crash Risk ${alerts.crashRisk}/100 — ${alerts.alerts[0]?.msg}`);
    else log('लंदन: कोई उच्च जोखिम नहीं');
  } catch (e) {
    log('लंदन जाँच विफल: ' + e.message);
  }
}, { timezone: 'Asia/Kolkata' });

// ── 18:30 IST — Pre-NY alert check ─────────────────────────
cron.schedule('30 18 * * *', () => {
  try {
    const today = todayIST();
    log(`NY पूर्व-सत्र जाँच: ${today}`);
    const daily = AGGREGATOR.buildDaily(today);
    log(`NY पूर्व संकेत: ${daily.finalCall} | Crash: ${daily.rawScore?.toFixed(0)}`);
  } catch (e) {
    log('NY जाँच विफल: ' + e.message);
  }
}, { timezone: 'Asia/Kolkata' });

// ── Sunday 20:00 IST — Weekly report ───────────────────────
cron.schedule('0 20 * * 0', () => {
  try {
    const today  = todayIST();
    log(`साप्ताहिक रिपोर्ट शुरू: ${today}`);
    const weekly = AGGREGATOR.buildWeekly(today);
    const bull = weekly.days.filter(d => d.finalCall === 'BULL').length;
    const bear = weekly.days.filter(d => d.finalCall === 'BEAR').length;
    log(`साप्ताहिक पूर्ण: ${bull} बुलिश, ${bear} बियरिश दिन`);
  } catch (e) {
    log('साप्ताहिक विफल: ' + e.message);
  }
}, { timezone: 'Asia/Kolkata' });

log('VedicAladdin V6 CRON Scheduler शुरू — OM NAMAH SHIVAYA 🔱');

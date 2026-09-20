/* ============================================================
   VedicAladdin V6 — api/server.js
   Express.js REST API — All V6 endpoints
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Load all engine modules
const NATAL           = require('../core/natal');
const DASHA           = require('../core/dasha');
const TRANSITS        = require('../core/transits');
const EVENTS          = require('../core/events');
const SESSIONS        = require('../core/sessions');
const REGIME          = require('../core/regime');
const SCORING         = require('../core/scoring');
const VARGA           = require('../core/varga');
const AGGREGATOR      = require('../core/aggregator');
const INSTANT_ENGINE  = require('../core/instant_engine');
const DATE_NAVIGATOR  = require('../core/date_navigator');
const ASHTAKAVARGA    = require('../advanced/ashtakavarga');
const YOGA_ENGINE     = require('../advanced/yoga_engine');
const MUHURTA_ENGINE  = require('../advanced/muhurta_engine');
const NAKSHATRA_ENGINE= require('../advanced/nakshatra_engine');
const ECLIPSE_ENGINE  = require('../advanced/eclipse_engine');
const SMART_ALERT     = require('../advanced/smart_alert');
const NY_ORCHESTRATOR = require('../ny_engine/ny_orchestrator');

const app  = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'vedicaladdin_v6_key';

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../app')));

// Auth middleware (optional — skip for localhost dev)
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (process.env.NODE_ENV === 'development' || !key || key === API_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized', schemaVersion: "6.0" });
}

// Date validation middleware
function validateDate(req, res, next) {
  const dateStr = req.params.date;
  if (!dateStr) return res.status(400).json({ error: 'तारीख आवश्यक है' });
  const v = DATE_NAVIGATOR.validateDate(dateStr);
  if (!v.valid) return res.status(400).json({ error: v.error });
  next();
}

// ── ENDPOINTS ────────────────────────────────────────────────

// GET /api/v1/analyze/:date — Instant analysis (< 500ms)
app.get('/api/v1/analyze/:date', auth, validateDate, (req, res) => {
  try {
    const t0     = Date.now();
    const result = INSTANT_ENGINE.analyze(req.params.date, { crashRules: true, fullSessions: true });
    res.json({ ...result, serverMs: Date.now() - t0 });
  } catch (e) {
    res.status(500).json({ error: e.message, schemaVersion: "6.0" });
  }
});

// GET /api/v1/ny-deep-dive/:date — Full NY 6 blocks
app.get('/api/v1/ny-deep-dive/:date', auth, validateDate, (req, res) => {
  try {
    const result = NY_ORCHESTRATOR.runNYDeepDive(req.params.date);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, schemaVersion: "6.0" });
  }
});

// GET /api/v1/signals/live — Today live signal
app.get('/api/v1/signals/live', auth, (req, res) => {
  try {
    const today  = new Date(new Date().getTime() + 5.5*3600000).toISOString().split('T')[0];
    const result = INSTANT_ENGINE.analyze(today, { crashRules: true, fullSessions: true });
    res.json({ ...result, liveDate: today });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/session/:name/:date — Session analysis
app.get('/api/v1/session/:name/:date', auth, validateDate, (req, res) => {
  try {
    const { name, date } = req.params;
    const nasdaq = NATAL.getNasdaq();
    const tr     = TRANSITS.buildReport(date, nasdaq);
    const birth  = NATAL.NASDAQ_BIRTH;
    const birthJD = NATAL.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
    const moonSid = nasdaq.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
    const [y,m,d] = date.split('-').map(Number);
    const jd     = NATAL.JD(y, m, d, 15, 0);
    const dasha  = DASHA.getCurrent(birthJD, moonSid, jd);
    const sess   = SESSIONS.analyzeSession(name, {}, nasdaq, dasha, tr);
    const alert  = SMART_ALERT.checkAsianAlertLevel(date, nasdaq);
    res.json({ session: sess, alert, schemaVersion: "6.0" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/yogas/active — Active yogas for today
app.get('/api/v1/yogas/active', auth, (req, res) => {
  try {
    const today  = new Date(new Date().getTime() + 5.5*3600000).toISOString().split('T')[0];
    const nasdaq = NATAL.getNasdaq();
    const result = YOGA_ENGINE.analyzeForDate(today, nasdaq);
    res.json({ date: today, ...result, schemaVersion: "6.0" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/muhurta/:date — Timing quality
app.get('/api/v1/muhurta/:date', auth, validateDate, (req, res) => {
  try {
    const nasdaq = NATAL.getNasdaq();
    const result = MUHURTA_ENGINE.analyzeForDate(req.params.date, nasdaq);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/backtest/:from/:to — Backtest results
app.get('/api/v1/backtest/:from/:to', auth, (req, res) => {
  try {
    const { from, to } = req.params;
    if (!DATE_NAVIGATOR.validateDate(from).valid || !DATE_NAVIGATOR.validateDate(to).valid) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    // Generate signals for date range (sample every 7 days for speed)
    const results = [];
    const fromD   = new Date(from + 'T12:00:00Z');
    const toD     = new Date(to   + 'T12:00:00Z');
    let cursor    = new Date(fromD);
    while (cursor <= toD) {
      const ds = cursor.toISOString().split('T')[0];
      results.push(INSTANT_ENGINE.analyze(ds));
      cursor = new Date(cursor.getTime() + 7 * 86400000);
    }
    res.json({ from, to, results, count: results.length, schemaVersion: "6.0" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v1/outcome — Submit actual market result
app.post('/api/v1/outcome', auth, (req, res) => {
  try {
    const { date, actualMove, signal } = req.body;
    // In production, this would write to a DB
    // For now, log and return ack
    console.log(`[OUTCOME] ${date}: predicted=${signal}, actual=${actualMove}%`);
    res.json({ received: true, date, actualMove, signal, schemaVersion: "6.0" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/eclipse/:year — Eclipse list
app.get('/api/v1/eclipse/:year', auth, (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (year < 1971 || year > 2035) return res.status(400).json({ error: 'Year out of range' });
    const list = ECLIPSE_ENGINE.getEclipses(year);
    res.json({ year, eclipses: list, count: list.length, schemaVersion: "6.0" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/nakshatra-calendar/:date/:days — Nakshatra calendar
app.get('/api/v1/nakshatra-calendar/:date/:days', auth, validateDate, (req, res) => {
  try {
    const days = Math.min(90, parseInt(req.params.days) || 30);
    const cal  = NAKSHATRA_ENGINE.getNakshatraCalendar(req.params.date, days);
    res.json({ date: req.params.date, days, calendar: cal, schemaVersion: "6.0" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/ashtakavarga/:date — Ashtakavarga analysis
app.get('/api/v1/ashtakavarga/:date', auth, validateDate, (req, res) => {
  try {
    const nasdaq = NATAL.getNasdaq();
    const result = ASHTAKAVARGA.analyzeForDate(req.params.date, nasdaq);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /health — Health check
app.get('/health', (req, res) => {
  res.json({ status:'ok', version:'6.0', uptime: process.uptime(), schemaVersion:"6.0" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', schemaVersion:"6.0" });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SERVER] VedicAladdin V6 API running on port ${PORT}`);
    console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
    console.log(`[SERVER] Live:   http://localhost:${PORT}/api/v1/signals/live`);
  });
}

module.exports = app;

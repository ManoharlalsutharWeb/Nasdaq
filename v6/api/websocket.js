/* ============================================================
   VedicAladdin V6 — api/websocket.js
   Live WebSocket: hora_change, nakshatra_change, session_alert
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const WebSocket = require('ws');
const NATAL     = require('../core/natal');
const TRANSITS  = require('../core/transits');
const INSTANT_ENGINE = require('../core/instant_engine');

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  function broadcast(type, data) {
    const msg = JSON.stringify({ type, data, ts: new Date().toISOString(), schemaVersion:"6.0" });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }

  wss.on('connection', ws => {
    console.log('[WS] Client connected');
    // Send initial signal
    try {
      const today = new Date(new Date().getTime() + 5.5*3600000).toISOString().split('T')[0];
      const sig   = INSTANT_ENGINE.quickSignal(today);
      ws.send(JSON.stringify({ type:'initial_signal', data: sig, schemaVersion:"6.0" }));
    } catch(e) {}

    ws.on('close', () => console.log('[WS] Client disconnected'));
    ws.on('error', e => console.error('[WS] Error:', e.message));
  });

  // ── Hora change: every hour ──────────────────────────────
  let lastHora = -1;
  setInterval(() => {
    try {
      const now = new Date(new Date().getTime() + 5.5*3600000);
      const h   = now.getUTCHours();
      if (h !== lastHora) {
        lastHora = h;
        const dateStr = now.toISOString().split('T')[0];
        const horaLord = typeof MUHURTA_ENGINE !== 'undefined'
          ? MUHURTA_ENGINE.getHoraLord(dateStr, `${String(h).padStart(2,'0')}:00`)
          : 'Sun';
        broadcast('hora_change', { hour: h, lord: horaLord, dateStr });
      }
    } catch(e) {}
  }, 60000); // check every minute

  // ── Nakshatra change: every 5 minutes ───────────────────
  let lastNak = -1;
  setInterval(() => {
    try {
      const now  = new Date(new Date().getTime() + 5.5*3600000);
      const jd   = NATAL.JD(now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate(),
                            now.getUTCHours(), now.getUTCMinutes());
      const ayan = NATAL.lahiri(jd);
      const moon = NATAL.n360(NATAL.getPlanetLon('Moon', jd) - ayan);
      const nak  = Math.floor(moon / (360/27));
      if (nak !== lastNak) {
        lastNak = nak;
        broadcast('nakshatra_change', { nakNum: nak, moon });
      }
    } catch(e) {}
  }, 300000); // every 5 minutes

  // ── Session alerts: 30 min before each session ──────────
  const SESSION_START_IST = { asian:330, london:810, newyork:1140 }; // minutes from midnight IST
  setInterval(() => {
    try {
      const now  = new Date(new Date().getTime() + 5.5*3600000);
      const mins = now.getUTCHours()*60 + now.getUTCMinutes();
      Object.entries(SESSION_START_IST).forEach(([sess, start]) => {
        if (Math.abs(mins - (start - 30)) < 1) {
          broadcast('session_alert', { session: sess, minutesBefore: 30 });
        }
      });
    } catch(e) {}
  }, 60000);

  // ── Signal update: every 15 minutes ─────────────────────
  let lastSignal = null;
  setInterval(() => {
    try {
      const today  = new Date(new Date().getTime() + 5.5*3600000).toISOString().split('T')[0];
      const result = INSTANT_ENGINE.quickSignal(today);
      if (result.signal !== lastSignal) {
        lastSignal = result.signal;
        broadcast('signal_update', result);
      }
    } catch(e) {}
  }, 900000); // every 15 min

  console.log('[WS] WebSocket server initialized');
  return wss;
}

module.exports = { createWebSocketServer };

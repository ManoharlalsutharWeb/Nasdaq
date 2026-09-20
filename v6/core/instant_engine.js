/* ============================================================
   VedicAladdin V6 — core/instant_engine.js
   Any date 1971–2035 → full Vedic result in < 500ms
   Offline capable, no API calls, pure browser/Node.js
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const INSTANT_ENGINE = (function () {
  'use strict';

  const SCHEMA = "6.0";
  const DATE_MIN = '1971-01-01';
  const DATE_MAX = '2035-12-31';

  function ref(name) {
    const map = {
      NATAL: typeof NATAL !== 'undefined' ? NATAL : null,
      DASHA: typeof DASHA !== 'undefined' ? DASHA : null,
      TRANSITS: typeof TRANSITS !== 'undefined' ? TRANSITS : null,
      EVENTS: typeof EVENTS !== 'undefined' ? EVENTS : null,
      SESSIONS: typeof SESSIONS !== 'undefined' ? SESSIONS : null,
      REGIME: typeof REGIME !== 'undefined' ? REGIME : null,
      SCORING: typeof SCORING !== 'undefined' ? SCORING : null,
      VARGA: typeof VARGA !== 'undefined' ? VARGA : null,
      AGGREGATOR: typeof AGGREGATOR !== 'undefined' ? AGGREGATOR : null,
    };
    if (map[name]) return map[name];
    try { return require('./' + name.toLowerCase()); } catch (e) { return null; }
  }

  // ── Date validation ────────────────────────────────────
  function validateDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { valid: false, error: 'गलत फॉर्मेट — YYYY-MM-DD चाहिए' };
    }
    if (dateStr < DATE_MIN) return { valid: false, error: `तारीख 1971-01-01 से पहले की है` };
    if (dateStr > DATE_MAX) return { valid: false, error: `तारीख 2035-12-31 के बाद की है` };
    return { valid: true, error: '' };
  }

  // ── Mode detection ──────────────────────────────────────
  function getMode(dateStr) {
    const today = new Date(new Date().getTime() + 5.5 * 3600000).toISOString().split('T')[0];
    if (dateStr < today) return 'HISTORICAL';
    if (dateStr === today) return 'LIVE';
    return 'FORECAST';
  }

  // ── Signal label ────────────────────────────────────────
  function signalFromScore(score) {
    if (score >= 40)  return { signal: 'STRONG_BULL', hi: 'प्रबल तेजी',  color: '#00e676' };
    if (score >= 15)  return { signal: 'BULL',        hi: 'तेजी',         color: '#69f0ae' };
    if (score >= -15) return { signal: 'NEUTRAL',     hi: 'सपाट',         color: '#ffd740' };
    if (score >= -40) return { signal: 'BEAR',        hi: 'मंदी',         color: '#ff6d00' };
    return             { signal: 'STRONG_BEAR',        hi: 'प्रबल मंदी',  color: '#ff1744' };
  }

  // ════════════════════════════════════════════════════════
  // MAIN: analyze(dateString) → result < 500ms
  // ════════════════════════════════════════════════════════
  /**
   * Fast full analysis for any date
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {Object} [options]
   * @param {boolean} [options.fullSessions] — include all 3 session scores (adds ~20ms)
   * @param {boolean} [options.crashRules]   — run all 21 crash rules (adds ~5ms)
   * @returns {Object} InstantResult JSON
   */
  function analyze(dateStr, options = {}) {
    const t0 = Date.now();

    // Validate
    const v = validateDate(dateStr);
    if (!v.valid) {
      return {
        dateIST: dateStr, signal: 'NEUTRAL', signalHi: 'सपाट', confidence: 0,
        crashRisk: 0, error: v.error, schemaVersion: SCHEMA,
      };
    }

    try {
      const N  = ref('NATAL');
      const D  = ref('DASHA');
      const T  = ref('TRANSITS');
      const SC = ref('SCORING');

      // ── 1. Natal chart (cached) ──────────────────────────
      const natalD1 = N.getNasdaq();
      const birth   = N.NASDAQ_BIRTH;
      const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const moonSid = natalD1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;

      // ── 2. Transit report ────────────────────────────────
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd = N.JD(y, m, d, 15, 0); // NYSE open approx
      const transitReport = T.buildReport(dateStr, natalD1, '15:00');

      // ── 3. Dasha ─────────────────────────────────────────
      const dasha     = D.getCurrent(birthJD, moonSid, jd);
      const dashaScore = dasha ? D.getDashaScore(dasha.maha, dasha.antar) : 0;

      // ── 4. Quick varga consensus (key divs only) ─────────
      const V = ref('VARGA');
      let vargaScore = 0;
      if (V) {
        const keyDivs = [1, 9, 10, 30];
        keyDivs.forEach(div => {
          const chart = V.getChart(natalD1, div);
          const r     = V.analyzeVarga(div, chart, natalD1, dasha, transitReport);
          vargaScore += r.planetScore * (r.relevanceScore / 100) * 0.3;
        });
      }

      // ── 5. Dasha + transit combined score ────────────────
      const panchangScore = transitReport.panchang?.score || 0;
      const transitScore  = transitReport.totalScore || 0;
      const rawScore = dashaScore * 0.55 + transitScore * 0.15 + vargaScore * 0.25 + panchangScore * 0.05;
      const normScore = Math.max(-100, Math.min(100, (rawScore / 15) * 100));
      const sig = signalFromScore(normScore);

      // ── 6. Confidence ─────────────────────────────────────
      const agreeing = [
        dashaScore > 0 ? 'BULL' : dashaScore < 0 ? 'BEAR' : null,
        transitScore > 3 ? 'BULL' : transitScore < -3 ? 'BEAR' : null,
        panchangScore > 1 ? 'BULL' : panchangScore < -1 ? 'BEAR' : null,
      ].filter(Boolean);
      const topDir   = sig.signal.includes('BULL') ? 'BULL' : 'BEAR';
      const matching = agreeing.filter(d => d === topDir).length;
      const confidence = Math.min(85, 35 + matching * 18 + Math.min(12, Math.abs(normScore) * 0.3));

      // ── 7. Crash risk (fast — single day) ────────────────
      let crashRisk = 0;
      let crashTriggered = [];
      if (options.crashRules !== false) {
        const R = ref('REGIME');
        const E = ref('EVENTS');
        if (R && E) {
          try {
            const evts    = E.buildAstroEvents(dateStr, natalD1, dasha);
            const regDay  = R.detectDay(transitReport, natalD1, dasha, evts);
            crashRisk      = regDay.crashProbability;
            crashTriggered = regDay.triggered || [];
          } catch (_) {}
        }
      }

      // ── 8. Session quick scores (optional) ───────────────
      let sessions = { asian: null, london: null, ny: null };
      if (options.fullSessions) {
        const S = ref('SESSIONS');
        if (S) {
          try {
            const sa = S.analyzeSession('asian',   {}, natalD1, dasha, transitReport);
            const sl = S.analyzeSession('london',  {}, natalD1, dasha, transitReport);
            const sn = S.analyzeSession('newyork', {}, natalD1, dasha, transitReport);
            sessions = {
              asian  : { direction: sa.direction, score: sa.score, conf: sa.confidence },
              london : { direction: sl.direction, score: sl.score, conf: sl.confidence },
              ny     : { direction: sn.direction, score: sn.score, conf: sn.confidence },
            };
          } catch (_) {}
        }
      }

      // ── 9. Top nakshatra + yoga label ─────────────────────
      const nakName  = transitReport.panchang?.nakHi || '';
      const dashaLord = dasha?.mahaHi || '';

      // ── 10. Key factors ────────────────────────────────────
      const keyFactors = [];
      if (dasha) keyFactors.push(`${dasha.mahaHi} महादशा — ${dasha.marketBias === 'BULL' ? 'बुलिश' : dasha.marketBias === 'BEAR' ? 'बियरिश' : 'तटस्थ'}`);
      if (nakName) keyFactors.push(`नक्षत्र: ${nakName}`);
      if (transitReport.aspects?.[0]) {
        const top = transitReport.aspects[0];
        keyFactors.push(`${top.from} – ${top.to}: ${top.aspect} (${top.score > 0 ? '+' : ''}${top.score})`);
      }

      return {
        dateIST     : dateStr,
        signal      : sig.signal,
        signalHi    : sig.hi,
        signalColor : sig.color,
        confidence  : Math.round(confidence),
        crashRisk,
        sessions,
        dashaLord,
        nakshatra   : nakName,
        topYoga     : '',
        keyFactors,
        rawScore    : parseFloat(normScore.toFixed(1)),
        mode        : getMode(dateStr),
        elapsedMs   : Date.now() - t0,
        generatedAt : new Date().toISOString(),
        schemaVersion: SCHEMA,
      };

    } catch (e) {
      console.error('[INSTANT_ENGINE] analyze error:', e);
      return {
        dateIST: dateStr, signal: 'NEUTRAL', signalHi: 'सपाट', confidence: 50,
        crashRisk: 0, error: e.message, elapsedMs: Date.now() - t0, schemaVersion: SCHEMA,
      };
    }
  }

  // ── Batch analysis for range ────────────────────────────
  /**
   * Analyze multiple dates efficiently
   * @param {string[]} dates
   * @returns {Object[]}
   */
  function analyzeBatch(dates) {
    return dates.map(d => analyze(d));
  }

  // ── Quick signal only (ultra-fast, <100ms) ───────────────
  function quickSignal(dateStr) {
    try {
      const N = ref('NATAL'), D = ref('DASHA'), T = ref('TRANSITS');
      const natalD1 = N.getNasdaq();
      const birth   = N.NASDAQ_BIRTH;
      const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const moonSid = natalD1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd      = N.JD(y, m, d, 15, 0);
      const ayan    = N.lahiri(jd);
      const dasha   = D.getCurrent(birthJD, moonSid, jd);
      const dashaScore = dasha ? D.getDashaScore(dasha.maha, dasha.antar) : 0;
      const tr      = T.buildReport(dateStr, natalD1);
      const raw     = dashaScore * 0.6 + (tr.totalScore || 0) * 0.2 + (tr.panchang?.score || 0) * 0.05;
      const norm    = Math.max(-100, Math.min(100, (raw / 12) * 100));
      return signalFromScore(norm);
    } catch (e) {
      return { signal: 'NEUTRAL', hi: 'सपाट', color: '#ffd740' };
    }
  }

  // ── Public API ───────────────────────────────────────────
  return {
    analyze,
    analyzeBatch,
    quickSignal,
    validateDate,
    getMode,
    signalFromScore,
    DATE_MIN,
    DATE_MAX,
  };

})();

if (typeof module !== 'undefined') module.exports = INSTANT_ENGINE;
if (typeof window !== 'undefined') window.INSTANT_ENGINE = INSTANT_ENGINE;

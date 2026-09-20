/* ============================================================
   VedicAladdin V6 — ny_engine/ny_orchestrator.js
   Master NY Deep Dive Orchestrator — All 6 Blocks
   Total time target: < 1000ms
   Sequence: A → B → C → D → E → F
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const NY_ORCHESTRATOR = (function () {
  'use strict';

  // Module resolver
  function ref(name) {
    const map = {
      NATAL:          typeof NATAL         !== 'undefined' ? NATAL         : null,
      DASHA:          typeof DASHA         !== 'undefined' ? DASHA         : null,
      TRANSITS:       typeof TRANSITS      !== 'undefined' ? TRANSITS      : null,
      EVENTS:         typeof EVENTS        !== 'undefined' ? EVENTS        : null,
      SESSIONS:       typeof SESSIONS      !== 'undefined' ? SESSIONS      : null,
      REGIME:         typeof REGIME        !== 'undefined' ? REGIME        : null,
      SCORING:        typeof SCORING       !== 'undefined' ? SCORING       : null,
      BLOCK_A_VEDIC:  typeof BLOCK_A_VEDIC !== 'undefined' ? BLOCK_A_VEDIC : null,
      BLOCK_B:        typeof BLOCK_B_PROBABILITY !== 'undefined' ? BLOCK_B_PROBABILITY : null,
      BLOCK_C:        typeof BLOCK_C_TIMING !== 'undefined' ? BLOCK_C_TIMING : null,
      BLOCK_D:        typeof BLOCK_D_MOMENTS !== 'undefined' ? BLOCK_D_MOMENTS : null,
      BLOCK_E:        typeof BLOCK_E_CRASH !== 'undefined' ? BLOCK_E_CRASH : null,
      BLOCK_F:        typeof BLOCK_F_ML   !== 'undefined' ? BLOCK_F_ML   : null,
    };
    if (map[name]) return map[name];
    const paths = {
      NATAL:'../core/natal', DASHA:'../core/dasha', TRANSITS:'../core/transits',
      EVENTS:'../core/events', SESSIONS:'../core/sessions', REGIME:'../core/regime',
      SCORING:'../core/scoring',
      BLOCK_A_VEDIC:'./block_a_vedic',
      BLOCK_B:'./block_b_probability', BLOCK_C:'./block_c_timing',
      BLOCK_D:'./block_d_moments',     BLOCK_E:'./block_e_crash',
      BLOCK_F:'./block_f_ml',
    };
    try { return require(paths[name]); } catch (e) { return null; }
  }

  // 30-minute result cache
  const _cache = new Map();
  const CACHE_TTL = 30 * 60 * 1000;

  // ════════════════════════════════════════════════════════
  // runNYDeepDive — main entry point
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {Object} NYDeepDiveResult with all 6 blocks
   */
  function runNYDeepDive(dateStr) {
    const cacheKey = `ny_${dateStr}`;
    if (_cache.has(cacheKey)) {
      const cached = _cache.get(cacheKey);
      if (Date.now() - cached.ts < CACHE_TTL) return cached.data;
    }

    const t0 = Date.now();

    try {
      const N = ref('NATAL');
      const D = ref('DASHA');
      const T = ref('TRANSITS');
      const E = ref('EVENTS');

      // ── Pre-compute shared data ─────────────────────────
      const natalD1 = N.getNasdaq();
      const birth   = N.NASDAQ_BIRTH;
      const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const moonSid = natalD1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd = N.JD(y, m, d, 15, 0);

      const dasha         = D.getCurrent(birthJD, moonSid, jd);
      const transitReport = T.buildReport(dateStr, natalD1, '19:00'); // NY open time
      const eventsReport  = E.buildAstroEvents(dateStr, natalD1, dasha);

      // ── Block A: 7-Layer Vedic Core ─────────────────────
      const BA = ref('BLOCK_A_VEDIC');
      const blockA = BA ? BA.run(dateStr, natalD1, dasha, transitReport)
                        : { normScore:0, signal:'NEUTRAL', confidence:50, hindiSummary:'Block A unavailable' };

      // ── Block B: Possibility Map ─────────────────────────
      const BB  = ref('BLOCK_B');
      const SC  = ref('SCORING');
      const mlScore     = 0; // ML engine score (default neutral)
      const regimeScore = (ref('REGIME')?.detectDay(transitReport, natalD1, dasha, eventsReport)?.crashProbability || 0) * -1;
      const blockB = BB ? BB.run(blockA.normScore, mlScore, regimeScore,
                                 [blockA.normScore, mlScore, regimeScore])
                        : { strongRally:10, bull:20, flat:35, bear:25, crash:10, confidence:50 };

      // ── Block C: Intraday Timing ─────────────────────────
      const BC = ref('BLOCK_C');
      const blockC = BC ? BC.run(dateStr, natalD1) : { blocks:[], best:[], avoid:[] };

      // ── Block D: Key Moments ─────────────────────────────
      const BD = ref('BLOCK_D');
      const blockD = BD ? BD.run(dateStr, natalD1, transitReport) : { planetary:[], economic:[] };

      // ── Block E: Crash Intelligence ──────────────────────
      const BE = ref('BLOCK_E');
      const blockE = BE ? BE.run(dateStr, natalD1, transitReport, eventsReport)
                        : { score:0, triggered:[], notTriggered:[] };

      // ── Block F: ML Pattern ──────────────────────────────
      const BF = ref('BLOCK_F');
      const blockF = BF ? BF.run(dateStr) : { matches:[], verdict:'ML unavailable', mlDirection:'NEUTRAL' };

      // ── Overall verdict ───────────────────────────────────
      const scores = [blockA.normScore || 0, (blockF.mlDirection === 'BULL' ? 5 : blockF.mlDirection === 'BEAR' ? -5 : 0)];
      const overall = SC ? SC.getSignalStrength(scores.reduce((s,v) => s+v,0) / scores.length)
                         : { signal:'NEUTRAL', hi:'तटस्थ' };

      const elapsedMs = Date.now() - t0;

      const result = {
        dateIST           : dateStr,
        blockA,
        blockB,
        blockC,
        blockD,
        blockE,
        blockF,
        overallSignal     : overall.signal,
        overallSignalHi   : overall.hi,
        overallConfidence : blockA.confidence || 50,
        crashRisk         : blockE.score || 0,
        crashCategory     : blockE.category?.hi || 'न्यूनतम',
        topYoga           : blockA.layers?.[4]?.topYoga || '',
        dasha: {
          maha   : dasha?.mahaHi,
          antar  : dasha?.antarHi,
          pratyantar: dasha?.pratyantarHi,
          bias   : dasha?.marketBias,
        },
        nakshatra         : transitReport.panchang?.nakHi,
        panchang          : transitReport.panchang,
        elapsedMs,
        generatedAt       : new Date().toISOString(),
        schemaVersion     : "6.0",
      };

      _cache.set(cacheKey, { data: result, ts: Date.now() });
      return result;

    } catch (e) {
      console.error('[NY_ORCHESTRATOR] error:', e);
      return {
        dateIST: dateStr, error: e.message,
        blockA:null, blockB:null, blockC:null, blockD:null, blockE:null, blockF:null,
        overallSignal:'NEUTRAL', overallConfidence:50, elapsedMs: Date.now()-t0,
        schemaVersion:"6.0",
      };
    }
  }

  // ════════════════════════════════════════════════════════
  // formatFullReport — Hindi text output of all 6 blocks
  // ════════════════════════════════════════════════════════
  function formatFullReport(result) {
    if (!result) return 'NY Deep Dive: डेटा उपलब्ध नहीं';

    const SEP = '\n' + '═'.repeat(60) + '\n';
    const lines = [
      `🔱 VEDICALADDIN V6 — NY DEEP DIVE: ${result.dateIST}`,
      `संकेत: ${result.overallSignalHi || result.overallSignal} | विश्वास: ${result.overallConfidence}% | Crash: ${result.crashRisk}/100`,
      SEP,
      '【ब्लॉक A】वैदिक कोर (7 लेयर)',
      result.blockA?.hindiSummary || '—',
      SEP,
      '【ब्लॉक B】संभावना मानचित्र',
      result.blockB ? [
        `तेज़ तेजी: ${result.blockB.strongRally}%`,
        `तेजी:     ${result.blockB.bull}%`,
        `सपाट:    ${result.blockB.flat}%`,
        `मंदी:    ${result.blockB.bear}%`,
        `क्रैश:   ${result.blockB.crash}%`,
        `विश्वास:  ${result.blockB.confidence}%`,
      ].join(' | ') : '—',
      SEP,
      '【ब्लॉक C】इंट्राडे टाइमिंग',
      result.blockC?.formattedHindi || '—',
      SEP,
      '【ब्लॉक D】मुख्य क्षण',
      result.blockD?.formattedHindi || '—',
      SEP,
      '【ब्लॉक E】क्रैश इंटेलिजेंस',
      result.blockE?.formattedHindi || '—',
      SEP,
      '【ब्लॉक F】ML पैटर्न',
      result.blockF?.formattedHindi || '—',
      SEP,
      `⏱ विश्लेषण समय: ${result.elapsedMs}ms | ${result.generatedAt}`,
    ];
    return lines.join('\n');
  }

  // Clear cache (for testing)
  function clearCache() { _cache.clear(); }

  // ── Public API ────────────────────────────────────────────
  return { runNYDeepDive, formatFullReport, clearCache };

})();

if (typeof module !== 'undefined') module.exports = NY_ORCHESTRATOR;
if (typeof window !== 'undefined') window.NY_ORCHESTRATOR = NY_ORCHESTRATOR;

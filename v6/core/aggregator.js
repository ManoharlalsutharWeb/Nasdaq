/* ============================================================
   VedicAladdin V6 — core/aggregator.js
   Collect ALL module reports → build final JSON packs
   V5 fully preserved + V6 additions:
     runFullAnalysis    — master function for any date
     runInstantAnalysis — fast 500ms version
     runNYDeepDive      — 6-block deep dive output
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const AGGREGATOR = (function () {
  'use strict';

  const REPORT_CACHE = new Map();

  // Module resolver (browser + Node.js)
  function ref(name) {
    const M = {
      NATAL   : typeof NATAL    !== 'undefined' ? NATAL    : null,
      DASHA   : typeof DASHA    !== 'undefined' ? DASHA    : null,
      TRANSITS: typeof TRANSITS !== 'undefined' ? TRANSITS : null,
      EVENTS  : typeof EVENTS   !== 'undefined' ? EVENTS   : null,
      VARGA   : typeof VARGA    !== 'undefined' ? VARGA    : null,
      SESSIONS: typeof SESSIONS !== 'undefined' ? SESSIONS : null,
      REGIME  : typeof REGIME   !== 'undefined' ? REGIME   : null,
      SCORING : typeof SCORING  !== 'undefined' ? SCORING  : null,
      TYPES   : typeof TYPES    !== 'undefined' ? TYPES    : null,
      CONFIG  : typeof CONFIG   !== 'undefined' ? CONFIG   : null,
    };
    if (M[name]) return M[name];
    try { return require('./' + name.toLowerCase()); } catch (e) { return null; }
  }

  function todayIST() {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600000);
    return ist.toISOString().split('T')[0];
  }

  function isHoliday(ds) {
    const fixed = ['-01-01', '-07-04', '-12-25'];
    return fixed.some(h => ds.endsWith(h));
  }

  function isMarketDay(ds) {
    if (isHoliday(ds)) return false;
    const d = new Date(ds + 'T12:00:00Z');
    return d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
  }

  // ════════════════════════════════════════════════════════
  // V5 — COLLECT ALL (preserved, upgraded to V6 schema)
  // ════════════════════════════════════════════════════════
  function collectAll(dateIST, timeIST = '15:00') {
    const cacheKey = `${dateIST}|${timeIST}`;
    if (REPORT_CACHE.has(cacheKey)) return REPORT_CACHE.get(cacheKey);

    const N  = ref('NATAL'), D  = ref('DASHA'), T  = ref('TRANSITS'),
          E  = ref('EVENTS'), V  = ref('VARGA'), S  = ref('SESSIONS'),
          R  = ref('REGIME'), SC = ref('SCORING');

    // 1. Natal D1
    const natalD1 = N.getNasdaq();

    // 2. Transit report
    const transitReport = T.buildReport(dateIST, natalD1, timeIST);

    // 3. Dasha
    const moonSid = natalD1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
    const [y, m, dv] = dateIST.split('-').map(Number);
    const [hh, mm]   = (timeIST || '15:00').split(':').map(Number);
    const totalMin   = hh * 60 + mm - 330;
    const utcDay     = Math.floor(totalMin / 1440);
    const utcMin     = ((totalMin % 1440) + 1440) % 1440;
    const utcDate    = new Date(Date.UTC(y, m - 1, dv + utcDay, 0, utcMin));
    const jd = N.JD(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(),
                    utcDate.getUTCHours(), utcDate.getUTCMinutes());
    const birth  = N.NASDAQ_BIRTH;
    const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
    const dasha  = D.getCurrent(birthJD, moonSid, jd);
    const dashaInterp = dasha ? { sc: D.getDashaScore(dasha.maha, dasha.antar),
                                    mahaInterp: { desc: D.DASHA_MKT[dasha.maha]?.hi || '' },
                                    ...dasha } : { sc: 0 };

    // 4. Events
    const eventsReport = E.buildAstroEvents(dateIST, natalD1, dasha);

    // 5. All vargas D1–D60
    const vargaReports   = V.analyzeAll(natalD1, dasha, transitReport);
    const vargaConsensus = V.getConsensus(vargaReports);

    // 6. House analysis
    const natalAnalysis = N.analyze12Houses(natalD1, dasha, transitReport.planets);

    // 7. Sessions
    const sesAsian  = S.analyzeSession('asian',   {}, natalD1, dasha, transitReport);
    const sesLondon = S.analyzeSession('london',  {}, natalD1, dasha, transitReport);
    const sesNY     = S.analyzeSession('newyork', {}, natalD1, dasha, transitReport);
    const nyPlaybook = S.analyzeNYOpenPlaybook({}, natalD1, dasha, transitReport, eventsReport);

    // 8. Regime
    const regimeDay    = R.detectDay(transitReport, natalD1, dasha, eventsReport);
    const regimeReport = R.detectCrashWindows(dateIST, natalD1, dasha, eventsReport, 1); // 1-day in collectAll; buildDaily uses 30

    // 9. Hora + panchang
    const hora = S.calcHora(jd);
    const nowH = new Date().getHours();
    const horaScore = hora.reduce((s, h) => h.startH >= 9 && h.startH < 22 ? s + (h.ben ? 2 : -2) : s, 0);

    // 10. Final scoring
    const finalResult = SC.finalDecision({
      natalAnalysis, vargaReports, dashaInterp,
      transitReport, panchangData: transitReport.panchang,
      horaScore,
      sessionReports: { asian: sesAsian, london: sesLondon, newyork: sesNY },
      eventsReport, regimeReport,
    });

    const result = {
      dateIST, timeIST, jd,
      natalD1, transitReport, dasha, dashaInterp,
      eventsReport, vargaReports, vargaConsensus,
      natalAnalysis, hora, horaScore,
      sessionReports: { asian: sesAsian, london: sesLondon, newyork: sesNY },
      nyPlaybook, regimeDay, regimeReport,
      finalResult,
      schemaVersion: "6.0",
    };

    REPORT_CACHE.set(cacheKey, result);
    setTimeout(() => REPORT_CACHE.delete(cacheKey), 30 * 60 * 1000); // 30-min TTL
    return result;
  }

  // ════════════════════════════════════════════════════════
  // V5 — BUILD DAILY (preserved, schema → 6.0)
  // ════════════════════════════════════════════════════════
  function buildDaily(dateIST) {
    const d  = collectAll(dateIST);
    const fr = d.finalResult;
    const pan = d.transitReport.panchang;
    return {
      schemaVersion : "6.0",
      moduleId      : "daily",
      dateIST,
      finalCall     : fr.finalCall,
      finalConfidence: fr.finalConfidence,
      rawScore      : fr.rawScore,
      componentScores: fr.componentScores,
      topReasons    : fr.topReasons,
      topRisks      : fr.topRisks,
      bestWindows   : fr.bestWindows,
      avoidWindows  : fr.avoidWindows,
      invalidationRules: fr.invalidationRules,
      crashRegimeWindows: fr.crashRegimeWindows,
      panchang: {
        nakshatra   : pan.nakHi,
        tithi       : pan.tithi,
        paksha      : pan.paksha,
        yoga        : pan.yogaHi,
        karana      : pan.karanaHi,
        var         : pan.varHi,
        score       : pan.score,
      },
      dasha: {
        maha    : d.dasha?.maha,
        mahaHi  : d.dasha?.mahaHi,
        antar   : d.dasha?.antar,
        antarHi : d.dasha?.antarHi,
        prat    : d.dasha?.pratyantar,
        marketBias: d.dasha?.marketBias,
        descHi  : d.dasha?.marketDescHi,
      },
      isHoliday  : isHoliday(dateIST),
      isMarketDay: isMarketDay(dateIST),
      generatedAt: new Date().toISOString(),
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — BUILD SESSIONS (preserved)
  // ════════════════════════════════════════════════════════
  function buildSessions(dateIST, data) {
    const d  = data || collectAll(dateIST);
    const sr = d.sessionReports;
    return {
      schemaVersion: "6.0",
      moduleId: "sessions",
      dateIST,
      asian  : sr.asian,
      london : sr.london,
      newyork: sr.newyork,
      generatedAt: new Date().toISOString(),
    };
  }

  function buildNYOpen(dateIST, data) {
    const d = data || collectAll(dateIST);
    return {
      schemaVersion: "6.0",
      moduleId: "ny_open",
      dateIST,
      ...d.nyPlaybook,
      generatedAt: new Date().toISOString(),
    };
  }

  function buildAlerts(dateIST, data) {
    const d  = data || collectAll(dateIST);
    const fr = d.finalResult;
    const alerts = [];
    if (d.regimeDay?.isCrashRegime) {
      alerts.push({ severity:'P1', type:'CRASH_RISK', msg:'Crash Regime सक्रिय — जोखिम उच्च है', hindi:true });
    }
    fr.topRisks.forEach(r => alerts.push({ severity:'P2', type:'RISK', msg:r, hindi:true }));
    d.eventsReport.events.filter(e => e.window?.severity === 'P1').forEach(e =>
      alerts.push({ severity:'P1', type:e.type, msg:e.window?.notes?.[0] || e.type, hindi:true })
    );
    return {
      schemaVersion: "6.0",
      moduleId: "alerts",
      dateIST,
      alerts,
      crashRisk     : d.regimeDay?.crashProbability || 0,
      hasCrashRisk  : d.regimeDay?.hasCrashRisk || false,
      generatedAt   : new Date().toISOString(),
    };
  }

  function buildWeekly(dateIST) {
    const [y, m, dv] = dateIST.split('-').map(Number);
    const base = new Date(y, m - 1, dv);
    const dow  = base.getDay();
    const mon  = new Date(base);
    mon.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d2 = new Date(mon); d2.setDate(mon.getDate() + i);
      const ds = d2.toISOString().split('T')[0];
      try {
        const dd = buildDaily(ds);
        days.push({
          date: ds, day: ['सोम','मंगल','बुध','गुरु','शुक्र'][i],
          finalCall: dd.finalCall, confidence: dd.finalConfidence,
          score: dd.rawScore, nakshatra: dd.panchang?.nakshatra || '',
          isHoliday: dd.isHoliday, isMarketDay: dd.isMarketDay,
        });
      } catch (e) { days.push({ date: ds, error: e.message }); }
    }
    return {
      schemaVersion: "6.0", moduleId: "weekly",
      weekStart: mon.toISOString().split('T')[0],
      days, generatedAt: new Date().toISOString(),
    };
  }

  function buildMonthly(dateIST) {
    const [y, m] = dateIST.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const days = [];
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      try {
        const dd = buildDaily(ds);
        days.push({
          date: ds, finalCall: dd.finalCall, score: dd.rawScore,
          confidence: dd.finalConfidence, nakshatra: dd.panchang?.nakshatra || '',
          isHoliday: dd.isHoliday, isMarketDay: dd.isMarketDay,
        });
      } catch (e) { days.push({ date: ds, error: e.message }); }
    }
    return {
      schemaVersion: "6.0", moduleId: "monthly",
      month: `${y}-${String(m).padStart(2,'0')}`,
      days, generatedAt: new Date().toISOString(),
    };
  }

  function buildVargaJSON(div, dateIST, data) {
    const d   = data || collectAll(dateIST);
    const key = `D${div}`;
    const report = d.vargaReports?.[key];
    const VR = ref('VARGA');
    const meta  = VR?.VARGA_META?.[key] || {};
    return {
      schemaVersion: "6.0", moduleId: `varga_${key}`, dateIST, div, key,
      meta: { name: meta.name || key, hi: meta.hi || key, mkt: meta.mkt || '', relevance: meta.relevance || 50 },
      directionHint    : report?.directionHint || 'NEUT',
      relevanceScore   : report?.relevanceScore || 50,
      confidenceImpact : report?.confidenceImpact || 0,
      planetScore      : report?.planetScore || 0,
      riskTags         : report?.riskTags || [],
      accuracyWarning  : report?.accuracyWarning || false,
      explanations     : report?.explanations || [],
      planetEvidence   : report?.planetEvidence || [],
      evidence         : report?.evidence || [],
      generatedAt      : new Date().toISOString(),
    };
  }

  function buildIntraday(dateIST, startIST, endIST, stepMinutes = 15) {
    const parse = s => { const [a, b] = String(s || '00:00').split(':').map(Number); return a * 60 + b; };
    let start = parse(startIST), end = parse(endIST);
    if (end <= start) end += 1440;
    const rows = [];
    for (let t = start; t <= end; t += Math.max(1, Number(stepMinutes) || 15)) {
      const minute = t % 1440;
      const time = `${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}`;
      const d = collectAll(dateIST, time);
      rows.push({
        timeIST: time, finalCall: d.finalResult.finalCall,
        confidence: d.finalResult.finalConfidence, rawScore: d.finalResult.rawScore,
        transitScore: d.transitReport.totalScore,
        moonSid: d.transitReport.planets.find(p => p.eng === 'Moon')?.sidLon || 0,
        riskTags: [...new Set(d.transitReport.aspects.filter(a => a.riskTag).map(a => a.riskTag))],
      });
    }
    return {
      schemaVersion: '6.0', moduleId: 'intraday', dateIST, startIST, endIST,
      stepMinutes: Number(stepMinutes) || 15, rows,
      summary: {
        bull: rows.filter(r => r.finalCall === 'BULL').length,
        bear: rows.filter(r => r.finalCall === 'BEAR').length,
        neut: rows.filter(r => r.finalCall === 'NEUT').length,
      },
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: runFullAnalysis — master function
  // ════════════════════════════════════════════════════════
  /**
   * Run complete V6 analysis for any date
   * Uses all 11+ core modules
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {Object} full analysis JSON, schemaVersion "6.0"
   */
  function runFullAnalysis(dateStr) {
    try {
      const t0   = Date.now();
      const data = collectAll(dateStr);
      const SC   = ref('SCORING');
      const fr   = data.finalResult;

      // Signal strength
      const sigStrength = SC.getSignalStrength(fr.rawScore);

      // Confluence across all available evidence
      const allEvidence = [
        { system:'kundali',      direction: fr.componentScores.kundali?.direction   || 'NEUTRAL', score: fr.componentScores.kundali?.score   || 0, hindiDesc:'कुंडली विश्लेषण' },
        { system:'transits',     direction: fr.componentScores.transits?.direction  || 'NEUTRAL', score: fr.componentScores.transits?.score  || 0, hindiDesc:'ग्रह ट्रांज़िट' },
        { system:'panchang',     direction: fr.componentScores.panchang?.direction  || 'NEUTRAL', score: fr.componentScores.panchang?.score  || 0, hindiDesc:'पंचांग' },
        { system:'sessions_ny',  direction: data.sessionReports.newyork?.direction  || 'NEUTRAL', score: data.sessionReports.newyork?.score  || 0, hindiDesc:'NY सत्र' },
        { system:'dasha',        direction: (data.dasha?.marketBias === 'BULL' ? 'BULL' : data.dasha?.marketBias === 'BEAR' ? 'BEAR' : 'NEUTRAL'), score: data.dashaInterp?.sc || 0, hindiDesc:'वीमशोत्तरी दशा' },
      ];
      const confluence = SC.getConfluenceScore(allEvidence);

      // Mode determination
      const today = todayIST();
      const mode  = dateStr < today ? 'HISTORICAL' : dateStr === today ? 'LIVE' : 'FORECAST';

      return {
        dateIST           : dateStr,
        signal            : sigStrength.signal,
        signalHi          : sigStrength.hi,
        signalColor       : sigStrength.color,
        confidence        : fr.finalConfidence,
        crashRisk         : data.regimeDay?.crashProbability || 0,
        riskCategory      : data.regimeDay?.riskCategory || 'MINIMAL',
        sessions: {
          asian  : { direction: data.sessionReports.asian?.direction,  score: data.sessionReports.asian?.score,  confidence: data.sessionReports.asian?.confidence },
          london : { direction: data.sessionReports.london?.direction, score: data.sessionReports.london?.score, confidence: data.sessionReports.london?.confidence },
          ny     : { direction: data.sessionReports.newyork?.direction,score: data.sessionReports.newyork?.score,confidence: data.sessionReports.newyork?.confidence },
        },
        dasha: {
          maha    : data.dasha?.maha,
          mahaHi  : data.dasha?.mahaHi,
          antar   : data.dasha?.antar,
          antarHi : data.dasha?.antarHi,
          pratyantar: data.dasha?.pratyantar,
          marketBias: data.dasha?.marketBias,
          descHi  : data.dasha?.marketDescHi,
        },
        topYoga           : data.eventsReport?.events?.[0]?.window?.label || '',
        keyFactors        : fr.topReasons.slice(0, 3),
        confluence,
        mode,
        panchang          : data.transitReport?.panchang,
        vargaConsensus    : data.vargaConsensus,
        fullResult        : fr,
        elapsedMs         : Date.now() - t0,
        generatedAt       : new Date().toISOString(),
        schemaVersion     : "6.0",
      };
    } catch (e) {
      console.error('[AGGREGATOR] runFullAnalysis error:', e);
      return { dateIST: dateStr, signal: 'NEUTRAL', confidence: 50, error: e.message, schemaVersion: "6.0" };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: runInstantAnalysis — fast 500ms version
  // ════════════════════════════════════════════════════════
  /**
   * Fast analysis — skips slow modules (D60, regime windows, monthly)
   * Target: < 500ms
   */
  function runInstantAnalysis(dateStr) {
    try {
      const t0 = Date.now();
      const N  = ref('NATAL'), D = ref('DASHA'), T = ref('TRANSITS'), SC = ref('SCORING');

      const natalD1     = N.getNasdaq();
      const transitReport = T.buildReport(dateStr, natalD1);
      const ayan        = N.lahiri(transitReport.jd);
      const moonSid     = natalD1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
      const birth       = N.NASDAQ_BIRTH;
      const birthJD     = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const dasha       = D.getCurrent(birthJD, moonSid, transitReport.jd);
      const dashaScore  = dasha ? D.getDashaScore(dasha.maha, dasha.antar) : 0;

      // Quick transit score
      const transitScore = transitReport.totalScore || 0;
      const panchangScore = transitReport.panchang?.score || 0;

      // Simplified raw score
      const rawScore = dashaScore * 0.5 + transitScore * 0.15 + panchangScore * 0.05;
      const normScore = parseFloat(SC.normalize(rawScore, 15).toFixed(1));
      const sigStrength = SC.getSignalStrength(normScore);

      // Quick crash risk (single-day only)
      const R = ref('REGIME');
      let crashRisk = 0;
      try {
        const E = ref('EVENTS');
        const evts = E.buildAstroEvents(dateStr, natalD1, dasha);
        const regDay = R.detectDay(transitReport, natalD1, dasha, evts);
        crashRisk = regDay.crashProbability;
      } catch (_) {}

      const today = todayIST();
      const mode  = dateStr < today ? 'HISTORICAL' : dateStr === today ? 'LIVE' : 'FORECAST';

      return {
        dateIST     : dateStr,
        signal      : sigStrength.signal,
        signalHi    : sigStrength.hi,
        confidence  : Math.min(80, 40 + Math.abs(normScore)),
        crashRisk,
        sessions: { asian: null, london: null, ny: null },  // skipped for speed
        dashaLord   : dasha?.mahaHi || '',
        topYoga     : '',
        keyFactors  : [],
        mode,
        elapsedMs   : Date.now() - t0,
        generatedAt : new Date().toISOString(),
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { dateIST: dateStr, signal: 'NEUTRAL', confidence: 50, error: e.message, schemaVersion: "6.0" };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: runNYDeepDive — 6-block output shell
  // (Full implementation in ny_engine/ny_orchestrator.js)
  // ════════════════════════════════════════════════════════
  function runNYDeepDive(dateStr) {
    try {
      const t0   = Date.now();
      const data = collectAll(dateStr);
      const fr   = data.finalResult;

      // Block B — Probability Map (quick version)
      const score = fr.rawScore;
      const strongRally = Math.max(0, Math.min(50, score > 40 ? 35 + score * 0.3 : score > 20 ? 20 : 5));
      const bull        = Math.max(0, Math.min(40, score > 10 ? 25 : score > 0 ? 15 : 5));
      const flat        = 30;
      const bear        = Math.max(0, Math.min(35, score < -10 ? 20 : 10));
      const crash       = Math.max(0, Math.min(25, score < -30 ? 20 + data.regimeDay?.crashProbability * 0.1 : 5));
      const total       = strongRally + bull + flat + bear + crash;
      const norm        = v => parseFloat((v / total * 100).toFixed(1));

      return {
        dateIST       : dateStr,
        blockA: {
          vedicScore  : fr.rawScore,
          dashaLayer  : data.dasha,
          topAspects  : data.transitReport?.aspects?.slice(0, 5) || [],
          nakshatra   : data.transitReport?.panchang?.nakHi,
          summaryHi   : `वैदिक स्कोर: ${fr.rawScore.toFixed(1)} | दशा: ${data.dasha?.mahaHi || '--'} | नक्षत्र: ${data.transitReport?.panchang?.nakHi || '--'}`,
        },
        blockB: {
          strongRally : norm(strongRally),
          bull        : norm(bull),
          flat        : norm(flat),
          bear        : norm(bear),
          crash       : norm(crash),
          confidence  : fr.finalConfidence,
        },
        blockC: { hindiText: 'टाइमिंग: ny_engine/block_c_timing.js में उपलब्ध' },
        blockD: { events: data.eventsReport?.events?.slice(0, 5) || [] },
        blockE: {
          crashScore  : data.regimeDay?.crashProbability || 0,
          riskCategory: data.regimeDay?.riskCategory || 'MINIMAL',
          triggered   : data.regimeDay?.triggered || [],
          notTriggered: data.regimeDay?.notTriggered || [],
        },
        blockF: { hindiText: 'ML पैटर्न: ny_engine/block_f_ml.js में उपलब्ध' },
        overallSignal    : fr.finalCall,
        overallConfidence: fr.finalConfidence,
        elapsedMs        : Date.now() - t0,
        generatedAt      : new Date().toISOString(),
        schemaVersion    : "6.0",
      };
    } catch (e) {
      return { dateIST: dateStr, error: e.message, schemaVersion: "6.0" };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    collectAll,
    buildDaily,
    buildSessions,
    buildNYOpen,
    buildAlerts,
    buildWeekly,
    buildMonthly,
    buildVargaJSON,
    buildIntraday,
    todayIST,
    isHoliday,
    isMarketDay,
    // V6 new
    runFullAnalysis,
    runInstantAnalysis,
    runNYDeepDive,
    REPORT_CACHE,
  };

})();

if (typeof module !== 'undefined') module.exports = AGGREGATOR;
if (typeof window !== 'undefined') window.AGGREGATOR = AGGREGATOR;

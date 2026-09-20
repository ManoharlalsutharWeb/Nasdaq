/* ============================================================
   VedicAladdin V6 — core/types.js
   Type Definitions & Factory Functions
   V5 types preserved + V6 additions
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const TYPES = (function () {
  'use strict';

  const SCHEMA = "6.0";

  // ── Helpers ───────────────────────────────────────────────
  function ts() { return new Date().toISOString(); }

  // ════════════════════════════════════════════════════════
  // V5 TYPES — PRESERVED
  // ════════════════════════════════════════════════════════

  /**
   * PlanetPosition — single planet's sidereal state
   * @param {string} eng   English name
   * @param {string} hi    Hindi name
   * @param {number} sidLon Sidereal longitude 0-360
   * @param {number} rashi  Sign index 0-11
   * @param {number} deg    Degree within sign 0-29.99
   * @param {number} nak    Nakshatra index 0-26
   * @param {boolean} retro Is retrograde
   * @param {number} house  Whole-sign house 1-12
   * @param {string} dignity exalted/debilitated/moolatrikona/own/neutral
   */
  function PlanetPosition(eng, hi, sidLon, rashi, deg, nak, retro, house, dignity) {
    return {
      eng, hi, sidLon, rashi, deg, nak, retro,
      house, dignity, schemaVersion: SCHEMA,
    };
  }

  /**
   * NatalChart — NASDAQ birth chart
   */
  function NatalChart(lagnaSign, planets, jd) {
    return {
      lagnaSign,          // 0-11
      lagnaHi: '',        // Hindi sign name
      planets,            // PlanetPosition[]
      jd,                 // Julian Day of birth
      schemaVersion: SCHEMA,
    };
  }

  /**
   * AspectResult — one transit-to-natal aspect
   */
  function AspectResult(fromEng, toEng, aspectEng, aspectHi, orb, score, applying) {
    return { fromEng, toEng, aspectEng, aspectHi, orb, score, applying };
  }

  /**
   * TransitReport — all transit planets + aspects for one day
   */
  function TransitReport(dateIST, jd, planets, aspects, totalScore) {
    return { dateIST, jd, planets, aspects, totalScore, schemaVersion: SCHEMA };
  }

  /**
   * DashaPeriod — one antar/maha entry
   */
  function DashaPeriod(maha, mahaHi, antar, antarHi, pratyantar, pratyantarHi,
                       mahaStart, mahaEnd, antarStart, antarEnd, schemaV) {
    return {
      maha, mahaHi, antar, antarHi, pratyantar, pratyantarHi,
      mahaStart, mahaEnd, antarStart, antarEnd,
      schemaVersion: schemaV || SCHEMA,
    };
  }

  /**
   * ScoringResult — final blended score
   */
  function ScoringResult(finalScore, finalDir, confidence, components, invalidationRules) {
    return {
      finalScore, finalDir, confidence,
      components: components || [],
      invalidationRules: invalidationRules || [],
      schemaVersion: SCHEMA,
    };
  }

  /**
   * SessionReport — one trading session analysis
   */
  function SessionReport(session, dateIST, score, dir, confidence, events, quickSummary) {
    return {
      session, dateIST, score, dir, confidence,
      events: events || [],
      quickSummary: quickSummary || '',
      schemaVersion: SCHEMA,
    };
  }

  /**
   * RegimeReport — crash risk assessment
   */
  function RegimeReport(dateIST, crashProbability, isCrashRegime, severity, evidence) {
    return {
      dateIST, crashProbability, isCrashRegime, severity,
      evidence: evidence || [],
      schemaVersion: SCHEMA,
    };
  }

  /**
   * DailyReport — master daily output
   */
  function DailyReport(dateIST, signal, confidence, crashRisk, sessions, dashaLord,
                       topYoga, keyFactors, schemaV) {
    return {
      dateIST, signal, confidence, crashRisk,
      sessions: sessions || {},
      dashaLord: dashaLord || '',
      topYoga: topYoga || '',
      keyFactors: keyFactors || [],
      generatedAt: ts(),
      schemaVersion: schemaV || SCHEMA,
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW TYPES
  // ════════════════════════════════════════════════════════

  /**
   * ThreeModeType — which analysis mode is active
   */
  function ThreeModeType(mode, date) {
    if (!['HISTORICAL', 'LIVE', 'FORECAST'].includes(mode)) {
      throw new Error(`[TYPES] Invalid mode: ${mode}`);
    }
    return { mode, date, schemaVersion: SCHEMA };
  }

  /**
   * InstantResult — fast 0.5s analysis result for any date
   */
  function InstantResult(dateIST, signal, confidence, crashRisk,
                         sessions, dashaLord, topYoga, keyFactors,
                         mode, elapsedMs) {
    return {
      dateIST,
      signal,          // STRONG_BULL | BULL | NEUTRAL | BEAR | STRONG_BEAR
      confidence,      // 0-100
      crashRisk,       // 0-100
      sessions: {
        asian  : sessions?.asian   || null,
        london : sessions?.london  || null,
        ny     : sessions?.ny      || null,
      },
      dashaLord,
      topYoga,
      keyFactors: keyFactors || [],
      mode,            // HISTORICAL | LIVE | FORECAST
      elapsedMs: elapsedMs || 0,
      generatedAt: ts(),
      schemaVersion: SCHEMA,
    };
  }

  /**
   * PossibilityMap — 5-tier probability distribution
   * All 5 must sum to 100
   */
  function PossibilityMap(strongRally, bull, flat, bear, crash, confidence) {
    const total = (strongRally || 0) + (bull || 0) + (flat || 0) +
                  (bear || 0) + (crash || 0);
    if (Math.abs(total - 100) > 0.1) {
      console.warn(`[TYPES] PossibilityMap sum=${total}, expected 100`);
    }
    return {
      strongRally : parseFloat((strongRally || 0).toFixed(1)),
      bull        : parseFloat((bull        || 0).toFixed(1)),
      flat        : parseFloat((flat        || 0).toFixed(1)),
      bear        : parseFloat((bear        || 0).toFixed(1)),
      crash       : parseFloat((crash       || 0).toFixed(1)),
      confidence  : confidence || 50,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * IntradayBlock — one 30-min block for NY timing
   */
  function IntradayBlock(startIST, endIST, quality, horaLord, reason, hindiText, color) {
    return {
      startIST, endIST,
      quality,      // A+ | A | B | C | D | F
      horaLord,
      reason,
      hindiText,
      color,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * CrashRule — one of 21 crash detection rules
   */
  function CrashRule(id, weight, descHi, triggered, triggerReason) {
    return {
      id, weight, descHi,
      triggered: !!triggered,
      triggerReason: triggerReason || '',
      schemaVersion: SCHEMA,
    };
  }

  /**
   * VedicRuleResult — result of one Vedic rule evaluation
   */
  function VedicRuleResult(ruleId, system, direction, score, confidence, hindiDesc) {
    return {
      ruleId,
      system,     // dasha | transit | yoga | ashtakavarga | nakshatra | muhurta
      direction,  // BULL | BEAR | NEUTRAL
      score,
      confidence,
      hindiDesc,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * ConfluenceScore — how many Vedic systems agree
   */
  function ConfluenceScore(totalSystems, bullSystems, bearSystems, neutralSystems,
                           direction, confidence) {
    return {
      totalSystems,
      bullSystems,
      bearSystems,
      neutralSystems,
      direction,      // BULL | BEAR | NEUTRAL
      confidence,     // 0-100
      summaryHi: `${totalSystems} में से ${Math.max(bullSystems, bearSystems)} सिस्टम सहमत`,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * NYDeepDiveResult — full 6-block NY analysis
   */
  function NYDeepDiveResult(dateIST, blockA, blockB, blockC, blockD, blockE, blockF,
                            overallSignal, overallConfidence, elapsedMs) {
    return {
      dateIST,
      blockA: blockA || null,   // Vedic core (7 layers)
      blockB: blockB || null,   // Possibility map
      blockC: blockC || null,   // Intraday timing
      blockD: blockD || null,   // Key moments
      blockE: blockE || null,   // Crash intelligence
      blockF: blockF || null,   // ML pattern
      overallSignal,
      overallConfidence,
      elapsedMs: elapsedMs || 0,
      generatedAt: ts(),
      schemaVersion: SCHEMA,
    };
  }

  /**
   * YogaResult — one of the 32 Vedic yogas
   */
  function YogaResult(id, name, nameHi, type, active, strength, priorityLevel, hindiEffect) {
    return {
      id, name, nameHi,
      type,         // RAJA | DHANA | ANISHTA | SPECIAL
      active: !!active,
      strength,     // 0-100
      priorityLevel,// P1 | P2 | P3
      hindiEffect,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * AshtakavargaResult — for one planet
   */
  function AshtakavargaResult(planet, planetHi, bav, bindusInTransitSign,
                              quality, hindiText) {
    return {
      planet, planetHi,
      bav: bav || [],      // 12-element array (bindus per sign)
      bindusInTransitSign,
      quality,             // 0-8
      hindiText,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * EclipseData — one solar or lunar eclipse
   */
  function EclipseData(type, date, jd, axis, magnitude, natalImpact, hindiText) {
    return {
      type,       // SOLAR | LUNAR
      date, jd,
      axis,       // { sign1, sign2 }
      magnitude,
      natalImpact,// score
      hindiText,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * PatternMatch — one ML historical date match
   */
  function PatternMatch(date, similarityPct, nasadqOutcomePct, description) {
    return {
      date,
      similarityPct: parseFloat(similarityPct.toFixed(1)),
      nasadqOutcomePct: parseFloat(nasadqOutcomePct.toFixed(2)),
      description,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * SessionEventLevel — smart alert level for Asian/London
   */
  function SessionEventLevel(session, level, events, needsFullAnalysis) {
    return {
      session,
      level,            // 'none' | 'minor' | 'major'
      events: events || [],
      needsFullAnalysis: !!needsFullAnalysis,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * BacktestEntry — one historical prediction vs actual
   */
  function BacktestEntry(date, predictedSignal, actualMove, correct, confidence) {
    return {
      date,
      predictedSignal,
      actualMove: parseFloat(actualMove.toFixed(2)),
      correct: !!correct,
      confidence,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * ShadabalaResult — 6 planetary strengths
   */
  function ShadabalaResult(planet, sthanaBala, dikBala, kalaBala, chestaBala,
                            naisargikaBala, drikBala, totalRupas, isAboveMin) {
    return {
      planet,
      sthanaBala, dikBala, kalaBala, chestaBala,
      naisargikaBala, drikBala,
      totalRupas: parseFloat(totalRupas.toFixed(2)),
      isAboveMin: !!isAboveMin,
      schemaVersion: SCHEMA,
    };
  }

  /**
   * JaiminiResult — Chara Dasha state
   */
  function JaiminiResult(mahadasha, antardasha, mahaStart, mahaEnd,
                          antarStart, antarEnd, hindiText) {
    return {
      mahadasha, antardasha,
      mahaStart, mahaEnd, antarStart, antarEnd,
      hindiText,
      schemaVersion: SCHEMA,
    };
  }

  // ────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────
  return {
    SCHEMA,
    // V5 types
    PlanetPosition,
    NatalChart,
    AspectResult,
    TransitReport,
    DashaPeriod,
    ScoringResult,
    SessionReport,
    RegimeReport,
    DailyReport,
    // V6 new types
    ThreeModeType,
    InstantResult,
    PossibilityMap,
    IntradayBlock,
    CrashRule,
    VedicRuleResult,
    ConfluenceScore,
    NYDeepDiveResult,
    YogaResult,
    AshtakavargaResult,
    EclipseData,
    PatternMatch,
    SessionEventLevel,
    BacktestEntry,
    ShadabalaResult,
    JaiminiResult,
  };

})();

if (typeof module !== 'undefined') module.exports = TYPES;
if (typeof window !== 'undefined') window.TYPES = TYPES;

/* ============================================================
   VedicAladdin V6 — core/scoring.js
   Kundali-First Weighting + Conflict Resolution + Confidence
   V6 weights: Kundali 55% | Transits 15% | Ashtakavarga 15%
               | Yogas 10% | Panchang 5%
   V5 fully preserved + V6 additions:
     getConfluenceScore — how many Vedic systems agree
     getSignalStrength  — STRONG_BULL/BULL/NEUTRAL/BEAR/STRONG_BEAR
     getTopReasons      — top N drivers in Hindi
     getConfidenceLevel — % confidence from confluence
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const SCORING = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════
  // V5 — WEIGHTS (V6 restructured)
  // V5 was: kundali 75%, transits 20%, panchang 5%
  // V6 is:  kundali 55%, transits 15%, ashtakavarga 15%, yogas 10%, panchang 5%
  // ════════════════════════════════════════════════════════
  const DEFAULT_WEIGHTS = {
    kundali      : 0.55,  // D1 + key vargas + dasha
    transits     : 0.15,  // transit exactness
    ashtakavarga : 0.15,  // BAV + SAV
    yogas        : 0.10,  // 32 Vedic yogas
    panchang     : 0.05,  // tithi / nakshatra / yoga
  };

  // V5 weights preserved for backward compatibility
  const V5_WEIGHTS = {
    kundali:  0.75,
    transits: 0.20,
    panchang: 0.05,
    other:    0.00,
  };

  // ════════════════════════════════════════════════════════
  // V5 — CORE FUNCTIONS (preserved)
  // ════════════════════════════════════════════════════════
  function normalize(raw, maxExpected = 30) {
    return Math.max(-100, Math.min(100, (raw / maxExpected) * 100));
  }

  function calcKundaliScore(natalAnalysis, vargaReports, dashaInterp) {
    let sc = 0;
    const evidence = [];

    if (natalAnalysis?.overallHouseScore) {
      sc += natalAnalysis.overallHouseScore * 0.3;
      evidence.push(`D1 हाउस सक्रियता: ${natalAnalysis.overallHouseScore.toFixed(1)}`);
    }

    const keyDiv = [1, 9, 10, 30, 2, 3];
    keyDiv.forEach(d => {
      const r = vargaReports?.[`D${d}`];
      if (!r) return;
      const w = r.relevanceScore / 100;
      sc += r.planetScore * w * 0.5;
      evidence.push(`D${d}: ${r.directionHint} (${parseFloat(r.planetScore || 0).toFixed(1)})`);
    });

    if (dashaInterp) {
      sc += dashaInterp.sc * 0.8;
      evidence.push(`दशा ${dashaInterp?.mahaInterp?.desc || dashaInterp?.mahaHi || ''}: ${dashaInterp.sc}`);
    }

    return { score: parseFloat(sc.toFixed(2)), evidence };
  }

  function calcTransitScore(transitReport) {
    if (!transitReport) return { score: 0, evidence: [] };
    const sc  = transitReport.totalScore || 0;
    const top = transitReport.aspects?.slice(0, 3) || [];
    const evidence = top.map(a => `${a.fromEng}→${a.toEng} ${a.aspectEng}: ${a.score}`);
    return { score: parseFloat(sc.toFixed(2)), evidence };
  }

  function calcPanchangScore(panchangData) {
    if (!panchangData) return { score: 0, evidence: [] };
    const sc = panchangData.score || 0;
    return {
      score: parseFloat(sc.toFixed(2)),
      evidence: [`नक्षत्र ${panchangData.nakHi || '--'}: ${sc}`],
    };
  }

  function calcOtherScore(sessionReports, regimeReport) {
    let sc = 0;
    const evidence = [];
    if (sessionReports?.newyork) {
      sc += sessionReports.newyork.score * 0.1;
      evidence.push(`NY सत्र: ${sessionReports.newyork.score?.toFixed(1)}`);
    }
    if (regimeReport?.hasCrashRisk) {
      sc -= 5;
      evidence.push('Crash Regime सक्रिय: -5');
    }
    return { score: parseFloat(sc.toFixed(2)), evidence };
  }

  function detectConflict(kundaliDir, transitDir, panchangDir) {
    const dirs  = [kundaliDir, transitDir, panchangDir].filter(Boolean);
    const bulls = dirs.filter(d => d === 'BULL').length;
    const bears = dirs.filter(d => d === 'BEAR').length;
    if (bulls > 0 && bears > 0) {
      return {
        hasConflict: true,
        desc   : `मिश्रित संकेत: ${bulls} बुलिश vs ${bears} बियरिश सिस्टम — आत्मविश्वास कम`,
        penalty: 15,
      };
    }
    return { hasConflict: false, desc: 'सभी सिस्टम सहमत', penalty: 0 };
  }

  function calcConfidence(componentScores, conflict, vargaConsensus) {
    const vals  = componentScores.map(s => s.score);
    const pos   = vals.filter(v => v > 0).length;
    const neg   = vals.filter(v => v < 0).length;
    const total = vals.length;
    let base = 40;
    if (pos === total || neg === total)           base = 85;
    else if (Math.max(pos, neg) >= total * 0.75) base = 70;
    else if (Math.max(pos, neg) >= total * 0.5)  base = 55;

    if (vargaConsensus?.conf) base = Math.min(90, (base + vargaConsensus.conf) / 2);
    base = Math.max(20, base - (conflict?.penalty || 0));

    return Math.round(base);
  }

  function buildInvalidationRules(finalDir, transitReport, panchangData) {
    const rules = [];
    if (finalDir === 'BULL') {
      rules.push('यदि शनि 8वें भाव में ट्रांज़िट करे → सिग्नल रद्द');
      rules.push(`यदि चंद्र ${panchangData?.nakHi || ''} से बाहर जाए → पुनर्विचार`);
      rules.push('यदि ट्रांज़िट स्कोर -15 से नीचे जाए → BEAR में बदलें');
    } else if (finalDir === 'BEAR') {
      rules.push('यदि बृहस्पति 11वें भाव को aspect करे → सिग्नल कमज़ोर');
      rules.push('यदि ट्रांज़िट स्कोर +15 से ऊपर जाए → BULL में बदलें');
      rules.push('यदि Pushya/Rohini/Hasta नक्षत्र हो → BEAR कमज़ोर');
    }
    rules.push('बाज़ार जोखिमों के अधीन — यह ज्योतिषीय संभावना है, गारंटी नहीं');
    return rules;
  }

  // ════════════════════════════════════════════════════════
  // V5 — FINAL DECISION (preserved, upgraded to V6 weights)
  // ════════════════════════════════════════════════════════
  function finalDecision(params) {
    const {
      natalAnalysis, vargaReports, dashaInterp, transitReport,
      panchangData, horaScore, sessionReports, eventsReport, regimeReport,
      // V6 new params (optional)
      ashtakavargaScore, yogaScore, useV5Weights,
    } = params;

    const W = useV5Weights ? V5_WEIGHTS : DEFAULT_WEIGHTS;

    const kundali  = calcKundaliScore(natalAnalysis, vargaReports, dashaInterp);
    const transits = calcTransitScore(transitReport);
    const panchang = calcPanchangScore(panchangData);
    const other    = calcOtherScore(sessionReports, regimeReport);

    // V6: ashtakavarga + yoga components
    const ashtakSc = ashtakavargaScore !== undefined ? ashtakavargaScore : 0;
    const yogaSc   = yogaScore !== undefined ? yogaScore : 0;

    // Weighted final raw
    let rawFinal;
    if (useV5Weights) {
      rawFinal = kundali.score * W.kundali + transits.score * W.transits +
                 panchang.score * W.panchang + other.score * W.other;
    } else {
      rawFinal = kundali.score * W.kundali + transits.score * W.transits +
                 panchang.score * W.panchang + ashtakSc * W.ashtakavarga +
                 yogaSc * W.yogas;
    }

    const normFinal     = parseFloat(normalize(rawFinal, 25).toFixed(1));
    const kundaliDir    = kundali.score > 2  ? 'BULL' : kundali.score < -2  ? 'BEAR' : 'NEUT';
    const transitDir    = transits.score > 3 ? 'BULL' : transits.score < -3 ? 'BEAR' : 'NEUT';
    const panchangDir   = panchang.score > 2 ? 'BULL' : panchang.score < -2 ? 'BEAR' : 'NEUT';
    const conflict      = detectConflict(kundaliDir, transitDir, panchangDir);

    const vargaConsensus = typeof VARGA !== 'undefined' ? VARGA.getConsensus(vargaReports || {}) : null;
    const confidence     = calcConfidence([kundali, transits, panchang, other], conflict, vargaConsensus);
    const finalCall      = normFinal > 10 ? 'BULL' : normFinal < -10 ? 'BEAR' : 'NEUT';

    const allEvidence = [
      ...kundali.evidence.map(e => ({ src: 'कुंडली', e })),
      ...transits.evidence.map(e => ({ src: 'ट्रांज़िट', e })),
      ...panchang.evidence.map(e => ({ src: 'पंचांग', e })),
    ];
    const topReasons = allEvidence
      .filter(e => finalCall === 'BULL' ? !e.e.includes('-') : !e.e.includes('+'))
      .slice(0, 5).map(e => `[${e.src}] ${e.e}`);

    const topRisks = (eventsReport?.evidence || [])
      .concat(regimeReport?.hasCrashRisk ? ['Crash regime detected'] : [])
      .slice(0, 5);

    const allWindows = [
      ...(eventsReport?.timeWindows  || []),
      ...(sessionReports?.newyork?.timeWindows || []),
      ...(regimeReport?.timeWindows  || []),
    ];
    const bestWindows  = finalCall === 'BULL'
      ? allWindows.filter(w => !w.tags?.includes('CRASH_RISK')).slice(0, 3) : [];
    const avoidWindows = allWindows.filter(w =>
      w.tags?.includes('CRASH_RISK') || w.tags?.includes('TRAP')).slice(0, 3);

    return {
      finalCall, finalConfidence: confidence,
      rawScore: normFinal,
      componentScores: {
        kundali      : { score: kundali.score,   weight: W.kundali,       direction: kundaliDir  },
        transits     : { score: transits.score,  weight: W.transits,      direction: transitDir  },
        panchang     : { score: panchang.score,  weight: W.panchang,      direction: panchangDir },
        ashtakavarga : { score: ashtakSc,        weight: W.ashtakavarga || 0 },
        yogas        : { score: yogaSc,          weight: W.yogas       || 0 },
        other        : { score: other.score,     weight: W.other       || 0 },
      },
      conflict, vargaConsensus,
      topReasons     : topReasons.slice(0, 5),
      topRisks       : topRisks.slice(0, 5),
      bestWindows, avoidWindows,
      invalidationRules: buildInvalidationRules(finalCall, transitReport, panchangData),
      crashRegimeWindows: regimeReport?.crashRegimeWindows || [],
      schemaVersion  : "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getConfluenceScore
  // ════════════════════════════════════════════════════════
  /**
   * How many Vedic rule systems agree on direction
   * @param {Array<{ system, direction, score }>} allEvidence
   * @returns {{ totalSystems, bullSystems, bearSystems, neutralSystems, direction, confidence, summaryHi }}
   */
  function getConfluenceScore(allEvidence) {
    try {
      const total   = allEvidence.length;
      const bull    = allEvidence.filter(e => e.direction === 'BULL').length;
      const bear    = allEvidence.filter(e => e.direction === 'BEAR').length;
      const neutral = total - bull - bear;
      const direction = bull > bear ? 'BULL' : bear > bull ? 'BEAR' : 'NEUTRAL';
      const maxAgree  = Math.max(bull, bear);

      // Confidence scales with how many agree (10+ → 90%+)
      const baseConf = total > 0 ? Math.round((maxAgree / total) * 100) : 50;
      const confidence = Math.min(95, Math.max(20, baseConf));

      const CFG_MIN = (typeof CONFIG !== 'undefined' && CONFIG.CONFLUENCE?.HIGH_CONFIDENCE_RULES) || 10;
      const highConf = maxAgree >= CFG_MIN;

      return {
        totalSystems  : total,
        bullSystems   : bull,
        bearSystems   : bear,
        neutralSystems: neutral,
        direction,
        confidence,
        highConfidence: highConf,
        summaryHi     : `${total} सिस्टम में से ${maxAgree} ${direction === 'BULL' ? 'बुलिश' : direction === 'BEAR' ? 'बियरिश' : 'तटस्थ'} — ${confidence}% विश्वास`,
        schemaVersion : "6.0",
      };
    } catch (e) {
      return { totalSystems:0, bullSystems:0, bearSystems:0, neutralSystems:0,
               direction:'NEUTRAL', confidence:50, summaryHi:'कॉन्फ्लुएंस जाँच विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getSignalStrength
  // ════════════════════════════════════════════════════════
  /**
   * Convert numeric score to signal label
   * @param {number} normalizedScore — -100 to +100
   * @returns {{ signal, hi, color }}
   */
  function getSignalStrength(normalizedScore) {
    if (normalizedScore >= 40)  return { signal:'STRONG_BULL', hi:'प्रबल तेजी',  color:'#00e676' };
    if (normalizedScore >= 15)  return { signal:'BULL',        hi:'तेजी',         color:'#69f0ae' };
    if (normalizedScore >= -15) return { signal:'NEUTRAL',     hi:'सपाट',         color:'#ffd740' };
    if (normalizedScore >= -40) return { signal:'BEAR',        hi:'मंदी',         color:'#ff6d00' };
    return                             { signal:'STRONG_BEAR', hi:'प्रबल मंदी',  color:'#ff1744' };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getTopReasons
  // ════════════════════════════════════════════════════════
  /**
   * Get top N reasons driving the signal, in Hindi
   * @param {Array<{ system, score, hindiDesc }>} allScores
   * @param {number} n — how many to return
   * @returns {string[]} top N Hindi descriptions
   */
  function getTopReasons(allScores, n = 3) {
    try {
      return [...allScores]
        .filter(s => s.hindiDesc)
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
        .slice(0, n)
        .map(s => s.hindiDesc);
    } catch (e) {
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getConfidenceLevel
  // ════════════════════════════════════════════════════════
  /**
   * Convert a confluence score to a percentage confidence
   * @param {Object} confluenceScore — from getConfluenceScore
   * @returns {number} 0-100
   */
  function getConfidenceLevel(confluenceScore) {
    if (!confluenceScore) return 50;
    const { totalSystems, bullSystems, bearSystems, neutralSystems } = confluenceScore;
    if (!totalSystems) return 50;
    const CFG = (typeof CONFIG !== 'undefined') ? CONFIG.CONFLUENCE : { HIGH_CONFIDENCE_RULES: 10, MIN_CONFIDENCE: 20, MAX_CONFIDENCE: 95 };
    const maxAgree   = Math.max(bullSystems, bearSystems);
    const agreeRatio = maxAgree / totalSystems;
    const rawConf    = CFG.MIN_CONFIDENCE + agreeRatio * (CFG.MAX_CONFIDENCE - CFG.MIN_CONFIDENCE);
    return Math.round(Math.max(CFG.MIN_CONFIDENCE, Math.min(CFG.MAX_CONFIDENCE, rawConf)));
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    DEFAULT_WEIGHTS,
    V5_WEIGHTS,
    normalize,
    calcKundaliScore,
    calcTransitScore,
    calcPanchangScore,
    calcOtherScore,
    detectConflict,
    calcConfidence,
    buildInvalidationRules,
    finalDecision,
    // V6 new
    getConfluenceScore,
    getSignalStrength,
    getTopReasons,
    getConfidenceLevel,
  };

})();

if (typeof module !== 'undefined') module.exports = SCORING;
if (typeof window !== 'undefined') window.SCORING = SCORING;

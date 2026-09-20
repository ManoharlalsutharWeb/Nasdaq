/* ============================================================
   VedicAladdin V6 — core/regime.js
   Crash Regime Detector — Probabilistic (No guaranteed dates)
   V5 fully preserved (15 rules) + V6 additions:
     Rule 16: parivartana_stress
     Rule 17: triple_eclipse_season
     Rule 18: stationary_malefic_natal
     Rule 19: yoga_collapse (multiple negative yogas)
     Rule 20: shadbala_crisis
     Rule 21: ashtakavarga_crash (SAV < 25)
     getRallySignals — bull regime detection
     getExpectedMagnitude — predicted % move range
   Total: 21 crash rules
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const REGIME = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('./natal'); }
  function getDasha() { return typeof DASHA !== 'undefined' ? DASHA : require('./dasha'); }

  function jdToDate(jd) {
    const ms = (jd - 2440587.5) * 86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  // ════════════════════════════════════════════════════════
  // CRASH RULES 1–15 (V5 preserved) + 16–21 (V6 new)
  // ════════════════════════════════════════════════════════
  const CRASH_RULES = [
    // ── V5 RULES (1–15) ────────────────────────────────────
    {
      id:'saturn_8th', weight:8,
      desc:'शनि 8वें भाव में ट्रांज़िट — संरचनात्मक जोखिम',
      check:(tp) => tp.find(p => p.eng === 'Saturn')?.transHouse === 8,
    },
    {
      id:'ketu_8th', weight:7,
      desc:'केतु 8वें भाव में — अचानक बड़ी चाल',
      check:(tp) => tp.find(p => p.eng === 'Ketu')?.transHouse === 8,
    },
    {
      id:'rahu_8th', weight:6,
      desc:'राहु 8वें भाव में — छुपा जोखिम',
      check:(tp) => tp.find(p => p.eng === 'Rahu')?.transHouse === 8,
    },
    {
      id:'mars_8th', weight:5,
      desc:'मंगल 8वें भाव में — अचानक गिरावट',
      check:(tp) => tp.find(p => p.eng === 'Mars')?.transHouse === 8,
    },
    {
      id:'sat_rahu_conj', weight:9,
      desc:'शनि-राहु युति — अत्यंत खतरनाक',
      check:(tp) => {
        const s = tp.find(p => p.eng === 'Saturn');
        const r = tp.find(p => p.eng === 'Rahu');
        return s && r && Math.abs(((s.sidLon - r.sidLon + 180) % 360) - 180) < 12;
      },
    },
    {
      id:'mars_sat_conj', weight:7,
      desc:'मंगल-शनि युति — बड़ी गिरावट संभव',
      check:(tp) => {
        const m = tp.find(p => p.eng === 'Mars');
        const s = tp.find(p => p.eng === 'Saturn');
        return m && s && Math.abs(((m.sidLon - s.sidLon + 180) % 360) - 180) < 10;
      },
    },
    {
      id:'mula_nak', weight:4,
      desc:'चंद्र मूल नक्षत्र में — जड़ उखड़ना',
      check:(tp) => tp.find(p => p.eng === 'Moon')?.nak === 18,
    },
    {
      id:'ardra_nak', weight:3,
      desc:'चंद्र आर्द्रा नक्षत्र में — तूफान',
      check:(tp) => tp.find(p => p.eng === 'Moon')?.nak === 5,
    },
    {
      id:'sat_dasha', weight:5,
      desc:'शनि महादशा — संरचनात्मक मंदी',
      check:(tp, nd, d) => d?.maha === 'Saturn',
    },
    {
      id:'rahu_dasha', weight:4,
      desc:'राहु महादशा — सट्टा crash',
      check:(tp, nd, d) => d?.maha === 'Rahu',
    },
    {
      id:'ketu_dasha', weight:4,
      desc:'केतु महादशा — अचानक हानि',
      check:(tp, nd, d) => d?.maha === 'Ketu',
    },
    {
      id:'eclipse_near', weight:6,
      desc:'ग्रहण निकट — बड़ी अस्थिरता',
      check:(tp, nd, d, events) => events?.riskTags?.includes('CRASH_RISK'),
    },
    {
      id:'jup_sat_opp', weight:5,
      desc:'बृहस्पति-शनि प्रतियोगी — बाज़ार मोड़',
      check:(tp) => {
        const j = tp.find(p => p.eng === 'Jupiter');
        const s = tp.find(p => p.eng === 'Saturn');
        return j && s && Math.abs(Math.abs(((j.sidLon - s.sidLon + 180) % 360) - 180) - 180) < 10;
      },
    },
    {
      id:'triple_malefic', weight:8,
      desc:'3+ ग्रह 6/8/12 में — त्रिशूल दोष',
      check:(tp) => tp.filter(p =>
        ['Mars','Saturn','Rahu','Ketu'].includes(p.eng) && [6,8,12].includes(p.transHouse)
      ).length >= 3,
    },
    {
      id:'moon_12th', weight:3,
      desc:'चंद्र 12वें भाव में — हानि-भय',
      check:(tp) => tp.find(p => p.eng === 'Moon')?.transHouse === 12,
    },

    // ── V6 RULES (16–21) ────────────────────────────────────
    {
      id:'parivartana_stress', weight:5,
      desc:'परिवर्तन योग तनाव — दो ग्रह एक-दूसरे की राशि में, नकारात्मक',
      check:(tp, nd) => {
        try {
          const N = getNatal();
          const LORDS = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
          let count = 0;
          for (let i = 0; i < tp.length - 1; i++) {
            for (let j = i + 1; j < tp.length; j++) {
              const p1 = tp[i], p2 = tp[j];
              const lord1 = LORDS[p1.rashi], lord2 = LORDS[p2.rashi];
              // Parivartana: p1 is in p2's sign and p2 is in p1's sign
              if (lord1 === p2.eng && lord2 === p1.eng) {
                const bothMalefic = ['Mars','Saturn','Rahu','Ketu'].includes(p1.eng) &&
                                    ['Mars','Saturn','Rahu','Ketu'].includes(p2.eng);
                if (bothMalefic) count++;
              }
            }
          }
          return count > 0;
        } catch (e) { return false; }
      },
    },
    {
      id:'triple_eclipse_season', weight:7,
      desc:'तीन ग्रहण मौसम — अत्यंत संवेदनशील काल (ग्रहण ±30 दिन)',
      check:(tp, nd, d, events, extra) => {
        // Check if we are within 30 days of an eclipse AND any planet near node
        if (!events?.riskTags?.includes('CRASH_RISK')) return false;
        const rahu = tp.find(p => p.eng === 'Rahu');
        const sun  = tp.find(p => p.eng === 'Sun');
        if (!rahu || !sun) return false;
        const N = getNatal();
        const distSunRahu = Math.abs(N.n180(sun.sidLon - rahu.sidLon));
        return distSunRahu < 25;  // Sun within 25° of Rahu in eclipse season
      },
    },
    {
      id:'stationary_malefic_natal', weight:6,
      desc:'मंगल/शनि स्थिर — NASDAQ जन्म बिंदु पर',
      check:(tp, nd) => {
        try {
          const N = getNatal();
          const MALEFICS = ['Mars','Saturn'];
          const natalPositions = nd?.planets?.filter(p => MALEFICS.includes(p.eng)).map(p => p.sidLon) || [];
          return tp.filter(p => MALEFICS.includes(p.eng)).some(tp => {
            const speed = Math.abs(tp.speed || 0);
            if (speed > 0.1) return false; // not stationary
            return natalPositions.some(nlon => Math.abs(N.n180(tp.sidLon - nlon)) < 3);
          });
        } catch (e) { return false; }
      },
    },
    {
      id:'yoga_collapse', weight:7,
      desc:'योग पतन — एकाधिक नकारात्मक योग एक साथ सक्रिय',
      check:(tp, nd, d, events, extra) => {
        // If yoga_engine passed in extra.activeYogas, check for 3+ anishta yogas
        if (extra?.activeYogas) {
          const anishta = extra.activeYogas.filter(y => y.type === 'ANISHTA' && y.active);
          return anishta.length >= 3;
        }
        // Fallback: approximate via malefic concentration
        const maleficIn6812 = tp.filter(p =>
          ['Mars','Saturn','Rahu','Ketu'].includes(p.eng) && [6,8,12].includes(p.transHouse)
        ).length;
        return maleficIn6812 >= 4;
      },
    },
    {
      id:'shadbala_crisis', weight:5,
      desc:'षड्बल संकट — सूर्य/चंद्र नीच + निर्बल — बाज़ार नेतृत्व कमज़ोर',
      check:(tp, nd) => {
        const sun  = tp.find(p => p.eng === 'Sun');
        const moon = tp.find(p => p.eng === 'Moon');
        let crisis = 0;
        if (sun  && sun.dignity  === 'नीच') crisis++;
        if (moon && moon.dignity === 'नीच') crisis++;
        if (sun  && sun.retro)              crisis++;
        return crisis >= 2;
      },
    },
    {
      id:'ashtakavarga_crash', weight:6,
      desc:'सर्वाष्टकवर्ग स्कोर < 25 — अत्यंत दुर्बल काल',
      check:(tp, nd, d, events, extra) => {
        // If ashtakavarga SAV score passed in extra
        if (extra?.savScore !== undefined) return extra.savScore < 25;
        // Approximate: count benefics in weak houses
        const weak = tp.filter(p =>
          ['Jupiter','Venus','Moon'].includes(p.eng) && [6,8,12].includes(p.transHouse)
        ).length;
        return weak >= 2;
      },
    },
  ];

  // ── Max weight for normalization ────────────────────────
  const MAX_WEIGHT = CRASH_RULES.reduce((s, r) => s + r.weight, 0);

  // ════════════════════════════════════════════════════════
  // V5 — DETECT DAY (preserved + V6 extra param)
  // ════════════════════════════════════════════════════════
  function detectDay(transitReport, natalD1, dasha, eventsReport, extra) {
    const tp       = transitReport?.planets || [];
    const evidence = [];
    let totalWeight = 0;
    const triggered = [];
    const notTriggered = [];

    CRASH_RULES.forEach(rule => {
      try {
        const trig = rule.check(tp, natalD1, dasha, eventsReport, extra || {});
        if (trig) {
          evidence.push({ id: rule.id, desc: rule.desc, weight: rule.weight });
          totalWeight += rule.weight;
          triggered.push({ ...rule, triggered: true });
        } else {
          notTriggered.push({ ...rule, triggered: false });
        }
      } catch (e) {
        notTriggered.push({ ...rule, triggered: false });
      }
    });

    const crashProbability = Math.min(95, Math.round((totalWeight / MAX_WEIGHT) * 100));
    const isCrashRegime    = totalWeight >= 20;
    const severity         = totalWeight >= 30 ? 'P1' : totalWeight >= 20 ? 'P2' : 'P3';

    return {
      totalWeight, MAX_WEIGHT, crashProbability, isCrashRegime, severity,
      evidence, triggered, notTriggered,
      riskCategory: crashProbability >= 80 ? 'EXTREME' :
                    crashProbability >= 60 ? 'HIGH'    :
                    crashProbability >= 40 ? 'MODERATE':
                    crashProbability >= 20 ? 'LOW'     : 'MINIMAL',
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — CRASH WINDOW BUILDER (preserved, schema → 6.0)
  // ════════════════════════════════════════════════════════
  function buildCrashWindow(startJD, peakJD, endJD, weight, evidence, severity) {
    const probability = Math.min(95, Math.round((weight / MAX_WEIGHT) * 100));
    const label = probability >= 70 ? '🚨 उच्च क्रैश जोखिम खंड' :
                  probability >= 50 ? '⚠️ मध्यम क्रैश जोखिम'   : '⚡ सतर्कता खंड';
    return {
      label,
      startDate  : jdToDate(startJD),
      peakDate   : jdToDate(peakJD),
      endDate    : jdToDate(endJD),
      probability, weight, severity, evidence,
      disclaimer : 'यह एक जोखिम सांख्यिकी है, निश्चित भविष्यवाणी नहीं। बाज़ार जोखिमों के अधीन है।',
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — DETECT CRASH WINDOWS (preserved, schema → 6.0)
  // ════════════════════════════════════════════════════════
  function detectCrashWindows(dateIST, natalD1, dasha, eventsReport, lookaheadDays = 30) {
    const N = getNatal();
    const [y, m, d] = dateIST.split('-').map(Number);
    const startJD   = N.JD(y, m, d, 15, 0);
    const windows   = [];
    let inWindow    = false;
    let windowStart = null, windowPeak = null, maxWeight = 0, windowEvidence = [];

    for (let i = 0; i <= lookaheadDays; i++) {
      const jd   = startJD + i;
      const ayan = N.lahiri(jd);
      const tp   = N.PLANETS_DEF.map(pd => {
        const lon        = N.n360(N.getPlanetLon(pd.eng, jd) - ayan);
        const rashi      = Math.floor(lon / 30);
        const transHouse = (rashi - natalD1.lagnaSign + 12) % 12 + 1;
        const nak        = Math.floor(lon / (360 / 27));
        const speed      = N.n180(N.getPlanetLon(pd.eng, jd + 0.5) - N.getPlanetLon(pd.eng, jd - 0.5));
        return { ...pd, sidLon: lon, rashi, transHouse, nak, speed };
      });

      const result = detectDay({ planets: tp, jd, dateIST: jdToDate(jd) }, natalD1, dasha, eventsReport);

      if (result.isCrashRegime) {
        if (!inWindow) { inWindow = true; windowStart = jd; windowEvidence = result.evidence; maxWeight = result.totalWeight; }
        if (result.totalWeight > maxWeight) { maxWeight = result.totalWeight; windowPeak = jd; windowEvidence = result.evidence; }
      } else if (inWindow) {
        windows.push(buildCrashWindow(windowStart, windowPeak || windowStart, jd - 1, maxWeight, windowEvidence, result.severity));
        inWindow = false; windowStart = null; windowPeak = null; maxWeight = 0; windowEvidence = [];
      }
    }
    if (inWindow && windowStart) {
      windows.push(buildCrashWindow(windowStart, windowPeak || windowStart, startJD + lookaheadDays, maxWeight, windowEvidence, 'P2'));
    }

    return {
      moduleId             : 'regime',
      dateIST,
      crashRegimeWindows   : windows,
      hasCrashRisk         : windows.length > 0,
      maxCrashProbability  : windows.length ? Math.max(...windows.map(w => w.probability)) : 0,
      explanations         : windows.length
        ? windows.slice(0, 3).map(w => `${w.label} (${w.startDate} → ${w.endDate}) — ${w.probability}% जोखिम`)
        : ['कोई Crash Regime नहीं पाया गया।'],
      evidence             : windows.flatMap(w => w.evidence.map(e => e.desc)).slice(0, 5),
      relevanceScore       : windows.length ? 85 : 20,
      directionHint        : 'BEAR',
      confidenceImpact     : windows.length ? -windows[0].probability * 0.5 : 0,
      riskTags             : windows.length ? ['CRASH_RISK'] : ['RANGE'],
      timeWindows          : windows.map(w => ({
        label   : w.label,
        startIST: w.startDate + ' IST', peakIST: w.peakDate + ' IST', endIST: w.endDate + ' IST',
        severity: w.severity, tags: ['CRASH_RISK'], notes: w.evidence.map(e => e.desc).slice(0, 2),
      })),
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getRallySignals — bull regime detection
  // ════════════════════════════════════════════════════════
  /**
   * Detects bullish conditions — mirror of crash detection
   * @param {Object} transitReport
   * @param {Object} natalD1
   * @param {Object} dasha
   * @returns {{ active, score, signals, hindiText }}
   */
  const RALLY_RULES = [
    { id:'jup_1st',     weight:8, desc:'बृहस्पति लग्न में — NASDAQ बुल', check:(tp) => tp.find(p => p.eng === 'Jupiter')?.transHouse === 1 },
    { id:'jup_5th',     weight:7, desc:'बृहस्पति 5वें भाव — सट्टा तेजी', check:(tp) => tp.find(p => p.eng === 'Jupiter')?.transHouse === 5 },
    { id:'jup_9th',     weight:7, desc:'बृहस्पति 9वें भाव — भाग्य तेजी', check:(tp) => tp.find(p => p.eng === 'Jupiter')?.transHouse === 9 },
    { id:'jup_11th',    weight:6, desc:'बृहस्पति 11वें भाव — लाभ काल',   check:(tp) => tp.find(p => p.eng === 'Jupiter')?.transHouse === 11 },
    { id:'ven_10th',    weight:5, desc:'शुक्र 10वें भाव — बाज़ार चमक',   check:(tp) => tp.find(p => p.eng === 'Venus')?.transHouse === 10 },
    { id:'jup_dasha',   weight:7, desc:'बृहस्पति महादशा — बड़ी तेजी',    check:(tp, nd, d) => d?.maha === 'Jupiter' },
    { id:'ven_dasha',   weight:6, desc:'शुक्र महादशा — मजबूत बुल',       check:(tp, nd, d) => d?.maha === 'Venus' },
    { id:'merc_dasha',  weight:5, desc:'बुध महादशा — टेक/NASDAQ तेजी',   check:(tp, nd, d) => d?.maha === 'Mercury' },
    { id:'rohini_moon', weight:4, desc:'चंद्र रोहिणी नक्षत्र — NASDAQ बुल', check:(tp) => tp.find(p => p.eng === 'Moon')?.nak === 3 },
    { id:'pushya_moon', weight:4, desc:'चंद्र पुष्य नक्षत्र — संवृद्धि', check:(tp) => tp.find(p => p.eng === 'Moon')?.nak === 7 },
    { id:'jup_ven_tri', weight:6, desc:'बृहस्पति-शुक्र त्रिकोण — धन योग', check:(tp) => {
      const j = tp.find(p => p.eng === 'Jupiter');
      const v = tp.find(p => p.eng === 'Venus');
      if (!j || !v) return false;
      const N = getNatal();
      return Math.abs(Math.abs(N.n180(j.sidLon - v.sidLon)) - 120) < 8;
    }},
  ];

  const RALLY_MAX = RALLY_RULES.reduce((s, r) => s + r.weight, 0);

  function getRallySignals(transitReport, natalD1, dasha) {
    try {
      const tp = transitReport?.planets || [];
      const signals = [];
      let totalWeight = 0;

      RALLY_RULES.forEach(rule => {
        try {
          if (rule.check(tp, natalD1, dasha)) {
            signals.push({ id: rule.id, desc: rule.desc, weight: rule.weight });
            totalWeight += rule.weight;
          }
        } catch (e) {}
      });

      const rallyScore = Math.min(95, Math.round((totalWeight / RALLY_MAX) * 100));
      return {
        active      : rallyScore >= 30,
        score       : rallyScore,
        signals,
        totalWeight,
        hindiText   : rallyScore >= 60
          ? `🚀 मजबूत बुल संकेत (${rallyScore}%) — ${signals.slice(0,2).map(s => s.desc).join('; ')}`
          : rallyScore >= 30
          ? `📈 मध्यम बुल संकेत (${rallyScore}%)`
          : `➡️ तटस्थ — रैली संकेत कमज़ोर (${rallyScore}%)`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { active: false, score: 0, signals: [], hindiText: 'रैली जाँच विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getExpectedMagnitude — predicted % move range
  // ════════════════════════════════════════════════════════
  /**
   * Based on crash score + rally signals, predict expected move range
   * @param {number} crashScore — 0-100
   * @param {number} rallyScore — 0-100
   * @returns {{ direction, minPct, maxPct, hindiText }}
   */
  function getExpectedMagnitude(crashScore, rallyScore) {
    const netBull = rallyScore - crashScore;
    if (netBull > 40) return {
      direction: 'STRONG_BULL', minPct: 1.5, maxPct: 4.0,
      hindiText: 'प्रत्याशित: +1.5% से +4.0% तक — प्रबल तेजी',
    };
    if (netBull > 15) return {
      direction: 'BULL', minPct: 0.5, maxPct: 1.5,
      hindiText: 'प्रत्याशित: +0.5% से +1.5% — तेजी',
    };
    if (netBull > -15) return {
      direction: 'FLAT', minPct: -0.5, maxPct: 0.5,
      hindiText: 'प्रत्याशित: ±0.5% — सपाट बाज़ार',
    };
    if (netBull > -40) return {
      direction: 'BEAR', minPct: -1.5, maxPct: -0.5,
      hindiText: 'प्रत्याशित: -0.5% से -1.5% — मंदी',
    };
    return {
      direction: 'STRONG_BEAR', minPct: -4.0, maxPct: -1.5,
      hindiText: 'प्रत्याशित: -1.5% से -4.0% — प्रबल मंदी/क्रैश',
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    CRASH_RULES,
    MAX_WEIGHT,
    detectDay,
    detectCrashWindows,
    buildCrashWindow,
    // V6 new
    RALLY_RULES,
    RALLY_MAX,
    getRallySignals,
    getExpectedMagnitude,
  };

})();

if (typeof module !== 'undefined') module.exports = REGIME;
if (typeof window !== 'undefined') window.REGIME = REGIME;

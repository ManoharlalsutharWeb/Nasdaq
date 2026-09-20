/* ============================================================
   VedicAladdin V6 — core/varga.js
   Divisional Charts D1–D60 + Analysis + Relevance Scoring
   V5 fully preserved + V6 additions:
     getVimshopakaBala  — composite D-chart strength (20 point scale)
     getPlanetInVarga   — fast single-planet varga sign lookup
   Optimize: All 60 vargas in < 300ms
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const VARGA = (function () {
  'use strict';

  function getNatal() {
    return typeof NATAL !== 'undefined' ? NATAL : require('./natal');
  }

  // ════════════════════════════════════════════════════════
  // V5 — VARGA META TABLE (preserved)
  // ════════════════════════════════════════════════════════
  const VARGA_META = {
    D1 : { div:1,  name:'राशि',          hi:'D1 — मूल कुंडली',           mkt:'समग्र प्रवृत्ति',        relevance:100 },
    D2 : { div:2,  name:'धन वर्ग (होरा)',hi:'D2 — धन विभाजन',             mkt:'धन प्रवाह, आय',          relevance:80  },
    D3 : { div:3,  name:'द्रेष्काण',     hi:'D3 — साहस/गति',              mkt:'गति, मोमेंटम',           relevance:70  },
    D4 : { div:4,  name:'चतुर्थांश',     hi:'D4 — भाग्य/स्थिरता',         mkt:'समर्थन स्तर',             relevance:60  },
    D5 : { div:5,  name:'पंचमांश',       hi:'D5 — पुण्य/बुद्धि',          mkt:'सट्टा/बुद्धि चाल',        relevance:55  },
    D6 : { div:6,  name:'षष्ठांश',       hi:'D6 — स्वास्थ्य/बाधा',        mkt:'सुधार/बाधा खंड',          relevance:50  },
    D7 : { div:7,  name:'सप्तमांश',      hi:'D7 — संतान/रचना',            mkt:'नई लिस्टिंग/IPO',         relevance:45  },
    D8 : { div:8,  name:'अष्टमांश',      hi:'D8 — दीर्घायु/रहस्य',        mkt:'छुपा जोखिम',              relevance:70  },
    D9 : { div:9,  name:'नवांश',         hi:'D9 — भाग्य/विवाह',           mkt:'दीर्घकालिक दिशा',         relevance:90  },
    D10: { div:10, name:'दशमांश',        hi:'D10 — करियर/व्यवसाय',        mkt:'इंडेक्स दिशा, NASDAQ',   relevance:95  },
    D12: { div:12, name:'द्वादशांश',     hi:'D12 — माता-पिता/जड़',         mkt:'वैश्विक सूचकांक प्रभाव', relevance:55  },
    D16: { div:16, name:'षोडशांश',       hi:'D16 — वाहन/सुख',             mkt:'उपभोक्ता/ऑटो सेक्टर',    relevance:40  },
    D20: { div:20, name:'विंशांश',       hi:'D20 — आध्यात्मिक',           mkt:'दीर्घकालिक व्यवहार',      relevance:35  },
    D24: { div:24, name:'चतुर्विंशांश',  hi:'D24 — शिक्षा/ज्ञान',         mkt:'टेक/शिक्षा सेक्टर',       relevance:40  },
    D27: { div:27, name:'भांशांश',       hi:'D27 — शक्ति/सामर्थ्य',       mkt:'मार्केट शक्ति',           relevance:60  },
    D30: { div:30, name:'त्रिंशांश',     hi:'D30 — दुर्भाग्य/TRAP',       mkt:'TRAP/SPIKE/दुर्घटना',     relevance:85  },
    D40: { div:40, name:'खवेदांश',       hi:'D40 — पितृ/मातृ',            mkt:'संस्थागत प्रवाह',         relevance:30  },
    D45: { div:45, name:'अक्षवेदांश',    hi:'D45 — सर्वशक्ति',            mkt:'बड़ी घटना',                relevance:35  },
    D60: { div:60, name:'षष्टयांश',      hi:'D60 — पिछले जन्म/कर्म',      mkt:'दीर्घकालिक कर्म चक्र',   relevance:75, accuracyGated:true },
  };

  // Fill missing D-numbers generically
  for (let i = 1; i <= 60; i++) {
    const k = `D${i}`;
    if (!VARGA_META[k]) {
      VARGA_META[k] = {
        div:i, name:`वर्ग${i}`, hi:`D${i} — विभाजन`,
        mkt:'विशेष विश्लेषण', relevance: Math.max(20, 50 - i),
        accuracyGated: i >= 50,
      };
    }
  }

  // ════════════════════════════════════════════════════════
  // V5 — VARGA LONGITUDE (preserved)
  // ════════════════════════════════════════════════════════
  function getVargaLon(sidLon, div) {
    const posInSign = sidLon % 30;
    const sign      = Math.floor(sidLon / 30);
    let vargaSign;

    if (div === 1) {
      vargaSign = sign;
    } else if (div === 2) {
      // Hora: first 15° → Leo (4), last 15° → Cancer (3)
      vargaSign = posInSign < 15 ? 4 : 3;
    } else if (div === 9) {
      // Navamsa
      const segSize = 30 / 9;
      const segNum  = Math.floor(posInSign / segSize);
      const navBase = (sign % 3 === 0) ? 0 : (sign % 3 === 1) ? 4 : 8;
      vargaSign = (navBase + segNum) % 12;
    } else {
      const segSize = 30 / div;
      const segNum  = Math.floor(posInSign / segSize);
      vargaSign = (sign * div + segNum) % 12;
    }

    return { vargaSign, posInSign };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getPlanetInVarga — fast single-planet lookup
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} planet — English name
   * @param {number} vargaNum — divisor (1–60)
   * @param {number} sidLon — sidereal longitude of the planet
   * @returns {{ vargaSign: number, vargaHouse: number, dignity: string }}
   */
  function getPlanetInVarga(planet, vargaNum, sidLon, lagnaSign) {
    try {
      const N = getNatal();
      const { vargaSign } = getVargaLon(sidLon, vargaNum);
      const vargaHouse = (vargaSign - (lagnaSign || 0) + 12) % 12 + 1;
      const dignity = N.getDignity(planet, vargaSign);
      return { vargaSign, vargaHouse, dignity };
    } catch (e) {
      return { vargaSign: 0, vargaHouse: 1, dignity: '' };
    }
  }

  // ════════════════════════════════════════════════════════
  // V5 — BUILD VARGA CHART (preserved)
  // ════════════════════════════════════════════════════════
  function getChart(natalD1, div) {
    const N   = getNatal();
    const key = `D${div}`;
    const meta = VARGA_META[key] || VARGA_META['D1'];
    const lagnaSign = natalD1.lagnaSign;

    const planets = natalD1.planets.map(p => {
      const { vargaSign } = getVargaLon(p.sidLon, div);
      const vargaHouse = (vargaSign - lagnaSign + 12) % 12 + 1;
      const dignity    = N.getDignity(p.eng, vargaSign);
      const strength   = N.getPlanetStrength(p.eng, vargaSign, p.retro);
      return { ...p, vargaSign, vargaHouse, dignity, strength };
    });

    const lagnaVarga = getVargaLon(natalD1.lagnaSid, div);

    return {
      div, key, meta, planets,
      lagnaSign: lagnaVarga.vargaSign,
      lagnaVarga,
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — ANALYZE VARGA (preserved + schema upgraded)
  // ════════════════════════════════════════════════════════
  function analyzeVarga(div, vargaChart, natalD1, dasha, transitReport) {
    const key  = `D${div}`;
    const meta = VARGA_META[key] || { relevance:30, hi:`D${div}`, mkt:'विश्लेषण' };

    let planetScore = 0;
    const goodHouses = [1, 4, 5, 7, 9, 10, 11];
    const badHouses  = [6, 8, 12];
    const explanations = [], evidence = [], riskTags = [];

    vargaChart.planets.forEach(p => {
      const h = p.vargaHouse;
      const isBenefic = ['Jupiter','Venus','Moon'].includes(p.eng);
      const isMalefic = ['Saturn','Mars','Rahu','Ketu'].includes(p.eng);
      let sc = 0;
      if (goodHouses.includes(h) && isBenefic) {
        sc = 2;
        explanations.push(`${p.hi} ${key} के ${h}वें भाव में — शुभ`);
      }
      if (badHouses.includes(h) && isMalefic) {
        sc = -3;
        riskTags.push('CRASH_RISK');
        explanations.push(`${p.hi} ${key} के ${h}वें भाव में — अशुभ`);
      }
      if (p.dignity === 'उच्च') sc += 2;
      if (p.dignity === 'नीच')  sc -= 2;
      planetScore += sc;
      evidence.push(`${p.eng} D${div} house=${h} dignity=${p.dignity || 'N/A'}`);
    });

    // D30 special (TRAP/SPIKE)
    if (div === 30) {
      const sat  = vargaChart.planets.find(p => p.eng === 'Saturn');
      const mars = vargaChart.planets.find(p => p.eng === 'Mars');
      if (sat && [6,8,12].includes(sat.vargaHouse)) {
        riskTags.push('TRAP');
        explanations.push('D30 में शनि 6/8/12 — TRAP संभव');
      }
      if (mars && [8,12].includes(mars.vargaHouse)) {
        riskTags.push('SPIKE');
        explanations.push('D30 में मंगल 8/12 — SPIKE संभव');
      }
    }

    // D10 special (NASDAQ business)
    if (div === 10) {
      const jup = vargaChart.planets.find(p => p.eng === 'Jupiter');
      const sat = vargaChart.planets.find(p => p.eng === 'Saturn');
      if (jup && [1,5,9,10,11].includes(jup.vargaHouse)) {
        planetScore += 3;
        explanations.push('D10 में बृहस्पति — NASDAQ बुलिश');
      }
      if (sat && [8,12].includes(sat.vargaHouse)) {
        riskTags.push('CRASH_RISK');
        planetScore -= 3;
      }
    }

    // D60 accuracy gate
    const CFG = (typeof CONFIG !== 'undefined') ? CONFIG : {
      BIRTH_TIME_ACCURACY: 'HIGH',
      D60_GATE: { HIGH:{weight:1.0}, MEDIUM:{weight:0.4}, LOW:{weight:0.0} },
    };
    let weight = 1.0, accuracyWarning = false;
    if (meta.accuracyGated) {
      const acc = CFG.BIRTH_TIME_ACCURACY || 'HIGH';
      weight = CFG.D60_GATE[acc]?.weight || 1.0;
      accuracyWarning = weight < 1.0;
      if (accuracyWarning) {
        explanations.push(`⚠️ ${key} का भार ${weight*100}% — जन्म समय: ${acc}`);
      }
    }

    const adjustedScore = planetScore * weight;
    const directionHint = adjustedScore > 3 ? 'BULL' : adjustedScore < -3 ? 'BEAR' : 'NEUT';

    return {
      moduleId: `varga_${key}`,
      dateIST: transitReport?.dateIST || '',
      div, key, meta,
      relevanceScore: meta.relevance,
      directionHint,
      confidenceImpact: parseFloat((adjustedScore * 5).toFixed(2)),
      planetScore: parseFloat(adjustedScore.toFixed(2)),
      riskTags: [...new Set(riskTags)],
      accuracyWarning, weight,
      timeWindows: [],
      explanations, evidence,
      planetEvidence: vargaChart.planets.map(p => ({
        eng: p.eng, hi: p.hi, sym: p.sym,
        vargaHouse: p.vargaHouse, vargaSign: p.vargaSign,
        dignity: p.dignity, strength: p.strength, retro: p.retro,
      })),
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — ANALYZE ALL D1-D60 (preserved, optimized)
  // ════════════════════════════════════════════════════════
  function analyzeAll(natalD1, dasha, transitReport) {
    const reports = {};
    for (let d = 1; d <= 60; d++) {
      const chart = getChart(natalD1, d);
      reports[`D${d}`] = analyzeVarga(d, chart, natalD1, dasha, transitReport);
    }
    return reports;
  }

  // V5 — Consensus (preserved)
  function getConsensus(vargaReports, keyDivs = [1, 9, 10, 30, 2, 3]) {
    let bull = 0, bear = 0, neut = 0, totalWeight = 0;
    keyDivs.forEach(d => {
      const r = vargaReports[`D${d}`];
      if (!r) return;
      const w = r.relevanceScore / 100;
      if (r.directionHint === 'BULL') bull += w;
      else if (r.directionHint === 'BEAR') bear += w;
      else neut += w;
      totalWeight += w;
    });
    if (totalWeight === 0) return { dir:'NEUT', bull:0, bear:0, conf:50 };
    const conf = Math.round(Math.max(bull, bear) / totalWeight * 100);
    return {
      dir: bull > bear ? 'BULL' : bear > bull ? 'BEAR' : 'NEUT',
      bull: parseFloat((bull / totalWeight * 100).toFixed(1)),
      bear: parseFloat((bear / totalWeight * 100).toFixed(1)),
      conf,
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getVimshopakaBala — 20-point composite strength
  // ════════════════════════════════════════════════════════
  /**
   * Vimshopaka Bala — measure of a planet's strength across key D-charts
   * Uses: D1(3), D2(1.5), D3(1.5), D4(0.5), D7(0.5), D9(3), D10(2.5),
   *       D12(0.5), D16(2), D20(0.5), D24(0.5), D27(1.5), D30(1.5),
   *       D40(0.5), D45(0.5), D60(4) — total 20 points
   *
   * @param {Object} natalD1 — built D1 chart from NATAL.buildD1
   * @returns {Object} { planets: [{ eng, bala, percentage }], schemaVersion }
   */
  const VIMSHOPAKA_WEIGHTS = {
    D1:3, D2:1.5, D3:1.5, D4:0.5, D7:0.5, D9:3, D10:2.5,
    D12:0.5, D16:2, D20:0.5, D24:0.5, D27:1.5, D30:1.5,
    D40:0.5, D45:0.5, D60:4,
  };
  const VIMSHOPAKA_TOTAL = Object.values(VIMSHOPAKA_WEIGHTS).reduce((a,b) => a+b, 0); // = 20

  function getVimshopakaBala(natalD1) {
    try {
      const N = getNatal();
      const result = {};

      // Pre-build needed charts
      const charts = {};
      Object.keys(VIMSHOPAKA_WEIGHTS).forEach(key => {
        const div = parseInt(key.replace('D',''));
        charts[key] = getChart(natalD1, div);
      });

      natalD1.planets.forEach(planet => {
        let bala = 0;
        Object.entries(VIMSHOPAKA_WEIGHTS).forEach(([key, weight]) => {
          const chart = charts[key];
          const vp = chart.planets.find(p => p.eng === planet.eng);
          if (!vp) return;
          // Dignity scoring within Vimshopaka: उच्च=1.0, स्वगृह=0.75, नीच=0.0, rest=0.5
          let dignityFactor = 0.5;
          if (vp.dignity === 'उच्च')    dignityFactor = 1.0;
          else if (vp.dignity === 'स्वगृह') dignityFactor = 0.75;
          else if (vp.dignity === 'नीच')    dignityFactor = 0.0;
          bala += weight * dignityFactor;
        });

        result[planet.eng] = {
          eng       : planet.eng,
          hi        : planet.hi,
          bala      : parseFloat(bala.toFixed(2)),
          percentage: parseFloat((bala / VIMSHOPAKA_TOTAL * 100).toFixed(1)),
          strong    : bala >= 10,   // >= 50% = strong
        };
      });

      return { planets: result, maxPoints: VIMSHOPAKA_TOTAL, schemaVersion: "6.0" };
    } catch (e) {
      console.error('[VARGA] getVimshopakaBala error:', e);
      return { planets: {}, maxPoints: 20, schemaVersion: "6.0" };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    VARGA_META,
    getVargaLon,
    getChart,
    analyzeVarga,
    analyzeAll,
    getConsensus,
    // V6 new
    getPlanetInVarga,
    getVimshopakaBala,
    VIMSHOPAKA_WEIGHTS,
  };

})();

if (typeof module !== 'undefined') module.exports = VARGA;
if (typeof window !== 'undefined') window.VARGA = VARGA;

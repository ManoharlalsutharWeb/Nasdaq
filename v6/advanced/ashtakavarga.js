/* ============================================================
   VedicAladdin V6 — advanced/ashtakavarga.js
   Bhinnashtakvarga (BAV) + Sarvashtakvarga (SAV)
   Applied to NASDAQ natal chart as primary dataset
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const ASHTAKAVARGA = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  // ════════════════════════════════════════════════════════
  // CLASSICAL BAV CONTRIBUTION TABLES
  // Each planet contributes bindus to houses counted from
  // specific reference points. 1 = contributes, 0 = does not.
  // Rows = reference points (planet itself + lagna for Sun/Moon)
  // These are the standard Parashari tables.
  // ════════════════════════════════════════════════════════
  const BAV_TABLE = {
    Sun: {
      // Bindus contributed from: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna
      // For each sign relative to reference (1-12)
      Sun    : [1,2,4,7,8,9,10,11],   // houses from Sun that get bindu
      Moon   : [3,6,10,11],
      Mars   : [1,2,4,7,8,9,10,11],
      Mercury: [3,5,6,9,10,11,12],
      Jupiter: [5,6,9,11],
      Venus  : [6,7,12],
      Saturn : [1,2,4,7,8,9,10,11],
      Lagna  : [3,4,6,10,11,12],
    },
    Moon: {
      Sun    : [3,6,7,8,10,11],
      Moon   : [1,3,6,7,10,11],
      Mars   : [2,3,5,6,9,10,11],
      Mercury: [1,3,4,5,7,8,10,11],
      Jupiter: [1,4,7,8,10,11,12],
      Venus  : [3,4,5,7,9,10,11],
      Saturn : [3,5,6,11],
      Lagna  : [3,6,10,11],
    },
    Mars: {
      Sun    : [3,5,6,10,11],
      Moon   : [3,6,11],
      Mars   : [1,2,4,7,8,10,11],
      Mercury: [3,5,6,11],
      Jupiter: [6,10,11,12],
      Venus  : [6,8,11,12],
      Saturn : [1,4,7,8,9,10,11],
      Lagna  : [1,3,6,10,11],
    },
    Mercury: {
      Sun    : [5,6,9,11,12],
      Moon   : [2,4,6,8,10,11],
      Mars   : [1,2,4,7,8,9,10,11],
      Mercury: [1,3,5,6,9,10,11,12],
      Jupiter: [6,8,11,12],
      Venus  : [1,2,3,4,5,8,9,11],
      Saturn : [1,2,4,7,8,9,10,11],
      Lagna  : [1,2,4,6,8,10,11],
    },
    Jupiter: {
      Sun    : [1,2,3,4,7,8,9,10,11],
      Moon   : [2,5,7,9,11],
      Mars   : [1,2,4,7,8,10,11],
      Mercury: [1,2,4,5,6,9,10,11],
      Jupiter: [1,2,3,4,7,8,10,11],
      Venus  : [2,5,6,9,10,11],
      Saturn : [3,5,6,12],
      Lagna  : [1,2,4,5,6,7,9,10,11],
    },
    Venus: {
      Sun    : [8,11,12],
      Moon   : [1,2,3,4,5,8,9,11,12],
      Mars   : [3,4,6,8,11,12],
      Mercury: [1,2,3,4,5,8,9,11],
      Jupiter: [5,8,9,10,11],
      Venus  : [1,2,3,4,5,8,9,10,11],
      Saturn : [3,4,5,8,9,10,11],
      Lagna  : [1,2,3,4,5,8,9,11],
    },
    Saturn: {
      Sun    : [1,2,4,7,8,9,10,11],
      Moon   : [3,6,11],
      Mars   : [3,5,6,10,11,12],
      Mercury: [6,8,9,10,11,12],
      Jupiter: [5,6,11,12],
      Venus  : [6,11,12],
      Saturn : [3,5,6,11],
      Lagna  : [1,3,4,6,10,11],
    },
  };

  const PLANET_ORDER = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

  // ════════════════════════════════════════════════════════
  // calcBhinnashtakvarga — BAV for one planet
  // Returns array of 12 bindus (one per sign, 0-indexed)
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} planet — 'Sun'|'Moon'|'Mars'|...|'Saturn'
   * @param {Object} natalD1 — from NATAL.buildD1()
   * @returns {number[]} 12-element array, bindus per sign (0-8)
   */
  function calcBhinnashtakvarga(planet, natalD1) {
    try {
      const table = BAV_TABLE[planet];
      if (!table) return new Array(12).fill(0);

      const bindus = new Array(12).fill(0);
      const lagnaSign = natalD1.lagnaSign;

      // Reference points: each planet in PLANET_ORDER + Lagna
      const refs = [
        ...PLANET_ORDER.map(p => {
          const pl = natalD1.planets.find(x => x.eng === p);
          return { key: p, sign: pl ? pl.rashi : 0 };
        }),
        { key: 'Lagna', sign: lagnaSign },
      ];

      refs.forEach(refPt => {
        const houseList = table[refPt.key];
        if (!houseList) return;
        houseList.forEach(houseOffset => {
          // House offset is 1-based from the reference sign
          const targetSign = (refPt.sign + houseOffset - 1) % 12;
          bindus[targetSign]++;
        });
      });

      return bindus;
    } catch (e) {
      console.error('[ASHTAKAVARGA] calcBhinnashtakvarga error:', e);
      return new Array(12).fill(0);
    }
  }

  // ════════════════════════════════════════════════════════
  // calcSarvashtakvarga — SAV = sum of all 7 BAVs
  // ════════════════════════════════════════════════════════
  /**
   * @param {Object} allBAV — { Sun: [...], Moon: [...], ... }
   * @returns {number[]} 12-element SAV array (max 337 total)
   */
  function calcSarvashtakvarga(allBAV) {
    const sav = new Array(12).fill(0);
    PLANET_ORDER.forEach(p => {
      const bav = allBAV[p] || new Array(12).fill(0);
      bav.forEach((b, i) => { sav[i] += b; });
    });
    return sav;
  }

  // ════════════════════════════════════════════════════════
  // getSAVScore — total SAV score (0–337)
  // ════════════════════════════════════════════════════════
  function getSAVScore(natalD1) {
    const allBAV = {};
    PLANET_ORDER.forEach(p => { allBAV[p] = calcBhinnashtakvarga(p, natalD1); });
    const sav = calcSarvashtakvarga(allBAV);
    return sav.reduce((s, v) => s + v, 0);
  }

  // ════════════════════════════════════════════════════════
  // getTransitQuality — how good is a planet transiting a sign
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} planet
   * @param {number} transitSign — 0-11
   * @param {Object} natalD1
   * @returns {{ bindus: number, quality: string, score: number, hindiText: string }}
   */
  function getTransitQuality(planet, transitSign, natalD1) {
    try {
      const bav    = calcBhinnashtakvarga(planet, natalD1);
      const bindus = bav[transitSign] || 0;

      let quality, score, color;
      if (bindus >= 6)      { quality = 'उत्तम';   score =  3; color = '#00e676'; }
      else if (bindus >= 4) { quality = 'सामान्य'; score =  1; color = '#ffd740'; }
      else if (bindus >= 2) { quality = 'कमज़ोर';  score = -1; color = '#ff6d00'; }
      else                  { quality = 'अशुभ';   score = -3; color = '#ff1744'; }

      const N = getNatal();
      const RASHI_HI = N.RASHI_HI || [
        'मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
        'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन',
      ];

      return {
        planet, transitSign,
        bindus, quality, score, color,
        hindiText : `${planet} ${RASHI_HI[transitSign]} में — ${bindus} बिंदु — ${quality}`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { planet, transitSign, bindus: 0, quality: 'अज्ञात', score: 0 };
    }
  }

  // ════════════════════════════════════════════════════════
  // getBinduCount — bindus for a planet in a specific house
  // ════════════════════════════════════════════════════════
  function getBinduCount(planet, signIndex, natalD1) {
    try {
      const bav = calcBhinnashtakvarga(planet, natalD1);
      return bav[signIndex] || 0;
    } catch (e) { return 0; }
  }

  // ════════════════════════════════════════════════════════
  // interpretForMarket — Hindi market interpretation
  // ════════════════════════════════════════════════════════
  function interpretForMarket(planet, bindus) {
    const P_HI = {
      Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध',
      Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि',
    };
    const hi = P_HI[planet] || planet;
    if (bindus >= 6) return `${hi}: ${bindus} बिंदु — अत्यंत शुभ ट्रांज़िट, बुलिश संकेत`;
    if (bindus >= 4) return `${hi}: ${bindus} बिंदु — ठीक ट्रांज़िट, तटस्थ`;
    if (bindus >= 2) return `${hi}: ${bindus} बिंदु — कमज़ोर ट्रांज़िट, सतर्क रहें`;
    return `${hi}: ${bindus} बिंदु — अशुभ ट्रांज़िट, नकारात्मक संकेत`;
  }

  // ════════════════════════════════════════════════════════
  // FULL ANALYSIS — all planets for a date
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr
   * @param {Object} [natalD1]
   * @returns {{ allBAV, sav, savTotal, transitQualities, overallScore, hindiSummary }}
   */
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N  = getNatal();
      const d1 = natalD1 || N.getNasdaq();

      // Build all BAV
      const allBAV = {};
      PLANET_ORDER.forEach(p => { allBAV[p] = calcBhinnashtakvarga(p, d1); });

      // SAV
      const sav      = calcSarvashtakvarga(allBAV);
      const savTotal = sav.reduce((s, v) => s + v, 0);

      // Transit positions for this date
      const [y, m, dv] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, dv, 15, 0);
      const ayan = N.lahiri(jd);

      const transitQualities = PLANET_ORDER.map(p => {
        const lon  = N.n360(N.getPlanetLon(p, jd) - ayan);
        const sign = Math.floor(lon / 30);
        return getTransitQuality(p, sign, d1);
      });

      // Overall ashtakavarga score
      const overallScore = transitQualities.reduce((s, q) => s + q.score, 0);

      // SAV of current transit lagna
      const moonLon  = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const moonSign = Math.floor(moonLon / 30);
      const moonSAV  = sav[moonSign];

      return {
        allBAV,
        sav,
        savTotal,
        moonSAV,
        transitQualities,
        overallScore,
        isCrashSAV : savTotal < 25 * 12, // < 300 total = weak period
        hindiSummary: `सर्वाष्टकवर्ग: ${savTotal} | चंद्र SAV: ${moonSAV} | ट्रांज़िट स्कोर: ${overallScore > 0 ? '+' : ''}${overallScore}`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[ASHTAKAVARGA] analyzeForDate error:', e);
      return { allBAV: {}, sav: [], savTotal: 0, transitQualities: [], overallScore: 0 };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    BAV_TABLE,
    PLANET_ORDER,
    calcBhinnashtakvarga,
    calcSarvashtakvarga,
    getSAVScore,
    getTransitQuality,
    getBinduCount,
    interpretForMarket,
    analyzeForDate,
  };

})();

if (typeof module !== 'undefined') module.exports = ASHTAKAVARGA;
if (typeof window !== 'undefined') window.ASHTAKAVARGA = ASHTAKAVARGA;

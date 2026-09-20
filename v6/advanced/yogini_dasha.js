/* ============================================================
   VedicAladdin V6 — advanced/yogini_dasha.js
   8 Yogini Dashas: Mangala(1) through Sankata(8) = 36 years
   Cross-validated with Vimshottari
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const YOGINI_DASHA = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  const YOGINI_DEF = [
    { num:1, name:'Mangala',  hi:'मंगला',  years:1, lord:'Moon',    bias:'BULL',
      mktHi:'मंगला (1 वर्ष) — चंद्र स्वामी — त्वरित तेजी, भावनात्मक बाज़ार' },
    { num:2, name:'Pingala',  hi:'पिंगला', years:2, lord:'Sun',     bias:'BULL',
      mktHi:'पिंगला (2 वर्ष) — सूर्य स्वामी — सरकारी नीति, मजबूत तेजी' },
    { num:3, name:'Dhanya',   hi:'धन्या',  years:3, lord:'Jupiter', bias:'STRONG_BULL',
      mktHi:'धन्या (3 वर्ष) — गुरु स्वामी — सर्वश्रेष्ठ बुल काल, संपत्ति लाभ' },
    { num:4, name:'Bhramari', hi:'भ्रामरी',years:4, lord:'Mars',    bias:'VOLATILE',
      mktHi:'भ्रामरी (4 वर्ष) — मंगल स्वामी — अत्यधिक उतार-चढ़ाव, युद्ध जोखिम' },
    { num:5, name:'Bhadrika', hi:'भद्रिका',years:5, lord:'Mercury', bias:'BULL',
      mktHi:'भद्रिका (5 वर्ष) — बुध स्वामी — टेक/NASDAQ तेजी, संचार क्रांति' },
    { num:6, name:'Ulka',     hi:'उल्का',  years:6, lord:'Saturn',  bias:'BEAR',
      mktHi:'उल्का (6 वर्ष) — शनि स्वामी — दीर्घ सुधार, संरचनात्मक बदलाव' },
    { num:7, name:'Siddha',   hi:'सिद्धा', years:7, lord:'Venus',   bias:'BULL',
      mktHi:'सिद्धा (7 वर्ष) — शुक्र स्वामी — समृद्धि काल, मजबूत बुल मार्केट' },
    { num:8, name:'Sankata',  hi:'संकटा',  years:8, lord:'Rahu',    bias:'BEAR',
      mktHi:'संकटा (8 वर्ष) — राहु स्वामी — संकट काल, बड़ी गिरावट/अस्थिरता' },
  ];

  const TOTAL_YEARS = 36; // sum of all yogini years

  // ════════════════════════════════════════════════════════
  // calcYoginiDasha
  // ════════════════════════════════════════════════════════
  /**
   * @param {number} birthJD  — NASDAQ birth Julian Day
   * @param {number} moonSidLon — NASDAQ birth Moon sidereal longitude
   * @param {number} targetJD — date to analyze
   * @returns {Object} active yogini + antardasha info
   */
  function calcYoginiDasha(birthJD, moonSidLon, targetJD) {
    try {
      // Starting yogini from Moon nakshatra: nakNum % 8 → 0-indexed into YOGINI_DEF
      const nakNum       = Math.floor(moonSidLon / (360 / 27));
      const startYogIdx  = nakNum % 8;

      const elapsedYears = (targetJD - birthJD) / 365.25;
      const posInCycle   = ((elapsedYears % TOTAL_YEARS) + TOTAL_YEARS) % TOTAL_YEARS;

      let accumulated = 0;
      let activeYogini = null;

      for (let i = 0; i < 8; i++) {
        const idx = (startYogIdx + i) % 8;
        const yog = YOGINI_DEF[idx];

        if (posInCycle < accumulated + yog.years) {
          const yearsInto    = posInCycle - accumulated;
          const yearsRemaining = yog.years - yearsInto;
          const cycleNum    = Math.floor(elapsedYears / TOTAL_YEARS);
          const startJD     = birthJD + (cycleNum * TOTAL_YEARS + accumulated) * 365.25;
          const endJD       = startJD + yog.years * 365.25;

          const toISO = jd => new Date((jd - 2440587.5) * 86400000).toISOString().split('T')[0];

          // Antardasha: each yogini is divided into 8 sub-periods proportionally
          const antarSize = yog.years / 8;
          const antarIdx  = Math.floor(yearsInto / antarSize);
          const antarYog  = YOGINI_DEF[(idx + antarIdx) % 8];
          const antarStart = startJD + antarIdx * antarSize * 365.25;
          const antarEnd   = antarStart + antarSize * 365.25;

          activeYogini = {
            ...yog,
            yearsInto      : parseFloat(yearsInto.toFixed(2)),
            yearsRemaining : parseFloat(yearsRemaining.toFixed(2)),
            startIST       : toISO(startJD),
            endIST         : toISO(endJD),
            antardasha: {
              ...antarYog,
              startIST: toISO(antarStart),
              endIST  : toISO(antarEnd),
            },
            schemaVersion: "6.0",
          };
          break;
        }
        accumulated += yog.years;
      }

      return activeYogini || YOGINI_DEF[0];
    } catch (e) {
      console.error('[YOGINI_DASHA] error:', e);
      return YOGINI_DEF[0];
    }
  }

  // ════════════════════════════════════════════════════════
  // interpretForMarket
  // ════════════════════════════════════════════════════════
  function interpretForMarket(yogini) {
    if (!yogini) return 'योगिनी दशा: डेटा उपलब्ध नहीं';
    const bias = yogini.bias === 'STRONG_BULL' ? 'प्रबल तेजी' :
                 yogini.bias === 'BULL'        ? 'तेजी'       :
                 yogini.bias === 'BEAR'        ? 'मंदी'       :
                 yogini.bias === 'VOLATILE'    ? 'उतार-चढ़ाव' : 'तटस्थ';
    return `${yogini.hi} योगिनी (${yogini.years} वर्ष) — ${yogini.lord} स्वामी — ${bias} | ${yogini.mktHi}`;
  }

  // ════════════════════════════════════════════════════════
  // crossValidate — compare with Vimshottari
  // ════════════════════════════════════════════════════════
  function crossValidate(yogini, vimshottari) {
    if (!yogini || !vimshottari) return { agree: false, combined: 'NEUTRAL' };
    const BIAS_DIR = {
      STRONG_BULL:'BULL', BULL:'BULL', VOLATILE:'NEUTRAL',
      NEUTRAL:'NEUTRAL', BEAR:'BEAR',
    };
    const yogDir  = BIAS_DIR[yogini.bias] || 'NEUTRAL';
    const vimDir  = vimshottari.marketBias === 'BULL' ? 'BULL' :
                    vimshottari.marketBias === 'BEAR' ? 'BEAR' : 'NEUTRAL';
    const agree   = yogDir === vimDir;
    const combined = agree ? yogDir : 'NEUTRAL';
    return {
      agree,
      yoginiDir : yogDir,
      vimDir,
      combined,
      hindiText : agree
        ? `योगिनी + वीमशोत्तरी दोनों ${combined === 'BULL' ? 'बुलिश' : 'बियरिश'} — उच्च विश्वास`
        : `योगिनी ${yogDir} vs वीमशोत्तरी ${vimDir} — मिश्रित संकेत`,
    };
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N    = getNatal();
      const d1   = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const birth = N.NASDAQ_BIRTH;
      const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const moonSid = d1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;

      const yogini = calcYoginiDasha(birthJD, moonSid, jd);
      const BIAS_SCORE = { STRONG_BULL:5, BULL:3, VOLATILE:0, NEUTRAL:0, BEAR:-3 };
      const score  = BIAS_SCORE[yogini.bias] || 0;

      return {
        yogini,
        antardasha   : yogini.antardasha,
        score,
        hindiSummary : interpretForMarket(yogini),
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { yogini: YOGINI_DEF[0], score: 0 };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    YOGINI_DEF, TOTAL_YEARS,
    calcYoginiDasha, interpretForMarket, crossValidate, analyzeForDate,
  };

})();

if (typeof module !== 'undefined') module.exports = YOGINI_DASHA;
if (typeof window !== 'undefined') window.YOGINI_DASHA = YOGINI_DASHA;

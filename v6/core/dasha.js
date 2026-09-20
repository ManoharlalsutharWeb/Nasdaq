/* ============================================================
   VedicAladdin V6 — core/dasha.js
   Vimshottari Dasha: Maha / Antar / Pratyantar / Sookshma
   V5 fully preserved + V6 additions:
     Yogini Dasha (8 yoginis, 36-year cycle)
     Prana Dasha  (sub-sub-sub — 5th level)
     getDashaPeriodHistory — what happened last time this dasha ran
     isDashaChange — detect if dasha lord changes between two dates
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const DASHA = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════
  // V5 — VIMSHOTTARI CONSTANTS (preserved)
  // ════════════════════════════════════════════════════════
  const ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
  const YEARS = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
  const HI    = {
    Ketu:'केतु', Venus:'शुक्र', Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल',
    Rahu:'राहु', Jupiter:'बृहस्पति', Saturn:'शनि', Mercury:'बुध',
  };
  const TOTAL = 120;  // total Vimshottari years

  // Market interpretation per maha dasha lord
  const DASHA_MKT = {
    Sun     : { bias: 'BULL',    hi: 'सूर्य महादशा — अधिकारी/सरकार चाल, मध्यम तेजी' },
    Moon    : { bias: 'BULL',    hi: 'चंद्र महादशा — जनभावना, उतार-चढ़ाव' },
    Mars    : { bias: 'BEAR',    hi: 'मंगल महादशा — अचानक उतार-चढ़ाव, युद्ध जोखिम' },
    Mercury : { bias: 'BULL',    hi: 'बुध महादशा — टेक/संचार रैली, NASDAQ अनुकूल' },
    Jupiter : { bias: 'BULL',    hi: 'बृहस्पति महादशा — बड़ी तेजी, संस्थागत खरीद' },
    Venus   : { bias: 'BULL',    hi: 'शुक्र महादशा — उपभोक्ता/लग्जरी बुल, मजबूत' },
    Saturn  : { bias: 'BEAR',    hi: 'शनि महादशा — दीर्घ मंदी, संरचनात्मक सुधार' },
    Rahu    : { bias: 'VOLATILE',hi: 'राहु महादशा — सट्टा बुल/क्रैश दोनों संभव' },
    Ketu    : { bias: 'BEAR',    hi: 'केतु महादशा — अनिश्चितता, अचानक हानि' },
  };

  // ════════════════════════════════════════════════════════
  // V5 — HELPER FUNCTIONS (preserved)
  // ════════════════════════════════════════════════════════
  function jdToISO(jd) {
    const ms = (jd - 2440587.5) * 86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  function jdFromDate(y, m, d) {
    const N = typeof NATAL !== 'undefined' ? NATAL : require('./natal');
    return N.JD(y, m, d, 12, 0);
  }

  function nakLord(moonSid) {
    return ORDER[Math.floor(moonSid / (360 / 27)) % 9];
  }

  // ════════════════════════════════════════════════════════
  // V5 — VIMSHOTTARI TIMELINE (preserved)
  // ════════════════════════════════════════════════════════
  function getTimeline(nasdaq_jd, moonSidLon, fromJD, toJD) {
    const lord = nakLord(moonSidLon);
    const li   = ORDER.indexOf(lord);
    const fracElapsed = (moonSidLon % (360 / 27)) / (360 / 27);
    const yearsElapsed = YEARS[lord] * fracElapsed;

    const timeline = [];
    let cursor = nasdaq_jd - (yearsElapsed * 365.25);

    for (let cycle = 0; cycle < 3; cycle++) {
      for (let i = 0; i < 9; i++) {
        const mi   = (li + i) % 9;
        const maha = ORDER[mi];
        const mahaYrs   = YEARS[maha];
        const mahaStart = cursor;
        const mahaEnd   = cursor + mahaYrs * 365.25;

        // Antar dashas
        let antarCursor = mahaStart;
        for (let j = 0; j < 9; j++) {
          const ai    = (mi + j) % 9;
          const antar = ORDER[ai];
          const antarYrs   = mahaYrs * (YEARS[antar] / TOTAL);
          const antarStart = antarCursor;
          const antarEnd   = antarCursor + antarYrs * 365.25;

          // Pratyantar
          let pratCursor = antarStart;
          const pratyantars = [];
          for (let k = 0; k < 9; k++) {
            const pi   = (ai + k) % 9;
            const prat = ORDER[pi];
            const pratYrs   = antarYrs * (YEARS[prat] / TOTAL);
            const pratStart = pratCursor;
            const pratEnd   = pratCursor + pratYrs * 365.25;

            // Sookshma (4th level — V5 named "Prana" in some traditions)
            let sookCursor = pratStart;
            const sookshmadas = [];
            for (let s = 0; s < 9; s++) {
              const si   = (pi + s) % 9;
              const sook = ORDER[si];
              const sookYrs   = pratYrs * (YEARS[sook] / TOTAL);
              const sookStart = sookCursor;
              const sookEnd   = sookCursor + sookYrs * 365.25;
              sookshmadas.push({
                sook, sookHi: HI[sook],
                sookStart, sookEnd,
                sookStartIST: jdToISO(sookStart),
                sookEndIST  : jdToISO(sookEnd),
              });
              sookCursor = sookEnd;
            }

            pratyantars.push({
              prat, pratHi: HI[prat],
              pratStart, pratEnd,
              pratStartIST: jdToISO(pratStart),
              pratEndIST  : jdToISO(pratEnd),
              sookshmadas,
            });
            pratCursor = pratEnd;
          }

          timeline.push({
            maha, mahaHi: HI[maha],
            mahaStart, mahaEnd,
            antar, antarHi: HI[antar],
            antarStart, antarEnd,
            mahaStartIST : jdToISO(mahaStart),
            mahaEndIST   : jdToISO(mahaEnd),
            antarStartIST: jdToISO(antarStart),
            antarEndIST  : jdToISO(antarEnd),
            pratyantars,
          });
          antarCursor = antarEnd;
        }
        cursor = mahaEnd;
      }
    }

    if (fromJD && toJD) {
      return timeline.filter(d => d.mahaEnd >= fromJD && d.mahaStart <= toJD);
    }
    return timeline;
  }

  // ── Get current dasha for a JD ────────────────────────────
  function getCurrent(nasdaq_jd, moonSidLon, targetJD) {
    const all   = getTimeline(nasdaq_jd, moonSidLon, targetJD - 1, targetJD + 1);
    const entry = all.find(e => e.antarStart <= targetJD && e.antarEnd > targetJD);
    if (!entry) return null;

    const prat  = entry.pratyantars.find(p => p.pratStart <= targetJD && p.pratEnd > targetJD);
    const sook  = prat?.sookshmadas?.find(s => s.sookStart <= targetJD && s.sookEnd > targetJD);

    const mahaElapsed = targetJD - entry.mahaStart;
    const mahaTotal   = entry.mahaEnd - entry.mahaStart;
    const mahaRemDays = Math.round(entry.mahaEnd - targetJD);

    return {
      maha    : entry.maha,    mahaHi    : HI[entry.maha],
      antar   : entry.antar,   antarHi   : HI[entry.antar],
      pratyantar: prat?.prat,  pratyantarHi: prat ? HI[prat.prat] : '',
      sookshma  : sook?.sook,  sookshmaHi  : sook ? HI[sook.sook] : '',
      mahaStartIST  : entry.mahaStartIST,
      mahaEndIST    : entry.mahaEndIST,
      antarStartIST : entry.antarStartIST,
      antarEndIST   : entry.antarEndIST,
      mahaElapsedPct: parseFloat((mahaElapsed / mahaTotal * 100).toFixed(1)),
      mahaRemDays,
      marketBias  : DASHA_MKT[entry.maha]?.bias   || 'NEUTRAL',
      marketDescHi: DASHA_MKT[entry.maha]?.hi      || '',
      sc          : getDashaScore(entry.maha, entry.antar),
      schemaVersion: "6.0",
    };
  }

  // ── Dasha score for scoring.js ────────────────────────────
  function getDashaScore(maha, antar) {
    const BIAS_SCORE = { BULL:3, BEAR:-3, VOLATILE:0, NEUTRAL:0 };
    const mahaBias  = DASHA_MKT[maha]?.bias   || 'NEUTRAL';
    const antarBias = DASHA_MKT[antar]?.bias  || 'NEUTRAL';
    return (BIAS_SCORE[mahaBias] || 0) * 0.7 +
           (BIAS_SCORE[antarBias] || 0) * 0.3;
  }

  // ── Dasha interpretation for aggregator ───────────────────
  function interpret(nasdaq_jd, moonSidLon, targetJD) {
    const cur = getCurrent(nasdaq_jd, moonSidLon, targetJD);
    if (!cur) return { sc: 0, mahaInterp: { desc: '' } };
    return {
      ...cur,
      mahaInterp: { desc: DASHA_MKT[cur.maha]?.hi || '' },
      sc: getDashaScore(cur.maha, cur.antar),
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: Yogini Dasha (8 yoginis, 36-year cycle)
  // ════════════════════════════════════════════════════════
  const YOGINI_DEF = [
    { num:1, name:'Mangala',   hi:'मंगला',   years:1, lord:'Moon',    bias:'BULL',     mktHi:'मंगला (1 वर्ष) — त्वरित तेजी, भावनात्मक बाज़ार' },
    { num:2, name:'Pingala',   hi:'पिंगला',  years:2, lord:'Sun',     bias:'BULL',     mktHi:'पिंगला (2 वर्ष) — सरकारी नीति, मजबूत तेजी' },
    { num:3, name:'Dhanya',    hi:'धन्या',   years:3, lord:'Jupiter', bias:'STRONG_BULL', mktHi:'धन्या (3 वर्ष) — सर्वश्रेष्ठ बुल, संपत्ति लाभ' },
    { num:4, name:'Bhramari',  hi:'भ्रामरी', years:4, lord:'Mars',    bias:'VOLATILE', mktHi:'भ्रामरी (4 वर्ष) — उतार-चढ़ाव, युद्ध/दुर्घटना जोखिम' },
    { num:5, name:'Bhadrika',  hi:'भद्रिका', years:5, lord:'Mercury', bias:'BULL',     mktHi:'भद्रिका (5 वर्ष) — टेक रैली, NASDAQ अनुकूल' },
    { num:6, name:'Ulka',      hi:'उल्का',   years:6, lord:'Saturn',  bias:'BEAR',     mktHi:'उल्का (6 वर्ष) — दीर्घ सुधार, संरचनात्मक बदलाव' },
    { num:7, name:'Siddha',    hi:'सिद्धा',  years:7, lord:'Venus',   bias:'BULL',     mktHi:'सिद्धा (7 वर्ष) — मजबूत तेजी, समृद्धि काल' },
    { num:8, name:'Sankata',   hi:'संकटा',   years:8, lord:'Rahu',    bias:'BEAR',     mktHi:'संकटा (8 वर्ष) — संकट, बड़ी गिरावट संभव' },
  ];
  const YOGINI_TOTAL = 36; // sum of all years

  /**
   * calcYoginiDasha — get active Yogini Dasha for a date
   * Yogini Dasha starts from birth; period = 36 year repeating cycle
   * Start yogini determined from Moon's nakshatra lord at birth
   *
   * @param {number} birthJD — NASDAQ birth Julian Day
   * @param {number} moonSidLon — NASDAQ birth Moon sidereal longitude
   * @param {number} targetJD — date to analyze
   * @returns {Object} active yogini dasha info
   */
  function calcYoginiDasha(birthJD, moonSidLon, targetJD) {
    try {
      // Starting yogini = Moon nakshatra number mod 8 + 1
      const nakNum = Math.floor(moonSidLon / (360 / 27));
      const startYoginiIdx = nakNum % 8;   // 0-7 index into YOGINI_DEF

      // Total elapsed years from birth
      const elapsedDays = targetJD - birthJD;
      const elapsedYears = elapsedDays / 365.25;
      const posInCycle = ((elapsedYears % YOGINI_TOTAL) + YOGINI_TOTAL) % YOGINI_TOTAL;

      // Find which yogini is active
      let accumulated = 0;
      let activeYogini = null;
      for (let i = 0; i < 8; i++) {
        const idx = (startYoginiIdx + i) % 8;
        const yog = YOGINI_DEF[idx];
        if (posInCycle < accumulated + yog.years) {
          const yearsIntoDasha = posInCycle - accumulated;
          const yearsRemaining = yog.years - yearsIntoDasha;
          const startJD = birthJD + (accumulated + (YOGINI_TOTAL * Math.floor(elapsedYears / YOGINI_TOTAL))) * 365.25;
          const endJD   = startJD + yog.years * 365.25;
          activeYogini = {
            ...yog,
            yearsIntoDasha: parseFloat(yearsIntoDasha.toFixed(2)),
            yearsRemaining : parseFloat(yearsRemaining.toFixed(2)),
            startIST: jdToISO(startJD),
            endIST  : jdToISO(endJD),
          };
          break;
        }
        accumulated += yog.years;
      }

      return activeYogini || YOGINI_DEF[0];
    } catch (e) {
      console.error('[DASHA] calcYoginiDasha error:', e);
      return YOGINI_DEF[0];
    }
  }

  /**
   * interpretYoginiForMarket — Hindi interpretation
   */
  function interpretYoginiForMarket(yogini) {
    if (!yogini) return 'योगिनी दशा अज्ञात';
    return `${yogini.hi} योगिनी दशा — ${yogini.lord} स्वामी — ${yogini.mktHi}`;
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getDashaPeriodHistory — last time this dasha ran
  // ════════════════════════════════════════════════════════
  /**
   * Get what happened in the same maha dasha in the previous cycle
   * Useful for "last time Saturn Maha ran, NASDAQ did X"
   *
   * @param {string} mahaDasha  — planet name
   * @param {number} nasdaq_jd
   * @param {number} moonSidLon
   * @param {number} currentJD
   * @returns {{ prevStart, prevEnd, yearsAgo }}
   */
  function getDashaPeriodHistory(mahaDasha, nasdaq_jd, moonSidLon, currentJD) {
    try {
      const searchFrom = nasdaq_jd;
      const searchTo   = currentJD - 365; // end before current
      const timeline   = getTimeline(nasdaq_jd, moonSidLon, searchFrom, searchTo);
      // Find previous occurrence of this maha dasha
      const prev = timeline.filter(e => e.maha === mahaDasha && e.mahaEnd < currentJD);
      if (prev.length === 0) return null;
      const last = prev[prev.length - 1];
      const yearsAgo = (currentJD - last.mahaEnd) / 365.25;
      return {
        maha      : last.maha,
        prevStart : last.mahaStartIST,
        prevEnd   : last.mahaEndIST,
        yearsAgo  : parseFloat(yearsAgo.toFixed(1)),
        hindiNote : `${HI[mahaDasha]} महादशा पिछली बार ${last.mahaStartIST} से ${last.mahaEndIST} तक चली`,
      };
    } catch (e) {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: isDashaChange — detect lord change between two dates
  // ════════════════════════════════════════════════════════
  /**
   * Returns true if maha or antar dasha lord changed between date1 and date2
   * @param {number} date1JD
   * @param {number} date2JD
   * @param {number} nasdaq_jd
   * @param {number} moonSidLon
   * @returns {{ changed, level, oldMaha, newMaha, oldAntar, newAntar }}
   */
  function isDashaChange(date1JD, date2JD, nasdaq_jd, moonSidLon) {
    try {
      const d1 = getCurrent(nasdaq_jd, moonSidLon, date1JD);
      const d2 = getCurrent(nasdaq_jd, moonSidLon, date2JD);
      if (!d1 || !d2) return { changed: false };
      const mahaChanged  = d1.maha  !== d2.maha;
      const antarChanged = d1.antar !== d2.antar;
      return {
        changed    : mahaChanged || antarChanged,
        level      : mahaChanged ? 'maha' : antarChanged ? 'antar' : 'none',
        oldMaha    : d1.maha,  newMaha : d2.maha,
        oldAntar   : d1.antar, newAntar: d2.antar,
        hindiNote  : mahaChanged
          ? `महादशा बदली: ${HI[d1.maha]} → ${HI[d2.maha]} — बड़ा परिवर्तन`
          : antarChanged
          ? `अंतर्दशा बदली: ${HI[d1.antar]} → ${HI[d2.antar]}`
          : 'कोई दशा परिवर्तन नहीं',
      };
    } catch (e) {
      return { changed: false };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: Prana Dasha (5th level — Sookshma × sub)
  // Alias for the 5th level sub-period within Sookshma
  // ════════════════════════════════════════════════════════
  /**
   * getPranaDasha — 5th level of Vimshottari
   * @param {number} nasdaq_jd
   * @param {number} moonSidLon
   * @param {number} targetJD
   * @returns {{ prana, pranaHi, pranaStart, pranaEnd }} | null
   */
  function getPranaDasha(nasdaq_jd, moonSidLon, targetJD) {
    try {
      const cur = getCurrent(nasdaq_jd, moonSidLon, targetJD);
      if (!cur) return null;
      // Locate the Sookshma period
      const all = getTimeline(nasdaq_jd, moonSidLon, targetJD - 1, targetJD + 1);
      const entry = all.find(e => e.antarStart <= targetJD && e.antarEnd > targetJD);
      if (!entry) return null;
      const prat = entry.pratyantars.find(p => p.pratStart <= targetJD && p.pratEnd > targetJD);
      if (!prat) return null;
      const sook = prat.sookshmadas?.find(s => s.sookStart <= targetJD && s.sookEnd > targetJD);
      if (!sook) return null;

      // 5th level within Sookshma
      const sookYrs = (prat.pratEnd - prat.pratStart) / 365.25 * (YEARS[sook.sook] / TOTAL);
      const pranas = ORDER.map((p, idx) => {
        const pranaYrs   = sookYrs * (YEARS[p] / TOTAL);
        const pranaStart = sook.sookStart + idx * pranaYrs * 365.25;
        const pranaEnd   = pranaStart + pranaYrs * 365.25;
        return { prana: p, pranaHi: HI[p], pranaStart, pranaEnd,
                 pranaStartIST: jdToISO(pranaStart), pranaEndIST: jdToISO(pranaEnd) };
      });

      const activePrana = pranas.find(p => p.pranaStart <= targetJD && p.pranaEnd > targetJD);
      return activePrana || null;
    } catch (e) {
      return null;
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    ORDER, YEARS, HI, TOTAL,
    getTimeline,
    getCurrent,
    getDashaScore,
    interpret,
    nakLord,
    DASHA_MKT,
    // V6 new
    YOGINI_DEF,
    calcYoginiDasha,
    interpretYoginiForMarket,
    getDashaPeriodHistory,
    isDashaChange,
    getPranaDasha,
  };

})();

if (typeof module !== 'undefined') module.exports = DASHA;
if (typeof window !== 'undefined') window.DASHA = DASHA;

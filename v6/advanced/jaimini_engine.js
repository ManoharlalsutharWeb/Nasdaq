/* ============================================================
   VedicAladdin V6 — advanced/jaimini_engine.js
   Jaimini Chara Dasha + 7 Karakas + Arudha Pada
   Jaimini Aspects: Movable↔Fixed, Dual↔Dual
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const JAIMINI_ENGINE = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  // Sign categories for Jaimini aspects
  const MOVABLE = [0,3,6,9];   // Aries,Cancer,Libra,Capricorn
  const FIXED   = [1,4,7,10];  // Taurus,Leo,Scorpio,Aquarius
  const DUAL    = [2,5,8,11];  // Gemini,Virgo,Sag,Pisces

  const RASHI_HI = [
    'मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
    'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन',
  ];

  // ════════════════════════════════════════════════════════
  // JAIMINI ASPECTS
  // Movable signs aspect all Fixed signs EXCEPT the adjacent one
  // Fixed signs aspect all Movable signs EXCEPT the adjacent one
  // Dual signs aspect all Dual signs EXCEPT the adjacent one
  // ════════════════════════════════════════════════════════
  function getJaiminiAspect(sign1, sign2) {
    const s1Cat = MOVABLE.includes(sign1) ? 'M' : FIXED.includes(sign1) ? 'F' : 'D';
    const s2Cat = MOVABLE.includes(sign2) ? 'M' : FIXED.includes(sign2) ? 'F' : 'D';

    // Same category cannot aspect each other (by Jaimini)
    // Movable ↔ Fixed, Dual ↔ Dual
    const adjacent = (Math.abs(sign1 - sign2) === 1 || Math.abs(sign1 - sign2) === 11);

    if (s1Cat === 'M' && s2Cat === 'F' && !adjacent) return true;
    if (s1Cat === 'F' && s2Cat === 'M' && !adjacent) return true;
    if (s1Cat === 'D' && s2Cat === 'D' && !adjacent) return true;
    return false;
  }

  // ════════════════════════════════════════════════════════
  // CHARA KARAKAS — 7 significators based on degree
  // Planet with highest degree in sign = Atmakaraka
  // ════════════════════════════════════════════════════════
  const KARAKA_NAMES    = ['AK','AmK','BK','MK','PiK','PuK','GK'];
  const KARAKA_NAMES_HI = ['आत्मकारक','अमात्यकारक','भ्रातृकारक','मातृकारक','पितृकारक','पुत्रकारक','ज्ञातिकारक'];
  const KARAKA_MARKET   = {
    AK : 'आत्मकारक — बाज़ार की आत्मा, मुख्य दिशा देने वाला',
    AmK: 'अमात्यकारक — CEO/प्रबंधन, संस्थागत निर्णय',
    BK : 'भ्रातृकारक — साझेदारी/M&A, संयुक्त प्रभाव',
    MK : 'मातृकारक — जन भावना, खुदरा निवेशक',
    PiK: 'पितृकारक — सरकारी नीति, नियामक',
    PuK: 'पुत्रकारक — नई लिस्टिंग/IPO, भविष्य',
    GK : 'ज्ञातिकारक — प्रतिस्पर्धा/बाधा',
  };

  function getCharaKarakas(natalPlanets) {
    try {
      // Eligible: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
      const eligible = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
      const planets  = natalPlanets
        .filter(p => eligible.includes(p.eng))
        .map(p => ({
          eng    : p.eng,
          hi     : p.hi,
          sign   : Math.floor(p.sidLon / 30),
          deg    : p.sidLon % 30,
        }))
        .sort((a, b) => b.deg - a.deg); // highest degree first = AK

      const karakas = {};
      planets.forEach((p, i) => {
        const key = KARAKA_NAMES[i];
        if (!key) return;
        karakas[key] = {
          planet  : p.eng,
          hi      : p.hi,
          deg     : parseFloat(p.deg.toFixed(2)),
          sign    : p.sign,
          signHi  : RASHI_HI[p.sign],
          karakaHi: KARAKA_NAMES_HI[i],
          marketHi: KARAKA_MARKET[key] || '',
        };
      });
      return karakas;
    } catch (e) {
      console.error('[JAIMINI] getCharaKarakas error:', e);
      return {};
    }
  }

  // ════════════════════════════════════════════════════════
  // ARUDHA PADA — image/perception of a house
  // ════════════════════════════════════════════════════════
  function getArudhaPada(lordSign, houseNum, ascSign) {
    try {
      const houseSign  = (ascSign + houseNum - 1) % 12;
      const distToLord = (lordSign - houseSign + 12) % 12;
      let arudha       = (lordSign + distToLord) % 12;
      // Correction: if arudha falls in same house or 7th from it
      if (arudha === houseSign) arudha = (houseSign + 9) % 12; // move to 10th from house
      if (arudha === (lordSign + 6) % 12) arudha = (arudha + 9) % 12;
      return { arudhaSign: arudha, arudhaHi: RASHI_HI[arudha] };
    } catch (e) {
      return { arudhaSign: 0, arudhaHi: RASHI_HI[0] };
    }
  }

  // ════════════════════════════════════════════════════════
  // CHARA DASHA — sign-based dasha
  // Signs get years = # signs from their lord to the sign (in zodiacal or reverse order)
  // Standard Parashari-Jaimini Chara Dasha
  // ════════════════════════════════════════════════════════
  const RASHI_LORDS_JAIMINI = [
    'Mars','Venus','Mercury','Moon','Sun','Mercury',
    'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter',
  ];
  const EXALT_SIGNS = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };

  function getCharaDashaYears(sign) {
    const lrd = RASHI_LORDS_JAIMINI[sign];
    const lordSign = ['Mars','Venus','Mercury','Moon','Sun','Mercury',
                      'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'].indexOf(lrd);
    // Find which sign the lord is actually in (using natal chart)
    // For a general approximation, use sign count
    const SIGN_YEARS = [7,6,9,4,6,8,7,9,10,4,7,12]; // approximate per sign
    return SIGN_YEARS[sign] || 6;
  }

  function getCharaDasha(natalChart, targetJD) {
    try {
      const N = getNatal();
      const birth = N.NASDAQ_BIRTH;
      const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);

      // Chara dasha starts from Lagna sign
      const lagnaSign = natalChart.lagnaSign;
      const elapsedYrs = (targetJD - birthJD) / 365.25;

      let cursor = 0;
      let mahaStart = 0;
      let activeMaha = null;

      // Cycle through 12 signs
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let i = 0; i < 12; i++) {
          const sign = (lagnaSign + i) % 12;
          const yrs  = getCharaDashaYears(sign);
          if (cursor + yrs > elapsedYrs) {
            const yrsInto = elapsedYrs - cursor;
            const yrsRem  = yrs - yrsInto;
            const startJD = birthJD + cursor * 365.25;
            const endJD   = startJD + yrs * 365.25;
            const toISO   = jd => new Date((jd - 2440587.5) * 86400000).toISOString().split('T')[0];

            // Antardasha: divide maha proportionally
            const antarYrs  = yrs / 12;
            const antarIdx  = Math.floor(yrsInto / antarYrs);
            const antarSign = (sign + antarIdx) % 12;
            const antarStart = startJD + antarIdx * antarYrs * 365.25;
            const antarEnd   = antarStart + antarYrs * 365.25;

            activeMaha = {
              mahadasha   : RASHI_HI[sign],
              mahaSign    : sign,
              antardasha  : RASHI_HI[antarSign],
              antarSign,
              mahaStart   : toISO(startJD),
              mahaEnd     : toISO(endJD),
              antarStart  : toISO(antarStart),
              antarEnd    : toISO(antarEnd),
              yearsRemaining: parseFloat(yrsRem.toFixed(2)),
              schemaVersion: "6.0",
            };
            break;
          }
          cursor += yrs;
        }
        if (activeMaha) break;
      }

      return activeMaha || {
        mahadasha:'मेष', mahaSign:0, antardasha:'मेष', antarSign:0,
        mahaStart:'', mahaEnd:'', antarStart:'', antarEnd:'', yearsRemaining:0,
      };
    } catch (e) {
      console.error('[JAIMINI] getCharaDasha error:', e);
      return null;
    }
  }

  // ════════════════════════════════════════════════════════
  // interpretForMarket — Hindi
  // ════════════════════════════════════════════════════════
  function interpretForMarket(charaDasha, karakas) {
    if (!charaDasha) return 'जैमिनी दशा: डेटा उपलब्ध नहीं';
    const ak  = karakas?.AK;
    const amk = karakas?.AmK;
    return [
      `जैमिनी महादशा: ${charaDasha.mahadasha} राशि — अंतर: ${charaDasha.antardasha}`,
      ak  ? `आत्मकारक: ${ak.hi} (${ak.signHi}) — ${KARAKA_MARKET.AK}` : '',
      amk ? `अमात्यकारक: ${amk.hi} (${amk.signHi}) — ${KARAKA_MARKET.AmK}` : '',
    ].filter(Boolean).join(' | ');
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N  = getNatal();
      const d1 = natalD1 || N.getNasdaq();
      const [y, m, dv] = dateStr.split('-').map(Number);
      const jd = N.JD(y, m, dv, 15, 0);

      const karakas    = getCharaKarakas(d1.planets);
      const charaDasha = getCharaDasha(d1, jd);
      const ak         = karakas.AK;

      // Score: AK in strong sign = bull
      let score = 0;
      if (ak) {
        const dig = d1.planets.find(p => p.eng === ak.planet)?.dignity || '';
        if (dig === 'उच्च')    score += 3;
        if (dig === 'स्वगृह') score += 2;
        if (dig === 'नीच')    score -= 3;
      }

      return {
        karakas,
        charaDasha,
        score,
        hindiSummary: interpretForMarket(charaDasha, karakas),
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[JAIMINI] analyzeForDate error:', e);
      return { karakas:{}, charaDasha:null, score:0 };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    getJaiminiAspect, getCharaKarakas, getArudhaPada,
    getCharaDasha, interpretForMarket, analyzeForDate,
    MOVABLE, FIXED, DUAL, KARAKA_NAMES, KARAKA_MARKET,
  };

})();

if (typeof module !== 'undefined') module.exports = JAIMINI_ENGINE;
if (typeof window !== 'undefined') window.JAIMINI_ENGINE = JAIMINI_ENGINE;

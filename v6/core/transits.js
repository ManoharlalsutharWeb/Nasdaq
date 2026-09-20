/* ============================================================
   VedicAladdin V6 — core/transits.js
   Transit positions + aspects + orb + exactness timestamps
   V5 fully preserved + V6 additions:
     Outer planets (Uranus, Neptune, Pluto) in transit calc
     getExactAspectTime — exact minute of aspect perfection
     getRetrogradePeriod — full retro window for a planet/year
     getGrahaYuddha — planet war detection
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const TRANSITS = (function () {
  'use strict';

  function getNatal() {
    return typeof NATAL !== 'undefined' ? NATAL : require('./natal');
  }

  // ════════════════════════════════════════════════════════
  // V5 — ASPECTS TABLE (preserved)
  // ════════════════════════════════════════════════════════
  const ASPECTS = [
    { name:'युति',        eng:'Conjunction', deg:0,   orb:8, weight:1.0 },
    { name:'षष्ठांश',     eng:'Sextile',     deg:60,  orb:6, weight:0.5 },
    { name:'वर्ग',         eng:'Square',      deg:90,  orb:8, weight:0.8 },
    { name:'त्रिकोण',     eng:'Trine',       deg:120, orb:8, weight:1.0 },
    { name:'षड्भाग',      eng:'Quincunx',    deg:150, orb:4, weight:0.3 },
    { name:'प्रतियोगी',   eng:'Opposition',  deg:180, orb:8, weight:0.9 },
  ];

  // ── Aspect planet score table (V5 preserved) ─────────────
  const PLANET_SCORES = {
    Jupiter: { b:5,  m:-3 }, Venus:   { b:4, m:-2 },
    Moon:    { b:2,  m:-2 }, Mercury: { b:2, m:-2 },
    Sun:     { b:2,  m:-2 }, Mars:    { b:2, m:-4 },
    Saturn:  { b:2,  m:-5 }, Rahu:    { b:1, m:-4 },
    Ketu:    { b:1,  m:-3 }, Uranus:  { b:2, m:-3 },
    Neptune: { b:1,  m:-2 }, Pluto:   { b:1, m:-4 },
  };

  const BENEFICS  = ['Jupiter','Venus','Moon'];
  const MALEFICS  = ['Mars','Saturn','Rahu','Ketu','Pluto'];
  const GOOD_ASP  = ['Trine','Sextile'];
  const BAD_ASP   = ['Square','Opposition'];

  // ════════════════════════════════════════════════════════
  // V5 — CORE FUNCTIONS (preserved)
  // ════════════════════════════════════════════════════════
  function getAspect(l1, l2) {
    const N = getNatal();
    const d = Math.abs(N.n180(l2 - l1));
    for (const a of ASPECTS) {
      const diff = Math.abs(d - a.deg);
      if (diff <= a.orb) return { ...a, orb: diff, applying: diff < 1 };
    }
    return null;
  }

  function aspectScore(tEng, nEng, asp) {
    const sc = PLANET_SCORES[tEng] || { b:1, m:-1 };
    let score = 0;
    if (GOOD_ASP.includes(asp.eng)) {
      score = sc.b * asp.weight;
    } else if (BAD_ASP.includes(asp.eng)) {
      score = sc.m * asp.weight;
    } else if (asp.eng === 'Conjunction') {
      if (MALEFICS.includes(tEng) && MALEFICS.includes(nEng)) score = -5;
      else if (BENEFICS.includes(tEng) && BENEFICS.includes(nEng)) score = 5;
      else score = MALEFICS.includes(tEng) ? -3 : 2;
      score *= asp.weight;
    }
    return parseFloat(score.toFixed(2));
  }

  // ── V5: getTransitPlanets — V6 extended with outer planets ─
  function getTransitPlanets(jd, natal_d1, includeOuter = false) {
    const N = getNatal();
    const ayan      = N.lahiri(jd);
    const lagnaSign = natal_d1.lagnaSign;

    const mainPlanets = N.PLANETS_DEF.map(pd => {
      const tropLon   = N.getPlanetLon(pd.eng, jd);
      const sidLon    = N.n360(tropLon - ayan);
      const rashi     = Math.floor(sidLon / 30);
      const deg       = sidLon % 30;
      const nak       = Math.floor(sidLon / (360 / 27));
      const retro     = N.isRetro(pd.eng, jd);
      const transHouse = (rashi - lagnaSign + 12) % 12 + 1;
      const dignity   = N.getDignity(pd.eng, rashi);
      const speed     = N.n180(N.getPlanetLon(pd.eng, jd + 0.5) - N.getPlanetLon(pd.eng, jd - 0.5));
      return { ...pd, tropLon, sidLon, rashi, deg, nak, retro, transHouse, dignity, speed, jd };
    });

    if (!includeOuter) return mainPlanets;

    // V6: outer planets
    const outerPlanets = (N.OUTER_PLANETS_DEF || []).map(pd => {
      const tropLon   = N.getPlanetLon(pd.eng, jd);
      const sidLon    = N.n360(tropLon - ayan);
      const rashi     = Math.floor(sidLon / 30);
      const deg       = sidLon % 30;
      const nak       = Math.floor(sidLon / (360 / 27));
      const retro     = N.isRetro(pd.eng, jd);
      const transHouse = (rashi - lagnaSign + 12) % 12 + 1;
      const dignity   = N.getDignity(pd.eng, rashi);
      const speed     = N.n180(N.getPlanetLon(pd.eng, jd + 0.5) - N.getPlanetLon(pd.eng, jd - 0.5));
      return { ...pd, tropLon, sidLon, rashi, deg, nak, retro, transHouse, dignity, speed, jd, isOuter: true };
    });

    return [...mainPlanets, ...outerPlanets];
  }

  function getAspects(transitPlanets, natal_d1) {
    const aspects = [];
    transitPlanets.forEach(tp => {
      natal_d1.planets.forEach(np => {
        const asp = getAspect(tp.sidLon, np.sidLon);
        if (asp) {
          const sc = aspectScore(tp.eng, np.eng, asp);
          aspects.push({
            from     : tp.hi, fromEng: tp.eng, fromSym: tp.sym,
            to       : np.hi, toEng  : np.eng, toSym  : np.sym,
            aspect   : asp.name, aspectEng: asp.eng,
            orb      : parseFloat(asp.orb.toFixed(2)),
            applying : asp.applying,
            weight   : asp.weight,
            score    : sc,
            fromHouse: tp.transHouse,
            toHouse  : np.house,
            riskTag  : sc <= -4 ? 'CRASH_RISK' : sc <= -2 ? 'REVERSAL' : sc >= 4 ? 'SPIKE' : null,
          });
        }
      });
    });
    return aspects.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }

  function getTransitScore(aspects) {
    return parseFloat(aspects.reduce((s, a) => s + a.score, 0).toFixed(2));
  }

  // Moon speed deg/day
  function moonSpeed(jd) {
    const N = getNatal();
    return Math.abs(N.n180(N.getPlanetLon('Moon', jd + 0.5) - N.getPlanetLon('Moon', jd - 0.5)));
  }

  // V5 findExactTime (preserved)
  function findExactTime(p1Eng, p2Eng, targetDeg, jdStart, jdEnd) {
    const N = getNatal();
    let lo = jdStart, hi = jdEnd;
    for (let iter = 0; iter < 50; iter++) {
      const mid  = (lo + hi) / 2;
      const ayan = N.lahiri(mid);
      const l1   = N.n360(N.getPlanetLon(p1Eng, mid) - ayan);
      const l2   = N.n360(N.getPlanetLon(p2Eng, mid) - ayan);
      const diff = Math.abs(N.n180(l2 - l1)) - targetDeg;
      if (Math.abs(diff) < 0.01) return mid;
      if (diff < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ── Build full transit report (V5 preserved, V6 schema) ──
  function buildReport(dateIST, natal_d1, timeIST = '15:00') {
    const N  = getNatal();
    const [y, m, d] = dateIST.split('-').map(Number);
    const [lh, lm]  = (timeIST || '15:00').split(':').map(Number);

    const totalMin = lh * 60 + lm - 330;
    const utcDay   = Math.floor(totalMin / 1440);
    const utcMin   = ((totalMin % 1440) + 1440) % 1440;
    const utcDate  = new Date(Date.UTC(y, m - 1, d + utcDay, 0, utcMin));
    const jd = N.JD(
      utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(),
      utcDate.getUTCHours(), utcDate.getUTCMinutes()
    );

    const tPlanets = getTransitPlanets(jd, natal_d1);
    const aspects  = getAspects(tPlanets, natal_d1);
    const totalScore = getTransitScore(aspects);
    const mSpd     = moonSpeed(jd);

    // Panchang
    const ayan    = N.lahiri(jd);
    const sunSid  = N.n360(N.getPlanetLon('Sun',  jd) - ayan);
    const moonSid = N.n360(N.getPlanetLon('Moon', jd) - ayan);
    const lunarLon = N.n360(N.getPlanetLon('Moon', jd) - N.getPlanetLon('Sun', jd));
    const tithiNum = Math.floor(lunarLon / 12) + 1;
    const paksha   = lunarLon < 180 ? 'शुक्ल' : 'कृष्ण';
    const nakIdx   = Math.floor(moonSid / (360 / 27));

    const NAKSHATRAS_HI = [
      'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु',
      'पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी','उत्तर फाल्गुनी','हस्त',
      'चित्रा','स्वाति','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढ़ा',
      'उत्तराषाढ़ा','श्रवण','धनिष्ठा','शतभिषा','पूर्व भाद्रपद','उत्तर भाद्रपद','रेवती',
    ];
    const NAKSHATRAS_EN = [
      'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu',
      'Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta',
      'Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha',
      'Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
    ];

    const YOGAS_EN = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti',
      'Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata',
      'Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
    const YOGAS_HI = ['विष्कम्भ','प्रीति','आयुष्मान','सौभाग्य','शोभन','अतिगंड','सुकर्मा','धृति',
      'शूल','गंड','वृद्धि','ध्रुव','व्याघात','हर्षण','वज्र','सिद्धि','व्यतीपात',
      'वरीयान','परिघ','शिव','सिद्ध','साध्य','शुभ','शुक्ल','ब्रह्म','इंद्र','वैधृति'];
    const KARAN_HI = ['बव','बालव','कौलव','तैतिल','गर','वणिज','विष्टि','शकुनि','चतुष्पद','नाग'];
    const VAR_HI   = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];

    const yogaLon = N.n360(sunSid + moonSid);
    const yogaIdx = Math.floor(yogaLon / (360 / 27)) % 27;

    // Panchang score
    const GOOD_YOGA = ['Siddhi','Priti','Shubha','Sadhya','Dhruva','Harshana'];
    const BAD_YOGA  = ['Vishkambha','Vajra','Vyaghata','Parigha','Vaidhriti','Atiganda'];
    let panSc = 0;
    if (GOOD_YOGA.includes(YOGAS_EN[yogaIdx])) panSc += 2;
    if (BAD_YOGA.includes(YOGAS_EN[yogaIdx]))  panSc -= 2;
    if (paksha === 'शुक्ल') panSc += 1; else panSc -= 1;
    if ([8,14,0].includes(tithiNum % 15)) panSc -= 2;

    // Nakshatra market profile (basic — full profile in nakshatra_engine.js)
    const NAK_MARKET = {
      Rohini: 3, Pushya: 3, Dhanishtha: 3,
      Ardra: -2, Ashlesha: -2, Swati: -2, Jyeshtha: -3, Mula: -3,
    };
    panSc += NAK_MARKET[NAKSHATRAS_EN[nakIdx]] || 0;

    return {
      dateIST, timeIST, jd,
      planets    : tPlanets,
      aspects,
      totalScore,
      moonSpeed  : parseFloat(mSpd.toFixed(3)),
      moonDruta  : mSpd > 13,
      moonManda  : mSpd < 11,
      panchang: {
        tithi  : tithiNum,
        paksha,
        nakEn  : NAKSHATRAS_EN[nakIdx],
        nakHi  : NAKSHATRAS_HI[nakIdx],
        nakIdx,
        yogaEn : YOGAS_EN[yogaIdx],
        yogaHi : YOGAS_HI[yogaIdx],
        karanaHi: KARAN_HI[Math.floor(lunarLon / 6) % 11],
        varHi  : VAR_HI[Math.floor(jd + 1.5) % 7],
        score  : panSc,
      },
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getExactAspectTime — exact minute of aspect
  // ════════════════════════════════════════════════════════
  /**
   * Find the exact JD when planet1 makes a specific aspect to planet2
   * within a search window (±1 day around a given JD)
   *
   * @param {string} planet1 — transiting planet
   * @param {string} planet2 — natal or transiting planet
   * @param {number} jd — center JD to search around
   * @param {number} [searchDays=2] — window
   * @returns {{ jd, timeIST, aspectType, orb }|null}
   */
  function getExactAspectTime(planet1, planet2, jd, searchDays = 2) {
    try {
      const N   = getNatal();
      const ayan = N.lahiri(jd);
      const step = 0.01; // ~14 minutes
      const from = jd - searchDays / 2;
      const to   = jd + searchDays / 2;
      let best   = null, bestOrb = Infinity;

      for (let t = from; t <= to; t += step) {
        const ayanT = N.lahiri(t);
        const l1 = N.n360(N.getPlanetLon(planet1, t) - ayanT);
        const l2 = N.n360(N.getPlanetLon(planet2, t) - ayanT);
        const asp = getAspect(l1, l2);
        if (asp && asp.orb < bestOrb) {
          bestOrb = asp.orb;
          const ms  = (t - 2440587.5) * 86400000;
          const ist = new Date(ms + 5.5 * 3600000);
          const hh  = String(ist.getUTCHours()).padStart(2,'0');
          const mm  = String(ist.getUTCMinutes()).padStart(2,'0');
          best = {
            jd      : t,
            timeIST : `${hh}:${mm}`,
            aspectType: asp.eng,
            aspectHi  : asp.name,
            orb     : parseFloat(asp.orb.toFixed(3)),
            planet1, planet2,
          };
        }
      }
      return best;
    } catch (e) {
      console.error('[TRANSITS] getExactAspectTime error:', e);
      return null;
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getRetrogradePeriod — full retro window
  // ════════════════════════════════════════════════════════
  /**
   * Find all retrograde periods for a planet in a given year
   * @param {string} planet
   * @param {number} year — e.g. 2026
   * @returns {Array<{ retroStart, retroEnd, directDate, durationDays }>}
   */
  function getRetrogradePeriod(planet, year) {
    try {
      const N = getNatal();
      if (planet === 'Rahu' || planet === 'Ketu') {
        return [{ planet, alwaysRetro: true, hi: 'सदैव वक्री' }];
      }
      const periods = [];
      const fromJD = N.JD(year, 1, 1, 0, 0);
      const toJD   = N.JD(year, 12, 31, 0, 0);
      const step   = (planet === 'Mercury' || planet === 'Venus') ? 1 : 5;

      let prevRetro  = N.isRetro(planet, fromJD);
      let retroStart = null;

      for (let jd = fromJD + step; jd <= toJD; jd += step) {
        const nowRetro = N.isRetro(planet, jd);
        if (!prevRetro && nowRetro) {
          // Bisect for exact start
          let lo = jd - step, hi = jd;
          for (let iter = 0; iter < 20; iter++) {
            const mid = (lo + hi) / 2;
            if (N.isRetro(planet, mid)) hi = mid; else lo = mid;
          }
          retroStart = (lo + hi) / 2;
        } else if (prevRetro && !nowRetro && retroStart) {
          // Bisect for exact end
          let lo = jd - step, hi = jd;
          for (let iter = 0; iter < 20; iter++) {
            const mid = (lo + hi) / 2;
            if (N.isRetro(planet, mid)) lo = mid; else hi = mid;
          }
          const retroEnd  = (lo + hi) / 2;
          const durationDays = Math.round(retroEnd - retroStart);
          const toDate = d => new Date((d - 2440587.5) * 86400000).toISOString().split('T')[0];
          periods.push({
            planet,
            retroStart    : toDate(retroStart),
            retroEnd      : toDate(retroEnd),
            durationDays,
            hindiNote     : `${planet} ${toDate(retroStart)} से ${toDate(retroEnd)} तक वक्री (${durationDays} दिन)`,
          });
          retroStart = null;
        }
        prevRetro = nowRetro;
      }
      return periods;
    } catch (e) {
      console.error('[TRANSITS] getRetrogradePeriod error:', e);
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getGrahaYuddha — planet war detection
  // ════════════════════════════════════════════════════════
  /**
   * Graha Yuddha: two visible planets within 1° of each other
   * Only between: Mercury, Venus, Mars, Jupiter, Saturn
   * (Sun, Moon, Rahu, Ketu do NOT participate)
   *
   * Winner = higher latitude planet OR higher ecliptic longitude
   * Market effect: EXTREME VOLATILITY, direction unclear
   *
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {Object} [natal_d1] — NASDAQ D1 (to get positions)
   * @returns {{ active, pairs: Array<{ p1, p2, sep, winner, losserHi, hindiText }> }}
   */
  function getGrahaYuddha(dateStr, natal_d1) {
    try {
      const N   = getNatal();
      const d1  = natal_d1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd  = N.JD(y, m, d, 15, 0);
      const ayan = N.lahiri(jd);

      const VISIBLE = ['Mercury','Venus','Mars','Jupiter','Saturn'];
      const PLANET_HI = { Mercury:'बुध', Venus:'शुक्र', Mars:'मंगल', Jupiter:'बृहस्पति', Saturn:'शनि' };

      const positions = VISIBLE.map(p => ({
        eng : p,
        hi  : PLANET_HI[p],
        lon : N.n360(N.getPlanetLon(p, jd) - ayan),
      }));

      const ORB = 1.0; // degrees
      const pairs = [];

      for (let i = 0; i < positions.length - 1; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const p1 = positions[i], p2 = positions[j];
          const sep = Math.abs(N.n180(p2.lon - p1.lon));
          if (sep <= ORB) {
            // Winner = higher longitude (simplified Vedic rule)
            const winner = p1.lon > p2.lon ? p1.eng : p2.eng;
            const loser  = p1.lon > p2.lon ? p2.eng : p1.eng;
            pairs.push({
              p1: p1.eng, p1hi: p1.hi,
              p2: p2.eng, p2hi: p2.hi,
              sep: parseFloat(sep.toFixed(3)),
              winner, loser,
              loserHi: PLANET_HI[loser],
              hindiText: `ग्रह युद्ध: ${p1.hi}–${p2.hi} (${sep.toFixed(2)}°) — अत्यधिक उतार-चढ़ाव, ${PLANET_HI[loser]} कमज़ोर`,
            });
          }
        }
      }

      return {
        dateStr,
        active      : pairs.length > 0,
        pairs,
        marketNote  : pairs.length > 0
          ? 'ग्रह युद्ध सक्रिय — बाज़ार में तीव्र उतार-चढ़ाव संभव, दिशा अनिश्चित'
          : 'कोई ग्रह युद्ध नहीं',
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[TRANSITS] getGrahaYuddha error:', e);
      return { active: false, pairs: [], dateStr };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    ASPECTS,
    getAspect,
    aspectScore,
    getTransitPlanets,
    getAspects,
    getTransitScore,
    moonSpeed,
    findExactTime,
    buildReport,
    // V6 new
    getExactAspectTime,
    getRetrogradePeriod,
    getGrahaYuddha,
    PLANET_SCORES,
    BENEFICS,
    MALEFICS,
  };

})();

if (typeof module !== 'undefined') module.exports = TRANSITS;
if (typeof window !== 'undefined') window.TRANSITS = TRANSITS;

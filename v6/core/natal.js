/* ============================================================
   VedicAladdin V6 — core/natal.js
   Jean Meeus Astronomical Algorithms
   NASDAQ Birth: 08-02-1971, 10:00 AM EST, New York
   V5 fully preserved + V6 additions:
     uranusLon / neptuneLon / plutoLon (outer planets)
     getPlanetDignity  — full dignity table with moolatrikona
     getExactIngress   — when a planet enters next sign
     getStationaryPoints — when a planet goes direct/retro
     getParallelAspects  — declination-based parallels
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const NATAL = (function () {
  'use strict';

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  // ── Math helpers ────────────────────────────────────────
  function n360(a) { return ((a % 360) + 360) % 360; }
  function n180(a) { a = n360(a); return a > 180 ? a - 360 : a; }

  // ── Julian Day ───────────────────────────────────────────
  function JD(y, mo, d, h = 0, mi = 0) {
    if (mo <= 2) { y -= 1; mo += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) +
           Math.floor(30.6001 * (mo + 1)) + d + (h + mi / 60) / 24 + B - 1524.5;
  }

  // ── Lahiri Ayanamsha ─────────────────────────────────────
  function lahiri(jd) {
    const T = (jd - 2451545) / 36525;
    return 23.85844 + 0.013678 * T - 0.000030 * T * T;
  }

  // ════════════════════════════════════════════════════════
  // PLANET LONGITUDE FUNCTIONS — V5 PRESERVED
  // ════════════════════════════════════════════════════════

  function sunLon(jd) {
    const T = (jd - 2451545) / 36525;
    const L0 = n360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const M  = n360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const Mr = M * D2R;
    const C  = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
             + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
             + 0.000289 * Math.sin(3 * Mr);
    const om = 125.04 - 1934.136 * T;
    return n360(L0 + C - 0.00569 - 0.00478 * Math.sin(om * D2R));
  }

  function moonLon(jd) {
    const T   = (jd - 2451545) / 36525;
    const D   = n360(297.85036  + 445267.111480 * T - 0.0019142 * T * T);
    const M   = n360(357.52772  +  35999.050340 * T - 0.0001603 * T * T);
    const Mp  = n360(134.96298  + 477198.867398 * T + 0.0086972 * T * T);
    const F   = n360( 93.27191  + 483202.017538 * T - 0.0036825 * T * T);
    const Dr = D*D2R, Mr = M*D2R, Mpr = Mp*D2R, Fr = F*D2R;
    let L = n360(218.3165 + 481267.8813 * T);
    L += 6.28875*Math.sin(Mpr)  + 1.27402*Math.sin(2*Dr-Mpr) + 0.66008*Math.sin(2*Dr)
       + 0.21317*Math.sin(2*Mpr)- 0.18590*Math.sin(Mr)       - 0.11470*Math.sin(2*Fr)
       - 0.05592*Math.sin(2*Dr-2*Mpr) + 0.04736*Math.sin(2*Dr+Mpr)
       - 0.04684*Math.sin(2*Dr-Mr)    + 0.03402*Math.sin(2*Dr-Mp-Mr)
       + 0.02803*Math.sin(2*Dr+Mp)    - 0.02699*Math.sin(2*Dr-Mp)
       + 0.02348*Math.sin(Mp)         - 0.02084*Math.sin(2*Dr-2*Mp+Mr)
       - 0.01760*Math.sin(Mr+2*Fr)    - 0.01261*Math.sin(2*Dr+Mr)
       + 0.01230*Math.sin(2*Mpr-Mr)   - 0.01093*Math.sin(2*Dr-Mp+Mr)
       - 0.00880*Math.sin(2*Dr-2*Fr)  + 0.00772*Math.sin(Mpr-2*Fr);
    return n360(L);
  }

  function mercuryLon(jd) {
    const T  = (jd - 2451545) / 36525;
    const L  = 252.250906 + 149472.6746358 * T;
    const M  = n360(174.7948 + 4.09233 * ((jd - 2451545) / 365.25) * 360 / 0.2408467);
    const Mr = M * D2R;
    return n360(L + 23.44*Math.sin(Mr) + 2.9818*Math.sin(2*Mr) +
                0.5255*Math.sin(3*Mr)  + 0.1058*Math.sin(4*Mr));
  }

  function venusLon(jd) {
    const T  = (jd - 2451545) / 36525;
    const L  = 181.979801 + 58517.8156760 * T;
    const M  = n360(50.4161 + 1.60214 * (jd - 2451545) / 365.25 * 360 / 0.6151976);
    return n360(L + 0.7758*Math.sin(M*D2R) + 0.0033*Math.sin(2*M*D2R));
  }

  function marsLon(jd) {
    const T  = (jd - 2451545) / 36525;
    const L  = 355.433 + 19140.2993313 * T;
    const M  = n360(19.387 + 0.52402 * (jd - 2451545) / 365.25 * 360 / 1.8808476);
    const Mr = M * D2R;
    return n360(L + 10.6912*Math.sin(Mr) + 0.6228*Math.sin(2*Mr) + 0.0503*Math.sin(3*Mr));
  }

  function jupiterLon(jd) {
    const T  = (jd - 2451545) / 36525;
    const L  = 34.351519 + 3034.9056606 * T;
    const M  = n360(20.9 + 0.08309 * (jd - 2451545) / 365.25 * 360 / 11.8618);
    const Mr = M * D2R;
    return n360(L + 5.5549*Math.sin(Mr) + 0.1683*Math.sin(2*Mr) + 0.0071*Math.sin(3*Mr));
  }

  function saturnLon(jd) {
    const T  = (jd - 2451545) / 36525;
    const L  = 50.077444 + 1222.1138488 * T;
    const M  = n360(317.0 + 0.03344 * (jd - 2451545) / 365.25 * 360 / 29.4571);
    const Mr = M * D2R;
    return n360(L + 6.3585*Math.sin(Mr) + 0.2204*Math.sin(2*Mr) + 0.0106*Math.sin(3*Mr));
  }

  function rahuLon(jd) {
    const T   = (jd - 2451545) / 36525;
    const Om  = n360(125.0445479 - 1934.1362608 * T + 0.0020762 * T * T);
    const M   = n360(357.52772   +   35999.050340 * T);
    const corr = -1.4979 * Math.sin(2 * Om * D2R) - 0.1500 * Math.sin(M * D2R);
    return n360(Om + corr);
  }

  // ── V5 outer planets (uranusLon & neptuneLon) ────────────
  function uranusLon(jd) {
    const T = (jd - 2451545) / 36525;
    return n360(314.055005 + 428.4669983 * T);
  }

  function neptuneLon(jd) {
    const T = (jd - 2451545) / 36525;
    return n360(304.348665 + 218.4862002 * T);
  }

  // ── V6 NEW: Pluto (approximation sufficient for Vedic) ───
  function plutoLon(jd) {
    const T = (jd - 2451545) / 36525;
    // Mean longitude approximation (Meeus table 37.a)
    const L = n360(238.956785 + 144.9600002 * T);
    const M = n360(174.791086 + 145.1719322 * T);
    return n360(L + 28.3 * Math.sin(M * D2R));
  }

  // ── Planet dispatcher ─────────────────────────────────────
  function getPlanetLon(eng, jd) {
    switch (eng) {
      case 'Sun'    : return sunLon(jd);
      case 'Moon'   : return moonLon(jd);
      case 'Mercury': return mercuryLon(jd);
      case 'Venus'  : return venusLon(jd);
      case 'Mars'   : return marsLon(jd);
      case 'Jupiter': return jupiterLon(jd);
      case 'Saturn' : return saturnLon(jd);
      case 'Rahu'   : return rahuLon(jd);
      case 'Ketu'   : return n360(rahuLon(jd) + 180);
      case 'Uranus' : return uranusLon(jd);
      case 'Neptune': return neptuneLon(jd);
      case 'Pluto'  : return plutoLon(jd);
      default       : return 0;
    }
  }

  function isRetro(eng, jd) {
    if (eng === 'Rahu' || eng === 'Ketu') return true;
    return n180(getPlanetLon(eng, jd + 0.5) - getPlanetLon(eng, jd - 0.5)) < 0;
  }

  // ── V5 dignity table ─────────────────────────────────────
  function getDignity(eng, rashi) {
    const EX = { Sun:0, Moon:1, Mercury:5, Venus:11, Mars:9, Jupiter:3, Saturn:6, Rahu:1, Ketu:7 };
    const DB = { Sun:6, Moon:7, Mercury:11, Venus:5, Mars:3, Jupiter:9, Saturn:0 };
    const OW = {
      Sun:[4], Moon:[3], Mercury:[2,5], Venus:[1,6],
      Mars:[0,7], Jupiter:[8,11], Saturn:[9,10],
    };
    if (EX[eng] === rashi) return 'उच्च';
    if (DB[eng] === rashi) return 'नीच';
    if (OW[eng] && OW[eng].includes(rashi)) return 'स्वगृह';
    return '';
  }

  // ── V6 NEW: getPlanetDignity — full table with moolatrikona ─
  const MOOLATRIKONA = {
    Sun:     { sign: 4,  degrees: [0, 20] },   // Leo 0-20
    Moon:    { sign: 1,  degrees: [3, 30] },   // Taurus 3-30
    Mercury: { sign: 5,  degrees: [15, 20] },  // Virgo 15-20
    Venus:   { sign: 6,  degrees: [0, 15] },   // Libra 0-15
    Mars:    { sign: 0,  degrees: [0, 12] },   // Aries 0-12
    Jupiter: { sign: 8,  degrees: [0, 10] },   // Sagittarius 0-10
    Saturn:  { sign: 10, degrees: [0, 20] },   // Aquarius 0-20
  };

  /**
   * getPlanetDignity — extended dignity including moolatrikona
   * @param {string} planet English name
   * @param {number} sign   0-11
   * @param {number} [deg]  0-29.99 (for moolatrikona check)
   * @returns {{ dignity: string, score: number }}
   *   score: 100=exalt, 75=moolatrikona, 60=own, 25=neutral, 5=debilitated
   */
  function getPlanetDignity(planet, sign, deg) {
    const EX = { Sun:0, Moon:1, Mercury:5, Venus:11, Mars:9, Jupiter:3, Saturn:6, Rahu:1, Ketu:7 };
    const DB = { Sun:6, Moon:7, Mercury:11, Venus:5, Mars:3, Jupiter:9, Saturn:0 };
    const OW = {
      Sun:[4], Moon:[3], Mercury:[2,5], Venus:[1,6],
      Mars:[0,7], Jupiter:[8,11], Saturn:[9,10],
    };

    if (EX[planet] === sign) return { dignity: 'उच्च',        score: 100 };
    if (DB[planet] === sign) return { dignity: 'नीच',          score: 5   };

    // Moolatrikona check (if degree provided)
    const mt = MOOLATRIKONA[planet];
    if (mt && mt.sign === sign && deg !== undefined) {
      if (deg >= mt.degrees[0] && deg <= mt.degrees[1]) {
        return { dignity: 'मूलत्रिकोण', score: 75 };
      }
    }

    if (OW[planet] && OW[planet].includes(sign)) return { dignity: 'स्वगृह', score: 60 };
    return { dignity: '',         score: 25 };
  }

  function getPlanetStrength(eng, rashi, retro) {
    const d = getDignity(eng, rashi);
    let s = 50;
    if (d === 'उच्च')    s = 90;
    else if (d === 'स्वगृह') s = 75;
    else if (d === 'नीच')    s = 15;
    if (retro && eng !== 'Rahu' && eng !== 'Ketu') s = Math.max(10, s - 15);
    return s;
  }

  // ── V6 NEW: getExactIngress ──────────────────────────────
  /**
   * Find when a planet crosses to the next sign within a JD range
   * @param {string} planet
   * @param {number} fromJD
   * @param {number} toJD
   * @returns {{ jd: number, dateIST: string, fromSign: number, toSign: number }|null}
   */
  function getExactIngress(planet, fromJD, toJD) {
    try {
      const step = (planet === 'Moon') ? 0.05 : 0.5;
      const ayan = lahiri((fromJD + toJD) / 2);
      let prevSign = Math.floor(n360(getPlanetLon(planet, fromJD) - ayan) / 30);

      for (let jd = fromJD + step; jd <= toJD; jd += step) {
        const lon  = n360(getPlanetLon(planet, jd) - ayan);
        const sign = Math.floor(lon / 30);
        if (sign !== prevSign) {
          // Bisect for precision
          let lo = jd - step, hi = jd;
          for (let iter = 0; iter < 20; iter++) {
            const mid  = (lo + hi) / 2;
            const midSign = Math.floor(n360(getPlanetLon(planet, mid) - ayan) / 30);
            if (midSign === prevSign) lo = mid; else hi = mid;
          }
          const ingressJD = (lo + hi) / 2;
          const ms = (ingressJD - 2440587.5) * 86400000;
          const ist = new Date(ms + 5.5 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
          return { jd: ingressJD, dateIST: ist, fromSign: prevSign, toSign: sign };
        }
        prevSign = sign;
      }
      return null;
    } catch (e) {
      console.error('[NATAL] getExactIngress error:', e);
      return null;
    }
  }

  // ── V6 NEW: getStationaryPoints ──────────────────────────
  /**
   * Find when a planet goes stationary (speed < threshold)
   * @param {string} planet
   * @param {number} fromJD
   * @param {number} toJD
   * @returns {Array<{ jd, dateIST, type: 'retrograde'|'direct', speed }>}
   */
  function getStationaryPoints(planet, fromJD, toJD) {
    try {
      if (planet === 'Rahu' || planet === 'Ketu') return [];
      const step = 1;
      const results = [];
      let prevSpeed = null;

      for (let jd = fromJD; jd <= toJD; jd += step) {
        const speed = n180(getPlanetLon(planet, jd + 0.5) - getPlanetLon(planet, jd - 0.5));
        if (prevSpeed !== null) {
          // Sign change in speed = stationary point
          if (prevSpeed < 0 && speed >= 0) {
            // Going direct
            const ms = (jd - 2440587.5) * 86400000;
            const ist = new Date(ms + 5.5*3600000).toISOString().split('T')[0];
            results.push({ jd, dateIST: ist, type: 'direct', speed: Math.abs(speed) });
          } else if (prevSpeed > 0 && speed <= 0) {
            // Going retrograde
            const ms = (jd - 2440587.5) * 86400000;
            const ist = new Date(ms + 5.5*3600000).toISOString().split('T')[0];
            results.push({ jd, dateIST: ist, type: 'retrograde', speed: Math.abs(speed) });
          }
        }
        prevSpeed = speed;
      }
      return results;
    } catch (e) {
      console.error('[NATAL] getStationaryPoints error:', e);
      return [];
    }
  }

  // ── V6 NEW: getParallelAspects ───────────────────────────
  /**
   * Declination-based parallel aspects (within ±1°)
   * @param {Array} natalPlanets — natal planet array with .tropLon
   * @param {Array} transitPlanets — transit planet array with .tropLon
   * @returns {Array<{ natal, transit, decl1, decl2, isContraParallel }>}
   */
  function getDeclination(tropLon, jd) {
    // Approximate declination from ecliptic longitude
    const T   = (jd - 2451545) / 36525;
    const eps = 23.439291111 - 0.013004167 * T;  // obliquity
    return Math.asin(Math.sin(eps * D2R) * Math.sin(tropLon * D2R)) * R2D;
  }

  function getParallelAspects(natalPlanets, transitPlanets, jd) {
    const parallels = [];
    try {
      const ORB = 1.0;
      natalPlanets.forEach(np => {
        const nd = getDeclination(np.tropLon, jd - 365); // approximate natal JD
        transitPlanets.forEach(tp => {
          const td = getDeclination(tp.tropLon, jd);
          const diff  = Math.abs(nd - td);
          const cdiff = Math.abs(Math.abs(nd) - Math.abs(td));
          if (diff <= ORB) {
            parallels.push({
              natal: np.eng, transit: tp.eng,
              decl1: parseFloat(nd.toFixed(2)),
              decl2: parseFloat(td.toFixed(2)),
              isContraParallel: false,
              orb: parseFloat(diff.toFixed(3)),
            });
          } else if (cdiff <= ORB && ((nd > 0 && td < 0) || (nd < 0 && td > 0))) {
            parallels.push({
              natal: np.eng, transit: tp.eng,
              decl1: parseFloat(nd.toFixed(2)),
              decl2: parseFloat(td.toFixed(2)),
              isContraParallel: true,
              orb: parseFloat(cdiff.toFixed(3)),
            });
          }
        });
      });
    } catch (e) {
      console.error('[NATAL] getParallelAspects error:', e);
    }
    return parallels;
  }

  // ── Ascendant calculation ─────────────────────────────────
  function calcLagna(jd, lat, lon) {
    const T    = (jd - 2451545) / 36525;
    const GMST = n360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T);
    const LST  = n360(GMST + lon);
    const eps  = 23.439291111 - 0.013004167 * T;
    let asc = Math.atan2(
      Math.cos(LST * D2R),
      -(Math.sin(LST * D2R) * Math.cos(eps * D2R) + Math.tan(lat * D2R) * Math.sin(eps * D2R))
    );
    return n360(asc * R2D);
  }

  // ── Planet definitions ────────────────────────────────────
  const PLANETS_DEF = [
    { eng: 'Sun',     hi: 'सूर्य',      sym: '☉', nat: 'neutral' },
    { eng: 'Moon',    hi: 'चंद्र',      sym: '☽', nat: 'benefic' },
    { eng: 'Mercury', hi: 'बुध',        sym: '☿', nat: 'neutral' },
    { eng: 'Venus',   hi: 'शुक्र',      sym: '♀', nat: 'benefic' },
    { eng: 'Mars',    hi: 'मंगल',       sym: '♂', nat: 'malefic' },
    { eng: 'Jupiter', hi: 'बृहस्पति',   sym: '♃', nat: 'benefic' },
    { eng: 'Saturn',  hi: 'शनि',        sym: '♄', nat: 'malefic' },
    { eng: 'Rahu',    hi: 'राहु',       sym: '☊', nat: 'malefic' },
    { eng: 'Ketu',    hi: 'केतु',       sym: '☋', nat: 'malefic' },
  ];

  // V6: outer planets included separately (not in main 9)
  const OUTER_PLANETS_DEF = [
    { eng: 'Uranus',  hi: 'युरेनस',    sym: '⛢', nat: 'malefic' },
    { eng: 'Neptune', hi: 'नेप्च्यून', sym: '♆', nat: 'neutral' },
    { eng: 'Pluto',   hi: 'प्लूटो',    sym: '♇', nat: 'malefic' },
  ];

  const RASHI_LORDS = [
    'Mars','Venus','Mercury','Moon','Sun','Mercury',
    'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter',
  ];

  const RASHI_HI = [
    'मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
    'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन',
  ];

  // ── D1 builder ───────────────────────────────────────────
  const BHAVA_MKT = [2, 3, 1, 1, 5, -3, 2, -5, 4, 0, 5, -4];
  const BHAVA_SIG = [
    'बाज़ार खुलना','धन/आय','संचार/टेक','आधार/समर्थन',
    'सट्टा/Bull Run','सुधार/बाधा','साझेदारी/M&A','क्रैश/जोखिम',
    'विस्तार/भाग्य','नियामक','रैली/वॉल्यूम','हानि/गिरावट',
  ];

  function buildD1(birth) {
    const { year, month, day, hour, minute, lat, lon } = birth;
    const jd    = JD(year, month, day, hour, minute);
    const ayan  = lahiri(jd);
    const lagnaT   = calcLagna(jd, lat, lon);
    const lagnaSid = n360(lagnaT - ayan);
    const lagnaSign = Math.floor(lagnaSid / 30);

    const planets = PLANETS_DEF.map(pd => {
      const tropLon = getPlanetLon(pd.eng, jd);
      const sidLon  = n360(tropLon - ayan);
      const rashi   = Math.floor(sidLon / 30);
      const deg     = sidLon % 30;
      const nak     = Math.floor(sidLon / (360 / 27));
      const nakPada = Math.floor((sidLon % (360 / 27)) / (360 / 108)) + 1;
      const retro   = isRetro(pd.eng, jd);
      const dignity = getDignity(pd.eng, rashi);
      const strength = getPlanetStrength(pd.eng, rashi, retro);
      const house   = (rashi - lagnaSign + 12) % 12 + 1;
      return {
        ...pd, tropLon, sidLon, rashi, deg, nak, nakPada,
        retro, dignity, strength, house, jd,
      };
    });

    const houses = Array.from({ length: 12 }, (_, i) => {
      const sign = (lagnaSign + i) % 12;
      const lord = RASHI_LORDS[sign];
      const planetsHere = planets.filter(p => p.house === i + 1).map(p => p.sym);
      return { house: i + 1, sign, lord, planetsHere };
    });

    return {
      jd, ayan, lagnaSid, lagnaSign,
      lagnaHi: RASHI_HI[lagnaSign],
      planets, houses, birth,
      schemaVersion: "6.0",
    };
  }

  // ── 12-house activation analysis ─────────────────────────
  function analyze12Houses(d1, dasha, transits) {
    const activations = d1.houses.map((h, i) => {
      const natPlanets   = d1.planets.filter(p => p.house === i + 1);
      const transPlanets = (transits || []).filter(t => t.transHouse === i + 1);
      const mkt     = BHAVA_MKT[i];
      const lordPlanet  = d1.planets.find(p => p.eng === h.lord);
      const activated   = transPlanets.length > 0;
      const dashaPlanet = dasha ? d1.planets.find(p => p.eng === dasha.maha) : null;
      const dashaHere   = dashaPlanet && dashaPlanet.house === i + 1;
      const beneficCount = natPlanets.filter(p => p.nat === 'benefic').length;
      const maleficCount = natPlanets.filter(p => p.nat === 'malefic').length;
      const placementScore = beneficCount * 1.5 - maleficCount * 1.5;
      const lordScore = lordPlanet ? (lordPlanet.strength - 50) / 25 : 0;
      let score = mkt + placementScore + lordScore;
      if (activated) score += mkt * 0.5;
      if (dashaHere) score += mkt * 0.3;
      return {
        house: i + 1, sign: h.sign, lord: h.lord,
        signif: BHAVA_SIG[i], mktScore: mkt,
        placementScore: parseFloat(placementScore.toFixed(2)),
        lordStrength: lordPlanet?.strength || 0,
        lordScore: parseFloat(lordScore.toFixed(2)),
        activationScore: parseFloat(score.toFixed(2)),
        natalPlanets: natPlanets.map(p => ({ sym: p.sym, eng: p.eng, hi: p.hi })),
        transitPlanets: transPlanets.map(p => ({ sym: p.sym, eng: p.eng })),
        dashaActive: dashaHere, activated,
      };
    });

    const topBullish = activations.filter(a => a.mktScore > 0)
      .sort((a, b) => b.activationScore - a.activationScore)[0];
    const topBearish = activations.filter(a => a.mktScore < 0)
      .sort((a, b) => a.activationScore - b.activationScore)[0];

    return {
      activations, topBullish, topBearish,
      overallHouseScore: activations.reduce((s, a) => s + a.activationScore, 0),
    };
  }

  // ── NASDAQ natal chart ────────────────────────────────────
  const NASDAQ_BIRTH = {
    year:1971, month:2, day:8, hour:10, minute:0,
    lat:40.714, lon:-74.006, tz:-5,
  };

  // Cached natal chart (built once)
  let _nasdaqNatal = null;

  function getNasdaq() {
    if (!_nasdaqNatal) {
      const birth = (typeof CONFIG !== 'undefined' && CONFIG.NASDAQ_BIRTH)
                    ? CONFIG.NASDAQ_BIRTH : NASDAQ_BIRTH;
      _nasdaqNatal = buildD1(birth);
    }
    return _nasdaqNatal;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    JD, n360, n180, lahiri,
    getPlanetLon, isRetro, getDignity,
    getPlanetStrength, calcLagna,
    buildD1, analyze12Houses,
    getNasdaq, NASDAQ_BIRTH,
    PLANETS_DEF, OUTER_PLANETS_DEF,
    RASHI_LORDS, RASHI_HI,
    BHAVA_MKT, BHAVA_SIG,
    // V6 new
    plutoLon,
    getPlanetDignity,
    getExactIngress,
    getStationaryPoints,
    getParallelAspects,
    getDeclination,
    MOOLATRIKONA,
  };

})();

if (typeof module !== 'undefined') module.exports = NATAL;
if (typeof window !== 'undefined') window.NATAL = NATAL;

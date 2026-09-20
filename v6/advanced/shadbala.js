/* ============================================================
   VedicAladdin V6 — advanced/shadbala.js
   Shadbala: 6 Planetary Strengths in Rupas
   1. Sthana Bala (positional)
   2. Dik Bala (directional)
   3. Kala Bala (temporal)
   4. Chesta Bala (motional)
   5. Naisargika Bala (natural)
   6. Drik Bala (aspectual)
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const SHADBALA = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  // ── Minimum required Rupas (Parashari standard) ───────────
  const MIN_REQUIRED = {
    Sun: 5.0, Moon: 6.0, Mars: 5.0, Mercury: 7.0,
    Jupiter: 6.5, Venus: 5.5, Saturn: 5.0,
  };

  // ── Natural strength (fixed) ───────────────────────────────
  const NAISARGIKA = {
    Sun: 60, Moon: 51.43, Venus: 42.86, Jupiter: 34.29, Mercury: 25.71, Mars: 17.14, Saturn: 8.57,
  };

  const PLANET_HI = {
    Sun:'सूर्य', Moon:'चंद्र', Mars:'मंगल', Mercury:'बुध',
    Jupiter:'बृहस्पति', Venus:'शुक्र', Saturn:'शनि',
  };

  // ════════════════════════════════════════════════════════
  // 1. STHANA BALA — Positional strength
  // ════════════════════════════════════════════════════════
  function calcSthanaBala(planet, position) {
    // position: { rashi, deg, dignity, house }
    const { rashi, deg, dignity, house } = position || {};
    let bala = 0;

    // Uchcha Bala (exaltation strength)
    const EXALT_DEG = {
      Sun:10, Moon:3, Mars:28, Mercury:15, Jupiter:5, Venus:27, Saturn:20,
    };
    const DEBIL_SIGN = { Sun:6, Moon:7, Mars:3, Mercury:11, Jupiter:9, Venus:5, Saturn:0 };
    const EXALT_SIGN = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };
    if (rashi !== undefined && deg !== undefined) {
      const exaltSign = EXALT_SIGN[planet];
      const exaltDeg  = EXALT_DEG[planet] || 0;
      const debilSign = DEBIL_SIGN[planet];
      if (rashi === exaltSign) {
        const distFromExalt = Math.abs(deg - exaltDeg);
        bala += Math.max(0, 60 - distFromExalt * 2);
      } else if (rashi === debilSign) {
        bala -= 20;
      }
    }

    // Dignity bonus
    if (dignity === 'उच्च')         bala += 45;
    else if (dignity === 'मूलत्रिकोण') bala += 37.5;
    else if (dignity === 'स्वगृह')   bala += 30;

    // House strength bonus (kendras = strong)
    if ([1,4,7,10].includes(house)) bala += 15;
    else if ([2,5,8,11].includes(house)) bala += 8;

    return Math.max(0, parseFloat(bala.toFixed(2)));
  }

  // ════════════════════════════════════════════════════════
  // 2. DIK BALA — Directional strength
  // ════════════════════════════════════════════════════════
  const DIK_STRONG_HOUSE = {
    Jupiter:1, Mercury:1, Sun:10, Mars:10, Saturn:7, Venus:4, Moon:4,
  };

  function calcDikBala(planet, house) {
    const strongHouse = DIK_STRONG_HOUSE[planet];
    if (!strongHouse || !house) return 30;
    const dist = Math.abs(house - strongHouse);
    const circ = Math.min(dist, 12 - dist); // circular distance
    return parseFloat(Math.max(0, 60 - circ * 10).toFixed(2));
  }

  // ════════════════════════════════════════════════════════
  // 3. KALA BALA — Temporal strength
  // ════════════════════════════════════════════════════════
  function calcKalaBala(planet, jd) {
    try {
      const N = getNatal();
      let bala = 0;

      // Day/Night Bala
      const hourUTC  = ((jd % 1) + 0.5) * 24 % 24;
      const isDay    = hourUTC >= 6 && hourUTC < 18;
      const dayPlanets  = ['Sun','Jupiter','Venus'];
      const nightPlanets = ['Moon','Mars','Saturn'];
      if (isDay && dayPlanets.includes(planet)) bala += 30;
      if (!isDay && nightPlanets.includes(planet)) bala += 30;
      if (planet === 'Mercury') bala += 15; // Mercury always gets half

      // Paksha Bala (lunar phase)
      const ayan    = N.lahiri(jd);
      const moonSid = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const sunSid  = N.n360(N.getPlanetLon('Sun',  jd) - ayan);
      const lunarLon = N.n360(moonSid - sunSid);
      const isShukla = lunarLon < 180;
      if (isShukla && ['Moon','Venus','Jupiter','Mercury'].includes(planet)) bala += 15;
      if (!isShukla && ['Sun','Mars','Saturn'].includes(planet)) bala += 15;

      // Hora Bala (hour of day)
      const dow = Math.floor(jd + 1.5) % 7;
      const horaLords = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
      const dayLord   = horaLords[dow];
      const horaIdx   = Math.floor(hourUTC) % 7;
      const horaLord  = horaLords[(horaLords.indexOf(dayLord) + horaIdx) % 7];
      if (horaLord === planet) bala += 10;

      return Math.max(0, parseFloat(bala.toFixed(2)));
    } catch (e) {
      return 20;
    }
  }

  // ════════════════════════════════════════════════════════
  // 4. CHESTA BALA — Motional strength
  // ════════════════════════════════════════════════════════
  function calcChestaBala(planet, jd) {
    try {
      const N = getNatal();
      if (planet === 'Sun' || planet === 'Moon') return 30; // always direct
      const speed = N.n180(N.getPlanetLon(planet, jd + 0.5) - N.getPlanetLon(planet, jd - 0.5));
      if (speed < 0) return 15;  // retrograde = low chesta bala
      // Speed compared to mean motion
      const MEAN_SPEED = { Mars:0.524, Mercury:1.383, Jupiter:0.083, Venus:1.2, Saturn:0.033 };
      const mean = MEAN_SPEED[planet] || 0.5;
      const ratio = Math.abs(speed) / mean;
      if (ratio >= 1) return Math.min(60, 30 + ratio * 15);
      return Math.max(0, ratio * 30);
    } catch (e) {
      return 20;
    }
  }

  // ════════════════════════════════════════════════════════
  // 5. NAISARGIKA BALA — Natural strength (fixed)
  // ════════════════════════════════════════════════════════
  function calcNaisargikaBala(planet) {
    return NAISARGIKA[planet] || 25;
  }

  // ════════════════════════════════════════════════════════
  // 6. DRIK BALA — Aspectual strength
  // ════════════════════════════════════════════════════════
  function calcDrikBala(planet, allPlanets) {
    try {
      const N = getNatal();
      let bala = 0;
      const targetPlanet = allPlanets.find(p => p.eng === planet);
      if (!targetPlanet) return 0;

      allPlanets.forEach(p => {
        if (p.eng === planet) return;
        const diff = Math.abs(N.n180(targetPlanet.sidLon - p.sidLon));
        const isBenefic = ['Jupiter','Venus','Moon'].includes(p.eng);
        const isMalefic = ['Mars','Saturn','Rahu','Ketu'].includes(p.eng);

        if (diff < 8)  { bala += isBenefic ? 15 : isMalefic ? -15 : 0; }   // conjunction
        if (Math.abs(diff - 120) < 8) { bala += isBenefic ? 10 : isMalefic ? -10 : 0; } // trine
        if (Math.abs(diff - 180) < 8) { bala += isBenefic ? 8  : isMalefic ? -8  : 0; } // opposition
        if (Math.abs(diff - 90) < 8)  { bala += isBenefic ? 5  : isMalefic ? -5  : 0; } // square
      });

      return parseFloat(Math.max(-30, Math.min(30, bala)).toFixed(2));
    } catch (e) {
      return 0;
    }
  }

  // ════════════════════════════════════════════════════════
  // calcTotalShadbala — sum of all 6 balas
  // ════════════════════════════════════════════════════════
  function calcTotalShadbala(planet, position, jd, allPlanets) {
    const sthana   = calcSthanaBala(planet, position);
    const dik      = calcDikBala(planet, position?.house);
    const kala     = calcKalaBala(planet, jd);
    const chesta   = calcChestaBala(planet, jd);
    const naisargika = calcNaisargikaBala(planet);
    const drik     = calcDrikBala(planet, allPlanets || []);
    const total    = sthana + dik + kala + chesta + naisargika + drik;
    return {
      sthana, dik, kala, chesta, naisargika, drik,
      total: parseFloat(total.toFixed(2)),
    };
  }

  // ════════════════════════════════════════════════════════
  // isAboveMinimum
  // ════════════════════════════════════════════════════════
  function isAboveMinimum(planet, shadabala) {
    const min = MIN_REQUIRED[planet] * 10; // convert to same scale
    return (shadabala?.total || 0) >= min;
  }

  // ════════════════════════════════════════════════════════
  // interpretForMarket — Hindi market interpretation
  // ════════════════════════════════════════════════════════
  function interpretForMarket(shadabalaMap) {
    const lines = [];
    Object.entries(shadabalaMap).forEach(([planet, data]) => {
      const hi   = PLANET_HI[planet] || planet;
      const pct  = Math.round((data.total / 200) * 100);
      const tag  = pct >= 70 ? 'मजबूत' : pct >= 40 ? 'सामान्य' : 'कमज़ोर';
      lines.push(`${hi}: ${data.total.toFixed(0)} (${tag})`);
    });
    return lines.join(' | ');
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate — full shadbala for all 7 planets
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N    = getNatal();
      const d1   = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const ayan = N.lahiri(jd);

      // Get transit positions
      const tPlanets = d1.planets.map(p => {
        const lon  = N.n360(N.getPlanetLon(p.eng, jd) - ayan);
        const rashi = Math.floor(lon / 30);
        const deg   = lon % 30;
        const house = (rashi - d1.lagnaSign + 12) % 12 + 1;
        const dignity = N.getDignity(p.eng, rashi);
        return { ...p, rashi, deg, house, dignity, sidLon: lon };
      }).filter(p => ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(p.eng));

      const shadabalaMap = {};
      let totalStrong = 0;

      tPlanets.forEach(p => {
        const sb = calcTotalShadbala(p.eng, p, jd, tPlanets);
        const above = isAboveMinimum(p.eng, sb);
        if (above) totalStrong++;
        shadabalaMap[p.eng] = {
          ...sb,
          isAboveMin: above,
          hi        : PLANET_HI[p.eng],
        };
      });

      const overallScore = totalStrong >= 5 ? 3 : totalStrong >= 3 ? 1 : -2;

      return {
        shadabalaMap,
        totalStrong,
        overallScore,
        hindiSummary: `षड्बल: ${totalStrong}/7 ग्रह पर्याप्त शक्तिशाली — ${interpretForMarket(shadabalaMap)}`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[SHADBALA] analyzeForDate error:', e);
      return { shadabalaMap: {}, totalStrong: 0, overallScore: 0, hindiSummary: '' };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    calcSthanaBala, calcDikBala, calcKalaBala,
    calcChestaBala, calcNaisargikaBala, calcDrikBala,
    calcTotalShadbala, isAboveMinimum,
    interpretForMarket, analyzeForDate,
    MIN_REQUIRED, NAISARGIKA, PLANET_HI,
  };

})();

if (typeof module !== 'undefined') module.exports = SHADBALA;
if (typeof window !== 'undefined') window.SHADBALA = SHADBALA;

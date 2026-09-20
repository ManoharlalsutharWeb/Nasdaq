/* ============================================================
   VedicAladdin V6 — core/events.js
   Pinpoint Events: conjunctions, ingress, eclipses
   V5 fully preserved + V6 additions:
     getEclipseList       — all eclipses in a year with shadow window
     isInEclipseShadow    — within 15 days of eclipse
     getGandantaPoints    — nakshatra/rashi junction stress
     getVargottamaPlanets — same sign in D1 and D9
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const EVENTS = (function () {
  'use strict';

  function getNatal()   { return typeof NATAL    !== 'undefined' ? NATAL    : require('./natal');    }
  function getTransits(){ return typeof TRANSITS !== 'undefined' ? TRANSITS : require('./transits'); }

  // ════════════════════════════════════════════════════════
  // V5 HELPERS (preserved)
  // ════════════════════════════════════════════════════════
  function jdToIST(jd) {
    const ms  = (jd - 2440587.5) * 86400000;
    const ist = new Date(ms + 5.5 * 3600000);
    return ist.toISOString().replace('T', ' ').substring(0, 16) + ' IST';
  }

  function jdToISTDate(jd) {
    const ms = (jd - 2440587.5) * 86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  function getSeverity(score, riskTags) {
    if (Math.abs(score) >= 4 || (riskTags && riskTags.includes('CRASH_RISK'))) return 'P1';
    if (Math.abs(score) >= 2) return 'P2';
    return 'P3';
  }

  function makeEventWindow(label, peakJD, halfWidthDays, severity, tags, notes) {
    return {
      label,
      startIST : jdToIST(peakJD - halfWidthDays),
      peakIST  : jdToIST(peakJD),
      endIST   : jdToIST(peakJD + halfWidthDays),
      startDate: jdToISTDate(peakJD - halfWidthDays),
      peakDate : jdToISTDate(peakJD),
      endDate  : jdToISTDate(peakJD + halfWidthDays),
      severity, tags, notes: notes || [],
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — INGRESS DETECTION (preserved)
  // ════════════════════════════════════════════════════════
  const RASHIS_HI = [
    'मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
    'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन',
  ];

  function detectIngress(eng, fromJD, toJD, natalD1) {
    const N = getNatal();
    const events = [];
    const step = (eng === 'Moon') ? 0.1 : 0.5;
    let prevRashi = -1;

    for (let jd = fromJD; jd <= toJD; jd += step) {
      const ayan  = N.lahiri(jd);
      const lon   = N.n360(N.getPlanetLon(eng, jd) - ayan);
      const rashi = Math.floor(lon / 30);

      if (prevRashi >= 0 && rashi !== prevRashi) {
        let lo = jd - step, hi = jd;
        for (let i = 0; i < 30; i++) {
          const mid = (lo + hi) / 2;
          const ay  = N.lahiri(mid);
          const r   = Math.floor(N.n360(N.getPlanetLon(eng, mid) - ay) / 30);
          if (r !== prevRashi) hi = mid; else lo = mid;
        }
        const exactJD  = (lo + hi) / 2;
        const slowP    = ['Jupiter','Saturn','Rahu','Ketu','Uranus','Neptune','Pluto'];
        const isSlow   = slowP.includes(eng);
        const sev      = isSlow ? 'P1' : 'P2';
        const tags     = isSlow ? ['REVERSAL','SPIKE'] : ['REVERSAL'];
        const rashiHi  = RASHIS_HI[rashi] || `राशि-${rashi}`;
        events.push({
          type     : 'INGRESS', eng,
          toRashi  : rashi, toRashiHi: rashiHi,
          exactJD,
          peakDate : jdToISTDate(exactJD),
          window   : makeEventWindow(`${eng}→${rashiHi} प्रवेश`, exactJD, isSlow ? 3 : 1, sev, tags,
            [`${eng} ${rashiHi} में प्रवेश — बाज़ार में बदलाव संभव`]),
          score    : isSlow ? -3 : -1,
          evidence : [`${eng} sign change ${prevRashi}→${rashi} at JD ${exactJD.toFixed(2)}`],
        });
        prevRashi = rashi;
      } else if (prevRashi < 0) {
        prevRashi = rashi;
      }
    }
    return events;
  }

  // ════════════════════════════════════════════════════════
  // V5 — CONJUNCTION DETECTION (preserved)
  // ════════════════════════════════════════════════════════
  function detectConjunctions(transitPlanets, natalD1) {
    const N = getNatal();
    const events = [];

    for (let i = 0; i < transitPlanets.length; i++) {
      for (let j = i + 1; j < transitPlanets.length; j++) {
        const tp   = transitPlanets[i];
        const np   = transitPlanets[j];
        const diff = Math.abs(N.n180(tp.sidLon - np.sidLon));
        if (diff <= 8) {
          const isMal = ['Mars','Saturn','Rahu','Ketu','Pluto'].includes(tp.eng) ||
                        ['Mars','Saturn','Rahu','Ketu','Pluto'].includes(np.eng);
          const sc   = isMal ? -4 : 4;
          const tags = isMal ? ['CRASH_RISK','REVERSAL'] : ['SPIKE'];
          events.push({
            type      : 'CONJUNCTION',
            planets   : [tp.eng, np.eng],
            planetHi  : [tp.hi,  np.hi],
            orb       : parseFloat(diff.toFixed(2)),
            score     : sc,
            window    : makeEventWindow(
              `${tp.hi}-${np.hi} युति`, tp.jd, 2,
              getSeverity(sc, tags), tags,
              [`${tp.hi} और ${np.hi} ${diff.toFixed(1)}° — ${isMal ? 'अत्यधिक अस्थिरता!' : 'शुभ संयोग'}`]
            ),
            evidence: [`Conjunction orb=${diff.toFixed(2)}° malefic=${isMal}`],
          });
        }
      }
    }
    return events;
  }

  // ════════════════════════════════════════════════════════
  // V5 — ECLIPSE DETECTION (preserved)
  // ════════════════════════════════════════════════════════
  function detectEclipse(jd, natalD1) {
    const N = getNatal();
    const ayan = N.lahiri(jd);
    const moonSid = N.n360(N.getPlanetLon('Moon', jd) - ayan);
    const sunSid  = N.n360(N.getPlanetLon('Sun',  jd) - ayan);
    const rahuSid = N.n360(N.getPlanetLon('Rahu', jd) - ayan);
    const lunarLon = N.n360(moonSid - sunSid);
    const distMoonRahu = Math.abs(N.n180(moonSid - rahuSid));
    const events = [];

    // Solar eclipse
    if (lunarLon < 5 || lunarLon > 355) {
      if (distMoonRahu < 18) {
        events.push({
          type  : 'SOLAR_ECLIPSE', score: -5,
          window: makeEventWindow('सूर्य ग्रहण संभव', jd, 5, 'P1',
            ['CRASH_RISK','REVERSAL'],
            ['सूर्य ग्रहण — बड़ी अस्थिरता, क्रैश रिस्क उच्च']),
          evidence: [`NewMoon lunarLon=${lunarLon.toFixed(1)}, distRahu=${distMoonRahu.toFixed(1)}`],
        });
      }
    }

    // Lunar eclipse
    if (Math.abs(lunarLon - 180) < 5) {
      if (distMoonRahu < 12) {
        events.push({
          type  : 'LUNAR_ECLIPSE', score: -3,
          window: makeEventWindow('चंद्र ग्रहण संभव', jd, 3, 'P1',
            ['REVERSAL','WHIPSAW'],
            ['चंद्र ग्रहण — बाज़ार में उथल-पुथल']),
          evidence: [`FullMoon lunarLon=${lunarLon.toFixed(1)}, distRahu=${distMoonRahu.toFixed(1)}`],
        });
      }
    }
    return events;
  }

  function scoreImpact(event, natalD1, dasha) {
    let base = event.score || 0;
    if (event.planets && dasha && event.planets.includes(dasha.maha)) base *= 1.5;
    if (event.type && event.type.includes('ECLIPSE')) base *= 1.3;
    return parseFloat(base.toFixed(2));
  }

  // ════════════════════════════════════════════════════════
  // V5 — BUILD ALL EVENTS (preserved, schema → 6.0)
  // ════════════════════════════════════════════════════════
  function buildAstroEvents(dateIST, natalD1, dasha) {
    const N = getNatal();
    const T = getTransits();
    const [y, m, d] = dateIST.split('-').map(Number);
    const jd = N.JD(y, m, d, 15, 0);

    const report    = T.buildReport(dateIST, natalD1);
    const tPlanets  = report.planets;

    const conjEvents    = detectConjunctions(tPlanets, natalD1);
    const eclipseEvents = detectEclipse(jd, natalD1);
    const ingressEvents = [];
    ['Sun','Moon','Mercury','Venus','Mars'].forEach(eng => {
      ingressEvents.push(...detectIngress(eng, jd, jd + 7, natalD1));
    });

    const allEvents = [...conjEvents, ...eclipseEvents, ...ingressEvents];
    allEvents.sort((a, b) => {
      const sv = { P1:0, P2:1, P3:2 };
      return (sv[a.window?.severity || 'P3'] || 0) - (sv[b.window?.severity || 'P3'] || 0);
    });

    const totalImpact = allEvents.reduce((s, e) => s + (e.score || 0), 0);
    const riskTags    = [...new Set(allEvents.flatMap(e => e.window?.tags || []))];

    return {
      moduleId         : 'events',
      dateIST,
      events           : allEvents,
      totalImpact      : parseFloat(totalImpact.toFixed(2)),
      relevanceScore   : Math.min(100, 40 + allEvents.length * 10),
      directionHint    : totalImpact > 2 ? 'BULL' : totalImpact < -2 ? 'BEAR' : 'NEUT',
      confidenceImpact : totalImpact * 3,
      riskTags,
      timeWindows      : allEvents.map(e => e.window).filter(Boolean),
      explanations     : allEvents.map(e => e.window?.notes?.[0]).filter(Boolean),
      evidence         : allEvents.map(e => e.evidence?.[0]).filter(Boolean),
      schemaVersion    : "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getEclipseList — all eclipses in a year
  // ════════════════════════════════════════════════════════
  /**
   * Scan an entire year for solar and lunar eclipses
   * (New Moon near Rahu/Ketu = solar; Full Moon near node = lunar)
   * @param {number} year
   * @returns {Array<{ type, date, jd, axis, shadowStart, shadowEnd, hindiText }>}
   */
  function getEclipseList(year) {
    const N = getNatal();
    const fromJD = N.JD(year, 1,  1, 0, 0);
    const toJD   = N.JD(year, 12, 31, 0, 0);
    const eclipses = [];
    const SHADOW_DAYS = 15;

    for (let jd = fromJD; jd <= toJD; jd += 0.5) {
      const ayan     = N.lahiri(jd);
      const moonSid  = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const sunSid   = N.n360(N.getPlanetLon('Sun',  jd) - ayan);
      const rahuSid  = N.n360(N.getPlanetLon('Rahu', jd) - ayan);
      const lunarLon = N.n360(moonSid - sunSid);
      const distNode = Math.min(
        Math.abs(N.n180(moonSid - rahuSid)),
        Math.abs(N.n180(moonSid - N.n360(rahuSid + 180)))
      );

      let eclipseType = null;

      if ((lunarLon < 4 || lunarLon > 356) && distNode < 18) {
        eclipseType = 'SOLAR';
      } else if (Math.abs(lunarLon - 180) < 4 && distNode < 12) {
        eclipseType = 'LUNAR';
      }

      if (eclipseType) {
        // Avoid duplicates within 10 days
        const lastEcl = eclipses[eclipses.length - 1];
        if (lastEcl && Math.abs(jd - lastEcl.jd) < 10) continue;

        const dateStr   = jdToISTDate(jd);
        const axisSign1 = Math.floor(moonSid / 30);
        const axisSign2 = (axisSign1 + 6) % 12;

        eclipses.push({
          type        : eclipseType,
          date        : dateStr,
          jd,
          axis        : { sign1: axisSign1, sign2: axisSign2,
                          hi1: RASHIS_HI[axisSign1], hi2: RASHIS_HI[axisSign2] },
          magnitude   : parseFloat(distNode.toFixed(2)),
          shadowStart : jdToISTDate(jd - SHADOW_DAYS),
          shadowEnd   : jdToISTDate(jd + SHADOW_DAYS),
          hindiText   : `${eclipseType === 'SOLAR' ? 'सूर्य' : 'चंद्र'} ग्रहण — ${dateStr} — ${RASHIS_HI[axisSign1]}-${RASHIS_HI[axisSign2]} अक्ष`,
          schemaVersion: "6.0",
        });
      }
    }
    return eclipses;
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: isInEclipseShadow — within 15 days
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {Array} [eclipseList] — pre-computed list (optional, will auto-compute)
   * @returns {{ inShadow, daysToNearest, type, eclipseDate }}
   */
  function isInEclipseShadow(dateStr, eclipseList) {
    try {
      const N   = getNatal();
      const jd  = N.JD(...dateStr.split('-').map(Number), 15, 0);
      const year = parseInt(dateStr.split('-')[0]);
      const list = eclipseList || [
        ...getEclipseList(year - 1),
        ...getEclipseList(year),
        ...getEclipseList(year + 1),
      ];
      const SHADOW = 15;
      let nearest = null, minDays = Infinity;

      list.forEach(ecl => {
        const days = Math.abs(jd - ecl.jd);
        if (days < minDays) { minDays = days; nearest = ecl; }
      });

      if (!nearest) return { inShadow: false, daysToNearest: 999, type: null };

      return {
        inShadow       : minDays <= SHADOW,
        daysToNearest  : parseFloat(minDays.toFixed(1)),
        type           : nearest.type,
        eclipseDate    : nearest.date,
        hindiText      : minDays <= SHADOW
          ? `${nearest.type === 'SOLAR' ? 'सूर्य' : 'चंद्र'} ग्रहण से ${Math.round(minDays)} दिन — उन्नत अस्थिरता`
          : `निकटतम ग्रहण ${Math.round(minDays)} दिन दूर`,
      };
    } catch (e) {
      return { inShadow: false, daysToNearest: 999, type: null };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getGandantaPoints — nakshatra/rashi junction stress
  // ════════════════════════════════════════════════════════
  /**
   * Gandanta: junction of water→fire signs (Cancer-Leo, Scorpio-Sagittarius, Pisces-Aries)
   * These are the last 3°20' of water sign + first 3°20' of fire sign
   * When Moon transits through Gandanta = high stress / reversal
   *
   * @param {string} dateStr
   * @returns {{ inGandanta, sign, nakshatra, severity, hindiText }}
   */
  const GANDANTA_ZONES = [
    { waterSign: 3,  fireSign: 4,  label: 'कर्क-सिंह गंडांत' },    // Cancer → Leo
    { waterSign: 7,  fireSign: 8,  label: 'वृश्चिक-धनु गंडांत' },  // Scorpio → Sag
    { waterSign: 11, fireSign: 0,  label: 'मीन-मेष गंडांत' },      // Pisces → Aries
  ];

  function getGandantaPoints(dateStr, natalD1) {
    try {
      const N    = getNatal();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const ayan = N.lahiri(jd);
      const moonSid = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const moonSign = Math.floor(moonSid / 30);
      const moonDeg  = moonSid % 30;
      const GANDANTA_DEG = 3.333; // 3°20'

      for (const zone of GANDANTA_ZONES) {
        // Last 3°20' of water sign
        if (moonSign === zone.waterSign && moonDeg >= (30 - GANDANTA_DEG)) {
          return {
            inGandanta: true,
            sign      : moonSign,
            nakshatra : Math.floor(moonSid / (360 / 27)),
            severity  : 'HIGH',
            hindiText : `चंद्र ${zone.label} में — जल राशि अंत — उच्च अस्थिरता, तनाव`,
            schemaVersion: "6.0",
          };
        }
        // First 3°20' of fire sign
        if (moonSign === zone.fireSign && moonDeg <= GANDANTA_DEG) {
          return {
            inGandanta: true,
            sign      : moonSign,
            nakshatra : Math.floor(moonSid / (360 / 27)),
            severity  : 'HIGH',
            hindiText : `चंद्र ${zone.label} में — अग्नि राशि प्रारंभ — उच्च अस्थिरता, संकट`,
            schemaVersion: "6.0",
          };
        }
      }
      return { inGandanta: false, severity: 'LOW', hindiText: 'कोई गंडांत नहीं', schemaVersion: "6.0" };
    } catch (e) {
      return { inGandanta: false, severity: 'LOW', hindiText: 'गंडांत जाँच विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getVargottamaPlanets — same sign in D1 and D9
  // ════════════════════════════════════════════════════════
  /**
   * A planet in the same sign in D1 and D9 = Vargottama
   * Vargottama = extra stability and strength
   * @param {Object} natalD1 — NATAL.buildD1() result
   * @returns {Array<{ eng, hi, sign, signHi, strength }>}
   */
  function getVargottamaPlanets(natalD1) {
    try {
      const VARGA_REF = typeof VARGA !== 'undefined' ? VARGA : require('./varga');
      const d9 = VARGA_REF.getChart(natalD1, 9);
      const vargottama = [];

      natalD1.planets.forEach(p => {
        const d9Planet = d9.planets.find(dp => dp.eng === p.eng);
        if (d9Planet && p.rashi === d9Planet.vargaSign) {
          vargottama.push({
            eng    : p.eng,
            hi     : p.hi,
            sign   : p.rashi,
            signHi : RASHIS_HI[p.rashi] || `राशि-${p.rashi}`,
            strength: p.strength,
            hindiText: `${p.hi} वर्गोत्तम (D1 और D9 दोनों में ${RASHIS_HI[p.rashi]}) — अत्यंत मजबूत`,
          });
        }
      });
      return vargottama;
    } catch (e) {
      return [];
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    jdToIST,
    jdToISTDate,
    getSeverity,
    makeEventWindow,
    detectIngress,
    detectConjunctions,
    detectEclipse,
    scoreImpact,
    buildAstroEvents,
    RASHIS_HI,
    // V6 new
    getEclipseList,
    isInEclipseShadow,
    getGandantaPoints,
    getVargottamaPlanets,
    GANDANTA_ZONES,
  };

})();

if (typeof module !== 'undefined') module.exports = EVENTS;
if (typeof window !== 'undefined') window.EVENTS = EVENTS;

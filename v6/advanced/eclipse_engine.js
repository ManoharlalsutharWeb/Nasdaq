/* ============================================================
   VedicAladdin V6 — advanced/eclipse_engine.js
   Eclipse Detection, Impact on NASDAQ natal, Shadow Windows
   Market rule: Within 15 days of eclipse = elevated volatility
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const ECLIPSE_ENGINE = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  const SHADOW_DAYS = 15;

  const RASHI_HI = [
    'मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
    'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन',
  ];

  function jdToISO(jd) {
    return new Date((jd - 2440587.5) * 86400000).toISOString().split('T')[0];
  }

  // ════════════════════════════════════════════════════════
  // getEclipses — all solar + lunar in a year
  // ════════════════════════════════════════════════════════
  function getEclipses(year) {
    const N = getNatal();
    const fromJD = N.JD(year, 1, 1, 0, 0);
    const toJD   = N.JD(year, 12, 31, 0, 0);
    const eclipses = [];

    for (let jd = fromJD; jd <= toJD; jd += 0.5) {
      const ayan     = N.lahiri(jd);
      const moonSid  = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const sunSid   = N.n360(N.getPlanetLon('Sun',  jd) - ayan);
      const rahuSid  = N.n360(N.getPlanetLon('Rahu', jd) - ayan);
      const lunarLon = N.n360(moonSid - sunSid);

      const distRahu = Math.abs(N.n180(moonSid - rahuSid));
      const distKetu = Math.abs(N.n180(moonSid - N.n360(rahuSid + 180)));
      const distNode = Math.min(distRahu, distKetu);

      let type = null;
      if ((lunarLon < 4 || lunarLon > 356) && distNode < 18) type = 'SOLAR';
      else if (Math.abs(lunarLon - 180) < 4 && distNode < 12)  type = 'LUNAR';

      if (type) {
        const last = eclipses[eclipses.length - 1];
        if (last && Math.abs(jd - last.jd) < 10) continue;

        const axisSign1 = Math.floor(moonSid / 30);
        const axisSign2 = (axisSign1 + 6) % 12;
        const magnitude = parseFloat(distNode.toFixed(2));

        eclipses.push({
          type, year,
          date       : jdToISO(jd),
          jd,
          axis       : { sign1: axisSign1, sign2: axisSign2,
                         hi1: RASHI_HI[axisSign1], hi2: RASHI_HI[axisSign2] },
          magnitude,
          shadowStart: jdToISO(jd - SHADOW_DAYS),
          shadowEnd  : jdToISO(jd + SHADOW_DAYS),
          hindiText  : `${type==='SOLAR'?'सूर्य':'चंद्र'} ग्रहण ${jdToISO(jd)} — ${RASHI_HI[axisSign1]}-${RASHI_HI[axisSign2]} अक्ष — ${magnitude}° नोड से`,
          schemaVersion: "6.0",
        });
      }
    }
    return eclipses;
  }

  // ════════════════════════════════════════════════════════
  // getEclipseImpact — how much this eclipse hits NASDAQ natal
  // ════════════════════════════════════════════════════════
  function getEclipseImpact(eclipse, natalChart) {
    try {
      const N    = getNatal();
      const axis = eclipse.axis;
      let impact = 0;
      const affected = [];

      natalChart.planets.forEach(p => {
        const pSign = Math.floor(p.sidLon / 30);
        // Conjunct or opposite eclipse axis
        if (pSign === axis.sign1 || pSign === axis.sign2) {
          const malefic = ['Mars','Saturn','Rahu','Ketu'].includes(p.eng);
          impact += malefic ? -4 : -2;  // eclipses on natal = stress
          affected.push(p.eng);
        }
        // Square the axis
        const sq1 = (axis.sign1 + 3) % 12, sq2 = (axis.sign1 + 9) % 12;
        if (pSign === sq1 || pSign === sq2) {
          impact -= 2;
          affected.push(`${p.eng}(वर्ग)`);
        }
      });

      const severity = Math.abs(impact) >= 8 ? 'EXTREME' :
                       Math.abs(impact) >= 5 ? 'HIGH'    :
                       Math.abs(impact) >= 3 ? 'MODERATE': 'LOW';

      return {
        impact,
        severity,
        affectedPlanets: [...new Set(affected)],
        hindiText: `ग्रहण प्रभाव: ${severity} (${impact}) — ${affected.slice(0,3).join(', ') || 'कोई प्रत्यक्ष प्रभाव नहीं'}`,
      };
    } catch (e) {
      return { impact: 0, severity: 'LOW', affectedPlanets: [], hindiText: '' };
    }
  }

  // ════════════════════════════════════════════════════════
  // isInShadowPeriod
  // ════════════════════════════════════════════════════════
  function isInShadowPeriod(dateStr, eclipseList) {
    try {
      const N    = getNatal();
      const year = parseInt(dateStr.slice(0, 4));
      const jd   = N.JD(...dateStr.split('-').map(Number), 15, 0);

      const list = eclipseList || [
        ...getEclipses(year - 1),
        ...getEclipses(year),
        ...getEclipses(year + 1),
      ];

      let nearest = null, minDays = Infinity;
      list.forEach(ecl => {
        const days = Math.abs(jd - ecl.jd);
        if (days < minDays) { minDays = days; nearest = ecl; }
      });

      if (!nearest) return { inShadow: false, daysToNearest: 999 };

      return {
        inShadow      : minDays <= SHADOW_DAYS,
        daysToNearest : parseFloat(minDays.toFixed(1)),
        type          : nearest.type,
        eclipseDate   : nearest.date,
        isBefore      : jd < nearest.jd,
        hindiText     : minDays <= SHADOW_DAYS
          ? `${nearest.type==='SOLAR'?'सूर्य':'चंद्र'} ग्रहण से ${Math.round(minDays)} दिन — उन्नत अस्थिरता!`
          : `निकटतम ग्रहण ${Math.round(minDays)} दिन दूर`,
        schemaVersion : "6.0",
      };
    } catch (e) {
      return { inShadow: false, daysToNearest: 999 };
    }
  }

  // ════════════════════════════════════════════════════════
  // getEclipseAxis — sign pair of an eclipse
  // ════════════════════════════════════════════════════════
  function getEclipseAxis(eclipse) {
    return eclipse?.axis || { sign1: 0, sign2: 6 };
  }

  // ════════════════════════════════════════════════════════
  // doesAxisHitNatal — which natal planets are hit
  // ════════════════════════════════════════════════════════
  function doesAxisHitNatal(axis, natalPlanets) {
    const hit = [];
    natalPlanets.forEach(p => {
      const pSign = Math.floor(p.sidLon / 30);
      if (pSign === axis.sign1 || pSign === axis.sign2) {
        hit.push({ eng: p.eng, hi: p.hi, type: 'conjunction' });
      }
      const sq1 = (axis.sign1 + 3) % 12, sq2 = (axis.sign1 + 9) % 12;
      if (pSign === sq1 || pSign === sq2) {
        hit.push({ eng: p.eng, hi: p.hi, type: 'square' });
      }
    });
    return hit;
  }

  // ════════════════════════════════════════════════════════
  // getEclipseWindow — start / peak / end
  // ════════════════════════════════════════════════════════
  function getEclipseWindow(eclipse) {
    return {
      start : eclipse.shadowStart,
      peak  : eclipse.date,
      end   : eclipse.shadowEnd,
      days  : SHADOW_DAYS * 2,
    };
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate — comprehensive eclipse analysis
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N    = getNatal();
      const d1   = natalD1 || N.getNasdaq();
      const year = parseInt(dateStr.slice(0, 4));

      const eclipseList = [
        ...getEclipses(year - 1),
        ...getEclipses(year),
        ...getEclipses(year + 1),
      ];

      const shadowInfo = isInShadowPeriod(dateStr, eclipseList);
      let impact = null, hitPlanets = [];

      if (shadowInfo.inShadow) {
        const nearEcl = eclipseList.find(e => e.date === shadowInfo.eclipseDate);
        if (nearEcl) {
          impact     = getEclipseImpact(nearEcl, d1);
          hitPlanets = doesAxisHitNatal(nearEcl.axis, d1.planets);
        }
      }

      // Upcoming eclipses (next 60 days)
      const [y, m, d] = dateStr.split('-').map(Number);
      const todayJD = N.JD(y, m, d, 15, 0);
      const upcoming = eclipseList
        .filter(e => e.jd > todayJD && e.jd < todayJD + 60)
        .slice(0, 3);

      const overallScore = shadowInfo.inShadow
        ? (impact?.impact || -3)
        : 0;

      return {
        inShadow    : shadowInfo.inShadow,
        shadowInfo,
        impact,
        hitPlanets,
        upcoming,
        overallScore,
        hindiSummary: shadowInfo.inShadow
          ? `🌑 ${shadowInfo.hindiText} | ${impact?.hindiText || ''}`
          : upcoming.length
          ? `अगला ग्रहण: ${upcoming[0].hindiText}`
          : 'कोई ग्रहण प्रभाव नहीं',
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[ECLIPSE] analyzeForDate error:', e);
      return { inShadow: false, overallScore: 0, hindiSummary: '' };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    getEclipses, getEclipseImpact, isInShadowPeriod,
    getEclipseAxis, doesAxisHitNatal, getEclipseWindow,
    analyzeForDate, SHADOW_DAYS,
  };

})();

if (typeof module !== 'undefined') module.exports = ECLIPSE_ENGINE;
if (typeof window !== 'undefined') window.ECLIPSE_ENGINE = ECLIPSE_ENGINE;

/* ============================================================
   VedicAladdin V6 — advanced/smart_alert.js
   Smart Session Alert System
   Normal day → Quick 3-line score
   Vedic event day → Full analysis automatically
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const SMART_ALERT = (function () {
  'use strict';

  function getNatal()    { return typeof NATAL      !== 'undefined' ? NATAL      : require('../core/natal');      }
  function getTransits() { return typeof TRANSITS   !== 'undefined' ? TRANSITS   : require('../core/transits');   }
  function getEvents()   { return typeof EVENTS     !== 'undefined' ? EVENTS     : require('../core/events');     }

  const SHADOW_DAYS    = 15;
  const STATIONARY_SPD = 0.05; // deg/day threshold

  // ════════════════════════════════════════════════════════
  // getEventList — all Vedic events for a date
  // ════════════════════════════════════════════════════════
  function getEventList(dateStr, natalD1) {
    const events = [];
    try {
      const N  = getNatal();
      const d1 = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd    = N.JD(y, m, d, 15, 0);
      const jdY   = jd - 1;
      const ayan  = N.lahiri(jd);
      const ayanY = N.lahiri(jdY);

      // 1. Moon nakshatra change
      const nakT = Math.floor(N.n360(N.getPlanetLon('Moon', jd)  - ayan)  / (360/27));
      const nakY = Math.floor(N.n360(N.getPlanetLon('Moon', jdY) - ayanY) / (360/27));
      if (nakT !== nakY) {
        const NAK_HI = ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु',
          'पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी','उत्तर फाल्गुनी','हस्त','चित्रा',
          'स्वाति','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा',
          'श्रवण','धनिष्ठा','शतभिषा','पूर्व भाद्रपद','उत्तर भाद्रपद','रेवती'];
        events.push({
          type: 'NAKSHATRA_CHANGE', level: 'minor',
          desc: `चंद्र नक्षत्र परिवर्तन: ${NAK_HI[nakY]} → ${NAK_HI[nakT]}`,
          triggerFull: true,
        });
      }

      // 2. Planet sign change (ingress)
      const INGRESS_PLANETS = ['Sun','Mars','Jupiter','Saturn','Mercury','Venus'];
      const PLANET_HI = { Sun:'सूर्य',Moon:'चंद्र',Mars:'मंगल',Mercury:'बुध',
                          Jupiter:'बृहस्पति',Venus:'शुक्र',Saturn:'शनि' };
      const RASHI_HI  = ['मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
                          'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
      INGRESS_PLANETS.forEach(p => {
        const signT = Math.floor(N.n360(N.getPlanetLon(p, jd)  - ayan)  / 30);
        const signY = Math.floor(N.n360(N.getPlanetLon(p, jdY) - ayanY) / 30);
        if (signT !== signY) {
          events.push({
            type: 'INGRESS', level: 'major',
            desc: `${PLANET_HI[p] || p} ${RASHI_HI[signY]} से ${RASHI_HI[signT]} में प्रवेश`,
            planet: p, fromSign: signY, toSign: signT, triggerFull: true,
          });
        }
      });

      // 3. Eclipse shadow (±15 days)
      const E = getEvents();
      const shadow = E.isInEclipseShadow(dateStr);
      if (shadow.inShadow) {
        events.push({
          type: 'ECLIPSE_SHADOW', level: 'major',
          desc: `${shadow.type === 'SOLAR' ? 'सूर्य' : 'चंद्र'} ग्रहण से ${Math.round(shadow.daysToNearest)} दिन — उन्नत अस्थिरता`,
          daysToEclipse: shadow.daysToNearest, triggerFull: true,
        });
      }

      // 4. Stationary planets (speed < threshold)
      const SLOW_PLANETS = ['Mercury','Venus','Mars','Jupiter','Saturn'];
      SLOW_PLANETS.forEach(p => {
        const speed = Math.abs(N.n180(
          N.getPlanetLon(p, jd + 0.5) - N.getPlanetLon(p, jd - 0.5)
        ));
        if (speed < STATIONARY_SPD) {
          const isRetro = N.isRetro(p, jd);
          events.push({
            type: 'STATIONARY', level: 'major',
            desc: `${PLANET_HI[p] || p} स्थिर/${isRetro ? 'वक्री' : 'मार्गी'} (गति: ${speed.toFixed(3)}°/दिन)`,
            planet: p, speed, triggerFull: true,
          });
        }
      });

      // 5. Graha Yuddha
      const T = getTransits();
      const gy = T.getGrahaYuddha(dateStr, d1);
      if (gy.active) {
        gy.pairs.forEach(pair => {
          events.push({
            type: 'GRAHA_YUDDHA', level: 'major',
            desc: pair.hindiText, triggerFull: true,
          });
        });
      }

      // 6. Dasha change (check if maha or antar changes within 3 days)
      const D = typeof DASHA !== 'undefined' ? DASHA : null;
      if (D) {
        try {
          const birth   = N.NASDAQ_BIRTH;
          const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
          const moonSid = d1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
          const change  = D.isDashaChange(jd - 3, jd + 3, birthJD, moonSid);
          if (change.changed) {
            events.push({
              type: 'DASHA_CHANGE', level: 'major',
              desc: change.hindiNote, triggerFull: true,
            });
          }
        } catch (_) {}
      }

      // 7. Gandanta
      const gand = E.getGandantaPoints(dateStr, d1);
      if (gand.inGandanta) {
        events.push({
          type: 'GANDANTA', level: 'major',
          desc: gand.hindiText, triggerFull: true,
        });
      }

    } catch (e) {
      console.error('[SMART_ALERT] getEventList error:', e);
    }

    return events;
  }

  // ════════════════════════════════════════════════════════
  // shouldTriggerFullAnalysis
  // ════════════════════════════════════════════════════════
  function shouldTriggerFullAnalysis(dateStr, session, natalD1) {
    // NY always gets full analysis
    if (session === 'newyork' || session === 'ny') return true;
    const events = getEventList(dateStr, natalD1);
    return events.some(e => e.triggerFull);
  }

  // ════════════════════════════════════════════════════════
  // generateQuickScore — 3-line summary for normal days
  // ════════════════════════════════════════════════════════
  function generateQuickScore(dateStr, session, transitReport, dasha) {
    try {
      const SESSION_LABEL = { asian:'🌏 एशियन', london:'🇬🇧 लंदन', newyork:'🗽 NY' };
      const label = SESSION_LABEL[session] || session;
      const score = transitReport?.totalScore || 0;
      const pan   = transitReport?.panchang || {};
      const sig   = score > 5 ? '📈 बुलिश' : score < -5 ? '📉 बियरिश' : '↔ तटस्थ';
      return [
        `${label} सत्र — ${sig} (ट्रांज़िट: ${score > 0 ? '+' : ''}${score?.toFixed(0)})`,
        `नक्षत्र: ${pan.nakHi || '--'} | दशा: ${dasha?.mahaHi || '--'} ${dasha?.antarHi || ''}`,
        `पंचांग: ${pan.tithi || '--'} तिथि ${pan.paksha || ''} | ${pan.yogaHi || '--'} योग`,
      ];
    } catch (e) {
      return ['त्वरित स्कोर उपलब्ध नहीं'];
    }
  }

  // ════════════════════════════════════════════════════════
  // checkAsianAlertLevel
  // ════════════════════════════════════════════════════════
  function checkAsianAlertLevel(dateStr, natalD1) {
    const events = getEventList(dateStr, natalD1);
    const major  = events.filter(e => e.level === 'major');
    const minor  = events.filter(e => e.level === 'minor');
    const level  = major.length > 0 ? 'major' : minor.length > 0 ? 'minor' : 'none';
    return {
      session: 'asian', level,
      events: events.map(e => e.desc),
      needsFullAnalysis: level !== 'none',
      topEvent: events[0]?.desc || null,
      quickLabel: level === 'none'
        ? '✅ एशियन: सामान्य दिन'
        : level === 'minor'
        ? `🔔 एशियन: ${events[0]?.desc}`
        : `🚨 एशियन: पूर्ण विश्लेषण — ${events[0]?.desc}`,
    };
  }

  // ════════════════════════════════════════════════════════
  // checkLondonAlertLevel
  // ════════════════════════════════════════════════════════
  function checkLondonAlertLevel(dateStr, natalD1) {
    const events = getEventList(dateStr, natalD1);
    const major  = events.filter(e => e.level === 'major');
    const level  = major.length > 0 ? 'major' : events.length > 0 ? 'minor' : 'none';
    return {
      session: 'london', level,
      events: events.map(e => e.desc),
      needsFullAnalysis: level !== 'none',
      topEvent: events[0]?.desc || null,
      quickLabel: level === 'none'
        ? '✅ लंदन: सामान्य दिन'
        : `🔔 लंदन: ${level === 'major' ? 'पूर्ण विश्लेषण — ' : ''}${events[0]?.desc || ''}`,
    };
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate — combined smart alert result
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1, transitReport, dasha) {
    const events = getEventList(dateStr, natalD1);
    const asian  = checkAsianAlertLevel(dateStr, natalD1);
    const london = checkLondonAlertLevel(dateStr, natalD1);
    const nyAlways = {
      session: 'newyork', level: 'full',
      needsFullAnalysis: true,
      quickLabel: '🗽 NY: सदैव पूर्ण विश्लेषण (6 ब्लॉक)',
    };

    const hasEvents = events.length > 0;
    const quickLines = hasEvents ? [] : generateQuickScore(dateStr, 'asian', transitReport, dasha);

    return {
      dateStr,
      totalEvents: events.length,
      events,
      asian, london, ny: nyAlways,
      isEventDay: hasEvents,
      quickLines,
      hindiSummary: hasEvents
        ? `⚡ ${events.length} वैदिक घटना: ${events.slice(0,2).map(e=>e.desc).join(' | ')}`
        : '✅ सामान्य दिन — कोई प्रमुख वैदिक घटना नहीं',
      schemaVersion: "6.0",
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    getEventList,
    shouldTriggerFullAnalysis,
    generateQuickScore,
    checkAsianAlertLevel,
    checkLondonAlertLevel,
    analyzeForDate,
    STATIONARY_SPD,
  };

})();

if (typeof module !== 'undefined') module.exports = SMART_ALERT;
if (typeof window !== 'undefined') window.SMART_ALERT = SMART_ALERT;

/* ============================================================
   VedicAladdin V6 — core/sessions.js
   Asian / London / NY Deep Analysis
   NY Open Playbook: Sweep → Direction → Decision → Trap
   V5 fully preserved + V6 additions:
     isVedicEventDay       — true/false + event list
     getAsianEventLevel    — 'none'|'minor'|'major'
     getLondonEventLevel   — 'none'|'minor'|'major'
     getNYEventLevel       — always 'full'
     getTrapProbability    — bull/bear trap %
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const SESSIONS = (function () {
  'use strict';

  function getNatal()   { return typeof NATAL    !== 'undefined' ? NATAL    : require('./natal');    }
  function getTransits(){ return typeof TRANSITS !== 'undefined' ? TRANSITS : require('./transits'); }
  function getDashaM()  { return typeof DASHA    !== 'undefined' ? DASHA    : require('./dasha');    }
  function getEvents()  { return typeof EVENTS   !== 'undefined' ? EVENTS   : require('./events');   }

  // ════════════════════════════════════════════════════════
  // V5 — HORA CALCULATION (preserved)
  // ════════════════════════════════════════════════════════
  const HORA_EN  = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
  const HORA_HI  = ['सूर्य','शुक्र','बुध','चंद्र','शनि','बृहस्पति','मंगल'];
  const DAY_LORDS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

  function calcHora(jd) {
    const day  = Math.floor(jd + 1.5) % 7;
    const lord = DAY_LORDS[day];
    const si   = HORA_EN.indexOf(lord);
    return Array.from({ length: 24 }, (_, h) => {
      const li     = (si + h) % 7;
      const startH = (6 + h) % 24;
      const ben    = ['Sun','Jupiter','Venus','Moon'].includes(HORA_EN[li]);
      return {
        lord: HORA_EN[li], lordHi: HORA_HI[li],
        startH, endH: (startH + 1) % 24,
        ben, sig: ben ? '▲' : '▼', istH: startH,
      };
    });
  }

  function getHoraAtIST(hora, istHour) {
    return hora.find(h => h.startH === ((istHour % 24) + 24) % 24) || hora[Math.floor(hora.length / 2)];
  }

  // ════════════════════════════════════════════════════════
  // V5 — TRAP DETECTION (preserved)
  // ════════════════════════════════════════════════════════
  function detectTrap(horaScore, transitScore, panchangData, sessionId) {
    const nak     = panchangData?.nakProf || {};
    const bullTrap = horaScore > 4 && transitScore < -10 &&
      (nak.trap === 'VHIGH' || nak.trap === 'HIGH' || nak.mode?.includes('TRAP'));
    const bearTrap = horaScore < -4 && transitScore > 10 &&
      ['Rohini','Pushya','Hasta','Uttara Phalguni'].includes(panchangData?.nakEn);
    const sideways = Math.abs(horaScore) <= 2 && Math.abs(transitScore) <= 5;
    const vishti   = panchangData?.karanaHi === 'विष्टि';

    if (bullTrap || vishti) {
      return {
        type: 'bull', title: '🎭 BULL TRAP चेतावनी!',
        desc: `होरा बुलिश (${horaScore > 0 ? '+' : ''}${horaScore}) लेकिन ट्रांज़िट ${transitScore.toFixed(0)} — ऊपर जाकर गिर सकता है`,
        riskTag: 'BULL_TRAP', severity: 'P1',
      };
    }
    if (bearTrap) {
      return {
        type: 'bear', title: '🎭 BEAR TRAP चेतावनी!',
        desc: 'होरा बियरिश लेकिन ट्रांज़िट मजबूत — नीचे जाकर रिकवर हो सकता है',
        riskTag: 'BEAR_TRAP', severity: 'P2',
      };
    }
    if (sideways) {
      return {
        type: 'sideways', title: '↔ SIDEWAYS बाज़ार',
        desc: 'मिश्रित संकेत — Range-bound रहने की संभावना',
        riskTag: 'RANGE', severity: 'P3',
      };
    }
    return {
      type: 'clear', title: '✅ स्पष्ट दिशा',
      desc: `${horaScore > 0 ? 'बुलिश' : 'बियरिश'} मूवमेंट की उम्मीद`,
      riskTag: null, severity: 'P3',
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — ANALYZE SESSION (preserved, schema → 6.0)
  // ════════════════════════════════════════════════════════
  function analyzeSession(sessionId, context, natalD1, dasha, transitReport) {
    const SESSION_DEF = {
      asian  : { startIST:'05:30', endIST:'14:00', startH:5,  endH:14, label:'एशियन',    flag:'🌏' },
      london : { startIST:'13:30', endIST:'22:00', startH:13, endH:22, label:'लंदन',     flag:'🇬🇧' },
      newyork: { startIST:'19:00', endIST:'01:30', startH:19, endH:25, label:'न्यूयॉर्क', flag:'🗽' },
    };
    const def    = SESSION_DEF[sessionId] || SESSION_DEF.newyork;
    const pan    = transitReport?.panchang || {};
    const jd     = transitReport?.jd || 0;
    const hora   = calcHora(jd);

    const sessHoras = hora.filter(h => {
      const ish = h.istH;
      if (def.startH < def.endH) return ish >= def.startH && ish < def.endH;
      return ish >= def.startH || ish < (def.endH + 24) % 24;
    });

    const horaScore = sessHoras.reduce((s, h) => s + (h.ben ? 2 : -2), 0);
    const mainHora  = sessHoras[Math.floor(sessHoras.length / 2)] || hora[8];
    const tScore    = transitReport?.totalScore || 0;
    const dashaM    = getDashaM();
    const dashaI    = dasha ? { sc: dashaM.getDashaScore(dasha.maha, dasha.antar) } : { sc: 0 };
    const panSc     = pan.score || 0;

    const natalStrength = (natalD1?.planets || []).reduce((s, p) =>
      s + (p.nat === 'benefic' ? p.strength - 50 : 50 - p.strength), 0) / 100;
    const rawSc = natalStrength * 0.5 + dashaI.sc + tScore * 0.5 + panSc * 0.2 + horaScore * 0.1;
    const sc    = Math.max(-100, Math.min(100, rawSc));

    const scores = [horaScore, tScore, dashaI.sc, panSc];
    const pos    = scores.filter(s => s > 0).length;
    const neg    = scores.filter(s => s < 0).length;
    const conf   = pos === 4 || neg === 4 ? 90 : Math.max(pos, neg) >= 3 ? 70 : Math.max(pos, neg) >= 2 ? 55 : 40;

    const trap    = detectTrap(horaScore, tScore, pan, sessionId);
    const dirSig  = sc > 10 ? 'BULL' : sc < -10 ? 'BEAR' : 'NEUT';
    const riskTags = trap.riskTag ? [trap.riskTag] : [];
    if (Math.abs(sc) < 10) riskTags.push('RANGE');

    const timeWindows = [{
      label   : `${def.label} सत्र`,
      startIST: `${def.startIST} IST`,
      peakIST : `${String(Math.floor((def.startH + Math.min(def.endH, 23)) / 2)).padStart(2,'0')}:00 IST`,
      endIST  : `${def.endIST} IST`,
      severity: conf >= 70 ? 'P2' : 'P3',
      tags    : riskTags,
      notes   : [`${def.label} सत्र संकेत: ${sc > 0 ? 'बुलिश' : 'बियरिश'} (${sc.toFixed(0)})`],
    }];

    return {
      moduleId        : `session_${sessionId}`,
      sessionId, label: def.label, flag: def.flag,
      dateIST         : transitReport?.dateIST || '',
      score           : parseFloat(sc.toFixed(2)),
      confidence      : conf,
      direction       : dirSig,
      horaScore, mainHora,
      trap, riskTags,
      relevanceScore  : 80,
      directionHint   : dirSig,
      confidenceImpact: parseFloat(sc.toFixed(2)),
      timeWindows,
      explanations: [
        `होरा स्कोर: ${horaScore > 0 ? '+' : ''}${horaScore}`,
        `ट्रांज़िट: ${tScore > 0 ? '+' : ''}${tScore.toFixed(1)}`,
        `दशा: ${dasha?.mahaHi || '--'} (${dashaI.sc > 0 ? '+' : ''}${dashaI.sc})`,
        `पंचांग: ${pan.nakHi || '--'} नक्षत्र (${panSc > 0 ? '+' : ''}${panSc})`,
        trap.desc,
      ],
      evidence   : [`hora=${horaScore} transit=${tScore.toFixed(1)} dasha=${dashaI.sc} pan=${panSc} conf=${conf}%`],
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V5 — NY OPEN PLAYBOOK (preserved, schema → 6.0)
  // ════════════════════════════════════════════════════════
  function detectSweepRisk(tScore, pan, nyHora, eventsReport) {
    const highVol  = eventsReport?.riskTags?.includes('CRASH_RISK') || eventsReport?.riskTags?.includes('SPIKE');
    const badNak   = ['Ashlesha','Jyeshtha','Mula','Ardra','Vishakha'].includes(pan.nakEn);
    const vishti   = pan.karanaHi === 'विष्टि';
    const level    = highVol || badNak || vishti ? 'HIGH' : Math.abs(tScore) > 10 ? 'MEDIUM' : 'LOW';
    const score    = level === 'HIGH' ? -3 : level === 'MEDIUM' ? -1 : 1;
    const tags     = level === 'HIGH' ? ['SWEEP','WHIPSAW'] : ['SWEEP'];
    return {
      level, score, severity: level === 'HIGH' ? 'P1' : 'P2', tags,
      desc: `NY Open Sweep ${level}: ${badNak ? pan.nakHi + ' नक्षत्र' : 'होरा ' + (nyHora.ben ? 'शुभ' : 'अशुभ')}`,
    };
  }

  function detectDirectionAttempt(tScore, dashaI, pan, hora) {
    const midHora  = getHoraAtIST(hora, 20);
    const combined = tScore * 0.4 + dashaI.sc * 0.3 + (pan.score || 0) * 0.3;
    const direction = combined > 3 ? 'BULL' : combined < -3 ? 'BEAR' : 'NEUT';
    return {
      direction, score: parseFloat(combined.toFixed(2)), midHora,
      desc: `दिशा प्रयास: ${direction} (${combined.toFixed(1)}) — ${midHora.lordHi} होरा`,
    };
  }

  function getDecisionZone(sweep, dir, tScore, pan) {
    let trapType = 'one-way';
    if (sweep.level === 'HIGH' && dir.direction === 'BULL') trapType = 'bull';
    else if (sweep.level === 'HIGH' && dir.direction === 'BEAR') trapType = 'bear';
    else if (sweep.level === 'HIGH' && dir.direction === 'NEUT') trapType = 'double';
    const score = dir.score * (sweep.level === 'HIGH' ? 0.5 : 1);
    const sev   = sweep.level === 'HIGH' ? 'P1' : sweep.level === 'MEDIUM' ? 'P2' : 'P3';
    const TRAP_DESC = {
      bull     : 'Bull Trap — ऊपर जाएगा फिर गिरेगा',
      bear     : 'Bear Trap — नीचे जाएगा फिर उठेगा',
      double   : 'Double Trap — दोनों तरफ Sweep',
      'one-way': 'One-Way Move — स्पष्ट दिशा',
    };
    return { trapType, score: parseFloat(score.toFixed(2)), severity: sev, desc: TRAP_DESC[trapType] || 'तटस्थ' };
  }

  function analyzeNYOpenPlaybook(context, natalD1, dasha, transitReport, eventsReport) {
    const pan        = transitReport?.panchang || {};
    const hora       = calcHora(transitReport?.jd || 0);
    const nyOpenHora = getHoraAtIST(hora, 19);
    const tScore     = transitReport?.totalScore || 0;
    const dashaM     = getDashaM();
    const dashaI     = dasha ? { sc: dashaM.getDashaScore(dasha.maha, dasha.antar) } : { sc: 0 };
    const sweepRisk       = detectSweepRisk(tScore, pan, nyOpenHora, eventsReport);
    const directionAttempt= detectDirectionAttempt(tScore, dashaI, pan, hora);
    const decisionZone    = getDecisionZone(sweepRisk, directionAttempt, tScore, pan);
    const playbookScore   = (sweepRisk.score + directionAttempt.score + decisionZone.score) / 3;
    const playbookConf    = Math.min(90, Math.abs(playbookScore) * 5 + 40);

    return {
      moduleId          : 'ny_open_playbook',
      dateIST           : transitReport?.dateIST || '',
      playbookScore     : parseFloat(playbookScore.toFixed(2)),
      playbookConfidence: parseFloat(playbookConf.toFixed(1)),
      playbookDirection : playbookScore > 5 ? 'BULL' : playbookScore < -5 ? 'BEAR' : 'NEUT',
      sweepRisk, directionAttempt, decisionZone, nyOpenHora,
      trapType          : decisionZone.trapType,
      timeWindows: [
        { label:'Sweep Risk Window',    startIST:'19:00 IST', peakIST:'19:07 IST', endIST:'19:15 IST', severity: sweepRisk.severity,  tags: sweepRisk.tags,  notes: [sweepRisk.desc] },
        { label:'Direction Attempt',    startIST:'19:15 IST', peakIST:'19:30 IST', endIST:'19:45 IST', severity: 'P2', tags: [], notes: [directionAttempt.desc] },
        { label:'Decision Zone',        startIST:'19:45 IST', peakIST:'20:00 IST', endIST:'20:30 IST', severity: decisionZone.severity, tags: [decisionZone.trapType], notes: [decisionZone.desc] },
      ],
      explanations: [
        `NY Open होरा: ${nyOpenHora.lordHi} (${nyOpenHora.ben ? 'शुभ' : 'अशुभ'})`,
        `Sweep Risk: ${sweepRisk.level}`,
        `Direction: ${directionAttempt.direction}`,
        `Decision: ${decisionZone.trapType} — ${decisionZone.desc}`,
      ],
      evidence     : [`tScore=${tScore} dashaI=${dashaI.sc} nyHora=${nyOpenHora.lord}`],
      relevanceScore: 95,
      directionHint : playbookScore > 5 ? 'BULL' : playbookScore < -5 ? 'BEAR' : 'NEUT',
      confidenceImpact: parseFloat(playbookScore.toFixed(2)),
      riskTags      : [decisionZone.trapType, 'GAP'].filter(Boolean),
      schemaVersion : "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: isVedicEventDay
  // ════════════════════════════════════════════════════════
  /**
   * Check if a date has major Vedic events requiring full session analysis
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {Object} [natalD1]
   * @returns {{ isEvent, events: string[], level: 'none'|'minor'|'major' }}
   */
  function isVedicEventDay(dateStr, natalD1) {
    try {
      const N    = getNatal();
      const E    = getEvents();
      const d1   = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const jdY  = jd - 1;
      const ayan = N.lahiri(jd);

      const events = [];
      let level = 'none';

      // 1. Moon nakshatra change
      const nakT = Math.floor(N.n360(N.getPlanetLon('Moon', jd)   - ayan) / (360/27));
      const nakY = Math.floor(N.n360(N.getPlanetLon('Moon', jdY)  - ayan) / (360/27));
      if (nakT !== nakY) { events.push('चंद्र नक्षत्र परिवर्तन'); if (level === 'none') level = 'minor'; }

      // 2. Any planet sign change (ingress)
      ['Sun','Mars','Jupiter','Saturn','Mercury','Venus'].forEach(p => {
        const signT = Math.floor(N.n360(N.getPlanetLon(p, jd)  - ayan) / 30);
        const signY = Math.floor(N.n360(N.getPlanetLon(p, jdY) - ayan) / 30);
        if (signT !== signY) { events.push(`${p} राशि प्रवेश`); level = 'major'; }
      });

      // 3. Eclipse shadow
      const eclShadow = E.isInEclipseShadow(dateStr);
      if (eclShadow.inShadow) { events.push('ग्रहण छाया सक्रिय'); level = 'major'; }

      // 4. Graha Yuddha
      const T = getTransits();
      const gy = T.getGrahaYuddha(dateStr, d1);
      if (gy.active) { events.push('ग्रह युद्ध सक्रिय'); level = 'major'; }

      // 5. Gandanta
      const gand = E.getGandantaPoints(dateStr, d1);
      if (gand.inGandanta) { events.push('गंडांत — उच्च तनाव'); level = 'major'; }

      // 6. Any planet stationary (speed < 0.01 deg/day)
      ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach(p => {
        const speed = Math.abs(N.n180(N.getPlanetLon(p, jd + 0.5) - N.getPlanetLon(p, jd - 0.5)));
        if (speed < 0.05) { events.push(`${p} स्थिर (वक्री/मार्गी)`); level = 'major'; }
      });

      return { isEvent: events.length > 0, events, level };
    } catch (e) {
      console.error('[SESSIONS] isVedicEventDay error:', e);
      return { isEvent: false, events: [], level: 'none' };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getAsianEventLevel
  // ════════════════════════════════════════════════════════
  /**
   * Determine alert level for the Asian session
   * Asian session: 05:30–14:00 IST
   * @returns {{ level: 'none'|'minor'|'major', events, needsFullAnalysis }}
   */
  function getAsianEventLevel(dateStr, natalD1) {
    try {
      const result = isVedicEventDay(dateStr, natalD1);
      // For Asian: nakshatra change and eclipse are triggers; others also trigger full
      const needsFull = result.level === 'major' || result.events.some(e =>
        e.includes('नक्षत्र') || e.includes('ग्रहण') || e.includes('ग्रह युद्ध')
      );
      return {
        session         : 'asian',
        level           : result.level,
        events          : result.events,
        needsFullAnalysis: needsFull,
        quickScoreHi    : needsFull
          ? `🔔 एशियन: पूर्ण विश्लेषण — ${result.events[0] || 'वैदिक घटना'}`
          : '✅ एशियन: सामान्य दिन — त्वरित स्कोर',
      };
    } catch (e) {
      return { session: 'asian', level: 'none', events: [], needsFullAnalysis: false };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getLondonEventLevel
  // ════════════════════════════════════════════════════════
  function getLondonEventLevel(dateStr, natalD1) {
    try {
      const result = isVedicEventDay(dateStr, natalD1);
      const needsFull = result.level !== 'none';
      return {
        session         : 'london',
        level           : result.level,
        events          : result.events,
        needsFullAnalysis: needsFull,
        quickScoreHi    : needsFull
          ? `🔔 लंदन: पूर्ण विश्लेषण — ${result.events[0] || 'वैदिक घटना'}`
          : '✅ लंदन: सामान्य दिन — त्वरित स्कोर',
      };
    } catch (e) {
      return { session: 'london', level: 'none', events: [], needsFullAnalysis: false };
    }
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getNYEventLevel — always 'full'
  // ════════════════════════════════════════════════════════
  function getNYEventLevel(dateStr, natalD1) {
    const events = isVedicEventDay(dateStr, natalD1);
    return {
      session          : 'newyork',
      level            : 'full',          // NY ALWAYS gets deep dive (6 blocks)
      events           : events.events,
      needsFullAnalysis: true,
      quickScoreHi     : '🗽 न्यूयॉर्क: सदैव पूर्ण विश्लेषण (6 ब्लॉक)',
    };
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW: getTrapProbability — bull/bear trap %
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr
   * @param {'asian'|'london'|'newyork'} session
   * @param {Object} transitReport — from TRANSITS.buildReport
   * @returns {{ bullTrapPct, bearTrapPct, directPct, hindiText }}
   */
  function getTrapProbability(dateStr, session, transitReport) {
    try {
      const pan       = transitReport?.panchang || {};
      const tScore    = transitReport?.totalScore || 0;
      const TRAP_NAKS = ['Ashlesha','Jyeshtha','Ardra','Vishakha','Shatabhisha'];
      const isTrapNak = TRAP_NAKS.includes(pan.nakEn);
      const vishti    = pan.karanaHi === 'विष्टि';
      const eclShadow = transitReport?.eclipseInShadow || false;

      // Base probability from nakshatra + karana + eclipse
      let trapBase = 15;
      if (isTrapNak)  trapBase += 20;
      if (vishti)     trapBase += 15;
      if (eclShadow)  trapBase += 15;

      // Direction adjustment
      const bullBias  = tScore > 5;
      const bearBias  = tScore < -5;
      const bullTrap  = Math.min(60, bullBias  ? trapBase + 15 : trapBase - 5);
      const bearTrap  = Math.min(60, bearBias  ? trapBase + 15 : trapBase - 5);
      const directPct = Math.max(10, 100 - bullTrap - bearTrap);

      return {
        bullTrapPct : parseFloat(bullTrap.toFixed(1)),
        bearTrapPct : parseFloat(bearTrap.toFixed(1)),
        directPct   : parseFloat(directPct.toFixed(1)),
        hindiText   : `Bull Trap: ${bullTrap.toFixed(0)}% | Bear Trap: ${bearTrap.toFixed(0)}% | स्पष्ट दिशा: ${directPct.toFixed(0)}%`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { bullTrapPct: 20, bearTrapPct: 20, directPct: 60, hindiText: 'ट्रैप संभावना उपलब्ध नहीं' };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 preserved
    calcHora,
    getHoraAtIST,
    detectTrap,
    analyzeSession,
    analyzeNYOpenPlaybook,
    detectSweepRisk,
    detectDirectionAttempt,
    getDecisionZone,
    HORA_EN, HORA_HI, DAY_LORDS,
    // V6 new
    isVedicEventDay,
    getAsianEventLevel,
    getLondonEventLevel,
    getNYEventLevel,
    getTrapProbability,
  };

})();

if (typeof module !== 'undefined') module.exports = SESSIONS;
if (typeof window !== 'undefined') window.SESSIONS = SESSIONS;

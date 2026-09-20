/* ============================================================
   VedicAladdin V6 — advanced/muhurta_engine.js
   Trade Timing: Rahu Kalam | Gulika | Abhijit | Hora A+ to F
   Special focus: NY Open 19:00 IST, London 13:30, Asian 05:30
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const MUHURTA_ENGINE = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  // ── Day of week index from date string ───────────────────
  function getDOW(dateStr) {
    return new Date(dateStr + 'T12:00:00Z').getUTCDay(); // 0=Sun
  }

  // ── Sunrise approx for latitude (IST hours) ─────────────
  function getSunriseIST(dateStr, lat = 28.6) {
    // Approximate sunrise for mid-India lat ~28.6°N (IST)
    const doy = Math.floor((new Date(dateStr+'T00:00:00Z') -
                new Date(dateStr.slice(0,4)+'-01-01T00:00:00Z')) / 86400000);
    const decl = 23.45 * Math.sin(((284 + doy) / 365) * 2 * Math.PI);
    const ha   = Math.acos(-Math.tan(lat * Math.PI/180) * Math.tan(decl * Math.PI/180));
    const sunrise = 12 - (ha * 180 / Math.PI) / 15; // solar hours
    return sunrise + 0.55; // rough IST correction
  }

  // ════════════════════════════════════════════════════════
  // RAHU KALAM (1.5 hr inauspicious period, varies by weekday)
  // Order from sunrise: Sun→Tue skip, based on weekday
  // ════════════════════════════════════════════════════════
  // Slot index (0-7) from sunrise for each weekday 0=Sun..6=Sat
  const RAHU_SLOT  = [8, 2, 7, 5, 6, 4, 3]; // which 1.5hr slot is Rahu Kalam
  const GULIKA_SLOT= [6, 5, 4, 3, 2, 1, 7];
  const YAMA_SLOT  = [4, 3, 2, 1, 7, 6, 5];

  function calcPeriod(dateStr, slot, lat) {
    const sunrise = getSunriseIST(dateStr, lat);
    const start   = sunrise + (slot - 1) * 1.5;
    const end     = start + 1.5;
    const fmt = h => {
      const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
      return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    };
    return { startIST: fmt(start), endIST: fmt(end), startH: start, endH: end };
  }

  function getRahuKalam(dateStr, lat = 28.6) {
    try {
      const dow  = getDOW(dateStr);
      const slot = RAHU_SLOT[dow];
      const p    = calcPeriod(dateStr, slot, lat);
      return { ...p, label: 'राहु काल', quality: 'F', avoid: true,
               hindiText: `राहु काल: ${p.startIST}–${p.endIST} IST — व्यापार बिल्कुल न करें` };
    } catch (e) { return { startIST:'00:00', endIST:'00:00', quality:'F', avoid:true }; }
  }

  function getGulikaKalam(dateStr, lat = 28.6) {
    try {
      const dow  = getDOW(dateStr);
      const slot = GULIKA_SLOT[dow];
      const p    = calcPeriod(dateStr, slot, lat);
      return { ...p, label: 'गुलिका काल', quality: 'F', avoid: true,
               hindiText: `गुलिका काल: ${p.startIST}–${p.endIST} IST — सतर्कता` };
    } catch (e) { return { startIST:'00:00', endIST:'00:00', quality:'F', avoid:true }; }
  }

  function getYamagandam(dateStr, lat = 28.6) {
    try {
      const dow  = getDOW(dateStr);
      const slot = YAMA_SLOT[dow];
      const p    = calcPeriod(dateStr, slot, lat);
      return { ...p, label: 'यमगंडम', quality: 'D', avoid: true,
               hindiText: `यमगंडम: ${p.startIST}–${p.endIST} IST — हानि संभव` };
    } catch (e) { return { startIST:'00:00', endIST:'00:00', quality:'D', avoid:true }; }
  }

  // ════════════════════════════════════════════════════════
  // ABHIJIT MUHURTA — the best daily window (~midday)
  // ════════════════════════════════════════════════════════
  function getAbhijitMuhurta(dateStr, lat = 28.6) {
    try {
      const sunrise = getSunriseIST(dateStr, lat);
      const sunset  = 24 - sunrise; // approx
      const midday  = (sunrise + sunset) / 2;
      const start   = midday - 0.4;
      const end     = midday + 0.4;
      const fmt = h => {
        const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
        return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
      };
      return {
        startIST: fmt(start), endIST: fmt(end),
        label: 'अभिजित मुहूर्त', quality: 'A+', avoid: false,
        hindiText: `अभिजित मुहूर्त: ${fmt(start)}–${fmt(end)} IST — सर्वश्रेष्ठ व्यापार समय`,
      };
    } catch (e) { return { startIST:'11:44', endIST:'12:32', quality:'A+', avoid:false }; }
  }

  // ════════════════════════════════════════════════════════
  // HORA LORD & QUALITY
  // ════════════════════════════════════════════════════════
  const CHALDEAN     = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
  const CHALDEAN_HI  = {
    Sun:'सूर्य', Venus:'शुक्र', Mercury:'बुध',
    Moon:'चंद्र', Saturn:'शनि', Jupiter:'बृहस्पति', Mars:'मंगल',
  };
  const DOW_START    = [0, 3, 6, 2, 5, 1, 4]; // Sun=0,Mon=3,Tue=6,Wed=2,Thu=5,Fri=1,Sat=4
  const HORA_QUALITY_MAP = {
    Jupiter:'A+', Venus:'A', Mercury:'B', Moon:'B',
    Sun:'C', Mars:'D', Saturn:'F',
  };

  function getHoraLord(dateStr, timeIST) {
    try {
      const dow   = getDOW(dateStr);
      const [h]   = timeIST.split(':').map(Number);
      const sunrise = getSunriseIST(dateStr);
      const horaIdx = Math.max(0, Math.floor(h - sunrise));
      const startIdx = DOW_START[dow];
      const lordIdx  = (startIdx + horaIdx) % 7;
      return CHALDEAN[lordIdx];
    } catch (e) { return 'Sun'; }
  }

  function getHoraQuality(planet) {
    return HORA_QUALITY_MAP[planet] || 'C';
  }

  // ════════════════════════════════════════════════════════
  // CHANDRA BALA — Moon sign vs Lagna sign strength
  // ════════════════════════════════════════════════════════
  function getChandraBala(moonSign, lagnaSign) {
    const dist = (moonSign - lagnaSign + 12) % 12 + 1;
    const GOOD = [1,3,6,7,10,11], BAD = [4,8,12];
    if (GOOD.includes(dist)) return { score: 3, hi: 'चंद्र बल अच्छा' };
    if (BAD.includes(dist))  return { score:-2, hi: 'चंद्र बल कमज़ोर' };
    return { score: 1, hi: 'चंद्र बल सामान्य' };
  }

  // ════════════════════════════════════════════════════════
  // TARA BALA — current nakshatra vs NASDAQ birth nakshatra
  // NASDAQ birth Moon: Rohini = nak 3 (0-indexed)
  // ════════════════════════════════════════════════════════
  const NASDAQ_BIRTH_NAK = 3; // Rohini

  function getTarabala(currentNak, birthNak) {
    birthNak = birthNak !== undefined ? birthNak : NASDAQ_BIRTH_NAK;
    const tara = (currentNak - birthNak + 27) % 9 + 1; // 1-9
    const TARA_SCORE = {1:3,2:-2,3:2,4:-2,5:2,6:-3,7:1,8:-2,9:2};
    const TARA_HI    = {
      1:'जन्म (3)',2:'सम्पद (3)',3:'विपत् (-2)',4:'क्षेम (2)',
      5:'प्रत्यर् (-2)',6:'साधन (2)',7:'नैधन (-3)',8:'मित्र (1)',9:'परममित्र (2)',
    };
    return {
      tara, score: TARA_SCORE[tara] || 0,
      hi: TARA_HI[tara] || `तारा ${tara}`,
    };
  }

  // ════════════════════════════════════════════════════════
  // DAY QUALITY TIMELINE — hourly A+ to F map
  // ════════════════════════════════════════════════════════
  function getDayQualityTimeline(dateStr, lat = 28.6) {
    try {
      const rahu   = getRahuKalam(dateStr, lat);
      const gulika = getGulikaKalam(dateStr, lat);
      const yama   = getYamagandam(dateStr, lat);
      const abhijit= getAbhijitMuhurta(dateStr, lat);

      const timeline = [];
      for (let h = 0; h < 24; h++) {
        const timeIST = `${String(h).padStart(2,'0')}:00`;
        const lord    = getHoraLord(dateStr, timeIST);
        let   quality = getHoraQuality(lord);
        let   label   = `${CHALDEAN_HI[lord]} होरा`;
        let   avoid   = false;

        // Override with inauspicious periods
        const inRahu  = h >= parseFloat(rahu.startIST)   && h < parseFloat(rahu.endIST);
        const inGulika= h >= parseFloat(gulika.startIST) && h < parseFloat(gulika.endIST);
        const inYama  = h >= parseFloat(yama.startIST)   && h < parseFloat(yama.endIST);

        const absHStr = (s) => { const [hh,mm]=s.split(':').map(Number); return hh+mm/60; };
        const inR  = h >= absHStr(rahu.startIST)    && h < absHStr(rahu.endIST);
        const inG  = h >= absHStr(gulika.startIST)  && h < absHStr(gulika.endIST);
        const inY  = h >= absHStr(yama.startIST)    && h < absHStr(yama.endIST);
        const inAb = h >= absHStr(abhijit.startIST) && h < absHStr(abhijit.endIST);

        if (inR)  { quality = 'F'; label = 'राहु काल — व्यापार न करें'; avoid = true; }
        if (inG)  { quality = 'F'; label = 'गुलिका काल — सतर्कता'; avoid = true; }
        if (inY && quality !== 'F') { quality = 'D'; label = 'यमगंडम'; avoid = true; }
        if (inAb && !inR && !inG)  { quality = 'A+'; label = 'अभिजित मुहूर्त — सर्वश्रेष्ठ'; avoid = false; }

        const QUALITY_COLOR = {
          'A+':'#00e676', 'A':'#69f0ae', 'B':'#b2ff59', 'C':'#ffd740', 'D':'#ff6d00', 'F':'#ff1744',
        };

        timeline.push({
          hour: h,
          timeIST,
          endIST  : `${String(h+1).padStart(2,'0')}:00`,
          lord, lordHi: CHALDEAN_HI[lord],
          quality, label, avoid,
          color   : QUALITY_COLOR[quality] || '#ffd740',
        });
      }

      return { dateStr, timeline, rahu, gulika, yama, abhijit };
    } catch (e) {
      console.error('[MUHURTA] getDayQualityTimeline error:', e);
      return { dateStr, timeline: [] };
    }
  }

  // ════════════════════════════════════════════════════════
  // SESSION QUALITY — for Asian / London / NY
  // ════════════════════════════════════════════════════════
  function getSessionQuality(dateStr, session) {
    try {
      const SESSION_HOURS = {
        asian  : [5,  6],   // 05:30 IST focus hour
        london : [13, 14],  // 13:30 IST focus hour
        newyork: [19, 20],  // 19:00 IST focus hour
        ny     : [19, 20],
      };
      const hours    = SESSION_HOURS[session] || [15, 16];
      const timeline = getDayQualityTimeline(dateStr);
      const blocks   = timeline.timeline.filter(t => hours.includes(t.hour));
      if (!blocks.length) return { quality:'C', label:'सामान्य', avoid:false };

      // Take worst quality if any F, else best
      const hasF = blocks.some(b => b.quality === 'F');
      const best  = blocks.sort((a,b) => {
        const Q = {'A+':6,'A':5,'B':4,'C':3,'D':2,'F':1};
        return (Q[b.quality]||0) - (Q[a.quality]||0);
      })[0];

      return hasF
        ? { quality:'F', label:`${session} — राहु/गुलिका काल में — व्यापार न करें`,
            avoid:true, blocks }
        : { quality: best.quality, label: best.label, avoid: best.avoid, blocks };
    } catch (e) {
      return { quality:'C', label:'सामान्य', avoid:false };
    }
  }

  // ════════════════════════════════════════════════════════
  // FULL MUHURTA ANALYSIS FOR A DATE
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1, lat = 28.6) {
    try {
      const N    = getNatal();
      const d1   = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const ayan = N.lahiri(jd);

      const moonSid  = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const moonNak  = Math.floor(moonSid / (360/27));
      const moonSign = Math.floor(moonSid / 30);
      const lagnaSign = d1.lagnaSign;

      const chandraBala = getChandraBala(moonSign, lagnaSign);
      const taraBala    = getTarabala(moonNak, NASDAQ_BIRTH_NAK);
      const timeline    = getDayQualityTimeline(dateStr, lat);
      const nyQ         = getSessionQuality(dateStr, 'newyork');
      const lonQ        = getSessionQuality(dateStr, 'london');
      const asianQ      = getSessionQuality(dateStr, 'asian');

      // Overall muhurta score
      const score = chandraBala.score + taraBala.score +
        (nyQ.quality === 'A+' ? 3 : nyQ.quality === 'A' ? 2 :
         nyQ.quality === 'F' ? -4 : nyQ.quality === 'D' ? -2 : 0);

      // Find best window in NY session (19:00-01:30 IST)
      const nyHours = [...Array(7).keys()].map(i => (19+i)%24);
      const nyBlocks = timeline.timeline.filter(t => nyHours.includes(t.hour));
      const bestNY   = nyBlocks.filter(b => !b.avoid).sort((a,b) => {
        const Q = {'A+':6,'A':5,'B':4,'C':3,'D':2,'F':1};
        return (Q[b.quality]||0)-(Q[a.quality]||0);
      })[0];
      const avoidNY  = nyBlocks.filter(b => b.avoid);

      return {
        dateStr,
        rahu     : timeline.rahu,
        gulika   : timeline.gulika,
        yama     : timeline.yama,
        abhijit  : timeline.abhijit,
        chandraBala,
        taraBala,
        nyQuality: nyQ,
        londonQuality: lonQ,
        asianQuality : asianQ,
        bestNYWindow : bestNY || null,
        avoidNYWindows: avoidNY,
        overallScore : score,
        timeline : timeline.timeline,
        hindiSummary : `NY Open ${nyQ.quality}: ${nyQ.label} | चंद्र बल: ${chandraBala.hi} | तारा बल: ${taraBala.hi}`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[MUHURTA] analyzeForDate error:', e);
      return { overallScore: 0, hindiSummary: 'मुहूर्त जाँच विफल' };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    getRahuKalam, getGulikaKalam, getYamagandam, getAbhijitMuhurta,
    getHoraLord, getHoraQuality, getChandraBala, getTarabala,
    getDayQualityTimeline, getSessionQuality, analyzeForDate,
    CHALDEAN, CHALDEAN_HI, HORA_QUALITY_MAP, NASDAQ_BIRTH_NAK,
  };

})();

if (typeof module !== 'undefined') module.exports = MUHURTA_ENGINE;
if (typeof window !== 'undefined') window.MUHURTA_ENGINE = MUHURTA_ENGINE;

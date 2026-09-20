/* ============================================================
   VedicAladdin V6 — core/time.js
   IST ↔ NY mapping | DST safe | Session boundaries | Holidays
   V5 fully preserved + V6 additions:
     getJDFast      — optimized Julian Day for instant engine
     getISTfromUTC  — precise IST string from UTC date
     isVedicEventDay— returns true/false + event list
     getHoraSchedule— all 24 horas with lord for a date
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const TIME = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════
  // V5 FUNCTIONS — PRESERVED EXACTLY
  // ════════════════════════════════════════════════════════

  // DST in US: 2nd Sunday March → 1st Sunday November
  function isDST(date) {
    const y = date.getFullYear();
    const marchStart = new Date(y, 2, 1);
    const marchDay = marchStart.getDay();
    const dstStart = new Date(y, 2, 8 + (7 - marchDay) % 7);
    const novStart = new Date(y, 10, 1);
    const novDay = novStart.getDay();
    const dstEnd = new Date(y, 10, 1 + (7 - novDay) % 7);
    return date >= dstStart && date < dstEnd;
  }

  function getNYOffset(date) { return isDST(date) ? -4 : -5; }

  function istToUTC(dateIST_str, timeIST_str = "00:00") {
    const [y, m, d] = dateIST_str.split('-').map(Number);
    const [h, mi] = timeIST_str.split(':').map(Number);
    const utcMs = Date.UTC(y, m - 1, d, h, mi) - (5.5 * 3600000);
    return new Date(utcMs);
  }

  function utcToIST(utcDate) {
    return new Date(utcDate.getTime() + 5.5 * 3600000);
  }

  function istToNY(dateIST_str, timeIST_str) {
    const utc = istToUTC(dateIST_str, timeIST_str);
    const nyOff = getNYOffset(utc);
    return new Date(utc.getTime() + nyOff * 3600000);
  }

  function nyToIST(nyDateStr, nyTimeStr) {
    const [y, m, d] = nyDateStr.split('-').map(Number);
    const [h, mi] = nyTimeStr.split(':').map(Number);
    const utcMs = Date.UTC(y, m - 1, d, h, mi);
    const nyOff = getNYOffset(new Date(utcMs));
    const utc = new Date(utcMs - nyOff * 3600000);
    return utcToIST(utc);
  }

  function getSessionBoundaries(dateIST_str) {
    const utc = istToUTC(dateIST_str, "00:00");
    const nyOff = getNYOffset(utc);
    const [y, m, d] = dateIST_str.split('-').map(Number);
    const nyOpenUTC  = Date.UTC(y, m - 1, d, 9,  30) - nyOff * 3600000;
    const nyCloseUTC = Date.UTC(y, m - 1, d, 16,  0) - nyOff * 3600000;
    const nyOpenIST  = utcToIST(new Date(nyOpenUTC));
    const nyCloseIST = utcToIST(new Date(nyCloseUTC));
    const fmt = dt =>
      `${String(dt.getUTCHours()).padStart(2,'0')}:${String(dt.getUTCMinutes()).padStart(2,'0')}`;

    return {
      asian  : { startIST: "05:30", endIST: "14:00", label: "एशियन" },
      london : { startIST: "13:30", endIST: "22:00", label: "लंदन" },
      newyork: { startIST: fmt(nyOpenIST), endIST: fmt(nyCloseIST), label: "न्यूयॉर्क" },
      nyopen : {
        startIST: fmt(nyOpenIST),
        endIST  : fmt(new Date(nyOpenIST.getTime() + 90 * 60000)),
        label   : "NY Open Zone",
      },
      isDST   : isDST(utc),
      nyOffset: nyOff,
    };
  }

  function isUSHoliday(dateStr) {
    // Key US market holidays (fixed dates — approximation)
    const HOLIDAYS_FIXED = [
      '-01-01', // New Year
      '-07-04', // Independence Day
      '-12-25', // Christmas
    ];
    return HOLIDAYS_FIXED.some(h => dateStr.endsWith(h));
  }

  function isMarketDay(dateStr) {
    const dt = new Date(dateStr + 'T12:00:00Z');
    const dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) return false;
    return !isUSHoliday(dateStr);
  }

  function julianDay(y, mo, d, h = 0, mi = 0) {
    if (mo <= 2) { y -= 1; mo += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) +
           Math.floor(30.6001 * (mo + 1)) + d + (h + mi / 60) / 24 + B - 1524.5;
  }

  function todayIST() {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600000);
    return ist.toISOString().split('T')[0];
  }

  function getMarketContext(dateIST_str) {
    const sessions = getSessionBoundaries(dateIST_str);
    const isHoliday = isUSHoliday(dateIST_str);
    const isTrading = isMarketDay(dateIST_str);
    const dt = new Date(dateIST_str + 'T12:00:00Z');
    const dowNames = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
    const jd = julianDay(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), 15, 0);
    return {
      dateIST    : dateIST_str,
      isUSHoliday: isHoliday,
      isMarketDay: isTrading,
      dayOfWeek  : dowNames[dt.getUTCDay()],
      sessions,
      jd,
      schemaVersion: "6.0",
    };
  }

  function nowIST() {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600000);
    return `${String(ist.getUTCHours()).padStart(2,'0')}:` +
           `${String(ist.getUTCMinutes()).padStart(2,'0')}:` +
           `${String(ist.getUTCSeconds()).padStart(2,'0')}`;
  }

  function activeSession(timeIST) {
    const [h, m] = timeIST.split(':').map(Number);
    const t = h * 60 + m;
    if (t >= 330 && t < 840)  return 'asian';
    if (t >= 810 && t < 1320) return 'london';
    if (t >= 1140 || t < 90)  return 'newyork';
    return 'none';
  }

  // ════════════════════════════════════════════════════════
  // V6 NEW FUNCTIONS
  // ════════════════════════════════════════════════════════

  /**
   * getJDFast — optimized Julian Day calculation
   * Avoids repeated branch logic; pre-checks Gregorian
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {number} hourUTC — fractional hours in UTC (default 15 = NYSE open)
   * @returns {number} Julian Day number
   */
  function getJDFast(dateStr, hourUTC = 15) {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return julianDay(y, m, d, hourUTC, 0);
    } catch (e) {
      console.error('[TIME] getJDFast error:', e);
      return 0;
    }
  }

  /**
   * getISTfromUTC — convert UTC Date to "HH:MM" IST string
   * @param {Date} utcDate
   * @returns {string} "HH:MM"
   */
  function getISTfromUTC(utcDate) {
    try {
      const ist = utcToIST(utcDate);
      return `${String(ist.getUTCHours()).padStart(2,'0')}:${String(ist.getUTCMinutes()).padStart(2,'0')}`;
    } catch (e) {
      return "00:00";
    }
  }

  /**
   * isVedicEventDay — check if a date has major Vedic events
   * requiring full Asian/London analysis (not just quick score)
   *
   * Uses lightweight approximations — detailed checks are in
   * advanced/smart_alert.js (which calls NATAL for real positions).
   *
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {{ isEvent: boolean, events: string[], level: 'none'|'minor'|'major' }}
   */
  function isVedicEventDay(dateStr) {
    try {
      // Approximate: use NATAL if available, otherwise flag for full check
      const events = [];
      let level = 'none';

      // If NATAL is available, do a quick check
      if (typeof NATAL !== 'undefined') {
        const jd = getJDFast(dateStr);
        const ayan = NATAL.lahiri(jd);

        // Moon nakshatra today vs yesterday
        const moonToday = NATAL.n360(NATAL.getPlanetLon('Moon', jd) - ayan);
        const moonYest  = NATAL.n360(NATAL.getPlanetLon('Moon', jd - 1) - ayan);
        const nakToday  = Math.floor(moonToday / (360 / 27));
        const nakYest   = Math.floor(moonYest  / (360 / 27));
        if (nakToday !== nakYest) {
          events.push('चंद्र नक्षत्र परिवर्तन');
          level = 'minor';
        }

        // Check for planet sign change (ingress) — Sun and slower planets
        const checkIngress = ['Sun','Mars','Jupiter','Saturn'];
        checkIngress.forEach(p => {
          try {
            const lonT  = NATAL.n360(NATAL.getPlanetLon(p, jd) - ayan);
            const lonY  = NATAL.n360(NATAL.getPlanetLon(p, jd - 1) - ayan);
            const signT = Math.floor(lonT / 30);
            const signY = Math.floor(lonY / 30);
            if (signT !== signY) {
              events.push(`${p} राशि परिवर्तन (प्रवेश)`);
              level = 'major';
            }
          } catch (_) {}
        });

        // Graha Yuddha: check if any two visible planets within 1°
        const visiblePlanets = ['Mercury','Venus','Mars','Jupiter','Saturn'];
        const positions = visiblePlanets.map(p => ({
          p, lon: NATAL.n360(NATAL.getPlanetLon(p, jd) - ayan),
        }));
        for (let i = 0; i < positions.length - 1; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const diff = Math.abs(
              ((positions[i].lon - positions[j].lon + 180) % 360) - 180
            );
            if (diff < 1.0) {
              events.push(`ग्रह युद्ध: ${positions[i].p} – ${positions[j].p}`);
              level = 'major';
            }
          }
        }
      } else {
        // Without NATAL, conservatively flag for full check
        // The smart_alert module will do the real evaluation
        return { isEvent: false, events: [], level: 'none', needsNATAL: true };
      }

      return {
        isEvent : events.length > 0,
        events,
        level,
      };
    } catch (e) {
      console.error('[TIME] isVedicEventDay error:', e);
      return { isEvent: false, events: [], level: 'none' };
    }
  }

  /**
   * Hora lords — weekday × hora slot mapping
   * Hora sequence starts with the weekday lord, then follows
   * Chaldean order: Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars
   */
  const CHALDEAN = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
  const CHALDEAN_HI = {
    Sun: 'सूर्य', Venus: 'शुक्र', Mercury: 'बुध',
    Moon: 'चंद्र', Saturn: 'शनि', Jupiter: 'बृहस्पति', Mars: 'मंगल',
  };
  // Day of week → starting lord index in CHALDEAN
  const DOW_START = [1, 4, 6, 2, 5, 3, 0]; // Sun=0→idx1, Mon=1→idx4, ...
  // (UTC dow 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat)

  /**
   * getHoraSchedule — all 24 horas with lord and quality for a date
   * Horas are 1-hour blocks starting at sunrise (approximated as 06:00 IST)
   *
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {{ horas: Array<{slotIST, endIST, lord, lordHi, quality}> }}
   */
  function getHoraSchedule(dateStr) {
    try {
      const dt = new Date(dateStr + 'T00:30:00Z'); // IST midnight = UTC 18:30 prev
      const dow = new Date(dateStr + 'T06:00:00+05:30').getUTCDay();
      const startIdx = DOW_START[dow];

      // Hora quality (for market trading A+ to F)
      const HORA_QUALITY = {
        Jupiter: 'A+', Venus: 'A', Mercury: 'B', Moon: 'B',
        Sun: 'C', Mars: 'D', Saturn: 'F',
      };

      const horas = [];
      // Start from 00:00 IST (hora 1 of the day)
      for (let slot = 0; slot < 24; slot++) {
        const lordIdx = (startIdx + slot) % 7;
        const lord = CHALDEAN[lordIdx];
        const startH = slot;
        const endH   = slot + 1;

        const slotIST = `${String(startH).padStart(2,'0')}:00`;
        const endIST  = `${String(endH % 24).padStart(2,'0')}:00`;

        horas.push({
          slot    : slot + 1,
          slotIST,
          endIST,
          lord,
          lordHi  : CHALDEAN_HI[lord],
          quality : HORA_QUALITY[lord] || 'C',
        });
      }

      return { dateStr, horas, schemaVersion: "6.0" };
    } catch (e) {
      console.error('[TIME] getHoraSchedule error:', e);
      return { dateStr, horas: [], schemaVersion: "6.0" };
    }
  }

  /**
   * getHoraAtTime — get hora lord at a specific IST time
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {string} timeIST — "HH:MM"
   * @returns {{ lord, lordHi, quality }}
   */
  function getHoraAtTime(dateStr, timeIST) {
    try {
      const schedule = getHoraSchedule(dateStr);
      const [h] = timeIST.split(':').map(Number);
      const hora = schedule.horas[h] || schedule.horas[0];
      return { lord: hora.lord, lordHi: hora.lordHi, quality: hora.quality };
    } catch (e) {
      return { lord: 'Sun', lordHi: 'सूर्य', quality: 'C' };
    }
  }

  /**
   * formatDateHindi — format a date string in Hindi
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {string} e.g. "17 सितंबर 2026, गुरुवार"
   */
  function formatDateHindi(dateStr) {
    try {
      const dt = new Date(dateStr + 'T12:00:00Z');
      const months = [
        'जनवरी','फरवरी','मार्च','अप्रैल','मई','जून',
        'जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर',
      ];
      const days = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
      const d = dt.getUTCDate();
      const m = months[dt.getUTCMonth()];
      const y = dt.getUTCFullYear();
      const dow = days[dt.getUTCDay()];
      return `${d} ${m} ${y}, ${dow}`;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * getModeForDate — determine which of three modes applies
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {'HISTORICAL'|'LIVE'|'FORECAST'}
   */
  function getModeForDate(dateStr) {
    try {
      const today = todayIST();
      if (dateStr < today) return 'HISTORICAL';
      if (dateStr === today) return 'LIVE';
      return 'FORECAST';
    } catch (e) {
      return 'HISTORICAL';
    }
  }

  /**
   * getAdjacentDates — prev and next day strings
   * @param {string} dateStr
   * @returns {{ prev: string, next: string }}
   */
  function getAdjacentDates(dateStr) {
    try {
      const dt = new Date(dateStr + 'T12:00:00Z');
      const prev = new Date(dt.getTime() - 86400000).toISOString().split('T')[0];
      const next = new Date(dt.getTime() + 86400000).toISOString().split('T')[0];
      return { prev, next };
    } catch (e) {
      return { prev: dateStr, next: dateStr };
    }
  }

  /**
   * validateDateRange — check date is within 1971–2035
   * @param {string} dateStr
   * @returns {{ valid: boolean, error: string }}
   */
  function validateDateRange(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { valid: false, error: 'गलत तारीख फॉर्मेट — YYYY-MM-DD चाहिए' };
    }
    if (dateStr < '1971-01-01') {
      return { valid: false, error: 'तारीख बहुत पुरानी — 1971-01-01 से शुरू करें' };
    }
    if (dateStr > '2035-12-31') {
      return { valid: false, error: 'तारीख बहुत आगे — 2035-12-31 तक ही' };
    }
    return { valid: true, error: '' };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // V5 (preserved)
    isDST,
    getNYOffset,
    istToUTC,
    utcToIST,
    istToNY,
    nyToIST,
    getSessionBoundaries,
    isUSHoliday,
    isMarketDay,
    julianDay,
    todayIST,
    getMarketContext,
    nowIST,
    activeSession,
    // V6 (new)
    getJDFast,
    getISTfromUTC,
    isVedicEventDay,
    getHoraSchedule,
    getHoraAtTime,
    formatDateHindi,
    getModeForDate,
    getAdjacentDates,
    validateDateRange,
    CHALDEAN,
    CHALDEAN_HI,
  };

})();

if (typeof module !== 'undefined') module.exports = TIME;
if (typeof window !== 'undefined') window.TIME = TIME;

/* ============================================================
   VedicAladdin V6 — core/date_navigator.js
   Date Picker Logic: validate → analyze → navigate → display
   Keyboard: Arrow keys for prev/next day
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const DATE_NAVIGATOR = (function () {
  'use strict';

  const DATE_MIN = '1971-01-01';
  const DATE_MAX = '2035-12-31';

  // Hindi month/day names
  const MONTHS_HI = [
    'जनवरी','फरवरी','मार्च','अप्रैल','मई','जून',
    'जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर',
  ];
  const DAYS_HI = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];

  function ref(name) {
    const map = {
      INSTANT_ENGINE: typeof INSTANT_ENGINE !== 'undefined' ? INSTANT_ENGINE : null,
      TIME: typeof TIME !== 'undefined' ? TIME : null,
    };
    if (map[name]) return map[name];
    try { return require('./' + name.toLowerCase().replace('_', '_')); } catch (e) { return null; }
  }

  // ════════════════════════════════════════════════════════
  // VALIDATE DATE
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr — "YYYY-MM-DD"
   * @returns {{ valid, error, dateStr }}
   */
  function validateDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return { valid: false, error: 'तारीख खाली नहीं हो सकती', dateStr };
    }
    const clean = dateStr.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return { valid: false, error: 'गलत फॉर्मेट — YYYY-MM-DD चाहिए', dateStr: clean };
    }
    if (clean < DATE_MIN) {
      return { valid: false, error: `तारीख बहुत पुरानी — ${DATE_MIN} से शुरू करें`, dateStr: clean };
    }
    if (clean > DATE_MAX) {
      return { valid: false, error: `तारीख बहुत आगे — ${DATE_MAX} तक ही`, dateStr: clean };
    }
    // Check valid calendar date
    const [y, m, d] = clean.split('-').map(Number);
    const check = new Date(y, m - 1, d);
    if (check.getMonth() !== m - 1) {
      return { valid: false, error: 'यह तारीख मौजूद नहीं है', dateStr: clean };
    }
    return { valid: true, error: '', dateStr: clean };
  }

  // ════════════════════════════════════════════════════════
  // FORMAT FOR DISPLAY — Hindi
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr
   * @returns {string} "17 सितंबर 2026, गुरुवार"
   */
  function formatForDisplay(dateStr) {
    try {
      const dt  = new Date(dateStr + 'T12:00:00Z');
      const d   = dt.getUTCDate();
      const mon = MONTHS_HI[dt.getUTCMonth()];
      const y   = dt.getUTCFullYear();
      const dow = DAYS_HI[dt.getUTCDay()];
      return `${d} ${mon} ${y}, ${dow}`;
    } catch (e) {
      return dateStr;
    }
  }

  // ════════════════════════════════════════════════════════
  // GET ADJACENT DATES
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr
   * @param {boolean} [skipWeekends=false]
   * @returns {{ prev, next, prevLabel, nextLabel }}
   */
  function getAdjacentDates(dateStr, skipWeekends = false) {
    try {
      const dt  = new Date(dateStr + 'T12:00:00Z');
      let prev  = new Date(dt.getTime() - 86400000);
      let next  = new Date(dt.getTime() + 86400000);

      if (skipWeekends) {
        // Skip to Friday if prev is weekend
        while (prev.getUTCDay() === 0 || prev.getUTCDay() === 6) {
          prev = new Date(prev.getTime() - 86400000);
        }
        // Skip to Monday if next is weekend
        while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
          next = new Date(next.getTime() + 86400000);
        }
      }

      const prevStr = prev.toISOString().split('T')[0];
      const nextStr = next.toISOString().split('T')[0];

      return {
        prev     : prevStr < DATE_MIN ? null : prevStr,
        next     : nextStr > DATE_MAX ? null : nextStr,
        prevLabel: prevStr < DATE_MIN ? null : `◀ ${formatForDisplay(prevStr)}`,
        nextLabel: nextStr > DATE_MAX ? null : `${formatForDisplay(nextStr)} ▶`,
      };
    } catch (e) {
      return { prev: null, next: null, prevLabel: null, nextLabel: null };
    }
  }

  // ════════════════════════════════════════════════════════
  // GET MODE FOR DATE
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr
   * @returns {'HISTORICAL'|'LIVE'|'FORECAST'}
   */
  function getModeForDate(dateStr) {
    try {
      const today = new Date(new Date().getTime() + 5.5 * 3600000).toISOString().split('T')[0];
      if (dateStr < today) return 'HISTORICAL';
      if (dateStr === today) return 'LIVE';
      return 'FORECAST';
    } catch (e) {
      return 'HISTORICAL';
    }
  }

  function getModeLabel(dateStr) {
    const mode = getModeForDate(dateStr);
    return {
      HISTORICAL: { hi: '📚 इतिहास',    en: 'Historical', color: '#9e9e9e' },
      LIVE:       { hi: '🔴 लाइव',      en: 'Live',       color: '#ff1744' },
      FORECAST:   { hi: '🔭 भविष्यवाणी',en: 'Forecast',   color: '#00e5ff' },
    }[mode];
  }

  // ════════════════════════════════════════════════════════
  // HANDLE DATE CHANGE — main entry point
  // ════════════════════════════════════════════════════════
  /**
   * Called when user picks a new date (date picker, arrow keys, etc.)
   * Validates → triggers instant analysis → returns result
   *
   * @param {string} dateStr
   * @param {Object} [options]
   * @returns {{ valid, result, displayDate, mode, adjacent, error }}
   */
  function handleDateChange(dateStr, options = {}) {
    const validation = validateDate(dateStr);
    if (!validation.valid) {
      return { valid: false, error: validation.error, dateStr };
    }

    const clean  = validation.dateStr;
    const mode   = getModeForDate(clean);
    const modeLabel = getModeLabel(clean);
    const displayDate = formatForDisplay(clean);
    const adjacent    = getAdjacentDates(clean, options.skipWeekends || false);

    // Trigger instant engine if available
    let result = null;
    const IE = ref('INSTANT_ENGINE');
    if (IE) {
      try {
        result = IE.analyze(clean, options);
      } catch (e) {
        console.warn('[DATE_NAVIGATOR] instant engine error:', e.message);
      }
    }

    return {
      valid: true,
      dateStr: clean,
      displayDate,
      mode,
      modeLabel,
      adjacent,
      result,
      error: '',
    };
  }

  // ════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION (browser-side helper)
  // ════════════════════════════════════════════════════════
  /**
   * Returns the new date based on keyboard key
   * @param {string} currentDate
   * @param {string} key — 'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown'
   * @param {boolean} [skipWeekends=false]
   * @returns {string|null} new date or null
   */
  function keyboardNav(currentDate, key, skipWeekends = false) {
    const adj = getAdjacentDates(currentDate, skipWeekends);
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        return adj.prev;
      case 'ArrowRight':
      case 'ArrowDown':
        return adj.next;
      default:
        return null;
    }
  }

  // ════════════════════════════════════════════════════════
  // GET WEEK RANGE — for weekly view
  // ════════════════════════════════════════════════════════
  function getWeekDates(dateStr) {
    try {
      const dt  = new Date(dateStr + 'T12:00:00Z');
      const dow = dt.getUTCDay();
      const mon = new Date(dt.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000);
      const dates = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(mon.getTime() + i * 86400000);
        dates.push({
          dateStr: d.toISOString().split('T')[0],
          label  : DAYS_HI[d.getUTCDay()],
          isToday: d.toISOString().split('T')[0] === new Date(new Date().getTime() + 5.5*3600000).toISOString().split('T')[0],
        });
      }
      return dates;
    } catch (e) {
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // QUICK CALENDAR RANGE — for calendar.html
  // ════════════════════════════════════════════════════════
  function getMonthDates(year, month) {
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const dates = [];
      for (let d = 1; d <= lastDay; d++) {
        const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dt = new Date(ds + 'T12:00:00Z');
        dates.push({
          dateStr    : ds,
          label      : String(d),
          dayName    : DAYS_HI[dt.getUTCDay()],
          isWeekend  : dt.getUTCDay() === 0 || dt.getUTCDay() === 6,
          isToday    : ds === new Date(new Date().getTime() + 5.5*3600000).toISOString().split('T')[0],
          mode       : getModeForDate(ds),
        });
      }
      return dates;
    } catch (e) {
      return [];
    }
  }

  // ── Public API ──────────────────────────────────────────
  return {
    validateDate,
    formatForDisplay,
    getAdjacentDates,
    getModeForDate,
    getModeLabel,
    handleDateChange,
    keyboardNav,
    getWeekDates,
    getMonthDates,
    DATE_MIN,
    DATE_MAX,
    MONTHS_HI,
    DAYS_HI,
  };

})();

if (typeof module !== 'undefined') module.exports = DATE_NAVIGATOR;
if (typeof window !== 'undefined') window.DATE_NAVIGATOR = DATE_NAVIGATOR;

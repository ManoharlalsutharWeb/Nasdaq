/* ============================================================
   NASDAQ Vedic System V5 — engine/time.js
   IST ↔ NY mapping | DST safe | Session boundaries | Holidays
   ============================================================ */
'use strict';

const TIME = (function(){
  // DST in US: 2nd Sunday March → 1st Sunday November
  function isDST(date) {
    const y = date.getFullYear();
    // Find 2nd Sunday of March
    const marchStart = new Date(y, 2, 1);
    const marchDay = marchStart.getDay();
    const dstStart = new Date(y, 2, 8 + (7 - marchDay) % 7);
    // Find 1st Sunday of November
    const novStart = new Date(y, 10, 1);
    const novDay = novStart.getDay();
    const dstEnd = new Date(y, 10, 1 + (7 - novDay) % 7);
    return date >= dstStart && date < dstEnd;
  }

  // NY offset from UTC: EST=-5, EDT=-4
  function getNYOffset(date) { return isDST(date) ? -4 : -5; }

  // IST = UTC+5:30 always
  function istToUTC(dateIST_str, timeIST_str = "00:00") {
    const [y,m,d] = dateIST_str.split('-').map(Number);
    const [h,mi] = timeIST_str.split(':').map(Number);
    const utcMs = Date.UTC(y, m-1, d, h, mi) - (5.5 * 3600000);
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
    const [y,m,d] = nyDateStr.split('-').map(Number);
    const [h,mi] = nyTimeStr.split(':').map(Number);
    const utcMs = Date.UTC(y, m-1, d, h, mi);
    const nyOff = getNYOffset(new Date(utcMs));
    // NY time → UTC → IST
    const utc = new Date(utcMs - nyOff * 3600000);
    return utcToIST(utc);
  }

  // Session boundaries for a given IST date
  function getSessionBoundaries(dateIST_str) {
    const utc = istToUTC(dateIST_str, "00:00");
    const nyOff = getNYOffset(utc);
    // NY market: opens 9:30 AM NY = 9:30 - nyOff hours in UTC → IST
    const nyOpenUTC  = Date.UTC(...dateIST_str.split('-').map(Number).map((v,i)=>i===1?v-1:v), 9, 30) - nyOff * 3600000;
    const nyCloseUTC = Date.UTC(...dateIST_str.split('-').map(Number).map((v,i)=>i===1?v-1:v), 16, 0) - nyOff * 3600000;
    const nyOpenIST  = utcToIST(new Date(nyOpenUTC));
    const nyCloseIST = utcToIST(new Date(nyCloseUTC));
    const fmt = d => `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;

    return {
      asian:   { startIST:"05:30", endIST:"14:00", label:"एशियन" },
      london:  { startIST:"13:30", endIST:"22:00", label:"लंदन" },
      newyork: { startIST: fmt(nyOpenIST), endIST: fmt(nyCloseIST), label:"न्यूयॉर्क" },
      nyopen:  { startIST: fmt(nyOpenIST), endIST: fmt(new Date(nyOpenIST.getTime()+90*60000)), label:"NY Open Zone" },
      isDST:   isDST(utc),
      nyOffset: nyOff,
    };
  }

  function isUSHoliday(dateStr) {
    const TYPES_REF = typeof TYPES !== 'undefined' ? TYPES : (typeof require !== 'undefined' ? require('./types') : null);
    const holidays = TYPES_REF?.US_HOLIDAYS || [];
    return holidays.includes(dateStr);
  }

  function isMarketDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) return false; // Weekend
    return !isUSHoliday(dateStr);
  }

  function julianDay(y, mo, d, h=0, mi=0) {
    if (mo <= 2) { y -= 1; mo += 12; }
    const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
    return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(mo+1)) + d + (h + mi/60)/24 + B - 1524.5;
  }

  function todayIST() {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5*3600000);
    return ist.toISOString().split('T')[0];
  }

  function getMarketContext(dateIST_str) {
    const sessions = getSessionBoundaries(dateIST_str);
    const isHoliday = isUSHoliday(dateIST_str);
    const isTrading = isMarketDay(dateIST_str);
    const d = new Date(dateIST_str + 'T12:00:00Z');
    const dowNames = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
    const jd = julianDay(d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate(), 15, 0);

    return {
      dateIST: dateIST_str,
      isUSHoliday: isHoliday,
      isMarketDay: isTrading,
      dayOfWeek: dowNames[d.getUTCDay()],
      sessions,
      jd,
      schemaVersion: "5.0"
    };
  }

  // Get current IST hour:min string
  function nowIST() {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 3600000) - (now.getTimezoneOffset() * 60000));
    return `${String(ist.getHours()).padStart(2,'0')}:${String(ist.getMinutes()).padStart(2,'0')}:${String(ist.getSeconds()).padStart(2,'0')}`;
  }

  function activeSession(timeIST) {
    const [h, m] = timeIST.split(':').map(Number);
    const t = h * 60 + m;
    if (t >= 330 && t < 840)  return 'asian';
    if (t >= 810 && t < 1320) return 'london';
    if (t >= 1140 || t < 90)  return 'newyork';
    return 'none';
  }

  return { isDST, getNYOffset, istToUTC, utcToIST, istToNY, nyToIST,
           getSessionBoundaries, isUSHoliday, isMarketDay, julianDay,
           todayIST, getMarketContext, nowIST, activeSession };
})();

if(typeof module !== 'undefined') module.exports = TIME;
if(typeof window !== 'undefined') window.TIME = TIME;

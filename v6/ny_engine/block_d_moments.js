/* ============================================================
   VedicAladdin V6 — ny_engine/block_d_moments.js
   Block D: Key Exact Moments Tonight
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BLOCK_D_MOMENTS = (function () {
  'use strict';

  function getEconomicEvents(dateStr) {
    var parts = dateStr.split('-').map(Number);
    var m = parts[1], d = parts[2];
    var dow = new Date(dateStr+'T12:00:00Z').getUTCDay();
    var events = [];
    var FOMC_MONTHS = [1,3,5,6,7,9,11,12];
    if (dow===3 && FOMC_MONTHS.indexOf(m)>=0)
      events.push({ timeIST:'02:00', event:'FOMC निर्णय संभव', impact:'HIGH', hi:'Federal Reserve दर निर्णय — बड़ी प्रतिक्रिया संभव' });
    if (dow===5 && d<=7)
      events.push({ timeIST:'19:00', event:'Non-Farm Payrolls', impact:'HIGH', hi:'रोज़गार डेटा — NY Open पर बड़ी चाल' });
    if (d>=10 && d<=15 && dow===3)
      events.push({ timeIST:'19:00', event:'CPI मुद्रास्फीति', impact:'HIGH', hi:'महंगाई डेटा — रेट अनुमान बदल सकते हैं' });
    return events;
  }

  function getPlanetaryMoments(dateStr, transitReport) {
    var aspects = (transitReport && transitReport.aspects && transitReport.aspects.filter(function(a){ return a.orb < 0.5; })) || [];
    return aspects.slice(0,5).map(function(a){
      return {
        timeIST:'--:--', planet:a.fromEng,
        event: a.fromEng+'→'+a.toEng+': '+a.aspectEng+' ('+a.orb.toFixed(2)+'° orb)',
        impact: Math.abs(a.score)>=3 ? 'HIGH':'MEDIUM',
        hi: a.from+'–'+a.to+' '+a.aspect+': '+(a.score>0?'बुलिश':'बियरिश')+' ('+a.score+')',
      };
    });
  }

  function getSessionTurningPoints() {
    return ['19:15','20:30','22:00','23:30','00:30'].map(function(t){
      return { timeIST:t, hi:t+' IST — होरा बदलने पर दिशा जाँचें' };
    });
  }

  function formatMoments(planetary, economic, turning) {
    var all = []
      .concat(economic.map(function(e){ return '📢 '+e.timeIST+' — '+e.hi; }))
      .concat(planetary.map(function(p){ return '🪐 '+p.hi; }))
      .concat(turning.slice(0,3).map(function(t){ return '⏰ '+t.hi; }));
    return all.length ? all.join('\n') : 'कोई विशेष क्षण नहीं';
  }

  function run(dateStr, natalD1, transitReport) {
    var planetary = getPlanetaryMoments(dateStr, transitReport);
    var economic  = getEconomicEvents(dateStr);
    var turning   = getSessionTurningPoints();
    return { planetary:planetary, economic:economic, turning:turning,
             formattedHindi: formatMoments(planetary, economic, turning),
             totalEvents: planetary.length + economic.length, schemaVersion:"6.0" };
  }

  return { getPlanetaryMoments:getPlanetaryMoments, getEconomicEvents:getEconomicEvents,
           getSessionTurningPoints:getSessionTurningPoints, formatMoments:formatMoments, run:run };
})();

if (typeof module !== 'undefined') module.exports = BLOCK_D_MOMENTS;
if (typeof window !== 'undefined') window.BLOCK_D_MOMENTS = BLOCK_D_MOMENTS;

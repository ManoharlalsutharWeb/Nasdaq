/* ============================================================
   VedicAladdin V6 — ny_engine/block_e_crash.js
   Block E: Crash Intelligence — All 21 Rules + Meter
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BLOCK_E_CRASH = (function () {
  'use strict';

  function getR() {
    if (typeof REGIME !== 'undefined') return REGIME;
    try { return require('../core/regime'); } catch(e) { return null; }
  }

  function getRiskCategory(score) {
    if (score >= 80) return { cat:'EXTREME', hi:'अत्यंत खतरनाक', color:'#ff1744' };
    if (score >= 60) return { cat:'HIGH',    hi:'उच्च जोखिम',    color:'#ff6d00' };
    if (score >= 40) return { cat:'MODERATE',hi:'मध्यम जोखिम',   color:'#ffd740' };
    if (score >= 20) return { cat:'LOW',     hi:'कम जोखिम',      color:'#69f0ae' };
    return             { cat:'MINIMAL',      hi:'न्यूनतम जोखिम', color:'#00e676' };
  }

  function formatCrashReport(triggered, notTriggered, score, category) {
    var lines = ['🎯 CRASH INTELLIGENCE — स्कोर: '+score+'/100 ('+category.hi+')',
                 '\n✅ ट्रिगर हुए नियम ('+triggered.length+'):'];
    triggered.forEach(function(r){ lines.push('  ✅ ['+r.weight+'] '+r.desc); });
    lines.push('\n❌ ट्रिगर नहीं हुए ('+(notTriggered.length)+'):');
    notTriggered.slice(0,5).forEach(function(r){ lines.push('  ❌ '+r.desc); });
    if (notTriggered.length>5) lines.push('  ... और '+(notTriggered.length-5)+' अन्य');
    return lines.join('\n');
  }

  function run(dateStr, natalD1, transitReport, eventsReport) {
    var R = getR();
    if (!R) return { score:0, category:getRiskCategory(0), triggered:[], notTriggered:[], formattedHindi:'REGIME मॉड्यूल उपलब्ध नहीं', schemaVersion:"6.0" };
    var regDay = R.detectDay(transitReport, natalD1, null, eventsReport);
    var category = getRiskCategory(regDay.crashProbability);
    return {
      score: regDay.crashProbability,
      category: category,
      triggered: regDay.triggered||[],
      notTriggered: regDay.notTriggered||[],
      formattedHindi: formatCrashReport(regDay.triggered||[], regDay.notTriggered||[], regDay.crashProbability, category),
      schemaVersion: "6.0",
    };
  }

  return { getRiskCategory:getRiskCategory, formatCrashReport:formatCrashReport, run:run };
})();

if (typeof module !== 'undefined') module.exports = BLOCK_E_CRASH;
if (typeof window !== 'undefined') window.BLOCK_E_CRASH = BLOCK_E_CRASH;

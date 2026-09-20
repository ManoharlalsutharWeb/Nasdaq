/* ============================================================
   VedicAladdin V6 — ny_engine/block_f_ml.js
   Block F: ML Pattern Recognition for Tonight
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BLOCK_F_ML = (function () {
  'use strict';

  function getPM() {
    if (typeof PATTERN_MATCHER !== 'undefined') return PATTERN_MATCHER;
    try { return require('../advanced/pattern_matcher'); } catch(e) { return null; }
  }

  function getSimilarHistoricalDates(dateStr, limit) {
    var PM = getPM();
    if (!PM) return [];
    return PM.findSimilarDates(dateStr, limit||3);
  }

  function getMLVerdict(matches) {
    var PM = getPM();
    if (!PM || !matches.length) return 'ML पैटर्न डेटा उपलब्ध नहीं';
    return PM.generateMLVerdict(matches);
  }

  function formatMLReport(matches, verdict) {
    if (!matches.length) return 'ML: कोई मिलता-जुलता ऐतिहासिक पैटर्न नहीं।';
    var lines = ['🤖 ML पैटर्न विश्लेषण:'];
    matches.forEach(function(m,i){ lines.push((i+1)+'. '+m.hindiText); });
    lines.push('\n🔮 '+(verdict.split('\n').pop()||verdict));
    return lines.join('\n');
  }

  function run(dateStr) {
    var matches = getSimilarHistoricalDates(dateStr, 3);
    var verdict = getMLVerdict(matches);
    var bulls = matches.filter(function(m){ return m.direction==='BULL'; }).length;
    var bears = matches.filter(function(m){ return m.direction==='BEAR'; }).length;
    var mlDir = bulls>bears?'BULL':bears>bulls?'BEAR':'NEUTRAL';
    var avgSim = matches.length ? matches.reduce(function(s,m){ return s+m.similarityPct; },0)/matches.length : 50;
    return { matches:matches, verdict:verdict, mlDirection:mlDir,
             avgSimilarity:parseFloat(avgSim.toFixed(1)),
             formattedHindi:formatMLReport(matches,verdict), schemaVersion:"6.0" };
  }

  return { getSimilarHistoricalDates:getSimilarHistoricalDates, getMLVerdict:getMLVerdict,
           formatMLReport:formatMLReport, run:run };
})();

if (typeof module !== 'undefined') module.exports = BLOCK_F_ML;
if (typeof window !== 'undefined') window.BLOCK_F_ML = BLOCK_F_ML;

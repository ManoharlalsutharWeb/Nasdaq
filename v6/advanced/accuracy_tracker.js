/* ============================================================
   VedicAladdin V6 — advanced/accuracy_tracker.js
   Tracks prediction accuracy over time
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const ACCURACY_TRACKER = (function () {
  'use strict';

  // In-memory log (persisted via API POST /outcome in production)
  const _log = [];

  function record(date, predictedSignal, actualMove) {
    const dir     = ['STRONG_BULL','BULL'].includes(predictedSignal) ? 'BULL'
                  : ['STRONG_BEAR','BEAR'].includes(predictedSignal) ? 'BEAR' : 'NEUTRAL';
    const correct = Math.abs(actualMove) < 0.3 ? dir === 'NEUTRAL'
                  : actualMove > 0.3 ? dir === 'BULL' : dir === 'BEAR';
    const entry = { date, predictedSignal, dir, actualMove: parseFloat(actualMove.toFixed(2)),
                    correct, ts: new Date().toISOString(), schemaVersion:"6.0" };
    _log.push(entry);
    return entry;
  }

  function getStats() {
    if (!_log.length) return { count:0, accuracy:null, hindiSummary:'कोई डेटा नहीं' };
    const correct = _log.filter(e => e.correct).length;
    const accuracy = parseFloat((correct/_log.length*100).toFixed(1));
    const bySignal = {};
    _log.forEach(e => {
      if (!bySignal[e.dir]) bySignal[e.dir] = { total:0, correct:0 };
      bySignal[e.dir].total++;
      if (e.correct) bySignal[e.dir].correct++;
    });
    return {
      count: _log.length, correct, accuracy, bySignal,
      hindiSummary: `${_log.length} पूर्वानुमान | सटीकता: ${accuracy}%`,
      log: _log.slice(-30), // last 30
      schemaVersion:"6.0",
    };
  }

  function getRecentLog(n) { return _log.slice(-( n || 30 )); }
  function clearLog()      { _log.length = 0; }

  return { record, getStats, getRecentLog, clearLog };
})();

if (typeof module !== 'undefined') module.exports = ACCURACY_TRACKER;
if (typeof window !== 'undefined') window.ACCURACY_TRACKER = ACCURACY_TRACKER;

/* ===========================================================

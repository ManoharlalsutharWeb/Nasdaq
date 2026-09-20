/* ============================================================
   VedicAladdin V6 — advanced/backtester.js
   Historical Backtesting — Vedic signals vs actual NASDAQ
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BACKTESTER = (function () {
  'use strict';

  function getIE() {
    return typeof INSTANT_ENGINE !== 'undefined' ? INSTANT_ENGINE :
           (() => { try { return require('../core/instant_engine'); } catch(e){ return null; } })();
  }

  // Known historical NASDAQ daily outcomes (approximate)
  // For real accuracy tracking, hook into market_fetcher.js
  const KNOWN_OUTCOMES = {
    '2008-09-15': -4.94, '2008-09-16':  1.33, '2008-09-17': -2.12,
    '2009-03-09': -1.01, '2009-03-10':  5.81, '2009-03-11':  2.34,
    '2020-02-19': -0.30, '2020-02-20': -1.79, '2020-02-24': -3.71,
    '2020-03-23': -0.32, '2020-03-24':  8.12, '2020-03-25':  2.26,
    '2020-11-09':  9.06, '2020-11-10':  1.97,
    '2022-01-04':  0.05, '2022-01-05': -1.54, '2022-01-06': -0.96,
    '2022-10-13': -0.65, '2022-10-14':  2.23, '2022-10-17':  0.90,
    '2023-01-03': -0.76, '2023-01-04':  2.20, '2023-01-05': -1.00,
    '2023-02-02':  3.25, '2023-06-15':  1.14, '2023-07-27':  1.90,
    '2024-01-02': -1.63, '2024-03-21':  0.65, '2024-07-19': -2.77,
    '2024-12-18': -3.60, '2025-01-02': -0.16,
  };

  // ── Signal → direction mapping ────────────────────────────
  function signalToDir(signal) {
    if (['STRONG_BULL','BULL'].includes(signal)) return 'BULL';
    if (['STRONG_BEAR','BEAR'].includes(signal)) return 'BEAR';
    return 'NEUTRAL';
  }

  // ── Was the signal correct? ────────────────────────────────
  function wasCorrect(signalDir, actualMove) {
    if (Math.abs(actualMove) < 0.3) return signalDir === 'NEUTRAL';
    if (actualMove > 0.3) return signalDir === 'BULL';
    return signalDir === 'BEAR';
  }

  // ── Run backtest for a set of dates ──────────────────────
  /**
   * @param {string[]} dates — array of "YYYY-MM-DD"
   * @param {Object} [knownOutcomes] — optional { date: movePercent }
   * @returns {Object} backtest results with accuracy stats
   */
  function runBacktest(dates, knownOutcomes) {
    const IE       = getIE();
    const outcomes = { ...KNOWN_OUTCOMES, ...(knownOutcomes || {}) };
    const results  = [];

    dates.forEach(dateStr => {
      try {
        const prediction = IE ? IE.analyze(dateStr) : { signal:'NEUTRAL', confidence:50 };
        const actual     = outcomes[dateStr];
        const predictDir = signalToDir(prediction.signal);
        const correct    = actual !== undefined ? wasCorrect(predictDir, actual) : null;

        results.push({
          date       : dateStr,
          signal     : prediction.signal,
          signalDir  : predictDir,
          confidence : prediction.confidence,
          actualMove : actual !== undefined ? parseFloat(actual.toFixed(2)) : null,
          correct,
          hasActual  : actual !== undefined,
          schemaVersion: "6.0",
        });
      } catch (e) {
        results.push({ date:dateStr, error: e.message });
      }
    });

    // Stats (only dates with known outcomes)
    const withActual = results.filter(r => r.hasActual && r.correct !== null);
    const correct    = withActual.filter(r => r.correct).length;
    const accuracy   = withActual.length ? parseFloat((correct/withActual.length*100).toFixed(1)) : null;

    // By signal type
    const bySignal = {};
    withActual.forEach(r => {
      const key = r.signalDir;
      if (!bySignal[key]) bySignal[key] = { total:0, correct:0 };
      bySignal[key].total++;
      if (r.correct) bySignal[key].correct++;
    });
    Object.keys(bySignal).forEach(k => {
      bySignal[k].accuracy = parseFloat((bySignal[k].correct/bySignal[k].total*100).toFixed(1));
    });

    return {
      dates: dates.length,
      withActual: withActual.length,
      correct,
      accuracy,
      bySignal,
      results,
      hindiSummary: accuracy !== null
        ? `बैकटेस्ट: ${withActual.length} तारीखें | सटीकता: ${accuracy}% | ${correct} सही पूर्वानुमान`
        : `बैकटेस्ट: ${dates.length} तारीखें (कोई ज्ञात परिणाम नहीं)`,
      schemaVersion: "6.0",
    };
  }

  // ── Quick backtest on known dates ───────────────────────
  function runKnownDatesBacktest() {
    const dates = Object.keys(KNOWN_OUTCOMES).sort();
    return runBacktest(dates);
  }

  // ── Date range backtest (samples every N days) ───────────
  function runRangeBacktest(fromDate, toDate, sampleEvery, knownOutcomes) {
    sampleEvery = sampleEvery || 7;
    const dates = [];
    let cursor  = new Date(fromDate + 'T12:00:00Z');
    const end   = new Date(toDate   + 'T12:00:00Z');
    while (cursor <= end) {
      dates.push(cursor.toISOString().split('T')[0]);
      cursor = new Date(cursor.getTime() + sampleEvery * 86400000);
    }
    return runBacktest(dates, knownOutcomes);
  }

  // ── Add actual outcome ───────────────────────────────────
  function addOutcome(date, movePercent) {
    KNOWN_OUTCOMES[date] = movePercent;
    return { added: true, date, movePercent };
  }

  return {
    KNOWN_OUTCOMES, runBacktest, runKnownDatesBacktest,
    runRangeBacktest, addOutcome, signalToDir, wasCorrect,
  };
})();

if (typeof module !== 'undefined') module.exports = BACKTESTER;
if (typeof window !== 'undefined') window.BACKTESTER = BACKTESTER;

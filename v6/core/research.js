/* ============================================================
   VedicAladdin V6 — core/research.js
   Research Utilities — V5 preserved + V6 schema
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const RESEARCH = (function () {
  'use strict';

  function getNatal()    { return typeof NATAL    !== 'undefined' ? NATAL    : require('./natal');    }
  function getDasha()    { return typeof DASHA    !== 'undefined' ? DASHA    : require('./dasha');    }
  function getTransits() { return typeof TRANSITS !== 'undefined' ? TRANSITS : require('./transits'); }

  // ── Range analysis ────────────────────────────────────────
  function analyzeRange(fromDate, toDate, sampleEvery = 7) {
    const N = getNatal(), D = getDasha(), T = getTransits();
    const nasdaq  = N.getNasdaq();
    const birth   = N.NASDAQ_BIRTH;
    const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
    const moonSid = nasdaq.planets.find(p => p.eng === 'Moon')?.sidLon || 0;

    const from = new Date(fromDate + 'T12:00:00Z');
    const to   = new Date(toDate   + 'T12:00:00Z');
    const results = [];
    let cursor = new Date(from);

    while (cursor <= to) {
      const ds = cursor.toISOString().split('T')[0];
      try {
        const [y,m,d] = ds.split('-').map(Number);
        const jd    = N.JD(y,m,d,15,0);
        const ayan  = N.lahiri(jd);
        const dasha = D.getCurrent(birthJD, moonSid, jd);
        const tr    = T.buildReport(ds, nasdaq);
        results.push({
          date: ds,
          signal: tr.totalScore > 5 ? 'BULL' : tr.totalScore < -5 ? 'BEAR' : 'NEUT',
          score : parseFloat(tr.totalScore.toFixed(2)),
          dasha : dasha?.maha || '—',
          nak   : tr.panchang?.nakHi || '—',
        });
      } catch (e) {
        results.push({ date: ds, error: e.message });
      }
      cursor = new Date(cursor.getTime() + sampleEvery * 86400000);
    }

    const bull  = results.filter(r => r.signal === 'BULL').length;
    const bear  = results.filter(r => r.signal === 'BEAR').length;
    const neut  = results.filter(r => r.signal === 'NEUT').length;

    return {
      fromDate, toDate, sampleEvery, total: results.length,
      bull, bear, neut,
      bullPct: parseFloat((bull/results.length*100).toFixed(1)),
      bearPct: parseFloat((bear/results.length*100).toFixed(1)),
      results,
      schemaVersion: "6.0",
    };
  }

  // ── Find extreme dates ────────────────────────────────────
  function findExtremeDates(fromDate, toDate, threshold = 15) {
    const res = analyzeRange(fromDate, toDate, 1);
    return {
      strongBull: res.results.filter(r => r.score >= threshold),
      strongBear: res.results.filter(r => r.score <= -threshold),
      schemaVersion: "6.0",
    };
  }

  // ── Dasha performance study ───────────────────────────────
  function dashaPerformance(fromDate, toDate) {
    const res = analyzeRange(fromDate, toDate, 1);
    const byDasha = {};
    res.results.forEach(r => {
      if (!r.dasha) return;
      if (!byDasha[r.dasha]) byDasha[r.dasha] = { count:0, bull:0, bear:0, scores:[] };
      byDasha[r.dasha].count++;
      if (r.signal==='BULL') byDasha[r.dasha].bull++;
      if (r.signal==='BEAR') byDasha[r.dasha].bear++;
      byDasha[r.dasha].scores.push(r.score||0);
    });

    return Object.entries(byDasha).map(([maha, data]) => ({
      maha,
      count   : data.count,
      bullPct : parseFloat((data.bull/data.count*100).toFixed(1)),
      bearPct : parseFloat((data.bear/data.count*100).toFixed(1)),
      avgScore: parseFloat((data.scores.reduce((a,b)=>a+b,0)/data.scores.length).toFixed(2)),
    })).sort((a,b) => b.avgScore - a.avgScore);
  }

  return { analyzeRange, findExtremeDates, dashaPerformance };
})();

if (typeof module !== 'undefined') module.exports = RESEARCH;
if (typeof window !== 'undefined') window.RESEARCH = RESEARCH;

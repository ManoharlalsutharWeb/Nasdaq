/* ============================================================
   VedicAladdin V6 — advanced/pattern_matcher.js
   Historical Pattern Matching — find similar planetary dates
   10 key historical anchor dates hardcoded + dynamic matching
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const PATTERN_MATCHER = (function () {
  'use strict';

  function getNatal()    { return typeof NATAL      !== 'undefined' ? NATAL      : require('../core/natal');      }
  function getMLEngine() { return typeof ML_ENGINE  !== 'undefined' ? ML_ENGINE  : require('./ml_engine');       }

  // ════════════════════════════════════════════════════════
  // KEY HISTORICAL ANCHOR DATES (hardcoded outcomes)
  // ════════════════════════════════════════════════════════
  const ANCHOR_DATES = [
    { date:'2000-03-10', outcomeMonths1:-0.20, outcomeYear:-0.78, desc:'डॉट-कॉम पीक — बाद में -78%', direction:'BEAR' },
    { date:'2002-10-09', outcomeMonths1: 0.15, outcomeYear: 1.00, desc:'डॉट-कॉम तल — बाद में +100%',  direction:'BULL' },
    { date:'2008-09-15', outcomeMonths1:-0.30, outcomeYear:-0.45, desc:'लेहमैन क्रैश — बाद में -45%', direction:'BEAR' },
    { date:'2009-03-09', outcomeMonths1: 0.20, outcomeYear: 0.70, desc:'संकट तल — बाद में +400%',      direction:'BULL' },
    { date:'2020-02-19', outcomeMonths1:-0.35, outcomeYear:-0.15, desc:'COVID पीक — 1 माह -35%',       direction:'BEAR' },
    { date:'2020-03-23', outcomeMonths1: 0.25, outcomeYear: 1.20, desc:'COVID तल — बाद में +120%',     direction:'BULL' },
    { date:'2020-11-09', outcomeMonths1: 0.15, outcomeYear: 0.28, desc:'वैक्सीन रैली — +15%',          direction:'BULL' },
    { date:'2022-01-04', outcomeMonths1:-0.20, outcomeYear:-0.35, desc:'रेट हाइक — बाद में -35%',      direction:'BEAR' },
    { date:'2022-10-13', outcomeMonths1: 0.12, outcomeYear: 0.50, desc:'बियर तल — बाद में +50%',       direction:'BULL' },
    { date:'2023-01-01', outcomeMonths1: 0.08, outcomeYear: 0.45, desc:'AI बुल रन — +45% 1 वर्ष',     direction:'BULL' },
  ];

  // Cache for pre-computed anchor features
  let _anchorCache = null;

  // ════════════════════════════════════════════════════════
  // buildAnchorCache — pre-compute features for all anchors
  // ════════════════════════════════════════════════════════
  function buildAnchorCache() {
    if (_anchorCache) return _anchorCache;
    const ML = getMLEngine();
    _anchorCache = ANCHOR_DATES.map(a => {
      try {
        const features = ML.extractFeatures(a.date);
        return { ...a, features };
      } catch (e) {
        return { ...a, features: new Array(25).fill(0) };
      }
    });
    return _anchorCache;
  }

  // ════════════════════════════════════════════════════════
  // getSimilarityScore — cosine similarity between feature vectors
  // ════════════════════════════════════════════════════════
  function getSimilarityScore(f1, f2) {
    try {
      if (!f1 || !f2 || f1.length !== f2.length) return 0;
      let dot = 0, mag1 = 0, mag2 = 0;
      for (let i = 0; i < f1.length; i++) {
        dot  += (f1[i] || 0) * (f2[i] || 0);
        mag1 += (f1[i] || 0) ** 2;
        mag2 += (f2[i] || 0) ** 2;
      }
      const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
      if (denom === 0) return 0;
      // cosine similarity: -1 to 1 → normalize to 0-100
      const cosine = dot / denom;
      return parseFloat(((cosine + 1) / 2 * 100).toFixed(1));
    } catch (e) {
      return 0;
    }
  }

  // ════════════════════════════════════════════════════════
  // findSimilarDates — top N matches for a given date
  // ════════════════════════════════════════════════════════
  /**
   * @param {string} dateStr — "YYYY-MM-DD"
   * @param {number} [limit=3]
   * @returns {Array<PatternMatch>}
   */
  function findSimilarDates(dateStr, limit = 3) {
    try {
      const ML      = getMLEngine();
      const anchors = buildAnchorCache();
      const target  = ML.extractFeatures(dateStr);

      const scored = anchors.map(a => ({
        ...a,
        similarity: getSimilarityScore(target, a.features),
      })).sort((a, b) => b.similarity - a.similarity);

      return scored.slice(0, limit).map(m => ({
        date           : m.date,
        similarityPct  : m.similarity,
        nasdaqOutcome1M: parseFloat((m.outcomeMonths1 * 100).toFixed(1)),
        nasdaqOutcomeYr: parseFloat((m.outcomeYear * 100).toFixed(1)),
        description    : m.desc,
        direction      : m.direction,
        hindiText      : `${m.date}: ${m.similarity.toFixed(1)}% मिलान — NASDAQ: ${m.outcomeMonths1 > 0 ? '+' : ''}${(m.outcomeMonths1*100).toFixed(0)}% (1 माह) | ${m.desc}`,
        schemaVersion  : "6.0",
      }));
    } catch (e) {
      console.error('[PATTERN_MATCHER] findSimilarDates error:', e);
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // getHistoricalOutcome — lookup stored outcome for a date
  // ════════════════════════════════════════════════════════
  function getHistoricalOutcome(dateStr) {
    const anchor = ANCHOR_DATES.find(a => a.date === dateStr);
    if (!anchor) return null;
    return {
      date         : anchor.date,
      outcome1M    : anchor.outcomeMonths1,
      outcomeYr    : anchor.outcomeYear,
      direction    : anchor.direction,
      description  : anchor.desc,
    };
  }

  // ════════════════════════════════════════════════════════
  // generateMLVerdict — Hindi summary from matches
  // ════════════════════════════════════════════════════════
  function generateMLVerdict(matches) {
    if (!matches || matches.length === 0) {
      return 'ML डेटाबेस में कोई मिलता-जुलता पैटर्न नहीं मिला।';
    }

    const bulls = matches.filter(m => m.direction === 'BULL').length;
    const bears = matches.filter(m => m.direction === 'BEAR').length;
    const totalSim = matches.reduce((s, m) => s + m.similarityPct, 0);
    const avgSim   = totalSim / matches.length;

    const dir = bulls > bears ? 'तेजी' : bears > bulls ? 'मंदी' : 'तटस्थ';
    const conf = avgSim > 70 ? 'उच्च' : avgSim > 50 ? 'मध्यम' : 'कम';

    const lines = [
      `अाज जैसा पैटर्न ${matches.length} बार आया था:`,
      ...matches.map((m, i) => `${i+1}. ${m.hindiText}`),
      `ML फैसला: ${dir} — ${conf} विश्वास (औसत मिलान ${avgSim.toFixed(0)}%)`,
    ];

    return lines.join('\n');
  }

  // ════════════════════════════════════════════════════════
  // buildPatternLibrary — pre-compute features for a year range
  // (expensive — use sparingly, cache result)
  // ════════════════════════════════════════════════════════
  function buildPatternLibrary(yearStart, yearEnd) {
    const ML  = getMLEngine();
    const N   = getNatal();
    const library = [];

    for (let y = yearStart; y <= yearEnd; y++) {
      // Sample one date per month to keep it fast
      for (let m = 1; m <= 12; m++) {
        const dateStr = `${y}-${String(m).padStart(2,'0')}-15`;
        try {
          const features = ML.extractFeatures(dateStr);
          library.push({ date: dateStr, features });
        } catch (e) {}
      }
    }
    return library;
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate — full pattern analysis
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, limit = 3) {
    try {
      const matches = findSimilarDates(dateStr, limit);
      const verdict = generateMLVerdict(matches);

      // Weighted direction from matches
      let bullWeight = 0, bearWeight = 0;
      matches.forEach(m => {
        const w = m.similarityPct / 100;
        if (m.direction === 'BULL') bullWeight += w;
        else if (m.direction === 'BEAR') bearWeight += w;
      });

      const direction  = bullWeight > bearWeight ? 'BULL' : bearWeight > bullWeight ? 'BEAR' : 'NEUTRAL';
      const confidence = Math.round(Math.max(bullWeight, bearWeight) /
                         (bullWeight + bearWeight + 0.001) * 100);

      return {
        dateStr, matches, verdict,
        direction, confidence,
        hindiSummary: verdict,
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[PATTERN_MATCHER] analyzeForDate error:', e);
      return { matches: [], verdict: 'ML विश्लेषण विफल', direction: 'NEUTRAL', confidence: 50 };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    ANCHOR_DATES,
    buildAnchorCache,
    getSimilarityScore,
    findSimilarDates,
    getHistoricalOutcome,
    generateMLVerdict,
    buildPatternLibrary,
    analyzeForDate,
  };

})();

if (typeof module !== 'undefined') module.exports = PATTERN_MATCHER;
if (typeof window !== 'undefined') window.PATTERN_MATCHER = PATTERN_MATCHER;

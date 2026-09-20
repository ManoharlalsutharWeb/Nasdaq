/* ============================================================
   VedicAladdin V6 — ny_engine/block_b_probability.js
   Block B: 5-Tier Possibility Map (must sum to 100%)
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BLOCK_B_PROBABILITY = (function () {
  'use strict';

  function generateBar(pct, len) {
    len = len || 20;
    var filled = Math.round(pct / 100 * len);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(len - filled) + ' ' + pct.toFixed(1) + '%';
  }

  function calcProbabilities(vedicScore, mlScore, regimeScore) {
    var blended = vedicScore * 0.55 + mlScore * 0.30 + regimeScore * 0.15;
    var norm = Math.max(-100, Math.min(100, blended));
    var strongRally, bull, flat, bear, crash;
    if (norm >= 40)       { strongRally=35; bull=30; flat=20; bear=10; crash=5; }
    else if (norm >= 15)  { strongRally=15; bull=35; flat=30; bear=15; crash=5; }
    else if (norm >= -15) { strongRally=5;  bull=20; flat=40; bear=25; crash=10; }
    else if (norm >= -40) { strongRally=3;  bull=10; flat=22; bear=40; crash=25; }
    else                  { strongRally=2;  bull=5;  flat=13; bear=35; crash=45; }
    var total = strongRally + bull + flat + bear + crash;
    var scale = 100 / total;
    return {
      strongRally: parseFloat((strongRally*scale).toFixed(1)),
      bull:        parseFloat((bull*scale).toFixed(1)),
      flat:        parseFloat((flat*scale).toFixed(1)),
      bear:        parseFloat((bear*scale).toFixed(1)),
      crash:       parseFloat((crash*scale).toFixed(1)),
    };
  }

  function getConfidenceLevel(allScores) {
    var vals = (allScores||[]).filter(function(s){ return s !== null && s !== undefined; });
    if (!vals.length) return 50;
    var pos = vals.filter(function(v){ return v > 0; }).length;
    var neg = vals.filter(function(v){ return v < 0; }).length;
    return Math.round(35 + (Math.max(pos,neg) / vals.length) * 55);
  }

  function formatPossibilityMap(probs, confidence) {
    var tiers = [
      { key:'strongRally', hi:'तेज़ तेजी (>+1.5%)',    color:'🟢' },
      { key:'bull',        hi:'तेजी (+0.5 से +1.5%)', color:'🟩' },
      { key:'flat',        hi:'सपाट (±0.5%)',           color:'🟡' },
      { key:'bear',        hi:'मंदी (-0.5 से -1.5%)',  color:'🟠' },
      { key:'crash',       hi:'क्रैश (<-1.5%)',          color:'🔴' },
    ];
    var lines = tiers.map(function(t){
      return t.color + ' ' + t.hi + '  ' + generateBar(probs[t.key]||0);
    });
    lines.push('\n📊 कुल विश्वास: ' + confidence + '%');
    return lines.join('\n');
  }

  function run(vedicScore, mlScore, regimeScore, allScores) {
    var probs = calcProbabilities(vedicScore||0, mlScore||0, regimeScore||0);
    var confidence = getConfidenceLevel(allScores||[vedicScore, mlScore]);
    return Object.assign({}, probs, {
      confidence: confidence,
      formattedHindi: formatPossibilityMap(probs, confidence),
      schemaVersion: "6.0"
    });
  }

  return { calcProbabilities: calcProbabilities, getConfidenceLevel: getConfidenceLevel,
           generateBar: generateBar, formatPossibilityMap: formatPossibilityMap, run: run };
})();

if (typeof module !== 'undefined') module.exports = BLOCK_B_PROBABILITY;
if (typeof window !== 'undefined') window.BLOCK_B_PROBABILITY = BLOCK_B_PROBABILITY;

/* ============================================================
   VedicAladdin V6 — ny_engine/block_c_timing.js
   Block C: Minute-Level Intraday Timing (19:00–01:30 IST)
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BLOCK_C_TIMING = (function () {
  'use strict';

  function getM() {
    if (typeof MUHURTA_ENGINE !== 'undefined') return MUHURTA_ENGINE;
    try { return require('../advanced/muhurta_engine'); } catch(e) { return null; }
  }

  var NY_SLOTS = ['19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30',
                  '23:00','23:30','00:00','00:30','01:00','01:30'];
  var Q_SCORE  = {'A+':6,'A':5,'B':4,'C':3,'D':2,'F':1};
  var Q_COLOR  = {'A+':'#00e676','A':'#69f0ae','B':'#b2ff59','C':'#ffd740','D':'#ff6d00','F':'#ff1744'};

  function generateTimelineBlocks(dateStr, timeline) {
    var tl = timeline || [];
    return NY_SLOTS.map(function(startT, i) {
      var endT = NY_SLOTS[i+1] || '02:00';
      var h = parseInt(startT.split(':')[0]);
      var hd = tl.find ? tl.find(function(t){ return t.hour === h; }) : null;
      if (!hd) hd = { quality:'C', label:'होरा', lordHi:'सूर्य', avoid:false };
      return {
        startIST: startT, endIST: endT,
        quality: hd.quality, horaLord: hd.lordHi,
        avoid: hd.avoid, color: Q_COLOR[hd.quality]||'#ffd740',
        label: hd.label,
        isOpen: startT==='19:00', isPower: startT==='20:00'||startT==='20:30',
        hindiText: startT+'–'+endT+': ['+hd.quality+'] '+hd.label+(hd.avoid?' 🚫':''),
      };
    });
  }

  function formatTimeline(blocks) {
    var sorted = blocks.slice().sort(function(a,b){ return (Q_SCORE[b.quality]||0)-(Q_SCORE[a.quality]||0); });
    var best  = sorted.filter(function(b){ return !b.avoid; }).slice(0,2);
    var worst = blocks.filter(function(b){ return b.avoid; }).slice(0,2);
    var lines = ['⏰ NY सत्र टाइमिंग (19:00–01:30 IST):'];
    blocks.forEach(function(b){
      var isBest  = best.find(function(x){ return x.startIST===b.startIST; });
      var isWorst = worst.find(function(x){ return x.startIST===b.startIST; });
      lines.push('  '+b.startIST+'  ['+b.quality+']  '+b.horaLord+' होरा'+(isBest?' ⭐':isWorst?' 🚫':''));
    });
    lines.push('\n✅ सर्वश्रेष्ठ: '+best.map(function(b){ return b.startIST; }).join(', '));
    lines.push('🚫 बचें: '+(worst.map(function(b){ return b.startIST; }).join(', ')||'कोई नहीं'));
    return lines.join('\n');
  }

  function run(dateStr) {
    var M = getM();
    var tl = M ? M.getDayQualityTimeline(dateStr).timeline : [];
    var blocks = generateTimelineBlocks(dateStr, tl);
    var sorted = blocks.slice().sort(function(a,b){ return (Q_SCORE[b.quality]||0)-(Q_SCORE[a.quality]||0); });
    var best  = sorted.filter(function(b){ return !b.avoid; }).slice(0,2);
    var avoid = blocks.filter(function(b){ return b.avoid; });
    return { blocks:blocks, best:best, avoid:avoid,
             formattedHindi: formatTimeline(blocks), schemaVersion:"6.0" };
  }

  return { generateTimelineBlocks:generateTimelineBlocks, formatTimeline:formatTimeline, run:run };
})();

if (typeof module !== 'undefined') module.exports = BLOCK_C_TIMING;
if (typeof window !== 'undefined') window.BLOCK_C_TIMING = BLOCK_C_TIMING;

/* ============================================================
   VedicAladdin V6 — ny_engine/block_a_vedic.js
   Block A: 7-Layer Vedic Core for NY Session
   Layer 1: Natal match | 2: Dasha | 3: Transit Matrix
   Layer 4: Ashtakavarga | 5: Yogas | 6: Eclipse | 7: Jaimini
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const BLOCK_A_VEDIC = (function () {
  'use strict';

  function ref(name) {
    const map = {
      NATAL:           typeof NATAL           !== 'undefined' ? NATAL           : null,
      DASHA:           typeof DASHA           !== 'undefined' ? DASHA           : null,
      TRANSITS:        typeof TRANSITS        !== 'undefined' ? TRANSITS        : null,
      VARGA:           typeof VARGA           !== 'undefined' ? VARGA           : null,
      ASHTAKAVARGA:    typeof ASHTAKAVARGA    !== 'undefined' ? ASHTAKAVARGA    : null,
      YOGA_ENGINE:     typeof YOGA_ENGINE     !== 'undefined' ? YOGA_ENGINE     : null,
      ECLIPSE_ENGINE:  typeof ECLIPSE_ENGINE  !== 'undefined' ? ECLIPSE_ENGINE  : null,
      JAIMINI_ENGINE:  typeof JAIMINI_ENGINE  !== 'undefined' ? JAIMINI_ENGINE  : null,
    };
    if (map[name]) return map[name];
    try {
      const paths = {
        NATAL:'../core/natal', DASHA:'../core/dasha', TRANSITS:'../core/transits',
        VARGA:'../core/varga', ASHTAKAVARGA:'../advanced/ashtakavarga',
        YOGA_ENGINE:'../advanced/yoga_engine', ECLIPSE_ENGINE:'../advanced/eclipse_engine',
        JAIMINI_ENGINE:'../advanced/jaimini_engine',
      };
      return require(paths[name]);
    } catch (e) { return null; }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 1: Natal Chart Match
  // ════════════════════════════════════════════════════════
  function natal_match(dateStr, natalD1, transitReport) {
    try {
      const N   = ref('NATAL');
      const tr  = transitReport;
      const aspects = tr?.aspects || [];
      const topAspects = aspects.slice(0, 5);
      const natalScore = topAspects.reduce((s, a) => s + a.score, 0);
      const houseAnalysis = N.analyze12Houses(natalD1, null, tr?.planets);

      return {
        layer: 1, label: 'नाटल मिलान',
        score: parseFloat(natalScore.toFixed(2)),
        topAspects,
        houseScore: parseFloat((houseAnalysis?.overallHouseScore || 0).toFixed(2)),
        topBullish: houseAnalysis?.topBullish?.house,
        topBearish: houseAnalysis?.topBearish?.house,
        hindiText : `नाटल ट्रांज़िट स्कोर: ${natalScore > 0 ? '+' : ''}${natalScore.toFixed(1)} | हाउस सक्रियता: ${(houseAnalysis?.overallHouseScore || 0).toFixed(1)}`,
      };
    } catch (e) {
      return { layer:1, label:'नाटल मिलान', score:0, hindiText:'लेयर 1 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 2: Dasha Intelligence
  // ════════════════════════════════════════════════════════
  function dasha_intelligence(dateStr, natalD1, dasha) {
    try {
      const D  = ref('DASHA');
      const birth   = ref('NATAL').NASDAQ_BIRTH;
      const birthJD = ref('NATAL').JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const moonSid = natalD1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;
      const [y,m,d] = dateStr.split('-').map(Number);
      const jd = ref('NATAL').JD(y,m,d,15,0);

      const cur    = dasha || D.getCurrent(birthJD, moonSid, jd);
      const prana  = D.getPranaDasha ? D.getPranaDasha(birthJD, moonSid, jd) : null;
      const hist   = cur ? D.getDashaPeriodHistory(cur.maha, birthJD, moonSid, jd) : null;
      const score  = cur ? D.getDashaScore(cur.maha, cur.antar) : 0;

      return {
        layer: 2, label: 'दशा बुद्धिमत्ता',
        score,
        maha    : cur?.mahaHi, antar: cur?.antarHi,
        pratyantar: cur?.pratyantarHi, sookshma: cur?.sookshmaHi,
        prana   : prana?.pranaHi,
        marketBias: cur?.marketBias,
        mahaEnd : cur?.mahaEndIST,
        history : hist,
        hindiText: cur
          ? `${cur.mahaHi} > ${cur.antarHi} > ${cur.pratyantarHi || '--'} > ${cur.sookshmaHi || '--'} | ${cur.marketDescHi}`
          : 'दशा डेटा उपलब्ध नहीं',
      };
    } catch (e) {
      return { layer:2, label:'दशा बुद्धिमत्ता', score:0, hindiText:'लेयर 2 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 3: Transit Matrix
  // ════════════════════════════════════════════════════════
  function transit_matrix(dateStr, natalD1, transitReport) {
    try {
      const T   = ref('TRANSITS');
      const tr  = transitReport || T.buildReport(dateStr, natalD1);
      const exactAspects = tr.aspects.slice(0, 8);

      return {
        layer: 3, label: 'ट्रांज़िट मैट्रिक्स',
        score: parseFloat((tr.totalScore || 0).toFixed(2)),
        totalAspects: tr.aspects?.length || 0,
        exactAspects,
        moonSpeed: tr.moonSpeed,
        panchang : tr.panchang,
        hindiText: `कुल ट्रांज़िट स्कोर: ${(tr.totalScore||0).toFixed(1)} | ${tr.aspects?.length || 0} पहलू | चंद्र गति: ${(tr.moonSpeed||0).toFixed(1)}°/दिन`,
      };
    } catch (e) {
      return { layer:3, label:'ट्रांज़िट मैट्रिक्स', score:0, hindiText:'लेयर 3 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 4: Ashtakavarga Live
  // ════════════════════════════════════════════════════════
  function ashtakavarga_live(dateStr, natalD1) {
    try {
      const AV = ref('ASHTAKAVARGA');
      if (!AV) return { layer:4, label:'अष्टकवर्ग', score:0, hindiText:'मॉड्यूल लोड नहीं' };

      const result = AV.analyzeForDate(dateStr, natalD1);
      return {
        layer: 4, label: 'अष्टकवर्ग लाइव',
        score: parseFloat((result.overallScore || 0).toFixed(2)),
        savTotal: result.savTotal,
        moonSAV : result.moonSAV,
        transitQualities: result.transitQualities,
        hindiText: result.hindiSummary || `SAV: ${result.savTotal} | ट्रांज़िट AV: ${result.overallScore}`,
      };
    } catch (e) {
      return { layer:4, label:'अष्टकवर्ग', score:0, hindiText:'लेयर 4 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 5: Yoga Detection
  // ════════════════════════════════════════════════════════
  function yoga_detection(dateStr, natalD1) {
    try {
      const YE = ref('YOGA_ENGINE');
      if (!YE) return { layer:5, label:'योग पहचान', score:0, hindiText:'मॉड्यूल लोड नहीं' };

      const result  = YE.analyzeForDate(dateStr, natalD1);
      const summary = result.summary;
      return {
        layer: 5, label: 'योग पहचान',
        score: parseFloat((summary.totalScore || 0).toFixed(2)),
        activeCount: summary.activeCount,
        bullYogas  : summary.bullYogas,
        bearYogas  : summary.bearYogas,
        topYoga    : summary.topYoga?.nameHi,
        activeYogas: result.yogaResults.filter(y=>y.active).map(y=>({ nameHi:y.nameHi, score:y.bullScore })),
        hindiText  : summary.hindiSummary,
      };
    } catch (e) {
      return { layer:5, label:'योग पहचान', score:0, hindiText:'लेयर 5 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 6: Eclipse Field
  // ════════════════════════════════════════════════════════
  function eclipse_field(dateStr, natalD1) {
    try {
      const EE = ref('ECLIPSE_ENGINE');
      if (!EE) return { layer:6, label:'ग्रहण क्षेत्र', score:0, hindiText:'मॉड्यूल लोड नहीं' };

      const result = EE.analyzeForDate(dateStr, natalD1);
      return {
        layer: 6, label: 'ग्रहण क्षेत्र',
        score     : result.overallScore || 0,
        inShadow  : result.inShadow,
        daysTo    : result.shadowInfo?.daysToNearest,
        impact    : result.impact?.severity,
        hitPlanets: result.hitPlanets?.map(p=>p.hi) || [],
        upcoming  : result.upcoming?.map(e=>e.date) || [],
        hindiText : result.hindiSummary,
      };
    } catch (e) {
      return { layer:6, label:'ग्रहण क्षेत्र', score:0, hindiText:'लेयर 6 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // LAYER 7: Jaimini Layer
  // ════════════════════════════════════════════════════════
  function jaimini_layer(dateStr, natalD1) {
    try {
      const JE = ref('JAIMINI_ENGINE');
      if (!JE) return { layer:7, label:'जैमिनी लेयर', score:0, hindiText:'मॉड्यूल लोड नहीं' };

      const result = JE.analyzeForDate(dateStr, natalD1);
      return {
        layer: 7, label: 'जैमिनी लेयर',
        score      : result.score || 0,
        charaDasha : result.charaDasha,
        ak         : result.karakas?.AK,
        amk        : result.karakas?.AmK,
        hindiText  : result.hindiSummary,
      };
    } catch (e) {
      return { layer:7, label:'जैमिनी लेयर', score:0, hindiText:'लेयर 7 विफल' };
    }
  }

  // ════════════════════════════════════════════════════════
  // combineLayers — aggregate all 7 layers
  // ════════════════════════════════════════════════════════
  function combineLayers(layers) {
    const LAYER_WEIGHTS = [0.20, 0.18, 0.15, 0.12, 0.12, 0.10, 0.08]; // L1-L7
    let totalScore = 0;
    let bullLayers = 0, bearLayers = 0;

    layers.forEach((l, i) => {
      const w = LAYER_WEIGHTS[i] || 0.05;
      totalScore += (l.score || 0) * w;
      if (l.score > 0) bullLayers++;
      else if (l.score < 0) bearLayers++;
    });

    const normScore = parseFloat(Math.max(-100, Math.min(100, totalScore * 20)).toFixed(1));
    const signal = normScore >= 30 ? 'STRONG_BULL' : normScore >= 10 ? 'BULL' :
                   normScore <= -30 ? 'STRONG_BEAR' : normScore <= -10 ? 'BEAR' : 'NEUTRAL';
    const confidence = Math.round(40 + Math.max(bullLayers, bearLayers) * 8);

    return {
      layers, normScore, signal, confidence, bullLayers, bearLayers,
      hindiSummary: `वैदिक स्कोर: ${normScore} | ${bullLayers} बुलिश लेयर, ${bearLayers} बियरिश लेयर | संकेत: ${signal}`,
      schemaVersion: "6.0",
    };
  }

  // ════════════════════════════════════════════════════════
  // run — execute all 7 layers and combine
  // ════════════════════════════════════════════════════════
  function run(dateStr, natalD1, dasha, transitReport) {
    const d1 = natalD1 || ref('NATAL')?.getNasdaq();
    const tr = transitReport;

    const layers = [
      natal_match(dateStr, d1, tr),
      dasha_intelligence(dateStr, d1, dasha),
      transit_matrix(dateStr, d1, tr),
      ashtakavarga_live(dateStr, d1),
      yoga_detection(dateStr, d1),
      eclipse_field(dateStr, d1),
      jaimini_layer(dateStr, d1),
    ];

    return combineLayers(layers);
  }

  // ── Public API ────────────────────────────────────────────
  return {
    natal_match, dasha_intelligence, transit_matrix,
    ashtakavarga_live, yoga_detection, eclipse_field, jaimini_layer,
    combineLayers, run,
  };

})();

if (typeof module !== 'undefined') module.exports = BLOCK_A_VEDIC;
if (typeof window !== 'undefined') window.BLOCK_A_VEDIC = BLOCK_A_VEDIC;

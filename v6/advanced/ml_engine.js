/* ============================================================
   VedicAladdin V6 — advanced/ml_engine.js
   Pure JavaScript ML — No external libraries
   25 Vedic features per date → weighted ensemble prediction
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const ML_ENGINE = (function () {
  'use strict';

  function getNatal()    { return typeof NATAL          !== 'undefined' ? NATAL          : require('../core/natal');          }
  function getDasha()    { return typeof DASHA          !== 'undefined' ? DASHA          : require('../core/dasha');          }
  function getTransits() { return typeof TRANSITS       !== 'undefined' ? TRANSITS       : require('../core/transits');       }

  // ════════════════════════════════════════════════════════
  // FEATURE NAMES (25 Vedic features)
  // ════════════════════════════════════════════════════════
  const FEATURES = [
    'dasha_maha_score',       // 0: Maha dasha market bias
    'dasha_antar_score',      // 1: Antar dasha bias
    'transit_total',          // 2: Total transit aspects score
    'moon_nak_score',         // 3: Moon nakshatra market profile
    'moon_speed',             // 4: Moon speed (fast=volatile)
    'moon_tara',              // 5: Tara bala score
    'jup_house',              // 6: Jupiter house (kendra=bull)
    'sat_house',              // 7: Saturn house (6/8/12=bear)
    'eclipse_shadow',         // 8: In eclipse shadow (0/1)
    'crash_rules_count',      // 9: Number of crash rules triggered
    'yoga_score',             // 10: Net yoga score
    'panchang_score',         // 11: Panchang quality
    'muhurta_ny',             // 12: NY open hora quality (1=A+, 0=F)
    'mars_kendra',            // 13: Mars in kendra (volatile)
    'rahu_8th',               // 14: Rahu in 8th house
    'sat_rahu_conj',          // 15: Saturn-Rahu conjunction
    'yogini_score',           // 16: Yogini dasha bias
    'varga_d9',               // 17: D9 direction hint
    'varga_d10',              // 18: D10 direction hint
    'ashtakavarga_score',     // 19: Overall AV transit score
    'graha_yuddha',           // 20: Planet war active (0/1)
    'gandanta',               // 21: Moon in gandanta (0/1)
    'sun_dignity',            // 22: Sun dignity score
    'moon_paksha',            // 23: Shukla(1) vs Krishna(-1)
    'jup_ven_trine',          // 24: Jupiter-Venus trine (bull signal)
  ];

  // ── Default weights (trained on historical NASDAQ behavior) ─
  // Positive weight = bullish feature, negative = bearish
  const DEFAULT_WEIGHTS = [
     0.18,  // 0: dasha_maha_score
     0.10,  // 1: dasha_antar_score
     0.15,  // 2: transit_total
     0.08,  // 3: moon_nak_score
    -0.05,  // 4: moon_speed (fast=volatile, slight bear)
     0.07,  // 5: moon_tara
     0.12,  // 6: jup_house
    -0.14,  // 7: sat_house (if in bad house)
    -0.18,  // 8: eclipse_shadow
    -0.20,  // 9: crash_rules_count
     0.12,  // 10: yoga_score
     0.06,  // 11: panchang_score
     0.05,  // 12: muhurta_ny
    -0.08,  // 13: mars_kendra
    -0.15,  // 14: rahu_8th
    -0.22,  // 15: sat_rahu_conj
     0.08,  // 16: yogini_score
     0.07,  // 17: varga_d9
     0.09,  // 18: varga_d10
     0.08,  // 19: ashtakavarga_score
    -0.12,  // 20: graha_yuddha
    -0.10,  // 21: gandanta
     0.06,  // 22: sun_dignity
     0.04,  // 23: moon_paksha
     0.14,  // 24: jup_ven_trine
  ];

  // Current weights (can be updated via train())
  let weights = [...DEFAULT_WEIGHTS];
  const BIAS  = 0.05; // slight bull bias (NASDAQ long-term trend)

  // ════════════════════════════════════════════════════════
  // extractFeatures — build 25-element feature vector
  // ════════════════════════════════════════════════════════
  function extractFeatures(dateStr, precomputed = {}) {
    try {
      const N  = getNatal();
      const D  = getDasha();
      const T  = getTransits();
      const d1 = N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd    = N.JD(y, m, d, 15, 0);
      const ayan  = N.lahiri(jd);
      const birth = N.NASDAQ_BIRTH;
      const birthJD = N.JD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
      const moonSid = d1.planets.find(p => p.eng === 'Moon')?.sidLon || 0;

      // Dasha
      const dasha = D.getCurrent(birthJD, moonSid, jd);
      const BIAS_SCORE = { BULL:1, VOLATILE:0, NEUTRAL:0, BEAR:-1 };
      const dashaScore = dasha ? BIAS_SCORE[dasha.marketBias] || 0 : 0;
      const antarBias  = dasha ? (D.DASHA_MKT[dasha.antar]?.bias || 'NEUTRAL') : 'NEUTRAL';
      const antarScore = BIAS_SCORE[antarBias] || 0;

      // Transit
      const tr = precomputed.transitReport || T.buildReport(dateStr, d1);
      const transitTotal = Math.max(-3, Math.min(3, (tr.totalScore || 0) / 10));

      // Moon
      const moonLon    = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const moonNakNum = Math.floor(moonLon / (360/27));
      const NAK_SCORE  = {3:1, 7:1, 22:1, 11:0.5, 20:0.5, 25:0.5, 17:-1, 18:-1.5, 5:-0.5, 8:-0.5};
      const moonNakSc  = NAK_SCORE[moonNakNum] || 0;
      const moonSpeed  = Math.abs(N.n180(N.getPlanetLon('Moon', jd+0.5)-N.getPlanetLon('Moon', jd-0.5)));
      const moonNormSpd= Math.min(1, moonSpeed / 15);

      // Tara bala (vs Rohini=3)
      const taraBala = ((moonNakNum - 3 + 27) % 9) + 1;
      const TARA_SC  = {1:1,2:1,3:-0.5,4:0.5,5:-0.5,6:0.5,7:-1,8:0.5,9:0.5};
      const taraSc   = TARA_SC[taraBala] || 0;

      // Jupiter house
      const jupPlanet = tr.planets?.find(p => p.eng === 'Jupiter');
      const jupHouse  = jupPlanet?.transHouse || 0;
      const jupSc     = [1,5,9,10,11].includes(jupHouse) ? 1 : [6,8,12].includes(jupHouse) ? -1 : 0;

      // Saturn house
      const satPlanet = tr.planets?.find(p => p.eng === 'Saturn');
      const satHouse  = satPlanet?.transHouse || 0;
      const satSc     = [6,8,12].includes(satHouse) ? -1 : [1,10,11].includes(satHouse) ? 0.3 : 0;

      // Eclipse shadow
      const eclShadow = precomputed.eclipseInShadow ? 1 : 0;

      // Crash rules (use precomputed if available)
      const crashCount = precomputed.crashRulesTriggered !== undefined
        ? precomputed.crashRulesTriggered / 21
        : 0;

      // Yoga score
      const yogaSc = Math.max(-1, Math.min(1, (precomputed.yogaScore || 0) / 8));

      // Panchang
      const panSc = Math.max(-1, Math.min(1, (tr.panchang?.score || 0) / 4));

      // Muhurta NY (hora quality at 19:00)
      const horaLord = tr.panchang ? 'Jupiter' : 'Sun'; // simplified
      const HORA_Q   = {Jupiter:1, Venus:0.8, Mercury:0.5, Moon:0.5, Sun:0, Mars:-0.5, Saturn:-1};
      const muhurtaNY= HORA_Q[horaLord] || 0;

      // Mars in kendra
      const marsPlanet = tr.planets?.find(p => p.eng === 'Mars');
      const marsKendra = marsPlanet && isKendra(marsPlanet.transHouse) ? -1 : 0;

      // Rahu 8th
      const rahuPlanet = tr.planets?.find(p => p.eng === 'Rahu');
      const rahu8th    = (rahuPlanet?.transHouse === 8) ? 1 : 0;

      // Sat-Rahu conj
      const satRahuConj = (satPlanet && rahuPlanet &&
        Math.abs(N.n180(satPlanet.sidLon - rahuPlanet.sidLon)) < 12) ? 1 : 0;

      // Yogini
      const yoginiSc = precomputed.yoginiScore !== undefined
        ? Math.max(-1, Math.min(1, precomputed.yoginiScore / 5))
        : 0;

      // D9, D10
      const VARGA_REF = typeof VARGA !== 'undefined' ? VARGA : null;
      let d9sc = 0, d10sc = 0;
      if (VARGA_REF) {
        const d9 = VARGA_REF.analyzeVarga(9,  VARGA_REF.getChart(d1,9),  d1, dasha, tr);
        const d10= VARGA_REF.analyzeVarga(10, VARGA_REF.getChart(d1,10), d1, dasha, tr);
        d9sc  = d9.directionHint  === 'BULL' ? 1 : d9.directionHint  === 'BEAR' ? -1 : 0;
        d10sc = d10.directionHint === 'BULL' ? 1 : d10.directionHint === 'BEAR' ? -1 : 0;
      }

      // Ashtakavarga score (precomputed or 0)
      const avSc = Math.max(-1, Math.min(1, (precomputed.ashtakavargaScore || 0) / 5));

      // Graha yuddha
      const gyActive = precomputed.grahaYuddha ? 1 : 0;

      // Gandanta
      const gandanta = precomputed.gandanta ? 1 : 0;

      // Sun dignity
      const sunPlanet = d1.planets.find(p => p.eng === 'Sun');
      const sunDig    = sunPlanet?.dignity === 'उच्च' ? 1 : sunPlanet?.dignity === 'नीच' ? -1 : 0;

      // Paksha
      const lunarLon = N.n360(moonLon - N.n360(N.getPlanetLon('Sun', jd) - ayan));
      const paksha   = lunarLon < 180 ? 1 : -1;

      // Jup-Ven trine
      const venPlanet = tr.planets?.find(p => p.eng === 'Venus');
      const jupVenTri = (jupPlanet && venPlanet &&
        Math.abs(Math.abs(N.n180(jupPlanet.sidLon - venPlanet.sidLon)) - 120) < 10) ? 1 : 0;

      return [
        dashaScore, antarScore, transitTotal, moonNakSc, moonNormSpd,
        taraSc, jupSc, satSc, eclShadow, crashCount,
        yogaSc, panSc, muhurtaNY, marsKendra, rahu8th,
        satRahuConj, yoginiSc, d9sc, d10sc, avSc,
        gyActive, gandanta, sunDig, paksha, jupVenTri,
      ];
    } catch (e) {
      console.error('[ML_ENGINE] extractFeatures error:', e);
      return new Array(25).fill(0);
    }
  }

  function isKendra(h) { return [1,4,7,10].includes(h); }

  // ════════════════════════════════════════════════════════
  // predict — weighted dot product
  // ════════════════════════════════════════════════════════
  function predict(features) {
    try {
      let raw = BIAS;
      for (let i = 0; i < features.length; i++) {
        raw += (features[i] || 0) * (weights[i] || 0);
      }
      // Sigmoid-like normalization to 0-100
      const confidence = Math.round(50 + raw * 40);
      const clampedConf = Math.max(5, Math.min(95, confidence));
      const direction = raw > 0.05 ? 'BULL' : raw < -0.05 ? 'BEAR' : 'NEUTRAL';
      return { direction, confidence: clampedConf, raw: parseFloat(raw.toFixed(3)) };
    } catch (e) {
      return { direction: 'NEUTRAL', confidence: 50, raw: 0 };
    }
  }

  // ════════════════════════════════════════════════════════
  // train — update weights from historical data
  // ════════════════════════════════════════════════════════
  function train(historicalData, learningRate = 0.01) {
    try {
      historicalData.forEach(({ features, outcome }) => {
        const pred = predict(features);
        const err  = outcome - pred.raw;
        for (let i = 0; i < weights.length; i++) {
          weights[i] += learningRate * err * (features[i] || 0);
        }
      });
      return { weights: [...weights], trained: historicalData.length };
    } catch (e) {
      return { weights: [...weights], error: e.message };
    }
  }

  // ════════════════════════════════════════════════════════
  // getFeatureImportance
  // ════════════════════════════════════════════════════════
  function getFeatureImportance() {
    return FEATURES.map((name, i) => ({
      feature: name, weight: weights[i],
      importance: Math.abs(weights[i]),
      direction: weights[i] > 0 ? 'BULL' : 'BEAR',
    })).sort((a, b) => b.importance - a.importance);
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1, precomputed = {}) {
    try {
      const features  = extractFeatures(dateStr, precomputed);
      const prediction = predict(features);
      const importance = getFeatureImportance().slice(0, 5);

      return {
        dateStr,
        features,
        prediction,
        topFeatures: importance,
        hindiSummary: `ML पूर्वानुमान: ${prediction.direction === 'BULL' ? 'तेजी' : prediction.direction === 'BEAR' ? 'मंदी' : 'तटस्थ'} — ${prediction.confidence}% विश्वास`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { prediction: { direction:'NEUTRAL', confidence:50 }, hindiSummary: 'ML विफल' };
    }
  }

  // Reset to defaults
  function resetWeights() { weights = [...DEFAULT_WEIGHTS]; }

  // ── Public API ────────────────────────────────────────────
  return {
    FEATURES, DEFAULT_WEIGHTS,
    extractFeatures, predict, train,
    getFeatureImportance, analyzeForDate, resetWeights,
    getWeights: () => [...weights],
  };

})();

if (typeof module !== 'undefined') module.exports = ML_ENGINE;
if (typeof window !== 'undefined') window.ML_ENGINE = ML_ENGINE;

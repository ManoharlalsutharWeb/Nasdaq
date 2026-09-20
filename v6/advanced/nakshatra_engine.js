/* ============================================================
   VedicAladdin V6 — advanced/nakshatra_engine.js
   27 Nakshatras — Full NASDAQ Market Profiles
   NASDAQ birth nakshatra: Rohini (nak 3, 0-indexed)
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const NAKSHATRA_ENGINE = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  // ════════════════════════════════════════════════════════
  // 27 NAKSHATRA PROFILES FOR NASDAQ/MARKET
  // ════════════════════════════════════════════════════════
  const NAKSHATRA_PROFILES = [
    { num:0,  en:'Ashwini',           hi:'अश्विनी',        lord:'Ketu',    sign:0,
      behavior:'BULL',    strength:7,  marketHi:'अश्विनी — त्वरित शुरुआत, गैप-अप, तेज़ रैली' },
    { num:1,  en:'Bharani',           hi:'भरणी',            lord:'Venus',   sign:0,
      behavior:'VOLATILE',strength:5,  marketHi:'भरणी — चरम चाल, बड़ा उतार-चढ़ाव, ध्यान दें' },
    { num:2,  en:'Krittika',          hi:'कृत्तिका',        lord:'Sun',     sign:0,
      behavior:'BULL',    strength:6,  marketHi:'कृत्तिका — सरकारी/बैंकिंग नेतृत्व, मजबूत खुलावट' },
    { num:3,  en:'Rohini',            hi:'रोहिणी',          lord:'Moon',    sign:1,
      behavior:'BULL',    strength:9,  marketHi:'रोहिणी — NASDAQ जन्म नक्षत्र! भरपूर तेजी, वॉल्यूम ऊंचा' },
    { num:4,  en:'Mrigashira',        hi:'मृगशिरा',         lord:'Mars',    sign:1,
      behavior:'NEUTRAL', strength:5,  marketHi:'मृगशिरा — खोज/अनिश्चितता, दोनों तरफ चाल संभव' },
    { num:5,  en:'Ardra',             hi:'आर्द्रा',          lord:'Rahu',    sign:2,
      behavior:'VOLATILE',strength:3,  marketHi:'आर्द्रा — तूफानी चाल, crash या spike दोनों' },
    { num:6,  en:'Punarvasu',         hi:'पुनर्वसु',         lord:'Jupiter', sign:2,
      behavior:'BULL',    strength:7,  marketHi:'पुनर्वसु — वापसी/पुनरुद्धार, रिकवरी रैली' },
    { num:7,  en:'Pushya',            hi:'पुष्य',            lord:'Saturn',  sign:3,
      behavior:'BULL',    strength:9,  marketHi:'पुष्य — सर्वश्रेष्ठ शुभ नक्षत्र! संस्थागत खरीद, मजबूत तेजी' },
    { num:8,  en:'Ashlesha',          hi:'आश्लेषा',          lord:'Mercury', sign:3,
      behavior:'WHIPSAW', strength:2,  marketHi:'आश्लेषा — धोखा/TRAP! ऊपर-नीचे दोनों झटका' },
    { num:9,  en:'Magha',             hi:'मघा',              lord:'Ketu',    sign:4,
      behavior:'BULL',    strength:6,  marketHi:'मघा — शक्ति प्रदर्शन, शासकीय चाल, तेजी' },
    { num:10, en:'Purva Phalguni',    hi:'पूर्व फाल्गुनी',  lord:'Venus',   sign:4,
      behavior:'BULL',    strength:7,  marketHi:'पूर्व फाल्गुनी — उत्सव/समृद्धि, आसान तेजी' },
    { num:11, en:'Uttara Phalguni',   hi:'उत्तर फाल्गुनी',  lord:'Sun',     sign:4,
      behavior:'STABLE',  strength:8,  marketHi:'उत्तर फाल्गुनी — स्थिर तेजी, विश्वसनीय रैली' },
    { num:12, en:'Hasta',             hi:'हस्त',             lord:'Moon',    sign:5,
      behavior:'BULL',    strength:7,  marketHi:'हस्त — कुशल/सटीक चाल, टेक/हेल्थकेयर तेजी' },
    { num:13, en:'Chitra',            hi:'चित्रा',           lord:'Mars',    sign:5,
      behavior:'VOLATILE',strength:5,  marketHi:'चित्रा — चमक/तेज़ी के बाद पलटाव, सतर्क रहें' },
    { num:14, en:'Swati',             hi:'स्वाति',           lord:'Rahu',    sign:6,
      behavior:'VOLATILE',strength:4,  marketHi:'स्वाति — हवा जैसी चाल, अनिश्चित दिशा' },
    { num:15, en:'Vishakha',          hi:'विशाखा',           lord:'Jupiter', sign:6,
      behavior:'NEUTRAL', strength:5,  marketHi:'विशाखा — दो-मुखी, देरी से दिशा, धैर्य रखें' },
    { num:16, en:'Anuradha',          hi:'अनुराधा',          lord:'Saturn',  sign:7,
      behavior:'BULL',    strength:6,  marketHi:'अनुराधा — मित्रता/सहयोग, सुरक्षित तेजी' },
    { num:17, en:'Jyeshtha',          hi:'ज्येष्ठा',         lord:'Mercury', sign:7,
      behavior:'EXTREME', strength:2,  marketHi:'ज्येष्ठा — अत्यधिक चाल! बड़ी crash या spike' },
    { num:18, en:'Mula',              hi:'मूल',               lord:'Ketu',    sign:8,
      behavior:'REVERSAL',strength:1,  marketHi:'मूल — जड़ें उखड़ना, अचानक crash, पलटाव का नक्षत्र' },
    { num:19, en:'Purva Ashadha',     hi:'पूर्वाषाढ़ा',       lord:'Venus',   sign:8,
      behavior:'BULL',    strength:6,  marketHi:'पूर्वाषाढ़ा — आत्मविश्वास, चढ़ाई जारी' },
    { num:20, en:'Uttara Ashadha',    hi:'उत्तराषाढ़ा',       lord:'Sun',     sign:8,
      behavior:'STABLE',  strength:7,  marketHi:'उत्तराषाढ़ा — विजय/स्थिरता, टिकाऊ तेजी' },
    { num:21, en:'Shravana',          hi:'श्रवण',             lord:'Moon',    sign:9,
      behavior:'BULL',    strength:6,  marketHi:'श्रवण — सुनना/सीखना, समाचार-प्रेरित रैली' },
    { num:22, en:'Dhanishtha',        hi:'धनिष्ठा',           lord:'Mars',    sign:9,
      behavior:'BULL',    strength:8,  marketHi:'धनिष्ठा — धन/समृद्धि, संस्थागत खरीद, मजबूत बुल' },
    { num:23, en:'Shatabhisha',       hi:'शतभिषा',            lord:'Rahu',    sign:10,
      behavior:'VOLATILE',strength:3,  marketHi:'शतभिषा — रहस्यमय चाल, कोहरे में ट्रेड, सतर्क' },
    { num:24, en:'Purva Bhadrapada',  hi:'पूर्व भाद्रपद',    lord:'Jupiter', sign:10,
      behavior:'VOLATILE',strength:4,  marketHi:'पूर्व भाद्रपद — दोहरी प्रकृति, अचानक बड़ी चाल' },
    { num:25, en:'Uttara Bhadrapada', hi:'उत्तर भाद्रपद',    lord:'Saturn',  sign:11,
      behavior:'STABLE',  strength:7,  marketHi:'उत्तर भाद्रपद — गहरी स्थिरता, मंदी के बाद आधार' },
    { num:26, en:'Revati',            hi:'रेवती',             lord:'Mercury', sign:11,
      behavior:'BULL',    strength:6,  marketHi:'रेवती — यात्रा की समाप्ति/नई शुरुआत, सौम्य तेजी' },
  ];

  // Market behavior score (+ve = bull, -ve = bear)
  const BEHAVIOR_SCORE = {
    BULL:3, STABLE:2, NEUTRAL:0, VOLATILE:-1, WHIPSAW:-3, EXTREME:-4, REVERSAL:-5,
  };

  // ════════════════════════════════════════════════════════
  // getCurrentNakshatra
  // ════════════════════════════════════════════════════════
  /**
   * @param {number} moonLon — sidereal longitude of Moon 0-360
   * @returns {{ num, en, hi, lord, pada, marketHi, behavior, strength }}
   */
  function getCurrentNakshatra(moonLon) {
    const totalNak = 27;
    const nakSize  = 360 / totalNak;   // 13.333°
    const padaSize = nakSize / 4;       // 3.333°

    const nakNum  = Math.floor(moonLon / nakSize) % totalNak;
    const posInNak = moonLon % nakSize;
    const pada     = Math.floor(posInNak / padaSize) + 1;

    const profile = NAKSHATRA_PROFILES[nakNum] || NAKSHATRA_PROFILES[0];
    return { ...profile, pada, posInNak: parseFloat(posInNak.toFixed(3)) };
  }

  // ════════════════════════════════════════════════════════
  // getMarketProfile
  // ════════════════════════════════════════════════════════
  function getMarketProfile(nakshatraNum) {
    const p = NAKSHATRA_PROFILES[nakshatraNum % 27];
    return {
      behavior  : p.behavior,
      strength  : p.strength,
      hindiText : p.marketHi,
      score     : BEHAVIOR_SCORE[p.behavior] || 0,
    };
  }

  // ════════════════════════════════════════════════════════
  // getNakshatraCalendar — array of {date, nakshatra} for N days
  // ════════════════════════════════════════════════════════
  function getNakshatraCalendar(dateStr, days) {
    try {
      const N  = getNatal();
      const [y, m, d] = dateStr.split('-').map(Number);
      const fromJD = N.JD(y, m, d, 15, 0);
      const calendar = [];

      for (let i = 0; i < days; i++) {
        const jd    = fromJD + i;
        const ayan  = N.lahiri(jd);
        const moonSid = N.n360(N.getPlanetLon('Moon', jd) - ayan);
        const nak   = getCurrentNakshatra(moonSid);
        const ms    = (jd - 2440587.5) * 86400000;
        const ds    = new Date(ms).toISOString().split('T')[0];
        calendar.push({ date: ds, nakshatra: nak, marketProfile: getMarketProfile(nak.num) });
      }
      return calendar;
    } catch (e) {
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // getTarabala — current nak vs NASDAQ birth nak (Rohini=3)
  // ════════════════════════════════════════════════════════
  function getTarabala(currentNak, birthNak) {
    birthNak = birthNak !== undefined ? birthNak : 3; // Rohini
    const pos = (currentNak - birthNak + 27) % 9 + 1;
    const TARA_NAMES  = ['','जन्म','सम्पद','विपत्','क्षेम','प्रत्यर्','साधन','नैधन','मित्र','परममित्र'];
    const TARA_SCORES = [0, 3, 3, -2, 2, -2, 2, -3, 1, 2];
    return {
      tara: pos, name: TARA_NAMES[pos], score: TARA_SCORES[pos] || 0,
      hi: `${TARA_NAMES[pos]} तारा (${pos}) — स्कोर: ${TARA_SCORES[pos] > 0 ? '+' : ''}${TARA_SCORES[pos]}`,
    };
  }

  // ════════════════════════════════════════════════════════
  // getNakshatraPada
  // ════════════════════════════════════════════════════════
  function getNakshatraPada(moonLon) {
    const nakSize  = 360 / 27;
    const posInNak = moonLon % nakSize;
    return Math.floor(posInNak / (nakSize / 4)) + 1;
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate — full nakshatra analysis
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N  = getNatal();
      const d1 = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const ayan = N.lahiri(jd);

      const moonSid = N.n360(N.getPlanetLon('Moon', jd) - ayan);
      const nak     = getCurrentNakshatra(moonSid);
      const profile = getMarketProfile(nak.num);
      const tara    = getTarabala(nak.num, 3); // Rohini birth nak

      // Check if Moon changes nakshatra today
      const moonYest = N.n360(N.getPlanetLon('Moon', jd - 1) - N.lahiri(jd - 1));
      const nakYest  = Math.floor(moonYest / (360/27));
      const isChange = nak.num !== nakYest;

      return {
        nakshatra   : nak,
        marketProfile: profile,
        tara,
        isNakChange : isChange,
        overallScore: profile.score + tara.score,
        hindiSummary: `${nak.hi} (${nak.num+1}) पाद ${nak.pada} — ${profile.hindiText}${isChange ? ' | 🔔 नक्षत्र परिवर्तन!' : ''}`,
        schemaVersion: "6.0",
      };
    } catch (e) {
      console.error('[NAKSHATRA] analyzeForDate error:', e);
      return { nakshatra: NAKSHATRA_PROFILES[0], overallScore: 0 };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    NAKSHATRA_PROFILES, BEHAVIOR_SCORE,
    getCurrentNakshatra, getMarketProfile,
    getNakshatraCalendar, getTarabala, getNakshatraPada,
    analyzeForDate,
    NASDAQ_BIRTH_NAK: 3,
  };

})();

if (typeof module !== 'undefined') module.exports = NAKSHATRA_ENGINE;
if (typeof window !== 'undefined') window.NAKSHATRA_ENGINE = NAKSHATRA_ENGINE;

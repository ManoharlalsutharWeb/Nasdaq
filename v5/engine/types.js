/* ============================================================
   NASDAQ Vedic System V5 — engine/types.js
   Standard JSON schemas + constants (SCHEMA_VERSION 5.0)
   ============================================================ */
'use strict';

const TYPES = {
  SCHEMA_VERSION: "5.0",

  RISK_TAGS: ["TRAP","SPIKE","WHIPSAW","GAP","REVERSAL","RANGE","CRASH_RISK","SIDEWAYS",
              "BULL_TRAP","BEAR_TRAP","DOUBLE_TRAP","ONE_WAY","SWEEP","CONTINUATION"],
  SEVERITIES: ["P1","P2","P3"],  // P1=highest
  DIRECTIONS: ["BULL","BEAR","NEUT"],
  TRAP_TYPES: ["bull","bear","double","one-way","none"],

  // Standard ModuleReport shape
  ModuleReport: {
    moduleId:"",dateIST:"",relevanceScore:0,directionHint:"NEUT",
    confidenceImpact:0,riskTags:[],
    timeWindows:[],      // [{label,startIST,peakIST,endIST,severity,tags,notes}]
    explanations:[],     // user-readable bullets
    evidence:[],         // internal: rule+feature that triggered (for QA)
    schemaVersion:"5.0"
  },

  // Standard FinalDailyReport shape
  FinalDailyReport: {
    dateIST:"",finalCall:"NEUT",finalConfidence:0,
    topReasons:[],topRisks:[],
    bestWindows:[],avoidWindows:[],
    invalidationRules:[],
    crashRegimeWindows:[],
    moduleScores:{},
    schemaVersion:"5.0"
  },

  // Time window shape
  TimeWindow: {
    label:"",startIST:"",peakIST:"",endIST:"",
    severity:"P3",tags:[],notes:[]
  },

  // Nakshatra data
  NAKSHATRAS_EN: ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
    'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
    'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula',
    'Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
    'Purva Bhadrapada','Uttara Bhadrapada','Revati'],
  NAKSHATRAS_HI: ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा',
    'पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्व फाल्गुनी','उत्तर फाल्गुनी',
    'हस्त','चित्रा','स्वाति','विशाखा','अनुराधा','ज्येष्ठा','मूल',
    'पूर्व आषाढ़ा','उत्तर आषाढ़ा','श्रवण','धनिष्ठा','शतभिषा',
    'पूर्व भाद्रपद','उत्तर भाद्रपद','रेवती'],
  NAKSHATRA_LORDS: ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
    'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
    'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'],

  RASHIS_EN:  ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
  RASHIS_HI:  ['मेष','वृष','मिथुन','कर्क','सिंह','कन्या',
               'तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'],
  RASHI_SYM:  ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'],
  RASHI_LORDS:['Mars','Venus','Mercury','Moon','Sun','Mercury',
               'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'],
  RASHI_LORDS_HI:['मंगल','शुक्र','बुध','चंद्र','सूर्य','बुध',
                  'शुक्र','मंगल','बृहस्पति','शनि','शनि','बृहस्पति'],

  PLANETS_EN: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu','Uranus','Neptune'],
  PLANETS_HI: ['सूर्य','चंद्र','बुध','शुक्र','मंगल','बृहस्पति','शनि','राहु','केतु','यूरेनस','नेप्च्यून'],
  PLANET_SYM: ['☉','☽','☿','♀','♂','♃','♄','☊','☋','♅','♆'],

  DASHA_ORDER: ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'],
  DASHA_HI:    {Ketu:'केतु',Venus:'शुक्र',Sun:'सूर्य',Moon:'चंद्र',Mars:'मंगल',
                Rahu:'राहु',Jupiter:'बृहस्पति',Saturn:'शनि',Mercury:'बुध'},
  DASHA_YEARS: {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17},

  BHAVA_SIG_HI: [
    'बाज़ार खुलना, प्रवृत्ति','धन, आय, कमाई',
    'संचार, तकनीक, समाचार','आधार, समर्थन स्तर',
    'सट्टा, लाभ, Bull Run','सुधार, ऋण, बाधा',
    'साझेदारी, M&A, संस्थागत','क्रैश, छुपा जोखिम',
    'विस्तार, भाग्य, दीर्घकालिक','नियामक, अधिकार',
    'रैली, वॉल्यूम, सामूहिक लाभ','हानि, गिरावट, बाहर निकलना'
  ],
  BHAVA_MKT_SCORE: [2,3,1,1,5,-3,2,-5,4,0,5,-4],

  // Nakshatra market profile
  NAK_PROFILE: {
    'Ashwini':   {sc:3, trap:'LOW',   side:'LOW',   mode:'TRENDING', desc:'शीघ्र गति, नई शुरुआत, Futures में तेज़ी संभव'},
    'Bharani':   {sc:-2,trap:'MED',   side:'MED',   mode:'REVERSAL', desc:'परिवर्तन काल, दबाव, सावधान'},
    'Krittika':  {sc:2, trap:'LOW',   side:'LOW',   mode:'TRENDING', desc:'अग्नि तत्व, मजबूत ब्रेकआउट'},
    'Rohini':    {sc:5, trap:'VLOW',  side:'LOW',   mode:'STRONG_BULL', desc:'सर्वोत्तम नक्षत्र, वृद्धि, समृद्धि'},
    'Mrigashira':{sc:2, trap:'MED',   side:'MED',   mode:'MILD_BULL', desc:'खोज, दोहरी दिशा'},
    'Ardra':     {sc:-3,trap:'HIGH',  side:'LOW',   mode:'VOLATILE_BEAR', desc:'तूफान, उथल-पुथल, अस्थिरता'},
    'Punarvasu': {sc:3, trap:'LOW',   side:'LOW',   mode:'RECOVERY', desc:'पुनरुत्थान, रिकवरी'},
    'Pushya':    {sc:5, trap:'VLOW',  side:'VLOW',  mode:'STRONG_BULL', desc:'सर्वश्रेष्ठ नक्षत्र, खरीदारी उत्तम'},
    'Ashlesha':  {sc:-4,trap:'VHIGH', side:'MED',   mode:'BULL_TRAP', desc:'छल, अचानक गिरावट, Bull Trap'},
    'Magha':     {sc:2, trap:'LOW',   side:'LOW',   mode:'INSTITUTIONAL', desc:'राज-शक्ति, संस्थागत खरीदारी'},
    'Purva Phalguni':{sc:3,trap:'LOW',side:'LOW',   mode:'BULL', desc:'भोग, Bull Run, वृद्धि'},
    'Uttara Phalguni':{sc:4,trap:'VLOW',side:'LOW', mode:'STABLE_BULL', desc:'स्थिर उपलब्धि, सुरक्षित तेज़ी'},
    'Hasta':     {sc:4, trap:'LOW',   side:'LOW',   mode:'BREAKOUT', desc:'कुशल चाल, सटीक ब्रेकआउट'},
    'Chitra':    {sc:2, trap:'MED',   side:'HIGH',  mode:'SIDEWAYS', desc:'चमक, लेकिन अस्थिर'},
    'Swati':     {sc:3, trap:'LOW',   side:'MED',   mode:'MILD_BULL', desc:'लचीला, बुलिश'},
    'Vishakha':  {sc:-2,trap:'HIGH',  side:'HIGH',  mode:'SIDEWAYS', desc:'द्विधा, अनिश्चितता'},
    'Anuradha':  {sc:4, trap:'LOW',   side:'LOW',   mode:'BULL', desc:'मित्रता, सहयोग, तेज़ी'},
    'Jyeshtha':  {sc:-3,trap:'HIGH',  side:'LOW',   mode:'BEAR_TRAP', desc:'वर्चस्व, पतन, Bear Trap'},
    'Mula':      {sc:-4,trap:'HIGH',  side:'LOW',   mode:'CRASH', desc:'जड़ उखड़ना, बड़ी गिरावट, Crash Risk'},
    'Purva Ashadha':{sc:2,trap:'MED', side:'MED',   mode:'MILD_BULL', desc:'विजय इच्छा, मध्यम बुलिश'},
    'Uttara Ashadha':{sc:4,trap:'LOW',side:'LOW',   mode:'STRONG_BULL', desc:'अंतिम विजय, उच्च बुलिश'},
    'Shravana':  {sc:3, trap:'LOW',   side:'MED',   mode:'STEADY_BULL', desc:'सुनना, स्थिर वृद्धि'},
    'Dhanishtha':{sc:3, trap:'LOW',   side:'LOW',   mode:'BULL', desc:'धन, वाद्य, तेज़ी'},
    'Shatabhisha':{sc:-2,trap:'MED',  side:'HIGH',  mode:'SIDEWAYS', desc:'रहस्य, अनिश्चितता'},
    'Purva Bhadrapada':{sc:-3,trap:'HIGH',side:'MED',mode:'VOLATILE', desc:'उग्रता, अस्थिरता'},
    'Uttara Bhadrapada':{sc:2,trap:'LOW',side:'MED',mode:'MILD_BULL', desc:'गहराई, सटीक चाल'},
    'Revati':    {sc:3, trap:'LOW',   side:'LOW',   mode:'BULL', desc:'पूर्णता, यात्रा का अंत, शुभ'},
  },

  US_HOLIDAYS: [
    '2024-01-01','2024-01-15','2024-02-19','2024-03-29','2024-05-27',
    '2024-06-19','2024-07-04','2024-09-02','2024-11-28','2024-12-25',
    '2025-01-01','2025-01-20','2025-02-17','2025-04-18','2025-05-26',
    '2025-06-19','2025-07-04','2025-09-01','2025-11-27','2025-12-25',
    '2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25',
    '2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25',
  ],
};

if(typeof module !== 'undefined') module.exports = TYPES;
if(typeof window !== 'undefined') window.TYPES = TYPES;

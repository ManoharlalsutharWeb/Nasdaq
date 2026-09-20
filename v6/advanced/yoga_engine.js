/* ============================================================
   VedicAladdin V6 — advanced/yoga_engine.js
   32 Vedic Market Yogas — detect, interpret, score
   Raja + Dhana + Anishta + Special Market Yogas
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const YOGA_ENGINE = (function () {
  'use strict';

  function getNatal() { return typeof NATAL !== 'undefined' ? NATAL : require('../core/natal'); }

  // ── Helpers ───────────────────────────────────────────────
  function diff(lon1, lon2) {
    const N = getNatal();
    return Math.abs(N.n180(lon2 - lon1));
  }
  function sign(lon) { return Math.floor(lon / 30); }
  function house(rashi, lagna) { return (rashi - lagna + 12) % 12 + 1; }
  function isKendra(h) { return [1,4,7,10].includes(h); }
  function isTrikona(h) { return [1,5,9].includes(h); }
  function isUpachaya(h) { return [3,6,10,11].includes(h); }
  function isMalefic(eng) { return ['Mars','Saturn','Rahu','Ketu'].includes(eng); }
  function isBenefic(eng) { return ['Jupiter','Venus','Moon'].includes(eng); }

  const RASHI_LORDS = ['Mars','Venus','Mercury','Moon','Sun','Mercury',
                       'Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];

  function lord(rashi) { return RASHI_LORDS[rashi]; }

  // ════════════════════════════════════════════════════════
  // YOGA DEFINITIONS — 32 yogas
  // Each: { id, name, nameHi, type, priority, bullScore, check(tp, nd) }
  // tp = transit planets array, nd = natal D1
  // ════════════════════════════════════════════════════════
  const YOGAS = [

    // ── RAJA YOGAS (1-8) ────────────────────────────────────
    {
      id:'gaja_kesari', name:'Gaja Kesari', nameHi:'गजकेसरी योग',
      type:'RAJA', priority:'P1', bullScore:8,
      desc:'बृहस्पति-चंद्र केंद्र में — बाज़ार में बड़ी तेजी, संस्थागत खरीद',
      check(tp, nd) {
        const jup = tp.find(p => p.eng === 'Jupiter');
        const moo = tp.find(p => p.eng === 'Moon');
        if (!jup || !moo) return false;
        const h = Math.abs((sign(jup.sidLon) - sign(moo.sidLon) + 12) % 12);
        return [0,3,6,9].includes(h);
      },
    },
    {
      id:'hamsa', name:'Hamsa', nameHi:'हंस योग',
      type:'RAJA', priority:'P1', bullScore:7,
      desc:'बृहस्पति केंद्र में स्वगृह/उच्च — बड़ी तेजी',
      check(tp, nd) {
        const jup = tp.find(p => p.eng === 'Jupiter');
        if (!jup) return false;
        return isKendra(house(sign(jup.sidLon), nd.lagnaSign)) &&
               ['उच्च','स्वगृह'].includes(jup.dignity || '');
      },
    },
    {
      id:'malavya', name:'Malavya', nameHi:'मालव्य योग',
      type:'RAJA', priority:'P1', bullScore:7,
      desc:'शुक्र केंद्र में स्वगृह/उच्च — उपभोक्ता तेजी',
      check(tp, nd) {
        const ven = tp.find(p => p.eng === 'Venus');
        if (!ven) return false;
        return isKendra(house(sign(ven.sidLon), nd.lagnaSign)) &&
               ['उच्च','स्वगृह'].includes(ven.dignity || '');
      },
    },
    {
      id:'ruchaka', name:'Ruchaka', nameHi:'रुचक योग',
      type:'RAJA', priority:'P2', bullScore:-3,
      desc:'मंगल केंद्र में स्वगृह/उच्च — अचानक तेज़ चाल, खतरनाक',
      check(tp, nd) {
        const mar = tp.find(p => p.eng === 'Mars');
        if (!mar) return false;
        return isKendra(house(sign(mar.sidLon), nd.lagnaSign)) &&
               ['उच्च','स्वगृह'].includes(mar.dignity || '');
      },
    },
    {
      id:'bhadra', name:'Bhadra', nameHi:'भद्र योग',
      type:'RAJA', priority:'P1', bullScore:6,
      desc:'बुध केंद्र में स्वगृह/उच्च — टेक/NASDAQ तेजी',
      check(tp, nd) {
        const mer = tp.find(p => p.eng === 'Mercury');
        if (!mer) return false;
        return isKendra(house(sign(mer.sidLon), nd.lagnaSign)) &&
               ['उच्च','स्वगृह'].includes(mer.dignity || '');
      },
    },
    {
      id:'sasa', name:'Sasa', nameHi:'शश योग',
      type:'RAJA', priority:'P2', bullScore:-2,
      desc:'शनि केंद्र में स्वगृह/उच्च — दीर्घ सुधार के बाद तेजी',
      check(tp, nd) {
        const sat = tp.find(p => p.eng === 'Saturn');
        if (!sat) return false;
        return isKendra(house(sign(sat.sidLon), nd.lagnaSign)) &&
               ['उच्च','स्वगृह'].includes(sat.dignity || '');
      },
    },
    {
      id:'dharma_karma', name:'Dharma Karma Adhipati', nameHi:'धर्मकर्माधिपति योग',
      type:'RAJA', priority:'P1', bullScore:8,
      desc:'9वें और 10वें भाव के स्वामी का संबंध — NASDAQ बुलिश',
      check(tp, nd) {
        const lord9  = lord((nd.lagnaSign + 8)  % 12);
        const lord10 = lord((nd.lagnaSign + 9)  % 12);
        const p9  = tp.find(p => p.eng === lord9);
        const p10 = tp.find(p => p.eng === lord10);
        if (!p9 || !p10) return false;
        return diff(p9.sidLon, p10.sidLon) < 10 ||
               house(sign(p9.sidLon), nd.lagnaSign) === house(sign(p10.sidLon), nd.lagnaSign);
      },
    },
    {
      id:'lakshmi', name:'Lakshmi', nameHi:'लक्ष्मी योग',
      type:'RAJA', priority:'P1', bullScore:7,
      desc:'9वें भाव स्वामी + शुक्र बलवान — धन/समृद्धि',
      check(tp, nd) {
        const lord9 = lord((nd.lagnaSign + 8) % 12);
        const p9    = tp.find(p => p.eng === lord9);
        const ven   = tp.find(p => p.eng === 'Venus');
        if (!p9 || !ven) return false;
        const ven9 = isTrikona(house(sign(ven.sidLon), nd.lagnaSign)) ||
                     isKendra(house(sign(ven.sidLon), nd.lagnaSign));
        return ven9 && p9.strength > 60;
      },
    },

    // ── DHANA YOGAS (9-13) ──────────────────────────────────
    {
      id:'ven_jup_trine', name:'Venus Jupiter Trine', nameHi:'शुक्र-बृहस्पति त्रिकोण',
      type:'DHANA', priority:'P1', bullScore:9,
      desc:'शुक्र-बृहस्पति त्रिकोण — सर्वश्रेष्ठ धन योग, तेज तेजी',
      check(tp) {
        const jup = tp.find(p => p.eng === 'Jupiter');
        const ven = tp.find(p => p.eng === 'Venus');
        if (!jup || !ven) return false;
        const d = diff(jup.sidLon, ven.sidLon);
        return d < 10 || Math.abs(d - 120) < 10;
      },
    },
    {
      id:'1st_5th_lords', name:'1st-5th Lord', nameHi:'लग्नेश-पंचमेश योग',
      type:'DHANA', priority:'P1', bullScore:6,
      desc:'लग्नेश और पंचमेश का संबंध — बुलिश',
      check(tp, nd) {
        const lord1 = lord(nd.lagnaSign);
        const lord5 = lord((nd.lagnaSign + 4) % 12);
        const p1 = tp.find(p => p.eng === lord1);
        const p5 = tp.find(p => p.eng === lord5);
        if (!p1 || !p5) return false;
        return diff(p1.sidLon, p5.sidLon) < 10;
      },
    },
    {
      id:'1st_9th_lords', name:'1st-9th Lord', nameHi:'लग्नेश-भाग्येश योग',
      type:'DHANA', priority:'P1', bullScore:7,
      desc:'लग्नेश और भाग्येश का संबंध — भाग्य योग',
      check(tp, nd) {
        const lord1 = lord(nd.lagnaSign);
        const lord9 = lord((nd.lagnaSign + 8) % 12);
        const p1 = tp.find(p => p.eng === lord1);
        const p9 = tp.find(p => p.eng === lord9);
        if (!p1 || !p9) return false;
        return diff(p1.sidLon, p9.sidLon) < 10;
      },
    },
    {
      id:'2nd_11th_lords', name:'2nd-11th Lord', nameHi:'धनेश-लाभेश योग',
      type:'DHANA', priority:'P1', bullScore:7,
      desc:'धनेश और लाभेश का संबंध — लाभ योग',
      check(tp, nd) {
        const lord2  = lord((nd.lagnaSign + 1)  % 12);
        const lord11 = lord((nd.lagnaSign + 10) % 12);
        const p2  = tp.find(p => p.eng === lord2);
        const p11 = tp.find(p => p.eng === lord11);
        if (!p2 || !p11) return false;
        return diff(p2.sidLon, p11.sidLon) < 10;
      },
    },
    {
      id:'kubera', name:'Kubera', nameHi:'कुबेर योग',
      type:'DHANA', priority:'P1', bullScore:8,
      desc:'बुध+बृहस्पति+शनि — वित्तीय बुल, संस्थागत प्रवाह',
      check(tp) {
        const mer = tp.find(p => p.eng === 'Mercury');
        const jup = tp.find(p => p.eng === 'Jupiter');
        const sat = tp.find(p => p.eng === 'Saturn');
        if (!mer || !jup || !sat) return false;
        return diff(mer.sidLon, jup.sidLon) < 12 || diff(jup.sidLon, sat.sidLon) < 12;
      },
    },

    // ── ANISHTA YOGAS (14-20) ───────────────────────────────
    {
      id:'kemadruma', name:'Kemadruma', nameHi:'केमद्रुम योग',
      type:'ANISHTA', priority:'P2', bullScore:-5,
      desc:'चंद्र अकेला — भावनात्मक बिकवाली, कमज़ोर बाज़ार',
      check(tp) {
        const moo = tp.find(p => p.eng === 'Moon');
        if (!moo) return false;
        const moonSign = sign(moo.sidLon);
        const adjacent = tp.filter(p =>
          p.eng !== 'Moon' && p.eng !== 'Rahu' && p.eng !== 'Ketu' &&
          [1,11].includes((sign(p.sidLon) - moonSign + 12) % 12)
        );
        return adjacent.length === 0;
      },
    },
    {
      id:'shakata', name:'Shakata', nameHi:'शकट योग',
      type:'ANISHTA', priority:'P2', bullScore:-5,
      desc:'बृहस्पति-चंद्र 6/8 — बाज़ार उथल-पुथल',
      check(tp) {
        const jup = tp.find(p => p.eng === 'Jupiter');
        const moo = tp.find(p => p.eng === 'Moon');
        if (!jup || !moo) return false;
        const h = (sign(moo.sidLon) - sign(jup.sidLon) + 12) % 12;
        return [5,7].includes(h);
      },
    },
    {
      id:'daridra', name:'Daridra', nameHi:'दरिद्र योग',
      type:'ANISHTA', priority:'P2', bullScore:-4,
      desc:'11वें भाव स्वामी 6/8/12 में — लाभ नहीं, मंदी',
      check(tp, nd) {
        const lord11 = lord((nd.lagnaSign + 10) % 12);
        const p11    = tp.find(p => p.eng === lord11);
        if (!p11) return false;
        return [6,8,12].includes(house(sign(p11.sidLon), nd.lagnaSign));
      },
    },
    {
      id:'kartari', name:'Kartari', nameHi:'कर्तरी योग',
      type:'ANISHTA', priority:'P3', bullScore:-3,
      desc:'ग्रह दो पापियों के बीच — कैद, अस्थिरता',
      check(tp) {
        const malefics = tp.filter(p => isMalefic(p.eng));
        const benefics = tp.filter(p => isBenefic(p.eng));
        return benefics.some(ben =>
          malefics.some(m1 =>
            malefics.some(m2 => m1.eng !== m2.eng &&
              diff(m1.sidLon, ben.sidLon) < 15 && diff(m2.sidLon, ben.sidLon) < 15 &&
              Math.abs(sign(m1.sidLon) - sign(m2.sidLon)) === 2
            )
          )
        );
      },
    },
    {
      id:'voshi', name:'Voshi', nameHi:'वोशी योग',
      type:'ANISHTA', priority:'P3', bullScore:-3,
      desc:'सूर्य के चारों तरफ पापी — सरकारी नीति नकारात्मक',
      check(tp) {
        const sun = tp.find(p => p.eng === 'Sun');
        if (!sun) return false;
        const sunSign = sign(sun.sidLon);
        const neighbors = tp.filter(p =>
          p.eng !== 'Sun' && isMalefic(p.eng) &&
          [1,11].includes((sign(p.sidLon) - sunSign + 12) % 12)
        );
        return neighbors.length >= 2;
      },
    },
    {
      id:'graha_yuddha', name:'Graha Yuddha', nameHi:'ग्रह युद्ध',
      type:'ANISHTA', priority:'P1', bullScore:-6,
      desc:'दो ग्रह 1° के अंदर — अत्यधिक उतार-चढ़ाव, दिशा अनिश्चित',
      check(tp) {
        const visible = tp.filter(p => ['Mercury','Venus','Mars','Jupiter','Saturn'].includes(p.eng));
        for (let i = 0; i < visible.length - 1; i++) {
          for (let j = i + 1; j < visible.length; j++) {
            if (diff(visible[i].sidLon, visible[j].sidLon) < 1) return true;
          }
        }
        return false;
      },
    },
    {
      id:'chandal', name:'Chandal', nameHi:'चांडाल योग',
      type:'ANISHTA', priority:'P1', bullScore:-7,
      desc:'बृहस्पति+राहु/केतु — गुरु दूषित, झूठी रैली/क्रैश',
      check(tp) {
        const jup  = tp.find(p => p.eng === 'Jupiter');
        const rahu = tp.find(p => p.eng === 'Rahu');
        const ketu = tp.find(p => p.eng === 'Ketu');
        if (!jup) return false;
        const jupSign = sign(jup.sidLon);
        return (rahu && sign(rahu.sidLon) === jupSign) ||
               (ketu && sign(ketu.sidLon) === jupSign);
      },
    },

    // ── SPECIAL MARKET YOGAS (21-32) ─────────────────────────
    {
      id:'neecha_bhanga', name:'Neecha Bhanga Raja', nameHi:'नीच भंग राज योग',
      type:'SPECIAL', priority:'P1', bullScore:7,
      desc:'नीच ग्रह का कैंसिल — मंदी के बाद बड़ी तेजी',
      check(tp, nd) {
        const DEBIL = { Sun:6, Moon:7, Mars:3, Mercury:11, Jupiter:9, Venus:5, Saturn:0 };
        return tp.some(p => {
          const debilSign = DEBIL[p.eng];
          if (debilSign === undefined || sign(p.sidLon) !== debilSign) return false;
          // Cancellation: lord of debil sign or exaltation lord in kendra
          const debilLord = lord(debilSign);
          const debilLordP = tp.find(x => x.eng === debilLord);
          return debilLordP && isKendra(house(sign(debilLordP.sidLon), nd.lagnaSign));
        });
      },
    },
    {
      id:'viparita_raja', name:'Viparita Raja', nameHi:'विपरीत राज योग',
      type:'SPECIAL', priority:'P2', bullScore:5,
      desc:'6/8/12 के स्वामी 6/8/12 में — अशांति से लाभ',
      check(tp, nd) {
        const dusthana = [5,7,11]; // 6th-1, 8th-1, 12th-1 (0-indexed offsets)
        const lords = dusthana.map(off => lord((nd.lagnaSign + off) % 12));
        return lords.some(l => {
          const p = tp.find(x => x.eng === l);
          if (!p) return false;
          return [6,8,12].includes(house(sign(p.sidLon), nd.lagnaSign));
        });
      },
    },
    {
      id:'parivartana', name:'Parivartana', nameHi:'परिवर्तन योग',
      type:'SPECIAL', priority:'P2', bullScore:3,
      desc:'दो ग्रह एक-दूसरे की राशि में — बाज़ार में अचानक पलटाव',
      check(tp) {
        for (let i = 0; i < tp.length - 1; i++) {
          for (let j = i + 1; j < tp.length; j++) {
            const p1 = tp[i], p2 = tp[j];
            if (lord(sign(p1.sidLon)) === p2.eng && lord(sign(p2.sidLon)) === p1.eng) return true;
          }
        }
        return false;
      },
    },
    {
      id:'vargottama', name:'Vargottama', nameHi:'वर्गोत्तम योग',
      type:'SPECIAL', priority:'P2', bullScore:4,
      desc:'ग्रह D1 और D9 में एक ही राशि — स्थिरता',
      check(tp, nd) {
        // Approximate: planet in first 3°20' or 10°-13°20' or 20°-23°20' of sign
        return tp.some(p => {
          const sidLon = p.sidLon;
          const posInSign = sidLon % 30;
          const navSize   = 30 / 9;
          const navNum    = Math.floor(posInSign / navSize);
          const rashiSign = sign(sidLon);
          const navSign   = (rashiSign * 9 + navNum) % 12;
          return navSign === rashiSign; // same sign = vargottama
        });
      },
    },
    {
      id:'pushkara', name:'Pushkara Navamsa', nameHi:'पुष्कर नवांश',
      type:'SPECIAL', priority:'P3', bullScore:4,
      desc:'शुभ नवांश डिग्री में ग्रह — अनुकूल काल',
      check(tp) {
        const PUSHKARA_DEG = [
          0.8,  3.5,  10.2, 12.8, 17.2, 21.6, 23.3, 26.0,
          6.7,  14.8, 15.8, 19.3, 20.4, 24.8, 28.2,
        ];
        return tp.some(p => {
          const posInSign = p.sidLon % 30;
          return PUSHKARA_DEG.some(pd => Math.abs(posInSign - pd) < 0.5);
        });
      },
    },
    {
      id:'mridanga', name:'Mridanga', nameHi:'मृदंग योग',
      type:'SPECIAL', priority:'P1', bullScore:9,
      desc:'3+ ग्रह स्वगृह/उच्च — अत्यंत बुलिश, बड़ी तेजी',
      check(tp) {
        const strong = tp.filter(p => ['उच्च','स्वगृह'].includes(p.dignity || ''));
        return strong.length >= 3;
      },
    },
    {
      id:'pancha_mahapurusha', name:'Pancha Mahapurusha', nameHi:'पंचमहापुरुष योग',
      type:'SPECIAL', priority:'P1', bullScore:8,
      desc:'पंचमहापुरुष योगों में से कोई — बड़ी चाल',
      check(tp, nd) {
        const qualify = ['Mars','Mercury','Jupiter','Venus','Saturn'];
        return qualify.some(eng => {
          const p = tp.find(x => x.eng === eng);
          if (!p) return false;
          return isKendra(house(sign(p.sidLon), nd.lagnaSign)) &&
                 ['उच्च','स्वगृह'].includes(p.dignity || '');
        });
      },
    },
    {
      id:'kal_sarpa', name:'Kal Sarpa', nameHi:'काल सर्प योग',
      type:'SPECIAL', priority:'P1', bullScore:-8,
      desc:'सभी ग्रह राहु-केतु के बीच — बड़ी गिरावट/अस्थिरता',
      check(tp) {
        const rahu = tp.find(p => p.eng === 'Rahu');
        const ketu = tp.find(p => p.eng === 'Ketu');
        if (!rahu || !ketu) return false;
        const main = tp.filter(p => !['Rahu','Ketu'].includes(p.eng));
        const rahuLon = rahu.sidLon;
        const ketuLon = ketu.sidLon;
        return main.every(p => {
          const lon  = p.sidLon;
          const arc1 = (lon - rahuLon + 360) % 360;
          const arc2 = (lon - ketuLon + 360) % 360;
          return arc1 < 180 || arc2 < 180;
        });
      },
    },
    {
      id:'saraswati', name:'Saraswati', nameHi:'सरस्वती योग',
      type:'SPECIAL', priority:'P1', bullScore:7,
      desc:'बुध+बृहस्पति+शुक्र शुभ स्थान में — ज्ञान/टेक रैली',
      check(tp, nd) {
        const mer = tp.find(p => p.eng === 'Mercury');
        const jup = tp.find(p => p.eng === 'Jupiter');
        const ven = tp.find(p => p.eng === 'Venus');
        if (!mer || !jup || !ven) return false;
        const good = [p => isTrikona(house(sign(p.sidLon), nd.lagnaSign)) ||
                           isKendra(house(sign(p.sidLon), nd.lagnaSign))];
        return good[0](mer) && good[0](jup) && good[0](ven);
      },
    },
    {
      id:'adhi', name:'Adhi', nameHi:'आधि योग',
      type:'SPECIAL', priority:'P2', bullScore:6,
      desc:'शुभ ग्रह 6/7/8 में चंद्र से — संरक्षण/धन',
      check(tp) {
        const moo = tp.find(p => p.eng === 'Moon');
        if (!moo) return false;
        const moonSign = sign(moo.sidLon);
        const beneficsInRange = tp.filter(p =>
          isBenefic(p.eng) && [5,6,7].includes((sign(p.sidLon) - moonSign + 12) % 12)
        );
        return beneficsInRange.length >= 2;
      },
    },
    {
      id:'durudhara', name:'Durudhara', nameHi:'दुरुधरा योग',
      type:'SPECIAL', priority:'P3', bullScore:4,
      desc:'चंद्र के दोनों तरफ ग्रह — बाज़ार में दिशा',
      check(tp) {
        const moo = tp.find(p => p.eng === 'Moon');
        if (!moo) return false;
        const moonSign = sign(moo.sidLon);
        const main = tp.filter(p => !['Moon','Rahu','Ketu','Sun'].includes(p.eng));
        const left  = main.some(p => (sign(p.sidLon) - moonSign + 12) % 12 === 11);
        const right = main.some(p => (sign(p.sidLon) - moonSign + 12) % 12 === 1);
        return left && right;
      },
    },
    {
      id:'vasumati', name:'Vasumati', nameHi:'वसुमति योग',
      type:'SPECIAL', priority:'P2', bullScore:5,
      desc:'शुभ ग्रह उपचय भावों में — संचय/तेजी',
      check(tp, nd) {
        const beneficsInUpachaya = tp.filter(p =>
          isBenefic(p.eng) && isUpachaya(house(sign(p.sidLon), nd.lagnaSign))
        );
        return beneficsInUpachaya.length >= 3;
      },
    },
  ];

  // ════════════════════════════════════════════════════════
  // detect — run all 32 yogas
  // ════════════════════════════════════════════════════════
  /**
   * @param {Array} natalPlanets — from NATAL.buildD1().planets
   * @param {Array} transitPlanets — from TRANSITS.getTransitPlanets()
   * @param {Object} natalD1 — full natal chart
   * @returns {Array<YogaResult>}
   */
  function detect(natalPlanets, transitPlanets, natalD1) {
    const results = [];
    const tp = transitPlanets || natalPlanets;

    YOGAS.forEach(yoga => {
      try {
        const active   = yoga.check(tp, natalD1);
        const strength = active ? Math.min(100, Math.abs(yoga.bullScore) * 10 + 20) : 0;
        results.push({
          id        : yoga.id,
          name      : yoga.name,
          nameHi    : yoga.nameHi,
          type      : yoga.type,
          priority  : yoga.priority,
          bullScore : yoga.bullScore,
          active,
          strength,
          hindiEffect: active ? yoga.desc : `${yoga.nameHi} — सक्रिय नहीं`,
          schemaVersion: "6.0",
        });
      } catch (e) {
        results.push({ id: yoga.id, name: yoga.name, nameHi: yoga.nameHi,
                       type: yoga.type, active: false, strength: 0, bullScore: 0 });
      }
    });

    return results;
  }

  // ════════════════════════════════════════════════════════
  // interpret — summary interpretation
  // ════════════════════════════════════════════════════════
  function interpret(yogaResults) {
    const active = yogaResults.filter(y => y.active);
    const bull   = active.filter(y => y.bullScore > 0);
    const bear   = active.filter(y => y.bullScore < 0);
    const totalScore = active.reduce((s, y) => s + y.bullScore, 0);

    return {
      activeCount  : active.length,
      bullYogas    : bull.length,
      bearYogas    : bear.length,
      totalScore,
      topYoga      : active.sort((a,b) => Math.abs(b.bullScore) - Math.abs(a.bullScore))[0] || null,
      hindiSummary : `${active.length} योग सक्रिय: ${bull.length} बुलिश, ${bear.length} बियरिश | स्कोर: ${totalScore > 0 ? '+' : ''}${totalScore}`,
      signal       : totalScore >= 6 ? 'STRONG_BULL' : totalScore >= 2 ? 'BULL' :
                     totalScore <= -6 ? 'STRONG_BEAR' : totalScore <= -2 ? 'BEAR' : 'NEUTRAL',
    };
  }

  // ════════════════════════════════════════════════════════
  // analyzeForDate — wrapper
  // ════════════════════════════════════════════════════════
  function analyzeForDate(dateStr, natalD1) {
    try {
      const N  = getNatal();
      const d1 = natalD1 || N.getNasdaq();
      const [y, m, d] = dateStr.split('-').map(Number);
      const jd   = N.JD(y, m, d, 15, 0);
      const ayan = N.lahiri(jd);

      const transitPlanets = d1.planets.map(p => {
        const lon    = N.n360(N.getPlanetLon(p.eng, jd) - ayan);
        const rashi  = Math.floor(lon / 30);
        const dignity = N.getDignity(p.eng, rashi);
        return { ...p, sidLon: lon, rashi, dignity };
      });

      const yogaResults = detect(d1.planets, transitPlanets, d1);
      const summary     = interpret(yogaResults);

      return { yogaResults, summary, schemaVersion: "6.0" };
    } catch (e) {
      console.error('[YOGA_ENGINE] analyzeForDate error:', e);
      return { yogaResults: [], summary: { totalScore: 0, signal: 'NEUTRAL' } };
    }
  }

  // ── Public API ────────────────────────────────────────────
  return { YOGAS, detect, interpret, analyzeForDate };

})();

if (typeof module !== 'undefined') module.exports = YOGA_ENGINE;
if (typeof window !== 'undefined') window.YOGA_ENGINE = YOGA_ENGINE;

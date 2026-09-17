/* ============================================================
   NASDAQ Vedic System V5 — engine/transits.js
   Transit positions + aspects + orb + exactness timestamps
   ============================================================ */
'use strict';

const TRANSITS = (function(){
  function getNatal(){ return typeof NATAL!=='undefined'?NATAL:require('./natal'); }

  const ASPECTS=[
    {name:'युति',  eng:'Conjunction',deg:0,  orb:8,weight:1.0},
    {name:'षष्ठांश',eng:'Sextile',   deg:60, orb:6,weight:0.5},
    {name:'वर्ग',   eng:'Square',     deg:90, orb:8,weight:0.8},
    {name:'त्रिकोण',eng:'Trine',     deg:120,orb:8,weight:1.0},
    {name:'षड्भाग', eng:'Quincunx',  deg:150,orb:4,weight:0.3},
    {name:'प्रतियोगी',eng:'Opposition',deg:180,orb:8,weight:0.9},
  ];

  function n180(a){ const N=typeof require==='function'?require('./natal').n180:NATAL.n180; return N(a); }

  function getAspect(l1,l2){
    const N=getNatal();
    const d=Math.abs(N.n180(l2-l1));
    for(const a of ASPECTS){
      const diff=Math.abs(d-a.deg);
      if(diff<=a.orb) return{...a,orb:diff,applying:diff<1};
    }
    return null;
  }

  // Impact score: transit planet → natal planet via aspect
  function aspectScore(tEng,nEng,asp){
    const PS={
      Jupiter:{b:5,m:-3},Venus:{b:4,m:-2},Moon:{b:2,m:-2},
      Mercury:{b:2,m:-2},Sun:{b:2,m:-2},Mars:{b:2,m:-4},
      Saturn:{b:2,m:-5},Rahu:{b:1,m:-4},Ketu:{b:1,m:-3},
      Uranus:{b:2,m:-3},Neptune:{b:1,m:-2},
    };
    const BEN=['Trine','Sextile'],MAL=['Square','Opposition'];
    const ML=['Mars','Saturn','Rahu','Ketu'],BL=['Jupiter','Venus','Moon'];
    const sc=PS[tEng]||{b:1,m:-1};
    let score=0;
    if(BEN.includes(asp.eng)) score=sc.b*asp.weight;
    else if(MAL.includes(asp.eng)) score=sc.m*asp.weight;
    else if(asp.eng==='Conjunction'){
      if(ML.includes(tEng)&&ML.includes(nEng)) score=-5;
      else if(BL.includes(tEng)&&BL.includes(nEng)) score=5;
      else score=ML.includes(tEng)?-3:2;
      score*=asp.weight;
    }
    return parseFloat(score.toFixed(2));
  }

  // Get all transit planets for a JD
  function getTransitPlanets(jd,natal_d1){
    const N=getNatal();
    const ayan=N.lahiri(jd);
    const lagnaSign=natal_d1.lagnaSign;
    return N.PLANETS_DEF.map(pd=>{
      const tropLon=N.getPlanetLon(pd.eng,jd);
      const sidLon=N.n360(tropLon-ayan);
      const rashi=Math.floor(sidLon/30);
      const deg=sidLon%30;
      const nak=Math.floor(sidLon/(360/27));
      const retro=N.isRetro(pd.eng,jd);
      const transHouse=(rashi-lagnaSign+12)%12+1;
      const dignity=N.getDignity(pd.eng,rashi);
      return{...pd,tropLon,sidLon,rashi,deg,nak,retro,transHouse,dignity,jd};
    });
  }

  // Get all transit-to-natal aspects
  function getAspects(transitPlanets,natal_d1){
    const aspects=[];
    transitPlanets.forEach(tp=>{
      natal_d1.planets.forEach(np=>{
        const asp=getAspect(tp.sidLon,np.sidLon);
        if(asp){
          const sc=aspectScore(tp.eng,np.eng,asp);
          aspects.push({
            from:tp.hi,fromEng:tp.eng,fromSym:tp.sym,
            to:np.hi,toEng:np.eng,toSym:np.sym,
            aspect:asp.name,aspectEng:asp.eng,
            orb:parseFloat(asp.orb.toFixed(2)),
            applying:asp.applying,weight:asp.weight,
            score:sc,fromHouse:tp.transHouse,toHouse:np.house,
            riskTag:sc<=-4?'CRASH_RISK':sc<=-2?'REVERSAL':sc>=4?'SPIKE':null
          });
        }
      });
    });
    return aspects.sort((a,b)=>Math.abs(b.score)-Math.abs(a.score));
  }

  // Transit summary score
  function getTransitScore(aspects){
    return parseFloat(aspects.reduce((s,a)=>s+a.score,0).toFixed(2));
  }

  // Moon speed (degrees/day)
  function moonSpeed(jd){
    const N=getNatal();
    const l1=N.getPlanetLon('Moon',jd-0.5);
    const l2=N.getPlanetLon('Moon',jd+0.5);
    return Math.abs(N.n180(l2-l1));
  }

  // Find exact conjunction/aspect time (binary search ±2 days)
  function findExactTime(tEng,nLon,jd,aspectDeg,searchDays=2){
    const N=getNatal();
    const ayan=N.lahiri(jd);
    let lo=jd-searchDays, hi=jd+searchDays;
    for(let iter=0;iter<40;iter++){
      const mid=(lo+hi)/2;
      const tLon=N.n360(N.getPlanetLon(tEng,mid)-N.lahiri(mid));
      const diff=N.n180(tLon-nLon)-aspectDeg;
      if(Math.abs(diff)<0.01) return mid;
      if(diff<0) lo=mid; else hi=mid;
    }
    return (lo+hi)/2;
  }

  // Build full transits report for a date
  function buildReport(dateIST,natal_d1,timeIST='15:00'){
    const N=getNatal();
    const[y,m,d]=dateIST.split('-').map(Number);
    const[lh,lm]=(timeIST||'15:00').split(':').map(Number);
    // Input is IST; the ephemeris JD is UTC. IST is UTC+05:30.
    const totalMin=lh*60+lm-330;
    const utcDay=Math.floor(totalMin/1440);
    const utcMin=((totalMin%1440)+1440)%1440;
    const utcDate=new Date(Date.UTC(y,m-1,d+utcDay,0,utcMin));
    const jd=N.JD(utcDate.getUTCFullYear(),utcDate.getUTCMonth()+1,utcDate.getUTCDate(),utcDate.getUTCHours(),utcDate.getUTCMinutes());
    const tPlanets=getTransitPlanets(jd,natal_d1);
    const aspects=getAspects(tPlanets,natal_d1);
    const totalScore=getTransitScore(aspects);
    const mSpd=moonSpeed(jd);
    const moon=tPlanets.find(p=>p.eng==='Moon');

    // Panchang
    const ayan=N.lahiri(jd);
    const sunSid=N.n360(N.getPlanetLon('Sun',jd)-ayan);
    const moonSid=N.n360(N.getPlanetLon('Moon',jd)-ayan);
    const lunarLon=N.n360(N.getPlanetLon('Moon',jd)-N.getPlanetLon('Sun',jd));
    const tithiNum=Math.floor(lunarLon/12)+1;
    const paksha=lunarLon<180?'शुक्ल':'कृष्ण';
    const nakIdx=Math.floor(moonSid/(360/27));
    const TNAK=typeof TYPES!=='undefined'?TYPES:(typeof require==='function'?require('./types'):null);
    const nakEn=TNAK.NAKSHATRAS_EN[nakIdx];
    const nakHi=TNAK.NAKSHATRAS_HI[nakIdx];
    const yogaLon=N.n360(sunSid+moonSid);
    const yogaIdx=Math.floor(yogaLon/(360/27))%27;
    const YOGAS_EN=['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti',
      'Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata',
      'Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
    const YOGAS_HI=['विष्कम्भ','प्रीति','आयुष्मान','सौभाग्य','शोभन','अतिगंड','सुकर्मा','धृति',
      'शूल','गंड','वृद्धि','ध्रुव','व्याघात','हर्षण','वज्र','सिद्धि','व्यतीपात',
      'वरीयान','परिघ','शिव','सिद्ध','साध्य','शुभ','शुक्ल','ब्रह्म','इंद्र','वैधृति'];
    const KARAN_HI=['बव','बालव','कौलव','तैतिल','गर','वणिज','विष्टि','शकुनि','चतुष्पद','नाग'];
    const VAR_HI=['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
    const nakProf=(TNAK.NAK_PROFILE||{})[nakEn]||{sc:0,trap:'MED',side:'MED',mode:'NORMAL',desc:'सामान्य'};

    // Panchang score
    const goodY=['Siddhi','Priti','Shubha','Sadhya','Dhruva','Harshana'];
    const badY=['Vishkambha','Vajra','Vyaghata','Parigha','Vaidhriti','Atiganda'];
    let panSc=nakProf.sc;
    if(goodY.includes(YOGAS_EN[yogaIdx])) panSc+=2;
    if(badY.includes(YOGAS_EN[yogaIdx]))  panSc-=2;
    if(paksha==='शुक्ल') panSc+=1; else panSc-=1;
    if([8,14,0].includes(tithiNum%15)) panSc-=2;

    return{
      dateIST,timeIST,jd,
      planets:tPlanets,
      aspects,
      totalScore,
      moonSpeed:parseFloat(mSpd.toFixed(3)),
      moonDruta:mSpd>13,
      moonManda:mSpd<11,
      panchang:{
        tithi:tithiNum,paksha,nakEn,nakHi,
        yogaEn:YOGAS_EN[yogaIdx],yogaHi:YOGAS_HI[yogaIdx],
        karanaHi:KARAN_HI[Math.floor(lunarLon/6)%11],
        varHi:VAR_HI[Math.floor(jd+1.5)%7],
        score:panSc,nakProf
      },
      schemaVersion:"5.0"
    };
  }

  return{getAspect,aspectScore,getTransitPlanets,getAspects,
    getTransitScore,moonSpeed,findExactTime,buildReport,ASPECTS};
})();

if(typeof module!=='undefined') module.exports=TRANSITS;
if(typeof window!=='undefined') window.TRANSITS=TRANSITS;

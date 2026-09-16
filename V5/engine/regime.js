/* ============================================================
   NASDAQ Vedic System V5 — engine/regime.js
   Crash Regime Detector — Probabilistic (No guaranteed dates)
   Output: windows with Start/Peak/End + evidence + severity
   ============================================================ */
'use strict';

const REGIME = (function(){
  function getNatal(){ return typeof NATAL!=='undefined'?NATAL:require('./natal'); }
  function getDasha(){ return typeof DASHA!=='undefined'?DASHA:require('./dasha'); }

  function jdToDate(jd){
    const ms=(jd-2440587.5)*86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  // Crash regime rules (probabilistic evidence accumulation)
  const CRASH_RULES=[
    {id:'saturn_8th',  weight:8, desc:'शनि 8वें भाव में ट्रांज़िट — संरचनात्मक जोखिम',
      check:(tp,nd)=>tp.find(p=>p.eng==='Saturn')?.transHouse===8},
    {id:'ketu_8th',    weight:7, desc:'केतु 8वें भाव में — अचानक बड़ी चाल',
      check:(tp)=>tp.find(p=>p.eng==='Ketu')?.transHouse===8},
    {id:'rahu_8th',    weight:6, desc:'राहु 8वें भाव में — छुपा जोखिम',
      check:(tp)=>tp.find(p=>p.eng==='Rahu')?.transHouse===8},
    {id:'mars_8th',    weight:5, desc:'मंगल 8वें भाव में — अचानक गिरावट',
      check:(tp)=>tp.find(p=>p.eng==='Mars')?.transHouse===8},
    {id:'sat_rahu_conj',weight:9,desc:'शनि-राहु युति — अत्यंत खतरनाक',
      check:(tp)=>{const s=tp.find(p=>p.eng==='Saturn'),r=tp.find(p=>p.eng==='Rahu');
        return s&&r&&Math.abs(((s.sidLon-r.sidLon+180)%360)-180)<12;}},
    {id:'mars_sat_conj',weight:7,desc:'मंगल-शनि युति — बड़ी गिरावट संभव',
      check:(tp)=>{const m=tp.find(p=>p.eng==='Mars'),s=tp.find(p=>p.eng==='Saturn');
        return m&&s&&Math.abs(((m.sidLon-s.sidLon+180)%360)-180)<10;}},
    {id:'mula_nak',    weight:4, desc:'चंद्र मूल नक्षत्र में — जड़ उखड़ना',
      check:(tp)=>tp.find(p=>p.eng==='Moon')?.nak===18},
    {id:'ardra_nak',   weight:3, desc:'चंद्र आर्द्रा नक्षत्र में — तूफान',
      check:(tp)=>tp.find(p=>p.eng==='Moon')?.nak===5},
    {id:'sat_dasha',   weight:5, desc:'शनि महादशा — संरचनात्मक मंदी',
      check:(tp,nd,d)=>d?.maha==='Saturn'},
    {id:'rahu_dasha',  weight:4, desc:'राहु महादशा — सट्टा crash',
      check:(tp,nd,d)=>d?.maha==='Rahu'},
    {id:'ketu_dasha',  weight:4, desc:'केतु महादशा — अचानक हानि',
      check:(tp,nd,d)=>d?.maha==='Ketu'},
    {id:'eclipse_near',weight:6, desc:'ग्रहण निकट — बड़ी अस्थिरता',
      check:(tp,nd,d,events)=>events?.riskTags?.includes('CRASH_RISK')},
    {id:'jup_sat_opp', weight:5, desc:'बृहस्पति-शनि प्रतियोगी — बाज़ार मोड़',
      check:(tp)=>{const j=tp.find(p=>p.eng==='Jupiter'),s=tp.find(p=>p.eng==='Saturn');
        return j&&s&&Math.abs(Math.abs(((j.sidLon-s.sidLon+180)%360)-180)-180)<10;}},
    {id:'triple_malefic',weight:8,desc:'3+ ग्रह 6/8/12 में — त्रिशूल दोष',
      check:(tp)=>tp.filter(p=>['Mars','Saturn','Rahu','Ketu'].includes(p.eng)&&
        [6,8,12].includes(p.transHouse)).length>=3},
  ];

  // Run crash detection for a single day
  function detectDay(transitReport,natalD1,dasha,eventsReport){
    const tp=transitReport?.planets||[];
    const evidence=[];
    let totalWeight=0;

    CRASH_RULES.forEach(rule=>{
      try{
        const triggered=rule.check(tp,natalD1,dasha,eventsReport);
        if(triggered){
          evidence.push({id:rule.id,desc:rule.desc,weight:rule.weight});
          totalWeight+=rule.weight;
        }
      }catch(e){}
    });

    const maxWeight=CRASH_RULES.reduce((s,r)=>s+r.weight,0);
    const crashProbability=Math.min(95,Math.round((totalWeight/maxWeight)*100));
    const isCrashRegime=totalWeight>=20;
    const severity=totalWeight>=30?'P1':totalWeight>=20?'P2':'P3';

    return{totalWeight,maxWeight,crashProbability,isCrashRegime,severity,evidence};
  }

  // Detect crash windows over a date range
  function detectCrashWindows(dateIST,natalD1,dasha,eventsReport,lookaheadDays=30){
    const N=getNatal();
    const[y,m,d]=dateIST.split('-').map(Number);
    const startJD=N.JD(y,m,d,15,0);
    const windows=[];
    let inWindow=false;
    let windowStart=null,windowPeak=null,maxWeight=0;
    let windowEvidence=[];

    for(let i=0;i<=lookaheadDays;i++){
      const jd=startJD+i;
      const ayan=N.lahiri(jd);
      // Quick transit positions
      const tp=N.PLANETS_DEF.map(pd=>{
        const lon=N.n360(N.getPlanetLon(pd.eng,jd)-ayan);
        const rashi=Math.floor(lon/30);
        const transHouse=(rashi-natalD1.lagnaSign+12)%12+1;
        const nak=Math.floor(lon/(360/27));
        return{...pd,sidLon:lon,rashi,transHouse,nak};
      });

      // Quick dasha (use provided dasha — changes slowly)
      const result=detectDay({planets:tp,jd,dateIST:jdToDate(jd)},natalD1,dasha,eventsReport);

      if(result.isCrashRegime){
        if(!inWindow){
          inWindow=true;
          windowStart=jd;
          windowEvidence=result.evidence;
          maxWeight=result.totalWeight;
        }
        if(result.totalWeight>maxWeight){
          maxWeight=result.totalWeight;
          windowPeak=jd;
          windowEvidence=result.evidence;
        }
      } else if(inWindow){
        // Window ends
        windows.push(buildCrashWindow(windowStart,windowPeak||windowStart,jd-1,
          maxWeight,windowEvidence,result.severity));
        inWindow=false;windowStart=null;windowPeak=null;maxWeight=0;windowEvidence=[];
      }
    }
    // Close open window
    if(inWindow&&windowStart){
      windows.push(buildCrashWindow(windowStart,windowPeak||windowStart,startJD+lookaheadDays,
        maxWeight,windowEvidence,'P2'));
    }

    return{
      moduleId:'regime',
      dateIST,
      crashRegimeWindows:windows,
      hasCrashRisk:windows.length>0,
      maxCrashProbability:windows.length?Math.max(...windows.map(w=>w.probability)):0,
      explanations:windows.length?
        windows.slice(0,3).map(w=>`${w.label} (${w.startDate} → ${w.endDate}) — ${w.probability}% जोखिम`):
        ['कोई Crash Regime नहीं पाया गया।'],
      evidence:windows.flatMap(w=>w.evidence.map(e=>e.desc)).slice(0,5),
      relevanceScore:windows.length?85:20,
      directionHint:'BEAR',
      confidenceImpact:windows.length?-windows[0].probability*0.5:0,
      riskTags:windows.length?['CRASH_RISK']:['RANGE'],
      timeWindows:windows.map(w=>({
        label:w.label,startIST:w.startDate+' IST',
        peakIST:w.peakDate+' IST',endIST:w.endDate+' IST',
        severity:w.severity,tags:['CRASH_RISK'],notes:w.evidence.map(e=>e.desc).slice(0,2)
      })),
      schemaVersion:"5.0"
    };
  }

  function buildCrashWindow(startJD,peakJD,endJD,weight,evidence,severity){
    const MAX=CRASH_RULES.reduce((s,r)=>s+r.weight,0);
    const probability=Math.min(95,Math.round((weight/MAX)*100));
    const label=probability>=70?'🚨 उच्च क्रैश जोखिम खंड':
      probability>=50?'⚠️ मध्यम क्रैश जोखिम':
      '⚡ सतर्कता खंड';
    return{
      label,startDate:jdToDate(startJD),peakDate:jdToDate(peakJD),
      endDate:jdToDate(endJD),probability,weight,severity,evidence,
      disclaimer:'यह एक जोखिम सांख्यिकी है, निश्चित भविष्यवाणी नहीं। बाज़ार जोखिमों के अधीन है।'
    };
  }

  return{CRASH_RULES,detectDay,detectCrashWindows,buildCrashWindow};
})();

if(typeof module!=='undefined') module.exports=REGIME;
if(typeof window!=='undefined') window.REGIME=REGIME;

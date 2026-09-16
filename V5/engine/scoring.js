/* ============================================================
   NASDAQ Vedic System V5 — engine/scoring.js
   Kundali-First Weighting + Conflict Resolution + Confidence
   Weights: Kundali 60% | Transits 25% | Panchang 10% | Other 5%
   ============================================================ */
'use strict';

const SCORING = (function(){

  // Default weights (CONFIG override possible)
  const DEFAULT_WEIGHTS={
    kundali:  0.60,  // D1 + vargas + dasha context
    transits: 0.25,  // transit exactness
    panchang: 0.10,  // tithi/nakshatra/hora
    other:    0.05,  // KP/Gann/Merriman confirmation
  };

  // Normalize score to -100..+100
  function normalize(raw,maxExpected=30){
    return Math.max(-100,Math.min(100,(raw/maxExpected)*100));
  }

  // Kundali score from D1 + key vargas + dasha
  function calcKundaliScore(natalAnalysis,vargaReports,dashaInterp){
    let sc=0;
    const evidence=[];

    // D1 house activation
    if(natalAnalysis?.overallHouseScore){
      sc+=natalAnalysis.overallHouseScore*0.3;
      evidence.push(`D1 house activation: ${natalAnalysis.overallHouseScore.toFixed(1)}`);
    }

    // Key vargas (D1,D9,D10,D30,D2,D3)
    const keyDiv=[1,9,10,30,2,3];
    keyDiv.forEach(d=>{
      const r=vargaReports?.[`D${d}`];
      if(!r) return;
      const w=r.relevanceScore/100;
      sc+=r.planetScore*w*0.5;
      evidence.push(`D${d}: ${r.directionHint} (${r.planetScore?.toFixed(1)||0})`);
    });

    // Dasha contribution
    if(dashaInterp){
      sc+=dashaInterp.sc*0.8;
      evidence.push(`Dasha ${dashaInterp?.mahaInterp?.desc||''}: ${dashaInterp.sc}`);
    }

    return{score:parseFloat(sc.toFixed(2)),evidence};
  }

  // Transit score
  function calcTransitScore(transitReport){
    if(!transitReport) return{score:0,evidence:[]};
    const sc=transitReport.totalScore||0;
    const top=transitReport.aspects?.slice(0,3)||[];
    const evidence=top.map(a=>`${a.fromEng}→${a.toEng} ${a.aspectEng}: ${a.score}`);
    return{score:parseFloat(sc.toFixed(2)),evidence};
  }

  // Panchang score
  function calcPanchangScore(panchangData,horaScore){
    if(!panchangData) return{score:0,evidence:[]};
    const sc=(panchangData.score||0)+(horaScore||0)*0.2;
    return{score:parseFloat(sc.toFixed(2)),
      evidence:[`Nakshatra ${panchangData.nakHi}: ${panchangData.score}`,
        `Hora score: ${horaScore}`]};
  }

  // Other systems (sessions, gann, regime as confirmation only)
  function calcOtherScore(sessionReports,regimeReport){
    let sc=0;
    const evidence=[];
    if(sessionReports){
      const ny=sessionReports.newyork;
      if(ny){sc+=ny.score*0.1;evidence.push(`NY session: ${ny.score?.toFixed(1)}`);}
    }
    if(regimeReport?.hasCrashRisk){
      sc-=5;evidence.push(`Crash regime detected: -5`);
    }
    return{score:parseFloat(sc.toFixed(2)),evidence};
  }

  // Conflict detection between systems
  function detectConflict(kundaliDir,transitDir,panchangDir){
    const dirs=[kundaliDir,transitDir,panchangDir].filter(Boolean);
    const bulls=dirs.filter(d=>d==='BULL').length;
    const bears=dirs.filter(d=>d==='BEAR').length;
    if(bulls>0&&bears>0) return{hasConflict:true,
      desc:`मिश्रित संकेत: ${bulls} बुलिश vs ${bears} बियरिश सिस्टम — आत्मविश्वास कम`,
      penalty:15};
    return{hasConflict:false,desc:'सभी सिस्टम सहमत',penalty:0};
  }

  // Calibrated confidence
  function calcConfidence(componentScores,conflict,vargaConsensus){
    const vals=componentScores.map(s=>s.score);
    const pos=vals.filter(v=>v>0).length;
    const neg=vals.filter(v=>v<0).length;
    const total=vals.length;
    let base=40;
    if(pos===total||neg===total) base=85;
    else if(Math.max(pos,neg)>=total*.75) base=70;
    else if(Math.max(pos,neg)>=total*.5) base=55;

    // Varga consensus boost
    if(vargaConsensus?.conf) base=Math.min(90,(base+vargaConsensus.conf)/2);

    // Conflict penalty
    base=Math.max(20,base-conflict.penalty);

    return Math.round(base);
  }

  // Build invalidation rules
  function buildInvalidationRules(finalDir,transitReport,panchangData){
    const rules=[];
    if(finalDir==='BULL'){
      rules.push('यदि शनि 8वें भाव में आज ट्रांज़िट करे → सिग्नल रद्द');
      rules.push(`यदि चंद्र ${panchangData?.nakHi||''} से बाहर जाए → पुनर्विचार`);
      rules.push('यदि ट्रांज़िट स्कोर -15 से नीचे जाए → BEAR में बदलें');
    } else if(finalDir==='BEAR'){
      rules.push('यदि बृहस्पति 11वें भाव को aspect करे → सिग्नल कमज़ोर');
      rules.push('यदि ट्रांज़िट स्कोर +15 से ऊपर जाए → BULL में बदलें');
      rules.push('यदि Pushya/Rohini/Hasta नक्षत्र हो → BEAR कमज़ोर');
    }
    rules.push('बाज़ार जोखिमों के अधीन — यह ज्योतिषीय संभावना है, गारंटी नहीं');
    return rules;
  }

  // MAIN: Final decision
  function finalDecision(params){
    const{natalAnalysis,vargaReports,dashaInterp,transitReport,
      panchangData,horaScore,sessionReports,eventsReport,regimeReport}=params;

    const W=DEFAULT_WEIGHTS;

    // Component scores
    const kundali=calcKundaliScore(natalAnalysis,vargaReports,dashaInterp);
    const transits=calcTransitScore(transitReport);
    const panchang=calcPanchangScore(panchangData,horaScore);
    const other=calcOtherScore(sessionReports,regimeReport);

    // Weighted final raw
    const rawFinal=(kundali.score*W.kundali)+(transits.score*W.transits)+
      (panchang.score*W.panchang)+(other.score*W.other);

    // Normalize
    const normFinal=parseFloat(normalize(rawFinal,25).toFixed(1));

    // Directions
    const kundaliDir=kundali.score>2?'BULL':kundali.score<-2?'BEAR':'NEUT';
    const transitDir=transits.score>3?'BULL':transits.score<-3?'BEAR':'NEUT';
    const panchangDir=panchang.score>2?'BULL':panchang.score<-2?'BEAR':'NEUT';

    // Conflict check
    const conflict=detectConflict(kundaliDir,transitDir,panchangDir);

    // Varga consensus
    const vargaConsensus=typeof VARGA!=='undefined'?
      VARGA.getConsensus(vargaReports||{}):null;

    // Confidence
    const confidence=calcConfidence(
      [kundali,transits,panchang,other],conflict,vargaConsensus);

    // Final call
    const finalCall=normFinal>10?'BULL':normFinal<-10?'BEAR':'NEUT';

    // Top reasons
    const allEvidence=[
      ...kundali.evidence.map(e=>({src:'कुंडली',e})),
      ...transits.evidence.map(e=>({src:'ट्रांज़िट',e})),
      ...panchang.evidence.map(e=>({src:'पंचांग',e})),
    ];
    const topReasons=allEvidence
      .filter(e=>finalCall==='BULL'?!e.e.includes('-'):!e.e.includes('+'))
      .slice(0,5)
      .map(e=>`[${e.src}] ${e.e}`);

    const topRisks=(eventsReport?.evidence||[]).concat(
      regimeReport?.hasCrashRisk?['Crash regime detected']:[]
    ).slice(0,5);

    // Best/avoid windows
    const allWindows=[
      ...(eventsReport?.timeWindows||[]),
      ...(sessionReports?.newyork?.timeWindows||[]),
      ...(regimeReport?.timeWindows||[]),
    ];
    const bestWindows=finalCall==='BULL'?
      allWindows.filter(w=>!w.tags?.includes('CRASH_RISK')).slice(0,3):[];
    const avoidWindows=allWindows.filter(w=>
      w.tags?.includes('CRASH_RISK')||w.tags?.includes('TRAP')).slice(0,3);

    return{
      finalCall,finalConfidence:confidence,
      rawScore:normFinal,
      componentScores:{
        kundali:{score:kundali.score,weight:W.kundali,direction:kundaliDir},
        transits:{score:transits.score,weight:W.transits,direction:transitDir},
        panchang:{score:panchang.score,weight:W.panchang,direction:panchangDir},
        other:{score:other.score,weight:W.other},
      },
      conflict,vargaConsensus,
      topReasons:topReasons.slice(0,5),
      topRisks:topRisks.slice(0,5),
      bestWindows,avoidWindows,
      invalidationRules:buildInvalidationRules(finalCall,transitReport,panchangData),
      crashRegimeWindows:regimeReport?.crashRegimeWindows||[],
      schemaVersion:"5.0"
    };
  }

  return{DEFAULT_WEIGHTS,normalize,calcKundaliScore,calcTransitScore,
    calcPanchangScore,calcOtherScore,detectConflict,calcConfidence,
    buildInvalidationRules,finalDecision};
})();

if(typeof module!=='undefined') module.exports=SCORING;
if(typeof window!=='undefined') window.SCORING=SCORING;

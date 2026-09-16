/* ============================================================
   NASDAQ Vedic System V5 — engine/sessions.js
   Asian / London / NY Deep Analysis
   NY Open Playbook: Sweep → Direction → Decision → Trap
   ============================================================ */
'use strict';

const SESSIONS = (function(){
  // Hora lords sequence
  const HORA_EN=['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
  const HORA_HI=['सूर्य','शुक्र','बुध','चंद्र','शनि','बृहस्पति','मंगल'];
  const DAY_LORDS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

  function calcHora(jd){
    const day=Math.floor(jd+1.5)%7;
    const lord=DAY_LORDS[day];
    const si=HORA_EN.indexOf(lord);
    return Array.from({length:24},(_,h)=>{
      const li=(si+h)%7;
      const startH=(6+h)%24;
      const ben=['Sun','Jupiter','Venus','Moon'].includes(HORA_EN[li]);
      return{lord:HORA_EN[li],lordHi:HORA_HI[li],startH,endH:(startH+1)%24,
        ben,sig:ben?'▲':'▼',istH:startH};
    });
  }

  // Get hora for a specific IST hour
  function getHoraAtIST(hora,istHour){
    // Hora is EST based; IST = EST + 10.5h (approx, simplified)
    const estH=((istHour-10)+24)%24;
    return hora.find(h=>h.startH===estH)||hora[Math.floor(hora.length/2)];
  }

  // Trap detection for a session
  function detectTrap(horaScore,transitScore,panchangData,sessionId){
    const nak=panchangData?.nakProf||{};
    const bullTrap=horaScore>4&&transitScore<-10&&
      (nak.trap==='VHIGH'||nak.trap==='HIGH'||nak.mode?.includes('TRAP'));
    const bearTrap=horaScore<-4&&transitScore>10&&
      ['Rohini','Pushya','Hasta','Uttara Phalguni'].includes(panchangData?.nakEn);
    const sideways=Math.abs(horaScore)<=2&&Math.abs(transitScore)<=5;
    const vishti=panchangData?.karanaHi==='विष्टि';

    if(bullTrap||vishti){
      return{type:'bull',title:'🎭 BULL TRAP चेतावनी!',
        desc:`होरा बुलिश (${horaScore>0?'+':''  }${horaScore}) लेकिन ट्रांज़िट ${transitScore.toFixed(0)} — ऊपर जाकर गिर सकता है`,
        riskTag:'BULL_TRAP',severity:'P1'};
    }
    if(bearTrap){
      return{type:'bear',title:'🎭 BEAR TRAP चेतावनी!',
        desc:`होरा बियरिश लेकिन ट्रांज़िट मजबूत — नीचे जाकर रिकवर हो सकता है`,
        riskTag:'BEAR_TRAP',severity:'P2'};
    }
    if(sideways){
      return{type:'sideways',title:'↔ SIDEWAYS बाज़ार',
        desc:`मिश्रित संकेत — Range-bound रहने की संभावना`,
        riskTag:'RANGE',severity:'P3'};
    }
    return{type:'clear',title:'✅ स्पष्ट दिशा',
      desc:`${horaScore>0?'बुलिश':'बियरिश'} मूवमेंट की उम्मीद`,
      riskTag:null,severity:'P3'};
  }

  // Analyze one session
  function analyzeSession(sessionId,context,natalD1,dasha,transitReport){
    const SESSION_DEF={
      asian:  {startIST:'05:30',endIST:'14:00',startH:5,endH:14,  label:'एशियन',   flag:'🌏'},
      london: {startIST:'13:30',endIST:'22:00',startH:13,endH:22, label:'लंदन',    flag:'🇬🇧'},
      newyork:{startIST:'19:00',endIST:'01:30',startH:19,endH:25, label:'न्यूयॉर्क',flag:'🗽'},
    };
    const def=SESSION_DEF[sessionId]||SESSION_DEF.newyork;
    const pan=transitReport?.panchang||{};
    const jd=transitReport?.jd||0;
    const hora=calcHora(jd);

    // Get session horas
    const sessHoras=hora.filter(h=>{
      const ish=h.istH;
      if(def.startH<def.endH) return ish>=def.startH&&ish<def.endH;
      return ish>=def.startH||ish<(def.endH+24)%24;
    });

    const horaScore=sessHoras.reduce((s,h)=>s+(h.ben?2:-2),0);
    const mainHora=sessHoras[Math.floor(sessHoras.length/2)]||hora[8];
    const tScore=transitReport?.totalScore||0;
    const dashaI=dasha?(require?require('./dasha'):DASHA).interpret(dasha.maha,dasha.antar):{sc:0};
    const panSc=pan.score||0;

    const rawSc=horaScore*0.5+dashaI.sc+panSc*0.5+tScore*0.3;
    const sc=Math.max(-100,Math.min(100,rawSc));

    // Confidence
    const scores=[horaScore,tScore,dashaI.sc,panSc];
    const pos=scores.filter(s=>s>0).length;
    const neg=scores.filter(s=>s<0).length;
    const conf=pos===4||neg===4?90:Math.max(pos,neg)>=3?70:Math.max(pos,neg)>=2?55:40;

    const trap=detectTrap(horaScore,tScore,pan,sessionId);
    const dirSig=sc>10?'BULL':sc<-10?'BEAR':'NEUT';
    const riskTags=trap.riskTag?[trap.riskTag]:[];
    if(Math.abs(sc)<10) riskTags.push('RANGE');

    // Time windows for this session
    const timeWindows=[{
      label:`${def.label} सत्र`,
      startIST:`${def.startIST} IST`,
      peakIST:`${String(Math.floor((def.startH+def.endH)/2)).padStart(2,'0')}:00 IST`,
      endIST:`${def.endIST} IST`,
      severity:conf>=70?'P2':'P3',
      tags:riskTags,
      notes:[`${def.label} सत्र संकेत: ${sc>0?'बुलिश':'बियरिश'} (${sc.toFixed(0)})`]
    }];

    return{
      moduleId:`session_${sessionId}`,
      sessionId,label:def.label,flag:def.flag,
      dateIST:transitReport?.dateIST||'',
      score:parseFloat(sc.toFixed(2)),
      confidence:conf,
      direction:dirSig,
      horaScore,mainHora,
      trap,riskTags,
      relevanceScore:80,
      directionHint:dirSig,
      confidenceImpact:parseFloat(sc.toFixed(2)),
      timeWindows,
      explanations:[
        `होरा स्कोर: ${horaScore>0?'+':''}${horaScore}`,
        `ट्रांज़िट: ${tScore>0?'+':''}${tScore.toFixed(1)}`,
        `दशा: ${dasha?.mahaHi||'--'} (${dashaI.sc>0?'+':''}${dashaI.sc})`,
        `पंचांग: ${pan.nakHi||'--'} नक्षत्र (${panSc>0?'+':''}${panSc})`,
        trap.desc
      ],
      evidence:[`hora=${horaScore} transit=${tScore.toFixed(1)} dasha=${dashaI.sc} pan=${panSc} conf=${conf}%`],
      schemaVersion:"5.0"
    };
  }

  // NY Open Playbook (7:00 PM IST = 9:30 AM EST)
  function analyzeNYOpenPlaybook(context,natalD1,dasha,transitReport,eventsReport){
    const pan=transitReport?.panchang||{};
    const hora=calcHora(transitReport?.jd||0);
    const nyOpenHora=getHoraAtIST(hora,19); // 7 PM IST
    const tScore=transitReport?.totalScore||0;
    const dashaI=dasha?(require?require('./dasha'):DASHA).interpret(dasha.maha,dasha.antar):{sc:0};

    // Phase 1: Sweep Risk Window (19:00–19:15 IST)
    const sweepRisk=detectSweepRisk(tScore,pan,nyOpenHora,eventsReport);

    // Phase 2: Direction Attempt Window (19:15–19:45 IST)
    const directionAttempt=detectDirectionAttempt(tScore,dashaI,pan,hora);

    // Phase 3: Decision Zone (19:45–20:30 IST)
    const decisionZone=getDecisionZone(sweepRisk,directionAttempt,tScore,pan);

    // Overall NY playbook score
    const playbookScore=(sweepRisk.score+directionAttempt.score+decisionZone.score)/3;
    const playbookConf=Math.min(90,Math.abs(playbookScore)*5+40);

    return{
      moduleId:'ny_open_playbook',
      dateIST:transitReport?.dateIST||'',
      playbookScore:parseFloat(playbookScore.toFixed(2)),
      playbookConfidence:parseFloat(playbookConf.toFixed(1)),
      playbookDirection:playbookScore>5?'BULL':playbookScore<-5?'BEAR':'NEUT',
      sweepRisk,directionAttempt,decisionZone,
      nyOpenHora,
      trapType:decisionZone.trapType,
      timeWindows:[
        {label:'Sweep Risk Window',startIST:'19:00 IST',peakIST:'19:07 IST',endIST:'19:15 IST',
          severity:sweepRisk.severity,tags:sweepRisk.tags,notes:[sweepRisk.desc]},
        {label:'Direction Attempt Window',startIST:'19:15 IST',peakIST:'19:30 IST',endIST:'19:45 IST',
          severity:'P2',tags:[],notes:[directionAttempt.desc]},
        {label:'Decision Zone',startIST:'19:45 IST',peakIST:'20:00 IST',endIST:'20:30 IST',
          severity:decisionZone.severity,tags:[decisionZone.trapType],notes:[decisionZone.desc]},
      ],
      explanations:[
        `NY Open होरा: ${nyOpenHora.lordHi} (${nyOpenHora.ben?'शुभ':'अशुभ'})`,
        `Sweep Risk: ${sweepRisk.level}`,
        `Direction: ${directionAttempt.direction}`,
        `Decision: ${decisionZone.trapType} — ${decisionZone.desc}`,
      ],
      evidence:[`tScore=${tScore} dashaI=${dashaI.sc} nyHora=${nyOpenHora.lord}`],
      relevanceScore:95,
      directionHint:playbookScore>5?'BULL':playbookScore<-5?'BEAR':'NEUT',
      confidenceImpact:parseFloat(playbookScore.toFixed(2)),
      riskTags:[decisionZone.trapType,'GAP'].filter(Boolean),
      schemaVersion:"5.0"
    };
  }

  function detectSweepRisk(tScore,pan,nyHora,eventsReport){
    const highVolatility=eventsReport?.riskTags?.includes('CRASH_RISK')||
      eventsReport?.riskTags?.includes('SPIKE');
    const badNak=['Ashlesha','Jyeshtha','Mula','Ardra','Vishakha'].includes(pan.nakEn);
    const vishti=pan.karanaHi==='विष्टि';
    const level=highVolatility||badNak||vishti?'HIGH':Math.abs(tScore)>10?'MEDIUM':'LOW';
    const score=level==='HIGH'?-3:level==='MEDIUM'?-1:1;
    const tags=level==='HIGH'?['SWEEP','WHIPSAW']:['SWEEP'];
    return{level,score,severity:level==='HIGH'?'P1':'P2',tags,
      desc:`NY Open Sweep ${level}: ${badNak?pan.nakHi+' नक्षत्र':'होरा '+(nyHora.ben?'शुभ':'अशुभ')}`};
  }

  function detectDirectionAttempt(tScore,dashaI,pan,hora){
    const midHora=getHoraAtIST(hora,20);
    const combined=tScore*0.4+dashaI.sc*0.3+(pan.score||0)*0.3;
    const direction=combined>3?'BULL':combined<-3?'BEAR':'NEUT';
    return{direction,score:parseFloat(combined.toFixed(2)),
      midHora,
      desc:`दिशा प्रयास: ${direction} (${combined.toFixed(1)}) — ${midHora.lordHi} होरा`};
  }

  function getDecisionZone(sweep,dir,tScore,pan){
    let trapType='one-way';
    if(sweep.level==='HIGH'&&dir.direction==='BULL') trapType='bull';
    else if(sweep.level==='HIGH'&&dir.direction==='BEAR') trapType='bear';
    else if(sweep.level==='HIGH'&&dir.direction==='NEUT') trapType='double';
    const score=dir.score*(sweep.level==='HIGH'?0.5:1);
    const sev=sweep.level==='HIGH'?'P1':sweep.level==='MEDIUM'?'P2':'P3';
    const TRAP_DESC={
      bull:'Bull Trap — ऊपर जाएगा फिर गिरेगा',
      bear:'Bear Trap — नीचे जाएगा फिर उठेगा',
      double:'Double Trap — दोनों तरफ Sweep',
      'one-way':'One-Way Move — स्पष्ट दिशा',
    };
    return{trapType,score:parseFloat(score.toFixed(2)),severity:sev,
      desc:TRAP_DESC[trapType]||'तटस्थ'};
  }

  return{calcHora,getHoraAtIST,detectTrap,analyzeSession,
    analyzeNYOpenPlaybook,detectSweepRisk,detectDirectionAttempt,getDecisionZone};
})();

if(typeof module!=='undefined') module.exports=SESSIONS;
if(typeof window!=='undefined') window.SESSIONS=SESSIONS;

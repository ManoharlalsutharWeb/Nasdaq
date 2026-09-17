/* ============================================================
   NASDAQ Vedic System V5 — engine/aggregator.js
   Collect ALL module reports → build final JSON packs
   ============================================================ */
'use strict';

const AGGREGATOR = (function(){
  const REPORT_CACHE=new Map();
  function ref(name){
    const M={
      NATAL:typeof NATAL!=='undefined'?NATAL:null,
      DASHA:typeof DASHA!=='undefined'?DASHA:null,
      TRANSITS:typeof TRANSITS!=='undefined'?TRANSITS:null,
      EVENTS:typeof EVENTS!=='undefined'?EVENTS:null,
      VARGA:typeof VARGA!=='undefined'?VARGA:null,
      SESSIONS:typeof SESSIONS!=='undefined'?SESSIONS:null,
      REGIME:typeof REGIME!=='undefined'?REGIME:null,
      SCORING:typeof SCORING!=='undefined'?SCORING:null,
      TYPES:typeof TYPES!=='undefined'?TYPES:null,
      CONFIG:typeof CONFIG!=='undefined'?CONFIG:null
    };
    if(M[name]) return M[name];
    try{return require('./'+name.toLowerCase());}catch(e){return null;}
  }

  // Get today's date IST
  function todayIST(){
    const now=new Date();
    const ist=new Date(now.getTime()+(5.5*3600000)-(now.getTimezoneOffset()*60000));
    return ist.toISOString().split('T')[0];
  }

  // Core: collect everything for one date
  function collectAll(dateIST,timeIST='15:00'){
    const cacheKey=`${dateIST}|${timeIST}`;
    if(REPORT_CACHE.has(cacheKey)) return REPORT_CACHE.get(cacheKey);
    const N=ref('NATAL'), D=ref('DASHA'), T=ref('TRANSITS'),
          E=ref('EVENTS'), V=ref('VARGA'), S=ref('SESSIONS'),
          R=ref('REGIME'), SC=ref('SCORING');

    // 1. Natal D1
    const natalD1=N.getNasdaq();

    // 2. Transit report
    const transitReport=T.buildReport(dateIST,natalD1,timeIST);

    // 3. Dasha
    const moonSid=natalD1.planets.find(p=>p.eng==='Moon')?.sidLon||0;
    const[y,m,d]=dateIST.split('-').map(Number);
    const[hh,mm]=(timeIST||'15:00').split(':').map(Number);
    const totalMin=hh*60+mm-330;
    const utcDay=Math.floor(totalMin/1440), utcMin=((totalMin%1440)+1440)%1440;
    const utcDate=new Date(Date.UTC(y,m-1,d+utcDay,0,utcMin));
    const jd=N.JD(utcDate.getUTCFullYear(),utcDate.getUTCMonth()+1,utcDate.getUTCDate(),utcDate.getUTCHours(),utcDate.getUTCMinutes());
    const birth=N.NASDAQ_BIRTH;
    const dasha=D.getCurrent(N.JD(birth.year,birth.month,birth.day,birth.hour,birth.minute),moonSid,jd);
    const dashaInterp=dasha?D.interpret(dasha.maha,dasha.antar):{sc:0,desc:'',bull:true};

    // 4. Events
    const eventsReport=E.buildAstroEvents(dateIST,natalD1,dasha);

    // 5. All vargas D1–D60
    const vargaReports=V.analyzeAll(natalD1,dasha,transitReport);
    const vargaConsensus=V.getConsensus(vargaReports);

    // 6. House analysis
    const natalAnalysis=N.analyze12Houses(natalD1,dasha,transitReport.planets);

    // 7. Sessions
    const sesAsian=S.analyzeSession('asian',{},natalD1,dasha,transitReport);
    const sesLondon=S.analyzeSession('london',{},natalD1,dasha,transitReport);
    const sesNY=S.analyzeSession('newyork',{},natalD1,dasha,transitReport);
    const nyPlaybook=S.analyzeNYOpenPlaybook({},natalD1,dasha,transitReport,eventsReport);

    // 8. Regime
    const regimeReport=R.detectCrashWindows(dateIST,natalD1,dasha,eventsReport,30);

    // 9. Hora score for panchang
    const hora=S.calcHora(jd);
    const nowH=new Date().getHours();
    const horaScore=hora.filter(h=>h.ben).length-hora.filter(h=>!h.ben).length;

    // 10. Final scoring
    const finalResult=SC.finalDecision({
      natalAnalysis,vargaReports,dashaInterp,
      transitReport,panchangData:transitReport.panchang,
      horaScore,
      sessionReports:{asian:sesAsian,london:sesLondon,newyork:sesNY},
      eventsReport,regimeReport
    });

    const result={
      dateIST,timeIST,jd,
      natalD1,transitReport,dasha,dashaInterp,
      eventsReport,vargaReports,vargaConsensus,
      natalAnalysis,hora,
      sessions:{asian:sesAsian,london:sesLondon,newyork:sesNY,nyPlaybook},
      regimeReport,finalResult,
      schemaVersion:"5.0"
    };
    REPORT_CACHE.set(cacheKey,result);
    return result;
  }

  // Build daily.json
  function buildDaily(dateIST,data){
    const d=data||collectAll(dateIST);
    const fr=d.finalResult;
    const pan=d.transitReport?.panchang||{};
    const dash=d.dasha||{};
    return{
      schemaVersion:"5.0",
      moduleId:"daily",
      dateIST,
      finalCall:fr.finalCall,
      finalConfidence:fr.finalConfidence,
      rawScore:fr.rawScore,
      topReasons:fr.topReasons,
      topRisks:fr.topRisks,
      bestWindows:fr.bestWindows,
      avoidWindows:fr.avoidWindows,
      invalidationRules:fr.invalidationRules,
      crashRegimeWindows:fr.crashRegimeWindows,
      componentScores:fr.componentScores,
      conflict:fr.conflict,
      vargaConsensus:d.vargaConsensus,
      kundali:{
        chart:'D1',planetCount:d.natalD1.planets.length,
        lagnaSign:d.natalD1.lagnaSign,
        planets:d.natalD1.planets.map(p=>({eng:p.eng,hi:p.hi,sidLon:p.sidLon,rashi:p.rashi,house:p.house,retro:p.retro,dignity:p.dignity,strength:p.strength})),
        houses:d.natalAnalysis.activations,
        researchCharts:'D1-D60',
        primaryBasis:'D1 nine planets + 12 bhav + D1-D60 varga research + dasha'
      },
      panchang:{
        tithi:pan.tithiNum||0,paksha:pan.paksha||'',
        nakshatra:pan.nakHi||'',nakshatraEn:pan.nakEn||'',
        yoga:pan.yogaHi||'',karana:pan.karanaHi||'',
        var:pan.varHi||'',score:pan.score||0,
        nakMode:pan.nakProf?.mode||'NORMAL',
        nakTrap:pan.nakProf?.trap||'MED'
      },
      dasha:{
        maha:dash.maha||'',mahaHi:dash.mahaHi||'',
        antar:dash.antar||'',antarHi:dash.antarHi||'',
        pratyantar:dash.pratyantar||'',pratyantarHi:dash.pratyantarHi||'',
        mahaStart:dash.mahaStart||'',mahaEnd:dash.mahaEnd||'',
        mahaPct:dash.mahaPct||0
      },
      transitScore:d.transitReport?.totalScore||0,
      moonSpeed:d.transitReport?.moonSpeed||0,
      topAspects:(d.transitReport?.aspects||[]).slice(0,8),
      isHoliday:isHoliday(dateIST),
      isMarketDay:isMarketDay(dateIST),
      generatedAt:new Date().toISOString()
    };
  }

  // Build sessions.json
  function buildSessions(dateIST,data){
    const d=data||collectAll(dateIST);
    const{asian,london,newyork,nyPlaybook}=d.sessions;
    return{
      schemaVersion:"5.0",moduleId:"sessions",dateIST,
      asian:{
        signal:asian.direction,confidence:asian.confidence,
        score:asian.score,hora:asian.mainHora?.lordHi||'',
        trap:asian.trap,timeWindows:asian.timeWindows,
        explanations:asian.explanations
      },
      london:{
        signal:london.direction,confidence:london.confidence,
        score:london.score,hora:london.mainHora?.lordHi||'',
        trap:london.trap,timeWindows:london.timeWindows,
        explanations:london.explanations
      },
      newyork:{
        signal:newyork.direction,confidence:newyork.confidence,
        score:newyork.score,hora:newyork.mainHora?.lordHi||'',
        trap:newyork.trap,timeWindows:newyork.timeWindows,
        explanations:newyork.explanations
      },
      nyPlaybook:{
        playbookDirection:nyPlaybook.playbookDirection,
        playbookConfidence:nyPlaybook.playbookConfidence,
        sweepRisk:nyPlaybook.sweepRisk,
        directionAttempt:nyPlaybook.directionAttempt,
        decisionZone:nyPlaybook.decisionZone,
        trapType:nyPlaybook.trapType,
        timeWindows:nyPlaybook.timeWindows,
        explanations:nyPlaybook.explanations
      },
      generatedAt:new Date().toISOString()
    };
  }

  // Build ny_open.json
  function buildNYOpen(dateIST,data){
    const d=data||collectAll(dateIST);
    const pb=d.sessions.nyPlaybook;
    return{schemaVersion:"5.0",moduleId:"ny_open",dateIST,...pb,
      generatedAt:new Date().toISOString()};
  }

  // Build alerts.json
  function buildAlerts(dateIST,data){
    const d=data||collectAll(dateIST);
    const ev=d.eventsReport;
    const reg=d.regimeReport;
    const allAlerts=[
      ...(ev?.events||[]).map(e=>({
        type:e.type,severity:e.window?.severity||'P3',
        label:e.window?.label||'',
        startIST:e.window?.startIST||'',
        peakIST:e.window?.peakIST||'',
        endIST:e.window?.endIST||'',
        tags:e.window?.tags||[],
        notes:e.window?.notes||[],
        score:e.score||0
      })),
      ...(reg?.crashRegimeWindows||[]).map(w=>({
        type:'CRASH_REGIME',severity:'P1',
        label:w.label,
        startIST:w.startDate+' IST',
        peakIST:w.peakDate+' IST',
        endIST:w.endDate+' IST',
        tags:['CRASH_RISK'],
        notes:w.evidence?.map(e=>e.desc)||[],
        probability:w.probability,
        disclaimer:w.disclaimer
      }))
    ].sort((a,b)=>({'P1':0,'P2':1,'P3':2}[a.severity]-{'P1':0,'P2':1,'P3':2}[b.severity]));
    return{schemaVersion:"5.0",moduleId:"alerts",dateIST,
      alerts:allAlerts,totalAlerts:allAlerts.length,
      hasCrashRisk:reg?.hasCrashRisk||false,
      generatedAt:new Date().toISOString()};
  }

  // Build weekly.json (Mon–Fri of current week)
  function buildWeekly(dateIST,data){
    const[y,m,d]=dateIST.split('-').map(Number);
    const base=new Date(y,m-1,d);
    const dow=base.getDay();
    const mon=new Date(base);
    mon.setDate(base.getDate()-(dow===0?6:dow-1));
    const days=[];
    for(let i=0;i<5;i++){
      const d2=new Date(mon);d2.setDate(mon.getDate()+i);
      const ds=d2.toISOString().split('T')[0];
      try{
        const dd=buildDaily(ds);
        days.push({date:ds,day:['सोम','मंगल','बुध','गुरु','शुक्र'][i],
          finalCall:dd.finalCall,confidence:dd.finalConfidence,
          score:dd.rawScore,nakshatra:dd.panchang?.nakshatra||'',
          isHoliday:dd.isHoliday,isMarketDay:dd.isMarketDay});
      }catch(e){days.push({date:ds,error:e.message});}
    }
    return{schemaVersion:"5.0",moduleId:"weekly",weekStart:mon.toISOString().split('T')[0],
      days,generatedAt:new Date().toISOString()};
  }

  // Build monthly.json
  function buildMonthly(dateIST){
    const[y,m]=dateIST.split('-').map(Number);
    const lastDay=new Date(y,m,0).getDate();
    const days=[];
    for(let d=1;d<=lastDay;d++){
      const ds=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      try{
        const dd=buildDaily(ds);
        days.push({date:ds,finalCall:dd.finalCall,score:dd.rawScore,
          confidence:dd.finalConfidence,nakshatra:dd.panchang?.nakshatra||'',
          isHoliday:dd.isHoliday,isMarketDay:dd.isMarketDay});
      }catch(e){days.push({date:ds,error:e.message});}
    }
    return{schemaVersion:"5.0",moduleId:"monthly",
      month:`${y}-${String(m).padStart(2,'0')}`,
      days,generatedAt:new Date().toISOString()};
  }

  // Build single varga JSON
  function buildVargaJSON(div,dateIST,data){
    const d=data||collectAll(dateIST);
    const key=`D${div}`;
    const report=d.vargaReports?.[key];
    const meta=(typeof VARGA!=='undefined'?VARGA:ref('VARGA'))?.VARGA_META?.[key]||{};
    return{schemaVersion:"5.0",moduleId:`varga_${key}`,dateIST,div,key,
      meta:{name:meta.name||key,hi:meta.hi||key,mkt:meta.mkt||'',relevance:meta.relevance||50},
      directionHint:report?.directionHint||'NEUT',
      relevanceScore:report?.relevanceScore||50,
      confidenceImpact:report?.confidenceImpact||0,
      planetScore:report?.planetScore||0,
      riskTags:report?.riskTags||[],
      accuracyWarning:report?.accuracyWarning||false,
      explanations:report?.explanations||[],
      planetEvidence:report?.planetEvidence||[],
      evidence:report?.evidence||[],
      generatedAt:new Date().toISOString()};
  }

  function buildIntraday(dateIST,startIST,endIST,stepMinutes=15){
    const parse=s=>{const[a,b]=String(s||'00:00').split(':').map(Number);return a*60+b;};
    let start=parse(startIST), end=parse(endIST);
    if(end<=start) end+=1440;
    const rows=[];
    for(let t=start;t<=end;t+=Math.max(1,Number(stepMinutes)||15)){
      const minute=t%1440;
      const time=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
      const d=collectAll(dateIST,time);
      rows.push({timeIST:time,finalCall:d.finalResult.finalCall,confidence:d.finalResult.finalConfidence,
        rawScore:d.finalResult.rawScore,transitScore:d.transitReport.totalScore,
        moonSid:d.transitReport.planets.find(p=>p.eng==='Moon')?.sidLon||0,
        riskTags:[...new Set(d.transitReport.aspects.filter(a=>a.riskTag).map(a=>a.riskTag))]});
    }
    return{schemaVersion:'5.0',moduleId:'intraday',dateIST,startIST,endIST,stepMinutes:Number(stepMinutes)||15,rows,
      summary:{bull:rows.filter(r=>r.finalCall==='BULL').length,bear:rows.filter(r=>r.finalCall==='BEAR').length,neut:rows.filter(r=>r.finalCall==='NEUT').length}};
  }

  function isHoliday(ds){
    const T=ref('TYPES');
    return(T?.US_HOLIDAYS||[]).includes(ds);
  }
  function isMarketDay(ds){
    if(isHoliday(ds)) return false;
    const d=new Date(ds+'T12:00:00Z');
    return d.getUTCDay()!==0&&d.getUTCDay()!==6;
  }

  return{collectAll,buildIntraday,buildDaily,buildSessions,buildNYOpen,
    buildAlerts,buildWeekly,buildMonthly,buildVargaJSON,todayIST};
})();

if(typeof module!=='undefined') module.exports=AGGREGATOR;
if(typeof window!=='undefined') window.AGGREGATOR=AGGREGATOR;

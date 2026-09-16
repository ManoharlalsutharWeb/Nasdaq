/* ============================================================
   NASDAQ Vedic System V5 — engine/events.js
   Pinpoint Events: conjunctions, ingress, eclipses
   Every event has Start / Peak / End IST + severity P1/P2/P3
   ============================================================ */
'use strict';

const EVENTS = (function(){
  function getNatal(){ return typeof NATAL!=='undefined'?NATAL:require('./natal'); }
  function getTransits(){ return typeof TRANSITS!=='undefined'?TRANSITS:require('./transits'); }

  // JD → IST date string
  function jdToIST(jd){
    const ms=(jd-2440587.5)*86400000;
    const ist=new Date(ms+5.5*3600000);
    return ist.toISOString().replace('T',' ').substring(0,16)+' IST';
  }

  function jdToISTDate(jd){
    const ms=(jd-2440587.5)*86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  // Severity logic
  function getSeverity(score,riskTags){
    if(Math.abs(score)>=4||riskTags.includes('CRASH_RISK')) return 'P1';
    if(Math.abs(score)>=2) return 'P2';
    return 'P3';
  }

  // Build time window with Start/Peak/End (±1 day by default)
  function makeEventWindow(label,peakJD,halfWidthDays,severity,tags,notes){
    const N=getNatal();
    return{
      label,
      startIST:jdToIST(peakJD-halfWidthDays),
      peakIST: jdToIST(peakJD),
      endIST:  jdToIST(peakJD+halfWidthDays),
      startDate:jdToISTDate(peakJD-halfWidthDays),
      peakDate: jdToISTDate(peakJD),
      endDate:  jdToISTDate(peakJD+halfWidthDays),
      severity,tags,notes:notes||[]
    };
  }

  // Detect sign ingress events in a range
  function detectIngress(eng,fromJD,toJD,natalD1){
    const N=getNatal();
    const events=[];
    const step=0.1;
    let prevRashi=-1;
    for(let jd=fromJD;jd<=toJD;jd+=step){
      const ayan=N.lahiri(jd);
      const lon=N.n360(N.getPlanetLon(eng,jd)-ayan);
      const rashi=Math.floor(lon/30);
      if(prevRashi>=0&&rashi!==prevRashi){
        // Binary search for exact time
        let lo=jd-step,hi=jd;
        for(let i=0;i<30;i++){
          const mid=(lo+hi)/2;
          const ay=N.lahiri(mid);
          const r=Math.floor(N.n360(N.getPlanetLon(eng,mid)-ay)/30);
          if(r!==prevRashi) hi=mid; else lo=mid;
        }
        const exactJD=(lo+hi)/2;
        const TYPES_REF=typeof TYPES!=='undefined'?TYPES:require('./types');
        const slowPlanets=['Jupiter','Saturn','Rahu','Ketu','Uranus','Neptune'];
        const isSlow=slowPlanets.includes(eng);
        const sev=isSlow?'P1':'P2';
        const rashiHi=TYPES_REF.RASHIS_HI[rashi];
        const tags=isSlow?['REVERSAL','SPIKE']:['REVERSAL'];
        events.push({
          type:'INGRESS',eng,
          toRashi:rashi,toRashiHi:rashiHi,
          exactJD,peakDate:jdToISTDate(exactJD),
          window:makeEventWindow(`${eng}→${rashiHi} प्रवेश`,exactJD,isSlow?3:1,sev,tags,
            [`${eng} ${rashiHi} में प्रवेश — बाज़ार में बदलाव संभव`]),
          score:isSlow?-3:-1,
          evidence:[`${eng} sign change ${prevRashi}→${rashi} at JD ${exactJD.toFixed(2)}`]
        });
        prevRashi=rashi;
      } else if(prevRashi<0) prevRashi=rashi;
    }
    return events;
  }

  // Detect conjunctions between transit planets
  function detectConjunctions(transitPlanets,natalD1){
    const events=[];
    const N=getNatal();
    for(let i=0;i<transitPlanets.length;i++){
      for(let j=i+1;j<transitPlanets.length;j++){
        const tp=transitPlanets[i],np=transitPlanets[j];
        const diff=Math.abs(N.n180(tp.sidLon-np.sidLon));
        if(diff<=8){
          const isMal=['Mars','Saturn','Rahu','Ketu'].includes(tp.eng)||
                      ['Mars','Saturn','Rahu','Ketu'].includes(np.eng);
          const sc=isMal?-4:4;
          const tags=isMal?['CRASH_RISK','REVERSAL']:['SPIKE'];
          events.push({
            type:'CONJUNCTION',
            planets:[tp.eng,np.eng],
            planetHi:[tp.hi,np.hi],
            orb:parseFloat(diff.toFixed(2)),
            score:sc,
            window:makeEventWindow(
              `${tp.hi}-${np.hi} युति`,tp.jd,2,getSeverity(sc,tags),tags,
              [`${tp.hi} और ${np.hi} ${diff.toFixed(1)}° — ${isMal?'अत्यधिक अस्थिरता!':'शुभ संयोग'}`]),
            evidence:[`Conjunction orb=${diff.toFixed(2)}° malefic=${isMal}`]
          });
        }
      }
    }
    return events;
  }

  // Detect eclipse approach
  function detectEclipse(jd,natalD1){
    const N=getNatal();
    const ayan=N.lahiri(jd);
    const moonSid=N.n360(N.getPlanetLon('Moon',jd)-ayan);
    const rahuSid=N.n360(N.getPlanetLon('Rahu',jd)-ayan);
    const lunarLon=N.n360(N.getPlanetLon('Moon',jd)-N.getPlanetLon('Sun',jd));
    const distMoonRahu=Math.abs(N.n180(moonSid-rahuSid));
    const events=[];

    // Solar eclipse potential
    if(lunarLon<5||lunarLon>355){
      if(distMoonRahu<18){
        events.push({
          type:'SOLAR_ECLIPSE',score:-5,
          window:makeEventWindow('सूर्य ग्रहण संभव',jd,5,'P1',['CRASH_RISK','REVERSAL'],
            ['सूर्य ग्रहण — बड़ी अस्थिरता, क्रैश रिस्क उच्च']),
          evidence:[`NewMoon lunarLon=${lunarLon.toFixed(1)}, distRahu=${distMoonRahu.toFixed(1)}`]
        });
      }
    }
    // Lunar eclipse potential
    if(Math.abs(lunarLon-180)<5){
      if(distMoonRahu<12){
        events.push({
          type:'LUNAR_ECLIPSE',score:-3,
          window:makeEventWindow('चंद्र ग्रहण संभव',jd,3,'P1',['REVERSAL','WHIPSAW'],
            ['चंद्र ग्रहण — बाज़ार में उथल-पुथल']),
          evidence:[`FullMoon lunarLon=${lunarLon.toFixed(1)}, distRahu=${distMoonRahu.toFixed(1)}`]
        });
      }
    }
    return events;
  }

  // Score event impact on natal chart
  function scoreImpact(event,natalD1,dasha){
    let baseScore=event.score||0;
    // Amplify if dasha lord is involved
    if(event.planets&&dasha&&event.planets.includes(dasha.maha)){
      baseScore*=1.5;
    }
    // Amplify for eclipse near natal nodes
    if(event.type&&event.type.includes('ECLIPSE')) baseScore*=1.3;
    return parseFloat(baseScore.toFixed(2));
  }

  // Build all events for a date range
  function buildAstroEvents(dateIST,natalD1,dasha){
    const N=getNatal();
    const T=getTransits();
    const[y,m,d]=dateIST.split('-').map(Number);
    const jd=N.JD(y,m,d,15,0);

    const report=T.buildReport(dateIST,natalD1);
    const tPlanets=report.planets;

    // Conjunctions today
    const conjEvents=detectConjunctions(tPlanets,natalD1);

    // Eclipse check
    const eclipseEvents=detectEclipse(jd,natalD1);

    // Near-future ingress (next 7 days)
    const ingressEvents=[];
    const fastPlanets=['Sun','Moon','Mercury','Venus','Mars'];
    fastPlanets.forEach(eng=>{
      const ie=detectIngress(eng,jd,jd+7,natalD1);
      ingressEvents.push(...ie);
    });

    // Combine all events
    const allEvents=[...conjEvents,...eclipseEvents,...ingressEvents];

    // Sort by severity then by peakDate
    allEvents.sort((a,b)=>{
      const sv={'P1':0,'P2':1,'P3':2};
      const sa=sv[a.window?.severity||'P3'];
      const sb=sv[b.window?.severity||'P3'];
      return sa-sb;
    });

    // Build module report
    const totalImpact=allEvents.reduce((s,e)=>s+(e.score||0),0);
    const riskTags=[...new Set(allEvents.flatMap(e=>e.window?.tags||[]))];

    return{
      moduleId:'events',
      dateIST,
      events:allEvents,
      totalImpact:parseFloat(totalImpact.toFixed(2)),
      relevanceScore:Math.min(100,40+allEvents.length*10),
      directionHint:totalImpact>2?'BULL':totalImpact<-2?'BEAR':'NEUT',
      confidenceImpact:totalImpact*3,
      riskTags,
      timeWindows:allEvents.map(e=>e.window).filter(Boolean),
      explanations:allEvents.map(e=>e.window?.notes?.[0]).filter(Boolean),
      evidence:allEvents.map(e=>e.evidence?.[0]).filter(Boolean),
      schemaVersion:"5.0"
    };
  }

  return{makeEventWindow,detectIngress,detectConjunctions,detectEclipse,
    scoreImpact,buildAstroEvents,jdToIST,jdToISTDate,getSeverity};
})();

if(typeof module!=='undefined') module.exports=EVENTS;
if(typeof window!=='undefined') window.EVENTS=EVENTS;

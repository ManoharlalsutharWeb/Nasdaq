/* ============================================================
   NASDAQ Vedic System V5 — engine/dasha.js
   Vimshottari Dasha: Maha / Antar / Pratyantar
   ============================================================ */
'use strict';

const DASHA = (function(){
  const ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
  const YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
  const HI={Ketu:'केतु',Venus:'शुक्र',Sun:'सूर्य',Moon:'चंद्र',Mars:'मंगल',
            Rahu:'राहु',Jupiter:'बृहस्पति',Saturn:'शनि',Mercury:'बुध'};
  const TOTAL=120;

  // JD from date
  function jdFromDate(y,m,d){ return (typeof NATAL!=='undefined'?NATAL:require('./natal')).JD(y,m,d,12,0); }

  // Nakshatra lord at a given sidereal Moon longitude
  function nakLord(moonSid){
    const NK=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
    return NK[Math.floor(moonSid/(360/27))%9];
  }

  // Calculate all dashas from birth
  function getTimeline(nasdaq_jd, moonSidLon, fromJD, toJD){
    const nak=Math.floor(moonSidLon/(360/27));
    const lord=nakLord(moonSidLon);
    const li=ORDER.indexOf(lord);
    // fraction elapsed in first dasha at birth
    const fracElapsed=(moonSidLon%(360/27))/(360/27);
    const yearsElapsed=YEARS[lord]*fracElapsed;

    // Build timeline starting from birth
    const timeline=[];
    let cursor=nasdaq_jd-(yearsElapsed*365.25);

    for(let cycle=0;cycle<3;cycle++){
      for(let i=0;i<9;i++){
        const mi=(li+i)%9;
        const maha=ORDER[mi];
        const mahaYrs=YEARS[maha];
        const mahaStart=cursor;
        const mahaEnd=cursor+mahaYrs*365.25;

        // Antar dashas
        let antarCursor=mahaStart;
        for(let j=0;j<9;j++){
          const ai=(mi+j)%9;
          const antar=ORDER[ai];
          const antarYrs=mahaYrs*(YEARS[antar]/TOTAL);
          const antarStart=antarCursor;
          const antarEnd=antarCursor+antarYrs*365.25;

          // Pratyantar
          let pratCursor=antarStart;
          const pratyantars=[];
          for(let k=0;k<9;k++){
            const pi=(ai+k)%9;
            const prat=ORDER[pi];
            const pratYrs=antarYrs*(YEARS[prat]/TOTAL);
            const pratStart=pratCursor;
            const pratEnd=pratCursor+pratYrs*365.25;
            pratyantars.push({prat,pratHi:HI[prat],pratStart,pratEnd,
              pratStartIST:jdToISO(pratStart),pratEndIST:jdToISO(pratEnd)});
            pratCursor=pratEnd;
          }

          timeline.push({maha,mahaHi:HI[maha],mahaStart,mahaEnd,
            antar,antarHi:HI[antar],antarStart,antarEnd,
            mahaStartIST:jdToISO(mahaStart),mahaEndIST:jdToISO(mahaEnd),
            antarStartIST:jdToISO(antarStart),antarEndIST:jdToISO(antarEnd),
            pratyantars});
          antarCursor=antarEnd;
        }
        cursor=mahaEnd;
      }
    }

    // Filter to range
    if(fromJD&&toJD){
      return timeline.filter(d=>d.mahaEnd>=fromJD&&d.mahaStart<=toJD);
    }
    return timeline;
  }

  function jdToISO(jd){
    const ms=(jd-2440587.5)*86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  // Get current dasha for a given JD
  function getCurrent(nasdaq_jd, moonSidLon, targetJD){
    const all=getTimeline(nasdaq_jd,moonSidLon,targetJD-1,targetJD+1);
    // Find the antar entry that contains targetJD
    const entry=all.find(e=>e.antarStart<=targetJD&&e.antarEnd>targetJD);
    if(!entry) return null;

    // Find pratyantar
    const prat=entry.pratyantars.find(p=>p.pratStart<=targetJD&&p.pratEnd>targetJD);

    const mahaElapsed=targetJD-entry.mahaStart;
    const mahaDuration=entry.mahaEnd-entry.mahaStart;
    const mahaPct=Math.min(100,(mahaElapsed/mahaDuration)*100);

    return{
      maha:entry.maha, mahaHi:HI[entry.maha],
      antar:entry.antar, antarHi:HI[entry.antar],
      pratyantar:prat?.prat||entry.antar, pratyantarHi:HI[prat?.prat||entry.antar],
      mahaStart:entry.mahaStartIST, mahaEnd:entry.mahaEndIST,
      antarStart:entry.antarStartIST, antarEnd:entry.antarEndIST,
      mahaPct:parseFloat(mahaPct.toFixed(1)),
      schemaVersion:"5.0"
    };
  }

  // Dasha market interpretation
  function interpret(maha,antar){
    const I={
      Jupiter:{sc:5,bull:true, desc:'विस्तार, आशावाद, दीर्घकालिक बुल।'},
      Venus:  {sc:4,bull:true, desc:'उपभोक्ता, विलासिता, टेक सेक्टर।'},
      Mercury:{sc:3,bull:true, desc:'संचार, टेक, डे-ट्रेड अवसर।'},
      Moon:   {sc:2,bull:true, desc:'भावनात्मक, मासिक चक्र चालित।'},
      Sun:    {sc:2,bull:true, desc:'अधिकार, ब्लू-चिप।'},
      Mars:   {sc:-2,bull:false,desc:'आक्रामक, उच्च अस्थिरता।'},
      Saturn: {sc:-3,bull:false,desc:'संरचनात्मक सुधार, मंदी चरण।'},
      Rahu:   {sc:-2,bull:false,desc:'सट्टा, भ्रम, अचानक crash।'},
      Ketu:   {sc:-3,bull:false,desc:'अचानक हानि, अनिश्चितता।'},
    };
    const m=I[maha]||{sc:0,bull:true,desc:'तटस्थ।'};
    const a=I[antar]||{sc:0,bull:true,desc:''};
    return{sc:m.sc+(a.sc*0.4),bull:m.bull,desc:m.desc,antarDesc:a.desc,
      mahaInterp:m,antarInterp:a};
  }

  return{ORDER,YEARS,HI,TOTAL,getTimeline,getCurrent,interpret,jdToISO,nakLord};
})();

if(typeof module!=='undefined') module.exports=DASHA;
if(typeof window!=='undefined') window.DASHA=DASHA;

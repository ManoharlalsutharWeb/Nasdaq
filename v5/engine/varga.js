/* ============================================================
   NASDAQ Vedic System V5 — engine/varga.js
   Divisional Charts D1–D60 + Analysis + Relevance Scoring
   ============================================================ */
'use strict';

const VARGA = (function(){
  function getNatal(){ return typeof NATAL!=='undefined'?NATAL:require('./natal'); }

  // Varga divisor and meaning table
  const VARGA_META={
    D1: {div:1, name:'राशि',       hi:'D1 — मूल कुंडली',           mkt:'समग्र प्रवृत्ति',       relevance:100},
    D2: {div:2, name:'धन वर्ग (होरा chart)', hi:'D2 — धन विभाजन',    mkt:'धन प्रवाह, आय',         relevance:80},
    D3: {div:3, name:'द्रेष्काण',  hi:'D3 — साहस/गति',             mkt:'गति, मोमेंटम',          relevance:70},
    D4: {div:4, name:'चतुर्थांश',  hi:'D4 — भाग्य/स्थिरता',        mkt:'समर्थन स्तर',            relevance:60},
    D5: {div:5, name:'पंचमांश',    hi:'D5 — पुण्य/बुद्धि',          mkt:'सट्टा/बुद्धि चाल',       relevance:55},
    D6: {div:6, name:'षष्ठांश',    hi:'D6 — स्वास्थ्य/बाधा',        mkt:'सुधार/बाधा खंड',         relevance:50},
    D7: {div:7, name:'सप्तमांश',   hi:'D7 — संतान/रचना',           mkt:'नई लिस्टिंग/IPO',        relevance:45},
    D8: {div:8, name:'अष्टमांश',   hi:'D8 — दीर्घायु/रहस्य',       mkt:'छुपा जोखिम',             relevance:70},
    D9: {div:9, name:'नवांश',      hi:'D9 — भाग्य/विवाह',          mkt:'दीर्घकालिक दिशा',        relevance:90},
    D10:{div:10,name:'दशमांश',     hi:'D10 — करियर/व्यवसाय',       mkt:'इंडेक्स दिशा, NASDAQ',  relevance:95},
    D12:{div:12,name:'द्वादशांश',  hi:'D12 — माता-पिता/जड़',        mkt:'वैश्विक सूचकांक प्रभाव', relevance:55},
    D16:{div:16,name:'षोडशांश',    hi:'D16 — वाहन/सुख',            mkt:'उपभोक्ता/ऑटो सेक्टर',   relevance:40},
    D20:{div:20,name:'विंशांश',    hi:'D20 — आध्यात्मिक',          mkt:'दीर्घकालिक व्यवहार',     relevance:35},
    D24:{div:24,name:'चतुर्विंशांश',hi:'D24 — शिक्षा/ज्ञान',       mkt:'टेक/शिक्षा सेक्टर',      relevance:40},
    D27:{div:27,name:'भांशांश',    hi:'D27 — शक्ति/सामर्थ्य',      mkt:'मार्केट शक्ति',          relevance:60},
    D30:{div:30,name:'त्रिंशांश',  hi:'D30 — दुर्भाग्य/TRAP',      mkt:'TRAP/SPIKE/दुर्घटना',    relevance:85},
    D40:{div:40,name:'खवेदांश',    hi:'D40 — पितृ/मातृ',           mkt:'संस्थागत प्रवाह',        relevance:30},
    D45:{div:45,name:'अक्षवेदांश', hi:'D45 — सर्वशक्ति',           mkt:'बड़ी घटना',               relevance:35},
    D60:{div:60,name:'षष्टयांश',   hi:'D60 — पिछले जन्म/कर्म',     mkt:'दीर्घकालिक कर्म चक्र',  relevance:75,accuracyGated:true},
  };

  // For missing divs (D5,D6,D7,D8,D11 etc.) use generic
  for(let i=1;i<=60;i++){
    const k=`D${i}`;
    if(!VARGA_META[k]){
      VARGA_META[k]={div:i,name:`वर्ग${i}`,hi:`D${i} — विभाजन`,
        mkt:'विशेष विश्लेषण',relevance:Math.max(20,50-i),accuracyGated:i>=50};
    }
  }

  // Calculate varga position
  function getVargaLon(sidLon, div){
    const posInSign=sidLon%30;
    const segSize=30/div;
    const segNum=Math.floor(posInSign/segSize);
    const sign=Math.floor(sidLon/30);
    let vargaSign;
    if(div===1) vargaSign=sign;
    else if(div===2){
      // Hora: Sun/Moon hora
      vargaSign=posInSign<15?4:3; // Leo/Cancer
    } else if(div===9){
      // Navamsa
      const navBase=sign%3===0?0:sign%3===1?4:8;
      vargaSign=(navBase+segNum)%12;
    } else {
      // Generic calculation
      vargaSign=(sign*div+segNum)%12;
    }
    return{vargaSign,segNum,posInSign};
  }

  // Build varga chart
  function getChart(natalD1,div){
    const key=`D${div}`;
    const meta=VARGA_META[key]||VARGA_META['D1'];
    const N=getNatal();
    const lagnaSignD1=natalD1.lagnaSign;

    const planets=natalD1.planets.map(p=>{
      const{vargaSign}=getVargaLon(p.sidLon,div);
      const vargaHouse=(vargaSign-lagnaSignD1+12)%12+1;
      const dignity=N.getDignity(p.eng,vargaSign);
      const strength=N.getPlanetStrength(p.eng,vargaSign,p.retro);
      return{...p,vargaSign,vargaHouse,dignity,strength};
    });

    // Varga lagna (approx — uses D1 lagna)
    const lagnaVarga=getVargaLon(natalD1.lagnaSid,div);

    return{div,key,meta,planets,lagnaSign:lagnaVarga.vargaSign,
      lagnaVarga,schemaVersion:"5.0"};
  }

  // Analyze varga chart → ModuleReport
  function analyzeVarga(div,vargaChart,natalD1,dasha,transitReport){
    const key=`D${div}`;
    const meta=VARGA_META[key]||{relevance:30,hi:`D${div}`,mkt:'विश्लेषण'};
    const N=getNatal();

    // Planet placements score
    let planetScore=0;
    const goodHouses=[1,4,5,7,9,10,11];
    const badHouses=[6,8,12];
    const explanations=[];
    const evidence=[];
    const riskTags=[];

    vargaChart.planets.forEach(p=>{
      const h=p.vargaHouse;
      const isBenefic=['Jupiter','Venus','Moon'].includes(p.eng);
      const isMalefic=['Saturn','Mars','Rahu','Ketu'].includes(p.eng);
      let sc=0;
      if(goodHouses.includes(h)&&isBenefic){sc=2;explanations.push(`${p.hi} ${key} के ${h}वें भाव में — शुभ`);}
      if(badHouses.includes(h)&&isMalefic){sc=-3;riskTags.push('CRASH_RISK');explanations.push(`${p.hi} ${key} के ${h}वें भाव में — अशुभ`);}
      if(p.dignity==='उच्च'){sc+=2;}
      if(p.dignity==='नीच'){sc-=2;}
      planetScore+=sc;
      evidence.push(`${p.eng} D${div} house=${h} dignity=${p.dignity||'N/A'}`);
    });

    // Special D30 analysis (TRAP/SPIKE)
    if(div===30){
      const sat=vargaChart.planets.find(p=>p.eng==='Saturn');
      const mars=vargaChart.planets.find(p=>p.eng==='Mars');
      if(sat&&[6,8,12].includes(sat.vargaHouse)){riskTags.push('TRAP');explanations.push('D30 में शनि 6/8/12 — TRAP संभव');}
      if(mars&&[8,12].includes(mars.vargaHouse)){riskTags.push('SPIKE');explanations.push('D30 में मंगल 8/12 — SPIKE संभव');}
    }

    // Special D10 analysis (NASDAQ business)
    if(div===10){
      const jup=vargaChart.planets.find(p=>p.eng==='Jupiter');
      const sat=vargaChart.planets.find(p=>p.eng==='Saturn');
      if(jup&&[1,5,9,10,11].includes(jup.vargaHouse)){planetScore+=3;explanations.push('D10 में बृहस्पति — NASDAQ बुलिश');}
      if(sat&&[8,12].includes(sat.vargaHouse)){riskTags.push('CRASH_RISK');planetScore-=3;}
    }

    // D60 accuracy gate
    const CONFIG_REF=typeof CONFIG!=='undefined'?CONFIG:{BIRTH_TIME_ACCURACY:'HIGH',D60_GATE:{HIGH:{weight:1.0},MEDIUM:{weight:0.4},LOW:{weight:0.0}}};
    let weight=1.0;
    let accuracyWarning=false;
    if(meta.accuracyGated){
      const acc=CONFIG_REF.BIRTH_TIME_ACCURACY||'HIGH';
      weight=CONFIG_REF.D60_GATE[acc]?.weight||1.0;
      accuracyWarning=weight<1.0;
      if(accuracyWarning) explanations.push(`⚠️ ${key} का भार ${weight*100}% — जन्म समय सटीकता: ${acc}`);
    }

    const adjustedScore=planetScore*weight;
    const directionHint=adjustedScore>3?'BULL':adjustedScore<-3?'BEAR':'NEUT';
    const confidenceImpact=adjustedScore*5;

    return{
      moduleId:`varga_${key}`,
      dateIST:transitReport?.dateIST||'',
      div,key,meta,
      relevanceScore:meta.relevance,
      directionHint,
      confidenceImpact:parseFloat(confidenceImpact.toFixed(2)),
      planetScore:parseFloat(adjustedScore.toFixed(2)),
      riskTags:[...new Set(riskTags)],
      accuracyWarning,weight,
      timeWindows:[],
      explanations,evidence,
      planetEvidence:vargaChart.planets.map(p=>({eng:p.eng,hi:p.hi,sym:p.sym,vargaHouse:p.vargaHouse,vargaSign:p.vargaSign,dignity:p.dignity,strength:p.strength,retro:p.retro})),
      schemaVersion:"5.0"};
  }

  // Generate all D1–D60 reports
  function analyzeAll(natalD1,dasha,transitReport){
    const reports={};
    for(let d=1;d<=60;d++){
      const chart=getChart(natalD1,d);
      reports[`D${d}`]=analyzeVarga(d,chart,natalD1,dasha,transitReport);
    }
    return reports;
  }

  // Varga consensus direction
  function getConsensus(vargaReports,keyDivs=[1,9,10,30,2,3]){
    let bull=0,bear=0,neut=0,totalWeight=0;
    keyDivs.forEach(d=>{
      const r=vargaReports[`D${d}`];
      if(!r) return;
      const w=r.relevanceScore/100;
      if(r.directionHint==='BULL') bull+=w;
      else if(r.directionHint==='BEAR') bear+=w;
      else neut+=w;
      totalWeight+=w;
    });
    if(totalWeight===0) return{dir:'NEUT',bull:0,bear:0,conf:50};
    const conf=Math.round(Math.max(bull,bear)/totalWeight*100);
    return{dir:bull>bear?'BULL':bear>bull?'BEAR':'NEUT',
      bull:parseFloat((bull/totalWeight*100).toFixed(1)),
      bear:parseFloat((bear/totalWeight*100).toFixed(1)),
      conf};
  }

  return{VARGA_META,getVargaLon,getChart,analyzeVarga,analyzeAll,getConsensus};
})();

if(typeof module!=='undefined') module.exports=VARGA;
if(typeof window!=='undefined') window.VARGA=VARGA;

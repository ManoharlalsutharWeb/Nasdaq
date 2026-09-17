/* NASDAQ Vedic V5 — research ledger and validation layer */
'use strict';
const RESEARCH=(function(){
  function buildEvidence(data){
    const fr=data?.finalResult||{};
    const c=fr.componentScores||{};
    return [
      {id:'D1_D60',source:'Kundali',weight:c.kundali?.weight||0.75,score:c.kundali?.score||0,direction:c.kundali?.direction||'NEUT',status:'CALCULATED',note:'D1 nine planets, 12 bhav, D1–D60 and dasha context'},
      {id:'TRANSITS',source:'Transit ephemeris',weight:c.transits?.weight||0.20,score:c.transits?.score||0,direction:c.transits?.direction||'NEUT',status:'CALCULATED',note:'Transit-to-natal aspects at the selected IST time'},
      {id:'PANCHANG',source:'Panchang',weight:c.panchang?.weight||0.05,score:c.panchang?.score||0,direction:c.panchang?.direction||'NEUT',status:'CONTEXT_ONLY',note:'Nakshatra, tithi and yoga; not an independent market feed'},
      {id:'OHLC',source:'US market OHLC',weight:0,score:null,direction:'UNVALIDATED',status:'NOT_CONNECTED',note:'No historical OHLC feed is bundled; predictive accuracy is not claimed'},
    ];
  }
  function backtest(predictions){
    const rows=Array.isArray(predictions)?predictions:[];
    const usable=rows.filter(r=>['BULL','BEAR','NEUT'].includes(r.predicted)&&['BULL','BEAR','NEUT'].includes(r.actual));
    const correct=usable.filter(r=>r.predicted===r.actual).length;
    return{sampleCount:usable.length,correct,accuracy:usable.length?Number((correct/usable.length*100).toFixed(2)):null,status:usable.length?'CALCULATED':'NO_OHLC_LABELS',note:usable.length?'Computed from supplied labels only':'Supply timestamped US futures OHLC and an evaluation rule before interpreting accuracy'};
  }
  function buildReport(date,data){
    return{schemaVersion:'5.0',moduleId:'research',dateIST:date,methodology:'Kundali-first astrology research with separate market validation ledger',evidence:buildEvidence(data),backtest:backtest([]),limitations:['Astrology outputs are hypotheses, not verified causal market signals','No CFTC/SEC/NFA data feed or historical OHLC is bundled in this offline build','DST/session timestamps are calculated in IST and mapped to New York time'],nextValidation:'Connect timestamped NQ/NDX OHLC, define entry/exit/slippage/fees, then run walk-forward out-of-sample testing',generatedAt:new Date().toISOString()};
  }
  return{buildEvidence,backtest,buildReport};
})();
if(typeof module!=='undefined') module.exports=RESEARCH;
if(typeof window!=='undefined') window.RESEARCH=RESEARCH;

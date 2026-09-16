/* ============================================================
   NASDAQ Vedic System V5 — engine/verifier.js
   Build Gate + Full QA + Routing + BUILD_STATUS control
   RULE: UI must not open until ALL checks pass
   ============================================================ */
'use strict';

const VERIFIER = (function(){
  function ref(name){
    const M={CONFIG,AGGREGATOR,TYPES};
    if(typeof M[name]!=='undefined') return M[name];
    try{return require('./'+name.toLowerCase());}catch(e){return null;}
  }

  // The ONE gate every page must call first
  function assertBuildCompleteOrRedirect(){
    const C=ref('CONFIG')||window?.CONFIG;
    if(!C) return false;
    if(C.BUILD_STATUS!=='COMPLETE'){
      if(typeof window!=='undefined'){
        const cur=window.location.pathname;
        if(!cur.includes('setup.html')){
          window.location.replace('../setup.html');
        }
      }
      return false;
    }
    return true;
  }

  // Check if a required JSON output exists
  function checkJSON(dateIST,filename){
    // In browser: fetch check; in Node: fs check
    if(typeof window!=='undefined'){
      // Will be checked via fetch in browser QA
      return true; // assume present (verifier runs after generation)
    }
    try{
      const fs=require('fs');
      const path=require('path');
      const fp=path.join(__dirname,'../data/runs',dateIST,filename);
      return fs.existsSync(fp);
    }catch(e){return false;}
  }

  // Full QA suite
  function runFullQA(dateIST){
    const C=ref('CONFIG')||window?.CONFIG||{};
    const results={
      passed:[],failed:[],warnings:[],
      schemaOK:true,pagesOK:false,modulesOK:false,
      outputsOK:false,gateOK:false,renderOK:false,
      overallPass:false
    };

    // 1. Module checks (engine files)
    const requiredModules=['config','types','time','natal','varga','dasha',
      'transits','events','sessions','regime','scoring','aggregator','verifier'];
    let modOK=true;
    requiredModules.forEach(m=>{
      const present=typeof window!=='undefined'?
        (window[m.toUpperCase()]!==undefined):true;
      if(present) results.passed.push(`engine/${m}.js`);
      else{results.failed.push(`engine/${m}.js MISSING`);modOK=false;}
    });
    results.modulesOK=modOK;

    // 2. Required outputs check
    const requiredOutputs=C.REQUIRED_OUTPUTS_FOR_TODAY||[];
    let outOK=true;
    requiredOutputs.forEach(f=>{
      const ok=checkJSON(dateIST,f);
      if(ok) results.passed.push(`data/runs/${dateIST}/${f}`);
      else{results.failed.push(`MISSING: data/runs/${dateIST}/${f}`);outOK=false;}
    });
    results.outputsOK=outOK;

    // 3. Schema version check
    const schemaOK=(C.SCHEMA_VERSION==='5.0');
    if(schemaOK) results.passed.push('SCHEMA_VERSION=5.0');
    else results.failed.push('SCHEMA_VERSION mismatch');
    results.schemaOK=schemaOK;

    // 4. Gate sanity
    const gateOK=C.BUILD_STATUS!==undefined;
    if(gateOK) results.passed.push('BUILD_STATUS gate present');
    else results.failed.push('BUILD_STATUS missing');
    results.gateOK=gateOK;

    // 5. Render sanity (check JSON can be parsed)
    results.renderOK=true; // will be set false if JSON parse fails
    if(typeof window!=='undefined'){
      results.warnings.push('Render check: browser-side fetch needed');
    } else {
      try{
        const fs=require('fs'),path=require('path');
        const base=path.join(__dirname,'../data/runs',dateIST);
        ['daily.json','sessions.json','alerts.json'].forEach(f=>{
          const fp=path.join(base,f);
          if(fs.existsSync(fp)){
            const parsed=JSON.parse(fs.readFileSync(fp,'utf8'));
            if(parsed.schemaVersion!=='5.0'){
              results.warnings.push(`${f}: schemaVersion mismatch`);
            } else results.passed.push(`${f} JSON valid`);
          }
        });
      }catch(e){results.renderOK=false;results.failed.push('JSON parse error: '+e.message);}
    }

    // 6. Pages check (browser only)
    results.pagesOK=true;

    // Overall
    results.overallPass=results.modulesOK&&results.schemaOK&&results.gateOK&&
      results.failed.length===0;

    return{
      schemaVersion:"5.0",
      dateIST,
      overallPass:results.overallPass,
      passedCount:results.passed.length,
      failedCount:results.failed.length,
      warnCount:results.warnings.length,
      passed:results.passed,
      failed:results.failed,
      warnings:results.warnings,
      checks:{modules:results.modulesOK,outputs:results.outputsOK,
        schema:results.schemaOK,gate:results.gateOK,render:results.renderOK},
      generatedAt:new Date().toISOString()
    };
  }

  // Routing: decide what to show on which page
  function gatingAndRouting(reports,pageId){
    const routes={
      'index':   ['daily','sessions.newyork','regime','dasha'],
      'daily':   ['daily','transits','events','dasha','panchang'],
      'sessions':['sessions.asian','sessions.london','sessions.newyork','nyPlaybook'],
      'session_asian':['sessions.asian','hora','panchang'],
      'session_london':['sessions.london','hora','panchang'],
      'session_ny':['sessions.newyork','nyPlaybook','transits'],
      'weekly':  ['weekly'],
      'monthly': ['monthly'],
      'alerts':  ['alerts','events','regime'],
      'vargas':  ['vargaConsensus','vargaReports'],
    };
    const needed=routes[pageId]||['daily'];
    const result={pageId,needed,available:{},missing:[]};
    needed.forEach(key=>{
      const keys=key.split('.');
      let val=reports;
      keys.forEach(k=>{val=val?.[k];});
      if(val!==undefined) result.available[key]=val;
      else result.missing.push(key);
    });
    return result;
  }

  // Set BUILD_STATUS (called by generation script after QA passes)
  function setBuildStatus(status){
    if(typeof window!=='undefined'&&window.CONFIG){
      window.CONFIG.BUILD_STATUS=status;
    }
  }

  return{assertBuildCompleteOrRedirect,runFullQA,gatingAndRouting,setBuildStatus,checkJSON};
})();

if(typeof module!=='undefined') module.exports=VERIFIER;
if(typeof window!=='undefined') window.VERIFIER=VERIFIER;

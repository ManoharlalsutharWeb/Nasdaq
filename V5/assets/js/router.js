/* ============================================================
   NASDAQ Vedic System V5 — assets/js/router.js
   Page routing + gate check + JSON loader
   ============================================================ */
'use strict';

const ROUTER = (function(){
  let enginePromise = null;
  const generatedCache = new Map();
  const inflight = new Map();
  const reportCache = new Map();

  // Load the calculation engine lazily so every date can be calculated in-browser.
  function ensureEngine(){
    if(enginePromise) return enginePromise;
    if(window.AGGREGATOR) return Promise.resolve();
    const depth = window.location.pathname.includes('/app/vargas/') ? '../../' : '../';
    const files = ['types','time','natal','varga','dasha','transits','events','sessions','regime','scoring','aggregator','research'];
    enginePromise = files.reduce((p,name)=>p.then(()=>new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=`${depth}engine/${name}.js`;
      s.onload=resolve; s.onerror=()=>reject(new Error(`Engine load failed: ${name}.js`));
      document.head.appendChild(s);
    })),Promise.resolve());
    return enginePromise;
  }

  async function generateJSON(dateIST, filename){
    const cacheKey=`${dateIST}/${filename}`;
    if(generatedCache.has(cacheKey)) return generatedCache.get(cacheKey);
    if(inflight.has(cacheKey)) return inflight.get(cacheKey);
    const task=(async()=>{
    await ensureEngine();
    const A=window.AGGREGATOR;
    if(!A) throw new Error('Calculation engine unavailable');
    let data=reportCache.get(dateIST);
    if(!data){
      data=A.collectAll(dateIST);
      reportCache.set(dateIST,data);
    }
    let result=null;
    if(filename==='daily.json') result=A.buildDaily(dateIST,data);
    if(filename==='sessions.json') result=A.buildSessions(dateIST,data);
    if(filename==='ny_open.json') result=A.buildNYOpen(dateIST,data);
    if(filename==='alerts.json') result=A.buildAlerts(dateIST,data);
    if(filename==='weekly.json') result=A.buildWeekly(dateIST,data);
    if(filename==='monthly.json') result=A.buildMonthly(dateIST);
    if(filename==='research.json') result=window.RESEARCH.buildReport(dateIST,data);
    const intraday=filename.match(/^intraday_(\d{2}:\d{2})_(\d{2}:\d{2})_(\d+)\.json$/);
    if(intraday) result=A.buildIntraday(dateIST,intraday[1],intraday[2],Number(intraday[3]));
    const m=filename.match(/^vargas\/d(\d+)\.json$/);
    if(m) result=A.buildVargaJSON(Number(m[1]),dateIST,data);
    if(result){ generatedCache.set(cacheKey,result); return result; }
    return null;
    })();
    inflight.set(cacheKey,task);
    try{return await task;}finally{inflight.delete(cacheKey);}
  }

  // Load a JSON file from data/runs/<date>/
  async function loadJSON(dateIST, filename){
    const base = window.V5_DATA_BASE || '../data/runs';
    const url = `${base}/${dateIST}/${filename}`;
    try{
      const r = await fetch(url);
      if(!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      const json=await r.json();
      if(!json || json.schemaVersion!=='5.0') throw new Error(`Invalid schema for ${url}`);
      return json;
    } catch(e){
      try {
        const generated=await generateJSON(dateIST,filename);
        if(generated) return generated;
      } catch(genErr) {
        console.warn(`ROUTER: generation failed for ${dateIST}/${filename}:`, genErr.message);
      }
      console.warn(`ROUTER: failed to load ${url}:`, e.message);
      return null;
    }
  }

  // Load multiple JSONs at once
  async function loadMany(dateIST, filenames){
    const results = {};
    // Sequential generation avoids duplicate expensive engine runs and browser overload.
    for(const f of filenames){
      try{ results[f]=await loadJSON(dateIST,f); }
      catch(e){ console.warn(`ROUTER: failed ${f}`,e.message); results[f]=null; }
    }
    return results;
  }

  // Gate: every page calls this first
  function gate(){
    const C = window.CONFIG;
    if(!C){ console.error('CONFIG not loaded'); return false; }
    if(C.BUILD_STATUS !== 'COMPLETE'){
      const cur = window.location.pathname;
      if(!cur.includes('setup.html')){
        window.location.replace(getSetupPath());
      }
      return false;
    }
    return true;
  }

  function getSetupPath(){
    const depth = window.location.pathname.split('/').length - 2;
    return '../'.repeat(Math.max(0,depth)) + 'app/setup.html';
  }

  // Today IST
  function todayIST(){
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5*3600000) - (now.getTimezoneOffset()*60000));
    return ist.toISOString().split('T')[0];
  }

  // Nav active highlight
  function setActiveNav(pageId){
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });
  }

  // Build nav HTML (used by ui.js)
  function buildNav(activePage){
    const links = [
      {page:'index',   href:'index.html',   label:'🏠 Dashboard'},
      {page:'daily',   href:'daily.html',   label:'📊 Daily'},
      {page:'sessions',href:'sessions.html',label:'🌍 Sessions'},
      {page:'weekly',  href:'weekly.html',  label:'📅 Weekly'},
      {page:'monthly', href:'monthly.html', label:'📆 Monthly'},
      {page:'alerts',  href:'alerts.html',  label:'🔔 Alerts'},
      {page:'vargas',  href:'vargas.html',  label:'🔭 Vargas'},
      {page:'research',href:'research.html',label:'🔬 Research'},
    ];
    return links.map(l =>
      `<a class="nav-link${l.page===activePage?' active':''}" href="${l.href}" data-page="${l.page}">${l.label}</a>`
    ).join('');
  }

  // Parse date from URL param or use today
  function validDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return false;
    const d=new Date(value+'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
  }
  function getDateParam(){
    const params = new URLSearchParams(window.location.search);
    const requested=params.get('date');
    if(validDate(requested)){try{localStorage.setItem('nasdaq.selectedDate',requested);}catch(e){} return requested;}
    try{const saved=localStorage.getItem('nasdaq.selectedDate');if(validDate(saved)) return saved;}catch(e){}
    return todayIST();
  }
  function rememberDate(value){if(validDate(value))try{localStorage.setItem('nasdaq.selectedDate',value);}catch(e){}}

  // Navigate to page with date
  function goTo(page, date){
    const d = date || getDateParam();
    window.location.href = `${page}?date=${d}`;
  }

  document.addEventListener('change',e=>{if(e.target&&e.target.type==='date') rememberDate(e.target.value);});

  return { loadJSON, loadMany, generateJSON, gate, todayIST, getDateParam, validDate, rememberDate,
           setActiveNav, buildNav, goTo, getSetupPath };
})();

if(typeof window !== 'undefined') window.ROUTER = ROUTER;

/* ============================================================
   NASDAQ Vedic System V5 — assets/js/router.js
   Page routing + gate check + JSON loader
   ============================================================ */
'use strict';

const ROUTER = (function(){
  // Load a JSON file from data/runs/<date>/
  async function loadJSON(dateIST, filename){
    const base = window.V5_DATA_BASE || '../data/runs';
    const url = `${base}/${dateIST}/${filename}`;
    try{
      const r = await fetch(url);
      if(!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return await r.json();
    } catch(e){
      console.warn(`ROUTER: failed to load ${url}:`, e.message);
      return null;
    }
  }

  // Load multiple JSONs at once
  async function loadMany(dateIST, filenames){
    const results = {};
    await Promise.all(filenames.map(async f => {
      results[f] = await loadJSON(dateIST, f);
    }));
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
    ];
    return links.map(l =>
      `<a class="nav-link${l.page===activePage?' active':''}" href="${l.href}" data-page="${l.page}">${l.label}</a>`
    ).join('');
  }

  // Parse date from URL param or use today
  function getDateParam(){
    const params = new URLSearchParams(window.location.search);
    return params.get('date') || todayIST();
  }

  // Navigate to page with date
  function goTo(page, date){
    const d = date || getDateParam();
    window.location.href = `${page}?date=${d}`;
  }

  return { loadJSON, loadMany, gate, todayIST, getDateParam,
           setActiveNav, buildNav, goTo, getSetupPath };
})();

if(typeof window !== 'undefined') window.ROUTER = ROUTER;

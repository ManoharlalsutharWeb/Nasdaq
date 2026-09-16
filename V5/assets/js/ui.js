/* ============================================================
   NASDAQ Vedic System V5 — assets/js/ui.js
   Reusable render helpers for all pages
   ============================================================ */
'use strict';

const UI = (function(){

  /* ── CLOCK ── */
  function startClock(elId){
    function tick(){
      const el = document.getElementById(elId);
      if(!el) return;
      const now = new Date();
      const ist = new Date(now.getTime() + (5.5*3600000) - (now.getTimezoneOffset()*60000));
      const h=String(ist.getHours()).padStart(2,'0');
      const m=String(ist.getMinutes()).padStart(2,'0');
      const s=String(ist.getSeconds()).padStart(2,'0');
      el.textContent = `${h}:${m}:${s} IST`;
    }
    tick(); setInterval(tick, 1000);
  }

  /* ── HEADER ── */
  function renderHeader(containerId, activePage, dateIST){
    const el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = `
    <div class="site-header">
      <div>
        <div class="site-title">☽ NASDAQ Futures Vedic V5</div>
        <div class="site-sub">परशरी + KP + गण्ण + मेरिमैन | Kundali-First | Cross-Verified | ${dateIST}</div>
      </div>
      <nav class="site-nav">${ROUTER.buildNav(activePage)}</nav>
      <div style="display:flex;gap:8px;align-items:center;">
        <div class="live-clock" id="liveClock">--:--:-- IST</div>
        <button class="btn-outline" onclick="doLogout()" style="padding:5px 10px;font-size:10px;">🚪</button>
      </div>
    </div>`;
    startClock('liveClock');
    checkSessionLive();
  }

  /* ── SESSION LIVE CHECK ── */
  function checkSessionLive(){
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5*3600000) - (now.getTimezoneOffset()*60000));
    const h=ist.getHours(), m=ist.getMinutes();
    const t = h*60+m;
    const sessions = {
      asian:  t>=330&&t<840,
      london: t>=810&&t<1320,
      newyork:t>=1140||(t<90),
    };
    Object.entries(sessions).forEach(([id, live])=>{
      document.querySelectorAll(`[data-session="${id}"]`).forEach(el=>{
        el.classList.toggle('active-now', live);
        const badge = el.querySelector('.live-badge');
        if(badge) badge.style.display = live ? 'inline-block' : 'none';
      });
    });
  }

  /* ── SIGNAL HERO ── */
  function renderSignalHero(containerId, finalCall, confidence, rawScore, label){
    const el = document.getElementById(containerId);
    if(!el) return;
    const cls = finalCall==='BULL'?'bull':finalCall==='BEAR'?'bear':'neut';
    const col = finalCall==='BULL'?'var(--green)':finalCall==='BEAR'?'var(--red)':'var(--yellow)';
    const pct = Math.abs(rawScore||0);
    el.innerHTML = `
    <div class="signal-hero ${cls}">
      <div class="sig-label" style="color:${col}">${label||finalCall}</div>
      <div class="str-bar"><div class="str-fill" style="width:${pct}%;background:${col};"></div></div>
      <div class="sig-score">स्कोर: ${(rawScore||0).toFixed(1)}</div>
      <div class="sig-conf">आत्मविश्वास: ${confidence}%</div>
    </div>`;
  }

  /* ── SCORE BARS ── */
  function renderScoreBars(containerId, components){
    const el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = Object.entries(components||{}).map(([k,v])=>{
      const sc = v.score||0;
      const col = sc>0?'var(--green)':sc<0?'var(--red)':'var(--yellow)';
      const pct = Math.min(100,Math.abs(sc)/30*100);
      const labels = {kundali:'कुंडली',transits:'ट्रांज़िट',panchang:'पंचांग',other:'अन्य'};
      return `<div class="sb-row">
        <div class="sb-lbl">${labels[k]||k} (${(v.weight*100||0).toFixed(0)}%)</div>
        <div class="sb-bar"><div class="sb-fill" style="width:${pct}%;background:${col};"></div></div>
        <div class="sb-val" style="color:${col}">${sc>0?'+':''}${sc.toFixed(1)}</div>
      </div>`;
    }).join('');
  }

  /* ── SESSION CARD ── */
  function renderSessionCard(containerId, sessData, sessionId){
    const el = document.getElementById(containerId);
    if(!el) return;
    const sig = sessData?.signal||'NEUT';
    const col = sig==='BULL'?'var(--green)':sig==='BEAR'?'var(--red)':'var(--yellow)';
    const conf = sessData?.confidence||0;
    const trap = sessData?.trap||{type:'clear',title:'--',desc:'--'};
    const flags = {asian:'🌏',london:'🇬🇧',newyork:'🗽'};
    const labels = {asian:'एशियन',london:'लंदन',newyork:'न्यूयॉर्क'};
    el.innerHTML = `
    <div class="sess-card ${sessionId}" data-session="${sessionId}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div>
          <span style="font-size:18px;">${flags[sessionId]||'🌐'}</span>
          <div style="font-weight:700;font-size:12px;">${labels[sessionId]||sessionId}</div>
          <div style="font-size:10px;color:var(--muted);">${CONFIG?.SESSIONS?.[sessionId]?.startIST||''} – ${CONFIG?.SESSIONS?.[sessionId]?.endIST||''} IST</div>
        </div>
        <div>
          <span class="live-badge" style="display:none;">LIVE</span>
          <div class="conf-ring ${conf>=70?'conf-high':conf>=50?'conf-mid':'conf-low'}">${conf}%</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg2);border-radius:10px;padding:10px;">
        <div><div style="font-size:9px;color:var(--muted);">संकेत</div>
          <div class="sess-sig" style="color:${col}">${sig}</div></div>
        <div style="text-align:right;"><div style="font-size:9px;color:var(--muted);">होरा</div>
          <div style="font-size:12px;font-weight:700;color:var(--accent2);">${sessData?.hora||'--'}</div></div>
      </div>
      <div class="sess-conf-bar"><div class="sess-conf-fill" style="width:${conf}%;background:${col};"></div></div>
      <div class="trap-box ${trap.type||'clear'}">
        <div class="trap-title ${trap.type||'clear'}">${trap.title||'--'}</div>
        <div class="trap-desc">${trap.desc||'--'}</div>
      </div>
    </div>`;
  }

  /* ── TIME WINDOWS ── */
  function renderTimeWindows(containerId, windows){
    const el = document.getElementById(containerId);
    if(!el) return;
    if(!windows||!windows.length){el.innerHTML='<div style="color:var(--muted);font-size:10px;">कोई विशेष विंडो नहीं।</div>';return;}
    el.innerHTML = windows.map(w=>`
    <div class="tw-item">
      <div class="tw-header">
        <div class="tw-label">${w.label||'--'}</div>
        <div class="tw-sev sev-${(w.severity||'P3').toLowerCase()}">${w.severity||'P3'}</div>
      </div>
      <div class="tw-times">
        <span class="tw-time-pill">▶ ${w.startIST||'--'}</span>
        <span class="tw-time-pill">⚡ ${w.peakIST||'--'}</span>
        <span class="tw-time-pill">⏹ ${w.endIST||'--'}</span>
      </div>
      ${w.notes?.length?`<div style="font-size:9px;color:var(--muted);margin-top:5px;">${w.notes[0]}</div>`:''}
    </div>`).join('');
  }

  /* ── ALERTS ── */
  function renderAlerts(containerId, alerts){
    const el = document.getElementById(containerId);
    if(!el) return;
    if(!alerts?.length){el.innerHTML='<div style="color:var(--muted);font-size:10px;padding:8px;">कोई अलर्ट नहीं।</div>';return;}
    el.innerHTML = alerts.map(a=>`
    <div class="alert-item">
      <div class="alert-time">${a.startIST||'--'}</div>
      <div class="alert-body">
        <div class="alert-name">${a.label||a.type||'--'}</div>
        <div class="alert-desc">${a.notes?.[0]||'--'}</div>
      </div>
      <div class="alert-imp imp-${(a.severity||'P3').toLowerCase()}">${a.severity||'P3'}</div>
    </div>`).join('');
  }

  /* ── DASHA ── */
  function renderDasha(containerId, dasha){
    const el = document.getElementById(containerId);
    if(!el||!dasha) return;
    el.innerHTML = `
    <div class="dasha-box">
      <div class="dasha-lbl">महादशा</div>
      <div class="dasha-planet">${dasha.mahaHi||'--'} (${dasha.maha||''})</div>
      <div class="dasha-period">${dasha.mahaStart||''} → ${dasha.mahaEnd||''}</div>
      <div class="dasha-bar"><div class="dasha-fill" style="width:${dasha.mahaPct||0}%;"></div></div>
    </div>
    <div class="dasha-box">
      <div class="dasha-lbl">अंतर्दशा</div>
      <div class="dasha-planet">${dasha.antarHi||'--'} (${dasha.antar||''})</div>
      <div class="dasha-period">${dasha.antarStart||''} → ${dasha.antarEnd||''}</div>
    </div>
    <div class="dasha-box">
      <div class="dasha-lbl">प्रत्यंतर्दशा</div>
      <div class="dasha-planet">${dasha.pratyantarHi||'--'} (${dasha.pratyantar||''})</div>
    </div>`;
  }

  /* ── PANCHANG ── */
  function renderPanchang(containerId, pan){
    const el = document.getElementById(containerId);
    if(!el||!pan) return;
    const cards = [
      {l:'वार',v:pan.var||'--'},{l:'तिथि',v:(pan.tithi||0)+' '+pan.paksha},
      {l:'नक्षत्र',v:pan.nakshatra||'--',s:pan.nakshatraEn},
      {l:'योग',v:pan.yoga||'--'},{l:'करण',v:pan.karana||'--'},
      {l:'स्कोर',v:(pan.score>0?'▲ शुभ +':pan.score<0?'▼ अशुभ ':'')+pan.score,
       style:`color:${pan.score>0?'var(--green)':pan.score<0?'var(--red)':'var(--yellow)'}`},
    ];
    el.innerHTML = `<div class="pan-grid">${cards.map(c=>`
      <div class="pan-card">
        <div class="pan-lbl">${c.l}</div>
        <div class="pan-val" style="${c.style||''}">${c.v}</div>
        ${c.s?`<div style="font-size:8px;color:var(--muted);">${c.s}</div>`:''}
      </div>`).join('')}</div>`;
  }

  /* ── WEEK GRID ── */
  function renderWeekGrid(containerId, days, currentDate){
    const el = document.getElementById(containerId);
    if(!el||!days) return;
    const NAMES=['सोम','मंगल','बुध','गुरु','शुक्र'];
    el.innerHTML = `<div class="week-grid">${days.map((d,i)=>{
      const sig=d.finalCall||'NEUT';
      const col=sig==='BULL'?'var(--green)':sig==='BEAR'?'var(--red)':'var(--yellow)';
      const dt=d.date||'';
      const day=dt.split('-')[2]||'';
      const mo=dt.split('-')[1]||'';
      return `<div class="week-day${dt===currentDate?' today':''}${d.isHoliday?' holiday':''}">
        <div class="wd-name">${NAMES[i]||d.day||''}</div>
        <div class="wd-date">${day}/${mo}</div>
        <div class="wd-sig" style="color:${col}">${sig}</div>
        <div class="wd-sc">${(d.score||0).toFixed(0)}</div>
        <div style="font-size:8px;color:var(--accent2);">${(d.nakshatra||'').substring(0,5)}</div>
        <div class="wd-bar" style="background:${col};opacity:.4;width:${Math.min(100,Math.abs(d.score||0))}%;max-width:100%;margin:3px auto 0;"></div>
        ${d.isHoliday?'<div style="font-size:8px;color:var(--red)">अवकाश</div>':''}
      </div>`;
    }).join('')}</div>`;
  }

  /* ── MONTH GRID ── */
  function renderMonthGrid(containerId, days, currentDate){
    const el = document.getElementById(containerId);
    if(!el||!days) return;
    const HDR=['सोम','मंगल','बुध','गुरु','शुक्र','शनि','रवि'];
    // Find first day offset
    const first = days[0]?.date;
    let offset = 0;
    if(first){ const d=new Date(first+'T12:00Z'); offset=d.getUTCDay(); offset=offset===0?6:offset-1; }
    el.innerHTML = `
    <div class="month-hdr">${HDR.map(h=>`<div class="mhc">${h}</div>`).join('')}</div>
    <div class="month-grid">
      ${'<div></div>'.repeat(offset)}
      ${days.map(d=>{
        const sig=d.finalCall||'NEUT';
        const col=sig==='BULL'?'var(--green)':sig==='BEAR'?'var(--red)':'var(--yellow)';
        const dt=d.date||'';
        const day=parseInt(dt.split('-')[2]||0);
        const isToday=dt===currentDate;
        const dw=new Date(dt+'T12:00Z').getUTCDay();
        const isWE=dw===0||dw===6;
        return `<div class="month-day${isToday?' today-m':''}${isWE?' weekend':''}${d.isHoliday?' holiday-m':''}"
          title="${dt}: ${sig} (${(d.score||0).toFixed(0)})">
          <div class="md-n">${day}</div>
          <div class="md-s" style="color:${col}">${sig}</div>
          <div class="md-sc">${(d.score||0).toFixed(0)}</div>
          <div style="font-size:7px;color:var(--accent2);">${(d.nakshatra||'').substring(0,3)}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* ── CRASH ALERT ── */
  function renderCrashAlert(containerId, crashWindows){
    const el = document.getElementById(containerId);
    if(!el) return;
    if(!crashWindows?.length){ el.style.display='none'; return; }
    el.style.display='block';
    el.innerHTML = `
    <div class="crash-alert">
      <div class="crash-title">🚨 Crash Regime Alert</div>
      ${crashWindows.slice(0,2).map(w=>`
        <div style="color:var(--text2);font-size:10px;margin-top:6px;line-height:1.6;">
          <strong>${w.label}</strong> (${w.startDate} → ${w.endDate})<br>
          जोखिम: <strong style="color:var(--red)">${w.probability}%</strong> | ${w.evidence?.slice(0,2).map(e=>e.desc).join(' | ')||''}
        </div>`).join('')}
      <div class="crash-disclaimer">${crashWindows[0]?.disclaimer||''}</div>
    </div>`;
  }

  /* ── TICKER ── */
  function renderTicker(containerId, parts){
    const el = document.getElementById(containerId);
    if(!el) return;
    const text=(parts||[]).join('  ●  ');
    el.innerHTML=`
    <div class="ticker-bar">
      <div class="ticker-lbl">⚡ अलर्ट</div>
      <div class="ticker-scroll"><div class="ticker-content">${text}</div></div>
    </div>`;
  }

  /* ── LOADING STATE ── */
  function showLoading(containerId, text){
    const el=document.getElementById(containerId);
    if(!el) return;
    el.innerHTML=`<div class="loading"><div class="spinner"></div><div class="loading-text">${text||'लोड हो रहा है...'}</div></div>`;
  }

  /* ── ERROR STATE ── */
  function showError(containerId, msg){
    const el=document.getElementById(containerId);
    if(!el) return;
    el.innerHTML=`<div style="color:var(--red);font-size:11px;padding:12px;">⚠️ ${msg||'त्रुटि'}</div>`;
  }

  return{startClock,renderHeader,renderSignalHero,renderScoreBars,
    renderSessionCard,renderTimeWindows,renderAlerts,renderDasha,
    renderPanchang,renderWeekGrid,renderMonthGrid,renderCrashAlert,
    renderTicker,showLoading,showError,checkSessionLive};
})();

if(typeof window!=='undefined') window.UI=UI;

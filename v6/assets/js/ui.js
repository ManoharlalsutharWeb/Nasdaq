/* ============================================================
   VedicAladdin V6 — assets/js/ui.js
   UI Utilities: toast, modal, format helpers
   ============================================================ */
'use strict';

const UI = (function () {
  'use strict';

  const SIG_COLORS = {
    STRONG_BULL:'#00e676', BULL:'#69f0ae', NEUTRAL:'#ffd740',
    BEAR:'#ff6d00', STRONG_BEAR:'#ff1744',
  };

  // ── Toast notifications ─────────────────────────────────
  function toast(msg, type, duration) {
    type = type || 'info'; duration = duration || 3000;
    const COLOR = { info:'#90caf9', success:'#00e676', warn:'#ffd740', error:'#ff1744' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:24px;right:24px;background:#1a1a2e;
      color:${COLOR[type]||'#e0e0e0'};border:1px solid ${COLOR[type]||'rgba(255,255,255,0.1)'};
      padding:12px 18px;border-radius:10px;font-size:13px;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:300px;line-height:1.5;
      animation:fadeIn .3s ease`;
    el.textContent = msg;
    const style = document.createElement('style');
    style.textContent = '@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(), 300); }, duration);
  }

  // ── Signal label with color ──────────────────────────────
  function signalBadge(signal, labelHi) {
    const color = SIG_COLORS[signal] || '#ffd740';
    const bg    = color + '22';
    return `<span style="background:${bg};color:${color};border:1px solid ${color}44;
      padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700">${labelHi||signal}</span>`;
  }

  // ── Format score with +/- ───────────────────────────────
  function fmtScore(n) {
    const v = parseFloat(n || 0).toFixed(1);
    return (n >= 0 ? '+' : '') + v;
  }

  // ── Crash meter HTML ────────────────────────────────────
  function crashMeterHTML(score) {
    const color = score>=80?'#ff1744':score>=60?'#ff6d00':score>=40?'#ffd740':'#00e676';
    return `<div style="text-align:center">
      <div style="font-size:32px;font-weight:800;color:${color}">${score}/100</div>
      <div class="meter-bar"><div class="meter-thumb" style="left:${score}%"></div></div>
    </div>`;
  }

  // ── Probability bar HTML ─────────────────────────────────
  function probBarHTML(label, pct, color) {
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="width:140px;font-size:12px">${label}</span>
      <div style="flex:1;background:rgba(255,255,255,.06);border-radius:4px;height:20px;overflow:hidden">
        <div style="width:${pct}%;background:${color};height:100%;display:flex;align-items:center;
          padding-left:8px;font-size:11px;font-weight:700;color:#fff;min-width:28px">${pct}%</div>
      </div>
    </div>`;
  }

  // ── Copy to clipboard ───────────────────────────────────
  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast('कॉपी हो गया! ✅', 'success'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      ta.remove(); toast('कॉपी हो गया!', 'success');
    }
  }

  // ── Loading state for an element ────────────────────────
  function setLoading(el, loading) {
    if (!el) return;
    el.style.opacity    = loading ? '0.5' : '1';
    el.style.pointerEvents = loading ? 'none' : '';
  }

  // ── Format IST datetime ─────────────────────────────────
  function fmtIST(dateStr) {
    const MONTHS = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून',
                    'जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर'];
    const DAYS   = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
    const dt = new Date(dateStr + 'T12:00:00Z');
    return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}, ${DAYS[dt.getUTCDay()]}`;
  }

  if (typeof window !== 'undefined') window.UI = { toast, signalBadge, fmtScore, crashMeterHTML, probBarHTML, copyText, setLoading, fmtIST };
  return { toast, signalBadge, fmtScore, crashMeterHTML, probBarHTML, copyText, setLoading, fmtIST };
})();

/* ===========================================================

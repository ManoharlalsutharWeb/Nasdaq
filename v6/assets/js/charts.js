/* ============================================================
   VedicAladdin V6 — assets/js/charts.js
   Chart.js Visualizations — Dark theme, Hindi labels
   schemaVersion: "6.0"
   ============================================================ */
'use strict';

const CHARTS = (function () {
  'use strict';

  const DARK_BG   = '#1a1a2e';
  const GRID_COLOR= 'rgba(255,255,255,0.08)';
  const TEXT_COLOR= '#e0e0e0';
  const ACCENT    = '#FF6B00';

  const TIER_COLORS = {
    strongRally:'#00e676', bull:'#69f0ae', flat:'#ffd740', bear:'#ff6d00', crash:'#ff1744',
  };

  // ── Chart defaults ──────────────────────────────────────
  function applyDarkDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = TEXT_COLOR;
    Chart.defaults.font.family = "'Noto Sans Devanagari', 'Segoe UI', sans-serif";
    Chart.defaults.plugins.legend.labels.color = TEXT_COLOR;
  }

  // ── Possibility Chart — horizontal bar ──────────────────
  function renderPossibilityChart(canvasId, data) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const labels   = ['तेज़ तेजी', 'तेजी', 'सपाट', 'मंदी', 'क्रैश'];
    const values   = [data.strongRally||0, data.bull||0, data.flat||0, data.bear||0, data.crash||0];
    const colors   = Object.values(TIER_COLORS);

    if (window._possibilityChart) window._possibilityChart.destroy();
    window._possibilityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, barThickness: 28 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => ` ${c.parsed.x.toFixed(1)}%` },
          },
        },
        scales: {
          x: { max: 100, grid: { color: GRID_COLOR }, ticks: { callback: v => v + '%' } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  // ── Crash Meter — doughnut / arc ────────────────────────
  function renderCrashMeter(canvasId, score) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const color = score >= 80 ? '#ff1744' : score >= 60 ? '#ff6d00' : score >= 40 ? '#ffd740' : '#00e676';
    if (window._crashMeter) window._crashMeter.destroy();
    window._crashMeter = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, 100 - score],
          backgroundColor: [color, 'rgba(255,255,255,0.05)'],
          borderWidth: 0, circumference: 270, rotation: 225,
        }],
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea: { top, left, right, bottom } } = chart;
          ctx.save();
          ctx.font = 'bold 28px Noto Sans Devanagari';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(score + '/100', (left+right)/2, (top+bottom)/2 + 8);
          ctx.restore();
        },
      }],
      options: { responsive: true, cutout: '80%', plugins: { legend: { display: false } } },
    });
  }

  // ── Timeline Chart — color-coded hourly blocks ──────────
  function renderTimelineChart(canvasId, blocks) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const Q_SCORE = { 'A+':6,'A':5,'B':4,'C':3,'D':2,'F':1 };
    const labels  = blocks.map(b => b.startIST);
    const scores  = blocks.map(b => Q_SCORE[b.quality] || 3);
    const colors  = blocks.map(b => b.color || '#ffd740');
    if (window._timelineChart) window._timelineChart.destroy();
    window._timelineChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: scores, backgroundColor: colors, borderRadius: 4, barThickness: 22 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: c => blocks[c.dataIndex]?.quality + ' — ' + (blocks[c.dataIndex]?.label || '') } } },
        scales: {
          y: { min:0, max:7, grid:{color:GRID_COLOR}, ticks:{callback:v=>['','F','D','C','B','A','A+',''][v]||''} },
          x: { grid:{display:false} },
        },
      },
    });
  }

  // ── Accuracy Chart — line chart over time ───────────────
  function renderAccuracyChart(canvasId, history) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const labels = history.map(h => h.date);
    const data   = history.map(h => h.accuracy || 0);
    if (window._accuracyChart) window._accuracyChart.destroy();
    window._accuracyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'सटीकता %', data, borderColor: ACCENT, backgroundColor: 'rgba(255,107,0,0.1)',
                     fill: true, tension: 0.4, pointRadius: 3 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { min:0, max:100, grid:{color:GRID_COLOR}, ticks:{callback:v=>v+'%'} },
          x: { grid:{display:false} },
        },
      },
    });
  }

  // ── Yoga Strength Chart — radar ─────────────────────────
  function renderYogaStrengthChart(canvasId, yogas) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const active = yogas.filter(y => y.active).slice(0, 8);
    if (!active.length) return;
    if (window._yogaChart) window._yogaChart.destroy();
    window._yogaChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: active.map(y => y.nameHi),
        datasets: [{
          label: 'योग शक्ति', data: active.map(y => y.strength||0),
          borderColor: ACCENT, backgroundColor: 'rgba(255,107,0,0.15)', pointBackgroundColor: ACCENT,
        }],
      },
      options: {
        responsive: true,
        scales: { r: { min:0, max:100, grid:{color:GRID_COLOR}, ticks:{display:false}, pointLabels:{color:TEXT_COLOR,font:{size:11}} } },
      },
    });
  }

  return { applyDarkDefaults, renderPossibilityChart, renderCrashMeter,
           renderTimelineChart, renderAccuracyChart, renderYogaStrengthChart };
})();

if (typeof window !== 'undefined') window.CHARTS = CHARTS;

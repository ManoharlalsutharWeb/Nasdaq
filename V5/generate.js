'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./engine/aggregator');
const V = require('./engine/verifier');
const dateIST = process.argv[2] || A.todayIST();
const base = path.join(__dirname, 'data', 'runs', dateIST);
fs.mkdirSync(path.join(base, 'qa'), { recursive: true });
fs.mkdirSync(path.join(base, 'vargas'), { recursive: true });
const data = A.collectAll(dateIST);
const outputs = {
  'daily.json': A.buildDaily(dateIST, data),
  'sessions.json': A.buildSessions(dateIST, data),
  'ny_open.json': A.buildNYOpen(dateIST, data),
  'alerts.json': A.buildAlerts(dateIST, data),
  'weekly.json': A.buildWeekly(dateIST, data),
  'monthly.json': A.buildMonthly(dateIST)
};
for (const [name, value] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(base, name), JSON.stringify(value, null, 2));
}
for (let div = 1; div <= 60; div++) {
  fs.writeFileSync(path.join(base, 'vargas', `d${String(div).padStart(2, '0')}.json`),
    JSON.stringify(A.buildVargaJSON(div, dateIST, data), null, 2));
}
fs.writeFileSync(path.join(base, 'qa', 'summary.json'), '{}');
const qa = V.runFullQA(dateIST);
fs.writeFileSync(path.join(base, 'qa', 'summary.json'), JSON.stringify(qa, null, 2));
console.log(JSON.stringify({ dateIST, finalCall: outputs['daily.json'].finalCall, confidence: outputs['daily.json'].finalConfidence, qa: qa.overallPass, failed: qa.failed }, null, 2));
if (!qa.overallPass) process.exitCode = 1;

function isComplete() {
  return ['daily.json','sessions.json','ny_open.json','alerts.json','weekly.json','monthly.json','qa/summary.json']
    .every(f => fs.existsSync(path.join(base, f))) &&
    Array.from({length: 60}, (_, i) => fs.existsSync(path.join(base, 'vargas', `d${String(i+1).padStart(2,'0')}.json`))).every(Boolean);
}
if (!isComplete()) process.exitCode = 1;

=
   VedicAladdin V6 — advanced/market_fetcher.js
   Optional: Free market data from Alpha Vantage API
   schemaVersion: "6.0"
   ============================================================ */
const MARKET_FETCHER = (function () {
  'use strict';

  const BASE = 'https://www.alphavantage.co/query';
  let _apiKey = (typeof process !== 'undefined' && process.env?.MARKET_API) || '';

  function setApiKey(key) { _apiKey = key; }

  // Fetch NASDAQ (QQQ) daily close
  async function fetchNASDAQClose(dateStr) {
    if (!_apiKey) return { available: false, reason: 'API key not set' };
    try {
      const url  = `${BASE}?function=TIME_SERIES_DAILY&symbol=QQQ&apikey=${_apiKey}&outputsize=compact`;
      const resp = await fetch(url);
      const data = await resp.json();
      const series = data['Time Series (Daily)'] || {};
      const entry  = series[dateStr];
      if (!entry) return { available: false, date: dateStr, reason: 'Date not in response' };
      return {
        available: true, date: dateStr,
        open  : parseFloat(entry['1. open']),
        high  : parseFloat(entry['2. high']),
        low   : parseFloat(entry['3. low']),
        close : parseFloat(entry['4. close']),
        volume: parseInt(entry['5. volume']),
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { available: false, reason: e.message };
    }
  }

  // Fetch live QQQ price (intraday)
  async function fetchLivePrice() {
    if (!_apiKey) return { available: false, reason: 'API key not set' };
    try {
      const url  = `${BASE}?function=GLOBAL_QUOTE&symbol=QQQ&apikey=${_apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();
      const q    = data['Global Quote'] || {};
      return {
        available    : !!q['05. price'],
        symbol       : 'QQQ',
        price        : parseFloat(q['05. price'] || 0),
        change       : parseFloat(q['09. change'] || 0),
        changePct    : parseFloat((q['10. change percent']||'0%').replace('%','')),
        volume       : parseInt(q['06. volume'] || 0),
        latestDay    : q['07. latest trading day'],
        schemaVersion: "6.0",
      };
    } catch (e) {
      return { available: false, reason: e.message };
    }
  }

  // Calculate move % between two dates
  async function getMovePct(fromDate, toDate) {
    const from = await fetchNASDAQClose(fromDate);
    const to   = await fetchNASDAQClose(toDate);
    if (!from.available || !to.available) return null;
    return parseFloat(((to.close - from.close) / from.close * 100).toFixed(2));
  }

  return { setApiKey, fetchNASDAQClose, fetchLivePrice, getMovePct };
})();

if (typeof module !== 'undefined') module.exports = { ACCURACY_TRACKER, MARKET_FETCHER };
if (typeof window !== 'undefined') { window.ACCURACY_TRACKER = ACCURACY_TRACKER; window.MARKET_FETCHER = MARKET_FETCHER; }

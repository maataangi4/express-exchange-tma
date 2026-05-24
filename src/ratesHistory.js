import { parseDisplayPrice } from './ratesDisplay';

const HISTORY_KEY = 'exexchange_rate_history_v1';
const MAX_POINTS = 64;
const CHANGE_EPS = 0.02;

function pairKey(code, target) {
  const get = target === 'ARS (Card)' ? 'ARS_CARD' : String(target || '').trim();
  return `${code}-${get}`;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return { lastPairDisplay: {}, history: {} };
    const data = JSON.parse(raw);
    return {
      lastPairDisplay: data.lastPairDisplay || {},
      history: data.history || {},
    };
  } catch {
    return { lastPairDisplay: {}, history: {} };
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        lastPairDisplay: store.lastPairDisplay,
        history: store.history,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* ignore */
  }
}

function trendFromChange(change) {
  if (change > CHANGE_EPS) return 'up';
  if (change < -CHANGE_EPS) return 'down';
  return 'flat';
}

function mergeHistorySeries(serverSeries, localSeries, currentRate) {
  const out = [];
  const push = (v) => {
    if (v == null || !Number.isFinite(v)) return;
    if (out.length === 0 || out[out.length - 1] !== v) out.push(v);
  };
  (Array.isArray(serverSeries) ? serverSeries : []).forEach(push);
  (Array.isArray(localSeries) ? localSeries : []).forEach(push);
  push(currentRate);
  while (out.length > MAX_POINTS) out.shift();
  return out;
}

function historyForChart(series, currentRate) {
  if (series.length >= 2) return series;
  const v = series[0] ?? currentRate ?? 0;
  if (v === 0) return [0, 0];
  return [v, v];
}

/**
 * Тренд и история для карточек: сервер (при каждом изменении в Excel) + локальный снимок.
 */
export function enrichMarketDataWithTrend(marketData = [], pairDisplay = {}, serverPairHistory = {}) {
  const store = loadStore();
  const prev = store.lastPairDisplay || {};

  const enriched = marketData.map((item) => {
    const key = pairKey(item.code, item.target);
    const rate =
      parseDisplayPrice(item.price) ??
      (pairDisplay[key] != null ? Number(pairDisplay[key]) : null);
    const prevRate = prev[key] != null ? Number(prev[key]) : null;

    let change = 0;
    if (
      rate != null &&
      Number.isFinite(rate) &&
      prevRate != null &&
      Number.isFinite(prevRate) &&
      prevRate !== 0
    ) {
      change = ((rate - prevRate) / Math.abs(prevRate)) * 100;
    }

    const localHist = Array.isArray(store.history[key]) ? [...store.history[key]] : [];
    if (rate != null && Number.isFinite(rate)) {
      const last = localHist[localHist.length - 1];
      if (last !== rate) {
        localHist.push(rate);
        while (localHist.length > MAX_POINTS) localHist.shift();
      }
      store.history[key] = localHist;
    }

    const merged = mergeHistorySeries(serverPairHistory[key], localHist, rate);
    const history = historyForChart(merged, rate);

    return {
      ...item,
      pairKey: key,
      change,
      trend: trendFromChange(change),
      history,
      historyPoints: merged.length,
    };
  });

  store.lastPairDisplay = { ...pairDisplay };
  saveStore(store);
  return enriched;
}

export function trendChartColor(trend, isDark) {
  if (trend === 'up') return '#22c55e';
  if (trend === 'down') return '#ef4444';
  return isDark ? '#FFFFFF' : '#000000';
}

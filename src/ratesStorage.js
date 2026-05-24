import {
  buildCalcFees,
  buildCalcPairRates,
  buildExchangeRatesFromPairRates,
  sanitizeSpreadPairRates,
} from './ratesDisplay';

const STORAGE_KEY = 'exexchange_rates_v15';

export function loadRatesCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.marketData?.length || !data?.ratesUpdatedAt) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveRatesCache(payload) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        exchangeRates: payload.exchangeRates,
        pairRates: payload.pairRates,
        pairDisplay: payload.pairDisplay,
        pairHistory: payload.pairHistory || {},
        exchangeFees: payload.exchangeFees,
        marketData: payload.marketData,
        ratesUpdatedAt: payload.ratesUpdatedAt,
      })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Старт: без цен на главной (только после свежего запроса к API) */
export function getInitialRatesState(fallbackRates, fallbackFees) {
  try {
    localStorage.removeItem('exexchange_rates_v1');
    localStorage.removeItem('exexchange_rates_v2');
    localStorage.removeItem('exexchange_rates_v3');
    localStorage.removeItem('exexchange_rates_v4');
    localStorage.removeItem('exexchange_rates_v5');
    localStorage.removeItem('exexchange_rates_v6');
    localStorage.removeItem('exexchange_rates_v7');
    localStorage.removeItem('exexchange_rates_v8');
    localStorage.removeItem('exexchange_rates_v9');
    localStorage.removeItem('exexchange_rates_v10');
    localStorage.removeItem('exexchange_rates_v11');
    localStorage.removeItem('exexchange_rates_v12');
    localStorage.removeItem('exexchange_rates_v13');
    localStorage.removeItem('exexchange_rates_v14');
  } catch {
    /* ignore */
  }
  const cached = loadRatesCache();
  const pairDisplay = cached?.pairDisplay || {};
  const pairRates = buildCalcPairRates(
    sanitizeSpreadPairRates(cached?.pairRates || {}),
    pairDisplay
  );
  return {
    marketData: [],
    exchangeRates: cached?.exchangeRates
      ? buildExchangeRatesFromPairRates(pairRates, cached.exchangeRates)
      : { ...fallbackRates },
    pairRates,
    pairDisplay,
    exchangeFees: cached?.exchangeFees
      ? buildCalcFees({ ...fallbackFees, ...cached.exchangeFees }, pairDisplay)
      : { ...fallbackFees },
    ratesUpdatedAt: null,
    ratesReady: false,
    ratesLoading: false,
  };
}

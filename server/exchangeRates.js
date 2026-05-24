const { getSheets, isConfigured } = require('./googleSheets');
const { HOME_MARKET_PAIRS } = require('./homeMarketPairs');
const { recordPairDisplay, getPairHistoryMap } = require('./ratesHistoryStore');

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID || '11p4tMxdnq91JngFwFUFUykcy60Tqxpfyhf1amLGI2v4';

/** Строки вкладки Rates (пары в колонке G, курс для Telegram — H, рабочий — I) */
const RATE_SHEET_ROWS = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const FLAGS = {
  USDT: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
  USD: 'https://hatscripts.github.io/circle-flags/flags/us.svg',
  EUR: 'https://hatscripts.github.io/circle-flags/flags/eu.svg',
  RUB: 'https://hatscripts.github.io/circle-flags/flags/ru.svg',
  ARS: 'https://hatscripts.github.io/circle-flags/flags/ar.svg',
  ARS_CARD: 'https://hatscripts.github.io/circle-flags/flags/ar.svg',
};

const DEFAULT_RATES = {
  USDT: { rate: 1, flag: FLAGS.USDT },
  USD: { rate: 0.98, flag: FLAGS.USD },
  EUR: { rate: 0.92, flag: FLAGS.EUR },
  RUB: { rate: 78, flag: FLAGS.RUB },
  ARS: { rate: 1420, flag: FLAGS.ARS },
  ARS_CARD: { rate: 1400, flag: FLAGS.ARS_CARD },
};

const DEFAULT_FEES = {
  'USDT-USD': 1.0,
  'USDT-EUR': 1.5,
  'USD-USDT': 1.0,
  'EUR-USDT': 1.0,
};

/** Один запрос к Sheets вместо 13; кэш ~45 с */
const RATES_CACHE_MS = 45_000;
const RATES_CACHE_VERSION = 11;
let ratesCache = null;
let ratesCacheAt = 0;

function normalizeNumericCell(val) {
  if (val === undefined || val === null || val === '') return '';
  let s = String(val).trim().replace(/\s/g, '').replace(/\u2212/g, '-');
  if (s.startsWith('(') && s.endsWith(')')) s = `-${s.slice(1, -1)}`;
  return s.replace(',', '.');
}

function parseSheetNumber(val, allowNonPositive = false) {
  const s = normalizeNumericCell(val);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (!allowNonPositive && n <= 0) return null;
  return n;
}

function isUsdtUsdSpreadPair(give, get) {
  return (give === 'USDT' && get === 'USD') || (give === 'USD' && get === 'USDT');
}

function isUsdtFiatSpreadPair(give, get) {
  return (
    (give === 'USDT' && (get === 'USD' || get === 'EUR')) ||
    ((give === 'USD' || give === 'EUR') && get === 'USDT')
  );
}

function isSpreadPercentRate(rate, give, get) {
  return (
    (isUsdtUsdSpreadPair(give, get) || isUsdtFiatSpreadPair(give, get)) &&
    rate != null &&
    Number.isFinite(rate) &&
    Math.abs(rate) < 20
  );
}

function isAllowedHomeDisplayRate(rate, give, get) {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return false;
  if (isSpreadPercentRate(rate, give, get)) return true;
  return rate > 0;
}

/** "USD/ARS" → { give, get, key } */
function parsePairLabel(raw) {
  const s = String(raw || '').trim();
  if (!s || !s.includes('/')) return null;
  const [a, b] = s.split('/').map((x) => x.trim());
  if (!a || !b) return null;
  const norm = (c) => {
    const u = c.toUpperCase().replace(/\s+/g, '_');
    if (u === 'ARS_CARD' || u === 'ARS(CARD)') return 'ARS_CARD';
    return u;
  };
  const give = norm(a);
  const get = norm(b);
  return { give, get, key: `${give}-${get}` };
}

function isArsPerForeignRatePair(give, get) {
  return (give === 'ARS' || give === 'ARS_CARD') && ['USD', 'USDT', 'EUR'].includes(get);
}

function isForeignToArsRatePair(give, get) {
  return ['USD', 'USDT', 'EUR'].includes(give) && (get === 'ARS' || get === 'ARS_CARD');
}

function setPairRate(map, give, get, rate) {
  if (!rate || rate <= 0) return;
  const key = `${give}-${get}`;
  map[key] = rate;
  if (isForeignToArsRatePair(give, get) || isArsPerForeignRatePair(give, get)) return;
  const inv = `${get}-${give}`;
  if (!map[inv]) map[inv] = 1 / rate;
}

function deriveMissingPairRates(pairRates) {
  const usdtArs = pairRates['USDT-ARS'];
  const usdArs = pairRates['USD-ARS'];
  const rubArs = pairRates['RUB-ARS'];
  const eurArs = pairRates['EUR-ARS'];

  if (usdtArs && !pairRates['USDT-ARS_CARD']) {
    setPairRate(pairRates, 'USDT', 'ARS_CARD', usdtArs * (1400 / 1425));
  }
  if (usdArs && !pairRates['USD-ARS_CARD']) {
    setPairRate(pairRates, 'USD', 'ARS_CARD', usdArs * (1400 / 1425));
  }
  if (rubArs && !pairRates['RUB-ARS_CARD']) {
    setPairRate(pairRates, 'RUB', 'ARS_CARD', rubArs * (1400 / 1425));
  }
  if (eurArs && !pairRates['EUR-ARS_CARD']) {
    setPairRate(pairRates, 'EUR', 'ARS_CARD', eurArs * (1400 / 1425));
  }

  if (rubArs && usdArs && !pairRates['RUB-USD']) {
    setPairRate(pairRates, 'RUB', 'USD', rubArs / usdArs);
  }
  if (rubArs && usdtArs && !pairRates['RUB-USDT']) {
    setPairRate(pairRates, 'RUB', 'USDT', rubArs / usdtArs);
  }
  if (usdArs && usdtArs && !pairRates['USD-USDT']) {
    setPairRate(pairRates, 'USD', 'USDT', usdArs / usdtArs);
  }
}

function buildRatesFromPairs(pairRates) {
  const rates = {
    USDT: { rate: 1, flag: FLAGS.USDT },
    USD: { ...DEFAULT_RATES.USD },
    EUR: { ...DEFAULT_RATES.EUR },
    RUB: { ...DEFAULT_RATES.RUB },
    ARS: { ...DEFAULT_RATES.ARS },
    ARS_CARD: { ...DEFAULT_RATES.ARS_CARD },
  };

  const ars =
    pairRates['USDT-ARS'] ||
    pairRates['USD-ARS'] ||
    DEFAULT_RATES.ARS.rate;

  rates.ARS.rate = ars;
  rates.ARS_CARD.rate =
    pairRates['USDT-ARS_CARD'] || pairRates['USD-ARS_CARD'] || ars * (1400 / 1425);

  if (pairRates['USD-ARS']) rates.USD.rate = ars / pairRates['USD-ARS'];
  if (pairRates['EUR-ARS']) rates.EUR.rate = ars / pairRates['EUR-ARS'];
  if (pairRates['RUB-ARS']) rates.RUB.rate = ars / pairRates['RUB-ARS'];

  return rates;
}

function formatDisplayPrice(rate, give, get) {
  if (isSpreadPercentRate(rate, give, get)) {
    const body = Math.abs(rate).toFixed(2).replace('.', ',');
    return rate < 0 ? `-${body}%` : `${body}%`;
  }
  const abs = Math.abs(rate);
  const sign = rate < 0 ? '-' : '';
  if (abs >= 100) return sign + String(Math.round(abs));
  if (abs >= 1) return sign + abs.toFixed(2).replace('.', ',');
  if (abs > 0) {
    const decimals = abs < 0.01 ? 4 : 2;
    return sign + abs.toFixed(decimals).replace('.', ',');
  }
  return String(rate).replace('.', ',');
}

function pairTargetLabel(get) {
  return get === 'ARS_CARD' ? 'ARS (Card)' : get;
}

function buildMarketData(pairDisplay) {
  const items = [];
  for (const [give, get] of HOME_MARKET_PAIRS) {
    const key = `${give}-${get}`;
    const rate = pairDisplay[key];
    if (!isAllowedHomeDisplayRate(rate, give, get)) continue;
    const flat = Array(24).fill(rate);
    items.push({
      code: give,
      target: pairTargetLabel(get),
      price: formatDisplayPrice(rate, give, get),
      change: 0,
      history: flat,
      flag: FLAGS[give] || FLAGS.USDT,
    });
  }
  return items;
}

async function fetchExchangeRatesFromSheet() {
  if (!isConfigured()) {
    return {
      rates: DEFAULT_RATES,
      pairRates: {},
      pairDisplay: {},
      pairHistory: getPairHistoryMap(),
      fees: DEFAULT_FEES,
      marketData: [],
      source: 'defaults',
      updatedAt: new Date().toISOString(),
    };
  }

  const now = Date.now();
  if (
    ratesCache &&
    ratesCache._cacheVersion === RATES_CACHE_VERSION &&
    now - ratesCacheAt < RATES_CACHE_MS
  ) {
    return ratesCache;
  }

  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Rates!G3:I19',
  });
  const grid = res.data.values || [];

  const pairRates = {};
  const pairDisplay = {};
  const fees = { ...DEFAULT_FEES };

  for (const rowNum of RATE_SHEET_ROWS) {
    const cells = grid[rowNum - 3] || [];
    const pair = parsePairLabel(cells[0]);
    if (!pair) continue;

    const h = parseSheetNumber(cells[1]);
    const i = parseSheetNumber(cells[2]);

    if (pair.key === 'USDT-USD') {
      const displayH = parseSheetNumber(cells[1], true);
      const workingI = parseSheetNumber(cells[2], true);
      if (displayH != null && displayH !== 0) pairDisplay['USDT-USD'] = displayH;
      const spreadH =
        displayH != null && displayH !== 0 && Math.abs(displayH) < 20 ? displayH : null;
      const spreadI =
        workingI != null && workingI !== 0 && Math.abs(workingI) < 20 ? workingI : null;
      const spreadFee = spreadH ?? spreadI;
      if (spreadFee != null) {
        fees['USDT-USD'] = spreadFee;
        fees['USD-USDT'] = spreadFee;
      }
      continue;
    }

    if (pair.key === 'USD-USDT') {
      const displayH = parseSheetNumber(cells[1], true);
      const workingI = parseSheetNumber(cells[2], true);
      if (displayH != null && displayH !== 0) pairDisplay[pair.key] = displayH;
      const working = workingI ?? displayH;
      if (working != null && working !== 0) {
        if (Math.abs(working) < 20) {
          fees['USD-USDT'] = working;
          fees['USDT-USD'] = fees['USDT-USD'] ?? working;
        } else if (working > 0) {
          setPairRate(pairRates, pair.give, pair.get, working);
        }
      }
      continue;
    }

    const working = i ?? h;
    if (h != null && h !== 0 && h > 0) pairDisplay[pair.key] = h;
    if (working != null && working > 0) setPairRate(pairRates, pair.give, pair.get, working);
  }

  deriveMissingPairRates(pairRates);
  delete pairRates['USDT-USD'];
  delete pairRates['USD-USDT'];
  const rates = buildRatesFromPairs(pairRates);
  recordPairDisplay(pairDisplay);
  const pairHistory = getPairHistoryMap();
  const marketData = buildMarketData(pairDisplay);

  const payload = {
    rates,
    pairRates,
    pairDisplay,
    pairHistory,
    fees,
    marketData,
    source: 'google-sheets',
    updatedAt: new Date().toISOString(),
    _cacheVersion: RATES_CACHE_VERSION,
  };
  ratesCache = payload;
  ratesCacheAt = now;
  return payload;
}

module.exports = {
  fetchExchangeRatesFromSheet,
  DEFAULT_RATES,
  DEFAULT_FEES,
  RATE_SHEET_ROWS,
};

import { HOME_MARKET_PAIRS } from './homeMarketPairs';

/** USDT↔USD: в Excel часто спред %, может быть отрицательным */
export function isUsdtUsdSpreadPair(give, get) {
  return (give === 'USDT' && get === 'USD') || (give === 'USD' && get === 'USDT');
}

export function isUsdtFiatSpreadPair(give, get) {
  return (
    (give === 'USDT' && (get === 'USD' || get === 'EUR')) ||
    ((give === 'USD' || give === 'EUR') && get === 'USDT')
  );
}

export function isSpreadPercentRate(rate, give, get) {
  return (
    (isUsdtUsdSpreadPair(give, get) || isUsdtFiatSpreadPair(give, get)) &&
    rate != null &&
    Number.isFinite(rate) &&
    Math.abs(rate) < 20
  );
}

export function isAllowedHomeDisplayRate(rate, give, get) {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return false;
  if (isSpreadPercentRate(rate, give, get)) return true;
  return rate > 0;
}

/** Формат цены на главной — как в Excel (колонка H) */
export function formatDisplayPrice(rate, give, get) {
  if (isSpreadPercentRate(rate, give, get)) {
    const body = Math.abs(rate).toFixed(2).replace('.', ',');
    return rate < 0 ? `-${body}%` : `${body}%`;
  }
  const abs = Math.abs(rate);
  const sign = rate < 0 ? '-' : '';
  if (abs >= 100) return sign + String(Math.round(abs));
  if (abs >= 1) return sign + abs.toFixed(2).replace('.', ',');
  if (abs > 0) return sign + abs.toFixed(2).replace('.', ',');
  return String(rate).replace('.', ',');
}

export function pairTargetLabel(get) {
  return get === 'ARS_CARD' ? 'ARS (Card)' : get;
}

export const HOME_MARKET_SKELETON = HOME_MARKET_PAIRS.map(([code, target]) => ({
  code,
  target: pairTargetLabel(target),
}));

const FLAGS = {
  USDT: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
  USD: 'https://hatscripts.github.io/circle-flags/flags/us.svg',
  EUR: 'https://hatscripts.github.io/circle-flags/flags/eu.svg',
  RUB: 'https://hatscripts.github.io/circle-flags/flags/ru.svg',
  ARS: 'https://hatscripts.github.io/circle-flags/flags/ar.svg',
  ARS_CARD: 'https://hatscripts.github.io/circle-flags/flags/ar.svg',
};

export function parseDisplayPrice(str) {
  if (str == null || str === '') return null;
  let s = String(str).trim().replace('%', '').replace(/\s/g, '').replace(/\u2212/g, '-');
  if (s.startsWith('(') && s.endsWith(')')) s = `-${s.slice(1, -1)}`;
  s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** pairDisplay с сервера (H) + добор из marketData, без пересчётов */
export function hydratePairDisplayFromApi(apiData = {}) {
  const pd = { ...(apiData.pairDisplay || {}) };
  for (const item of apiData.marketData || []) {
    const get =
      item.target === 'ARS (Card)' ? 'ARS_CARD' : String(item.target || '').trim();
    const key = `${item.code}-${get}`;
    if (pd[key] != null && pd[key] !== 0) continue;
    const n = parseDisplayPrice(item.price);
    if (n == null || n === 0) continue;
    if (!isAllowedHomeDisplayRate(n, item.code, get)) continue;
    pd[key] = n;
  }
  return pd;
}

export function buildMarketDataFromSheet(pairDisplay = {}) {
  const items = [];
  for (const [give, get] of HOME_MARKET_PAIRS) {
    const key = `${give}-${get}`;
    const rate = pairDisplay[key];
    if (!isAllowedHomeDisplayRate(rate, give, get)) continue;
    items.push({
      code: give,
      target: pairTargetLabel(get),
      price: formatDisplayPrice(rate, give, get),
      change: 0,
      history: Array(24).fill(rate),
      flag: FLAGS[give] || FLAGS.USDT,
    });
  }
  return items;
}

/** Всегда 15 пар из pairDisplay (колонка H). Не подставлять урезанный marketData с 6 пар. */
export function buildHomeMarketData(apiData = {}) {
  const pairDisplay = hydratePairDisplayFromApi(apiData);
  const built = buildMarketDataFromSheet(pairDisplay);
  if (built.length > 0) return built;
  return [];
}

/** Спред USDT↔USD: % с главной (H), не рабочее I (−2.5 и т.п.) */
export function getSpreadFeePercent(give, get, exchangeFees = {}, pairDisplay = {}) {
  const key = `${give}-${get}`;
  const inv = `${get}-${give}`;
  if (!isUsdtUsdSpreadPair(give, get)) {
    const fee = exchangeFees[key];
    if (fee != null && Number.isFinite(fee)) return Math.abs(fee) < 20 ? fee : fee;
    return null;
  }
  const disp = pairDisplay[key] ?? pairDisplay[inv];
  if (disp != null && Number.isFinite(disp) && Math.abs(disp) < 20) return disp;
  const fee = exchangeFees[key] ?? exchangeFees[inv];
  if (fee != null && Number.isFinite(fee) && Math.abs(fee) < 20) return fee;
  return null;
}

export function buildCalcFees(fees = {}, pairDisplay = {}) {
  const out = { ...fees };
  const disp = pairDisplay['USDT-USD'] ?? pairDisplay['USD-USDT'];
  if (disp != null && Number.isFinite(disp) && Math.abs(disp) < 20) {
    out['USDT-USD'] = disp;
    out['USD-USDT'] = disp;
  }
  return out;
}

/** В Excel: 79 = ₽ за 1 USD/USDT/EUR → сумма в ₽ делим на курс */
export function isRubPerForeignRatePair(give, get) {
  return give === 'RUB' && ['USD', 'USDT', 'EUR'].includes(get);
}

export function isForeignToRubRatePair(give, get) {
  return ['USD', 'USDT', 'EUR'].includes(give) && get === 'RUB';
}

/** В Excel: 1600 = ₽$ за 1 USDT/USD/EUR → ARS делим на курс */
export function isArsPerForeignRatePair(give, get) {
  return (give === 'ARS' || give === 'ARS_CARD') && ['USD', 'USDT', 'EUR'].includes(get);
}

export function isForeignToArsRatePair(give, get) {
  return ['USD', 'USDT', 'EUR'].includes(give) && (get === 'ARS' || get === 'ARS_CARD');
}

/** USDT/USD/EUR → ARS (карта): нижнее поле песо редактируется вручную */
export function isForeignToArsCardPair(give, get) {
  return ['USD', 'USDT', 'EUR'].includes(give) && get === 'ARS_CARD';
}

/** USDT/USD/EUR → ARS (наличные): нижнее поле песо редактируется вручную */
export function isForeignToArsCashPair(give, get) {
  return ['USD', 'USDT', 'EUR'].includes(give) && get === 'ARS';
}

/** В pairRates иногда лежит 1/1600 — приводим к «ARS за 1 USD/USDT/EUR» */
export function normalizeArsPerForeignRate(raw) {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  if (raw < 50) return 1 / raw;
  return raw;
}

function readSheetRateH(key, pairDisplay, pairRates, displayOnly) {
  const fromH = normalizeArsPerForeignRate(pairDisplay[key]);
  if (fromH) return fromH;
  if (displayOnly) return null;
  return normalizeArsPerForeignRate(pairRates[key]);
}

/**
 * ARS → USDT/USD/EUR: только своя строка Rates (H17 ARS/USDT, H18 ARS/USD, H19 ARS/EUR).
 * Ключ ARS-USDT, ARS-USD, ARS-EUR — не USDT-ARS / USD-ARS.
 */
export function getArsToForeignRate(give, get, pairRates = {}, pairDisplay = {}) {
  if (!isArsPerForeignRatePair(give, get)) return null;
  const key = `${give}-${get}`;
  return (
    readSheetRateH(key, pairDisplay, pairRates, true) ??
    readSheetRateH(key, pairDisplay, pairRates, false)
  );
}

/**
 * USDT/USD/EUR → ARS: своя строка (H4 USDT/ARS, H3 USD/ARS, H6 EUR/ARS и т.д.).
 */
export function getForeignToArsRate(give, get, pairRates = {}, pairDisplay = {}) {
  if (!isForeignToArsRatePair(give, get)) return null;
  const key = `${give}-${get}`;
  return (
    readSheetRateH(key, pairDisplay, pairRates, true) ??
    readSheetRateH(key, pairDisplay, pairRates, false)
  );
}

/** @deprecated Используйте getArsToForeignRate / getForeignToArsRate */
export function getArsPerForeignRate(give, get, pairRates = {}, pairDisplay = {}) {
  if (isArsPerForeignRatePair(give, get)) {
    return getArsToForeignRate(give, get, pairRates, pairDisplay);
  }
  if (isForeignToArsRatePair(give, get)) {
    return getForeignToArsRate(give, get, pairRates, pairDisplay);
  }
  return null;
}

/** Мин. выдача наличных USD/EUR/USDT в «Получаете» */
export const MIN_FOREIGN_GET_ARS_PAIRS = 100;

/** Мин. ARS в «Отдаёте» = курс из H17/H18/H19 × 100 */
export function minArsGiveForForeignReceive(give, get, pairRates = {}, pairDisplay = {}) {
  const rate = getArsToForeignRate(give, get, pairRates, pairDisplay);
  if (rate == null) return null;
  return Math.ceil(MIN_FOREIGN_GET_ARS_PAIRS * rate);
}

/** Выдача наличных USD/EUR кратно 10, без 10/30/90 в конце (вниз) */
export function issueUsdCashFromExact(exactRes) {
  if (!exactRes || exactRes < 100) return 0;
  let n = Math.floor(exactRes / 10) * 10;
  while (n >= 100) {
    if (![10, 30, 90].includes(n % 100)) return n;
    n -= 10;
  }
  return 0;
}

/** USDT→USD/EUR: платите USDT за нал — спред через деление */
export function isSpreadPayUsdtMode(give, get) {
  return give === 'USDT' && (get === 'USD' || get === 'EUR');
}

/** USD/EUR→USDT: отдаёте нал, получаете USDT — спред через умножение */
export function isSpreadReceiveUsdtMode(give, get) {
  return (give === 'USD' || give === 'EUR') && get === 'USDT';
}

/**
 * Номинал USD (500 в любом поле → USD 500).
 * payUsdt (USDT→USD): +% → меньше USDT (÷), −% → больше USDT.
 * receiveUsdt (USD→USDT): −% → меньше USDT (×), +% → больше USDT.
 */
export function calcUsdtFiatSpreadPair(usdNominal, feePercent, mode = 'payUsdt') {
  const f = Number(feePercent);
  const fee = Number.isFinite(f) ? f : 0;
  const usd = usdNominal >= 100 ? issueUsdCashNearestValid(usdNominal) || usdNominal : 0;
  if (fee === 0) {
    const v = Math.floor(usdNominal * 100) / 100;
    return { usdt: v, usd: usd || 0 };
  }
  const usdt =
    mode === 'receiveUsdt'
      ? Math.round(usdNominal * (1 + fee / 100) * 100) / 100
      : Math.round((usdNominal / (1 + fee / 100)) * 100) / 100;
  return { usdt, usd: usd || 0 };
}

/** USDT→USD: ближайшая допустимая купюра (498,75 → 500, не 480) */
export function issueUsdCashNearestValid(exactRes) {
  if (!exactRes || exactRes < 100) return 0;
  let n = Math.round(exactRes / 10) * 10;
  if (n < 100) n = 100;
  if ([10, 30, 90].includes(n % 100)) n += 10;
  return n;
}

export function usdToArsAmount(usd, exchangeRates = {}, pairRates = {}, pairDisplay = {}) {
  const rate =
    getForeignToArsRate('USD', 'ARS', pairRates, pairDisplay) ??
    (exchangeRates.ARS?.rate && exchangeRates.USD?.rate
      ? exchangeRates.ARS.rate / exchangeRates.USD.rate
      : null);
  if (!rate || rate <= 0) return 0;
  return Math.floor(usd * rate);
}

export function sanitizeSpreadPairRates(pairRates = {}) {
  const out = { ...pairRates };
  for (const key of ['USDT-USD', 'USD-USDT', 'USDT-EUR', 'EUR-USDT']) {
    delete out[key];
  }
  return out;
}

/** ARS_CARD и смежные пары, если в таблице только USDT-ARS / USD-ARS */
function deriveMissingPairRates(pairRates) {
  const usdtArs = pairRates['USDT-ARS'];
  const usdArs = pairRates['USD-ARS'];
  const rubArs = pairRates['RUB-ARS'];
  const eurArs = pairRates['EUR-ARS'];
  const setArsForeign = (foreign, arsGet, rate) => {
    if (!rate || rate <= 0) return;
    pairRates[`${foreign}-${arsGet}`] = rate;
  };
  if (usdtArs && !pairRates['USDT-ARS_CARD']) {
    setArsForeign('USDT', 'ARS_CARD', usdtArs * (1400 / 1425));
  }
  if (usdArs && !pairRates['USD-ARS_CARD']) {
    setArsForeign('USD', 'ARS_CARD', usdArs * (1400 / 1425));
  }
  if (rubArs && !pairRates['RUB-ARS_CARD']) {
    setArsForeign('RUB', 'ARS_CARD', rubArs * (1400 / 1425));
  }
  if (eurArs && !pairRates['EUR-ARS_CARD']) {
    setArsForeign('EUR', 'ARS_CARD', eurArs * (1400 / 1425));
  }
}

/** Курсы для калькулятора: как на главной (H), иначе рабочий из I */
export function buildCalcPairRates(pairRates = {}, pairDisplay = {}) {
  const out = sanitizeSpreadPairRates(pairRates);
  for (const [give, get] of HOME_MARKET_PAIRS) {
    if (isUsdtUsdSpreadPair(give, get) || isUsdtFiatSpreadPair(give, get)) continue;
    const key = `${give}-${get}`;
    const h = pairDisplay[key];
    if (!isAllowedHomeDisplayRate(h, give, get)) continue;
    if (!isSpreadPercentRate(h, give, get) && !(h > 0)) continue;
    if (isArsPerForeignRatePair(give, get) || isForeignToArsRatePair(give, get)) {
      out[key] = h;
      continue;
    }
    out[key] = h;
    out[`${get}-${give}`] = 1 / h;
  }
  deriveMissingPairRates(out);
  return out;
}

/** exchangeRates.ARS и др. из загруженных пар (после buildCalcPairRates) */
export function buildExchangeRatesFromPairRates(pairRates, baseRates = {}) {
  const rates = {};
  for (const [code, meta] of Object.entries(baseRates)) {
    rates[code] = { ...meta };
  }
  const ars =
    pairRates['USDT-ARS'] ||
    pairRates['USD-ARS'] ||
    rates.ARS?.rate ||
    1420;

  rates.ARS = { ...(rates.ARS || {}), rate: ars };
  rates.ARS_CARD = {
    ...(rates.ARS_CARD || {}),
    rate:
      pairRates['USDT-ARS_CARD'] ||
      pairRates['USD-ARS_CARD'] ||
      ars * (1400 / 1425),
  };

  if (pairRates['USD-ARS'] > 0) {
    rates.USD = { ...(rates.USD || {}), rate: ars / pairRates['USD-ARS'] };
  }
  if (pairRates['EUR-ARS'] > 0) {
    rates.EUR = { ...(rates.EUR || {}), rate: ars / pairRates['EUR-ARS'] };
  }
  if (pairRates['RUB-ARS'] > 0) {
    rates.RUB = { ...(rates.RUB || {}), rate: ars / pairRates['RUB-ARS'] };
  }

  return rates;
}

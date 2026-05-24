/**
 * Порядок пар на главной (колонка G, вкладка Rates).
 * Строки 3–7, 10–19.
 */
const HOME_MARKET_PAIRS = [
  ['USDT', 'ARS'],       // 4
  ['USDT', 'ARS_CARD'],  // 10
  ['USD', 'ARS'],        // 3
  ['EUR', 'ARS'],        // 6
  ['RUB', 'ARS'],        // 5
  ['USDT', 'USD'],       // 7 — спред %
  ['RUB', 'ARS_CARD'],   // 11
  ['EUR', 'ARS_CARD'],   // 12
  ['USD', 'ARS_CARD'],   // 13
  ['USD', 'USDT'],       // 14
  ['RUB', 'USD'],        // 15
  ['RUB', 'USDT'],       // 16
  ['ARS', 'USDT'],       // 17
  ['ARS', 'USD'],        // 18
  ['ARS', 'EUR'],        // 19
];

module.exports = { HOME_MARKET_PAIRS };

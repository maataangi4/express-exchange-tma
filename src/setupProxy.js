const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

function loadRatesEnv() {
  const envLocal = path.resolve(__dirname, '../.env.development.local');
  require('dotenv').config({ path: envLocal });
}

/** Курсы всегда из актуального server/exchangeRates.js (не из старого процесса :3001) */
async function handleRates(req, res) {
  try {
    loadRatesEnv();
    const ratesModule = path.resolve(__dirname, '../server/exchangeRates.js');
    delete require.cache[require.resolve(ratesModule)];
    const { fetchExchangeRatesFromSheet } = require(ratesModule);
    const data = await fetchExchangeRatesFromSheet();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      ok: true,
      ratesVersion: 5,
      ...data,
    });
  } catch (e) {
    console.error('[dev] GET /api/rates:', e.message || e);
    res.status(500).json({ ok: false, error: e.message || 'Rates error' });
  }
}

module.exports = function setupProxy(app) {
  app.get('/api/rates', handleRates);

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathFilter: (pathname) => pathname !== '/rates',
    })
  );

  app.use(
    '/health',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
    })
  );
};

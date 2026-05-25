const http = require('http');
const walletStore = require('./walletStore');
const { resolveTelegramUser, getStartParamFromInitData } = require('./telegramAuth');
const { submitOrder } = require('./orderSubmit');
const { fetchExchangeRatesFromSheet } = require('./exchangeRates');
const { registerAppUserInBase, isConfigured: isSheetsConfigured } = require('./googleSheets');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 12e6) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
};

function sendJson(res, status, data) {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(data));
}

function getInitDataFromRequest(req, body) {
  const header = req.headers['x-telegram-init-data'];
  if (header) return String(header);
  if (body?.initData) return String(body.initData);
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const q = url.searchParams.get('initData');
    if (q) return q;
  } catch {
    /* ignore */
  }
  return '';
}

function requestPath(req) {
  const raw = req.url || '/';
  try {
    return new URL(raw, 'http://127.0.0.1').pathname;
  } catch {
    return raw.split('?')[0];
  }
}

/**
 * @param {object} opts
 * @param {number} opts.port
 * @param {string} opts.ordersBotToken
 * @param {string} opts.ordersAdminChatId
 * @param {string} opts.exexchangeBotToken
 * @param {string} opts.miniAppBotToken — токен бота Mini App для проверки initData
 * @param {boolean} opts.allowDevWallet — без initData: telegramUserId из query/body (только dev)
 */
function createHttpServer(opts) {
  const {
    port,
    ordersBotToken,
    ordersAdminChatId,
    exexchangeBotToken,
    miniAppBotToken = exexchangeBotToken,
    allowDevWallet = false,
  } = opts;
  const botTokensForAuth = [miniAppBotToken, ordersBotToken, exexchangeBotToken].filter(
    Boolean
  );
  return http.createServer(async (req, res) => {
    const path = requestPath(req);

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (path === '/health' || (path === '/' && req.method === 'GET')) {
      sendJson(res, 200, { ok: true, service: 'exexchange-server' });
      return;
    }

    async function handleUserOpen(req, res, body, queryLanguage) {
      const initData = getInitDataFromRequest(req, body);
      const devBody = {
        telegramUserId: body?.telegramUserId,
        telegramUser: body?.telegramUser,
      };
      try {
        const url = new URL(req.url || '/', 'http://127.0.0.1');
        if (url.searchParams.get('telegramUserId')) {
          devBody.telegramUserId = url.searchParams.get('telegramUserId');
        }
      } catch {
        /* ignore */
      }

      const resolved = resolveTelegramUser({
        initData,
        botTokens: botTokensForAuth,
        body: { ...body, ...devBody },
        allowDevId: allowDevWallet,
      });
      if (!resolved) {
        sendJson(res, 401, {
          ok: false,
          error: 'Unauthorized: invalid or missing Telegram initData',
        });
        return;
      }

      const language =
        body?.language || queryLanguage || devBody.language || 'ru';

      const startParam =
        body?.startParam ||
        body?.referralCode ||
        getStartParamFromInitData(initData);
      let referral = null;
      if (startParam && String(startParam).toLowerCase().startsWith('ref_')) {
        referral = walletStore.registerReferral(resolved.user.id, startParam);
        if (referral.ok) {
          console.log(`👥 user/open реферал: ${resolved.user.id} ← ${startParam}`);
        }
      }

      if (language) {
        walletStore.updateSettings(resolved.user.id, { language });
      }

      const wallet = walletStore.getWallet(resolved.user.id);

      let baseRegistered = false;
      let baseSkipped = false;
      let baseError = null;
      if (isSheetsConfigured()) {
        try {
          const baseResult = await registerAppUserInBase(resolved.user, {
            language,
            bonuses: wallet.bonuses,
          });
          baseRegistered = Boolean(baseResult.registered);
          baseSkipped = Boolean(baseResult.skipped);
        } catch (baseErr) {
          baseError = baseErr.message || String(baseErr);
          console.error('registerAppUserInBase:', baseError);
        }
      } else {
        baseError = 'google_sheets_not_configured';
      }

      console.log(
        `👤 user/open ${resolved.user.id} (@${resolved.user.username || '—'}) base=${baseRegistered ? 'new' : baseSkipped ? 'skip' : 'no'}${baseError ? ` err=${baseError}` : ''}`
      );

      sendJson(res, 200, {
        ok: true,
        ...wallet,
        referral: referral
          ? { ok: referral.ok, reason: referral.reason, referrerBonus: referral.referrerBonus }
          : null,
        baseRegistered,
        baseSkipped,
        baseError,
      });
    }

    if (path === '/api/user/open' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        await handleUserOpen(req, res, body, null);
      } catch (e) {
        console.error('POST /api/user/open:', e.message || e);
        sendJson(res, 500, { ok: false, error: e.message || 'Server error' });
      }
      return;
    }

    async function handleUserSettings(req, res, body) {
      const initData = getInitDataFromRequest(req, body);
      const resolved = resolveTelegramUser({
        initData,
        botTokens: botTokensForAuth,
        body,
        allowDevId: allowDevWallet,
      });
      if (!resolved) {
        sendJson(res, 401, { ok: false, error: 'Unauthorized' });
        return;
      }
      const updated = walletStore.updateSettings(resolved.user.id, {
        theme: body?.theme,
        themeCustomized: body?.themeCustomized,
        language: body?.language,
        botNotifications: body?.botNotifications,
        cashbackCard: body?.cashbackCard,
      });
      sendJson(res, 200, { ok: true, ...updated });
    }

    async function handleUserHistory(req, res, body) {
      const initData = getInitDataFromRequest(req, body);
      const resolved = resolveTelegramUser({
        initData,
        botTokens: botTokensForAuth,
        body,
        allowDevId: allowDevWallet,
      });
      if (!resolved) {
        sendJson(res, 401, { ok: false, error: 'Unauthorized' });
        return;
      }
      const item = body?.historyItem || body?.item;
      const result = walletStore.appendOrderHistory(resolved.user.id, item);
      if (!result.ok) {
        sendJson(res, 400, { ok: false, error: result.error || 'invalid_item' });
        return;
      }
      sendJson(res, 200, { ok: true, orderHistory: result.orderHistory });
    }

    if (path === '/api/user/settings' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        await handleUserSettings(req, res, body);
      } catch (e) {
        console.error('POST /api/user/settings:', e.message || e);
        sendJson(res, 500, { ok: false, error: e.message || 'Server error' });
      }
      return;
    }

    if (path === '/api/user/history' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        await handleUserHistory(req, res, body);
      } catch (e) {
        console.error('POST /api/user/history:', e.message || e);
        sendJson(res, 500, { ok: false, error: e.message || 'Server error' });
      }
      return;
    }

    if (path === '/api/wallet' && req.method === 'GET') {
      try {
        let queryLanguage = 'ru';
        try {
          const url = new URL(req.url || '/', 'http://127.0.0.1');
          queryLanguage = url.searchParams.get('language') || queryLanguage;
        } catch {
          /* ignore */
        }
        await handleUserOpen(req, res, null, queryLanguage);
      } catch (e) {
        console.error('GET /api/wallet:', e.message || e);
        sendJson(res, 500, { ok: false, error: e.message || 'Wallet error' });
      }
      return;
    }

    if (path === '/api/rates' && req.method === 'GET') {
      try {
        const data = await fetchExchangeRatesFromSheet();
        sendJson(res, 200, { ok: true, ...data });
      } catch (e) {
        console.error('GET /api/rates:', e.message || e);
        sendJson(res, 500, { ok: false, error: e.message || 'Rates error' });
      }
      return;
    }

    if (path === '/api/orders' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const initData = getInitDataFromRequest(req, body);
        const resolved = resolveTelegramUser({
          initData,
          botTokens: botTokensForAuth,
          body,
          allowDevId: allowDevWallet,
        });
        if (!resolved) {
          sendJson(res, 401, { ok: false, error: 'Unauthorized: invalid or missing Telegram initData' });
          return;
        }

        const telegramUser = { ...body.telegramUser, ...resolved.user };
        const result = await submitOrder({
          body: { ...body, source: body.source || 'TMA Express Exchange' },
          telegramUser,
          ordersBotToken,
          ordersAdminChatId,
          clientBotToken: exexchangeBotToken,
        });

        if (!result.ok) {
          if (result.error === 'insufficient_bonuses') {
            sendJson(res, 400, {
              ok: false,
              error: result.error,
              bonuses: result.bonuses ?? 0,
            });
            return;
          }
          sendJson(res, 500, { ok: false, error: result.error || 'submit_failed' });
          return;
        }

        sendJson(res, 200, { ok: true, orderId: result.orderId, wallet: result.wallet });
      } catch (e) {
        console.error('POST /api/orders:', e.message || e);
        sendJson(res, 500, { ok: false, error: e.message || 'Server error' });
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  }).listen(port, () => {
    console.log(
      `   HTTP :${port} (/api/user/open, /api/user/settings, /api/user/history, /api/wallet, /api/orders, /api/rates, /health)`
    );
  });
}

module.exports = { createHttpServer };

const http = require('http');
const ordersStore = require('./ordersStore');
const walletStore = require('./walletStore');
const { resolveTelegramUser, getStartParamFromInitData } = require('./telegramAuth');
const {
  buildAdminOrderMessage,
  buildAdminServiceOrderMessage,
  buildClientOrderNotifyText,
  buildClientServiceOrderNotifyText,
} = require('./orderNotifications');
const { createTelegramApi } = require('./ordersBot');
const { sendTelegramDocument } = require('./telegramMedia');
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
  const tgOrders = ordersBotToken ? createTelegramApi(ordersBotToken) : null;
  const tgClient = exexchangeBotToken ? createTelegramApi(exexchangeBotToken) : null;

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

        const isService =
          body.orderKind === 'service' ||
          body.type === 'service' ||
          String(body.orderId || '').startsWith('SRV-');
        const orderId =
          body.orderId ||
          (isService
            ? `SRV-${Date.now().toString().slice(-6)}`
            : `ORD-${Date.now().toString().slice(-6)}`);

        const telegramUser = { ...body.telegramUser, ...resolved.user };
        const telegramUserId = telegramUser.id;
        const bonusesUsed = isService ? 0 : Math.max(0, Math.floor(Number(body.bonusesUsed) || 0));
        const cashbackEarned = isService
          ? 0
          : Math.max(0, Math.floor(Number(body.cashbackEarned) || 0));

        if (bonusesUsed > 0) {
          const deduct = walletStore.deductBonuses(telegramUserId, bonusesUsed);
          if (!deduct.ok) {
            sendJson(res, 400, {
              ok: false,
              error: 'insufficient_bonuses',
              bonuses: deduct.bonuses ?? 0,
            });
            return;
          }
        }
        const clientName =
          body.clientName ||
          [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
          'Гость';
        const clientTelegram = telegramUser.username
          ? `(@${telegramUser.username})`
          : body.client || '';

        const serviceDetails = body.serviceDetails || body.details || null;

        const order = {
          ...body,
          orderId,
          orderKind: isService ? 'service' : 'exchange',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          clientName,
          clientTelegram,
          telegramUserId,
          bonusesUsed,
          cashbackEarned,
          bonusesDeducted: bonusesUsed > 0,
          source: 'TMA Express Exchange',
          serviceDetails: isService ? serviceDetails : undefined,
          deliveryDate: body.deliveryDate || body.date || null,
          deliveryTime: body.deliveryTime || body.time || null,
          deliveryMethod: body.deliveryMethod || body.method,
          deliveryCost:
            body.deliveryCost ||
            (body.deliveryFee === 0 ? '0 USDT' : `${body.deliveryFee ?? 3.5} USDT`),
        };

        ordersStore.upsert(orderId, order);

        if (tgOrders && ordersAdminChatId) {
          const text = isService
            ? buildAdminServiceOrderMessage(order)
            : buildAdminOrderMessage(order);
          const sent = await tgOrders('sendMessage', {
            chat_id: ordersAdminChatId,
            text,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Approve', callback_data: `approve_${orderId}` }],
                [{ text: '❌ Cancel', callback_data: `reject_${orderId}` }],
              ],
            },
          });
          if (!sent.ok) {
            console.error('❌ Failed to notify admin:', sent.description || sent);
          } else {
            console.log(`📨 Order ${orderId} → Telegram admin ${ordersAdminChatId}`);
            const rf = body.receiptFile;
            if (rf?.dataBase64 && ordersBotToken) {
              try {
                const buf = Buffer.from(String(rf.dataBase64), 'base64');
                const doc = await sendTelegramDocument(ordersBotToken, {
                  chatId: ordersAdminChatId,
                  buffer: buf,
                  filename: rf.name || 'receipt.jpg',
                  mimeType: rf.mimeType || 'image/jpeg',
                  caption: `📎 Receipt — <b>#${orderId}</b>`,
                });
                if (doc.ok) {
                  console.log(`📎 Receipt file sent for ${orderId}`);
                }
              } catch (docErr) {
                console.error(`Receipt upload ${orderId}:`, docErr.message || docErr);
              }
            }
          }
        } else {
          console.warn('⚠️ ORDERS_BOT_TOKEN или ORDERS_ADMIN_CHAT_ID не заданы');
        }

        if (body.historyItem && telegramUserId) {
          walletStore.appendOrderHistory(telegramUserId, body.historyItem);
        } else if (telegramUserId && isService && serviceDetails) {
          walletStore.appendOrderHistory(telegramUserId, {
            id: orderId,
            type: 'service',
            status: 'pending',
            timestamp: new Date().toISOString(),
            details: serviceDetails,
          });
        } else if (telegramUserId) {
          walletStore.appendOrderHistory(telegramUserId, {
            id: orderId,
            type: 'exchange',
            status: 'pending',
            timestamp: new Date().toISOString(),
            items: (order.deals || []).map((d) => ({
              give: d.giveCurrency || d.give,
              giveAmount: d.giveAmount,
              get: d.getCurrency || d.get,
              getAmount: d.getAmount,
            })),
            delivery: {
              method: order.deliveryMethod,
              address: order.address,
              date: order.deliveryDate,
              time: order.deliveryTime,
            },
          });
        }

        if (tgClient && order.telegramUserId && walletStore.shouldSendBotNotifications(order.telegramUserId)) {
          console.log(`📨 Уведомление клиенту ${order.telegramUserId} (${orderId})`);
          const customerText = isService
            ? buildClientServiceOrderNotifyText(order.language || body.language || 'ru', order)
            : buildClientOrderNotifyText(order.language || body.language || 'ru', {
                orderId,
                deals: (order.deals || []).map((d) => ({
                  give: d.giveCurrency || d.give,
                  giveAmount: d.giveAmount,
                  get: d.getCurrency || d.get,
                  getAmount: d.getAmount,
                })),
                deliveryMethod: order.deliveryMethod,
                address: order.address,
                date: order.deliveryDate,
                time: order.deliveryTime,
                cardAccount: order.cardAccount,
              });
          await tgClient('sendMessage', {
            chat_id: order.telegramUserId,
            text: customerText,
            parse_mode: 'HTML',
          });
        } else if (tgClient && order.telegramUserId) {
          console.log(`📨 Клиенту ${order.telegramUserId}: уведомления выключены (${orderId})`);
        }

        const wallet = walletStore.getWallet(telegramUserId);
        sendJson(res, 200, { ok: true, orderId, wallet });
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

/**
 * Shared order submission: store, admin bot, client notify, wallet history.
 */
const ordersStore = require('./ordersStore');
const walletStore = require('./walletStore');
const {
  buildAdminOrderMessage,
  buildAdminServiceOrderMessage,
  buildClientOrderNotifyText,
  buildClientServiceOrderNotifyText,
} = require('./orderNotifications');
const { createTelegramApi } = require('./ordersBot');
const { sendTelegramDocument } = require('./telegramMedia');

const OFFICE_ADDRESS = 'Av. Los Incas 3390, Buenos Aires (office pickup)';

/**
 * @param {object} params
 * @param {object} params.body — order fields (deals, delivery, etc.)
 * @param {object} params.telegramUser — { id, first_name, last_name, username }
 * @param {string} [params.ordersBotToken]
 * @param {string} [params.ordersAdminChatId]
 * @param {string} [params.clientBotToken] — @exexchange_bot for client notifications
 */
async function submitOrder(params) {
  const {
    body,
    telegramUser,
    ordersBotToken,
    ordersAdminChatId,
    clientBotToken,
  } = params;

  const tgOrders = ordersBotToken ? createTelegramApi(ordersBotToken) : null;
  const tgClient = clientBotToken ? createTelegramApi(clientBotToken) : null;

  const isService =
    body.orderKind === 'service' ||
    body.type === 'service' ||
    String(body.orderId || '').startsWith('SRV-');

  const orderId =
    body.orderId ||
    (isService ? `SRV-${Date.now().toString().slice(-6)}` : `ORD-${Date.now().toString().slice(-6)}`);

  const telegramUserId = telegramUser?.id;
  if (!telegramUserId) {
    return { ok: false, error: 'missing_telegram_user' };
  }

  const bonusesUsed = isService ? 0 : Math.max(0, Math.floor(Number(body.bonusesUsed) || 0));
  const cashbackEarned = isService
    ? 0
    : Math.max(0, Math.floor(Number(body.cashbackEarned) || 0));

  if (bonusesUsed > 0) {
    const deduct = walletStore.deductBonuses(telegramUserId, bonusesUsed);
    if (!deduct.ok) {
      return { ok: false, error: 'insufficient_bonuses', bonuses: deduct.bonuses ?? 0 };
    }
  }

  const clientName =
    body.clientName ||
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
    'Guest';
  const clientTelegram = telegramUser.username ? `(@${telegramUser.username})` : body.client || '';

  const serviceDetails = body.serviceDetails || body.details || null;
  const lang = body.language || 'ru';

  const order = {
    ...body,
    orderId,
    orderKind: isService ? 'service' : 'exchange',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    clientName,
    clientTelegram,
    telegramUserId,
    language: lang,
    bonusesUsed,
    cashbackEarned,
    bonusesDeducted: bonusesUsed > 0,
    source: body.source || 'Express Exchange',
    serviceDetails: isService ? serviceDetails : undefined,
    deliveryDate: body.deliveryDate || body.date || null,
    deliveryTime: body.deliveryTime || body.time || 'Flexible',
    deliveryMethod: body.deliveryMethod || body.method || 'pickup',
    deliveryCost:
      body.deliveryCost ||
      (body.deliveryFee === 0 ? '0 USDT' : `${body.deliveryFee ?? 3.5} USDT`),
    address: body.address || (body.deliveryMethod === 'pickup' ? OFFICE_ADDRESS : '—'),
    paymentMethod: body.paymentMethod || body.giveCurrency || 'USDT',
  };

  ordersStore.upsert(orderId, order);

  if (tgOrders && ordersAdminChatId) {
    const text = isService ? buildAdminServiceOrderMessage(order) : buildAdminOrderMessage(order);
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
      console.error('❌ Admin notify failed:', sent.description || sent);
    } else {
      console.log(`📨 Order ${orderId} → admin (source: ${order.source})`);
      const rf = body.receiptFile;
      if (rf?.dataBase64 && ordersBotToken) {
        try {
          const buf = Buffer.from(String(rf.dataBase64), 'base64');
          await sendTelegramDocument(ordersBotToken, {
            chatId: ordersAdminChatId,
            buffer: buf,
            filename: rf.name || 'receipt.jpg',
            mimeType: rf.mimeType || 'image/jpeg',
            caption: `📎 Receipt — <b>#${orderId}</b>`,
          });
        } catch (docErr) {
          console.error(`Receipt upload ${orderId}:`, docErr.message || docErr);
        }
      }
    }
  }

  if (telegramUserId && body.historyItem) {
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

  if (tgClient && walletStore.shouldSendBotNotifications(telegramUserId)) {
    const customerText = isService
      ? buildClientServiceOrderNotifyText(lang, order)
      : buildClientOrderNotifyText(lang, {
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
      chat_id: telegramUserId,
      text: customerText,
      parse_mode: 'HTML',
    });
  }

  const wallet = walletStore.getWallet(telegramUserId);
  return { ok: true, orderId, order, wallet };
}

module.exports = { submitOrder, OFFICE_ADDRESS };

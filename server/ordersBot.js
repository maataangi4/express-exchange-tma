const ordersStore = require('./ordersStore');
const walletStore = require('./walletStore'); // notifications gate + wallet
const { appendApprovedOrder, isConfigured } = require('./googleSheets');
const {
  buildClientOrderConfirmedText,
  buildClientPaymentDetailsText,
  buildClientCashbackCreditedText,
  buildClientCashbackRevokedText,
  buildClientOrderRejectedText,
  buildClientOrderRevokedText,
  buildClientOrderDeliveredText,
  buildClientServiceOrderDeliveredText,
  buildClientServiceOrderConfirmedText,
  buildClientReferralReferredText,
  buildClientReferralReferrerText,
} = require('./orderNotifications');
const { parseOrderFromAdminMessage } = require('./parseOrderMessage');
const shipday = require('./shipday');

function createTelegramApi(token) {
  const base = `https://api.telegram.org/bot${token}`;
  return async function tg(method, body) {
    const res = await fetch(`${base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) console.error('Orders bot TG:', method, data.description || data);
    return data;
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function editAdminOrderMessage(tg, { chatId, messageId, messageText, footerHtml, replyMarkup }) {
  const text = messageText + footerHtml;
  const markup = replyMarkup || { inline_keyboard: [] };
  const body = {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    text,
    reply_markup: markup,
  };
  const edited = await tg('editMessageText', body);
  if (!edited.ok) {
    console.error('editMessageText:', edited.description || edited);
    await tg('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: escapeHtml(messageText).replace(/\n/g, '<br>') + footerHtml,
      reply_markup: markup,
    });
  }
}

function parseOrderIdFromCallback(data) {
  return data.replace(/^(approve_|reject_|revoke_|complete_)/, '');
}

async function sendClientMessage(tgClient, chatId, text) {
  if (!tgClient || !chatId || !text) return;
  if (!walletStore.shouldSendBotNotifications(chatId)) {
    console.log(`📨 Клиенту ${chatId}: уведомления выключены, пропуск`);
    return;
  }
  try {
    await tgClient('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (clientErr) {
    console.error('Client notify error:', clientErr.message || clientErr);
  }
}

function isServiceOrder(order, orderId) {
  return order?.orderKind === 'service' || String(orderId || '').startsWith('SRV-');
}

function syncHistoryStatus(telegramUserId, orderId, status) {
  if (!telegramUserId || !orderId) return;
  try {
    walletStore.updateOrderHistoryStatus(telegramUserId, orderId, status);
  } catch (e) {
    console.warn('updateOrderHistoryStatus:', e.message);
  }
}

function keyboardAfterApprove(orderId) {
  return {
    inline_keyboard: [
      [{ text: '✅ Mark delivered', callback_data: `complete_${orderId}` }],
      [{ text: '↩️ Cancel after approval', callback_data: `revoke_${orderId}` }],
    ],
  };
}

function keyboardAfterComplete() {
  return { inline_keyboard: [] };
}

function mergeOrder(orderId, stored, messageText) {
  let parsed = null;
  try {
    parsed = parseOrderFromAdminMessage(messageText);
  } catch (e) {
    console.warn(`parseOrderFromAdminMessage ${orderId}:`, e.message);
  }
  return {
    ...(parsed || {}),
    ...(stored || {}),
    orderId,
    deals: stored?.deals?.length ? stored.deals : parsed?.deals,
    deliveryMethod: stored?.deliveryMethod ?? parsed?.deliveryMethod,
    deliveryDateId: stored?.deliveryDateId ?? parsed?.deliveryDateId,
    coords: stored?.coords ?? parsed?.coords,
    address: stored?.address ?? parsed?.address,
    telegramUserId: stored?.telegramUserId ?? parsed?.telegramUserId,
    language: stored?.language ?? parsed?.language,
  };
}

/**
 * Бот заявок: Подтвердить / Отменить / Отмена после подтверждения → Google Sheets + кошелёк.
 */
async function startOrdersBotPoll(options) {
  const { ordersBotToken, adminChatId, exexchangeBotToken } = options;

  if (!ordersBotToken) {
    console.warn('⚠️ ORDERS_BOT_TOKEN не задан — кнопки не работают');
    return;
  }

  const tg = createTelegramApi(ordersBotToken);
  const tgClient = exexchangeBotToken ? createTelegramApi(exexchangeBotToken) : null;

  await fetch(`https://api.telegram.org/bot${ordersBotToken}/deleteWebhook?drop_pending_updates=true`);

  let offset = 0;
  console.log(`📋 Orders bot polling (admin chat ${adminChatId || 'any'})`);
  console.log(`   Google Sheets: ${isConfigured() ? '✅ настроен' : '❌ НЕТ файла server/google-service-account.json'}`);
  console.log(`   Shipday: ${shipday.isConfigured() ? '✅ API ключ задан' : '❌ SHIPDAY_API_KEY не задан'}`);

  async function handleCallback(cb) {
    try {
    const data = cb.data || '';
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const messageText = cb.message?.text || cb.message?.caption || '';

    console.log(`🔘 Callback: ${data} from chat ${chatId}`);

    if (adminChatId && String(chatId) !== String(adminChatId)) {
      await tg('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: `Этот чат: ${chatId}. Нужен ORDERS_ADMIN_CHAT_ID=${chatId}`,
        show_alert: true,
      });
      return;
    }

    const isApprove = data.startsWith('approve_');
    const isReject = data.startsWith('reject_');
    const isRevoke = data.startsWith('revoke_');
    const isComplete = data.startsWith('complete_');
    if (!isApprove && !isReject && !isRevoke && !isComplete) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id });
      return;
    }

    const orderId = parseOrderIdFromCallback(data);

    if (isComplete) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id });

      const stored = ordersStore.get(orderId) || mergeOrder(orderId, null, messageText);
      if (!stored?.telegramUserId) {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Order not found',
          show_alert: true,
        });
        return;
      }
      if (stored.status === 'COMPLETED') {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Order is already marked as delivered',
          show_alert: true,
        });
        return;
      }
      if (stored.status !== 'Accepted') {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Approve the order first',
          show_alert: true,
        });
        return;
      }

      const order = mergeOrder(orderId, stored, messageText);
      const serviceOrder = isServiceOrder(order, orderId);

      const cashbackEarned = Math.max(
        0,
        Math.floor(Number(stored.cashbackEarned ?? order.cashbackEarned) || 0)
      );
      let cashbackApplied = Boolean(stored.cashbackApplied);

      if (!serviceOrder && stored.telegramUserId && cashbackEarned > 0 && !cashbackApplied) {
        const cb = walletStore.applyCashbackOnApprove(stored.telegramUserId, cashbackEarned);
        if (cb.ok && cb.cashbackApplied) {
          cashbackApplied = true;
          console.log(
            `💰 Order ${orderId}: кэшбэк +${cashbackEarned} → ${stored.telegramUserId} (баланс ${cb.bonuses})`
          );
        }
      }

      const referralPay = serviceOrder
        ? { ok: false }
        : walletStore.tryCompleteReferralOnFirstApprovedOrder(
            stored.telegramUserId,
            orderId
          );

      ordersStore.upsert(orderId, {
        ...stored,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        cashbackApplied,
        cashbackEarned,
      });
      syncHistoryStatus(stored.telegramUserId, orderId, 'delivered');

      let completeFooter = '\n\n✅ <b>COMPLETED / DELIVERED</b>';
      if (referralPay.ok) {
        completeFooter += `\n▫️ Referral: +${referralPay.referredBonus} to friend, +${referralPay.referrerBonus} to referrer`;
      }

      await editAdminOrderMessage(tg, {
        chatId,
        messageId,
        messageText,
        footerHtml: completeFooter,
        replyMarkup: keyboardAfterComplete(),
      });

      if (tgClient) {
        const lang = stored.language || 'ru';
        const clientText = serviceOrder
          ? buildClientServiceOrderDeliveredText(lang, { ...order, orderId })
          : buildClientOrderDeliveredText(lang, { ...order, orderId });
        await sendClientMessage(tgClient, stored.telegramUserId, clientText);
        if (!serviceOrder && cashbackApplied && cashbackEarned > 0) {
          const cashbackText = buildClientCashbackCreditedText(lang, {
            orderId,
            amount: cashbackEarned,
          });
          if (cashbackText) {
            await sendClientMessage(tgClient, stored.telegramUserId, cashbackText);
          }
        }
        if (!serviceOrder && referralPay.ok) {
          await sendClientMessage(
            tgClient,
            stored.telegramUserId,
            buildClientReferralReferredText(lang, {
              orderId,
              amount: referralPay.referredBonus,
            })
          );
          if (referralPay.referrerId) {
            await sendClientMessage(
              tgClient,
              referralPay.referrerId,
              buildClientReferralReferrerText(lang, {
                orderId,
                amount: referralPay.referrerBonus,
              })
            );
          }
        }
        console.log(`📨 Клиенту ${stored.telegramUserId}: заказ выполнен #${orderId}`);
      }
      console.log(`✅ Order ${orderId} completed / delivered`);
      return;
    }

    if (isRevoke) {
      const stored = ordersStore.get(orderId) || mergeOrder(orderId, null, messageText);
      if (!stored?.telegramUserId) {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Order not found',
          show_alert: true,
        });
        return;
      }
      if (stored.status === 'CANCELLED_AFTER_ACCEPT') {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Already cancelled after approval',
          show_alert: true,
        });
        return;
      }
      if (stored.status === 'COMPLETED') {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Order is delivered — cannot cancel',
          show_alert: true,
        });
        return;
      }
      if (stored.status !== 'Accepted') {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Approve the order first, then use this button',
          show_alert: true,
        });
        return;
      }

      const walletResult = walletStore.revokeAfterConfirm(stored.telegramUserId, {
        cashbackEarned: stored.cashbackEarned,
        bonusesUsed: stored.bonusesUsed,
        cashbackApplied: stored.cashbackApplied,
        bonusesDeducted: stored.bonusesDeducted,
        bonusesRefundedOnRevoke: stored.bonusesRefundedOnRevoke,
      });

      const referralRevoke = walletStore.revokeReferralRewardIfOrderRevoked(
        stored.telegramUserId,
        orderId
      );

      ordersStore.upsert(orderId, {
        ...stored,
        status: 'CANCELLED_AFTER_ACCEPT',
        cancelledAfterAcceptAt: new Date().toISOString(),
        cashbackReversed: true,
        bonusesRefundedOnRevoke: true,
      });
      syncHistoryStatus(stored.telegramUserId, orderId, 'cancelled');

      let footer =
        '\n\n🔄 <b>CANCELLED AFTER APPROVAL</b>\n' +
        '<i>Remove or mark the Excel row manually</i>';
      if (walletResult.cashbackReversed > 0) {
        footer += `\n▫️ Cashback reversed: −${walletResult.cashbackReversed} bonus points`;
      }
      if (walletResult.cashbackShortfall > 0) {
        footer += `\n⚠️ Insufficient balance to fully reverse cashback (−${walletResult.cashbackShortfall})`;
      }
      if (walletResult.bonusesRefunded > 0) {
        footer += `\n▫️ Bonuses refunded: +${walletResult.bonusesRefunded}`;
      }
      if (referralRevoke.ok) {
        footer += `\n▫️ Referral reversed: −${referralRevoke.referredReversed} friend, −${referralRevoke.referrerReversed} referrer`;
        if (referralRevoke.referredShortfall > 0 || referralRevoke.referrerShortfall > 0) {
          footer += '\n⚠️ Insufficient balance to fully reverse referral';
        }
      }
      footer += `\n▫️ Client balance: ${walletResult.bonuses ?? '—'}`;

      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: '🔄 Cancelled after approval' });
      await editAdminOrderMessage(tg, {
        chatId,
        messageId,
        messageText,
        footerHtml: footer,
      });
      if (tgClient && stored.telegramUserId) {
        const lang = stored.language || 'ru';
        await sendClientMessage(
          tgClient,
          stored.telegramUserId,
          buildClientOrderRevokedText(lang, { orderId })
        );
        if (!isServiceOrder(stored, orderId) && stored.cashbackApplied) {
          await sendClientMessage(
            tgClient,
            stored.telegramUserId,
            buildClientCashbackRevokedText(lang, { orderId })
          );
        }
        console.log(`📨 Клиенту ${stored.telegramUserId}: отмена после подтверждения`);
      }

      console.log(`🔄 Order ${orderId} cancelled after accept`);
      return;
    }

    if (isReject) {
      const storedReject = ordersStore.get(orderId) || mergeOrder(orderId, null, messageText);
      if (storedReject?.status === 'Accepted' || storedReject?.status === 'CANCELLED_AFTER_ACCEPT') {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Order already approved — use «Cancel after approval»',
          show_alert: true,
        });
        return;
      }
      if (
        storedReject?.bonusesDeducted &&
        storedReject.bonusesUsed > 0 &&
        storedReject.telegramUserId &&
        !storedReject.bonusesRefundedOnRevoke
      ) {
        walletStore.refundBonuses(storedReject.telegramUserId, storedReject.bonusesUsed);
        ordersStore.upsert(orderId, { ...storedReject, bonusesRefundedOnRevoke: true });
        console.log(
          `💰 Order ${orderId}: возврат ${storedReject.bonusesUsed} бонусов → ${storedReject.telegramUserId}`
        );
      }
      ordersStore.setStatus(orderId, 'REJECTED');
      if (storedReject?.telegramUserId) {
        syncHistoryStatus(storedReject.telegramUserId, orderId, 'cancelled');
      }
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: '❌ Cancelled' });
      await editAdminOrderMessage(tg, {
        chatId,
        messageId,
        messageText,
        footerHtml: '\n\n❌ <b>CANCELLED</b>',
      });
      if (tgClient && storedReject?.telegramUserId) {
        await sendClientMessage(
          tgClient,
          storedReject.telegramUserId,
          buildClientOrderRejectedText(storedReject.language, { orderId })
        );
        console.log(`📨 Клиенту ${storedReject.telegramUserId}: заявка отменена`);
      }
      console.log(`❌ Order ${orderId} rejected`);
      return;
    }

    // --- APPROVE --- (сразу снимаем «часики» с кнопки)
    await tg('answerCallbackQuery', { callback_query_id: cb.id });

    const stored = ordersStore.get(orderId);
    const order = mergeOrder(orderId, stored, messageText);

    if (stored?.status === 'Accepted' || stored?.status === 'CANCELLED_AFTER_ACCEPT') {
      await tg('answerCallbackQuery', {
        callback_query_id: cb.id,
        text:
          stored.status === 'CANCELLED_AFTER_ACCEPT'
            ? 'Order already cancelled after approval'
            : 'Order already approved',
        show_alert: true,
      });
      return;
    }

    const serviceOrder = isServiceOrder(order, orderId);

    if (!serviceOrder && !isConfigured()) {
      await editAdminOrderMessage(tg, {
        chatId,
        messageId,
        messageText,
        footerHtml:
          '\n\n⚠️ <b>Not saved to spreadsheet</b>\n' +
          'Place the JSON key at:\n<code>exchange/server/google-service-account.json</code>\n' +
          'and share the sheet with the service account email (client_email).',
      });
      return;
    }

    try {
      const approved = {
        ...order,
        orderId,
        status: 'Accepted',
        confirmedAt: new Date().toISOString(),
      };

      let sheetResult = { rowCount: 0 };
      if (!serviceOrder) {
        sheetResult = await appendApprovedOrder(approved);
      }

      let shipdayNote = '';
      if (!serviceOrder) {
        const sd = await shipday.createDeliveryOrder(approved);
        if (sd.ok) {
          approved.shipdayOrderId = sd.shipdayOrderId;
          approved.shipdaySyncedAt = new Date().toISOString();
          shipdayNote = `\n▫️ Shipday: #${sd.shipdayOrderId || 'ok'}`;
          console.log(`🚚 Order ${orderId} → Shipday${sd.shipdayOrderId ? ` #${sd.shipdayOrderId}` : ''}`);
        } else if (sd.skipped) {
          const why = sd.reason || shipday.getSkipReason(approved) || 'пропуск';
          shipdayNote = `\n▫️ Shipday: not sent (${why})`;
          console.log(`Shipday ${orderId}: skip — ${why}`);
        } else {
          const errShort = String(sd.error || sd.status || 'error').slice(0, 120);
          shipdayNote = `\n▫️ Shipday: error — ${escapeHtml(errShort)}`;
          console.error(`Shipday ${orderId}:`, sd.error || sd.status, sd.body || '');
        }
      }

      ordersStore.upsert(orderId, { ...approved, cashbackApplied: false });
      syncHistoryStatus(approved.telegramUserId, orderId, 'confirmed');

      const dealCount = (approved.deals || []).length;
      const rowsNote = serviceOrder
        ? ' — service (no Excel)'
        : sheetResult.rowCount > 1
          ? ` — ${sheetResult.rowCount} rows in sheet`
          : ' — row added to «Orders_Today NEW»';

      await editAdminOrderMessage(tg, {
        chatId,
        messageId,
        messageText,
        footerHtml: `\n\n✅ <b>APPROVED</b>${escapeHtml(rowsNote)}${shipdayNote}`,
        replyMarkup: keyboardAfterApprove(orderId),
      });

      if (tgClient && approved.telegramUserId) {
        const clientChatId = approved.telegramUserId;
        const lang = approved.language || 'ru';
        if (serviceOrder) {
          await sendClientMessage(
            tgClient,
            clientChatId,
            buildClientServiceOrderConfirmedText(lang, approved)
          );
        } else {
          await sendClientMessage(
            tgClient,
            clientChatId,
            buildClientOrderConfirmedText(lang, approved)
          );
        }
        await sendClientMessage(tgClient, clientChatId, buildClientPaymentDetailsText(lang));
        console.log(`📨 Клиенту ${clientChatId}: подтверждение + реквизиты`);
      }

      console.log(
        `✅ Order ${orderId} → Google Sheets (${sheetResult.rowCount} row(s), ${dealCount} deal(s))`
      );
    } catch (err) {
      console.error('Approve error:', err.message || err);
      await editAdminOrderMessage(tg, {
        chatId,
        messageId,
        messageText,
        footerHtml: `\n\n⚠️ <b>Google Sheets error</b>\n<code>${escapeHtml((err.message || err).slice(0, 300))}</code>`,
      });
    }
    } catch (err) {
      console.error('Callback handler error:', err.message || err, err.stack);
      try {
        await tg('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: (err.message || 'Error').slice(0, 180),
          show_alert: true,
        });
      } catch (_) { /* already answered */ }
    }
  }

  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${ordersBotToken}/getUpdates?timeout=50&offset=${offset}`
      );
      const data = await res.json();
      if (!data.ok) {
        console.error('Orders bot getUpdates:', data.description || data);
        await sleep(5000);
        continue;
      }
      for (const upd of data.result || []) {
        offset = upd.update_id + 1;
        if (upd.callback_query) await handleCallback(upd.callback_query);
        if (upd.message?.text === '/chatid') {
          await tg('sendMessage', {
            chat_id: upd.message.chat.id,
            text: `Ваш chat_id: <code>${upd.message.chat.id}</code>\n\nВ .env:\nORDERS_ADMIN_CHAT_ID=${upd.message.chat.id}`,
            parse_mode: 'HTML',
          });
        }
      }
    } catch (e) {
      console.error('Orders bot poll error:', e.message);
      await sleep(3000);
    }
  }
}

module.exports = { startOrdersBotPoll, createTelegramApi };

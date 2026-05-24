const { t, normLang, exchangeDealHeading } = require('./notificationI18n');
const {
  buildClientServiceOrderNotifyText,
  buildClientServiceOrderConfirmedText,
  buildAdminServiceOrderMessage,
} = require('./serviceNotifications');

const PAYMENT_DETAILS = {
  binanceUid: '369361650',
  bybitUid: '115884896',
  usdtTrc20: 'TY8wDvguHKbhcHkbXTCPdsygJXbi1HwX5D',
  usdtBep20: '0xd44437b095a06dc8a410319682c011f87ebdee21',
};

const DIVIDER = '━━━━━━━━━━━━━━━';
const PICKUP_OFFICE_ADDRESS = 'Avenida Los Incas 3390, Belgrano';
const PICKUP_OFFICE_ADDRESS_SHORT = 'Avenida Los Incas 3390';

function parseNum(val) {
  if (val === undefined || val === null || val === '') return NaN;
  const s = String(val).trim().replace(/\s/g, '');
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  return Number(s);
}

function formatAmountSpaces(val) {
  const n = parseNum(val);
  if (Number.isNaN(n)) return String(val ?? '');
  const hasDec = Math.abs(n % 1) > 1e-9;
  const fixed = hasDec ? n.toFixed(2) : String(Math.round(n));
  const [intPart, decPart] = fixed.split('.');
  const spaced = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${spaced}.${decPart}` : spaced;
}

function copyAmount(amount, currency) {
  return `<code>${formatAmountSpaces(amount)} ${currency}</code>`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function copyValue(val) {
  return `<code>${escapeHtml(val)}</code>`;
}

function isPickupOrder(order) {
  const method = String(order.deliveryMethod || '').toLowerCase();
  if (method === 'pickup') return true;
  const type = String(order.type || '').toLowerCase();
  return type.includes('офис') || type.includes('office') || type.includes('pickup') || type.includes('retiro');
}

function methodLabel(lang, deliveryMethod, order) {
  if (deliveryMethod === 'transfer') return t(lang, 'method_transfer');
  if (deliveryMethod === 'delivery') return t(lang, 'method_delivery');
  if (isPickupOrder(order || { deliveryMethod })) return t(lang, 'method_pickup');
  return t(lang, 'method_pickup');
}

function formatPaymentByGiveCurrency(lang, currency) {
  const cur = String(currency || '').toUpperCase();
  if (!cur) return '';
  if (cur === 'USDT' || cur === 'USDC') return cur;
  if (['USD', 'EUR', 'ARS', 'RUB'].includes(cur)) return t(lang, 'cash_payment', { cur });
  return cur;
}

function paymentLabelFromDeals(lang, deals, deliveryMethod) {
  const list = deals || [];
  const hasCardTransfer = list.some((d) => (d.get || d.getCurrency) === 'ARS_CARD');
  if (deliveryMethod === 'transfer' || hasCardTransfer) return t(lang, 'method_transfer');
  const labels = [
    ...new Set(
      list.map((d) => formatPaymentByGiveCurrency(lang, d.giveCurrency || d.give)).filter(Boolean)
    ),
  ];
  return labels.join(', ');
}

function paymentLabelFromOrder(order) {
  const lang = normLang(order.language);
  const deals = (order.deals || []).map((d) => ({
    give: d.giveCurrency || d.give,
    get: d.getCurrency || d.get,
  }));
  return paymentLabelFromDeals(lang, deals, order.deliveryMethod);
}

/**
 * Сообщение клиенту после «Подтвердить».
 */
function buildClientOrderConfirmedText(language, order) {
  const lang = normLang(language || order.language);

  const pickupBlock = isPickupOrder(order)
    ? `\n▫️ <b>${t(lang, 'pickup_address')}:</b> ${copyValue(PICKUP_OFFICE_ADDRESS_SHORT)}\n\n` +
      `<i>${t(lang, 'pickup_hours')}</i>\n\n`
    : '';

  return (
    `✅ <b>${t(lang, 'order_confirmed_title')}</b>\n\n` +
    `${DIVIDER}\n` +
    `📦 ${t(lang, 'order_number')}: <b>#${order.orderId}</b>\n` +
    `${DIVIDER}\n` +
    pickupBlock +
    `🟢 <b>${t(lang, 'status_in_progress')}</b>\n\n` +
    `<i>${t(lang, 'manager_contact')}</i>`
  );
}

/** Короткое уведомление о начислении кэшбэка (отдельное сообщение). */
function buildClientCashbackCreditedText(language, { orderId, amount }) {
  const lang = normLang(language);
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (n <= 0) return '';
  return `💰 <b>${t(lang, 'cashback_credited', { amount: formatAmountSpaces(n), orderId })}</b>`;
}

/** Отмена после подтверждения — кэшбэк не на счёте. */
function buildClientCashbackRevokedText(language, { orderId }) {
  const lang = normLang(language);
  return `🔄 <i>${t(lang, 'cashback_not_on_account_revoke', { orderId })}</i>`;
}

/** Реквизиты для оплаты */
function buildClientPaymentDetailsText(language) {
  const lang = normLang(language);
  const p = PAYMENT_DETAILS;
  return (
    `${DIVIDER}\n` +
    `<b>${t(lang, 'payment_details_title')}</b>\n` +
    `${DIVIDER}\n\n` +
    `🟡 <b>${t(lang, 'binance_uid')}:</b> ${copyValue(p.binanceUid)}\n` +
    `🟠 <b>${t(lang, 'bybit_uid')}:</b> ${copyValue(p.bybitUid)}\n\n` +
    `💲 <b>${t(lang, 'usdt_trc20')}:</b>\n${copyValue(p.usdtTrc20)}\n\n` +
    `💲 <b>${t(lang, 'usdt_bep20')}:</b>\n${copyValue(p.usdtBep20)}\n\n` +
    `🇷🇺 <b>${t(lang, 'rub_title')}:</b>\n` +
    `<code>${t(lang, 'rub_note')}</code>`
  );
}

/** Уведомление сразу после оформления */
function buildClientOrderNotifyText(language, payload) {
  const lang = normLang(language || payload.language);
  const { orderId, deals, deliveryMethod, address, date, time } = payload;

  const list = deals || [];

  const method = methodLabel(lang, deliveryMethod);

  const paymentLabel = paymentLabelFromDeals(lang, list, deliveryMethod);

  let receiptBlock = `\n\n🏢 <b>${t(lang, 'receipt')}:</b>\n` + `▫️ <b>${t(lang, 'method')}:</b> ${method}`;

  if (deliveryMethod === 'delivery' && address) {
    receiptBlock += `\n▫️ <b>${t(lang, 'address')}:</b> ${address}`;
  }
  if (deliveryMethod === 'delivery' && date) {
    receiptBlock += `\n▫️ <b>${t(lang, 'date')}:</b> ${date}`;
  }
  if (deliveryMethod === 'delivery' && time) {
    receiptBlock += `\n▫️ <b>${t(lang, 'time')}:</b> ${time}`;
  }
  if (paymentLabel) {
    receiptBlock += `\n▫️ <b>${t(lang, 'payment')}:</b> ${paymentLabel}`;
  }

  const dealsBlock = list
    .map((d, i) => {
      const g = d.give || d.giveCurrency || '';
      const c = d.get || d.getCurrency || '';
      const pairLine = g && c ? `${g} &gt; ${c}` : '—';
      return (
        `\n\n💱 <b>${exchangeDealHeading(lang, i, list.length)}</b>\n` +
        `<b>${pairLine}</b>\n` +
        `▫️ <b>${t(lang, 'you_give')}:</b> ${copyAmount(d.giveAmount, g)}\n` +
        `▫️ <b>${t(lang, 'you_get')}:</b> ${copyAmount(d.getAmount, c)}`
      );
    })
    .join('');

  return (
    `✅ <b>${t(lang, 'order_placed_title')}</b>\n\n` +
    `${DIVIDER}\n` +
    `📦 ${t(lang, 'order_number')}: <b>#${orderId}</b>\n` +
    `${DIVIDER}` +
    dealsBlock +
    receiptBlock +
    `\n\n🟢 <b>${t(lang, 'status_placed')}</b>\n\n` +
    `<i>${t(
      lang,
      deliveryMethod === 'delivery' || deliveryMethod === 'transfer'
        ? 'after_confirm_note_delivery'
        : 'after_confirm_note_pickup'
    )}</i>\n\n` +
    `<b>${t(lang, 'thanks')}</b>`
  );
}

function buildClientReferralReferredText(lang, { orderId, amount }) {
  const L = normLang(lang);
  return t(L, 'referral_referred_paid', { orderId, amount });
}

function buildClientReferralReferrerText(lang, { orderId, amount }) {
  const L = normLang(lang);
  return t(L, 'referral_referrer_paid', { orderId, amount });
}

function buildClientOrderRejectedText(language, { orderId }) {
  const lang = normLang(language);
  return (
    `❌ <b>${t(lang, 'order_rejected_title')}</b>\n\n` +
    `${DIVIDER}\n` +
    `📦 ${t(lang, 'order_number')}: <b>#${escapeHtml(orderId)}</b>\n` +
    `${DIVIDER}\n\n` +
    `<i>${t(lang, 'order_rejected_body', { orderId: escapeHtml(orderId) })}</i>`
  );
}

function buildClientOrderRevokedText(language, { orderId }) {
  const lang = normLang(language);
  return (
    `🔄 <b>${t(lang, 'order_revoked_after_confirm', { orderId: escapeHtml(orderId) })}</b>`
  );
}

/** Сообщение клиенту после «Заказ выполнен» в админ-боте */
function buildClientOrderDeliveredText(language, order) {
  const lang = normLang(language || order.language);
  return (
    `✅ <b>${t(lang, 'order_delivered_title')}</b>\n\n` +
    `${DIVIDER}\n` +
    `📦 ${t(lang, 'order_number')}: <b>#${escapeHtml(order.orderId)}</b>\n` +
    `${DIVIDER}\n\n` +
    `🟢 <b>${t(lang, 'order_delivered_body', { orderId: escapeHtml(order.orderId) })}</b>\n\n` +
    `<i>${t(lang, 'manager_contact')}</i>`
  );
}

function buildClientServiceOrderDeliveredText(language, order) {
  const lang = normLang(language || order.language);
  return (
    `✅ <b>${t(lang, 'service_delivered_title')}</b>\n\n` +
    `${DIVIDER}\n` +
    `📦 ${t(lang, 'order_number')}: <b>#${escapeHtml(order.orderId)}</b>\n` +
    `${DIVIDER}\n\n` +
    `🟢 <b>${t(lang, 'service_delivered_body', { orderId: escapeHtml(order.orderId) })}</b>\n\n` +
    `<i>${t(lang, 'manager_contact')}</i>`
  );
}

function buildAdminOrderMessage(order) {
  const deals = order.deals || [];
  const orderDetails = deals
    .map(
      (o, i) =>
        `✔️ <b>${deals.length <= 1 ? 'Exchange:' : `Exchange ${i + 1}:`}</b> ${o.giveCurrency || o.give} → ${o.getCurrency || o.get}\n` +
        `🔘 <i>Gives:</i> ${o.giveAmount} ${o.giveCurrency || o.give}\n` +
        `🔘 <i>Receives:</i> ${o.getAmount} ${o.getCurrency || o.get}`
    )
    .join('\n\n');

  return (
    `<b>New exchange request! #${escapeHtml(order.orderId)}</b>\n\n` +
    `Client: ${escapeHtml(order.clientName || '—')} ${escapeHtml(order.clientTelegram || '')}\n\n` +
    `Order details:\n\n${orderDetails}\n\n` +
    `❗️ <b>Please review:</b>\n\n` +
    `🔘 <i>Payment:</i> ${escapeHtml(paymentLabelFromOrder(order) || order.paymentMethod || '—')}\n` +
    `🔘 <i>Account details:</i> ${escapeHtml(order.cardAccount || '—')}\n` +
    `🔘 <i>Address:</i> ${escapeHtml(order.address || '—')}\n` +
    `🔘 <i>Date:</i> ${escapeHtml(order.deliveryDate || '—')}\n` +
    `🔘 <i>Time:</i> ${escapeHtml(order.deliveryTime || 'Flexible')}`
  );
}

module.exports = {
  buildClientOrderNotifyText,
  buildClientOrderConfirmedText,
  buildClientPaymentDetailsText,
  buildClientCashbackCreditedText,
  buildClientCashbackRevokedText,
  buildClientOrderRejectedText,
  buildClientOrderRevokedText,
  buildClientOrderDeliveredText,
  buildClientServiceOrderDeliveredText,
  buildClientServiceOrderNotifyText,
  buildClientServiceOrderConfirmedText,
  buildClientReferralReferredText,
  buildClientReferralReferrerText,
  buildAdminOrderMessage,
  buildAdminServiceOrderMessage,
};

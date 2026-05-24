/**
 * Shipday — создание заявки на доставку при подтверждении заказа в админ-боте.
 * https://docs.shipday.com/reference/insert-delivery-order
 */

const path = require('path');
const fs = require('fs');
const envLocal = path.join(__dirname, '..', '.env.development.local');
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocal)) require('dotenv').config({ path: envLocal });
else if (fs.existsSync(envFile)) require('dotenv').config({ path: envFile });

const SHIPDAY_API = 'https://api.shipday.com/orders';

const RESTAURANT_NAME = process.env.SHIPDAY_RESTAURANT_NAME || 'Express Exchange';
const RESTAURANT_ADDRESS =
  process.env.SHIPDAY_RESTAURANT_ADDRESS || 'Av. Los Incas 3390, Buenos Aires';
const RESTAURANT_PHONE = process.env.SHIPDAY_RESTAURANT_PHONE || '+5491100000000';
const DEFAULT_CUSTOMER_PHONE = process.env.SHIPDAY_DEFAULT_PHONE || '+5491100000000';

const PICKUP_ADDRESS_RE =
  /^(офис|office|самовывоз|pickup|перевод на карту|card transfer|escritório|oficina)$/i;

function getApiKey() {
  return (process.env.SHIPDAY_API_KEY || '').trim();
}

function isConfigured() {
  return Boolean(getApiKey());
}

function isServiceOrder(order) {
  return (
    order?.orderKind === 'service' ||
    order?.type === 'service' ||
    String(order?.orderId || '').startsWith('SRV-')
  );
}

function resolveDeliveryMethod(order) {
  const m = String(order?.deliveryMethod || '').toLowerCase();
  if (m === 'delivery' || m === 'pickup' || m === 'transfer') return m;
  const type = String(order?.type || '').toLowerCase();
  if (/доставк|delivery|courier|курьер|moto|motoboy/.test(type)) return 'delivery';
  if (/офис|office|pickup|самовывоз|oficina|escritório/.test(type)) return 'pickup';
  if (/перевод|transfer|card/.test(type)) return 'transfer';
  return m || null;
}

function isPickupAddress(address) {
  const a = String(address || '').trim();
  if (!a) return true;
  if (PICKUP_ADDRESS_RE.test(a)) return true;
  return /самовывоз|pickup only|office pickup/i.test(a);
}

function shouldPushToShipday(order) {
  if (!isConfigured()) return false;
  if (isServiceOrder(order)) return false;
  if (order.shipdayOrderId) return false;

  const method = resolveDeliveryMethod(order);
  if (method === 'transfer') return false;
  return true;
}

function getSkipReason(order) {
  if (!isConfigured()) return 'нет SHIPDAY_API_KEY';
  if (isServiceOrder(order)) return 'услуга';
  if (order.shipdayOrderId) return 'уже в Shipday';
  const method = resolveDeliveryMethod(order);
  if (method === 'transfer') return 'перевод на карту';
  return null;
}

function parseTimeSlotStart(timeStr) {
  const raw = String(timeStr || '').trim();
  if (!raw) return '12:00:00';
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return '12:00:00';
  const h = String(Number(m[1])).padStart(2, '0');
  const min = m[2];
  return `${h}:${min}:00`;
}

function resolveDeliveryDate(order) {
  const id = order.deliveryDateId;
  if (id && /^\d{4}-\d{2}-\d{2}$/.test(id)) return id;

  const label = String(order.deliveryDate || '').toLowerCase();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (/сегодня|today|hoy/i.test(label)) return fmt(now);
  if (/завтра|tomorrow|mañana/i.test(label)) {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return fmt(t);
  }
  return fmt(now);
}

function buildOrderItems(order) {
  const deals = order.deals || [];
  if (!deals.length) {
    return [{ name: 'Обмен валют Express Exchange', quantity: 1, unitPrice: 0 }];
  }
  const multi = deals.length > 1;
  return deals.map((d, i) => {
    const give = d.giveCurrency || d.give || '';
    const get = d.getCurrency || d.get || '';
    const label = multi ? `Обмен ${i + 1}` : 'Обмен';
    return {
      name: `${label}: ${d.giveAmount || '?'} ${give} → ${d.getAmount || '?'} ${get}`,
      quantity: 1,
      unitPrice: 0,
      detail: order.paymentMethod || '',
    };
  });
}

function buildDeliveryInstruction(order) {
  const parts = [];
  const deals = (order.deals || [])
    .map(
      (d) =>
        `${d.giveAmount || '?'} ${d.giveCurrency || d.give || ''} → ${d.getAmount || '?'} ${d.getCurrency || d.get || ''}`
    )
    .join('; ');
  if (deals) parts.push(`Обмен: ${deals}`);
  if (order.paymentMethod) parts.push(`Оплата: ${order.paymentMethod}`);
  if (order.deliveryCost) parts.push(`Доставка: ${order.deliveryCost}`);
  if (order.clientTelegram) parts.push(`TG: ${order.clientTelegram}`);
  parts.push(`Заявка ${order.orderId}`);
  return parts.join(' | ');
}

function resolveCustomerAddress(order) {
  const method = resolveDeliveryMethod(order);
  const raw = String(order.address || '').trim();
  if (method === 'pickup' || isPickupAddress(raw)) {
    return RESTAURANT_ADDRESS;
  }
  if (raw.length >= 8) return raw;
  return RESTAURANT_ADDRESS;
}

function buildShipdayPayload(order) {
  const customerName =
    [order.clientName, order.clientTelegram].filter(Boolean).join(' ').trim() ||
    'Express Exchange client';

  const method = resolveDeliveryMethod(order);
  let deliveryInstruction = buildDeliveryInstruction(order);
  if (method === 'pickup' || isPickupAddress(order.address)) {
    deliveryInstruction = `САМОВЫВОЗ ИЗ ОФИСА | ${deliveryInstruction}`;
  }

  const payload = {
    orderNumber: String(order.orderId),
    customerName,
    customerAddress: resolveCustomerAddress(order),
    customerPhoneNumber: order.customerPhone || DEFAULT_CUSTOMER_PHONE,
    restaurantName: RESTAURANT_NAME,
    restaurantAddress: RESTAURANT_ADDRESS,
    restaurantPhoneNumber: RESTAURANT_PHONE,
    expectedDeliveryDate: resolveDeliveryDate(order),
    expectedDeliveryTime: parseTimeSlotStart(order.deliveryTime),
    expectedPickupTime: parseTimeSlotStart(order.deliveryTime),
    orderItem: buildOrderItems(order),
    deliveryInstruction,
    pickupInstruction: `Забор в офисе: ${RESTAURANT_ADDRESS}`,
    orderSource: 'TMA Express Exchange',
    paymentMethod: 'cash',
  };

  const lat = order.coords?.lat ?? order.coords?.latitude ?? order.deliveryLatitude;
  const lng =
    order.coords?.lng ?? order.coords?.lon ?? order.coords?.longitude ?? order.deliveryLongitude;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    payload.deliveryLatitude = lat;
    payload.deliveryLongitude = lng;
  }

  return payload;
}

async function createDeliveryOrder(order) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, skipped: true, reason: 'SHIPDAY_API_KEY not set' };
  }
  if (!shouldPushToShipday(order)) {
    return { ok: false, skipped: true, reason: getSkipReason(order) || 'not applicable' };
  }

  const body = buildShipdayPayload(order);
  try {
    const res = await fetch(SHIPDAY_API, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.message || data?.error || text || res.statusText,
        body,
      };
    }
    const shipdayOrderId =
      data?.orderId ?? data?.id ?? data?.order?.id ?? data?.orderNumber ?? null;
    return { ok: true, shipdayOrderId, data, body };
  } catch (e) {
    return { ok: false, error: e.message || String(e), body };
  }
}

module.exports = {
  isConfigured,
  shouldPushToShipday,
  getSkipReason,
  createDeliveryOrder,
  buildShipdayPayload,
  resolveDeliveryMethod,
};

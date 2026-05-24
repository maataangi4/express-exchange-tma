const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID || '11p4tMxdnq91JngFwFUFUykcy60Tqxpfyhf1amLGI2v4';
const SHEET_NAME_ENV = process.env.GOOGLE_SHEET_TAB || 'Orders_Today NEW';
const BASE_SHEET_NAME_ENV = process.env.GOOGLE_BASE_SHEET_TAB || 'base';
const BASE_SHEET_COLUMNS = 9; // A–I
const PICKUP_ADDRESS = 'Av. Los Incas 3390 PICKUP';
const SHEET_COLUMNS = 16; // A–P
const EXTRA_DEAL_MARKER = 'доп обмен';
const PESO_TAIL_MARKER = 'остаток в песо';

/** Нормализация имени вкладки для сопоставления */
function normalizeSheetName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/gi, '');
}

async function resolveSheetTitleByEnv(sheets, envName, cacheRef) {
  if (cacheRef.value) return cacheRef.value;

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
  const wanted = normalizeSheetName(envName);

  const exact = titles.find((t) => t === envName);
  if (exact) {
    cacheRef.value = exact;
    return cacheRef.value;
  }

  const fuzzy = titles.find((t) => normalizeSheetName(t) === wanted);
  if (fuzzy) {
    if (fuzzy !== envName) {
      console.log(`📊 Google Sheets: вкладка "${envName}" → "${fuzzy}"`);
    }
    cacheRef.value = fuzzy;
    return cacheRef.value;
  }

  throw new Error(
    `Вкладка "${envName}" не найдена. Доступные: ${titles.slice(0, 8).join(', ')}…`
  );
}

const ordersSheetCache = { value: null };
const baseSheetCache = { value: null };

async function resolveSheetTitle(sheets) {
  return resolveSheetTitleByEnv(sheets, SHEET_NAME_ENV, ordersSheetCache);
}

async function resolveBaseSheetTitle(sheets) {
  return resolveSheetTitleByEnv(sheets, BASE_SHEET_NAME_ENV, baseSheetCache);
}

const BASE_HEADERS = [
  'Telegram ID',
  'Username',
  'Имя',
  'Фамилия',
  'Язык',
  'Дата',
  'Время',
  'Бонусы',
  'Источник',
];

function formatBaseDate(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatBaseTime(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  return d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildBaseUserRow(user, { language = 'ru', bonuses = 0 } = {}) {
  const now = new Date();
  const username = user.username ? `@${user.username}` : '';
  return [
    String(user.id ?? ''),
    username,
    user.first_name || '',
    user.last_name || '',
    language || 'ru',
    formatBaseDate(now),
    formatBaseTime(now),
    String(Math.floor(bonuses) || 0),
    'TMA Express Exchange',
  ];
}

async function ensureBaseHeaders(sheets, sheetTitle) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetRange(sheetTitle, '!A1:I1'),
  });
  const first = res.data.values?.[0];
  if (first && first.some((c) => String(c || '').trim())) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetRange(sheetTitle, '!A1:I1'),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [BASE_HEADERS] },
  });
  console.log(`📊 Base: заголовки на вкладке "${sheetTitle}"`);
}

let baseRegistryHydrated = false;

async function hydrateBaseRegistryFromSheet(sheets, sheetTitle) {
  if (baseRegistryHydrated) return;
  const userBaseRegistry = require('./userBaseRegistry');
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetRange(sheetTitle, '!A2:A'),
    });
    const ids = (res.data.values || [])
      .map((row) => String(row[0] || '').trim())
      .filter((v) => /^\d+$/.test(v));
    const added = userBaseRegistry.markManyRegistered(ids, { persist: true });
    if (added > 0) {
      console.log(`📊 Base: синхронизировано ${added} id из Excel → registry`);
    }
  } catch (e) {
    console.warn('hydrateBaseRegistryFromSheet:', e.message || e);
  }
  baseRegistryHydrated = true;
}

async function isTelegramIdInBaseSheet(sheets, sheetTitle, telegramUserId) {
  const id = String(telegramUserId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetRange(sheetTitle, '!A2:A'),
  });
  const rows = res.data.values || [];
  return rows.some((row) => String(row[0] || '').trim() === id);
}

/**
 * Первый запуск Mini App → строка на вкладке base (строго один раз на telegram id).
 */
async function registerAppUserInBase(user, options = {}) {
  const userBaseRegistry = require('./userBaseRegistry');
  const id = user?.id;
  if (!id) return { ok: false, error: 'no_user' };

  if (userBaseRegistry.isInRegistry(id)) {
    return { ok: true, skipped: true, reason: 'already_registered' };
  }

  if (!userBaseRegistry.tryClaimRegistration(id)) {
    return { ok: true, skipped: true, reason: 'registration_in_progress' };
  }

  try {
    const sheets = await getSheets();
    const sheetTitle = await resolveBaseSheetTitle(sheets);
    await hydrateBaseRegistryFromSheet(sheets, sheetTitle);

    if (userBaseRegistry.isInRegistry(id)) {
      userBaseRegistry.releaseClaim(id);
      return { ok: true, skipped: true, reason: 'already_in_registry' };
    }

    if (await isTelegramIdInBaseSheet(sheets, sheetTitle, id)) {
      userBaseRegistry.markRegistered(id);
      return { ok: true, skipped: true, reason: 'already_in_sheet' };
    }

    await ensureBaseHeaders(sheets, sheetTitle);

    const row = buildBaseUserRow(user, options);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetRange(sheetTitle, '!A:I'),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    userBaseRegistry.commitRegistration(id);
    console.log(`📊 Base: пользователь ${id} → "${sheetTitle}"`);
    return { ok: true, registered: true, sheetTitle };
  } catch (e) {
    userBaseRegistry.releaseClaim(id);
    throw e;
  }
}

let sheetsClient = null;

function resolveCredentialsPath() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) return null;

  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const candidates = [
    fromEnv && path.isAbsolute(fromEnv) ? fromEnv : null,
    fromEnv && path.join(process.cwd(), fromEnv),
    fromEnv && path.join(__dirname, '..', fromEnv),
    path.join(__dirname, 'google-service-account.json'),
    path.join(__dirname, '..', 'server', 'google-service-account.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'google-service-account.json');
}

function getCredentials() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (e) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON: невалидный JSON');
    }
  }
  const credPath = resolveCredentialsPath();
  if (!fs.existsSync(credPath)) {
    throw new Error(
      `Нет файла Google credentials.\n` +
        `Положите JSON ключ в:\n<code>exchange/server/google-service-account.json</code>\n` +
        `(Service Account → Keys → JSON из Google Cloud)`
    );
  }
  return JSON.parse(fs.readFileSync(credPath, 'utf8'));
}

async function getSheets() {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function sheetRange(title, rangeSuffix = '') {
  const safeName = title.replace(/'/g, "''");
  return `'${safeName}'${rangeSuffix}`;
}

function parseAmount(val) {
  if (val === undefined || val === null || val === '') return NaN;
  const s = String(val).trim().replace(/\s/g, '');
  if (s.includes(',')) {
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  return Number(s);
}

/** 300 → "300,00" как в таблице */
function formatAmount(val) {
  const n = parseAmount(val);
  if (Number.isNaN(n)) return String(val ?? '');
  return n.toFixed(2).replace('.', ',');
}

function primaryDeal(order) {
  const deals = order.deals || [];
  return deals[0] || {};
}

function orderDeals(order) {
  const deals = order.deals || [];
  if (deals.length) return deals;
  const one = primaryDeal(order);
  return Object.keys(one).length ? [one] : [];
}

/** Бонусы к первой выдаче в ARS (в т.ч. «остаток в песо»). */
function applyBonusesToDeals(deals, bonusesUsed) {
  const add = Number(bonusesUsed) || 0;
  if (add <= 0) return deals;
  let applied = false;
  return deals.map((deal) => {
    if (applied) return deal;
    const getCur = deal.getCurrency || deal.get || '';
    if (getCur !== 'ARS' && getCur !== 'ARS_CARD') return deal;
    const base = parseAmount(deal.getAmount ?? deal.get_amount ?? '');
    if (Number.isNaN(base)) return deal;
    applied = true;
    return { ...deal, getAmount: String(Math.floor(base + add)) };
  });
}

function isPickupOrder(order) {
  const method = String(order.deliveryMethod || '').toLowerCase();
  if (method === 'pickup') return true;
  const type = String(order.type || '').toLowerCase();
  return type.includes('офис') || type.includes('pickup') || type.includes('retiro');
}

function splitAddress(address) {
  if (!address) return { street: '', district: '' };
  const idx = address.lastIndexOf(',');
  if (idx === -1) return { street: address.trim(), district: '' };
  return {
    street: address.slice(0, idx).trim(),
    district: address.slice(idx + 1).trim(),
  };
}

function deliveryPriceNumber(order) {
  if (isPickupOrder(order)) return 0;
  if (order.deliveryExpress || order.deliveryFeeUsd === 5 || order.deliveryFee === 5) return 5;
  if (order.deliveryFee === 0 || order.deliveryFee === '0') return 0;
  const cost = String(order.deliveryCost || '');
  if (/^0(\s*usdt)?$/i.test(cost.trim()) || cost === '0 USDT') return 0;
  const fromCost = cost.match(/[\d]+([.,]\d+)?/);
  if (fromCost) return parseAmount(fromCost[0]);
  if (order.deliveryFee != null && order.deliveryFee !== '') return parseAmount(order.deliveryFee);
  return 3.5;
}

function isTodayDeliveryDate(label) {
  const s = String(label || '').toLowerCase();
  return !s || s.includes('сегодня') || s.includes('today') || s.includes('hoy') || s.includes('今日');
}

function formatDeliverySchedule(order) {
  const time = order.deliveryTime || order.delivery_time || '';
  const date = order.deliveryDate || order.delivery_date || '';
  if (!time && !date) return '';
  if (date && !isTodayDeliveryDate(date)) {
    return time ? `${time}, ${date}` : date;
  }
  return time || date;
}

function formatConfirmTime(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  return d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatClientName(order) {
  const tg = order.clientTelegram || '';
  const user = order.telegramUser?.username;
  if (user) return `@${user}`;
  if (tg && tg.startsWith('(@')) return `@${tg.slice(2, -1)}`;
  return [order.clientName || order.client, tg].filter(Boolean).join(' ').trim();
}

function deliveryAddressColumns(order) {
  const pickup = isPickupOrder(order);
  const parsed = splitAddress(order.address);
  const district = order.district || parsed.district || '';

  if (pickup) {
    return { colJ: PICKUP_ADDRESS, colK: '', deliveryType: 'PICKUP' };
  }
  return {
    colJ: order.addressStreet || parsed.street || order.address || '',
    colK: district,
    deliveryType: 'DELIVERY',
  };
}

/**
 * Одна строка A–P: первая пара — полные данные заказа, следующие — «доп обмен» в колонке P.
 */
function buildSheetRowForDeal(order, deal, dealIndex) {
  const isFirst = dealIndex === 0;
  const { colJ, colK, deliveryType } = deliveryAddressColumns(order);

  const row = new Array(SHEET_COLUMNS).fill('');
  row[0] = order.orderId || '';
  row[1] = isFirst ? formatClientName(order) : '';
  row[2] = formatAmount(deal.giveAmount ?? deal.give_amount ?? '');
  row[3] = deal.giveCurrency || deal.give || '';
  row[4] = formatAmount(deal.getAmount ?? deal.get_amount ?? '');
  row[5] = deal.getCurrency || deal.get || '';

  if (isFirst) {
    row[6] = String(deliveryPriceNumber(order));
    row[9] = colJ;
    row[10] = colK;
    row[11] = formatDeliverySchedule(order);
    row[12] = formatConfirmTime(order.confirmedAt);
    row[13] = 'Accepted';
    row[14] = deliveryType;
    row[15] = '';
  } else {
    const marker = deal.sheetMarker || deal.sheet_marker || '';
    if (deal.pesoTail || marker === PESO_TAIL_MARKER) {
      row[15] = PESO_TAIL_MARKER;
    } else {
      row[15] = marker || EXTRA_DEAL_MARKER;
    }
  }

  return row;
}

/** Все строки для заказа (по одной на каждую валютную пару). */
function buildSheetRows(order) {
  const deals = applyBonusesToDeals(orderDeals(order), order.bonusesUsed);
  if (!deals.length) return [buildSheetRowForDeal(order, {}, 0)];
  return deals.map((deal, i) => buildSheetRowForDeal(order, deal, i));
}

/** Первая строка (обратная совместимость). */
function buildSheetRow(order) {
  return buildSheetRows(order)[0];
}

/**
 * Добавить подтверждённый заказ в Google Sheets (вкладка Orders_Today NEW).
 * Несколько пар — несколько строк подряд, доп. пары помечены «доп обмен» в колонке P.
 */
async function appendApprovedOrder(order) {
  const sheets = await getSheets();
  const sheetTitle = await resolveSheetTitle(sheets);
  const values = buildSheetRows(order);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetRange(sheetTitle, '!A:P'),
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });

  const rowsNote = values.length > 1 ? ` (${values.length} строки)` : '';
  console.log(`📊 Google Sheets: ${order.orderId} → "${sheetTitle}"${rowsNote}`);
  return { values, rowCount: values.length };
}

function isConfigured() {
  try {
    getCredentials();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  appendApprovedOrder,
  registerAppUserInBase,
  isConfigured,
  getSheets,
  buildSheetRow,
  buildSheetRows,
};

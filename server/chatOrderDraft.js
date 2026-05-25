/**
 * Per-chat exchange order draft + confirmation via «ДА» in Telegram.
 */
const { OFFICE_ADDRESS } = require('./orderSubmit');

const drafts = new Map();

const CONFIRM_PROMPT =
  'Хотите подтвердить заказ? Напишите <b>ДА</b>\n\n' +
  'Если передумали — напишите <b>НЕТ</b>, заказ не будет оформлен.';

function createDraft() {
  return {
    giveCurrency: null,
    giveAmount: null,
    getCurrency: null,
    getAmount: null,
    deliveryMethod: null,
    address: null,
    deliveryDate: null,
    deliveryTime: null,
    language: 'ru',
    status: 'collecting',
    confirmAsked: false,
    updatedAt: Date.now(),
  };
}

function getDraft(chatId) {
  if (!drafts.has(chatId)) drafts.set(chatId, createDraft());
  return drafts.get(chatId);
}

function clearDraft(chatId) {
  drafts.delete(chatId);
}

function mergeDraft(draft, fields) {
  if (!fields || typeof fields !== 'object') return draft;
  const keys = [
    'giveCurrency',
    'giveAmount',
    'getCurrency',
    'getAmount',
    'deliveryMethod',
    'address',
    'deliveryDate',
    'deliveryTime',
    'language',
  ];
  for (const k of keys) {
    const v = fields[k];
    if (v !== null && v !== undefined && v !== '') {
      if (k.endsWith('Amount')) {
        const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
        if (!Number.isNaN(n) && n > 0) draft[k] = n;
      } else if (k === 'deliveryMethod') {
        const m = String(v).toLowerCase();
        if (m === 'pickup' || m === 'delivery') draft[k] = m;
      } else {
        draft[k] = String(v).trim();
      }
    }
  }
  draft.updatedAt = Date.now();
  return draft;
}

function normalizeDeliveryMethod(text) {
  const t = String(text || '').toLowerCase();
  if (/самовывоз|офис|pickup|retiro|в офис/i.test(t)) return 'pickup';
  if (/курьер|доставк|delivery|courier/i.test(t)) return 'delivery';
  return null;
}

function parseAmountsFromText(text) {
  const out = {};
  const upper = text.toUpperCase();
  const pairs = [
    { re: /(\d[\d\s.,]*)\s*(USDT|USDC)\b/i, cur: 'USDT', field: 'give' },
    { re: /(\d[\d\s.,]*)\s*(USD)\b/i, cur: 'USD', field: 'give' },
    { re: /(\d[\d\s.,]*)\s*(EUR)\b/i, cur: 'EUR', field: 'give' },
    { re: /(\d[\d\s.,]*)\s*(ARS)\b/i, cur: 'ARS', field: 'get' },
    { re: /(\d[\d\s.,]*)\s*(RUB)\b/i, cur: 'RUB', field: 'get' },
  ];
  for (const { re, cur, field } of pairs) {
    const m = text.match(re);
    if (m) {
      const n = Number(String(m[1]).replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
      if (!Number.isNaN(n) && n > 0) {
        if (field === 'give' && !out.giveAmount) {
          out.giveCurrency = cur;
          out.giveAmount = n;
        } else if (field === 'get' && !out.getAmount) {
          out.getCurrency = cur;
          out.getAmount = n;
        }
      }
    }
  }
  if (/отдаю|меняю|give|send/i.test(text) && out.giveAmount) {
    /* keep */
  }
  return out;
}

function regexExtract(userText) {
  const fields = parseAmountsFromText(userText);
  const dm = normalizeDeliveryMethod(userText);
  if (dm) fields.deliveryMethod = dm;

  const addr =
    userText.match(/(?:адрес|address|улиц|av\.|avenida|calle)[:\s]*([^\n.]{8,80})/i) ||
    userText.match(/([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+\d{2,5}(?:\s*,\s*[^.\n]{0,40})?)/);
  if (addr && fields.deliveryMethod === 'delivery') {
    fields.address = addr[1].trim();
  }

  const timeSlot = userText.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (timeSlot) fields.deliveryTime = `${timeSlot[1]}-${timeSlot[2]}`;

  const dateMatch = userText.match(
    /(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|сегодня|завтра|today|tomorrow)/i
  );
  if (dateMatch) fields.deliveryDate = dateMatch[1];

  return fields;
}

async function extractWithGemini(genAI, userText, recentLines) {
  if (!genAI) return {};
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
    });
    const ctx = (recentLines || []).slice(-8).join('\n');
    const prompt = `Extract exchange order fields from the conversation. Return ONLY compact JSON, no markdown:
{"giveCurrency":null|"USDT"|"USD"|"EUR","giveAmount":null|number,"getCurrency":null|"ARS"|"USD"|"EUR"|"RUB","getAmount":null|number,"deliveryMethod":null|"pickup"|"delivery","address":null|string,"deliveryDate":null|string,"deliveryTime":null|string}

Rules:
- pickup = office/самовывоз; delivery = courier/доставка
- Use numbers without spaces
- null if unknown

Recent chat:
${ctx}

Latest user message:
${userText}`;

    const result = await model.generateContent(prompt);
    const raw = result.response?.text?.() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.deliveryMethod) {
      const m = String(parsed.deliveryMethod).toLowerCase();
      if (m.includes('pick') || m.includes('office') || m.includes('самов')) parsed.deliveryMethod = 'pickup';
      else if (m.includes('deliv') || m.includes('courier') || m.includes('курьер'))
        parsed.deliveryMethod = 'delivery';
    }
    return parsed;
  } catch (e) {
    console.warn('chatOrderDraft extract:', e.message || e);
    return {};
  }
}

function isDraftReady(draft) {
  if (
    !draft.giveCurrency ||
    !draft.giveAmount ||
    !draft.getCurrency ||
    !draft.getAmount ||
    !draft.deliveryMethod
  ) {
    return false;
  }
  if (draft.deliveryMethod === 'delivery') {
    return Boolean(draft.address && String(draft.address).length > 4);
  }
  return true;
}

function buildOrderBodyFromDraft(draft, telegramUser) {
  const isPickup = draft.deliveryMethod === 'pickup';
  const give = String(draft.giveCurrency || 'USDT').toUpperCase();
  const giveAmt = draft.giveAmount;
  const deliveryCost =
    isPickup || (give === 'USDT' && giveAmt >= 500) ? '0 USDT' : '3.5 USDT';

  return {
    deals: [
      {
        give,
        giveCurrency: give,
        giveAmount: String(draft.giveAmount),
        get: draft.getCurrency,
        getCurrency: draft.getCurrency,
        getAmount: String(draft.getAmount),
      },
    ],
    deliveryMethod: draft.deliveryMethod,
    address: isPickup ? OFFICE_ADDRESS : draft.address,
    deliveryDate: draft.deliveryDate || 'As agreed',
    deliveryTime: draft.deliveryTime || 'Flexible',
    deliveryCost,
    deliveryFee: deliveryCost === '0 USDT' ? 0 : 3.5,
    paymentMethod: give,
    language: draft.language || 'ru',
    source: 'Telegram Chat',
    clientName: [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(' '),
    client: telegramUser?.username ? `@${telegramUser.username}` : '',
  };
}

function formatDraftSummary(draft) {
  const dm =
    draft.deliveryMethod === 'pickup'
      ? '🏢 Самовывоз (офис)'
      : '🚚 Доставка курьером';
  const addr =
    draft.deliveryMethod === 'pickup'
      ? OFFICE_ADDRESS
      : draft.address || '—';
  const lines = [
    '📋 <b>Ваш заказ:</b>',
    '',
    `• Отдаёте: <b>${draft.giveAmount} ${draft.giveCurrency}</b>`,
    `• Получаете: <b>${draft.getAmount} ${draft.getCurrency}</b>`,
    `• Способ: ${dm}`,
    `• Адрес: ${addr}`,
  ];
  if (draft.deliveryDate) lines.push(`• Дата: ${draft.deliveryDate}`);
  if (draft.deliveryTime) lines.push(`• Время: ${draft.deliveryTime}`);
  lines.push('', CONFIRM_PROMPT);
  return lines.join('\n');
}

function isConfirmYes(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[!.,]+$/g, '');
  return /^(да|yes|si|sí|ok|ок|подтверждаю|confirm|confirmar|yep|ага|верно)$/.test(t);
}

function isConfirmNo(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  return /^(нет|no|неа|отмена|cancel|cancelar|не подтверждаю)$/.test(t);
}

function isOrderRelated(text) {
  return /обмен|usdt|usd|eur|ars|rub|доставк|курьер|самовывоз|офис|адрес|меняю|получ|отда|заказ|confirm|подтверд/i.test(
    text
  );
}

function shouldTrackDraft(chatId, userText, draft) {
  if (draft.status === 'awaiting_confirm' || draft.status === 'collecting') {
    if (draft.giveAmount || draft.confirmAsked) return true;
  }
  return isOrderRelated(userText);
}

async function updateDraftFromMessage(genAI, chatId, userText, recentLines) {
  const draft = getDraft(chatId);
  if (!shouldTrackDraft(chatId, userText, draft)) return draft;

  const fromRegex = regexExtract(userText);
  mergeDraft(draft, fromRegex);

  const fromAi = await extractWithGemini(genAI, userText, recentLines);
  mergeDraft(draft, fromAi);

  return draft;
}

module.exports = {
  getDraft,
  clearDraft,
  mergeDraft,
  updateDraftFromMessage,
  isDraftReady,
  buildOrderBodyFromDraft,
  formatDraftSummary,
  isConfirmYes,
  isConfirmNo,
  CONFIRM_PROMPT,
};

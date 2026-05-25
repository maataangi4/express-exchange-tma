/**

 * Express Exchange server:

 * - @exexchange_bot (Gemini AI)

 * - Orders bot (Подтвердить → Google Sheets)

 * - POST /api/orders из мини-приложения

 */



const path = require('path');

const fs = require('fs');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const { buildSystemPrompt, matchLocalReply } = require('./knowledge');
const { getLiveRatesBlock, buildRatesOnlyReply, isRatesQuestion } = require('./liveRatesForBot');
const chatOrderDraft = require('./chatOrderDraft');
const { submitOrder } = require('./orderSubmit');

const { createHttpServer } = require('./httpServer');

const { startOrdersBotPoll } = require('./ordersBot');
const walletStore = require('./walletStore');



const envLocal = path.join(__dirname, '..', '.env.development.local');

const envFile = path.join(__dirname, '..', '.env');

if (fs.existsSync(envLocal)) require('dotenv').config({ path: envLocal });

else if (fs.existsSync(envFile)) require('dotenv').config({ path: envFile });

else require('dotenv').config();



const BOT_TOKEN = process.env.EXEXCHANGE_BOT_TOKEN || process.env.REACT_APP_EXEXCHANGE_BOT_TOKEN;

const ORDERS_BOT_TOKEN = process.env.ORDERS_BOT_TOKEN;

const ORDERS_ADMIN_CHAT_ID = process.env.ORDERS_ADMIN_CHAT_ID || '6489489271';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MINI_APP_URL = process.env.MINI_APP_URL || process.env.REACT_APP_MINI_APP_URL || '';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

const GEMINI_FALLBACK_MODELS = (

  process.env.GEMINI_FALLBACK_MODELS ||

  'gemini-2.5-flash-lite,gemini-flash-lite-latest,gemini-2.5-flash'

)

  .split(',')

  .map((m) => m.trim())

  .filter(Boolean);

const PORT = Number(process.env.BOT_SERVER_PORT || 3001);



if (!BOT_TOKEN) {

  console.error('❌ Задайте EXEXCHANGE_BOT_TOKEN в .env.development.local');

  process.exit(1);

}

if (!GEMINI_API_KEY) {

  console.error('❌ Задайте GEMINI_API_KEY');

  process.exit(1);

}



const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SYSTEM_PROMPT = buildSystemPrompt(MINI_APP_URL);

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);



function getModelChain() {

  return [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];

}



function getGenerativeModel(modelName) {

  return genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });

}



function parseRetryMs(err) {

  const m = (err?.message || String(err)).match(/retry in ([\d.]+)s/i);

  return m ? Math.min(Math.ceil(parseFloat(m[1]) * 1000) + 500, 60000) : 0;

}



function isRateLimit(err) {

  const msg = err?.message || String(err);

  return err?.status === 429 || msg.includes('429') || msg.includes('quota');

}



const chatHistory = new Map();

const MAX_HISTORY = 12;



function getHistory(chatId) {

  if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);

  return chatHistory.get(chatId);

}



function pushHistory(chatId, role, text) {

  const h = getHistory(chatId);

  h.push({ role, parts: [{ text }] });

  while (h.length > MAX_HISTORY) h.shift();

}



async function tg(method, body) {

  const res = await fetch(`${TG}/${method}`, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(body),

  });

  const data = await res.json();

  if (!data.ok) console.error('Telegram API:', method, data);

  return data;

}



async function sendText(chatId, text) {

  const chunks = [];

  let rest = text;

  while (rest.length > 4000) {

    let cut = rest.lastIndexOf('\n', 4000);

    if (cut < 2000) cut = 4000;

    chunks.push(rest.slice(0, cut));

    rest = rest.slice(cut).trimStart();

  }

  if (rest) chunks.push(rest);

  for (const chunk of chunks) await tg('sendMessage', { chat_id: chatId, text: chunk });

}



async function sendHtml(chatId, text) {

  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });

}



async function askGeminiWithModel(chatId, userText, modelName) {

  const chat = getGenerativeModel(modelName).startChat({ history: getHistory(chatId) });

  const result = await chat.sendMessage(userText);

  const reply = result.response.text()?.trim() || 'Попробуйте переформулировать вопрос.';

  pushHistory(chatId, 'user', userText);

  pushHistory(chatId, 'model', reply);

  return reply;

}



async function askGeminiWithFallback(chatId, userText) {

  let lastErr;

  for (const modelName of getModelChain()) {

    try {

      return await askGeminiWithModel(chatId, userText, modelName);

    } catch (err) {

      lastErr = err;

      const retryMs = isRateLimit(err) ? parseRetryMs(err) : 0;

      if (retryMs > 0) {

        await sleep(retryMs);

        try {

          return await askGeminiWithModel(chatId, userText, modelName);

        } catch (retryErr) {

          lastErr = retryErr;

        }

      }

    }

  }

  throw lastErr;

}



async function handleMessage(msg) {

  const chatId = msg.chat.id;

  const text = (msg.text || '').trim();

  const from = msg.from;

  if (!text) return;



  const draft = chatOrderDraft.getDraft(chatId);

  if (draft.status === 'awaiting_confirm' && chatOrderDraft.isConfirmYes(text)) {
    const body = chatOrderDraft.buildOrderBodyFromDraft(draft, from);
    const result = await submitOrder({
      body,
      telegramUser: from,
      ordersBotToken: ORDERS_BOT_TOKEN,
      ordersAdminChatId: ORDERS_ADMIN_CHAT_ID,
      clientBotToken: BOT_TOKEN,
    });
    chatOrderDraft.clearDraft(chatId);
    if (result.ok) {
      await sendText(
        chatId,
        `✅ Заявка оформлена!\n\nНомер заказа: ${result.orderId}\n\nМенеджер подтвердит заявку в ближайшее время.`
      );
    } else {
      await sendText(
        chatId,
        'Не удалось оформить заказ. Напишите @Natasha_ExpressExchange или оформите в мини-приложении.'
      );
    }
    return;
  }

  if (draft.status === 'awaiting_confirm' && chatOrderDraft.isConfirmNo(text)) {
    draft.status = 'collecting';
    draft.confirmAsked = false;
    await sendText(chatId, 'Заказ не оформлен. Если захотите продолжить — уточните сумму и доставку.');
    return;
  }

  if (draft.status === 'awaiting_confirm') {
    await sendHtml(
      chatId,
      'Для подтверждения напишите <b>ДА</b>.\nЧтобы отменить — <b>НЕТ</b>.'
    );
    return;
  }



  if (text === '/start' || text.startsWith('/start ')) {
    const welcome =
      'Здравствуйте! 👋\n\nЯ помощник Express Exchange — обмен валют в Буэнос-Айресе.\n\n' +
      'Спросите курс, доставку или заявку — оформим в чате (в конце напишите ДА) или в мини-приложении.\n' +
      'Могу и по городу: сим-карта, где поесть, районы, транспорт — спрашивайте свободно.';

    let extra = '';
    const payload = text.startsWith('/start ') ? text.slice(7).trim() : '';
    if (payload.toLowerCase().startsWith('ref_')) {
      const ref = walletStore.registerReferral(String(chatId), payload);
      if (ref.ok) {
        extra =
          '\n\n👋 Вы перешли по приглашению друга.' +
          `\n🎁 После первого подтверждённого обмена вам начислят ${walletStore.REFERRED_REWARD} бонусов, а другу — ${walletStore.REFERRER_REWARD}.`;
      } else if (ref.reason === 'existing_user') {
        extra =
          '\n\nℹ️ Вы уже зарегистрированы — бонус по ссылке доступен только новым пользователям.';
      } else if (ref.reason === 'self_referral') {
        extra = '\n\nℹ️ Нельзя использовать свою собственную ссылку.';
      } else if (ref.reason === 'circular_referral') {
        extra =
          '\n\nℹ️ Взаимное приглашение недоступно: этот друг уже перешёл по вашей ссылке, повторные бонусы не начисляются.';
      } else if (ref.reason === 'already_referred') {
        extra = '\n\nℹ️ Вы уже привязаны к другому приглашению — сменить нельзя.';
      }
    }

    await sendText(chatId, welcome + extra);
    return;
  }



  if (text === '/help') {

    await sendText(chatId, 'Напишите вопрос или откройте мини-приложение для заявки 📱');

    return;

  }



  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });

  let ratesCtx = { block: '', data: null };
  try {
    if (isRatesQuestion(text)) ratesCtx = await getLiveRatesBlock();
  } catch (e) {
    console.warn('live rates for bot:', e.message || e);
  }

  const geminiInput = ratesCtx.block
    ? `${ratesCtx.block}\n\n---\nВопрос клиента: ${text}`
    : text;

  try {

    await sendText(chatId, await askGeminiWithFallback(chatId, geminiInput));

    const historyLines = getHistory(chatId).map(
      (h) => `${h.role === 'user' ? 'Клиент' : 'Бот'}: ${h.parts[0]?.text || ''}`
    );
    const updatedDraft = await chatOrderDraft.updateDraftFromMessage(
      genAI,
      chatId,
      text,
      historyLines
    );
    if (chatOrderDraft.isDraftReady(updatedDraft) && !updatedDraft.confirmAsked) {
      updatedDraft.status = 'awaiting_confirm';
      updatedDraft.confirmAsked = true;
      await sendHtml(chatId, chatOrderDraft.formatDraftSummary(updatedDraft));
    }

  } catch (err) {

    const local = matchLocalReply(text);

    if (local === '__LIVE_RATES__') {
      try {
        const ctx = ratesCtx.block ? ratesCtx : await getLiveRatesBlock();
        await sendText(chatId, buildRatesOnlyReply(ctx.data));
      } catch (e2) {
        await sendText(chatId, buildRatesOnlyReply(null));
      }
    } else if (local) await sendText(chatId, local);

    else

      await sendText(

        chatId,

        'Сейчас не могу обработать запрос 😔 Напишите @Natasha_ExpressExchange'

      );

    const historyLines = getHistory(chatId).map(
      (h) => `${h.role === 'user' ? 'Клиент' : 'Бот'}: ${h.parts[0]?.text || ''}`
    );
    const updatedDraft = await chatOrderDraft.updateDraftFromMessage(
      genAI,
      chatId,
      text,
      historyLines
    );
    if (chatOrderDraft.isDraftReady(updatedDraft) && !updatedDraft.confirmAsked) {
      updatedDraft.status = 'awaiting_confirm';
      updatedDraft.confirmAsked = true;
      await sendHtml(chatId, chatOrderDraft.formatDraftSummary(updatedDraft));
    }

  }

}



function sleep(ms) {

  return new Promise((r) => setTimeout(r, ms));

}



async function pollExexchangeBot() {

  await fetch(`${TG}/deleteWebhook?drop_pending_updates=true`);

  let offset = 0;

  console.log(`🤖 exexchange bot + Gemini (${GEMINI_MODEL})`);

  while (true) {

    try {

      const res = await fetch(`${TG}/getUpdates?timeout=50&offset=${offset}`);

      const data = await res.json();

      if (!data.ok) {

        await sleep(5000);

        continue;

      }

      for (const upd of data.result || []) {

        offset = upd.update_id + 1;

        if (upd.message) await handleMessage(upd.message);

      }

    } catch (e) {

      console.error('Poll error:', e.message);

      await sleep(3000);

    }

  }

}



createHttpServer({

  port: PORT,

  ordersBotToken: ORDERS_BOT_TOKEN,

  ordersAdminChatId: ORDERS_ADMIN_CHAT_ID,

  exexchangeBotToken: BOT_TOKEN,

  miniAppBotToken: BOT_TOKEN,

  allowDevWallet: process.env.WALLET_ALLOW_DEV_ID === '1' || process.env.NODE_ENV !== 'production',

});



startOrdersBotPoll({

  ordersBotToken: ORDERS_BOT_TOKEN,

  adminChatId: ORDERS_ADMIN_CHAT_ID,

  exexchangeBotToken: BOT_TOKEN,

}).catch((e) => console.error('Orders bot fatal:', e));



pollExexchangeBot();



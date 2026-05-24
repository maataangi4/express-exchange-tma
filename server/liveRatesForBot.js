const { fetchExchangeRatesFromSheet } = require('./exchangeRates');

/** Вопрос про курс / пары — подставляем актуальные цифры из Sheets (как в мини-приложении). */
function isRatesQuestion(text) {
  const t = String(text || '').toLowerCase().replace(/ё/g, 'е');
  return /курс|котиров|rate|usdt|usd|eur|rub|ars|песо|доллар|евро|рубл|обмен.*сколько|сколько.*за|цена|стоимость|курсом|пар/i.test(
    t
  );
}

function formatRatesLines(marketData) {
  if (!Array.isArray(marketData) || marketData.length === 0) return [];
  return marketData.map((m) => `• ${m.code} → ${m.target}: ${m.price}`);
}

/** Текст блока курсов для Gemini и локальных ответов. */
async function getLiveRatesBlock() {
  const data = await fetchExchangeRatesFromSheet();
  const lines = formatRatesLines(data.marketData);
  if (lines.length === 0) return { block: '', data };

  const updated = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString('ru-RU', { timeZone: 'America/Argentina/Buenos_Aires' })
    : 'сейчас';

  const block =
    `[АКТУАЛЬНЫЕ КУРСЫ EXPRESS EXCHANGE — только эти цифры, как на главной мини-приложения / вкладка Rates в Google Sheets]\n` +
    `Источник: ${data.source || 'sheets'}. Обновлено: ${updated} (Буэнос-Айрес).\n` +
    `${lines.join('\n')}\n` +
    `Если клиент спрашивает одну пару — ответь по строке выше. Несколько пар — перечисли нужные. «Все курсы» — весь список.`;

  return { block, data };
}

function buildRatesOnlyReply(data) {
  const lines = formatRatesLines(data?.marketData);
  if (lines.length === 0) {
    return 'Сейчас не удалось загрузить курсы. Откройте мини-приложение на главной или напишите @Natasha_ExpressExchange';
  }
  return (
    `Актуальные курсы Express Exchange (как в приложении):\n${lines.join('\n')}\n\n` +
    'Финальный курс фиксирует менеджер при подтверждении заявки.'
  );
}

module.exports = {
  isRatesQuestion,
  getLiveRatesBlock,
  buildRatesOnlyReply,
};

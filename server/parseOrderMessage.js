/** Парсинг текста заявки из Telegram (если сервер перезапускали и store пуст) */
function parseOrderFromAdminMessage(text) {
  if (!text) return null;
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const orderIdMatch = plain.match(/#(ORD-\d+)/i) || plain.match(/(ORD-\d+)/i);
  const orderId = orderIdMatch ? orderIdMatch[1] : null;

  const clientMatch =
    plain.match(/Client:\s*(.+?)(?=Order details|Детали|✔|🔘|$)/i) ||
    plain.match(/Клиент:\s*(.+?)(?=Детали|Order details|✔|🔘|$)/i);
  const clientLine = clientMatch ? clientMatch[1].trim() : '';

  const giveMatches = [
    ...plain.matchAll(/(?:Gives|Вы заплатите|Отдаёт|Отдаёте):\s*([\d.,]+)\s*(\w+)/gi),
  ];
  const getMatches = [
    ...plain.matchAll(/(?:Receives|Вы получите|Получает|Получаете):\s*([\d.,]+)\s*(\w+)/gi),
  ];

  const deals = [];
  const pairMatches = [
    ...plain.matchAll(/(?:Exchange|Обмен)(?:\s*\d+)?:\s*(\w+)\s*(?:→|->|>)\s*(\w+)/gi),
  ];
  for (let i = 0; i < Math.max(giveMatches.length, getMatches.length, pairMatches.length); i++) {
    deals.push({
      giveCurrency: pairMatches[i]?.[1] || giveMatches[i]?.[2] || '',
      getCurrency: pairMatches[i]?.[2] || getMatches[i]?.[2] || '',
      giveAmount: giveMatches[i]?.[1] || '',
      getAmount: getMatches[i]?.[1] || '',
    });
  }

  const pick = (re) => {
    const m = plain.match(re);
    if (!m || m[1] == null) return '';
    return String(m[1]).trim();
  };

  const isOfficePickup = /(?:Address|Адрес):\s*Офис/i.test(plain) || /(?:Address|Адрес):\s*Office/i.test(plain);

  const userMatch = clientLine.match(/\(@(\w+)\)/);
  return {
    orderId,
    clientName: clientLine.replace(/\(@\w+\)/, '').trim(),
    clientTelegram: userMatch ? `(@${userMatch[1]})` : '',
    deals,
    deliveryCost:
      pick(/Delivery cost:\s*([^\n]+)/i) ||
      pick(/Стоимость доставки:\s*([^\n]+)/i) ||
      pick(/Доставка:\s*([^\n]+)/i),
    paymentMethod:
      pick(/Payment:\s*([^\n]+)/i) ||
      pick(/Способ оплаты:\s*([^\n]+)/i) ||
      pick(/Оплата:\s*([^\n]+)/i),
    cardAccount: pick(/(?:Account details|Реквизиты):\s*([^\n]+)/i),
    address: pick(/(?:Address|Адрес)(?: доставки)?:\s*([^\n]+)/i),
    deliveryDate: pick(/(?:Date|Дата)(?: доставки)?:\s*([^\n]+)/i),
    deliveryTime: pick(/(?:Time|Время)(?: доставки)?:\s*([^\n]+)/i),
    type: isOfficePickup ? 'Офис' : 'Доставка',
    deliveryMethod: isOfficePickup ? 'pickup' : 'delivery',
    source: 'TMA Express Exchange (parsed)',
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
  };
}

module.exports = { parseOrderFromAdminMessage };

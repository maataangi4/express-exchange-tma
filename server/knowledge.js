/**
 * База знаний для AI-оператора Express Exchange (Буэнос-Айрес).
 * Обновляйте курсы и условия здесь — бот подхватит при перезапуске.
 */

const MARKET_RATES = [
  { pair: 'USDT → ARS (наличные)', rate: '1420', note: 'ориентир, уточняется при заявке' },
  { pair: 'USDT → ARS (на карту)', rate: '1445', note: 'перевод на банковскую карту ARS' },
  { pair: 'USDT → USD', rate: '~1.01%', note: 'комиссия сети/канала' },
  { pair: 'USD → ARS', rate: '1400', note: '' },
  { pair: 'EUR → ARS', rate: '1550', note: '' },
  { pair: 'RUB → ARS', rate: '17.8', note: 'за 1 RUB' },
];

const KNOWLEDGE = {
  company: 'Express Exchange',
  city: 'Buenos Aires, Argentina',
  office: {
    address: 'Av. Los Incas 3390, Buenos Aires',
    pickup: 'Самовывоз из офиса (бесплатно)',
  },
  delivery: {
    courier: 'Курьер по Буэнос-Айресу',
    fee: '3.50 USDT (бесплатно при сумме «отдаю» от 500 USDT, 500 USD, 500 EUR или эквивалента в ARS/RUB)',
    freeFromGiveUsdt: 500,
    slots: ['10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00', '18:00–20:00'],
    minUsdtForCourier: 'от 100 USDT для курьера; меньшие суммы — самовывоз из офиса',
  },
  payment: ['Наличные ARS/USD', 'USDT', 'Перевод на карту ARS (ARS_CARD)', 'Банковские реквизиты по заявке'],
  services: [
    'Обмен валют (USDT, USD, EUR, RUB, ARS)',
    'Оплата услуг: связь, свет, газ, вода, интернет, SUBE, аренда, медицина и др.',
    'Mercado Libre выкуп',
  ],
  orderFlow: [
    'В чате можно собрать заявку: сумма, валюта, способ (самовывоз/курьер), адрес и слот.',
    'Когда все детали уточнены, бот спросит: «Хотите подтвердить заказ? Напишите ДА».',
    'После «ДА» заявка уходит менеджеру, клиент получает номер ORD-XXXXXX.',
    '«НЕТ» — заказ не оформляется. Альтернатива: мини-приложение (кнопка меню бота).',
    'Менеджер подтверждает заявку — клиенту приходит уведомление в этот чат.',
  ],
  faq: [
    { q: 'Сколько ждать?', a: 'Обычно менеджер связывается в течение 5–15 минут в рабочее время. Доставка — в выбранный слот в тот же или следующий день.' },
    { q: 'Минимальная сумма?', a: 'Для курьера от ~100 USDT. Меньшие суммы — самовывоз в офисе на Av. Los Incas 3390.' },
    { q: 'Безопасно?', a: 'Работаем официально, проверяйте курс и сумму перед оплатой. Не меняйте деньги на улице (arbolitos).' },
    { q: 'Кэшбэк?', a: 'Есть бонусная программа в приложении (кэшбэк до 0.2% при приглашении друзей).' },
  ],
  /** Повседневные советы по Буэнос-Айресу — не про обмен, а про жизнь в городе */
  argentinaLife: {
    simCards: {
      operators: ['Claro', 'Movistar', 'Personal', 'Tuenti (дочерний Movistar, часто дешевле)'],
      where: [
        'Официальные салоны операторов (в торговых центрах и на авенидах)',
        'Kioscos (уличные ларьки с табличкой оператора)',
        'Carrefour, Coto, Easy — часто стоят стойки с SIM',
        'Аэропорты EZE (Ezeiza) и AEP (Aeroparque) — дороже, зато сразу по прилёту',
        'Mercado Libre / онлайн — иногда eSIM, но для туриста проще купить физическую в салоне',
      ],
      tips: [
        'Нужен паспорт; иногда просят адрес в Аргентине (можно адрес отеля/ Airbnb)',
        'Пополнение: приложение оператора, Rapipago, Pago Fácil, кассы в супермаркетах',
        'Для интернета смотрите пакеты «datos» / prepago; без контракта',
      ],
    },
    transport: [
      'SUBE — карта метро/автобуса, покупка в киосках и станциях, пополнение в приложении SUBE o en Rapipago',
      'Uber / Cabify / DiDi — удобно, сравнивайте цену в час пик',
      'Метро (subte) — быстро между центром, Palermo, Recoleta; осторожно с вещами в час пик',
      'Такси по улице — лучше официальные (радио-taxi), не соглашайтесь на «arbolitos» у обмена',
    ],
    safety: [
      'Не меняйте валюту на улице (arbolitos) — только через сервис или офис',
      'Вечером в незнакомых районах — такси/приложение, не демонстрировать телефон на улице',
      'Мелкие купюры ARS для чаевых и мелочи; крупные — в безопасном месте',
    ],
    neighborhoods: {
      Palermo: 'Кафе, бары, brunch, молодёжная атмосфера (Palermo Soho / Hollywood)',
      Recoleta: 'Спокойнее, музеи, кладбище Recoleta, рестораны среднего+ ценника',
      'San Telmo': 'Воскресный рынок, антиквариат, танго, туристическая, но колоритная',
      Microcentro: 'Деловой центр, Obelisco, Café Tortoni — днём оживлённо',
      Belgrano: 'Спокойный жилой, рядом офис Express Exchange (Los Incas)',
      'Puerto Madero': 'Набережная, рестораны подороже, безопаснее вечером',
    },
    food: {
      asado: [
        'Don Julio (Palermo) — топ, бронь заранее',
        'La Cabrera / Cabrera Norte — классика, порции щедрые',
        'El Pobre Luis (Béccar, чуть за городом) — легенда, нужна поездка',
        'Parrilla Peña, La Brigada — хороший средний уровень без космических цен',
      ],
      empanadas: [
        'La Morada (Belgrano)',
        'El Sanjuanino (Recoleta / Centro)',
        '1810 (Palermo)',
      ],
      pizza: [
        'El Cuartito, Güerrín, Banchero — Corrientes «пицца-стрит»',
        'Las Cuartetas — толстый край, местный фаворит',
      ],
      milanesa: [
        'El Obrero (La Boca, колоритно, днём)',
        'Club de la Milanesa — сеть, надёжно для семьи',
      ],
      cafeBrunch: [
        'Lattente, Coffee Town (Palermo)',
        'Café Tortoni (Microcentro, историческое)',
        'LAB Tostadores, Ninina (Palermo brunch)',
      ],
      other: [
        'Helado: Cadore, Rapa Nui, Freddo',
        'Medialunas: La Pain Quotidienne, croissants в любой panadería утром',
        'Mercado de San Telmo (воскресенье) — стритфуд и сувениры',
        'Choripán: уличные у парков и на футбольных матчах',
      ],
    },
    practical: [
      'Чаевые: 10% в ресторанах, по желанию в кафе',
      'Вода из крана в BA обычно питьевая, но многие берут bidón / бутылки',
      'Розетки тип C/I, 220V — переходник может понадобиться',
      'Выходные: многие магазины закрыты или до обеда в воскресенье',
    ],
  },
  support: '@Natasha_ExpressExchange',
};

function formatArgentinaLifeBlock() {
  const L = KNOWLEDGE.argentinaLife;
  const hood = Object.entries(L.neighborhoods)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join('\n');
  const foodSections = Object.entries(L.food)
    .map(([key, places]) => `  ${key}: ${places.join('; ')}`)
    .join('\n');
  return `СИМ-КАРТЫ (операторы: ${L.simCards.operators.join(', ')}):
Где купить: ${L.simCards.where.join('; ')}
Советы: ${L.simCards.tips.join('; ')}

ТРАНСПОРТ: ${L.transport.join('; ')}

БЕЗОПАСНОСТЬ: ${L.safety.join('; ')}

РАЙОНЫ BA:
${hood}

ЕДА И ЗАВЕДЕНИЯ (ориентиры, не реклама — уточняйте часы и бронь):
${foodSections}

БЫТ: ${L.practical.join('; ')}`;
}

function buildSystemPrompt(miniAppUrl) {
  const ratesText = MARKET_RATES.map((r) => `• ${r.pair}: ${r.rate}${r.note ? ` (${r.note})` : ''}`).join('\n');
  const faqText = KNOWLEDGE.faq.map((f) => `В: ${f.q}\nО: ${f.a}`).join('\n\n');

  return `Ты оператор обменника Express Exchange в Буэнос-Айресе. Ты общаешься в Telegram с клиентом от имени сервиса.

ХАРАКТЕР:
- По обмену и заявкам — коротко, 2–5 предложений.
- По жизни в Аргентине (еда, SIM, районы, транспорт, быт) — можно свободнее: списки 3–7 пунктов, конкретные названия и районы, как местный гид. Это нормальная часть диалога, не отказывай «я только обмен».
- Если вопрос не про обмен — ответь по сути, в конце одной строкой напомни, что по курсу и заявке помогаете как Express Exchange.
- Дружелюбно, по-деловому, на «вы».
- Умеренно используй эмодзи (1–2 на сообщение).
- Советы по еде/местам — ориентиры из базы; цены и часы уточняйте «на месте» / Google Maps. Не выдумывай заведения, которых нет в базе.
- Если клиент хочет обмен — уточняй сумму, валюту получения, самовывоз или курьер, адрес и слот. Не оформляй заказ сам: когда детали собраны, система спросит подтверждение «ДА».
- Мини-приложение — альтернатива, не обязательный финальный шаг в чате.
- НИКОГДА не присылай ссылку trycloudflare / dev-tunnel / localhost для «завершения заказа».
- Если в сообщении клиента есть блок «АКТУАЛЬНЫЕ КУРСЫ EXPRESS EXCHANGE» — используй ТОЛЬКО цифры из этого блока (это те же курсы, что на главной мини-приложения и в Google Sheets). Не округляй и не заменяй примерными значениями.
- Если блока с курсами нет — скажи, что точный курс смотрят в мини-приложении на главной, и что финальный курс фиксирует менеджер при подтверждении.
- По курсам и условиям обмена не обещай то, чего нет в базе знаний.
- Язык ответа: тот же, на котором пишет клиент (русский, английский, испанский и т.д.).

КУРСЫ (ориентир):
${ratesText}

ОФИС / САМОВЫВОЗ:
${KNOWLEDGE.office.address}
${KNOWLEDGE.office.pickup}

ДОСТАВКА:
${KNOWLEDGE.delivery.courier}. Стоимость: ${KNOWLEDGE.delivery.fee}.
Бесплатная доставка: сумма, которую клиент ОТДАЁТ, от ${KNOWLEDGE.delivery.freeFromGiveUsdt} USDT или эквивалента (USD, EUR, ARS, RUB).
Слоты: ${KNOWLEDGE.delivery.slots.join(', ')}.
${KNOWLEDGE.delivery.minUsdtForCourier}

ОПЛАТА: ${KNOWLEDGE.payment.join('; ')}.

УСЛУГИ: ${KNOWLEDGE.services.join('; ')}.

КАК ОФОРМИТЬ ЗАЯВКУ:
${KNOWLEDGE.orderFlow.join(' ')}
${miniAppUrl ? `Ссылка на мини-приложение: ${miniAppUrl}` : 'Мини-приложение открывается кнопкой меню внизу в этом боте.'}

FAQ:
${faqText}

ПОДДЕРЖКА (живой человек): ${KNOWLEDGE.support}

ЖИЗНЬ В БУЭНОС-АЙРЕСЕ (можно отвечать на такие вопросы):
${formatArgentinaLifeBlock()}

ПРИМЕР — SIM: «Где купить симку?»
Дай операторов, 3–4 места покупки, что нужен паспорт, как пополнить. Коротко.

ПРИМЕР — еда: «Где поесть асада в Palermo?»
Список 3–5 parrillas из базы, совет забронировать, район. Можно спросить бюджет/дату.

ПРИМЕР — клиент: «Хочу обменять 500 USDT»
Ответь примерно так: подтверди сумму, спроси валюту получения (ARS наличные / на карту / USD), самовывоз или курьер, адрес и слот. Когда всё ясно — кратко резюмируй; подтверждение «ДА» сделает система отдельным сообщением.

Не используй markdown-заголовки (#). Можно **жирный** через HTML только если Telegram HTML — лучше plain text.`;
}

/** Простые ответы без AI, если Gemini недоступен */
function matchLocalReply(text) {
  const t = (text || '').toLowerCase().replace(/ё/g, 'е');

  if (/оформ|заказ|заявк|как.*обмен|начать|mini.?app|приложен/.test(t)) {
    return (
      'Заявку можно оформить в этом чате или в мини-приложении.\n\n' +
      'В чате: укажите сумму, валюту, доставку/самовывоз и адрес — бот спросит «Напишите ДА» для подтверждения.\n' +
      'В приложении: кнопка «Ex Exchange App» внизу чата.\n\n' +
      'После подтверждения придёт номер ORD-XXXXXX. Менеджер свяжется в течение 5–15 минут.'
    );
  }
  if (/курс|rate|usdt|доллар|песо|ars|eur|rub|котиров|пар/i.test(t)) {
    return '__LIVE_RATES__';
  }
  if (/доставк|курьер|palermo|офис|адрес|самовывоз/.test(t)) {
    return (
      `Доставка: ${KNOWLEDGE.delivery.courier}, ${KNOWLEDGE.delivery.fee}.\n` +
      `Слоты: ${KNOWLEDGE.delivery.slots.join(', ')}.\n` +
      `Офис: ${KNOWLEDGE.office.address} (${KNOWLEDGE.office.pickup}).`
    );
  }
  if (/помощ|менеджер|оператор|человек|связ/.test(t)) {
    return `Напишите менеджеру: ${KNOWLEDGE.support}`;
  }

  if (/симк|sim\s*card|simka|тариф|movistar|claro|personal|tuenti|телефон.*аргент|интернет.*сим/i.test(t)) {
    const s = KNOWLEDGE.argentinaLife.simCards;
    return (
      '📱 Сим-карты в BA:\n\n' +
      `Операторы: ${s.operators.join(', ')}\n\n` +
      'Где купить:\n' +
      s.where.map((w) => `• ${w}`).join('\n') +
      '\n\n' +
      s.tips.map((w) => `• ${w}`).join('\n') +
      '\n\nПо обмену и доставке наличных — с радостью поможем здесь же 🙂'
    );
  }

  if (
    /где поесть|поесть|ресторан|кафе|асад|asado|empanada|миланес|milanesa|пицц|pizza|стейк|parrilla|brunch|helado|морожен|choripan|еда в|кушать|обед|ужин|завтрак/i.test(
      t
    )
  ) {
    const f = KNOWLEDGE.argentinaLife.food;
    let block = '🍽 Ориентиры по еде в Buenos Aires:\n\n';
    if (/асад|asado|parrilla|стейк|мясо/i.test(t)) {
      block += 'Асада / parrilla:\n' + f.asado.map((x) => `• ${x}`).join('\n');
    } else if (/empanada|эмпанад/i.test(t)) {
      block += 'Эмпанадас:\n' + f.empanadas.map((x) => `• ${x}`).join('\n');
    } else if (/пицц|pizza/i.test(t)) {
      block += 'Пицца:\n' + f.pizza.map((x) => `• ${x}`).join('\n');
    } else if (/миланес|milanesa/i.test(t)) {
      block += 'Миланеса:\n' + f.milanesa.map((x) => `• ${x}`).join('\n');
    } else if (/кафе|brunch|завтрак|coffee/i.test(t)) {
      block += 'Кафе / brunch:\n' + f.cafeBrunch.map((x) => `• ${x}`).join('\n');
    } else {
      block +=
        'Асада:\n' +
        f.asado.slice(0, 3).map((x) => `• ${x}`).join('\n') +
        '\n\nЭмпанадас:\n' +
        f.empanadas.map((x) => `• ${x}`).join('\n') +
        '\n\nЕщё:\n' +
        f.other.slice(0, 4).map((x) => `• ${x}`).join('\n');
    }
    block += '\n\nЧасы и бронь лучше проверить в Google Maps. Нужен обмен валюты — напишите сумму и валюту.';
    return block;
  }

  if (/sube|метро|такси|uber|транспорт|как доехать|район|palermo|recoleta|san telmo|belgrano|puerto madero/i.test(t)) {
    const L = KNOWLEDGE.argentinaLife;
    const hood = Object.entries(L.neighborhoods)
      .map(([k, v]) => `• ${k}: ${v}`)
      .join('\n');
    return (
      '🚇 Транспорт: ' +
      L.transport.slice(0, 3).join('; ') +
      '.\n\n' +
      'Районы:\n' +
      hood +
      '\n\nОбмен и доставка ARS/USD/USDT — в этом чате или в мини-приложении.'
    );
  }

  if (/аргентин|буэнос|buenos aires|приехал|турист|жить в ba|эмиграц/i.test(t)) {
    return (
      'По Буэнос-Айресу могу подсказать: сим-карты, еда, районы, транспорт, безопасность.\n' +
      'Спросите конкретно — например «где купить SIM» или «где асада в Palermo».\n\n' +
      'Express Exchange: обмен USDT/USD/EUR/RUB/ARS, доставка курьером или офис Belgrano (Los Incas 3390).'
    );
  }

  return null;
}

module.exports = {
  KNOWLEDGE,
  MARKET_RATES,
  buildSystemPrompt,
  matchLocalReply,
  formatArgentinaLifeBlock,
};

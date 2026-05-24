/**
 * Уведомления по услугам: отдельный заголовок и подписи полей для каждой категории.
 */

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DIVIDER = '━━━━━━━━━━━━━━━';

const SUPPORTED_LANGS = ['ru', 'en', 'es', 'pt', 'zh'];

function normLang(lang) {
  const l = String(lang || 'ru').toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(l) ? l : 'ru';
}

function pickLang(dict, lang) {
  if (!dict) return '';
  return dict[lang] || dict.ru || dict.en || '';
}

/** @type {Record<string, { emoji: string, adminTitle: string, placed: Record<string,string>, confirmed: Record<string,string>, labels: Record<string, Record<string,string>>, showCode?: boolean }>} */
const SERVICE_CATALOG = {
  mobile: {
    emoji: '📱',
    adminTitle: 'Оплата мобильной связи',
    placed: {
      ru: 'Заявка принята: пополнение телефона',
      en: 'Request received: mobile top-up',
      es: 'Solicitud: recarga de celular',
      pt: 'Pedido: recarga de celular',
      zh: '申请已受理：手机充值',
    },
    confirmed: {
      ru: 'Подтверждено: оплата мобильной связи',
      en: 'Confirmed: mobile top-up',
      es: 'Confirmado: recarga de celular',
      pt: 'Confirmado: recarga de celular',
      zh: '已确认：手机充值',
    },
    labels: {
      provider: { ru: 'Оператор', en: 'Carrier', es: 'Operador', pt: 'Operadora', zh: '运营商' },
      account: { ru: 'Номер телефона', en: 'Phone number', es: 'Número de celular', pt: 'Telefone', zh: '手机号码' },
      amount: { ru: 'Сумма к оплате', en: 'Amount to pay', es: 'Monto a pagar', pt: 'Valor a pagar', zh: '支付金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
    showCode: true,
  },
  card: {
    emoji: '💳',
    adminTitle: 'Пополнение банковской / криптокарты',
    placed: {
      ru: 'Заявка принята: пополнение карты',
      en: 'Request received: card top-up',
      es: 'Solicitud: recarga de tarjeta',
      pt: 'Pedido: recarga de cartão',
      zh: '申请已受理：充值卡',
    },
    confirmed: {
      ru: 'Подтверждено: пополнение карты',
      en: 'Confirmed: card top-up',
      es: 'Confirmado: recarga de tarjeta',
      pt: 'Confirmado: recarga de cartão',
      zh: '已确认：充值卡',
    },
    labels: {
      provider: { ru: 'Банк / сервис', en: 'Bank / service', es: 'Banco / servicio', pt: 'Banco / serviço', zh: '银行/服务' },
      account: { ru: 'CBU / CVU / реквизиты', en: 'CBU / CVU / account', es: 'CBU / CVU', pt: 'CBU / CVU', zh: 'CBU/CVU账号' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
    showCode: true,
  },
  electricity: {
    emoji: '⚡',
    adminTitle: 'Оплата электричества',
    placed: {
      ru: 'Заявка принята: оплата света',
      en: 'Request received: electricity bill',
      es: 'Solicitud: pago de luz',
      pt: 'Pedido: conta de luz',
      zh: '申请已受理：电费',
    },
    confirmed: {
      ru: 'Подтверждено: оплата электричества',
      en: 'Confirmed: electricity payment',
      es: 'Confirmado: pago de luz',
      pt: 'Confirmado: conta de luz',
      zh: '已确认：电费',
    },
    labels: {
      provider: { ru: 'Компания', en: 'Utility company', es: 'Empresa', pt: 'Concessionária', zh: '电力公司' },
      account: { ru: 'Номер лицевого счёта', en: 'Account number', es: 'Nº de cliente', pt: 'Nº da conta', zh: '户号' },
      amount: { ru: 'Сумма (ARS / USDT)', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
  },
  gas: {
    emoji: '🔥',
    adminTitle: 'Оплата газа',
    placed: {
      ru: 'Заявка принята: оплата газа',
      en: 'Request received: gas bill',
      es: 'Solicitud: pago de gas',
      pt: 'Pedido: conta de gás',
      zh: '申请已受理：燃气费',
    },
    confirmed: {
      ru: 'Подтверждено: оплата газа',
      en: 'Confirmed: gas payment',
      es: 'Confirmado: pago de gas',
      pt: 'Confirmado: conta de gás',
      zh: '已确认：燃气费',
    },
    labels: {
      provider: { ru: 'Компания', en: 'Gas company', es: 'Empresa de gas', pt: 'Distribuidora', zh: '燃气公司' },
      account: { ru: 'Номер лицевого счёта', en: 'Account number', es: 'Nº de cliente', pt: 'Nº da conta', zh: '户号' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
  },
  water: {
    emoji: '💧',
    adminTitle: 'Оплата воды',
    placed: {
      ru: 'Заявка принята: оплата воды',
      en: 'Request received: water bill',
      es: 'Solicitud: pago de agua',
      pt: 'Pedido: conta de água',
      zh: '申请已受理：水费',
    },
    confirmed: {
      ru: 'Подтверждено: оплата воды',
      en: 'Confirmed: water payment',
      es: 'Confirmado: pago de agua',
      pt: 'Confirmado: conta de água',
      zh: '已确认：水费',
    },
    labels: {
      provider: { ru: 'Компания (AySA и др.)', en: 'Water company', es: 'Empresa de agua', pt: 'Concessionária', zh: '水务公司' },
      account: { ru: 'Номер лицевого счёта', en: 'Account number', es: 'Nº de cliente', pt: 'Nº da conta', zh: '户号' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
  },
  internet: {
    emoji: '📶',
    adminTitle: 'Оплата интернета / TV',
    placed: {
      ru: 'Заявка принята: оплата интернета',
      en: 'Request received: internet bill',
      es: 'Solicitud: pago de internet',
      pt: 'Pedido: internet / TV',
      zh: '申请已受理：网费',
    },
    confirmed: {
      ru: 'Подтверждено: оплата интернета',
      en: 'Confirmed: internet payment',
      es: 'Confirmado: pago de internet',
      pt: 'Confirmado: internet',
      zh: '已确认：网费',
    },
    labels: {
      provider: { ru: 'Провайдер', en: 'Provider', es: 'Proveedor', pt: 'Provedor', zh: '运营商' },
      account: { ru: 'Номер клиента / договор', en: 'Customer ID', es: 'Nº de cliente', pt: 'Nº do cliente', zh: '客户编号' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
  },
  transport: {
    emoji: '🚌',
    adminTitle: 'Пополнение SUBE',
    placed: {
      ru: 'Заявка принята: пополнение SUBE',
      en: 'Request received: SUBE top-up',
      es: 'Solicitud: carga SUBE',
      pt: 'Pedido: recarga SUBE',
      zh: '申请已受理：SUBE充值',
    },
    confirmed: {
      ru: 'Подтверждено: пополнение SUBE',
      en: 'Confirmed: SUBE top-up',
      es: 'Confirmado: carga SUBE',
      pt: 'Confirmado: SUBE',
      zh: '已确认：SUBE充值',
    },
    labels: {
      provider: { ru: 'Сервис', en: 'Service', es: 'Servicio', pt: 'Serviço', zh: '服务' },
      account: { ru: 'Номер карты SUBE', en: 'SUBE card number', es: 'Nº de tarjeta SUBE', pt: 'Nº SUBE', zh: 'SUBE卡号' },
      amount: { ru: 'Сумма пополнения (ARS)', en: 'Top-up amount (ARS)', es: 'Monto (ARS)', pt: 'Valor (ARS)', zh: '充值金额(ARS)' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
  },
  education: {
    emoji: '🎓',
    adminTitle: 'Оплата образования',
    placed: {
      ru: 'Заявка принята: оплата учёбы',
      en: 'Request received: education payment',
      es: 'Solicitud: pago educación',
      pt: 'Pedido: educação',
      zh: '申请已受理：教育缴费',
    },
    confirmed: {
      ru: 'Подтверждено: оплата образования',
      en: 'Confirmed: education payment',
      es: 'Confirmado: educación',
      pt: 'Confirmado: educação',
      zh: '已确认：教育缴费',
    },
    labels: {
      provider: { ru: 'Учреждение / тип', en: 'Institution', es: 'Institución', pt: 'Instituição', zh: '机构' },
      account: { ru: 'Реквизиты получателя', en: 'Recipient details', es: 'Datos del beneficiario', pt: 'Dados do beneficiário', zh: '收款信息' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Назначение / комментарий', en: 'Purpose / comment', es: 'Concepto', pt: 'Descrição', zh: '用途/备注' },
    },
    showCode: true,
  },
  health: {
    emoji: '🏥',
    adminTitle: 'Оплата медицины / prepaga',
    placed: {
      ru: 'Заявка принята: оплата медицины',
      en: 'Request received: health insurance payment',
      es: 'Solicitud: pago de prepaga',
      pt: 'Pedido: plano de saúde',
      zh: '申请已受理：医疗保险',
    },
    confirmed: {
      ru: 'Подтверждено: оплата медицины',
      en: 'Confirmed: health payment',
      es: 'Confirmado: prepaga',
      pt: 'Confirmado: saúde',
      zh: '已确认：医疗保险',
    },
    labels: {
      provider: { ru: 'Prepaga / клиника', en: 'Insurer / clinic', es: 'Prepaga', pt: 'Operadora', zh: '保险公司' },
      account: { ru: 'Номер клиента / реквизиты', en: 'Member ID / details', es: 'Nº de afiliado', pt: 'Nº / dados', zh: '会员号/收款信息' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
    showCode: true,
  },
  rent: {
    emoji: '🏠',
    adminTitle: 'Оплата жилья / expensas',
    placed: {
      ru: 'Заявка принята: оплата жилья',
      en: 'Request received: rent / housing payment',
      es: 'Solicitud: alquiler / expensas',
      pt: 'Pedido: aluguel / condomínio',
      zh: '申请已受理：房租/物业',
    },
    confirmed: {
      ru: 'Подтверждено: оплата жилья',
      en: 'Confirmed: housing payment',
      es: 'Confirmado: alquiler',
      pt: 'Confirmado: moradia',
      zh: '已确认：房租/物业',
    },
    labels: {
      provider: { ru: 'Тип платежа', en: 'Payment type', es: 'Tipo de pago', pt: 'Tipo', zh: '付款类型' },
      account: { ru: 'Реквизиты / адрес', en: 'Account / address', es: 'CBU / dirección', pt: 'Dados / endereço', zh: '账号/地址' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
    showCode: true,
  },
  other: {
    emoji: '📋',
    adminTitle: 'Другая услуга',
    placed: {
      ru: 'Заявка принята: прочая услуга',
      en: 'Request received: other service',
      es: 'Solicitud: otro servicio',
      pt: 'Pedido: outro serviço',
      zh: '申请已受理：其他服务',
    },
    confirmed: {
      ru: 'Подтверждено: прочая услуга',
      en: 'Confirmed: other service',
      es: 'Confirmado: otro servicio',
      pt: 'Confirmado: outro serviço',
      zh: '已确认：其他服务',
    },
    labels: {
      provider: { ru: 'Категория / сервис', en: 'Category / service', es: 'Servicio', pt: 'Serviço', zh: '类别' },
      account: { ru: 'Реквизиты / данные', en: 'Details', es: 'Datos', pt: 'Dados', zh: '信息' },
      amount: { ru: 'Сумма', en: 'Amount', es: 'Monto', pt: 'Valor', zh: '金额' },
      comment: { ru: 'Комментарий', en: 'Comment', es: 'Comentario', pt: 'Comentário', zh: '备注' },
    },
    showCode: true,
  },
  mercadolibre: {
    emoji: '🛒',
    adminTitle: 'Mercado Libre — выкуп и доставка',
    placed: {
      ru: 'Заявка принята: Mercado Libre',
      en: 'Request received: Mercado Libre purchase',
      es: 'Solicitud: compra Mercado Libre',
      pt: 'Pedido: Mercado Libre',
      zh: '申请已受理：Mercado Libre',
    },
    confirmed: {
      ru: 'Подтверждено: Mercado Libre',
      en: 'Confirmed: Mercado Libre',
      es: 'Confirmado: Mercado Libre',
      pt: 'Confirmado: Mercado Libre',
      zh: '已确认：Mercado Libre',
    },
    labels: {
      provider: { ru: 'Услуга', en: 'Service', es: 'Servicio', pt: 'Serviço', zh: '服务' },
      account: { ru: 'Платформа', en: 'Platform', es: 'Plataforma', pt: 'Plataforma', zh: '平台' },
      amount: { ru: 'Стоимость услуги', en: 'Service fee', es: 'Costo del servicio', pt: 'Taxa', zh: '服务费' },
      comment: { ru: 'Доставка и ссылки', en: 'Delivery & links', es: 'Entrega y enlaces', pt: 'Entrega e links', zh: '配送与链接' },
    },
  },
};

const CATEGORY_ALIASES = {
  телефон: 'mobile',
  mobile: 'mobile',
  'пополнить карту': 'card',
  card: 'card',
  свет: 'electricity',
  electricity: 'electricity',
  газ: 'gas',
  gas: 'gas',
  вода: 'water',
  water: 'water',
  интернет: 'internet',
  internet: 'internet',
  транспорт: 'transport',
  transport: 'transport',
  sube: 'transport',
  образование: 'education',
  education: 'education',
  медицина: 'health',
  health: 'health',
  жилье: 'rent',
  жильё: 'rent',
  rent: 'rent',
  другое: 'other',
  other: 'other',
  'mercado libre': 'mercadolibre',
  mercadolibre: 'mercadolibre',
};

function resolveServiceCategoryId(order) {
  const d = order.serviceDetails || order.details || {};
  if (d.categoryId && SERVICE_CATALOG[d.categoryId]) return d.categoryId;
  const raw = String(d.categoryId || d.category || '')
    .trim()
    .toLowerCase();
  if (SERVICE_CATALOG[raw]) return raw;
  for (const [alias, id] of Object.entries(CATEGORY_ALIASES)) {
    if (raw.includes(alias)) return id;
  }
  return 'other';
}

function getServiceConfig(order) {
  const id = resolveServiceCategoryId(order);
  return { id, cfg: SERVICE_CATALOG[id] || SERVICE_CATALOG.other };
}

function line(lang, labelDict, value) {
  if (value === undefined || value === null || value === '') return '';
  const label = pickLang(labelDict, lang);
  return `\n▫️ <b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`;
}

function buildServiceDetailsBlock(lang, order) {
  const { cfg } = getServiceConfig(order);
  const d = order.serviceDetails || order.details || {};
  const labels = cfg.labels || {};
  let block = '';
  if (d.provider) block += line(lang, labels.provider, d.provider);
  if (d.account) block += line(lang, labels.account, d.account);
  if (d.amount) block += line(lang, labels.amount, d.amount);
  if (cfg.showCode !== false && d.code) {
    block += line(lang, labels.code || { ru: 'Код / QR', en: 'Code / QR' }, d.code);
  }
  if (d.comment) block += line(lang, labels.comment, d.comment);
  if (d.hasFile) {
    const fileNote = pickLang(
      {
        ru: 'Клиент приложил файл / квитанцию',
        en: 'Client attached a file',
        es: 'El cliente adjuntó un archivo',
        pt: 'Cliente anexou arquivo',
        zh: '客户已上传附件',
      },
      lang
    );
    block += `\n▫️ <i>${escapeHtml(fileNote)}</i>`;
  }
  return block;
}

function orderNumberLine(lang, orderId) {
  const numLabel = pickLang(
    { ru: 'Номер заявки', en: 'Request #', es: 'Nº de solicitud', pt: 'Nº do pedido', zh: '订单号' },
    lang
  );
  return `📦 ${numLabel}: <b>#${escapeHtml(orderId)}</b>`;
}

function buildClientServiceOrderNotifyText(language, order) {
  const lang = normLang(language || order.language);
  const { cfg } = getServiceConfig(order);
  const title = pickLang(cfg.placed, lang);
  const statusPlaced = pickLang(
    {
      ru: 'Заявка принята в работу!',
      en: 'Your request is being processed!',
      es: '¡Solicitud en proceso!',
      pt: 'Pedido em processamento!',
      zh: '申请已受理！',
    },
    lang
  );
  const afterNote = pickLang(
    {
      ru: '🔐 После подтверждения менеджером вам придут реквизиты для оплаты в USDT.',
      en: '🔐 After manager confirmation you will receive USDT payment details.',
      es: '🔐 Tras la confirmación recibirá los datos de pago en USDT.',
      pt: '🔐 Após confirmação você receberá os dados para pagamento em USDT.',
      zh: '🔐 经理确认后将发送 USDT 付款信息。',
    },
    lang
  );
  const thanks = pickLang(
    {
      ru: 'Спасибо, что выбрали Express Exchange!',
      en: 'Thank you for choosing Express Exchange!',
      es: '¡Gracias por elegir Express Exchange!',
      pt: 'Obrigado por escolher a Express Exchange!',
      zh: '感谢选择 Express Exchange！',
    },
    lang
  );

  return (
    `${cfg.emoji} <b>${escapeHtml(title)}</b>\n\n` +
    `${DIVIDER}\n` +
    `${orderNumberLine(lang, order.orderId)}\n` +
    `${DIVIDER}` +
    buildServiceDetailsBlock(lang, order) +
    `\n\n🟢 <b>${statusPlaced}</b>\n\n` +
    `<i>${afterNote}</i>\n\n` +
    `<b>${thanks}</b>`
  );
}

function buildClientServiceOrderConfirmedText(language, order) {
  const lang = normLang(language || order.language);
  const { cfg } = getServiceConfig(order);
  const title = pickLang(cfg.confirmed, lang);
  const inProgress = pickLang(
    {
      ru: 'Услуга в работе!',
      en: 'Service in progress!',
      es: '¡Servicio en curso!',
      pt: 'Serviço em andamento!',
      zh: '服务处理中！',
    },
    lang
  );
  const manager = pickLang(
    {
      ru: '💬 Вопросы по заявке — <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>',
      en: '💬 Questions — <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>',
      es: '💬 Consultas — <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>',
      pt: '💬 Dúvidas — <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>',
      zh: '💬 咨询 — <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>',
    },
    lang
  );

  return (
    `${cfg.emoji} <b>${escapeHtml(title)}</b>\n\n` +
    `${DIVIDER}\n` +
    `${orderNumberLine(lang, order.orderId)}\n` +
    `${DIVIDER}` +
    buildServiceDetailsBlock(lang, order) +
    `\n\n🟢 <b>${inProgress}</b>\n\n` +
    `<i>${manager}</i>`
  );
}

const ADMIN_PROVIDER_HINTS = {
  mobile: 'Personal, Movistar, Claro',
  electricity: 'Edenor, Edesur',
  gas: 'Metrogas, Naturgy',
  water: 'AySA',
  internet: 'Personal Flow, Telecentro, Movistar',
  card: 'PREX, Galicia, Santander, Lemon, Belo…',
  health: 'OSDE, Swiss Medical, Galeno, Hospital Italiano',
  transport: 'SUBE',
};

function buildAdminServiceOrderMessage(order) {
  const { id, cfg } = getServiceConfig(order);
  const d = order.serviceDetails || {};

  let block = '';
  if (d.provider) {
    block += `\n▫️ <b>${escapeHtml(pickLang(cfg.labels.provider, 'en'))}:</b> ${escapeHtml(d.provider)}`;
  } else if (ADMIN_PROVIDER_HINTS[id]) {
    block += `\n▫️ <i>Providers: ${escapeHtml(ADMIN_PROVIDER_HINTS[id])}</i>`;
  }
  if (d.account) {
    block += `\n▫️ <b>${escapeHtml(pickLang(cfg.labels.account, 'en'))}:</b> ${escapeHtml(d.account)}`;
  }
  if (d.amount) {
    block += `\n▫️ <b>${escapeHtml(pickLang(cfg.labels.amount, 'en'))}:</b> ${escapeHtml(d.amount)}`;
  }
  if (d.code) {
    block += `\n▫️ <b>Code / QR:</b> ${escapeHtml(d.code)}`;
  }
  if (d.comment) {
    block += `\n▫️ <b>${escapeHtml(pickLang(cfg.labels.comment, 'en'))}:</b> ${escapeHtml(d.comment)}`;
  }
  if (d.hasFile) block += `\n▫️ <i>Receipt attached (see file below)</i>`;

  return (
    `${cfg.emoji} <b>${escapeHtml(pickLang(cfg.placed, 'en'))}</b> <code>#${escapeHtml(order.orderId)}</code>\n\n` +
    `Client: ${escapeHtml(order.clientName || '—')} ${escapeHtml(order.clientTelegram || '')}\n` +
    block +
    `\n\n❗️ <b>Please review</b> (Approve / Cancel)`
  );
}

module.exports = {
  resolveServiceCategoryId,
  buildClientServiceOrderNotifyText,
  buildClientServiceOrderConfirmedText,
  buildAdminServiceOrderMessage,
};

/** Переводы Telegram-уведомлений клиенту (ru, en, es, pt, zh) */
const I18N = {
  ru: {
    order_placed_title: 'Ваш заказ успешно оформлен!',
    order_confirmed_title: 'Ваш заказ успешно подтвержден!',
    order_number: 'Номер заказа',
    exchange: 'Обмен',
    you_give: 'Отдаёте',
    you_get: 'Получаете',
    exchange_n: 'Обмен',
    exchange_heading: 'Обмен:',
    exchange_number: 'Обмен {n}:',
    receipt: 'Получение',
    method: 'Способ',
    address: 'Адрес',
    date: 'Дата',
    time: 'Время',
    payment: 'Оплата',
    method_pickup: 'Самовывоз',
    method_delivery: 'Курьер',
    method_transfer: 'Перевод на карту ARS',
    cash_payment: '{cur}',
    status_placed: 'Заявка принята в работу!',
    after_confirm_note_delivery: '🔐 После подтверждения вам будут отправлены реквизиты.',
    after_confirm_note_pickup:
      '🔐 После подтверждения вам будут отправлены реквизиты и адрес офиса.',
    thanks: 'Спасибо, что выбрали Express Exchange!',
    pickup_address: 'Адрес самовывоза',
    pickup_hours:
      '🕘 Мы открыты для самовывоза с 10:00 до 21:00, с понедельника по субботу.',
    status_in_progress: 'Заявка в работе!',
    manager_contact:
      '💬 Если у вас есть вопросы, пожелания или изменения по заказу — напишите нашему менеджеру <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>, и мы с радостью вам поможем.',
    payment_details_title: 'РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ',
    binance_uid: 'Binance UID',
    bybit_uid: 'Bybit UID',
    usdt_trc20: 'USDT (TRC20)',
    usdt_bep20: 'USDT (BEP20)',
    rub_title: 'Рубли (RUB)',
    rub_note: 'Оплата на карту банка РФ после связи с менеджером.',
    cashback_credited: 'На ваш счёт начислено <b>{amount}</b> бонусов кэшбэка за заказ #{orderId}.',
    cashback_not_on_account_revoke:
      'Заказ #{orderId} отменён после подтверждения. Кэшбэк <b>не зачислён</b> на ваш счёт.',
    referral_referred_paid:
      '🎁 По приглашению друга на ваш счёт начислено <b>{amount}</b> бонусов (первый выполненный обмен #{orderId}).',
    referral_referrer_paid:
      '🎁 Ваш друг оформил первый обмен! На ваш счёт начислено <b>{amount}</b> бонусов (заказ #{orderId}).',
    order_rejected_title: 'Заявка отменена',
    order_rejected_body:
      'Заявка <b>#{orderId}</b> отменена менеджером. Если это ошибка — напишите <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>.',
    order_revoked_after_confirm:
      'Заявка <b>#{orderId}</b> отменена после подтверждения. Если нужна помощь — <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>.',
    service_placed_title: 'Заявка на услугу принята!',
    service_confirmed_title: 'Услуга подтверждена!',
    service_category: 'Категория',
    service_provider: 'Оператор / сервис',
    service_account: 'Счёт / реквизиты',
    service_amount: 'Сумма',
    service_comment: 'Комментарий',
    status_confirmed_short: 'Подтверждено',
    status_cancelled_short: 'Отменено',
    order_delivered_title: 'Заказ доставлен!',
    order_delivered_body:
      'Заявка <b>#{orderId}</b> выполнена. Спасибо, что выбрали Express Exchange!',
    service_delivered_title: 'Услуга выполнена!',
    service_delivered_body:
      'Заявка на услугу <b>#{orderId}</b> выполнена. Спасибо, что выбрали Express Exchange!',
  },
  en: {
    order_placed_title: 'Your order has been placed successfully!',
    order_confirmed_title: 'Your order has been confirmed!',
    order_number: 'Order number',
    exchange: 'Exchange',
    you_give: 'You give',
    you_get: 'You receive',
    exchange_n: 'Exchange',
    exchange_heading: 'Exchange:',
    exchange_number: 'Exchange {n}:',
    receipt: 'Receipt',
    method: 'Method',
    address: 'Address',
    date: 'Date',
    time: 'Time',
    payment: 'Payment',
    method_pickup: 'Office pickup',
    method_delivery: 'Courier',
    method_transfer: 'Transfer to ARS card',
    cash_payment: '{cur}',
    status_placed: 'Your request is being processed!',
    after_confirm_note_delivery: '🔐 After confirmation you will receive payment details.',
    after_confirm_note_pickup:
      '🔐 After confirmation you will receive payment details and the office address.',
    thanks: 'Thank you for choosing Express Exchange!',
    pickup_address: 'Pickup address',
    pickup_hours:
      '🕘 We are open for pickup from 10:00 to 21:00, Monday through Saturday.',
    status_in_progress: 'Order in progress!',
    manager_contact:
      '💬 If you have any questions or changes regarding your order, message our manager <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a> — we will be happy to help.',
    payment_details_title: 'PAYMENT DETAILS',
    binance_uid: 'Binance UID',
    bybit_uid: 'Bybit UID',
    usdt_trc20: 'USDT (TRC20)',
    usdt_bep20: 'USDT (BEP20)',
    rub_title: 'Rubles (RUB)',
    rub_note: 'Payment to a Russian bank card after contacting the manager.',
    cashback_credited: '<b>{amount}</b> cashback bonus points credited to your account for order #{orderId}.',
    cashback_not_on_account_revoke:
      'Order #{orderId} was cancelled after confirmation. Cashback was <b>not credited</b> to your account.',
    referral_referred_paid:
      '🎁 Referral bonus: <b>{amount}</b> points credited for your first confirmed exchange #{orderId}.',
    referral_referrer_paid:
      '🎁 Your friend completed their first exchange! <b>{amount}</b> referral bonus credited (order #{orderId}).',
    order_delivered_title: 'Order delivered!',
    order_delivered_body:
      'Order <b>#{orderId}</b> has been completed. Thank you for choosing Express Exchange!',
    service_delivered_title: 'Service completed!',
    service_delivered_body:
      'Service request <b>#{orderId}</b> has been completed. Thank you for choosing Express Exchange!',
  },
  es: {
    order_placed_title: '¡Tu pedido fue registrado con éxito!',
    order_confirmed_title: '¡Tu pedido fue confirmado!',
    order_number: 'Número de pedido',
    exchange: 'Cambio',
    you_give: 'Entregás',
    you_get: 'Recibís',
    exchange_n: 'Cambio',
    exchange_heading: 'Cambio:',
    exchange_number: 'Cambio {n}:',
    receipt: 'Recepción',
    method: 'Método',
    address: 'Dirección',
    date: 'Fecha',
    time: 'Horario',
    payment: 'Pago',
    method_pickup: 'Retiro en oficina',
    method_delivery: 'Envío por moto',
    method_transfer: 'Transferencia a tarjeta ARS',
    cash_payment: '{cur}',
    status_placed: '¡Tu solicitud fue recibida!',
    after_confirm_note_delivery: '🔐 Después de la confirmación te enviaremos los datos de pago.',
    after_confirm_note_pickup:
      '🔐 Después de la confirmación te enviaremos los datos de pago y la dirección de la oficina.',
    thanks: '¡Gracias por elegir Express Exchange!',
    pickup_address: 'Dirección de retiro',
    pickup_hours:
      '🕘 Estamos abiertos para retiro de 10:00 a 21:00, de lunes a sábado.',
    status_in_progress: '¡Pedido en proceso!',
    manager_contact:
      '💬 Si tenés preguntas o cambios en tu pedido, escribile a nuestra manager <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a> — con gusto te ayudamos.',
    payment_details_title: 'DATOS DE PAGO',
    binance_uid: 'Binance UID',
    bybit_uid: 'Bybit UID',
    usdt_trc20: 'USDT (TRC20)',
    usdt_bep20: 'USDT (BEP20)',
    rub_title: 'Rublos (RUB)',
    rub_note: 'Pago a tarjeta bancaria rusa después de contactar al manager.',
    cashback_credited: 'Se acreditaron <b>{amount}</b> bonos de cashback en tu cuenta por el pedido #{orderId}.',
    cashback_not_on_account_revoke:
      'Pedido #{orderId} cancelado después de la confirmación. El cashback <b>no se acreditó</b> en tu cuenta.',
    referral_referred_paid:
      '🎁 Bono por invitación: <b>{amount}</b> puntos por tu primer cambio confirmado #{orderId}.',
    referral_referrer_paid:
      '🎁 ¡Tu amigo hizo su primer cambio! <b>{amount}</b> puntos de referido (pedido #{orderId}).',
  },
  pt: {
    order_placed_title: 'Seu pedido foi registrado com sucesso!',
    order_confirmed_title: 'Seu pedido foi confirmado!',
    order_number: 'Número do pedido',
    exchange: 'Câmbio',
    you_give: 'Você envia',
    you_get: 'Você recebe',
    exchange_n: 'Câmbio',
    exchange_heading: 'Câmbio:',
    exchange_number: 'Câmbio {n}:',
    receipt: 'Recebimento',
    method: 'Método',
    address: 'Endereço',
    date: 'Data',
    time: 'Horário',
    payment: 'Pagamento',
    method_pickup: 'Retirada no escritório',
    method_delivery: 'Entrega via motoboy',
    method_transfer: 'Transferência para cartão ARS',
    cash_payment: '{cur}',
    status_placed: 'Solicitação recebida!',
    after_confirm_note_delivery: '🔐 Após a confirmação você receberá os dados de pagamento.',
    after_confirm_note_pickup:
      '🔐 Após a confirmação você receberá os dados de pagamento e o endereço do escritório.',
    thanks: 'Obrigado por escolher a Express Exchange!',
    pickup_address: 'Endereço de retirada',
    pickup_hours:
      '🕘 Estamos abertos para retirada das 10:00 às 21:00, de segunda a sábado.',
    status_in_progress: 'Pedido em andamento!',
    manager_contact:
      '💬 Se tiver dúvidas ou alterações no pedido, fale com nossa manager <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a> — teremos prazer em ajudar.',
    payment_details_title: 'DADOS PARA PAGAMENTO',
    binance_uid: 'Binance UID',
    bybit_uid: 'Bybit UID',
    usdt_trc20: 'USDT (TRC20)',
    usdt_bep20: 'USDT (BEP20)',
    rub_title: 'Rublos (RUB)',
    rub_note: 'Pagamento em cartão bancário russo após contato com o gerente.',
    cashback_credited: '<b>{amount}</b> bônus de cashback creditados na sua conta pelo pedido #{orderId}.',
    cashback_not_on_account_revoke:
      'Pedido #{orderId} cancelado após a confirmação. O cashback <b>não foi creditado</b> na sua conta.',
    referral_referred_paid:
      '🎁 Bônus de indicação: <b>{amount}</b> pontos pelo primeiro câmbio confirmado #{orderId}.',
    referral_referrer_paid:
      '🎁 Seu amigo fez o primeiro câmbio! <b>{amount}</b> pontos de indicação (pedido #{orderId}).',
  },
  zh: {
    order_placed_title: '订单已成功提交！',
    order_confirmed_title: '订单已确认！',
    order_number: '订单号',
    exchange: '兑换',
    you_give: '您支付',
    you_get: '您收到',
    exchange_n: '兑换',
    exchange_heading: '兑换：',
    exchange_number: '兑换 {n}：',
    receipt: '收款方式',
    method: '方式',
    address: '地址',
    date: '日期',
    time: '时间',
    payment: '付款',
    method_pickup: '办公室自取',
    method_delivery: '专人配送',
    method_transfer: '转账至ARS卡',
    cash_payment: '{cur}',
    status_placed: '申请已受理！',
    after_confirm_note_delivery: '🔐 确认后我们将发送付款信息。',
    after_confirm_note_pickup: '🔐 确认后我们将发送付款信息和办公室地址。',
    thanks: '感谢选择 Express Exchange！',
    pickup_address: '自取地址',
    pickup_hours: '🕘 自取时间：周一至周六 10:00–21:00。',
    status_in_progress: '订单处理中！',
    manager_contact:
      '💬 如有问题或需要修改订单，请联系经理 <a href="https://t.me/Natasha_ExpressExchange">@Natasha_ExpressExchange</a>，我们乐意为您服务。',
    payment_details_title: '付款信息',
    binance_uid: 'Binance UID',
    bybit_uid: 'Bybit UID',
    usdt_trc20: 'USDT (TRC20)',
    usdt_bep20: 'USDT (BEP20)',
    rub_title: '卢布 (RUB)',
    rub_note: '联系经理后转账至俄罗斯银行卡。',
    cashback_credited: '订单 #{orderId} 已入账 <b>{amount}</b> 返现积分。',
    cashback_not_on_account_revoke: '订单 #{orderId} 在确认后被取消，返现<b>未计入</b>您的账户。',
    referral_referred_paid: '🎁 邀请奖励：首笔确认兑换 #{orderId}，已入账 <b>{amount}</b> 积分。',
    referral_referrer_paid: '🎁 好友完成首笔兑换！推荐奖励 <b>{amount}</b> 积分（订单 #{orderId}）。',
  },
};

const SUPPORTED = Object.keys(I18N);

function normLang(lang) {
  const l = String(lang || 'ru').toLowerCase().slice(0, 2);
  return SUPPORTED.includes(l) ? l : 'ru';
}

function t(lang, key, vars = {}) {
  const pack = I18N[normLang(lang)];
  let s = pack[key] ?? I18N.ru[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

/** «Обмен:» для одной сделки, «Обмен 2:» — для нескольких */
function exchangeDealHeading(lang, index, total) {
  if (total <= 1) return t(lang, 'exchange_heading');
  return t(lang, 'exchange_number', { n: index + 1 });
}

module.exports = { t, normLang, I18N, exchangeDealHeading };

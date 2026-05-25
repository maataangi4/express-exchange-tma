import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { ratesFetchUrls } from './apiBase';
import {
  fetchWalletFromServer,
  loadBonusesLocal,
  saveBonusesLocal,
  parseOrderHistoryFromServer,
  saveUserSettings,
  saveUserHistoryItem,
  loadUserSettingsLocal,
  saveUserSettingsLocal,
} from './bonusStorage';
import {
  CASHBACK_CARDS,
  DEFAULT_CASHBACK_CARD_ID,
  cashbackCardImageUrl,
  normalizeCashbackCardId,
  getCashbackCard,
} from './cashbackCards';
import {
  buildCalcFees,
  buildCalcPairRates,
  buildExchangeRatesFromPairRates,
  buildHomeMarketData,
  getSpreadFeePercent,
  getArsToForeignRate,
  getForeignToArsRate,
  minArsGiveForForeignReceive,
  MIN_FOREIGN_GET_ARS_PAIRS,
  hydratePairDisplayFromApi,
  isArsPerForeignRatePair,
  isForeignToArsRatePair,
  isForeignToArsCardPair,
  isForeignToArsCashPair,
  isForeignToRubRatePair,
  isRubPerForeignRatePair,
  isUsdtUsdSpreadPair,
  issueUsdCashFromExact,
  issueUsdCashNearestValid,
  calcUsdtFiatSpreadPair,
  isSpreadPayUsdtMode,
  isSpreadReceiveUsdtMode,
  isUsdtFiatSpreadPair,
  sanitizeSpreadPairRates,
  usdToArsAmount,
} from './ratesDisplay';
import { getInitialRatesState, saveRatesCache, loadRatesCache } from './ratesStorage';
import { enrichMarketDataWithTrend } from './ratesHistory';
import { 
  MapPin, Check, CheckCircle, ArrowDown, ArrowDownUp, Locate, PenLine, Clock, CheckCircle2, Truck, ShieldCheck, ChevronDown,
  Loader2, X, Info, Plus, Wallet, Lock, AlertCircle, 
  ChevronRight, Sparkles, Coins, Calendar, Search, Trash2, Car, Building, Sun, Moon, ArrowLeft,
  Home, Package, User, PlusCircle, TrendingUp, TrendingDown,
  LayoutGrid, Smartphone, Zap, CreditCard, QrCode, Upload, FileText, Wifi, Flame, Droplets, Bus,
  GraduationCap, HeartPulse, MoreHorizontal, Receipt, Ticket,
  Settings, Shield, HelpCircle, LogOut, Globe, Bell, Star, Gift, Headphones,
  Copy, Share2, Users // <--- ДОБАВИЛИ ЭТИ ТРИ ИКОНКИ
} from 'lucide-react';

// --- 1. СЛОВАРЬ ПЕРЕВОДОВ (ПОЛНЫЙ) ---
const TRANSLATIONS = {
    ru: {
        // Навигация
        nav_home: "Главная", nav_create: "Обмен", nav_services: "Услуги", nav_history: "История", nav_profile: "Кабинет",
        
        // Главная
        home_title: "Express Exchange", home_sub: "Сервис обмена валют в Буэнос-Айресе.", home_btn: "Начать обмен",
        home_rates_loading: "Загрузка актуальных курсов...",
        
        // Обмен (Создание)
        ord_title_1: "Обмен", ord_title_2: "Получение", ord_title_3: "Подтверждение",
        ord_give: "Отдаете", ord_get: "Получаете", ord_sum: "Итого к оплате",
        ord_add_deal: "Добавь валютную пару", ord_deal_n: "Сделка",
        ord_bonus_use: "Использовать бонусы", ord_bonus_avail: "Доступно:", ord_bonus_added: "Будет добавлено",
        ord_btn_1: "Далее: Выбрать получение", ord_btn_2: "Далее: Подтвердить", ord_btn_3: "Подтвердить заказ",
        insight_loading: "Обновление...",
        
        // Доставка
        del_method_pickup: "Офис", del_method_delivery: "Курьер",
        del_pickup_title: "Пункт выдачи", del_courier_title: "Курьерская доставка",
        del_addr_ph: "Начните вводить адрес", del_gps: "Где я?",
        del_date: "Дата", del_time: "Время", del_no_slots: "Нет слотов",
        del_today: "Сегодня", del_tomorrow: "Завтра",
        del_express: "Express (в течении часа)",

        // Услуги (Категории)
        cat_mobile: "Телефон", cat_card: "Пополнить карту", cat_electricity: "Свет",
        cat_gas: "Газ", cat_water: "Вода", cat_internet: "Интернет", cat_transport: "Транспорт",
        cat_education: "Образование", cat_health: "Медицина", cat_rent: "Жилье", cat_other: "Другое",

        // Услуги (Форма)
        srv_title: "Оплата услуг", srv_btn: "Создать заказ",
        srv_provider: "Банк",
        srv_label_transfer: "CBU / CVU / Alias",
        srv_label_phone: "Номер телефона",
        srv_label_bill: "Номер лицевого счёта",
        srv_ph_transfer: "Вставьте CBU, Alias или другие данные",
        srv_ph_phone: "Введите номер",
        srv_label_comment: "Назначение / Комментарий",
        srv_ph_comment: "Например: Оплата питания",
        srv_label_file: "Загрузить квитанцию",
        srv_label_amount: "Сумма платежа (ARS)",
        
        // SUBE Баннер
        sube_title: "Зарядить SUBE", sube_desc: "Моментально", sube_btn: "Start",

        // История
        del_title: "Мои заказы", del_empty: "История пока пуста",
        status_pending: "Заявка создана", status_confirmed: "Заявка в работе", status_cancelled: "Отменено", status_delivered: "Выполнено",
        home_rate_chart_title: "Динамика курса",
        type_service: "Услуга", type_exchange: "Обмен",
        hist_svc_category: "Категория", hist_svc_provider: "Оператор / сервис",
        hist_svc_account: "Счёт / реквизиты", hist_svc_amount: "Сумма",
        hist_svc_code: "Код / QR", hist_svc_comment: "Комментарий", hist_svc_file: "Прикреплён файл",
        hist_svc_date: "Дата заявки",

        // Профиль
        prof_verified: "Verified", prof_account: "Аккаунт", prof_app: "Приложение", prof_support: "Поддержка",
        prof_personal: "Личные данные", prof_security: "Безопасность", prof_lang: "Язык", prof_theme: "Тема",
        prof_notif: "Уведомления", prof_notif_bot: "Сообщения в боте", prof_notif_bot_desc: "Получайте важные уведомления в Telegram-боте:\nстатусы доставки и обмена, актуальные реквизиты, изменения по заявкам, а также специальные предложения от Express Exchange.",
        prof_notif_on: "Включены", prof_notif_off: "Выключены",
        prof_chat: "Написать в Telegram", prof_about: "О сервисе", prof_logout: "Выйти",
        prof_referral_title: "Пригласи друга",
        prof_referral_desc: "После подтверждения первого обмена: ему 500 ARS, вам 1500 ARS. Кэшбэк +0.01% за каждого!",
        chat_manager_row: "Написать менеджеру в Telegram",
        chat_manager_sub: "Поддержка 24/7",
        about_intro: "Express Exchange — обмен валют в Буэнос-Айресе. Быстрый и безопасный обмен, самовывоз в офисе, доставка по CABA, переводы на карты и международные денежные перестановки.",
        about_rules_title: "Правила сервиса",
        about_rules: "• Заявка подтверждается менеджером вручную.\n• Курс фиксируется после подтверждения.\n• Минимальные суммы зависят от пары валют.\n• USDT до 100 — только самовывоз в офисе.\n• Бонусы: можно списать весь доступный кэшбэк за один заказ.\n• Кэшбэк начисляется после подтверждения обмена.\n• Оплата USDT — по реквизитам после подтверждения.\n• Споры и изменения — через менеджера @Natasha_ExpressExchange.",
        prof_stats_friends: "Приглашено друзей",
        prof_stats_exchanges: "Обменов",
        prof_stats_services: "Услуг",
        prof_stats_ars_give: "Отдано ARS",
        prof_stats_ars_get: "Получено ARS",
        bonus_card_title: "CASHBACK", bonus_card_sub: "Доступно для списания",
        theme_dark: "Темная", theme_light: "Светлая",
        theme_section: "Режим",
        theme_card_section: "Карточка кэшбэка",
        card_classic: "Классика",
        card_steve_rings: "Кольца",
        card_mahmoud_red: "Алый",
        card_daniel_wave: "Волна",
        card_express_exchange: "Express Exchange",
        card_mahmoud_purple: "Фиолет",
        card_steve_glow: "Свечение",
        card_steve_amber: "Янтарь",
        
        // Общее
        back: "Назад", success_title: "Успешно!", success_desc: "Заявка принята в работу. Наш менеджер свяжется с вами в течении 5 минут!", btn_ok: "Отлично",
        order_notify_tg: "✅ <b>Ваш заказ оформлен!</b>\n\nНомер: <b>#{orderId}</b>"
    },
    en: {
        nav_home: "Home", nav_create: "Exchange", nav_services: "Services", nav_history: "History", nav_profile: "Profile",
        home_title: "Express Exchange", home_sub: "Currency exchange in Buenos Aires.", home_btn: "Start Exchange",
        home_rates_loading: "Loading current rates...",
        ord_title_1: "Exchange", ord_title_2: "Reception", ord_title_3: "Confirmation",
        ord_give: "You Give", ord_get: "You Get", ord_sum: "Total to Pay",
        ord_add_deal: "Add currency pair", ord_deal_n: "Deal",
        ord_bonus_use: "Use bonuses", ord_bonus_avail: "Available:", ord_bonus_added: "Will be added",
        ord_btn_1: "Next: Delivery", ord_btn_2: "Next: Confirm", ord_btn_3: "Confirm Order",
        insight_loading: "Updating...",
        del_method_pickup: "Office", del_method_delivery: "Courier",
        del_pickup_title: "Pick-up Point", del_courier_title: "Courier Delivery",
        del_addr_ph: "Enter address (CABA)...", del_gps: "Locate",
        del_date: "Date", del_time: "Time", del_no_slots: "No slots",
        del_today: "Today", del_tomorrow: "Tomorrow",
        del_express: "Express (within 1 hour)",
        cat_mobile: "Mobile", cat_card: "Card Top-up", cat_electricity: "Electricity",
        cat_gas: "Gas", cat_water: "Water", cat_internet: "Internet", cat_transport: "Transport",
        cat_education: "Education", cat_health: "Health", cat_rent: "Rent", cat_other: "Other",
        srv_title: "Pay Services", srv_btn: "Create Order",
        srv_provider: "CARD",
        srv_label_transfer: "CBU / CVU / Alias",
        srv_label_phone: "Phone Number",
        srv_label_bill: "Bill Number / Barcode",
        srv_ph_transfer: "Paste CBU, Alias or data...",
        srv_ph_phone: "Enter number",
        srv_label_comment: "Reference / Comment",
        srv_ph_comment: "Ex: Rent (March)",
        srv_label_file: "Upload Receipt",
        srv_label_amount: "Amount (USDT/RUB)",
        sube_title: "Top-up SUBE", sube_desc: "Instant", sube_btn: "Start",
        del_title: "My Orders", del_empty: "History is empty",
        status_pending: "Order created", status_confirmed: "In progress", status_cancelled: "Cancelled", status_delivered: "Completed",
        home_rate_chart_title: "Rate chart",
        type_service: "Service", type_exchange: "Exchange",
        hist_svc_category: "Category", hist_svc_provider: "Provider",
        hist_svc_account: "Account", hist_svc_amount: "Amount",
        hist_svc_code: "Code / QR", hist_svc_comment: "Comment", hist_svc_file: "File attached",
        hist_svc_date: "Order date",
        prof_verified: "Verified", prof_account: "Account", prof_app: "Settings", prof_support: "Support",
        prof_personal: "Personal Data", prof_security: "Security", prof_lang: "Language", prof_theme: "Theme",
        prof_notif: "Notifications", prof_notif_bot: "Bot messages", prof_notif_bot_desc: "Get important updates in the Telegram bot:\ndelivery and exchange status, payment details, order changes, and special offers from Express Exchange.",
        prof_notif_on: "On", prof_notif_off: "Off",
        prof_chat: "Message on Telegram", prof_about: "About", prof_logout: "Log Out",
        prof_referral_title: "Invite a friend",
        prof_referral_desc: "After their first confirmed exchange: they get 500 ARS, you get 1500 ARS. Cashback +0.01% per friend!",
        chat_manager_row: "Message manager on Telegram",
        chat_manager_sub: "24/7 support",
        about_intro: "Express Exchange — currency exchange in Buenos Aires. USDT, USD, EUR, ARS and RUB. Office pickup (Belgrano), CABA delivery and ARS card transfer.",
        about_rules_title: "Service rules",
        about_rules: "• Orders are confirmed manually by a manager.\n• Rate is fixed after confirmation.\n• Minimum amounts depend on the currency pair.\n• USDT under 100 — office pickup only.\n• Bonuses: you can use all available cashback on one order.\n• Cashback is credited after the exchange is confirmed.\n• USDT payment — details sent after confirmation.\n• Changes and disputes — contact @Natasha_ExpressExchange.",
        prof_stats_friends: "Friends invited",
        prof_stats_exchanges: "Exchanges",
        prof_stats_services: "Services",
        prof_stats_ars_give: "ARS given",
        prof_stats_ars_get: "ARS received",
        bonus_card_title: "cashback", bonus_card_sub: "Available balance",
        theme_dark: "Dark", theme_light: "Light",
        theme_section: "Mode",
        theme_card_section: "Cashback card",
        card_classic: "Classic",
        card_steve_rings: "Rings",
        card_mahmoud_red: "Crimson",
        card_daniel_wave: "Wave",
        card_express_exchange: "Express Exchange",
        card_mahmoud_purple: "Violet",
        card_steve_glow: "Glow",
        card_steve_amber: "Amber",
        back: "Back", success_title: "Success!", success_desc: "Order received.", btn_ok: "Great",
        order_notify_tg: "✅ <b>Your order is placed!</b>\n\nOrder: <b>#{orderId}</b>"
    },
    es: {
        nav_home: "Inicio", nav_create: "Cambio", nav_services: "Servicios", nav_history: "Historial", nav_profile: "Perfil",
        home_title: "Express Exchange", home_sub: "Cambio de divisas en Buenos Aires.", home_btn: "Iniciar Cambio",
        home_rates_loading: "Cargando cotizaciones actuales...",
        ord_title_1: "Cambio", ord_title_2: "Recepción", ord_title_3: "Confirmación",
        ord_give: "Envías", ord_get: "Recibes", ord_sum: "Total a Pagar",
        ord_add_deal: "Agregar par de divisas", ord_deal_n: "Operación",
        ord_bonus_use: "Usar bonos", ord_bonus_avail: "Disponible:", ord_bonus_added: "Se añadirán",
        ord_btn_1: "Siguiente: Entrega", ord_btn_2: "Siguiente: Confirmar", ord_btn_3: "Confirmar Pedido",
        insight_loading: "Actualizando...",
        del_method_pickup: "Oficina", del_method_delivery: "Moto",
        del_pickup_title: "Punto de Retiro", del_courier_title: "Envío por Moto",
        del_addr_ph: "Ingresá dirección (CABA)...", del_gps: "GPS",
        del_date: "Fecha", del_time: "Hora", del_no_slots: "Sin turnos",
        del_today: "Hoy", del_tomorrow: "Mañana",
        del_express: "Express (en 1 hora)",
        cat_mobile: "Celular", cat_card: "Recarga Tarjeta", cat_electricity: "Luz",
        cat_gas: "Gas", cat_water: "Agua", cat_internet: "Internet", cat_transport: "Transporte",
        cat_education: "Educación", cat_health: "Salud / Prepaga", cat_rent: "Alquiler", cat_other: "Otro",
        srv_title: "Pago de Servicios", srv_btn: "Crear Pedido",
        srv_provider: "Servicio / Proveedor",
        srv_label_transfer: "CBU / CVU / Alias",
        srv_label_phone: "Número de teléfono",
        srv_label_bill: "Número de cuenta / Barras",
        srv_ph_transfer: "Pegar CBU, Alias o datos...",
        srv_ph_phone: "Ingresá número",
        srv_label_comment: "Referencia / Comentario",
        srv_ph_comment: "Ej: Alquiler (Marzo)",
        srv_label_file: "Subir Factura",
        srv_label_amount: "Monto (USDT/RUB)",
        sube_title: "Cargar SUBE", sube_desc: "Al instante", sube_btn: "Start",
        del_title: "Mis Pedidos", del_empty: "Historial vacío",
        status_pending: "Solicitud creada", status_confirmed: "En trabajo", status_cancelled: "Cancelado", status_delivered: "Completado",
        home_rate_chart_title: "Gráfico del tipo de cambio",
        type_service: "Servicio", type_exchange: "Cambio",
        hist_svc_category: "Categoría", hist_svc_provider: "Operador",
        hist_svc_account: "Cuenta", hist_svc_amount: "Monto",
        hist_svc_code: "Código / QR", hist_svc_comment: "Comentario", hist_svc_file: "Archivo adjunto",
        hist_svc_date: "Fecha",
        prof_verified: "Verificado", prof_account: "Cuenta", prof_app: "Aplicación", prof_support: "Soporte",
        prof_personal: "Datos Personales", prof_security: "Seguridad", prof_lang: "Idioma", prof_theme: "Tema",
        prof_notif: "Notificaciones", prof_notif_bot: "Mensajes del bot", prof_notif_bot_desc: "Pedido, confirmación, cashback y datos de pago en @exexchange_bot",
        prof_notif_on: "Activadas", prof_notif_off: "Desactivadas",
        prof_chat: "Escribir en Telegram", prof_about: "Acerca de", prof_logout: "Cerrar Sesión",
        prof_referral_title: "Invitá a un amigo",
        prof_referral_desc: "Tras su primer cambio confirmado: 500 ARS para él, 1500 ARS para vos. ¡Cashback +0.01% por cada uno!",
        chat_manager_row: "Escribir a la manager en Telegram",
        chat_manager_sub: "Soporte 24/7",
        about_intro: "Express Exchange — cambio de divisas en Buenos Aires, Argentina. Operamos con USDT, USD, EUR, pesos (ARS) y rublos (RUB). Retiro en oficina en Belgrano, envío por moto en CABA y transferencia a tarjeta ARS.",
        about_rules_title: "Reglas del servicio",
        about_rules: "• El pedido se confirma manualmente con un operador.\n• La cotización queda fija después de la confirmación.\n• Montos mínimos según el par de monedas.\n• USDT menor a 100 — solo retiro en oficina.\n• Bonos: podés usar todo el cashback disponible en un pedido.\n• Cashback se acredita tras confirmar el cambio.\n• Pago en USDT — datos después de confirmar.\n• Cambios o reclamos — @Natasha_ExpressExchange.",
        prof_stats_friends: "Amigos invitados",
        prof_stats_exchanges: "Cambios",
        prof_stats_services: "Servicios",
        prof_stats_ars_give: "ARS enviados",
        prof_stats_ars_get: "ARS recibidos",
        bonus_card_title: "cashback", bonus_card_sub: "Saldo disponible",
        theme_dark: "Oscuro", theme_light: "Claro",
        theme_section: "Modo",
        theme_card_section: "Tarjeta cashback",
        card_classic: "Clásica",
        card_steve_rings: "Anillos",
        card_mahmoud_red: "Rojo",
        card_daniel_wave: "Onda",
        card_express_exchange: "Express Exchange",
        card_mahmoud_purple: "Violeta",
        card_steve_glow: "Brillo",
        card_steve_amber: "Ámbar",
        back: "Atrás", success_title: "¡Éxito!", success_desc: "Pedido recibido.", btn_ok: "Genial",
        order_notify_tg: "✅ <b>¡Tu pedido fue registrado!</b>\n\nNúmero: <b>#{orderId}</b>"
    },
    pt: {
        nav_home: "Início", nav_create: "Câmbio", nav_services: "Serviços", nav_history: "Histórico", nav_profile: "Perfil",
        home_title: "Express Exchange", home_sub: "Câmbio de moedas em Buenos Aires.", home_btn: "Iniciar Troca",
        home_rates_loading: "Carregando cotações atuais...",
        ord_title_1: "Câmbio", ord_title_2: "Recebimento", ord_title_3: "Confirmação",
        ord_give: "Você envia", ord_get: "Você recebe", ord_sum: "Total a Pagar",
        ord_add_deal: "Adicionar par de moedas", ord_deal_n: "Troca",
        ord_bonus_use: "Usar bônus", ord_bonus_avail: "Disponível:", ord_bonus_added: "Serão adicionados",
        ord_btn_1: "Próximo: Entrega", ord_btn_2: "Próximo: Confirmar", ord_btn_3: "Confirmar Pedido",
        insight_loading: "Atualizando...",
        del_method_pickup: "Escritório", del_method_delivery: "Motoboy",
        del_pickup_title: "Ponto de Retirada", del_courier_title: "Entrega via Motoboy",
        del_addr_ph: "Endereço (CABA)...", del_gps: "Localizar",
        del_date: "Data", del_time: "Hora", del_no_slots: "Sem horários",
        del_today: "Hoje", del_tomorrow: "Amanhã",
        del_express: "Express (em 1 hora)",
        cat_mobile: "Celular", cat_card: "Recarga Cartão", cat_electricity: "Luz",
        cat_gas: "Gás", cat_water: "Água", cat_internet: "Internet", cat_transport: "Transporte",
        cat_education: "Educação", cat_health: "Saúde", cat_rent: "Aluguel", cat_other: "Outros",
        srv_title: "Pagar Contas", srv_btn: "Criar Pedido",
        srv_provider: "Serviço / Provedor",
        srv_label_transfer: "CBU / CVU / Alias",
        srv_label_phone: "Número de telefone",
        srv_label_bill: "Código de Barras",
        srv_ph_transfer: "Colar CBU, Alias ou dados...",
        srv_ph_phone: "Digitar número",
        srv_label_comment: "Referência / Comentário",
        srv_ph_comment: "Ex: Aluguel (Março)",
        srv_label_file: "Enviar Fatura",
        srv_label_amount: "Valor (ARS)",
        sube_title: "Carregar SUBE", sube_desc: "Instantâneo", sube_btn: "Start",
        del_title: "Meus Pedidos", del_empty: "Histórico vazio",
        status_pending: "Pedido criado", status_confirmed: "Em andamento", status_cancelled: "Cancelado", status_delivered: "Concluído",
        home_rate_chart_title: "Gráfico da cotação",
        type_service: "Serviço", type_exchange: "Câmbio",
        hist_svc_category: "Categoria", hist_svc_provider: "Operadora",
        hist_svc_account: "Conta", hist_svc_amount: "Valor",
        hist_svc_code: "Código / QR", hist_svc_comment: "Comentário", hist_svc_file: "Arquivo anexo",
        hist_svc_date: "Data",
        prof_verified: "Verificado", prof_account: "Conta", prof_app: "App", prof_support: "Suporte",
        prof_personal: "Dados Pessoais", prof_security: "Segurança", prof_lang: "Idioma", prof_theme: "Tema",
        prof_notif: "Notificações", prof_notif_bot: "Mensagens do bot", prof_notif_bot_desc: "Pedido, confirmação, cashback e pagamento em @exexchange_bot",
        prof_notif_on: "Ativadas", prof_notif_off: "Desativadas",
        prof_chat: "Escrever no Telegram", prof_about: "Sobre", prof_logout: "Sair",
        prof_referral_title: "Convide um amigo",
        prof_referral_desc: "Após o primeiro câmbio confirmado: 500 ARS para ele, 1500 ARS para você. Cashback +0.01% por cada um!",
        chat_manager_row: "Falar com a manager no Telegram",
        chat_manager_sub: "Suporte 24/7",
        about_intro: "Express Exchange — câmbio de moedas em Buenos Aires, Argentina. USDT, USD, EUR, ARS e RUB. Retirada no escritório (Belgrano), entrega em CABA e transferência para cartão ARS.",
        about_rules_title: "Regras do serviço",
        about_rules: "• Pedido confirmado manualmente pelo operador.\n• Cotação fixada após confirmação.\n• Valores mínimos conforme o par.\n• USDT abaixo de 100 — só retirada no escritório.\n• Bônus: pode usar todo o cashback disponível em um pedido.\n• Cashback após confirmação do câmbio.\n• Pagamento USDT — dados após confirmação.\n• Alterações — @Natasha_ExpressExchange.",
        prof_stats_friends: "Amigos convidados",
        prof_stats_exchanges: "Câmbios",
        prof_stats_services: "Serviços",
        prof_stats_ars_give: "ARS enviados",
        prof_stats_ars_get: "ARS recebidos",
        bonus_card_title: "Pontos Bouchée", bonus_card_sub: "Saldo disponível",
        theme_dark: "Escuro", theme_light: "Claro",
        theme_section: "Modo",
        theme_card_section: "Cartão cashback",
        card_classic: "Clássico",
        card_steve_rings: "Anéis",
        card_mahmoud_red: "Vermelho",
        card_daniel_wave: "Onda",
        card_express_exchange: "Express Exchange",
        card_mahmoud_purple: "Violeta",
        card_steve_glow: "Brilho",
        card_steve_amber: "Âmbar",
        back: "Voltar", success_title: "Sucesso!", success_desc: "Pedido recebido.", btn_ok: "Ótimo",
        order_notify_tg: "✅ <b>Seu pedido foi registrado!</b>\n\nNúmero: <b>#{orderId}</b>"
    },
    zh: {
        nav_home: "首页", nav_create: "兑换", nav_services: "服务", nav_history: "订单", nav_profile: "我的",
        home_title: "Express Exchange", home_sub: "布宜诺斯艾利斯货币兑换服务", home_btn: "开始兑换",
        home_rates_loading: "正在加载最新汇率...",
        ord_title_1: "兑换", ord_title_2: "接收方式", ord_title_3: "确认订单",
        ord_give: "支付", ord_get: "获得", ord_sum: "应付总额",
        ord_add_deal: "添加货币对", ord_deal_n: "交易",
        ord_bonus_use: "使用积分", ord_bonus_avail: "可用余额:", ord_bonus_added: "将添加",
        ord_btn_1: "下一步: 选择方式", ord_btn_2: "下一步: 确认", ord_btn_3: "确认订单",
        insight_loading: "更新中...",
        del_method_pickup: "办公室自取", del_method_delivery: "外卖配送",
        del_pickup_title: "取货点", del_courier_title: "专人配送",
        del_addr_ph: "输入地址 (CABA)...", del_gps: "定位",
        del_date: "日期", del_time: "时间", del_no_slots: "无时段",
        del_today: "今天", del_tomorrow: "明天",
        del_express: "Express（1小时内）",
        cat_mobile: "手机充值", cat_card: "充值卡", cat_electricity: "电费",
        cat_gas: "燃气费", cat_water: "水费", cat_internet: "网费", cat_transport: "交通卡",
        cat_education: "教育/学费", cat_health: "医疗保险", cat_rent: "房租/物业", cat_other: "其他",
        srv_title: "生活缴费", srv_btn: "创建订单",
        srv_provider: "服务商",
        srv_label_transfer: "CBU / CVU / Alias (转账)",
        srv_label_phone: "电话号码",
        srv_label_bill: "账单号码 / 条形码",
        srv_ph_transfer: "粘贴 CBU, Alias 或账户信息...",
        srv_ph_phone: "输入号码",
        srv_label_comment: "备注 / 用途",
        srv_ph_comment: "例如：3月房租",
        srv_label_file: "上传账单/收据",
        srv_label_amount: "金额 (ARS)",
        sube_title: "充值 SUBE", sube_desc: "即时到账", sube_btn: "开始",
        del_title: "我的订单", del_empty: "暂无记录",
        status_pending: "订单已创建", status_confirmed: "处理中", status_cancelled: "已取消", status_delivered: "已完成",
        home_rate_chart_title: "汇率走势",
        type_service: "服务", type_exchange: "兑换",
        hist_svc_category: "类别", hist_svc_provider: "运营商",
        hist_svc_account: "账号", hist_svc_amount: "金额",
        hist_svc_code: "代码/二维码", hist_svc_comment: "备注", hist_svc_file: "已上传附件",
        hist_svc_date: "日期",
        prof_verified: "已认证", prof_account: "账户", prof_app: "设置", prof_support: "支持",
        prof_personal: "个人资料", prof_security: "安全中心", prof_lang: "语言", prof_theme: "主题",
        prof_notif: "通知", prof_notif_bot: "机器人消息", prof_notif_bot_desc: "订单、确认、返现和付款信息（@exexchange_bot）",
        prof_notif_on: "已开启", prof_notif_off: "已关闭",
        prof_chat: "在 Telegram 联系", prof_about: "关于应用", prof_logout: "退出登录",
        prof_referral_title: "邀请好友",
        prof_referral_desc: "好友首笔兑换确认后：对方 500 ARS，您 1500 ARS。每邀请一人返现 +0.01%！",
        chat_manager_row: "在 Telegram 联系经理",
        chat_manager_sub: "24/7 客服",
        about_intro: "Express Exchange — 布宜诺斯艾利斯货币兑换。支持 USDT、USD、EUR、ARS 和 RUB。Belgrano 办公室自取、CABA 配送及 ARS 卡转账。",
        about_rules_title: "服务规则",
        about_rules: "• 订单由经理人工确认。\n• 汇率在确认后锁定。\n• 最低金额因货币对而异。\n• 100 以下 USDT 仅办公室自取。\n• 积分：一单可使用全部可用返现。\n• 返现于兑换确认后入账。\n• USDT 付款信息在确认后发送。\n• 变更与争议请联系 @Natasha_ExpressExchange。",
        prof_stats_friends: "邀请好友",
        prof_stats_exchanges: "兑换",
        prof_stats_services: "服务",
        prof_stats_ars_give: "支付 ARS",
        prof_stats_ars_get: "收到 ARS",
        bonus_card_title: " 积分", bonus_card_sub: "可用积分",
        theme_dark: "深色", theme_light: "浅色",
        theme_section: "模式",
        theme_card_section: "返现卡片",
        card_classic: "经典",
        card_steve_rings: "光环",
        card_mahmoud_red: "绯红",
        card_daniel_wave: "紫波",
        card_express_exchange: "Express Exchange",
        card_mahmoud_purple: "紫韵",
        card_steve_glow: "光晕",
        card_steve_amber: "琥珀",
        back: "返回", success_title: "提交成功!", success_desc: "我们已收到您的订单。", btn_ok: "好的",
        order_notify_tg: "✅ <b>订单已提交！</b>\n\n订单号：<b>#{orderId}</b>"
    }
};

const SUPPORT_TELEGRAM_LINK = 'https://t.me/Natasha_ExpressExchange';

const APP_NAV_TABS = ['home', 'services', 'create', 'deliveries', 'profile'];
const SWIPE_BACK_MIN_PX = 55;
const SERVICES_SWIPE_BACK_EVENT = 'app-services-swipe-back';

function isNavSwipeInteractiveTarget(target) {
    return Boolean(
        target?.closest?.(
            'button, a, input, textarea, select, label, [role="button"], [data-skip-nav-swipe]'
        )
    );
}

function openSupportTelegram() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(SUPPORT_TELEGRAM_LINK);
    } else if (typeof window !== 'undefined') {
        window.open(SUPPORT_TELEGRAM_LINK, '_blank');
    }
}

/** Прокрутка к полю ввода, чтобы его не перекрывала клавиатура (TMA / мобильный). */
function scrollInputIntoView(e) {
    const el = e?.target;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
        window.Telegram?.WebApp?.expand?.();
    } catch {
        /* ignore */
    }
    const scroll = () => {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    };
    requestAnimationFrame(() => {
        setTimeout(scroll, 80);
        setTimeout(scroll, 380);
    });
    const vv = window.visualViewport;
    if (vv) {
        const onResize = () => {
            scroll();
            vv.removeEventListener('resize', onResize);
        };
        vv.addEventListener('resize', onResize);
        setTimeout(() => vv.removeEventListener('resize', onResize), 2500);
    }
}

function handleFormFocusCapture(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        scrollInputIntoView(e);
    }
}

/** Локальная дата YYYY-MM-DD (не UTC) — для слотов доставки в Аргентине */
function localDateId(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Текст уведомления клиенту в @exexchange_bot после оформления заказа */
function buildClientOrderNotifyText(language, payload) {
    const lang = (language || 'ru').toLowerCase();
    const {
        orderId,
        deals,
        deliveryMethod,
        address,
        date,
        time,
        deliveryCost,
        cardAccount,
        paymentMethod,
    } = payload;

    const methodLabels = {
        ru: { pickup: 'Самовывоз (офис)', delivery: 'Курьер', transfer: 'Перевод на карту ARS' },
        en: { pickup: 'Office pickup', delivery: 'Courier', transfer: 'Transfer to ARS card' },
        es: { pickup: 'Retiro en oficina', delivery: 'Envío por moto', transfer: 'Transferencia a tarjeta ARS' },
        pt: { pickup: 'Retirada no escritório', delivery: 'Entrega via motoboy', transfer: 'Transferência para cartão ARS' },
        zh: { pickup: '办公室自取', delivery: '专人配送', transfer: '转账至ARS卡' },
    };
    const m = methodLabels[lang] || methodLabels.ru;

    const headers = {
        ru: `✅ <b>Ваш заказ оформлен!</b>\n\nНомер: <b>#${orderId}</b>`,
        en: `✅ <b>Your order is placed!</b>\n\nOrder: <b>#${orderId}</b>`,
        es: `✅ <b>¡Tu pedido fue registrado!</b>\n\nNúmero: <b>#${orderId}</b>`,
        pt: `✅ <b>Seu pedido foi registrado!</b>\n\nNúmero: <b>#${orderId}</b>`,
        zh: `✅ <b>订单已提交！</b>\n\n订单号：<b>#${orderId}</b>`,
    };
    const dealHeader = { ru: '\n\n<b>Обмен:</b>', en: '\n\n<b>Exchange:</b>', es: '\n\n<b>Cambio:</b>', pt: '\n\n<b>Câmbio:</b>', zh: '\n\n<b>兑换:</b>' };
    const giveLbl = { ru: 'Отдаёте', en: 'You give', es: 'Entregás', pt: 'Você envia', zh: '您支付' };
    const getLbl = { ru: 'Получаете', en: 'You get', es: 'Recibís', pt: 'Você recebe', zh: '您收到' };
    const delHeader = { ru: '\n\n<b>Доставка и получение:</b>', en: '\n\n<b>Delivery & receipt:</b>', es: '\n\n<b>Entrega y recepción:</b>', pt: '\n\n<b>Entrega e recebimento:</b>', zh: '\n\n<b>配送与收款:</b>' };
    const footers = {
        ru: '\n\nЗаявка принята в работу. Менеджер свяжется с вами в ближайшие минуты — ожидайте сообщение здесь, в чате с ботом.\n\nСпасибо, Express Exchange!',
        en: '\n\nWe\'ve received your request. A manager will contact you shortly — watch for a message here in the bot chat.\n\nThank you, Express Exchange!',
        es: '\n\nRecibimos tu solicitud. Un manager te contactará pronto — esperá el mensaje aquí en el chat del bot.\n\n¡Gracias, Express Exchange!',
        pt: '\n\nRecebemos sua solicitação. Um gerente entrará em contato em breve — aguarde a mensagem aqui no chat do bot.\n\nObrigado, Express Exchange!',
        zh: '\n\n我们已收到您的申请。经理将很快与您联系 — 请在此机器人聊天中留意消息。\n\n感谢选择 Express Exchange！',
    };

    const h = headers[lang] || headers.ru;
    const exchangeLbl = {
        ru: 'Обмен',
        en: 'Exchange',
        es: 'Cambio',
        pt: 'Câmbio',
        zh: '兑换',
    };
    const dealList = deals || [];
    const dealsBlock = dealList
        .map((d, i) => {
            const ex = exchangeLbl[lang] || exchangeLbl.ru;
            const heading = dealList.length <= 1 ? `${ex}:` : `${ex} ${i + 1}:`;
            return `\n\n<b>${heading}</b> ${d.give} → ${d.get}\n${giveLbl[lang] || giveLbl.ru}: <b>${d.giveAmount} ${d.give}</b>\n${getLbl[lang] || getLbl.ru}: <b>${d.getAmount} ${d.get}</b>`;
        })
        .join('');

    const methodKey = deliveryMethod === 'transfer' ? 'transfer' : deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
    const addrLbl = { ru: 'Адрес', en: 'Address', es: 'Dirección', pt: 'Endereço', zh: '地址' };
    const dateLbl = { ru: 'Дата', en: 'Date', es: 'Fecha', pt: 'Data', zh: '日期' };
    const timeLbl = { ru: 'Время', en: 'Time', es: 'Horario', pt: 'Horário', zh: '时间' };
    const feeLbl = { ru: 'Стоимость доставки', en: 'Delivery fee', es: 'Costo de envío', pt: 'Taxa de entrega', zh: '配送费' };
    const payLbl = { ru: 'Оплата', en: 'Payment', es: 'Pago', pt: 'Pagamento', zh: '付款' };
    const cardLbl = { ru: 'Реквизиты (ARS)', en: 'ARS account', es: 'Cuenta ARS', pt: 'Conta ARS', zh: 'ARS账户' };

    let deliveryBlock = `${delHeader[lang] || delHeader.ru}\n• ${m[methodKey]}`;
    if (deliveryMethod === 'delivery' && address) {
        deliveryBlock += `\n• ${addrLbl[lang] || addrLbl.ru}: ${address}`;
    }
    if (deliveryMethod === 'delivery' && date) {
        deliveryBlock += `\n• ${dateLbl[lang] || dateLbl.ru}: ${date}`;
    }
    if (deliveryMethod === 'delivery' && time) {
        deliveryBlock += `\n• ${timeLbl[lang] || timeLbl.ru}: ${time}`;
    }
    if (paymentMethod) {
        deliveryBlock += `\n• ${payLbl[lang] || payLbl.ru}: ${paymentMethod}`;
    }
    if (cardAccount) {
        deliveryBlock += `\n• ${cardLbl[lang] || cardLbl.ru}: ${cardAccount}`;
    }

    return h + dealsBlock + deliveryBlock;
}

const LANGUAGES_LIST = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es', name: 'Español (AR)', flag: '🇦🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' }
];

// --- 2. КОНСТАНТЫ ---
const ANCHOR_ARS_RATE = 1420;

const RATES = {
    USDT: { rate: 1, flag: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png" },
    USD: { rate: 0.98, flag: "https://hatscripts.github.io/circle-flags/flags/us.svg" },
    EUR: { rate: 0.92, flag: "https://hatscripts.github.io/circle-flags/flags/eu.svg" },
    RUB: { rate: 78, flag: "https://hatscripts.github.io/circle-flags/flags/ru.svg" },
    ARS: { rate: 1420, flag: "https://hatscripts.github.io/circle-flags/flags/ar.svg" },
    ARS_CARD: { rate: 1400, flag: "https://hatscripts.github.io/circle-flags/flags/ar.svg" },
};

/** Бесплатная доставка: «отдаю» от 500 USDT или номинального эквивалента (500 USD, 710k ARS и т.д.) */
const FREE_DELIVERY_THRESHOLD = 500;
const FREE_DELIVERY_MIN_GIVE = {
    USDT: 500,
    USD: 500,
    EUR: 500,
    RUB: 500 * 78,
    ARS: 500 * 1420,
    ARS_CARD: 500 * 1400,
};

/** Прогресс к бесплатной доставке в условных единицах (500 = порог) */
function giveAmountToFreeDeliveryUnits(amount, giveCurrency, rates = RATES) {
    const val = parseFloat(amount) || 0;
    const min = getFreeDeliveryMinGive(rates)[giveCurrency];
    if (!val || !min) return 0;
    return (val / min) * FREE_DELIVERY_THRESHOLD;
}

/** Сколько ещё «отдать» в валюте give, чтобы дойти до порога */
function missingGiveForFreeDelivery(missingUnits, giveCurrency, rates = RATES) {
    const min = getFreeDeliveryMinGive(rates)[giveCurrency];
    if (!min || missingUnits <= 0) return 0;
    return (missingUnits / FREE_DELIVERY_THRESHOLD) * min;
}

function getFreeDeliveryMinGive(rates = RATES) {
    const ars = rates.ARS?.rate || 1420;
    const rub = rates.RUB?.rate || 78;
    const arsCard = rates.ARS_CARD?.rate || 1400;
    return {
        USDT: 500,
        USD: 500,
        EUR: 500,
        RUB: 500 * rub,
        ARS: 500 * ars,
        ARS_CARD: 500 * arsCard,
    };
}

function directPairRate(fromCur, toCur, pairRates, pairDisplay) {
    if (isUsdtUsdSpreadPair(fromCur, toCur) || isUsdtFiatSpreadPair(fromCur, toCur)) return null;
    const key = `${fromCur}-${toCur}`;
    const inv = `${toCur}-${fromCur}`;

    if (isRubPerForeignRatePair(fromCur, toCur)) {
        const r = pairDisplay?.[key] ?? pairRates?.[key];
        if (r != null && r > 0) return { div: r };
        return null;
    }
    if (isForeignToRubRatePair(fromCur, toCur)) {
        const r =
            pairDisplay?.[inv] ??
            pairRates?.[inv] ??
            pairDisplay?.[`RUB-${fromCur}`] ??
            pairRates?.[`RUB-${fromCur}`];
        if (r != null && r > 0) return { mul: r };
        return null;
    }
    if (isArsPerForeignRatePair(fromCur, toCur)) {
        const r =
            getArsToForeignRate(fromCur, toCur, pairRates, pairDisplay) ??
            getForeignToArsRate(toCur, fromCur, pairRates, pairDisplay);
        if (r != null) return { div: r };
        return null;
    }
    if (isForeignToArsRatePair(fromCur, toCur)) {
        const r = getForeignToArsRate(fromCur, toCur, pairRates, pairDisplay);
        if (r != null) return { mul: r };
        return null;
    }

    const h = pairDisplay?.[key];
    if (h != null && h > 0) return { mul: h };
    const w = pairRates?.[key];
    if (w != null && w > 0) return { mul: w };
    const hi = pairDisplay?.[inv];
    if (hi != null && hi > 0) return { div: hi };
    const wi = pairRates?.[inv];
    if (wi != null && wi > 0) return { div: wi };
    return null;
}

function calcExactGet(give, get, giveAmount, exchangeRates, pairRates, pairDisplay, exchangeFees) {
    const fee =
        getSpreadFeePercent(give, get, exchangeFees, pairDisplay) ??
        (exchangeFees[`${give}-${get}`] ?? null);
    return (
        convertExchangeAmount(
            give,
            get,
            giveAmount,
            exchangeRates,
            pairRates,
            fee,
            false,
            pairDisplay
        ) ?? 0
    );
}

/** Остаток RUB→USD/EUR в песо (для подтверждения и Excel). */
function orderReceivesArs(order, exchangeRates, pairRates, pairDisplay, exchangeFees) {
    if (order.get === 'ARS' || order.get === 'ARS_CARD') return true;
    if (order.give === 'RUB' && (order.get === 'USD' || order.get === 'EUR')) {
        return calcRubCashRemainderARS(order, exchangeRates, pairRates, pairDisplay, exchangeFees) > 0;
    }
    return false;
}

function bonusArsToGiveAmount(bonusArs, giveCurrency, exchangeRates) {
    const arsRate = exchangeRates?.ARS?.rate;
    const giveRate = exchangeRates?.[giveCurrency]?.rate;
    if (!bonusArs || !arsRate || !giveRate) return 0;
    return (bonusArs / arsRate) * giveRate;
}

function formatPayAmount(val) {
    if (val == null || !Number.isFinite(val)) return '0';
    const n = Math.round(val * 1e6) / 1e6;
    if (Math.abs(n - Math.round(n)) < 1e-6) return Math.round(n).toLocaleString('ru-RU');
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 4 });
}

function calcRubCashRemainderARS(order, exchangeRates, pairRates, pairDisplay, exchangeFees) {
    if (order.give !== 'RUB' || (order.get !== 'USD' && order.get !== 'EUR')) return 0;
    const give = parseFloat(order.giveAmount) || 0;
    const issued = parseFloat(order.getAmount) || 0;
    if (give <= 0 || issued <= 0) return 0;
    const exactGet = calcExactGet(
        order.give,
        order.get,
        give,
        exchangeRates,
        pairRates,
        pairDisplay,
        exchangeFees
    );
    return Math.max(0, Math.floor(usdToArsAmount(exactGet - issued, exchangeRates, pairRates, pairDisplay)));
}

/** Сделки для API / Google Sheets: пары + отдельная строка «остаток в песо». */
function buildDealsForOrderPayload(orders, exchangeRates, pairRates, pairDisplay, exchangeFees) {
    const deals = [];
    for (const o of orders) {
        if (!o.give || !o.get) continue;
        deals.push({
            giveAmount: o.giveAmount,
            giveCurrency: o.give,
            getAmount: o.getAmount,
            getCurrency: o.get,
        });
        const tail = calcRubCashRemainderARS(o, exchangeRates, pairRates, pairDisplay, exchangeFees);
        if (tail > 0) {
            deals.push({
                giveAmount: '',
                giveCurrency: '',
                getAmount: String(tail),
                getCurrency: 'ARS',
                sheetMarker: 'остаток в песо',
                pesoTail: true,
                fromPair: `${o.give}-${o.get}`,
            });
        }
    }
    return deals;
}

/** Конвертация fromCur → toCur (сумма в fromCur → сумма в toCur) */
function convertExchangeAmount(
    fromCur,
    toCur,
    amount,
    exchangeRates,
    pairRates,
    feePercent,
    invertFee = false,
    pairDisplay = null
) {
    const rateFrom = exchangeRates[fromCur]?.rate;
    const rateTo = exchangeRates[toCur]?.rate;
    if (!rateFrom || !rateTo) return null;

    if (isUsdtFiatSpreadPair(fromCur, toCur) && feePercent != null) {
        const f = Number(feePercent);
        if (Number.isFinite(f) && f !== 0) {
            const mode = isSpreadReceiveUsdtMode(fromCur, toCur) ? 'receiveUsdt' : 'payUsdt';
            const { usdt, usd } = calcUsdtFiatSpreadPair(amount, f, mode);
            if (fromCur === 'USDT') return usd;
            if (toCur === 'USDT') return usdt;
            if (fromCur === 'USD' || fromCur === 'EUR') return usdt;
            if (toCur === 'USD' || toCur === 'EUR') return usd;
        }
    }

    const direct = directPairRate(fromCur, toCur, pairRates, pairDisplay);
    if (direct?.mul) return amount * direct.mul;
    if (direct?.div) return amount / direct.div;

    if (isArsPerForeignRatePair(fromCur, toCur) || isForeignToArsRatePair(fromCur, toCur)) {
        return null;
    }

    if (feePercent !== null) {
        const f = Number(feePercent);
        if (!Number.isFinite(f) || f === 0) return amount;
        if (isUsdtUsdSpreadPair(fromCur, toCur)) {
            if (fromCur === 'USDT') return amount * (1 + f / 100);
            if (toCur === 'USDT') return amount / (1 + f / 100);
        }
        if (invertFee) return amount * (1 + f / 100);
        return amount / (1 + f / 100);
    }
    return (amount / rateFrom) * rateTo;
}

/** Цифровая клавиатура на телефоне: только цифры и одна точка/запятая */
function sanitizeAmountInput(raw) {
    let v = String(raw ?? '').replace(/[^\d.,]/g, '').replace(/,/g, '.');
    const dot = v.indexOf('.');
    if (dot === -1) return v;
    return v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
}

/** Наличные USD/EUR: кратно 10, мин. 100, без ×10/×30/×90 в конце (купюры 20, 50, 100) */
function normalizeUsdCashAmount(val) {
  const n0 = parseFloat(val);
  if (!Number.isFinite(n0) || n0 <= 0) return 0;
  let n = Math.round(n0 / 10) * 10;
  if (n < 100) return 100;
  const lastTwo = n % 100;
  if ([10, 30, 90].includes(lastTwo)) return n + 10;
  return n;
}

/** ARS → USDT / USD / EUR */
function isArsToForeignPair(give, get) {
  return (give === 'ARS' || give === 'ARS_CARD') && ['USDT', 'USD', 'EUR'].includes(get);
}

function formatUsdtGetAmount(n) {
  if (!Number.isFinite(n) || n <= 0) return '';
  const v = Math.floor(n * 100) / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function ceilArsForForeignReceive(foreignCur, arsCur, foreignAmt, exchangeRates, pairRates, feePercent, pairDisplay) {
  const rate = getArsToForeignRate(arsCur, foreignCur, pairRates, pairDisplay);
  if (rate != null) return String(Math.ceil(foreignAmt * rate));
  const ars = convertExchangeAmount(
    foreignCur,
    arsCur,
    foreignAmt,
    exchangeRates,
    pairRates,
    feePercent,
    false,
    pairDisplay
  );
  return ars != null ? String(Math.ceil(ars)) : null;
}

function minArsNumForForeignGet(give, get, exchangeRates, pairRates, pairDisplay) {
  return minArsGiveForForeignReceive(give, get, pairRates, pairDisplay) ?? 0;
}

/** ARS сверху → USD/EUR/USDT снизу (курс H17/H18/H19) */
function calcGetFromArsGive(give, get, arsAmount, pairRates, pairDisplay) {
  const rate = getArsToForeignRate(give, get, pairRates, pairDisplay);
  if (!rate || !Number.isFinite(arsAmount) || arsAmount <= 0) return '';
  const exact = arsAmount / rate;
  if (get === 'USDT') {
    const show =
      exact < MIN_FOREIGN_GET_ARS_PAIRS ? MIN_FOREIGN_GET_ARS_PAIRS : exact;
    return formatUsdtGetAmount(show);
  }
  const cashIn =
    exact < MIN_FOREIGN_GET_ARS_PAIRS ? MIN_FOREIGN_GET_ARS_PAIRS : exact;
  const issued = issueUsdCashFromExact(cashIn);
  return String(issued > 0 ? issued : MIN_FOREIGN_GET_ARS_PAIRS);
}

/** USD/EUR снизу → ARS сверху (H17–H19) */
function calcGiveArsFromForeignGet(give, get, foreignAmount, pairRates, pairDisplay) {
  const rate = getArsToForeignRate(give, get, pairRates, pairDisplay);
  if (!rate || !Number.isFinite(foreignAmount) || foreignAmount <= 0) return null;
  return String(Math.ceil(foreignAmount * rate));
}

/** USDT/USD/EUR → ARS/ARS_CARD: купюры сверху (от 100), песо снизу = курс × округлённая сумма */
function applyForeignGiveToArsGet(give, get, foreignRaw, pairRates, pairDisplay) {
  const rate = getForeignToArsRate(give, get, pairRates, pairDisplay);
  if (!rate || !Number.isFinite(foreignRaw) || foreignRaw <= 0) {
    return { giveAmount: null, getAmount: '' };
  }
  if (give === 'USDT') {
    if (foreignRaw < MIN_FOREIGN_GET_ARS_PAIRS) {
      return { giveAmount: null, getAmount: '' };
    }
    const f = Math.floor(foreignRaw * 100) / 100;
    return {
      giveAmount: formatUsdtGetAmount(f),
      getAmount: String(Math.floor(f * rate)),
    };
  }
  if (foreignRaw < MIN_FOREIGN_GET_ARS_PAIRS) {
    return { giveAmount: null, getAmount: '' };
  }
  const validGive = normalizeUsdCashAmount(foreignRaw);
  return {
    giveAmount: String(validGive),
    getAmount: String(Math.floor(validGive * rate)),
  };
}

/** ARS_CARD снизу → USDT/USD/EUR сверху; enforceMinGet: подтянуть песо до 100×курс */
function applyArsCardGetToForeignGive(
  give,
  get,
  arsRaw,
  pairRates,
  pairDisplay,
  enforceMinGet = true
) {
  const rate = getForeignToArsRate(give, get, pairRates, pairDisplay);
  if (!rate || !Number.isFinite(arsRaw) || arsRaw <= 0) {
    return { giveAmount: '', getAmount: '' };
  }
  const ars = Math.floor(arsRaw);
  const minGetArs = Math.floor(MIN_FOREIGN_GET_ARS_PAIRS * rate);

  if (give === 'USDT') {
    const exact = ars / rate;
    const f =
      exact < MIN_FOREIGN_GET_ARS_PAIRS
        ? MIN_FOREIGN_GET_ARS_PAIRS
        : Math.floor(exact * 100) / 100;
    const giveAmount = formatUsdtGetAmount(f);
    const getAmount =
      enforceMinGet && ars < minGetArs ? String(minGetArs) : String(ars);
    return { giveAmount, getAmount };
  }

  const exactForeign = ars / rate;
  const cashIn =
    exactForeign < MIN_FOREIGN_GET_ARS_PAIRS ? MIN_FOREIGN_GET_ARS_PAIRS : exactForeign;
  const issued = issueUsdCashFromExact(cashIn);
  const validGive =
    issued > 0 ? issued : normalizeUsdCashAmount(cashIn) || MIN_FOREIGN_GET_ARS_PAIRS;
  const giveAmount = String(validGive);
  const syncedArs = Math.floor(validGive * rate);
  let getAmount;
  if (enforceMinGet && ars < minGetArs) {
    getAmount = String(minGetArs);
  } else if (enforceMinGet) {
    getAmount = String(syncedArs);
  } else {
    getAmount = String(ars);
  }
  return { giveAmount, getAmount };
}

/** ARS (наличные) снизу → USDT/USD/EUR сверху; USDT — любая сумма от мин., USD/EUR — купюры */
function applyArsCashGetToForeignGive(
  give,
  get,
  arsRaw,
  pairRates,
  pairDisplay,
  enforceMinGet = true
) {
  const rate = getForeignToArsRate(give, get, pairRates, pairDisplay);
  if (!rate || !Number.isFinite(arsRaw) || arsRaw <= 0) {
    return { giveAmount: '', getAmount: '' };
  }
  const ars = Math.floor(arsRaw);
  const minGetArs = Math.floor(MIN_FOREIGN_GET_ARS_PAIRS * rate);

  if (give === 'USDT') {
    const exact = ars / rate;
    const f =
      exact < MIN_FOREIGN_GET_ARS_PAIRS
        ? MIN_FOREIGN_GET_ARS_PAIRS
        : Math.floor(exact * 100) / 100;
    const giveAmount = formatUsdtGetAmount(f);
    const getAmount =
      enforceMinGet && ars < minGetArs ? String(minGetArs) : String(ars);
    return { giveAmount, getAmount };
  }

  const exactForeign = ars / rate;
  const cashIn =
    exactForeign < MIN_FOREIGN_GET_ARS_PAIRS ? MIN_FOREIGN_GET_ARS_PAIRS : exactForeign;
  const issued = issueUsdCashFromExact(cashIn);
  const validGive =
    issued > 0 ? issued : normalizeUsdCashAmount(cashIn) || MIN_FOREIGN_GET_ARS_PAIRS;
  const giveAmount = String(validGive);
  const syncedArs = Math.floor(validGive * rate);
  let getAmount;
  if (enforceMinGet && ars < minGetArs) {
    getAmount = String(minGetArs);
  } else if (enforceMinGet) {
    getAmount = String(syncedArs);
  } else {
    getAmount = String(ars);
  }
  return { giveAmount, getAmount };
}

/** Поле «Отдаёте»: нельзя начать с 0 (0, 05, 0.5…) */
function sanitizeGiveAmountInput(raw) {
    let v = sanitizeAmountInput(raw);
    if (!v) return '';
    if (v === '0' || v.startsWith('0.')) return '';
    if (v.startsWith('0')) v = v.replace(/^0+/, '') || '';
    return v;
}

/** USDT→USD: случайно сняли точку («99.75» → «9975») */
function isLikelyBrokenSpreadUsdtInput(rawGive, amount) {
    const raw = String(rawGive ?? '').trim();
    if (!raw || raw.includes('.') || raw.includes(',')) return false;
    if (!Number.isFinite(amount) || amount < 200 || raw.length < 4) return false;
    if (amount % 50 === 0 && amount <= 10000) return false;
    const cents = amount % 100;
    return cents > 0 && cents < 100;
}

/** Стирают 1000→100 — не считать финальным вводом 100 */
function isSpreadUsdtGiveDeletingThrough(oldRaw, newRaw) {
    const start = String(oldRaw ?? '').trim();
    const now = String(newRaw ?? '').trim();
    const v = parseFloat(now);
    if (!start || !now || !Number.isFinite(v) || v < 100) return false;
    return now.length < start.length && start.startsWith(now);
}

/** % спреда с главной (H), не FEES['USDT-USD']=1.0 из дефолта */
function resolveSpreadFeePercent(give, get, exchangeFees, pairDisplay) {
    const fee = getSpreadFeePercent(give, get, exchangeFees, pairDisplay);
    if (fee != null && Number.isFinite(fee) && Math.abs(fee) < 20) return fee;
    const key = `${give}-${get}`;
    const inv = `${get}-${give}`;
    const disp = pairDisplay[key] ?? pairDisplay[inv];
    if (disp != null && Number.isFinite(disp) && Math.abs(disp) < 20) return disp;
    return 0;
}

function formatSpreadUsdtAmount(n) {
    if (!Number.isFinite(n) || n <= 0) return '';
    const v = Math.round(n * 100) / 100;
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** USDT→USD/EUR: номинал USD; спред только на blur (не при каждой цифре) */
function commitSpreadPayUsdtPair(order, anchorField, exchangeFees, pairDisplay) {
    const { give, get } = order;
    if (!isSpreadPayUsdtMode(give, get)) return { action: 'noop' };

    const fee = resolveSpreadFeePercent(give, get, exchangeFees, pairDisplay);
    const rawGet = String(order.getAmount ?? '').trim();
    const getV = parseFloat(rawGet);
    const rawGive = String(order.giveAmount ?? '').trim();
    const giveV = parseFloat(rawGive);
    let usdNominal = 0;

    if (anchorField === 'getAmount') {
        if (!rawGet || !Number.isFinite(getV) || getV <= 0) return { action: 'clear' };
        if (getV < 100) return { action: 'belowMin' };
        usdNominal = get === 'USD' || get === 'EUR' ? normalizeUsdCashAmount(getV) : getV;
    } else {
        if (!rawGive || !Number.isFinite(giveV) || giveV <= 0) return { action: 'clear' };
        if (isLikelyBrokenSpreadUsdtInput(rawGive, giveV)) return { action: 'clear' };
        if (giveV < 100) return { action: 'belowMin' };
        /* После snap в USDT лежит сумма к оплате; номинал USD — из поля USD, если оно уже есть */
        if (Number.isFinite(getV) && getV >= 100) {
            usdNominal =
                get === 'USD' || get === 'EUR' ? normalizeUsdCashAmount(getV) : getV;
        } else {
            usdNominal = giveV;
        }
    }

    const { usdt, usd } = calcUsdtFiatSpreadPair(usdNominal, fee, 'payUsdt');
    if (!(usd > 0)) return { action: 'noop' };
    const usdtStr = formatSpreadUsdtAmount(usdt);
    return {
        action: 'snap',
        giveAmount: usdtStr,
        spreadSnapUsdtGive: { usdt: usdtStr, usd: String(usd) },
    };
}

const PAIRS = {
    'USDT': ['USD', 'ARS', 'ARS_CARD'],
    'USD': ['ARS', 'ARS_CARD', 'USDT'],
    'EUR': ['ARS', 'ARS_CARD', 'USDT'],
    'RUB': ['USDT', 'USD', 'ARS', 'ARS_CARD'],
    'ARS': ['USDT', 'USD', 'EUR']
};

const ARS_CARD_LABELS = {
    ru: 'ARS (Карта)',
    en: 'ARS (Card)',
    es: 'ARS (Tarjeta)',
    pt: 'ARS (Cartão)',
    zh: 'ARS (卡)',
};

const arsCardDisplayLabel = (lang) =>
    ARS_CARD_LABELS[lang?.toLowerCase()] || ARS_CARD_LABELS.en;

const ORDER_AMOUNT_INPUT_CLASS =
    'text-[clamp(1.125rem,7.5vw,1.875rem)] font-black text-right bg-transparent outline-none w-full min-w-0 tabular-nums';

const orderCurrencyPillClass = (code, stateClass) => {
    const base = `inline-flex items-center gap-1.5 py-1.5 pl-1.5 rounded-full transition-all shrink-0 ${stateClass}`;
    if (!code) {
        return `${base} pr-3 min-w-[8.5rem]`;
    }
    return `${base} pr-1.5`;
};

function OrderCurrencyLabel({ code, language, compact = false, className = '' }) {
    if (code === 'ARS_CARD') {
        if (compact) {
            return (
                <span className={`font-bold text-lg leading-none inline-flex items-center gap-1.5 ${className}`}>
                    ARS
                    <CreditCard
                        strokeWidth={2}
                        className="w-[1em] h-[1em] opacity-55 shrink-0"
                        aria-hidden
                    />
                </span>
            );
        }
        return (
            <span className={`font-bold text-sm whitespace-nowrap ${className}`}>
                {arsCardDisplayLabel(language)}
            </span>
        );
    }
    return (
        <span className={`font-bold ${compact ? 'text-lg' : 'text-sm'} leading-none whitespace-nowrap ${className}`}>
            {code}
        </span>
    );
}

// USDT↔USD: +0,25% → меньше USDT; −0,25% → больше USDT (USDT = USD / (1 + %/100))
const FEES = {
    'USDT-USD': 1.0,  
    'USDT-EUR': 1.5,  
    'USD-USDT': 1.0,  // <--- ВОТ ЗДЕСЬ мы ставили 0. Замени на 1.0 (или свой процент)!
    'EUR-USDT': 1.0     
};


const SERVICE_CATEGORIES = [
    { id: 'mobile', translationKey: 'cat_mobile', icon: <Smartphone size={24} />, providers: ['Personal', 'Movistar', 'Claro', 'Other'] },
    { id: 'card', translationKey: 'cat_card', icon: <CreditCard size={24} />, providers: ['PREX', 'Galicia', 'Santander', 'BBVA', 'BancoCuidad', 'Banco Nacion', 'BANCO PATAGONIA', 'Banco Provincia', "Lemon Cash", "Belo", 'Other'] },
    { id: 'electricity', translationKey: 'cat_electricity', icon: <Zap size={24} />, providers: ['Edenor', 'Edesur', 'Other'] },
    { id: 'gas', translationKey: 'cat_gas', icon: <Flame size={24} />, providers: ['Metrogas', 'Naturgy', 'Other'] },
    { id: 'water', translationKey: 'cat_water', icon: <Droplets size={24} />, providers: ['AySA', 'Other'] },
    { id: 'internet', translationKey: 'cat_internet', icon: <Wifi size={24} />, providers: ['Personal Flow', 'Telecentro', 'Movistar', 'Other' ] },
    { id: 'transport', translationKey: 'cat_transport', icon: <Bus size={24} />, providers: ['SUBE'] },
    { id: 'education', translationKey: 'cat_education', icon: <GraduationCap size={24} />, providers: ['Школа', 'Детский сад', 'Университет', 'Курсы', 'Other'], isTransfer: true },
    { id: 'health', translationKey: 'cat_health', icon: <HeartPulse size={24} />, providers: ['OSDE', 'Swiss Medical', 'Galeno', 'Hospital Italiano', 'Other'], isTransfer: true },
    { id: 'rent', translationKey: 'cat_rent', icon: <Home size={24} />, providers: ['Expensas', 'Депозит', 'Оплата арендадателю', 'Airbnb', 'Booking.com', 'Other'], isTransfer: true },
    { id: 'other', translationKey: 'cat_other', icon: <MoreHorizontal size={24} />, providers: ['Туризм / Гиды', 'Билеты / Концерты', 'Частный перевод', 'Other'], isTransfer: true },
];

const DELIVERY_METHODS = [
  { id: 'pickup', translationKey: 'del_method_pickup', icon: <Building size={18} /> },
  { id: 'delivery', translationKey: 'del_method_delivery', icon: <Car size={18} /> }
];

const EXPRESS_SLOT_ID = 'express';
const DELIVERY_FEE_USD_STANDARD = 3.5;
const DELIVERY_FEE_USD_EXPRESS = 5;

const TIME_SLOTS = [
  { id: '10-12', start: 10, label: '10:00 - 12:00' },
  { id: '12-14', start: 12, label: '12:00 - 14:00' },
  { id: '14-16', start: 14, label: '14:00 - 16:00' },
  { id: '16-18', start: 16, label: '16:00 - 18:00' },
  { id: '18-20', start: 18, label: '18:00 - 20:00' },
];

const getMarketInsight = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`AI: Market Stable`);
    }, 1500);
  });
};

// --- БАЗА СОВЕТОВ AI (ПРИЗЕМЛЕННЫЙ БУЭНОС-АЙРЕС 2026) - 204 ВАРИАНТА ---
const AI_SERVICE_TIPS = {
    general: [
        { ru: "Оплата услуг через криптокарты (Lemon, Belo) дает кэшбэк до 2% в биткоинах.", en: "Paying services via crypto cards (Lemon, Belo) gives up to 2% cashback in BTC.", es: "Pagar servicios con Lemon o Belo te da hasta un 2% de cashback en Bitcoin.", pt: "Pagar serviços com cartões cripto (Lemon, Belo) dá até 2% de cashback em BTC.", zh: "通过加密货币卡（Lemon、Belo）支付服务可获得高达2%的比特币返现。" },
        { ru: "Переводы по CVU (виртуальные счета) проходят мгновенно в любое время суток.", en: "CVU (virtual account) transfers clear instantly 24/7.", es: "Las transferencias a CVU impactan al instante, sea la hora que sea.", pt: "Transferências para CVU caem na hora, 24 horas por dia.", zh: "CVU（虚拟账户）转账全天候即时到账。" },
        { ru: "Сохраняйте чеки об оплате в PDF: приложения провайдеров иногда сбоят.", en: "Save payment receipts as PDFs: provider apps sometimes glitch.", es: "Guardá siempre los comprobantes en PDF por si se cae el sistema del proveedor.", pt: "Guarde os comprovantes em PDF: os apps dos provedores às vezes falham.", zh: "将付款收据保存为PDF：提供商的应用程序有时会出现故障。" },
        { ru: "Лимиты налоговой (ARCA/AFIP) на переводы без декларации обновляются каждый месяц.", en: "ARCA/AFIP limits for undeclared transfers update monthly.", es: "Los montos que podés mover sin declarar en ARCA (ex AFIP) cambian todos los meses.", pt: "Os limites da ARCA/AFIP para transferências não declaradas mudam todo mês.", zh: "ARCA/AFIP的未申报转账限额每月更新一次。" },
        { ru: "Иностранцам выгоднее оплачивать услуги с зарубежных карт по курсу MEP.", en: "Foreigners get the better MEP exchange rate automatically on foreign cards.", es: "A los turistas les conviene pagar con tarjeta extranjera para agarrar el dólar MEP.", pt: "Estrangeiros obtêm a taxa MEP automaticamente ao pagar com cartões do exterior.", zh: "外国人使用外国信用卡付款会自动享受更优惠的MEP汇率。" },
        { ru: "Автоплатеж (Débito automático) часто не срабатывает, если деньги лежат в 'Инвестициях'.", en: "Auto-debit often fails if your funds are in an 'Invested' state on the app.", es: "Ojo que el débito automático a veces falla si tenés la plata invertida en la app.", pt: "O débito automático muitas vezes falha se o dinheiro estiver rendendo no app.", zh: "如果您的资金在应用程序中处于“投资”状态，自动扣款通常会失败。" },
        { ru: "Платежи, совершенные в пятницу вечером, иногда проводятся только в понедельник.", en: "Payments made late Friday sometimes only clear on Monday.", es: "Si pagás algo el viernes a la noche, a veces recién impacta el lunes.", pt: "Pagamentos feitos na sexta à noite às vezes só caem na segunda-feira.", zh: "周五晚上的付款有时要到周一才能结清。" },
        { ru: "Оплата по QR-коду (Transferencias 3.0) теперь работает между любыми банками и кошельками.", en: "QR code payments (Transferencias 3.0) now interoperate between all banks and wallets.", es: "El QR ahora es interoperable: podés pagar desde cualquier banco o billetera.", pt: "Pagamentos via QR code agora funcionam entre todos os bancos e carteiras.", zh: "二维码支付（Transferencias 3.0）现在可在所有银行和钱包之间互通。" },
        { ru: "Разделяйте счета с соседями напрямую через функцию 'Dividir gastos' в кошельке.", en: "Split bills with roommates directly using the 'Split expenses' app feature.", es: "Podés dividir la cuenta de los servicios con tus compañeros directo desde la app.", pt: "Divida as contas com seus colegas diretamente pela função de dividir despesas do app.", zh: "直接使用应用程序的“分摊费用”功能与室友分摊账单。" },
        { ru: "Избегайте наличных при оплате счетов: кассы Pago Fácil берут большие комиссии.", en: "Avoid cash for bills: physical Pago Fácil stores charge extra fees.", es: "Evitá pagar en efectivo en Pago Fácil, te cobran comisión extra.", pt: "Evite pagar em dinheiro: as lojas físicas do Pago Fácil cobram taxas extras.", zh: "避免使用现金支付账单：实体Pago Fácil商店会收取额外费用。" },
        { ru: "Проверяйте наличие двойного списания, если приложение выдало ошибку тайм-аута.", en: "Check for double charges if the app shows a timeout error.", es: "Revisá que no te hayan cobrado doble si la app te tiró error de conexión.", pt: "Verifique cobranças duplas se o aplicativo der erro de tempo limite.", zh: "如果应用程序显示超时错误，请检查是否被重复扣款。" },
        { ru: "Квитанции типа 'Factura A' нужны только для возврата НДС (IVA).", en: "'Factura A' receipts are only needed if you are claiming VAT (IVA) returns.", es: "Pedí Factura A solo si sos Responsable Inscripto y necesitás descargar el IVA.", pt: "Recibos 'Factura A' só são necessários se você for deduzir o imposto (IVA).", zh: "只有在您需要申请增值税（IVA）退税时才需要'Factura A'收据。" },
        { ru: "Уведомления о задолженности часто приходят на email в папку Спам.", en: "Overdue bill notices often end up in your email Spam folder.", es: "Los avisos de deuda de los servicios suelen caer en la carpeta de Spam.", pt: "Avisos de contas em atraso muitas vezes vão para a pasta de Spam do email.", zh: "逾期账单通知通常会被发送到您电子邮件的垃圾邮件文件夹中。" },
        { ru: "Службы поддержки быстрее отвечают в верифицированных WhatsApp-ботах, чем по телефону.", en: "Support replies faster via verified WhatsApp bots than by phone calls.", es: "Te atienden más rápido por el bot de WhatsApp verificado que llamando por teléfono.", pt: "O suporte responde mais rápido via bots oficiais de WhatsApp do que por telefone.", zh: "通过经过验证的WhatsApp机器人联系客服比打电话回复更快。" },
        { ru: "При оплате счетов иностранным паспортом могут потребоваться дополнительные фото документа.", en: "Paying with a foreign passport may prompt the app to request document photos.", es: "Si pagás con pasaporte, la app te puede pedir fotos extra por seguridad.", pt: "Pagar com passaporte estrangeiro pode fazer o app pedir fotos do documento.", zh: "使用外国护照付款可能会促使应用程序要求提供证件照片。" },
        { ru: "Настройте биометрию для подтверждения крупных платежей за аренду или учебу.", en: "Set up biometrics to confirm large payments for rent or tuition.", es: "Activá la huella o el Face ID para autorizar los pagos grandes como el alquiler.", pt: "Configure a biometria para confirmar pagamentos altos como aluguel ou faculdade.", zh: "设置生物识别技术以确认大额付款，如租金或学费。" },
        { ru: "Многие сервисы делают скидку 10% при оплате вперед за полгода или год.", en: "Many services offer a 10% discount if you pay 6 or 12 months in advance.", es: "Muchos servicios te hacen un 10% de descuento si pagás el semestre o año por adelantado.", pt: "Muitos serviços dão 10% de desconto se você pagar 6 ou 12 meses adiantado.", zh: "如果您预付6个月或12个月的费用，许多服务会提供10%的折扣。" }
    ],
    mobile: [
        { ru: "Tuenti предлагает самые дешевые 30-дневные комбо-пакеты без контракта.", en: "Tuenti offers the cheapest 30-day no-contract combo packs.", es: "Los combos de 30 días de Tuenti siguen siendo los más baratos y sin contrato.", pt: "A Tuenti oferece os pacotes mensais pré-pagos mais baratos.", zh: "Tuenti提供最便宜的30天无合约组合套餐。" },
        { ru: "Связка интернета Flow и сим-карты Personal дает скидку на оба счета.", en: "Bundling Flow home internet with Personal mobile gives a discount on both.", es: "Si tenés internet en casa con Flow y línea Personal, te hacen descuento en las dos facturas.", pt: "Ter internet de casa da Flow e celular da Personal dá desconto em ambas as contas.", zh: "将Flow家庭网络与Personal手机卡绑定，两项账单均可享受折扣。" },
        { ru: "Claro предлагает бесплатный роуминг данных по всей Америке в тарифах от 5 ГБ.", en: "Claro offers free roaming across the Americas on plans 5GB and up.", es: "Los planes de Claro de más de 5GB tienen roaming gratis en toda América.", pt: "A Claro oferece roaming grátis em toda a América em planos acima de 5GB.", zh: "Claro在5GB及以上套餐中提供全美洲免费漫游。" },
        { ru: "Переход к другому оператору (Portabilidad) — лучший способ получить скидку 50% на год.", en: "Switching carriers (Portability) is the best way to get a 50% discount for a year.", es: "Hacer la portabilidad a otra empresa es la mejor forma de ligar 50% de descuento por un año.", pt: "Mudar de operadora (Portabilidade) é a melhor forma de conseguir 50% de desconto por um ano.", zh: "携号转网是获得一年50%折扣的最佳方式。" },
        { ru: "Тарифы с постоплатой корректируются ежемесячно по индексу инфляции.", en: "Post-paid plans are adjusted monthly based on the inflation index.", es: "Ojo que los planes con factura te los ajustan todos los meses por inflación.", pt: "Os planos pós-pagos são ajustados mensalmente com base na inflação.", zh: "后付费套餐每月根据通货膨胀指数进行调整。" },
        { ru: "eSIM теперь можно активировать просто отсканировав QR-код из приложения оператора.", en: "eSIMs can now be activated simply by scanning a QR code from the carrier's app.", es: "Ya podés activar la eSIM escaneando un QR directamente desde la app de la telefónica.", pt: "O eSIM agora pode ser ativado escaneando um QR code no app da operadora.", zh: "现在只需扫描运营商应用程序中的二维码即可激活eSIM。" },
        { ru: "Большинство тарифов включают бесплатный трафик для WhatsApp, даже если пакет ГБ закончился.", en: "Most plans include free WhatsApp data, even if you run out of gigabytes.", es: "Casi todos los planes te dan WhatsApp gratis aunque te quedes sin gigas.", pt: "A maioria dos planos inclui WhatsApp grátis, mesmo se seus dados acabarem.", zh: "大多数套餐都包含免费WhatsApp流量，即使您的千兆字节已用完。" },
        { ru: "SOS-пополнение (Recarga SOS) стоит дороже обычного: оператор берет комиссию за кредит.", en: "SOS top-ups cost more: carriers charge a fee for advancing you credit.", es: "La Recarga SOS te sale más cara porque te cobran interés por prestarte el saldo.", pt: "A Recarga SOS é mais cara: as operadoras cobram uma taxa de empréstimo.", zh: "SOS紧急充值费用更高：运营商会收取预支信用额度的费用。" },
        { ru: "Покрытие 5G работает только в центре Буэнос-Айреса (CABA) и крупных районах.", en: "5G coverage only works reliably in central Buenos Aires (CABA) and major neighborhoods.", es: "El 5G anda bien solo en CABA y en los barrios más céntricos.", pt: "A cobertura 5G só funciona bem no centro de Buenos Aires (CABA) e bairros grandes.", zh: "5G网络目前仅在布宜诺斯艾利斯市中心（CABA）和主要社区稳定运行。" },
        { ru: "Покупать дополнительные 'Пакеты ГБ' дешевле через банковские приложения.", en: "Buying extra data packs is often cheaper through banking apps.", es: "Comprar 'Packs de Gigas' extra suele salir más barato desde la app del banco.", pt: "Comprar pacotes de dados extras geralmente é mais barato pelos apps de banco.", zh: "通过银行应用程序购买额外的流量包通常更便宜。" },
        { ru: "Блокировка спам-звонков от тюрем и мошенников включается в настройках телефона.", en: "Block scam and prison calls by enabling spam protection in your phone settings.", es: "Activá el filtro de llamadas en tu celu para bloquear estafas y llamadas de la cárcel.", pt: "Bloqueie chamadas de spam e golpes ativando a proteção nas configurações do celular.", zh: "在手机设置中开启垃圾电话拦截以屏蔽诈骗电话。" },
        { ru: "Физические SIM-карты все еще нужны, если вы используете старые модели телефонов.", en: "Physical SIM cards are still required if you use older phone models.", es: "Todavía vas a necesitar el chip de plástico si tenés un teléfono medio viejo.", pt: "Chips físicos (SIM) ainda são necessários se o seu celular for mais antigo.", zh: "如果您使用的是旧款手机，仍需要物理SIM卡。" },
        { ru: "Оплата телефона криптокартой зачисляется как платеж в песо (ARS).", en: "Paying your phone bill with a crypto card settles as an ARS payment.", es: "Si pagás la línea con tarjeta crypto, impacta directamente como pago en pesos.", pt: "Pagar a conta do celular com cartão cripto processa como um pagamento em pesos.", zh: "使用加密货币卡支付电话费将作为ARS（比索）付款结算。" },
        { ru: "Некоторые подписки (например, Spotify) можно включить в счет за телефон.", en: "Some subscriptions (like Spotify) can be billed directly to your phone carrier.", es: "Podés meter suscripciones como Spotify directo en la factura del celular.", pt: "Algumas assinaturas (como Spotify) podem ser cobradas direto na fatura do celular.", zh: "某些订阅（如Spotify）可以直接记入您的电话账单。" },
        { ru: "Следите за расходом трафика в официальном приложении, чтобы не купить лишнего.", en: "Track data usage in the official app so you don't overbuy.", es: "Controlá cuántos gigas te quedan en la app oficial para no comprar de más.", pt: "Controle o uso de dados no app oficial para não comprar pacotes à toa.", zh: "在官方应用程序中跟踪数据使用情况，以免过度购买。" },
        { ru: "Для цифровых кочевников есть специальные тарифы e-SIM на 15 и 30 дней.", en: "Digital nomads can buy specific 15- and 30-day tourist eSIM plans.", es: "Hay planes de eSIM armados especialmente para nómades digitales por 15 o 30 días.", pt: "Nômades digitais podem comprar planos eSIM de 15 ou 30 dias focados em turistas.", zh: "数字游民可以购买专门为游客提供的15天和30天eSIM套餐。" },
        { ru: "Если у вас пропала сеть, первым делом включите и выключите авиарежим.", en: "If you lose signal, toggle airplane mode on and off before calling support.", es: "Si te quedás sin señal, poné modo avión y sacalo antes de llamar a reclamar.", pt: "Se ficar sem sinal, ative e desative o modo avião antes de ligar para o suporte.", zh: "如果失去信号，请在致电客服之前先打开再关闭飞行模式。" }
    ],
    card: [
        { ru: "Карта Lemon Cash автоматически возвращает процент с покупок в крипте.", en: "Lemon Cash card automatically returns a percentage of purchases in crypto.", es: "La tarjeta de Lemon Cash te devuelve un porcentaje de lo que gastás en criptomonedas.", pt: "O cartão Lemon Cash devolve automaticamente uma porcentagem das compras em cripto.", zh: "Lemon Cash卡会自动将购物金额的一定比例以加密货币返还。" },
        { ru: "Belo позволяет тратить USDT напрямую, конвертируя в песо в момент оплаты.", en: "Belo lets you spend USDT directly, converting to pesos at the moment of sale.", es: "Con Belo gastás tus USDT directo y se cambian a pesos justo cuando pasás la tarjeta.", pt: "O Belo permite gastar USDT direto, convertendo para pesos na hora da compra.", zh: "Belo允许您直接消费USDT，并在付款时转换为比索。" },
        { ru: "Buenbit повышает лимиты трат после простой верификации доходов.", en: "Buenbit increases spending limits after a simple proof-of-income verification.", es: "Buenbit te sube el límite de gastos si subís un recibo de sueldo o monotributo.", pt: "A Buenbit aumenta os limites de gastos após uma simples verificação de renda.", zh: "Buenbit在进行简单的收入证明验证后会提高支出限额。" },
        { ru: "Оплата до 15 000 ARS картой с NFC проходит без ввода пин-кода.", en: "Contactless card payments under 15,000 ARS process without entering a PIN.", es: "Si pagás menos de 15 lucas apoyando la tarjeta (NFC), no te pide el PIN.", pt: "Pagamentos por aproximação abaixo de 15.000 ARS passam sem pedir a senha.", zh: "15,000 ARS以下的非接触式信用卡付款无需输入密码。" },
        { ru: "Добавьте карту в Apple Pay или Google Wallet для безопасности и удобства.", en: "Add your card to Apple Pay or Google Wallet for security and convenience.", es: "Cargá tu tarjeta en Apple Pay o Google Wallet: es más seguro y rápido para pagar.", pt: "Adicione seu cartão no Apple Pay ou Google Wallet por segurança e praticidade.", zh: "将您的卡添加到Apple Pay或Google钱包以提高安全性和便利性。" },
        { ru: "Создавайте виртуальные карты для разовых покупок онлайн, чтобы избежать кражи данных.", en: "Create virtual cards for one-off online purchases to avoid data theft.", es: "Usá tarjetas virtuales descartables para comprar online y evitar que te clonen los datos.", pt: "Crie cartões virtuais para compras online únicas para evitar roubo de dados.", zh: "为一次性在线购物创建虚拟卡，以避免数据被盗。" },
        { ru: "Платежи в 'cuotas' (рассрочка) выгодны только если это 'Cuota Simple' без процентов.", en: "Installment payments ('cuotas') are only worth it if they are interest-free ('Cuota Simple').", es: "Pagar en cuotas rinde solo si es con el plan 'Cuota Simple' sin interés.", pt: "Parcelamentos ('cuotas') só valem a pena se forem sem juros ('Cuota Simple').", zh: "分期付款（'cuotas'）只有在免息（'Cuota Simple'）的情况下才划算。" },
        { ru: "Отказывайтесь от бумажных чеков (tickets) в магазинах: все есть в приложении.", en: "Decline printed paper receipts at stores: everything is in the app.", es: "No pidas el ticket impreso en el local, te queda todo guardado en la app.", pt: "Recuse recibos de papel nas lojas: tudo fica registrado no aplicativo.", zh: "拒绝在商店打印纸质收据：应用程序中记录了所有内容。" },
        { ru: "При утере карты сразу замораживайте ее (Pausar) в приложении одним кликом.", en: "If you lose your card, freeze it immediately (Pause) in the app with one click.", es: "Si perdés la tarjeta, pausala al toque desde la app antes de darla de baja.", pt: "Se perder o cartão, pause-o imediatamente no aplicativo com um clique.", zh: "如果您的卡丢失，请立即在应用程序中一键冻结（暂停）。" },
        { ru: "Иностранные карты Visa/Mastercard автоматически пересчитываются по хорошему курсу MEP.", en: "Foreign Visa/Mastercard cards automatically convert at the favorable MEP rate.", es: "Las tarjetas de afuera (Visa/Master) te toman el dólar MEP de forma automática.", pt: "Cartões estrangeiros Visa/Mastercard convertem automaticamente pela taxa MEP.", zh: "外国的Visa/Mastercard卡会自动按优惠的MEP汇率进行换算。" },
        { ru: "Если терминал предлагает конвертацию в вашу валюту (DCC) — всегда отказывайтесь.", en: "If the terminal offers Dynamic Currency Conversion (DCC), always decline it.", es: "Si el posnet te ofrece cobrarte en tu moneda extranjera, decile siempre que no.", pt: "Se a maquininha oferecer conversão para sua moeda (DCC), recuse sempre.", zh: "如果终端提供动态货币转换（DCC），请始终拒绝。" },
        { ru: "Обслуживание криптокарт и виртуальных кошельков обычно абсолютно бесплатное.", en: "Maintenance for crypto cards and virtual wallets is usually entirely free.", es: "Mantener una tarjeta de un banco digital o billetera crypto suele ser 100% gratis.", pt: "A manutenção de cartões cripto e carteiras virtuais geralmente é totalmente grátis.", zh: "加密货币卡和虚拟钱包的维护通常是完全免费的。" },
        { ru: "Пополнение баланса (Fondeo) через P2P-перевод не облагается банковскими налогами.", en: "Funding your account via P2P bank transfer is free of bank taxes.", es: "Fondear tu cuenta transfiriendo a un CVU no paga los impuestos de los bancos tradicionales.", pt: "Adicionar fundos via transferência P2P é isento de impostos bancários.", zh: "通过P2P银行转账为账户入金免收银行税。" },
        { ru: "Снятие наличных в банкоматах (Banelco/Link) с криптокарт имеет высокую комиссию.", en: "ATM withdrawals (Banelco/Link) with crypto cards have high fixed fees.", es: "Sacar billetes por cajero Banelco o Link con tarjetas crypto te cobra una comisión alta.", pt: "Saques em caixas eletrônicos (Banelco/Link) com cartões cripto têm taxas altas.", zh: "使用加密货币卡在ATM（Banelco/Link）提取现金的手续费很高。" },
        { ru: "Выбирайте кэшбэк в стейблкоинах или BTC, песо быстро обесценивается.", en: "Choose cashback in stablecoins or BTC, as the peso depreciates quickly.", es: "Seteá el cashback para que te lo den en USDT o BTC, porque el peso pierde valor.", pt: "Escolha receber o cashback em stablecoins ou BTC, pois o peso desvaloriza rápido.", zh: "选择稳定币或BTC返现，因为比索贬值很快。" },
        { ru: "Игнорируйте письма о блокировке карты: банки используют push-уведомления в приложении.", en: "Ignore 'card blocked' emails: banks use push notifications for real alerts.", es: "Ignorá los mails de 'tarjeta bloqueada', son estafas. Los bancos te avisan por la app.", pt: "Ignore e-mails de 'cartão bloqueado': os bancos usam notificações no app.", zh: "忽略“卡被冻结”的电子邮件：银行会通过应用程序推送真实警报。" },
        { ru: "Новые пластиковые карты доставляют курьером на дом за 3-5 дней.", en: "Replacement plastic cards are delivered via courier to your home in 3-5 days.", es: "Si pedís un plástico nuevo, te lo manda el correo a tu casa en menos de una semana.", pt: "Novos cartões físicos são entregues em casa por correio em 3-5 dias.", zh: "新的实体卡将在3-5天内通过快递送货上门。" }
    ],
    electricity: [
        { ru: "Зарегистрируйтесь в реестре RASE, чтобы не потерять субсидию на свет.", en: "Register in the RASE system to maintain your electricity subsidy.", es: "Anotate en el formulario RASE sí o sí para no perder los subsidios de la luz.", pt: "Registre-se no sistema RASE para manter seu subsídio de energia.", zh: "在RASE系统中注册以保留您的电费补贴。" },
        { ru: "Летом ставьте кондиционер на 24 градуса — это сэкономит до 30% в счете.", en: "Set your AC to 24°C in summer to save up to 30% on your bill.", es: "En verano poné el aire en 24°C. Bajás el consumo y te ahorrás un 30% en la boleta.", pt: "No verão, deixe o ar-condicionado no 24°C para economizar até 30% na conta.", zh: "夏天将空调设置为24°C，最多可节省30%的电费。" },
        { ru: "Если счет кажется огромным, проверьте показания на счетчике в подвале.", en: "If the bill seems huge, verify the numbers on the physical meter in the basement.", es: "Si te vino una locura de luz, bajá a mirar los números del medidor físico.", pt: "Se a conta vier muito alta, verifique os números no medidor físico do prédio.", zh: "如果账单金额巨大，请核对地下室物理电表上的数字。" },
        { ru: "Отказ от бумажной квитанции (Factura Digital) дает небольшую скидку.", en: "Opting for paperless billing (Factura Digital) provides a small monthly discount.", es: "Adherite a la Factura Digital: te hacen un pequeño descuento y no juntás papel.", pt: "Optar pela fatura digital dá um pequeno desconto mensal.", zh: "选择无纸化账单（Factura Digital）每月可获得少量折扣。" },
        { ru: "Платите до первого срока (Vencimiento), после второго начисляются пени.", en: "Pay before the first due date (Vencimiento); interest accrues after the second.", es: "Pagá antes del primer vencimiento. Si se te pasa el segundo, te cobran intereses.", pt: "Pague antes do primeiro vencimento para evitar os juros cobrados no segundo.", zh: "在第一个到期日（Vencimiento）之前付款；第二个到期日之后会产生利息。" },
        { ru: "О сбоях и отключениях быстрее сообщать через WhatsApp-бота Edenor/Edesur.", en: "Report power outages faster using the Edenor/Edesur WhatsApp bots.", es: "Si se corta la luz, es más rápido hacer el reclamo por el bot de WhatsApp.", pt: "Para relatar falta de luz, é mais rápido usar os bots de WhatsApp da Edenor/Edesur.", zh: "使用Edenor/Edesur的WhatsApp机器人报告停电速度更快。" },
        { ru: "Выключайте из розетки телевизоры и микроволновки: режим ожидания тратит свет.", en: "Unplug TVs and microwaves: standby mode consumes electricity.", es: "Desenchufá la tele y el microondas. La lucecita de stand-by gasta luz igual.", pt: "Tire TVs e micro-ondas da tomada: o modo standby consome energia.", zh: "拔掉电视和微波炉的插头：待机模式会耗电。" },
        { ru: "Превышение прошлогоднего лимита потребления переводит вас в дорогой тариф.", en: "Exceeding last year's consumption limit pushes you into a more expensive tariff tier.", es: "Si gastás más luz que el mismo mes del año pasado, te pasan a un cuadro tarifario más caro.", pt: "Ultrapassar o limite de consumo do ano passado te joga para uma tarifa mais cara.", zh: "超过去年的消耗限额会使您进入更昂贵的收费档次。" },
        { ru: "Смену владельца (Titularidad) нужно делать онлайн через сайт, без похода в офис.", en: "Change of ownership (Titularidad) is done entirely online via the website.", es: "El cambio de titularidad se hace 100% online en la web de Edesur/Edenor, no vayas a la sucursal.", pt: "A troca de titularidade é feita totalmente online pelo site da operadora.", zh: "所有权变更（Titularidad）完全通过网站在线完成。" },
        { ru: "Иногда счета приходят 'Оценочными' (Estimado). Требуйте перерасчет по счетчику.", en: "Bills are sometimes 'Estimated'. Demand a recalculation based on the actual meter.", es: "A veces la boleta dice 'Consumo Estimado'. Reclamá que te cobren lo que dice el medidor.", pt: "Às vezes as contas vêm 'Estimadas'. Exija o recálculo com base no medidor real.", zh: "账单有时是“估算”的。要求根据实际电表重新计算。" },
        { ru: "Приложение Edesur позволяет видеть график потребления и прогнозировать сумму.", en: "The Edesur app lets you see your consumption chart and predict the next amount.", es: "Bajate la app de Edesur para ver el gráfico de consumo y calcular cuánto vas a pagar.", pt: "O app da Edesur permite ver o gráfico de consumo e prever a próxima conta.", zh: "Edesur应用程序可让您查看消耗图表并预测下一个月的金额。" },
        { ru: "Оплата через PagoMisCuentas или MercadoPago подтверждается моментально.", en: "Payments via PagoMisCuentas or MercadoPago clear instantly.", es: "Pagar la boleta por MercadoPago o PagoMisCuentas impacta en el momento.", pt: "Pagamentos pelo PagoMisCuentas ou MercadoPago são compensados na hora.", zh: "通过PagoMisCuentas或MercadoPago的付款即时结清。" },
        { ru: "Замените все лампочки на LED — это окупается за 3 месяца.", en: "Replace all bulbs with LEDs—it pays for itself in 3 months.", es: "Cambiá todas las bombitas a LED. Recuperás la plata en 3 meses por lo que ahorrás en luz.", pt: "Troque todas as lâmpadas por LED: o investimento se paga em 3 meses.", zh: "将所有灯泡更换为LED——3个月即可回本。" },
        { ru: "Электрические духовки тратят колоссальное количество энергии.", en: "Electric ovens consume massive amounts of energy. Use sparingly.", es: "Los hornos eléctricos (y las pavas) te liquidan el consumo. Usalos lo justo y necesario.", pt: "Fornos elétricos consomem muita energia. Use com moderação.", zh: "电烤箱非常耗电。请节约使用。" },
        { ru: "Стоимость повторного подключения после неуплаты выше самого счета.", en: "The reconnection fee after shutoff is often higher than the original bill.", es: "Si te cortan por falta de pago, el cargo por reconexión te sale más caro que la boleta.", pt: "A taxa de religação após corte por falta de pagamento é mais cara que a conta.", zh: "欠费停电后的重新连接费用通常高于原账单金额。" },
        { ru: "Летом из-за перегрузок напряжение может падать. Берегите технику.", en: "Summer overloads can cause voltage drops. Protect your appliances.", es: "En verano hay bajones de tensión por el calor. Ojo con la heladera y la PC.", pt: "Sobrecargas no verão causam quedas de tensão. Proteja seus eletrodomésticos.", zh: "夏季超载会导致电压下降。请保护好您的电器。" },
        { ru: "Для дорогих ПК и холодильников купите стабилизатор напряжения (Elevador).", en: "Buy a voltage stabilizer (Elevador) for expensive PCs and fridges.", es: "Comprate un estabilizador de tensión para cuidar la compu y la heladera de los cortes.", pt: "Compre um estabilizador de tensão para proteger computadores caros e geladeiras.", zh: "为昂贵的个人电脑和冰箱购买稳压器（Elevador）。" }
    ],
    gas: [
        { ru: "Субсидии на газ также зависят от вашего дохода и регистрации в RASE.", en: "Gas subsidies also depend on your income and RASE registration.", es: "Al igual que la luz, el gas depende de que te anotes en el RASE según tus ingresos.", pt: "Os subsídios de gás também dependem da sua renda e registro no RASE.", zh: "燃气补贴也取决于您的收入和在RASE的注册情况。" },
        { ru: "Счета зимой могут быть в 5-10 раз выше летних из-за отопления.", en: "Winter bills can be 5-10x higher than summer ones due to heating.", es: "En invierno la factura de gas te puede venir 10 veces más alta si prendés las estufas.", pt: "As contas no inverno podem ser 5-10 vezes mais altas que no verão por causa do aquecimento.", zh: "由于供暖，冬季的账单可能比夏季高出5-10倍。" },
        { ru: "Выключайте запальник (piloto) у обогревателей весной.", en: "Turn off the pilot light on heaters in the spring to save gas.", es: "En primavera acordate de apagar el piloto de las estufas, gasta gas todo el día.", pt: "Desligue a chama piloto dos aquecedores na primavera para economizar gás.", zh: "在春天关闭取暖器的长明火以节省燃气。" },
        { ru: "Обязательно проверяйте вентиляционные решетки: угарный газ опасен.", en: "Check your ventilation grates: carbon monoxide is highly dangerous.", es: "Revisá las rejillas de ventilación. El monóxido de carbono no avisa y es peligroso.", pt: "Sempre verifique as grades de ventilação: o monóxido de carbono é perigoso.", zh: "务必检查通风栅：一氧化碳非常危险。" },
        { ru: "Служба поддержки Metrogas в WhatsApp поможет с переоформлением.", en: "Metrogas WhatsApp support can assist with account transfer processes.", es: "Para cambiar la titularidad, hablá por el WhatsApp de Metrogas, te guían paso a paso.", pt: "O suporte da Metrogas no WhatsApp ajuda com a troca de titularidade da conta.", zh: "Metrogas的WhatsApp客服可协助办理账户转让。" },
        { ru: "Показания счетчика можно передавать самостоятельно через сайт.", en: "You can submit meter readings manually through the provider's website.", es: "Si no pasan a medir, podés cargar los números del medidor vos mismo en la web.", pt: "Você pode informar a leitura do medidor manualmente pelo site da distribuidora.", zh: "您可以通过提供商的网站手动提交燃气表读数。" },
        { ru: "Тарифная категория (от R1 до R3) меняется в зависимости от кубометров.", en: "Your tariff category (R1 to R3) changes based on cubic meters used.", es: "Tu categoría (R1, R2, R3) cambia según cuántos metros cúbicos gastes al año.", pt: "Sua categoria tarifária (R1 a R3) muda de acordo com os metros cúbicos consumidos.", zh: "您的资费等级（R1到R3）会根据使用的立方米数而变化。" },
        { ru: "Настройте прямой дебет, чтобы не забыть оплатить счет в отпуске.", en: "Set up direct debit so you don't miss payments while on vacation.", es: "Adherite al débito automático para no colgar con el pago si te vas de vacaciones.", pt: "Configure o débito automático para não esquecer de pagar enquanto viaja.", zh: "设置直接扣款，以免在度假时忘记付款。" },
        { ru: "Оплата газа через криптокарты позволяет получить небольшую выгоду на спреде.", en: "Paying gas with crypto cards yields a small benefit on the exchange spread.", es: "Pagando el gas con tarjeta crypto le sacás una mínima diferencia al tipo de cambio.", pt: "Pagar o gás com cartões cripto rende um pequeno benefício no câmbio.", zh: "使用加密卡支付燃气费可以在汇差上获得一点小收益。" },
        { ru: "Для установки новой плиты нужен сертифицированный газовщик (Matriculado).", en: "Installing a new stove requires a certified gas fitter (Matriculado).", es: "Si comprás una cocina, la tiene que instalar un gasista matriculado, si no es ilegal.", pt: "Para instalar um fogão novo, é necessário um gasista certificado (Matriculado).", zh: "安装新炉灶需要有执照的燃气安装工（Matriculado）。" },
        { ru: "Цифровая квитанция помогает избежать потери счетов почтальоном.", en: "Digital billing prevents bills from being lost by the mail carrier.", es: "Pedí la factura digital. El cartero a veces deja la boleta en cualquier lado.", pt: "A fatura digital evita que as contas se perdam no correio.", zh: "数字账单可防止账单在邮寄过程中丢失。" },
        { ru: "Если накопился долг, компании предлагают планы рассрочки.", en: "If debt accumulates, gas companies offer installment payment plans.", es: "Si se te acumuló deuda, podés pedir un plan de pagos en cuotas desde la web.", pt: "Se acumular dívidas, as empresas de gás oferecem planos de parcelamento.", zh: "如果积累了债务，燃气公司会提供分期付款计划。" },
        { ru: "Приложение Naturgy показывает историю платежей за последние 2 года.", en: "The Naturgy app displays your payment history for the last 2 years.", es: "En la app de Naturgy podés ver tu historial de boletas de los últimos dos años.", pt: "O app da Naturgy mostra o histórico de pagamentos dos últimos 2 anos.", zh: "Naturgy应用程序会显示您过去2年的付款记录。" },
        { ru: "Оценочные счета (Consumo estimado) нужно оспаривать, иначе переплатите.", en: "Estimated bills must be disputed, or you will overpay.", es: "Si te llega 'consumo estimado', reclamá. Casi siempre te cobran de más.", pt: "Contas por estimativa devem ser contestadas, senão você pagará a mais.", zh: "必须对估算账单提出异议，否则您会多付钱。" },
        { ru: "В домах без газа отопление идет через электричество, что дороже.", en: "In gas-free buildings, heating is electric, which is generally more expensive.", es: "En los edificios modernos todo es eléctrico. Calefaccionar te va a salir más caro.", pt: "Em prédios sem gás, o aquecimento é elétrico, o que costuma ser mais caro.", zh: "在没有燃气的建筑中，供暖是电动的，通常更贵。" },
        { ru: "Почувствовали запах газа — звоните в службу спасения немедленно.", en: "Smell gas? Call the emergency hotline immediately.", es: "Si sentís olor a gas fuerte, llamá a emergencias al toque, no prendas la luz.", pt: "Sentiu cheiro de gás? Ligue imediatamente para a emergência.", zh: "闻到燃气味？立即拨打紧急热线。" },
        { ru: "Использование электрообогревателей для выравнивания счетов за газ — частая практика.", en: "Balancing gas bills by using electric heaters is a common local practice.", es: "Muchos usan caloventores eléctricos para no pasarse de categoría en la boleta de gas.", pt: "Usar aquecedores elétricos para equilibrar a conta de gás é uma prática comum.", zh: "使用电暖器来平衡燃气账单是一种常见的当地做法。" }
    ],
    water: [
        { ru: "Тарифы AySA разделены по зонам: в престижных районах платите полную цену.", en: "AySA tariffs are zoned: you pay full price in affluent neighborhoods.", es: "AySA cobra por zonas. Si vivís en Barrio Norte o Palermo, pagás tarifa plena.", pt: "As tarifas da AySA são por zona: em bairros nobres paga-se o valor integral.", zh: "AySA费率按区域划分：在富裕社区需支付全价。" },
        { ru: "В старых зданиях (PH) нет индивидуальных счетчиков, счет делится на всех.", en: "Older buildings (PH) lack individual meters; the bill is split among everyone.", es: "En los PH viejos no hay medidor propio. La factura de agua se divide en las expensas.", pt: "Prédios antigos não têm hidrômetro individual; a conta é dividida no condomínio.", zh: "老建筑（PH）没有独立水表；水费由大家分摊。" },
        { ru: "Подтекающий унитаз может незаметно увеличить ваш счет на тысячи песо.", en: "A running toilet can silently increase your bill by thousands of pesos.", es: "El inodoro que pierde agua te puede sumar miles de pesos a la factura sin darte cuenta.", pt: "Um vaso sanitário vazando pode aumentar sua conta em milhares de pesos sem você notar.", zh: "漏水的马桶会在不知不觉中使您的账单增加数千比索。" },
        { ru: "Субсидии на воду были отменены для среднего и высокого класса.", en: "Water subsidies were removed for middle and high-income classes.", es: "Le sacaron el subsidio del agua a la clase media y alta. Ahora viene más salado.", pt: "Os subsídios de água foram removidos para as classes média e alta.", zh: "中高收入阶层的水费补贴已被取消。" },
        { ru: "AySA позволяет оплатить год вперед, чтобы зафиксировать цену.", en: "AySA allows you to pay a year in advance to lock in the price.", es: "Podés pagar todo el año de AySA por adelantado y congelás los aumentos.", pt: "A AySA permite pagar um ano adiantado para congelar o preço e evitar aumentos.", zh: "AySA允许您提前支付一年的费用以锁定价格。" },
        { ru: "Смену имени в счете можно сделать онлайн, приложив договор аренды.", en: "Name changes on the bill can be done online by uploading your lease agreement.", es: "El cambio de titular lo hacés online subiendo el contrato de alquiler.", pt: "A troca de titularidade pode ser feita online anexando o contrato de aluguel.", zh: "只需上传您的租赁协议，即可在线完成账单的姓名更改。" },
        { ru: "Закажите электронный счет, чтобы письма не терялись в подъезде.", en: "Request e-billing so physical letters don't get lost in your building lobby.", es: "Pedí que te manden la boleta al mail, en los pasillos de los edificios siempre se pierden.", pt: "Peça a fatura por e-mail para que as correspondências não se percam no saguão.", zh: "要求电子账单，这样纸质信件就不会在公寓大堂丢失。" },
        { ru: "О прорывах труб на улице можно сообщить в приложении AySA или в WhatsApp.", en: "Street pipe bursts can be reported in the AySA app or via WhatsApp.", es: "Si ves un caño roto en la calle, denuncialo por el WhatsApp de AySA para que vengan.", pt: "Vazamentos na rua podem ser relatados no app da AySA ou no WhatsApp.", zh: "可以通过AySA应用程序或WhatsApp报告街道管道破裂。" },
        { ru: "На высоких этажах летом часто падает давление воды.", en: "Water pressure often drops on higher floors during summer months.", es: "Si vivís en un piso alto, en verano vas a notar que baja la presión del agua.", pt: "A pressão da água costuma cair em andares altos durante os meses de verão.", zh: "夏季高层建筑的水压经常下降。" },
        { ru: "Очистка бака здания (Limpieza de tanque) должна проводиться 2 раза в год.", en: "Building water tanks must be cleaned twice a year by administration.", es: "El consorcio tiene la obligación de limpiar los tanques de agua dos veces al año.", pt: "A limpeza das caixas d'água do prédio deve ser feita duas vezes por ano pelo condomínio.", zh: "大楼的水箱必须由管理处每年清洗两次。" },
        { ru: "Пени за неуплату начисляются ежедневно после второго срока.", en: "Late fees accrue daily after the second due date passes.", es: "Si se te pasa el segundo vencimiento, te corren intereses punitorios por cada día.", pt: "As multas por atraso são cobradas diariamente após o segundo vencimento.", zh: "超过第二个到期日后，每天都会产生滞纳金。" },
        { ru: "Пенсионеры могут подать заявку на 'Социальный тариф' (Tarifa Social).", en: "Retirees can apply for a 'Social Tariff' (Tarifa Social) to get a discount.", es: "Los jubilados pueden tramitar la Tarifa Social en la web para pagar mucho menos.", pt: "Aposentados podem solicitar a 'Tarifa Social' para obter desconto.", zh: "退休人员可以申请“社会费率”（Tarifa Social）以获得折扣。" },
        { ru: "Оплата через MercadoPago — самый надежный способ мгновенного зачисления.", en: "Paying via MercadoPago is the most reliable way to clear the bill instantly.", es: "Pagar con MercadoPago es la forma más rápida y segura de que impacte el pago.", pt: "Pagar pelo MercadoPago é a forma mais confiável de compensação instantânea.", zh: "通过MercadoPago付款是即时结清账单的最可靠方式。" },
        { ru: "Отчеты о качестве воды (Ph, хлор) публикуются на сайте AySA.", en: "Water quality reports (Ph, chlorine) are published on the AySA website.", es: "En la web de AySA suben los reportes de calidad, pH y cloro del agua de tu zona.", pt: "Os relatórios de qualidade da água (Ph, cloro) são publicados no site da AySA.", zh: "水质报告（Ph值、氯）发布在AySA网站上。" },
        { ru: "Поливать растения на балконе лучше вечером, чтобы вода не испарялась.", en: "Water balcony plants in the evening to prevent evaporation.", es: "Regá las plantas del balcón a la noche, así el agua no se evapora con el sol.", pt: "Regue as plantas da varanda à noite para evitar que a água evapore.", zh: "晚上给阳台上的植物浇水以防止蒸发。" },
        { ru: "Бот AySA в WhatsApp отвечает быстрее, чем горячая линия 0800.", en: "The AySA WhatsApp bot replies faster than the 0800 hotline.", es: "Ni te gastes en llamar al 0800, mandales un WhatsApp que te contestan más rápido.", pt: "O bot do WhatsApp da AySA responde mais rápido do que a central 0800.", zh: "AySA的WhatsApp机器人回复比0800热线更快。" },
        { ru: "Вызов частного сантехника (Plomero) стоит от 20 000 ARS только за осмотр.", en: "Calling a private plumber (Plomero) costs from 20,000 ARS just for the visit.", es: "Llamar a un plomero te sale más de 20 lucas solo para que te mire la pérdida.", pt: "Chamar um encanador particular custa a partir de 20.000 ARS só pela visita.", zh: "仅仅是上门检查，私人水管工的费用就从20,000比索起步。" }
    ],
    internet: [
        { ru: "Торгуйтесь: звоните провайдеру раз в полгода и просите 'Promoción'.", en: "Negotiate: call your provider every 6 months and ask for the 'Promoción'.", es: "Regla de oro: llamá cada 6 meses diciendo que te das de baja para que te den la 'Promoción'.", pt: "Negocie: ligue para o provedor a cada 6 meses e peça a 'Promoción'.", zh: "讨价还价：每6个月给提供商打一次电话，要求获得“优惠促销”。" },
        { ru: "Выбирайте оптоволокно (Fibra Óptica) вместо коаксиального кабеля для стабильности.", en: "Choose Fiber Optic (Fibra Óptica) over coaxial cable for better stability.", es: "Pedí Fibra Óptica siempre. El cable coaxial viejo se corta cuando llueve.", pt: "Escolha Fibra Ótica em vez de cabo coaxial para ter mais estabilidade.", zh: "选择光纤而不是同轴电缆以获得更好的稳定性。" },
        { ru: "Starlink теперь официально работает в Аргентине и хорош для пригородов.", en: "Starlink is now officially in Argentina and great for the suburbs.", es: "Starlink ya es oficial y es un golazo si vivís en un country o zona alejada.", pt: "Starlink já funciona oficialmente na Argentina e é ótimo para os subúrbios.", zh: "Starlink现在已在阿根廷正式运行，非常适合郊区。" },
        { ru: "Используйте сеть 5GHz для скорости, а 2.4GHz — если находитесь далеко от роутера.", en: "Use the 5GHz network for speed, and 2.4GHz if you are far from the router.", es: "Conectate al 5GHz para volar, y al 2.4GHz si estás en la otra punta de la casa.", pt: "Use a rede 5GHz para velocidade, e 2.4GHz se estiver longe do roteador.", zh: "追求速度请使用5GHz网络，距离路由器较远时请使用2.4GHz。" },
        { ru: "Абоненты Telecentro могут бесплатно подключаться к Wi-Fi на улицах CABA.", en: "Telecentro subscribers can connect to street Wi-Fi in CABA for free.", es: "Si sos de Telecentro, te podés colgar del Wi-Fi de la calle gratis en CABA.", pt: "Assinantes da Telecentro têm Wi-Fi grátis nas ruas de CABA.", zh: "Telecentro用户可以在CABA免费连接街道Wi-Fi。" },
        { ru: "Flow предлагает бесплатный доступ к ТВ-приложению для своих абонентов.", en: "Flow offers free access to their live TV app for internet subscribers.", es: "Con el internet de Flow te viene gratis la app para ver la tele en vivo en el celu.", pt: "A Flow oferece acesso grátis ao app de TV ao vivo para clientes de internet.", zh: "Flow为网络用户提供免费的直播电视应用程序访问权限。" },
        { ru: "Покупка собственного роутера решит 90% проблем с сигналом провайдера.", en: "Buying your own router solves 90% of signal issues from ISP modems.", es: "Comprate un buen router TPLink o Asus. Los módems que te dejan son malísimos.", pt: "Comprar um roteador próprio resolve 90% dos problemas de sinal do provedor.", zh: "购买自己的路由器可解决90%由ISP调制解调器引起的信号问题。" },
        { ru: "При отмене контракта обязательно верните модем, иначе получите крупный штраф.", en: "When canceling, make sure to return the modem or face a hefty fine.", es: "Si te das de baja, devolvé el módem. Si no, te clavan una multa terrible en la tarjeta.", pt: "Ao cancelar, devolva o modem obrigatoriamente, ou receberá uma multa alta.", zh: "取消合约时，请务必归还调制解调器，否则将面临巨额罚款。" },
        { ru: "Стоимость установки обычно разбивается на 3 платежа в первых счетах.", en: "Installation fees are usually split into 3 payments on your first bills.", es: "El costo de instalación te lo suelen dividir en 3 cuotas en las primeras facturas.", pt: "A taxa de instalação geralmente é dividida em 3 vezes nas primeiras faturas.", zh: "安装费通常会在您最初的几期账单中分3次支付。" },
        { ru: "Обращайте внимание на скорость отдачи (Upload): часто она в 10 раз ниже скачивания.", en: "Check the upload speed: it is often 10 times slower than download.", es: "Ojo con la velocidad de subida. Te venden 300 Megas pero de subida son 30.", pt: "Preste atenção na velocidade de upload: costuma ser 10 vezes menor que o download.", zh: "注意上传速度：通常比下载速度慢10倍。" },
        { ru: "Пакет 'Интернет + Мобильная связь' у Claro экономит до 30%.", en: "Claro's 'Internet + Mobile' bundle saves you up to 30%.", es: "Juntar el internet de casa y el plan del celu en Claro te ahorra hasta un 30%.", pt: "O pacote 'Internet + Celular' da Claro economiza até 30%.", zh: "Claro的“家庭网络+移动通讯”组合可为您节省高达30%的费用。" },
        { ru: "О микро-отключениях (Microcortes) пишите в Twitter: там поддержка реагирует мгновенно.", en: "Report micro-cuts on Twitter: support reacts instantly there.", es: "Quejate de los microcortes por Twitter etiquetando a la empresa, te contestan al vuelo.", pt: "Relate micro-quedas de sinal no Twitter: o suporte responde na hora por lá.", zh: "在Twitter上报告微断网情况：那里的客服反应最快。" },
        { ru: "Оплата по прямому дебету (Débito) часто является условием сохранения скидки.", en: "Paying via direct debit is often required to keep your promotional discount.", es: "Para que te mantengan la 'Promo', casi siempre te obligan a poner débito automático.", pt: "Pagar por débito automático costuma ser exigência para manter o desconto.", zh: "通常需要通过直接扣款付款才能保留您的促销折扣。" },
        { ru: "Проверяйте реальную скорость через Speedtest при подключении по кабелю, а не Wi-Fi.", en: "Verify true speeds via Speedtest using a LAN cable, not Wi-Fi.", es: "Medí la velocidad con Speedtest pero enchufando el cable a la PC, el Wi-Fi siempre pierde.", pt: "Verifique a velocidade real no Speedtest com o cabo de rede, não no Wi-Fi.", zh: "使用网线（而非Wi-Fi）通过Speedtest验证真实速度。" },
        { ru: "Iplan работает только в элитных районах, но предоставляет 100% симметричный канал.", en: "Iplan only operates in premium areas but offers a 100% symmetrical connection.", es: "Iplan solo llega a barrios chetos, pero te da internet simétrico de verdad.", pt: "Iplan só atende áreas nobres, mas oferece internet 100% simétrica.", zh: "Iplan仅在高级社区运营，但提供100%上下行对称的网络连接。" },
        { ru: "Смена DNS-серверов на Google (8.8.8.8) часто решает проблемы с пингом.", en: "Changing DNS servers to Google (8.8.8.8) often fixes ping issues.", es: "Si te anda lento, cambiale los DNS a los de Google (8.8.8.8) en el router.", pt: "Mudar o DNS para o do Google (8.8.8.8) geralmente melhora problemas de ping.", zh: "将DNS服务器更改为Google（8.8.8.8）通常能解决ping值问题。" },
        { ru: "Закон обязывает провайдеров делать перерасчет за дни без интернета.", en: "The law requires ISPs to discount days when you had no internet service.", es: "Por ley, si estuviste días sin internet, te los tienen que descontar de la factura.", pt: "A lei obriga as operadoras a descontarem os dias que você ficou sem internet.", zh: "法律要求ISP对您没有网络服务的日子进行退费折扣。" }
    ],
    transport: [
        { ru: "Зарегистрируйте карту SUBE на свое имя, иначе проезд будет в 2 раза дороже.", en: "Register your SUBE card in your name, or fares will be 2x more expensive.", es: "Registrá la SUBE a tu nombre en la web, si no te cobran el boleto al doble.", pt: "Registre seu cartão SUBE em seu nome, ou a passagem custará o dobro.", zh: "以您的名义注册SUBE卡，否则票价将贵一倍。" },
        { ru: "Оплата проезда телефоном (NFC) доступна в большинстве автобусов CABA.", en: "NFC phone payments are now available on most CABA buses.", es: "Ya podés pagar el bondi apoyando el celu con NFC, olvidate del plástico.", pt: "O pagamento via celular (NFC) já está disponível na maioria dos ônibus de CABA.", zh: "CABA的大多数公交车现已支持手机NFC支付。" },
        { ru: "Пополнить SUBE можно через MercadoPago, но нужно приложить ее к телефону для активации.", en: "Recharge SUBE via MercadoPago, but you must tap it on your phone to activate.", es: "Cargá la SUBE por MercadoPago y acreditala apoyando la tarjeta atrás del celu.", pt: "Recarregue o SUBE pelo MercadoPago e valide encostando o cartão no celular.", zh: "通过MercadoPago充值SUBE，但必须将其贴在手机上进行激活。" },
        { ru: "Желтые терминалы (Terminal Automática) на вокзалах нужны для активации баланса SUBE.", en: "Yellow terminals at stations are used to activate pending SUBE balances.", es: "Las maquinitas amarillas en las estaciones son para acreditar la carga de la SUBE.", pt: "Os terminais amarelos nas estações servem para ativar as recargas pendentes do SUBE.", zh: "车站的黄色终端用于激活待处理的SUBE余额。" },
        { ru: "Цены на Uber и Cabify взлетают в 2-3 раза во время дождя (Tarifa dinámica).", en: "Uber and Cabify prices surge 2-3x when it rains (Dynamic pricing).", es: "Si llueve, Uber y Cabify te aplican tarifa dinámica y te arrancan la cabeza.", pt: "Os preços do Uber e Cabify disparam de 2 a 3 vezes quando chove (Tarifa dinâmica).", zh: "下雨时，Uber和Cabify的价格会飙升2-3倍（动态定价）。" },
        { ru: "Didi Moto — самый быстрый и дешевый способ передвижения для одного человека.", en: "Didi Moto is the fastest and cheapest option for solo travelers.", es: "Didi Moto es la salvación: llegás rapidísimo y es súper barato si viajás solo.", pt: "Didi Moto é a opção mais rápida e barata para viajar sozinho.", zh: "对于单人出行，滴滴摩托是最快、最便宜的选择。" },
        { ru: "Метро (Subte) закрывается довольно рано: в 23:30 (в воскресенье в 22:30).", en: "The subway (Subte) closes quite early: 11:30 PM (10:30 PM on Sundays).", es: "Ojo que el Subte cierra re temprano: a las 23:30, y los domingos a las 22:30.", pt: "O metrô (Subte) fecha bem cedo: às 23h30 (22h30 aos domingos).", zh: "地铁（Subte）关门相当早：晚上11:30（周日晚上10:30）。" },
        { ru: "Система EcoBici бесплатна для резидентов (до 30 мин), но платна для туристов.", en: "EcoBici is free for residents (under 30 mins) but paid for tourists.", es: "Las bicis de la Ciudad son gratis para residentes (30 min), el turista paga.", pt: "O EcoBici é grátis para residentes (até 30 min), mas pago para turistas.", zh: "EcoBici对居民（30分钟内）免费，但对游客收费。" },
        { ru: "Скидка 'Red SUBE' работает автоматически: вторая и третья поездка за 2 часа стоят дешевле.", en: "The 'Red SUBE' discount is automatic: 2nd and 3rd trips within 2 hours are cheaper.", es: "La Red SUBE te hace descuento automático: el segundo viaje en menos de 2 horas sale menos.", pt: "O desconto 'Red SUBE' é automático: 2ª e 3ª viagens em até 2 horas saem mais baratas.", zh: "'Red SUBE'折扣自动生效：2小时内的第二和第三次乘车更便宜。" },
        { ru: "Привяжите номер к TelePASE для автоматической оплаты проезда по платным дорогам.", en: "Link your license plate to TelePASE for automatic toll payments.", es: "Adherí la patente a TelePASE para pasar los peajes sin frenar y que te debite solo.", pt: "Vincule a placa do carro ao TelePASE para pagamento automático de pedágios.", zh: "将您的车牌绑定到TelePASE以实现自动支付过路费。" },
        { ru: "Трансфер в аэропорт Ezeiza надежнее заказывать через Cabify или Taxi Premium.", en: "Airport transfers to Ezeiza are safer via Cabify or Taxi Premium.", es: "Para ir a Ezeiza pedite un Cabify o Taxi Premium, evitá los taxis de la calle.", pt: "Para ir ao aeroporto de Ezeiza, é mais seguro usar Cabify ou Taxi Premium.", zh: "前往Ezeiza机场的接送服务，通过Cabify或Taxi Premium预订更安全。" },
        { ru: "Приложение 'Cuándo SUBO' показывает точное время прибытия автобуса по GPS.", en: "The 'Cuándo SUBO' app tracks live bus arrivals via GPS.", es: "Bajate la app 'Cuándo SUBO' para ver por GPS cuánto le falta al colectivo.", pt: "O app 'Cuándo SUBO' mostra a previsão exata de chegada do ônibus pelo GPS.", zh: "“Cuándo SUBO”应用程序通过GPS追踪公交车的实时到达时间。" },
        { ru: "Поезд Tren Mitre часто удобнее и быстрее автобуса при поездках в северные районы.", en: "The Tren Mitre is often faster and more comfortable than buses for the northern suburbs.", es: "Para ir a zona norte, el Tren Mitre es mil veces más rápido y cómodo que el bondi.", pt: "O Tren Mitre costuma ser mais rápido e confortável que ônibus para os subúrbios do norte.", zh: "前往北部郊区，Tren Mitre火车通常比公交车更快、更舒适。" },
        { ru: "Uber позволяет привязывать зарубежные карты и оплачивать в ARS по хорошему курсу.", en: "Uber allows foreign cards, billing in ARS at a favorable rate.", es: "Podés meter la tarjeta de afuera en Uber y te cobra en pesos a un re buen cambio.", pt: "O Uber aceita cartões estrangeiros, cobrando em pesos com uma boa taxa.", zh: "Uber允许绑定外国信用卡，并以优惠汇率的ARS结算。" },
        { ru: "Cabify предлагает корпоративные аккаунты с ежемесячной фактурой (Factura A).", en: "Cabify offers corporate accounts with monthly invoicing (Factura A).", es: "Cabify tiene cuentas corporativas y te hace Factura A mensual para la empresa.", pt: "A Cabify oferece contas corporativas com faturamento mensal (Factura A).", zh: "Cabify提供带有月度发票（Factura A）的企业账户。" },
        { ru: "SUBE имеет 'отрицательный баланс' (Saldo negativo), который позволяет сделать 1-2 поездки в долг.", en: "SUBE has a 'negative balance' limit allowing 1-2 trips on credit.", es: "La SUBE tiene saldo negativo, te salva para hacer un viaje más si te quedaste sin carga.", pt: "O SUBE tem um 'saldo negativo' que permite fazer 1-2 viagens fiado.", zh: "SUBE具有“负余额”额度，允许透支乘车1-2次。" },
        { ru: "Студенты и пенсионеры могут привязать льготный тариф в центрах обслуживания SUBE.", en: "Students and retirees can link their discount fares at SUBE service centers.", es: "El boleto estudiantil y de jubilados se tramita en los centros de atención SUBE.", pt: "Estudantes e aposentados podem ativar o desconto nos postos de atendimento SUBE.", zh: "学生和退休人员可以在SUBE服务中心绑定折扣票价。" }
    ],
    health: [
        { ru: "В 2026 году пластиковые карточки (Prepagas) не нужны, везде показывают Credencial Digital из приложения.", en: "Physical health cards aren't needed; everyone uses the Digital Credential app.", es: "Ya no se usa la credencial de plástico, mostrás la Credencial Digital de la app en la guardia.", pt: "Cartões físicos não são mais usados; mostre a Credencial Digital no aplicativo.", zh: "不再需要实体医疗卡；每个人都在应用程序中使用数字凭证。" },
        { ru: "Обратите внимание на 'Copagos': базовые планы теперь берут доплату за визиты к специалистам.", en: "Watch out for 'Copagos': base plans now charge a small fee for specialist visits.", es: "Ojo con los copagos. Los planes bajos ahora te cobran un extra cada vez que vas al médico.", pt: "Atenção aos 'Copagos': os planos básicos agora cobram taxa extra para especialistas.", zh: "注意“Copagos”：基本套餐现在对专科医生就诊收取少量共付费用。" },
        { ru: "Разрешения на сложные анализы (Autorizaciones) легко сделать, отправив фото рецепта в WhatsApp.", en: "Test authorizations are easily done by sending a photo of the prescription via WhatsApp.", es: "Las autorizaciones de estudios las hacés mandando foto de la orden por WhatsApp.", pt: "Autorizações para exames são feitas enviando uma foto da receita pelo WhatsApp.", zh: "通过WhatsApp发送处方照片即可轻松完成复杂检查的授权。" },
        { ru: "Врачи отправляют рецепты в электронном виде: в аптеке достаточно назвать свой DNI.", en: "Doctors send prescriptions digitally: at the pharmacy, just state your ID (DNI).", es: "La receta electrónica es la norma. Vas a la farmacia, decís tu DNI y te dan el remedio.", pt: "Os médicos enviam receitas eletrônicas: na farmácia, basta informar seu DNI.", zh: "医生以电子方式发送处方：在药房只需报出您的身份证（DNI）即可。" },
        { ru: "Стоимость медицинских страховок (Cuotas) корректируется почти каждый месяц.", en: "Health insurance premiums (Cuotas) adjust almost every month.", es: "La cuota de la prepaga te va a aumentar casi todos los meses por la inflación.", pt: "As mensalidades dos planos de saúde (Cuotas) são reajustadas quase todo mês.", zh: "医疗保险保费（Cuotas）几乎每个月都会调整。" },
        { ru: "Просите фармацевта 'Genérico' (дженерик), это в 2-3 раза дешевле известных брендов.", en: "Ask the pharmacist for the 'Genérico' (generic); it's 2-3x cheaper.", es: "Pedile siempre el remedio genérico al farmacéutico, es la misma droga y sale un tercio.", pt: "Peça sempre o remédio 'Genérico' na farmácia: é 2 a 3 vezes mais barato.", zh: "向药剂师要求“仿制药”（Genérico）；它比知名品牌便宜2-3倍。" },
        { ru: "При легкой простуде используйте 'Telemedicina' (видеозвонок), это бесплатно и без очередей.", en: "For a simple cold, use 'Telemedicina' (video call) to avoid queues.", es: "Si estás engripado usá la videoconsulta (Telemedicina). Te dan la receta y no salís de casa.", pt: "Para um resfriado leve, use a 'Telemedicina' (videochamada) e evite filas.", zh: "对于轻微感冒，请使用“远程医疗”（视频通话）以避免排队。" },
        { ru: "Некоторые специалисты в клиниках принимают только по направлению (Derivación) от терапевта.", en: "Some specialists only accept patients with a referral (Derivación) from a GP.", es: "Para ver a algunos especialistas, primero tenés que sacar turno con un clínico para que te derive.", pt: "Alguns especialistas só atendem com encaminhamento (Derivación) de um clínico geral.", zh: "某些专科医生只接受有全科医生转诊单（Derivación）的患者。" },
        { ru: "Cartilla médica (список врачей) постоянно меняется, всегда проверяйте актуальность в приложении.", en: "The medical directory (Cartilla) changes often; always check the app for updates.", es: "La cartilla médica cambia a cada rato. Buscá siempre los médicos desde la app actualizada.", pt: "O guia médico (Cartilla) muda com frequência; verifique sempre o app atualizado.", zh: "医生名录（Cartilla）经常变动；请始终在应用程序中查看最新信息。" },
        { ru: "Если вы не задекларируете хронические болезни при вступлении, вам могут отказать в лечении.", en: "If you don't declare pre-existing conditions upon joining, coverage may be denied.", es: "No mientas en la declaración jurada: si ocultás una enfermedad preexistente, te dejan sin cobertura.", pt: "Se você não declarar doenças pré-existentes na adesão, podem negar cobertura depois.", zh: "如果在加入时未申报既往病史，可能会被拒绝承保。" },
        { ru: "Базовая стоматология (чистка, пломбы) включена, но брекеты и импланты — за свой счет.", en: "Basic dentistry is included, but braces and implants are out-of-pocket.", es: "Te cubre caries y limpieza, pero si necesitás ortodoncia o implantes, los pagás aparte.", pt: "Odontologia básica é coberta, mas aparelhos e implantes são por sua conta.", zh: "基础牙科（洗牙、补牙）包含在内，但牙套和种植牙需要自费。" },
        { ru: "Возвраты средств (Reintegros) за врачей вне страховки приходят на ваш счет CBU.", en: "Reimbursements (Reintegros) for out-of-network doctors are wired to your CBU.", es: "Para los reintegros tenés que cargar la factura en la web y te transfieren la plata a tu CBU.", pt: "Os reembolsos (Reintegros) para médicos particulares caem direto na sua conta bancária (CBU).", zh: "网络外医生的报销款（Reintegros）会汇入您的银行账户（CBU）。" },
        { ru: "Закон PMO обязывает все страховки бесплатно предоставлять жизненно важные лекарства.", en: "The PMO law forces all insurers to provide vital medicines for free.", es: "Por el PMO (Programa Médico Obligatorio), las prepagas te tienen que dar medicación crónica gratis.", pt: "A lei PMO obriga os planos a cobrirem medicamentos vitais e crônicos de graça.", zh: "PMO法律强制所有保险公司免费提供重要药物。" },
        { ru: "Оплата страховки (Prepaga) криптокартой часто дает дополнительный кэшбэк 2%.", en: "Paying your health premium with a crypto card often yields a 2% cashback.", es: "Si tenés la cuota en débito automático con una tarjeta crypto, le sacás 2% de reintegro.", pt: "Pagar a mensalidade de saúde com cartão cripto costuma dar 2% de cashback.", zh: "使用加密货币卡支付健康保费通常可获得2%的返现。" },
        { ru: "Добавить родственников (Grupo Familiar) в план выгоднее, чем покупать страховки отдельно.", en: "Adding relatives to a 'Grupo Familiar' plan is cheaper than individual policies.", es: "Hacer un plan de grupo familiar sale mucho más barato que pagar a cada uno por separado.", pt: "Adicionar a família num plano 'Grupo Familiar' é mais barato que seguros individuais.", zh: "将亲属加入“家庭组”计划比单独购买保单更便宜。" },
        { ru: "Вы можете сменить страховку раз в год (Desregulación), направив свои налоги в новую компанию.", en: "You can switch insurers once a year by redirecting your salary taxes.", es: "Podés derivar tus aportes del recibo de sueldo a otra prepaga para pagar mucho menos.", pt: "Você pode mudar de plano uma vez por ano, direcionando seus impostos do salário.", zh: "您每年可以通过将工资税转入新公司来更换一次保险。" },
        { ru: "При покупке лекарств по рецепту страховки дают скидку от 40% до 70%.", en: "Prescription drugs get a 40% to 70% discount at the pharmacy with your insurance.", es: "Presentando la credencial y la receta, la farmacia te hace entre 40% y 70% de descuento.", pt: "Remédios com receita têm entre 40% e 70% de desconto na farmácia com o seu plano.", zh: "凭处方和保险，在药房购买处方药可享受40%至70%的折扣。" }
    ],
    education: [
        { ru: "Частные школы собирают плату за зачисление (Matrícula) обычно в декабре или феврале.", en: "Private schools collect the enrollment fee (Matrícula) in December or February.", es: "A prepararse: las matrículas de los colegios privados se pagan siempre entre diciembre y febrero.", pt: "Colégios particulares cobram a taxa de matrícula geralmente entre dezembro e fevereiro.", zh: "私立学校通常在十二月或二月收取注册费（Matrícula）。" },
        { ru: "Ежемесячные квоты (Cuotas) в частных школах регулярно индексируются из-за инфляции.", en: "Monthly school fees (Cuotas) are regularly indexed due to inflation.", es: "La cuota del colegio te va a aumentar cada un par de meses siguiendo a la inflación.", pt: "As mensalidades escolares (Cuotas) são indexadas regularmente devido à inflação.", zh: "由于通货膨胀，私立学校的月费（Cuotas）会定期编制指数化调整。" },
        { ru: "Учеба в UBA (Университет Буэнос-Айреса) бесплатна, но аспирантура (Posgrado) — платная.", en: "UBA undergrad is free, but postgraduate (Posgrado) courses are paid.", es: "Estudiar la carrera de grado en la UBA es gratis, pero los posgrados se pagan.", pt: "A graduação na UBA é grátis, mas as pós-graduações (Posgrado) são pagas.", zh: "UBA（布宜诺斯艾利斯大学）本科免费，但研究生（Posgrado）课程是收费的。" },
        { ru: "Платформы вроде Coderhouse позволяют оплачивать курсы в рассрочку до 12 месяцев.", en: "Platforms like Coderhouse allow you to pay for courses in up to 12 installments.", es: "Coderhouse y DigitalHouse te dejan pagar los cursos en hasta 12 cuotas sin interés.", pt: "Plataformas como Coderhouse permitem pagar os cursos em até 12 parcelas.", zh: "像Coderhouse这样的平台允许您最多分12期支付课程费用。" },
        { ru: "Работающие граждане могут вычесть расходы на школу из налогов (AFIP/ARCA).", en: "Employed citizens can deduct school expenses from their taxes via AFIP/ARCA.", es: "Si estás en blanco, podés deducir los gastos del colegio de tus impuestos en ARCA (ex AFIP).", pt: "Cidadãos empregados podem deduzir despesas escolares de seus impostos na ARCA.", zh: "在职公民可以通过AFIP/ARCA从税收中扣除学校费用。" },
        { ru: "Учебники часто выгоднее покупать в PDF или искать на студенческих форумах.", en: "It's often cheaper to buy PDF textbooks or look in student forums.", es: "No compres los libros originales, en los grupos de Facebook de la facultad están todos en PDF.", pt: "Muitas vezes é mais barato comprar livros em PDF ou buscar em fóruns de estudantes.", zh: "购买PDF格式的教科书或在学生论坛上寻找通常更便宜。" },
        { ru: "Студенческий билет дает скидки на софт (Office, Adobe) и стриминги (Spotify).", en: "A student ID grants discounts on software (Office, Adobe) and streaming (Spotify).", es: "Usá el mail '.edu.ar' de la facu para sacar Spotify y el paquete Office a mitad de precio.", pt: "A carteira de estudante dá descontos em softwares e serviços de streaming (Spotify).", zh: "学生证可享受软件（Office、Adobe）和流媒体（Spotify）折扣。" },
        { ru: "Оплатить квоту частного университета можно моментально через сеть PagoMisCuentas.", en: "Private university fees can be paid instantly through the PagoMisCuentas network.", es: "La cuota de la UADE o la UCA la pagás al toque por PagoMisCuentas desde el homebanking.", pt: "As mensalidades de universidades privadas podem ser pagas na hora pelo PagoMisCuentas.", zh: "可以通过PagoMisCuentas网络即时支付私立大学费用。" },
        { ru: "Школы английского языка (Institutos) обычно требуют оплату наличными или переводом.", en: "English institutes usually require payment in cash or direct transfer.", es: "Los institutos de inglés de barrio te suelen cobrar en efectivo o transferencia por alias.", pt: "Os institutos de inglês costumam cobrar em dinheiro ou transferência bancária.", zh: "英语学院通常要求以现金或直接转账方式付款。" },
        { ru: "В школах всегда есть дополнительные сборы: 'Cooperadora', экскурсии, материалы.", en: "Schools always have extra fees: 'Cooperadora', field trips, and materials.", es: "El colegio no es solo la cuota. Prepará la billetera para la Cooperadora, paseos y fotocopias.", pt: "As escolas sempre têm taxas extras: 'Cooperadora', excursões e materiais.", zh: "学校总是有额外费用：'Cooperadora'（家长会费）、郊游和材料费。" },
        { ru: "Школьная форма (Uniformes) продается в специализированных магазинах района.", en: "School uniforms are sold in specialized neighborhood shops.", es: "Los uniformes no se venden en el colegio, tenés que ir a las mercerías o casas del barrio.", pt: "Uniformes escolares são vendidos em lojas especializadas do bairro.", zh: "校服在专门的社区商店出售。" },
        { ru: "Школьные автобусы (Micros escolares) оплачиваются напрямую водителю ежемесячно.", en: "School buses (Micros) are paid directly to the driver on a monthly basis.", es: "El micro escolar (el bondi naranja) se le paga por mes directo al chofer.", pt: "O transporte escolar (Micro) é pago diretamente ao motorista mensalmente.", zh: "校车（Micros）费用每月直接支付给司机。" },
        { ru: "Вы можете подать заявку на стипендию (Beca) в большинстве частных университетов.", en: "You can apply for a scholarship (Beca) at most private universities.", es: "Si no llegás con la cuota de la privada, pedí una Beca, te pueden cubrir hasta el 50%.", pt: "Você pode solicitar uma bolsa (Beca) na maioria das universidades particulares.", zh: "您可以在大多数私立大学申请奖学金（Beca）。" },
        { ru: "Дипломы об окончании теперь выдаются в виде PDF с цифровой подписью министерства.", en: "Diplomas are now issued as PDFs with the ministry's digital signature.", es: "El título universitario ya no tarda dos años. Te dan un PDF con firma digital del Ministerio.", pt: "Os diplomas agora são emitidos em PDF com a assinatura digital do Ministério.", zh: "现在颁发的毕业证书带有政府部的数字签名的PDF文件。" },
        { ru: "Репетиторов (Particulares) для подготовки к экзаменам принято оплачивать после занятия.", en: "Private tutors (Particulares) are traditionally paid right after the session.", es: "Al profesor particular se le paga la hora justo cuando termina la clase, por transferencia.", pt: "Professores particulares geralmente são pagos logo após a aula terminar.", zh: "传统的做法是在补习结束后直接向私人辅导老师（Particulares）付款。" },
        { ru: "В столовых кампусов (Comedor) не принимают наличные, только QR MercadoPago.", en: "Campus dining halls (Comedor) do not accept cash, only MercadoPago QR.", es: "En el buffet de la facultad olvidate del efectivo, es todo con QR de MercadoPago.", pt: "Os refeitórios universitários (Comedor) não aceitam dinheiro, só QR code do MercadoPago.", zh: "校园餐厅（Comedor）不收现金，只接受MercadoPago二维码付款。" },
        { ru: "За задержку возврата книг в библиотеке UBA вам просто заблокируют выдачу новых.", en: "Late library book returns at UBA will simply block you from borrowing more.", es: "Si te atrasás con el libro de la biblioteca en la UBA, te bloquean y no podés sacar otro.", pt: "Atrasar devoluções na biblioteca da UBA bloqueia você de pegar novos livros.", zh: "在UBA逾期归还图书馆书籍只会阻止您借阅更多书籍。" }
    ],
    rent: [
        { ru: "Закон об аренде был отменен. Теперь контракты могут заключаться в долларах/USDT.", en: "The rent law was repealed. Contracts can now be legally made in USD/USDT.", es: "Con la nueva ley, el alquiler se puede pactar legalmente en dólares o USDT sin drama.", pt: "A lei do aluguel caiu. Agora os contratos podem ser feitos legalmente em Dólares ou USDT.", zh: "租赁法已被废除。现在可以合法地使用美元/USDT签订合同。" },
        { ru: "Цены (Alquiler) корректируются каждые 3-4 месяца по индексу инфляции (IPC или CER).", en: "Rent prices adjust every 3-4 months based on inflation indexes (IPC or CER).", es: "El alquiler te lo van a actualizar cada 3 o 4 meses usando el índice IPC o CER.", pt: "Os preços do aluguel são reajustados a cada 3-4 meses pelo índice de inflação (IPC ou CER).", zh: "租金价格每3-4个月根据通货膨胀指数（IPC或CER）进行调整。" },
        { ru: "Expensas (Коммунальные сборы здания) растут каждый месяц. Проверяйте 'Extraordinarias'.", en: "Building fees (Expensas) rise monthly. Ensure you don't pay 'Extraordinarias' (owner's duty).", es: "Las expensas suben siempre. Acordate que las 'Extraordinarias' las tiene que pagar el dueño.", pt: "O condomínio (Expensas) sobe todo mês. Verifique as 'Extraordinarias', que são do dono.", zh: "建筑管理费（Expensas）每月都在上涨。确保您不支付应由房东承担的“额外费用”（Extraordinarias）。" },
        { ru: "Для аренды нужна местная гарантия или страховка от Finaer / Garantía BA.", en: "Renting requires a local property guarantee or insurance like Finaer.", es: "Si no tenés garantía de propiedad en Capital, contratá un seguro de caución como Finaer.", pt: "Para alugar é preciso fiador local ou um seguro fiança como o Finaer.", zh: "租房需要当地的财产担保或像Finaer这样的担保保险。" },
        { ru: "Переводите арендную плату через CVU: это надежно и оставляет цифровой след.", en: "Transfer rent via CVU: it's reliable and leaves a legal digital paper trail.", es: "Pagá el alquiler siempre por transferencia bancaria (CBU/CVU) para tener el comprobante.", pt: "Pague o aluguel via transferência (CVU) para ter o comprovante digital legal.", zh: "通过CVU转账支付租金：它可靠并留有合法的数字纸质记录。" },
        { ru: "Залог (Depósito), внесенный в долларах, хозяин обязан вернуть в долларах.", en: "A deposit made in USD must be legally returned in USD.", es: "Regla básica: si dejaste el mes de depósito en dólares, te tienen que devolver dólares.", pt: "O depósito caução pago em dólares deve ser devolvido em dólares.", zh: "以美元支付的押金必须依法以美元退还。" },
        { ru: "Налог ABL (уличное освещение и уборка) по новым правилам обычно платит хозяин.", en: "The ABL tax (city lighting/sweeping) is usually paid by the owner under new norms.", es: "El impuesto ABL y el Inmobiliario ahora es costumbre que lo pague el propietario.", pt: "O imposto ABL (luz e limpeza da rua) agora costuma ser pago pelo proprietário.", zh: "根据新规，ABL税（城市照明/街道清扫）通常由房东支付。" },
        { ru: "Квартиры на Airbnb в Буэнос-Айресе сдаются строго в валюте (USD/Euro).", en: "Airbnb apartments in Buenos Aires are rented strictly in foreign currency (USD/Euro).", es: "Los alquileres temporarios por Airbnb se manejan 100% en dólares, olvidate de los pesos.", pt: "Os aluguéis do Airbnb em Buenos Aires são cobrados estritamente em moeda estrangeira (USD).", zh: "布宜诺斯艾利斯的Airbnb公寓严格以外币（美元/欧元）出租。" },
        { ru: "Внимательно читайте Reglamento de Copropiedad: во многих зданиях запрещены собаки.", en: "Read the building's co-property rules: many buildings strictly ban dogs.", es: "Antes de mudarte pedí el Reglamento de Copropiedad, en algunos edificios no te dejan tener perro.", pt: "Leia as regras do condomínio: muitos prédios proíbem cães estritamente.", zh: "仔细阅读建筑的共有产权规则：许多建筑严格禁止养狗。" },
        { ru: "Штрафы за опоздание (Mora) с оплатой аренды составляют от 0.1% до 1% в день.", en: "Late payment fines for rent range from 0.1% to 1% per day.", es: "No te atrases con el alquiler porque los intereses punitorios por mora te liquidan.", pt: "Multas por atraso no aluguel variam de 0,1% a 1% ao dia.", zh: "延迟支付租金的罚款为每天0.1%至1%。" },
        { ru: "Комиссия риелтора (Comisión inmobiliaria) в CABA по закону не взимается с арендатора.", en: "By CABA law, the real estate agent's commission cannot be charged to the tenant.", es: "En Capital Federal, por ley, la comisión de la inmobiliaria la paga el dueño, no el inquilino.", pt: "Pela lei de CABA, a comissão da imobiliária é paga pelo proprietário, não pelo inquilino.", zh: "根据CABA法律，房地产中介的佣金不能向租客收取。" },
        { ru: "Перед въездом требуйте 'Inventario' с фото, чтобы не платить за старые царапины.", en: "Demand a photo 'Inventory' before moving in so you don't pay for old damages.", es: "Hacé un inventario con fotos de todo lo que esté roto antes de entrar, para que no te lo cobren al irte.", pt: "Exija um inventário com fotos antes de entrar, para não pagar por danos antigos.", zh: "入住前要求提供带有照片的“库存清单”，以免为旧损坏买单。" },
        { ru: "Контракты делятся на временные (до 1 года) и долгосрочные (на 2 года).", en: "Contracts are divided into temporary (up to 1 year) and long-term (2 years).", es: "Tenés dos opciones hoy: el alquiler temporal (amoblado, hasta un año) o el contrato tradicional de 2 años.", pt: "Os contratos são divididos em temporários (até 1 ano) e tradicionais (2 anos).", zh: "合同分为短期（不超过1年）和长期（2年）。" },
        { ru: "Хозяин имеет право добавить пункт о быстром выселении при неуплате (Desalojo exprés).", en: "Landlords can include a fast-track eviction clause (Desalojo exprés) for non-payment.", es: "Muchos dueños ahora meten la cláusula de 'desalojo exprés' si dejás de pagar dos meses.", pt: "Os proprietários podem incluir uma cláusula de despejo expresso por falta de pagamento.", zh: "房东可以包含针对未付款的快速驱逐条款（Desalojo exprés）。" },
        { ru: "Оплата за amenities (бассейн, SUM) включена в Expensas, даже если вы ими не пользуетесь.", en: "Fees for amenities (pool, event room) are in Expensas, even if you never use them.", es: "La pileta y el SUM te los cobran en las expensas, las uses o no las uses nunca.", pt: "A taxa de comodidades (piscina, salão) está nas Expensas, mesmo se você não usar.", zh: "即使您从不使用，设施（游泳池、活动室）费用也包含在Expensas中。" },
        { ru: "Управляющие компании (Administración) принимают жалобы через системы Consorcio Abierto.", en: "Building managements use apps like Consorcio Abierto for complaints and updates.", es: "Los reclamos al administrador ahora se hacen por apps como Octubre o Consorcio Abierto.", pt: "A administração do prédio usa aplicativos como Consorcio Abierto para reclamações.", zh: "物业管理使用Consorcio Abierto等应用程序接收投诉和更新。" },
        { ru: "В случае расторжения контракта раньше срока, вы обязаны заплатить штраф (1-2 месяца).", en: "Terminating the contract early requires paying a penalty (1-2 months' rent).", es: "Si te vas antes de terminar el contrato, le vas a tener que pagar una multa de un mes de alquiler al dueño.", pt: "Rescindir o contrato antes do prazo exige o pagamento de multa (1-2 meses de aluguel).", zh: "提前终止合同需要支付罚款（1-2个月的租金）。" }
    ],
    other: [
        { ru: "Билеты на концерты в Movistar Arena продаются через приложение Quentro, их нельзя распечатать.", en: "Movistar Arena concert tickets are inside the Quentro app; they cannot be printed.", es: "Las entradas al Movistar Arena van por la app Quentro. No sirven las impresas por el tema de la reventa.", pt: "Ingressos para a Movistar Arena ficam no app Quentro; não podem ser impressos.", zh: "Movistar Arena的演唱会门票在Quentro应用程序中；无法打印。" },
        { ru: "Чаевые официантам (Propina, 10%) можно включать прямо в оплату картой через терминал.", en: "Tips (Propina, 10%) can now be included directly when paying by card on the terminal.", es: "Ya es legal sumar el 10% de propina directo en el posnet cuando pagás con tarjeta.", pt: "A gorjeta (10%) agora pode ser incluída diretamente no pagamento com cartão na maquininha.", zh: "现在通过终端刷卡付款时可以直接包含小费（Propina，10%）。" },
        { ru: "Абонемент в спортзалы Megatlon и SportClub работает по прямому дебету (Débito automático).", en: "Gym memberships (Megatlon, SportClub) require an automatic monthly card debit.", es: "Si vas al Megatlon o SportClub, te exigen poner la tarjeta para cobrarte por débito automático.", pt: "A mensalidade da academia (Megatlon, SportClub) exige débito automático no cartão.", zh: "健身房会员（Megatlon、SportClub）需要按月自动从信用卡扣款。" },
        { ru: "Пошлину за продление туристической визы (Prorroga) оплачивают онлайн в системе Migraciones.", en: "Tourist visa extension fees (Prorroga) are paid online through the Migraciones portal.", es: "La prórroga de la visa de turista la pagás online en la página de Migraciones (Radex).", pt: "A taxa de renovação do visto de turista é paga online pelo portal de Imigrações.", zh: "旅游签证延期费（Prorroga）通过Migraciones门户在线支付。" },
        { ru: "Возврат налога Tax Free для туристов оформляется через приложение и возвращается на карту.", en: "Tourist Tax Free refunds are processed via app and credited back to your card.", es: "El Tax Free para turistas lo cargás en la app Global Blue y te devuelven la plata a la tarjeta.", pt: "O reembolso Tax Free para turistas é feito pelo app e creditado de volta no cartão.", zh: "游客的Tax Free退税通过应用程序处理，并退回您的信用卡中。" },
        { ru: "Частные гиды в Буэнос-Айресе предпочитают получать оплату переводом на счет MercadoPago.", en: "Private tour guides in BA prefer to be paid via MercadoPago transfer.", es: "A los guías de turismo privados en CABA les conviene más que les transfieras por MercadoPago.", pt: "Guias turísticos privados em BA preferem receber por transferência no MercadoPago.", zh: "布宜诺斯艾利斯的私人导游更喜欢通过MercadoPago转账收款。" },
        { ru: "Ежемесячный налог Monotributo (AFIP/ARCA) нужно платить строго до 20-го числа каждого месяца.", en: "The monthly Monotributo tax (ARCA) must be paid strictly by the 20th of each month.", es: "El Monotributo se paga todos los meses antes del día 20, si no ARCA te mete intereses.", pt: "O imposto mensal Monotributo (ARCA) deve ser pago rigorosamente até o dia 20.", zh: "每月必须在20号之前严格支付Monotributo税（ARCA）。" },
        { ru: "Оплата налогов (VEP) генерируется онлайн и оплачивается через ваш интернет-банкинг.", en: "Tax payments (VEP) are generated online and paid through your internet banking.", es: "Para pagar un impuesto tenés que generar un VEP en AFIP y pagarlo desde el Home Banking.", pt: "Os pagamentos de impostos (VEP) são gerados online e pagos pelo seu internet banking.", zh: "纳税款单（VEP）在线生成，并通过您的网上银行支付。" },
        { ru: "Билеты в театры на улице Corrientes удобнее покупать заранее на сайте Plateanet.", en: "Theater tickets for Corrientes Ave are best bought in advance on the Plateanet website.", es: "Para ver una obra en la Avenida Corrientes, sacá la entrada antes por Plateanet.", pt: "Ingressos de teatro para a Avenida Corrientes são comprados antecipadamente no site Plateanet.", zh: "科连特斯大道（Corrientes Ave）的剧院门票最好提前在Plateanet网站上购买。" },
        { ru: "Местные стриминг-сервисы (Flow, DGO) принимают к оплате только аргентинские карты.", en: "Local streaming services (Flow, DGO) only accept Argentine credit/debit cards.", es: "Las apps locales como Flow o DGO solo te agarran tarjetas emitidas en Argentina.", pt: "Serviços de streaming locais (Flow, DGO) só aceitam cartões argentinos.", zh: "本地流媒体服务（Flow、DGO）只接受阿根廷的信用卡/借记卡。" },
        { ru: "Подписка на газеты La Nación или Clarín дает карту клуба скидок (Club LN / Clarín 365).", en: "Subscribing to La Nación or Clarín newspapers includes a discount club card.", es: "Suscribirte a La Nación o Clarín garpa porque te dan la tarjeta 365 o Club LN para descuentos.", pt: "Assinar os jornais La Nación ou Clarín dá direito a um cartão de clube de descontos.", zh: "订阅《国家报》（La Nación）或《号角报》（Clarín）包含一张折扣俱乐部卡。" },
        { ru: "Подписка Prime в PedidosYa или Rappi окупается, если вы заказываете еду 3 раза в месяц.", en: "Prime subscriptions for PedidosYa or Rappi pay off if you order food 3 times a month.", es: "Rappi Pro o PedidosYa Plus se pagan solos si pedís delivery más de 3 veces al mes.", pt: "As assinaturas Prime do PedidosYa ou Rappi compensam se você pedir comida 3 vezes no mês.", zh: "如果您每月点外卖3次，PedidosYa或Rappi的Prime订阅就回本了。" },
        { ru: "Ветеринарные страховки для питомцев (Osde Binario Para Mascotas) становятся стандартом.", en: "Pet health insurance (Prepagas for pets) is becoming the standard in the city.", es: "Las prepagas para perros y gatos ya son un estándar en Capital Federal. Te salvan de gastos.", pt: "Planos de saúde para pets estão se tornando o padrão na cidade.", zh: "宠物健康保险（Prepagas for pets）正成为这座城市的标配。" },
        { ru: "Дневные пассы (Day Pass) в коворкингах Палермо можно оплатить наличными долларами.", en: "Day passes at Palermo co-working spaces can often be paid in physical US dollars.", es: "En los coworkings de Palermo podés caer y pagar el pase diario directo con un billete de dólar.", pt: "O passe diário nos coworkings de Palermo geralmente pode ser pago em dólares em espécie.", zh: "巴勒莫共享办公空间的日通票通常可以用美元现金支付。" },
        { ru: "Услуги химчистки и прачечной (Lavadero) оплачиваются за пакет (Canasto) или на вес.", en: "Laundromat (Lavadero) services are charged by the basket (Canasto) or by weight.", es: "En el lavadero de barrio no te cobran por prenda, te cobran por 'canasto' o bolsa.", pt: "Os serviços de lavanderia (Lavadero) são cobrados por cesto (Canasto) ou por peso.", zh: "洗衣店（Lavadero）的服务按筐（Canasto）或按重量收费。" },
        { ru: "Оплата услуг 'Хестора' (Gestor) за помощь с документами производится 50% авансом.", en: "Paying a 'Gestor' for paperwork help usually requires a 50% upfront deposit.", es: "Si contratás un gestor para que te haga un trámite, siempre le tenés que adelantar el 50%.", pt: "Pagar um despachante ('Gestor') por ajuda com papéis geralmente exige 50% adiantado.", zh: "支付代办人员（'Gestor'）的文书协助费用通常需要预付50%的定金。" },
        { ru: "Штрафы за просрочку визы оплачиваются прямо в аэропорту перед вылетом.", en: "Overstay fines for visas are paid directly at the airport migration desk before departure.", es: "Si te pasaste de los 90 días de turista, pagás la multa de Migraciones ahí mismo en Ezeiza.", pt: "A multa por ultrapassar o prazo do visto é paga direto no guichê do aeroporto antes de sair.", zh: "逾期滞留签证的罚款在离境前直接在机场移民局柜台支付。" }
    ]
};
// --- БАЗА СОВЕТОВ AI ДЛЯ ОБМЕНА (Аргентина 2026) - 50 ВАРИАНТОВ ---
const AI_EXCHANGE_TIPS = [
    { ru: "Разрыв между курсами Blue и MEP минимален, иногда официальный MEP даже выгоднее.", en: "The gap between Blue and MEP rates is minimal; sometimes MEP is even better.", es: "La brecha entre el dólar Blue y el MEP es mínima, a veces conviene más el MEP.", pt: "A diferença entre as taxas Blue e MEP é mínima; às vezes o MEP é melhor.", zh: "Blue和MEP汇率之间的差距极小；有时MEP甚至更划算。" },
    { ru: "Старые доллары США ('cara chica') принимают, но в обменниках могут просить скидку 2-3%.", en: "Old US dollars ('cara chica') are accepted, but exchanges might apply a 2-3% discount.", es: "Los dólares 'cara chica' se aceptan, pero en la cueva te pueden cobrar un 2-3% de descuento.", pt: "Dólares antigos ('cara chica') são aceitos, mas casas de câmbio podem cobrar 2-3% de desconto.", zh: "旧版美元（'cara chica'）可以接受，但兑换处可能会收取2-3%的折扣。" },
    { ru: "Не меняйте деньги у 'арболитос' на улице Флорида — используйте проверенные офисы.", en: "Don't exchange money with street 'arbolitos' on Florida St; use trusted offices.", es: "No cambies guita con los arbolitos de calle Florida, andá siempre a una cueva de confianza.", pt: "Não troque dinheiro com 'arbolitos' na rua Florida; use escritórios de confiança.", zh: "不要在佛罗里达街上与“arbolitos”换钱；请使用值得信赖的兑换处。" },
    { ru: "Western Union иногда дает хороший курс (CCL), но будьте готовы к длинным очередям.", en: "Western Union offers a great rate (CCL), but expect long queues.", es: "Western Union paga bien (al CCL), pero preparate para comerte una fila eterna.", pt: "A Western Union oferece uma ótima taxa (CCL), mas espere filas longas.", zh: "西联汇款提供极佳的汇率（CCL），但要做好排长队的准备。" },
    { ru: "Заказывайте доставку курьером ради безопасности.", en: "For amounts over 1000 USDT, order a courier delivery for safety.", es: "Si cambiás más de 1000 USDT, pedí envío por moto por seguridad.", pt: "Para valores acima de 1000 USDT, peça entrega por motoboy por segurança.", zh: "对于超过1000 USDT的金额，为了安全起见，请要求快递送货。" },
    { ru: "Всегда пересчитывайте наличные песо при обмене.", en: "Always count your cash pesos in the counting machine at the exchange office.", es: "Contá siempre los fajos de pesos en la maquinita de la cueva antes de salir.", pt: "Sempre conte seus pesos na máquina de contar na casa de câmbio.", zh: "在兑换处始终使用点钞机清点您的比索现金。" },
    { ru: "Если получаете перевод в ARS на банк, не превышайте лимиты ARCA без декларации.", en: "If receiving ARS to a bank, don't exceed ARCA limits without declaring.", es: "Si recibís transferencias grandes, ojo con pasarte del límite de ARCA (ex AFIP) sin facturar.", pt: "Se receber transferências altas, não ultrapasse os limites da ARCA sem declarar.", zh: "如果收到银行比索转账，请勿在未申报的情况下超过ARCA限额。" },
    { ru: "Криптокарты (Lemon, Belo) автоматически конвертируют вашу крипту в песо при оплате.", en: "Crypto cards (Lemon, Belo) auto-convert your crypto to pesos upon payment.", es: "Las tarjetas como Lemon o Belo te pasan la crypto a pesos en el momento de la compra.", pt: "Cartões cripto (Lemon, Belo) convertem automaticamente sua cripto em pesos no pagamento.", zh: "加密货币卡（Lemon、Belo）在付款时会自动将您的加密货币转换为比索。" },
    { ru: "На выходных курс обмена P2P часто падает из-за низкой ликвидности банков.", en: "Weekend P2P rates often drop due to low bank liquidity.", es: "Los findes el tipo de cambio P2P suele bajar porque no hay bancos operando.", pt: "As taxas P2P caem nos finais de semana devido à baixa liquidez bancária.", zh: "由于银行流动性低，周末P2P汇率通常会下降。" },
    { ru: "Иностранные карты в Аргентине списывают по курсу 'Dólar Tarjeta' (почти как MEP).", en: "Foreign cards in AR charge at 'Dólar Tarjeta' rate (similar to MEP).", es: "Las tarjetas extranjeras te cobran al 'Dólar Tarjeta', que es casi igual al MEP.", pt: "Cartões estrangeiros cobram pela taxa 'Dólar Tarjeta' (quase como o MEP).", zh: "外国卡在阿根廷按“Dólar Tarjeta”汇率（类似于MEP）收费。" },
    { ru: "Купюры номиналом 10 000 и 20 000 ARS значительно облегчили перевозку наличных.", en: "10,000 and 20,000 ARS bills made carrying cash much easier.", es: "Con los billetes nuevos de 10 y 20 lucas ya no hace falta llevar una mochila para cambiar.", pt: "As notas de 10.000 e 20.000 ARS facilitaram muito o transporte de dinheiro vivo.", zh: "10,000和20,000比索的面额大大方便了现金携带。" },
    { ru: "По закону бимонетаризма 2026 года вы можете легально платить за крупные покупки в USDT.", en: "Under the 2026 bi-monetary law, you can legally pay for large assets in USDT.", es: "Con el bimonetarismo de 2026, es 100% legal comprar un auto o depto directo en USDT.", pt: "Pela lei de bimonetarismo de 2026, é legal pagar por grandes compras em USDT.", zh: "根据2026年双币制法律，您可以合法地使用USDT支付大额资产。" },
    { ru: "Курс Blue обновляется к 12:00, сделки рано утром идут по курсу вчерашнего дня.", en: "The Blue rate updates by 12:00 PM; early morning trades use yesterday's rate.", es: "El Blue cotiza fuerte al mediodía. A la mañana temprano te toman el cierre de ayer.", pt: "A taxa Blue atualiza ao meio-dia; trocas matinais usam a taxa do dia anterior.", zh: "Blue汇率在中午12点更新；清晨的交易使用昨天的汇率。" },
    { ru: "Избегайте банкоматов: комиссия за снятие с иностранных карт грабительская.", en: "Avoid ATMs: withdrawal fees for foreign cards are extortionate.", es: "Ni se te ocurra sacar plata de un cajero con tarjeta extranjera, la comisión te mata.", pt: "Evite caixas eletrônicos: as taxas de saque para cartões estrangeiros são altas.", zh: "避免使用ATM：外国卡的取款费用高得离谱。" },
    { ru: "При получении песо на счет убедитесь, что ваш банковский лимит позволяет транзакцию.", en: "Before receiving pesos, ensure your bank account limit allows the transaction.", es: "Antes de que te transfieran, fijate de no tener el límite de tu cuenta de banco bloqueado.", pt: "Antes de receber pesos, certifique-se de que o limite da sua conta bancária permite.", zh: "在收到比索之前，请确保您的银行账户限额允许该笔交易。" },
    { ru: "В Аргентине сеть TRC20 (Tron) остается самой популярной и дешевой для перевода USDT.", en: "TRC20 (Tron) remains the most popular and cheapest network for USDT in Argentina.", es: "En Argentina todos usan la red TRC20 (Tron) para mandar USDT porque es la más barata.", pt: "A rede TRC20 (Tron) continua sendo a mais popular e barata para USDT na Argentina.", zh: "在阿根廷，TRC20（波场）网络仍然是最受欢迎且最便宜的USDT转账网络。" },
    { ru: "Обменники берут около 1-2% комиссии за конвертацию USDT в наличные доллары.", en: "Exchanges charge a 1-2% fee to convert USDT into physical US dollars.", es: "Las cuevas te cobran entre 1% y 2% por pasarte de USDT a dólares físicos.", pt: "As casas de câmbio cobram 1-2% para converter USDT em dólares físicos.", zh: "兑换处将USDT转换为美元现金收取1-2%的手续费。" },
    { ru: "Менять рубли лучше небольшими партиями (по 50-100к), чтобы не блокировали карты в РФ.", en: "Exchange RUB in small batches (50-100k) to avoid card blocks in Russia.", es: "Si cambiás rublos, hacelo en tandas chicas de 50k o 100k para que no te bloqueen el banco ruso.", pt: "Troque RUB em pequenos lotes (50-100k) para evitar bloqueios de cartão na Rússia.", zh: "最好分批小额兑换卢布（5-10万），以免俄罗斯银行卡被冻结。" },
    { ru: "Переводы с Binance на местный банк могут попасть под финмониторинг, используйте P2P.", en: "Binance direct to local bank transfers might trigger flags; use P2P instead.", es: "Mandar de Binance directo al banco te puede hacer saltar alarmas. Usá P2P.", pt: "Transferências diretas da Binance para o banco podem gerar alertas; use P2P.", zh: "币安直接转账至本地银行可能会触发风控；请使用P2P。" },
    { ru: "Доллары с печатями, надписями или пятнами (Manchados) могут отказаться менять.", en: "USD bills with stamps, writing, or stains might be rejected.", es: "Dólares manchados o sellados son un dolor de cabeza, muchas cuevas no te los agarran.", pt: "Dólares com carimbos, escritas ou manchas podem ser rejeitados.", zh: "带有印章、字迹或污渍的美元可能会被拒收。" },
    { ru: "Сайт DolarHoy.com — главный ориентир, но реальный курс в обменниках на 10-15 песо ниже.", en: "DolarHoy.com is the benchmark, but real exchange rates are usually 10-15 pesos lower.", es: "Mirá DolarHoy de referencia, pero sabé que la cueva siempre te paga 10 o 15 pesos menos.", pt: "DolarHoy.com é a referência, mas a taxa real costuma ser 10-15 pesos menor.", zh: "DolarHoy.com是基准，但实际兑换处的汇率通常低10-15比索。" },
    { ru: "Для оплаты местных подписок (Spotify, Netflix) держите на карте ARS, а не USDT.", en: "Keep ARS on your card to pay for local subscriptions (Spotify, Netflix) smoothly.", es: "Para que pasen Spotify o Netflix, tené siempre pesos fondeados, con USDT a veces rebota.", pt: "Mantenha ARS no cartão para pagar assinaturas locais (Spotify, Netflix) sem erros.", zh: "在卡里保留比索（ARS）以顺利支付本地订阅费用（Spotify、Netflix）。" },
    { ru: "Используйте ALIAS вместо 22-значного CBU для перевода песо: так меньше шанс ошибиться.", en: "Use the ALIAS instead of the 22-digit CBU to avoid transfer mistakes.", es: "Pedí siempre el ALIAS para transferir, copiar el CBU de 22 números es un peligro.", pt: "Use o ALIAS em vez do CBU de 22 dígitos para evitar erros de transferência.", zh: "使用ALIAS而不是22位的CBU，以减少转账出错的几率。" },
    { ru: "Если курьер задерживается, курс фиксируется на момент оформления заявки.", en: "If the courier is delayed, the rate is locked at the moment the order was placed.", es: "Si el de la moto se demora, no pasa nada, el tipo de cambio te queda congelado.", pt: "Se o motoboy atrasar, a taxa fica travada no momento em que o pedido foi feito.", zh: "如果快递延误，汇率将锁定在下订单时的价格。" },
    { ru: "Не носите крупные суммы в рюкзаке по центру города, закажите курьера прямо в лобби дома.", en: "Don't carry large sums in a backpack downtown; have a courier meet you in your lobby.", es: "No andes por el centro con la mochila llena de pesos. Que la moto vaya al lobby de tu edificio.", pt: "Não ande com muito dinheiro na mochila pelo centro; peça pro motoboy ir ao seu prédio.", zh: "不要背着大笔现金在市中心走动；让快递员在您的公寓大堂与您会面。" },
    { ru: "Крипто-банкоматы существуют, но комиссия в них около 5% — P2P или обменник выгоднее.", en: "Crypto ATMs exist, but their 5% fee makes P2P or offices much better.", es: "Hay cajeros crypto (Athena), pero te matan con un 5% de comisión. Mejor P2P.", pt: "Caixas eletrônicos cripto existem, mas a taxa de 5% faz o P2P ser melhor.", zh: "加密货币ATM是存在的，但其5%的费用使得P2P或兑换处更划算。" },
    { ru: "В конце месяца песо часто укрепляется, так как компаниям нужна ликвидность для зарплат.", en: "The peso often strengthens end-of-month as companies need liquidity for salaries.", es: "A fin de mes el peso a veces se aprecia un poquito porque las empresas necesitan guita para sueldos.", pt: "O peso costuma se fortalecer no fim do mês porque empresas precisam de liquidez para salários.", zh: "在月底，比索通常会升值，因为公司需要流动性来发工资。" },
    { ru: "Счет в MercadoPago можно открыть только с DNI, иностранцам подойдут криптокошельки.", en: "MercadoPago requires a DNI; foreigners should use crypto wallets.", es: "Sin DNI argentino no te abren MercadoPago. Si sos turista, manejate con billeteras crypto.", pt: "MercadoPago exige DNI; estrangeiros devem usar carteiras cripto.", zh: "MercadoPago需要DNI（身份证）；外国人应使用加密货币钱包。" },
    { ru: "Вы можете перевести песо за границу через систему 'Dólar Cable' (CCL).", en: "You can move pesos abroad legally using the 'Dólar Cable' (CCL) system.", es: "Para mandar pesos legalmente afuera del país, se usa la operatoria de Dólar Cable (CCL).", pt: "Você pode enviar pesos para o exterior legalmente usando o sistema 'Dólar Cable' (CCL).", zh: "您可以使用“Dólar Cable”（CCL）系统合法地将比索转移到国外。" },
    { ru: "USDC и USDT торгуются в Аргентине 1 к 1, разницы в курсе при обмене нет.", en: "USDC and USDT trade 1:1 in Argentina; there is no rate difference when exchanging.", es: "En las cuevas te toman el USDC y el USDT al mismo valor, valen 1 a 1.", pt: "USDC e USDT valem 1:1 na Argentina; não há diferença de taxa ao trocar.", zh: "USDC和USDT在阿根廷以1:1交易；兑换时没有汇率差异。" },
    { ru: "Снимать деньги в банкоматах Уругвая с аргентинских криптокарт можно, но есть лимиты.", en: "You can withdraw cash in Uruguayan ATMs with AR crypto cards, but there are limits.", es: "Podés cruzar a Uruguay y sacar dólares por cajero con tarjetas crypto, pero hay tope mensual.", pt: "Você pode sacar dinheiro no Uruguai com cartões cripto argentinos, mas há limites.", zh: "您可以使用阿根廷加密卡在乌拉圭的ATM取款，但有限额。" },
    { ru: "Покупка криптовалюты за наличные доллары (Cash to Crypto) обычно стоит 1-2% сверху.", en: "Buying crypto with physical USD cash usually carries a 1-2% premium.", es: "Si caés a la cueva con dólares billete para comprar USDT, te van a cobrar 1% o 2% de comisión.", pt: "Comprar cripto com dólares físicos geralmente tem uma taxa extra de 1-2%.", zh: "使用美元现金购买加密货币通常需要额外支付1-2%的费用。" },
    { ru: "Будьте осторожны с обменом в аэропорту Ezeiza — там худший курс в стране.", en: "Be careful at Ezeiza airport exchange booths—they offer the worst rate in the country.", es: "Nunca cambies en el Banco Nación de Ezeiza, el tipo de cambio que te dan es un robo.", pt: "Cuidado nas casas de câmbio do aeroporto Ezeiza — têm a pior taxa do país.", zh: "在Ezeiza机场兑换要小心——那里提供全国最差的汇率。" },
    { ru: "Отправляйте песо на счета цифровых банков (Brubank, Reba), они реже блокируют переводы.", en: "Send pesos to digital banks (Brubank, Reba) as they block transfers less frequently.", es: "Para recibir pesos por P2P es mejor usar Brubank o Reba, molestan menos que los bancos de siempre.", pt: "Envie pesos para bancos digitais (Brubank, Reba), pois eles bloqueiam transferências com menos frequência.", zh: "将比索汇入数字银行（Brubank、Reba），因为它们较少拦截转账。" },
    { ru: "При P2P-переводе в назначении платежа (Motivo) выбирайте 'Varios' (Разное).", en: "When doing P2P, choose 'Varios' (Various) as the transfer reason.", es: "En el concepto de transferencia del homebanking, ponele siempre 'Varios', nunca 'Crypto'.", pt: "Ao fazer P2P, escolha 'Varios' (Diversos) como o motivo da transferência.", zh: "进行P2P转账时，转账备注请选择'Varios'（其他）。" },
    { ru: "Для фрилансеров (Monotributo Tech) лимит легального вывода в валюте составляет до $30,000/год.", en: "For freelancers (Monotributo Tech), the legal FX withdrawal limit is up to $30,000/year.", es: "Si sos Monotributista Tech, podés meter hasta 30 lucas verdes al año directo en dólares.", pt: "Para freelancers, o limite legal de saque em moeda estrangeira é de até $30.000/ano.", zh: "对于自由职业者，合法的外汇提款限额为每年高达30,000美元。" },
    { ru: "Если обменник предлагает перевести вам деньги с разных счетов — это нормальная практика (кутерьма).", en: "If an exchange sends you funds from multiple accounts, it's a common operational practice.", es: "Si la cueva te manda los pesos divididos desde distintas cuentas, no te asustes, es normal.", pt: "Se a casa de câmbio enviar fundos de várias contas, é uma prática comum.", zh: "如果兑换处从多个账户向您汇款，这是一种常见的操作做法。" },
    { ru: "Наличные доллары нужны в основном для покупки авто и недвижимости, для быта лучше USDT.", en: "Physical USD is mainly for buying cars/real estate; for daily life, USDT is better.", es: "El dólar billete quedó para comprar autos o casas. Para vivir el día a día, es todo USDT.", pt: "Dólares físicos são para comprar carros/imóveis; para o dia a dia, USDT é melhor.", zh: "美元现金主要用于买车/买房；日常生活中，USDT更好用。" },
    { ru: "Если вы турист без местного банковского счета, используйте Western Union или крипто-доставку.", en: "If you are a tourist without a local bank account, use Western Union or crypto-courier delivery.", es: "Si sos turista y no tenés CBU, la que te queda es Western Union o que te lleven pesos en moto.", pt: "Se você for turista sem conta local, use Western Union ou motoboy cripto.", zh: "如果您是没有本地银行账户的游客，请使用西联汇款或加密货币现金快递。" },
    { ru: "100-долларовые купюры нового образца (Azules) всегда принимают по лучшему курсу.", en: "New 100 USD bills ('Azules') are always accepted at the absolute best rate.", es: "El billete de 100 dólares de cara grande y azul te lo pagan siempre al valor máximo.", pt: "As notas novas de 100 USD ('Azules') sempre têm a melhor taxa garantida.", zh: "新版100美元钞票（'蓝头'）总是能获得最佳汇率。" },
    { ru: "Мошенники часто присылают поддельные чеки из MercadoPago. Ждите уведомления в своем приложении.", en: "Scammers use fake MercadoPago receipts. Wait for the notification in your own app.", es: "Está lleno de estafas con comprobantes truchos de MercadoPago. Hasta que no veas la plata en tu app, no liberes nada.", pt: "Golpistas usam comprovantes falsos do MercadoPago. Espere a notificação no seu app.", zh: "骗子经常发送伪造的MercadoPago收据。请等待您自己应用程序中的到账通知。" },
    { ru: "За перевод стейблкоинов в сети Ethereum (ERC20) комиссия составит $5-$10, избегайте ее.", en: "Transferring via Ethereum network (ERC20) costs $5-$10 in gas; avoid it.", es: "Nunca mandes por la red de Ethereum (ERC20) porque el gas te come 5 o 10 dólares.", pt: "Transferir pela rede Ethereum (ERC20) custa $5-$10 em taxas; evite.", zh: "在以太坊网络（ERC20）上转账的手续费为5-10美元，请避免使用。" },
    { ru: "Брокеры (ALyC) позволяют обменять доллары на песо через облигации абсолютно легально.", en: "Brokers (ALyC) let you exchange USD to ARS legally through bonds.", es: "Podés vender tus dólares de forma 100% legal abriendo cuenta en un broker (ALyC) para hacer dólar MEP.", pt: "Corretoras (ALyC) permitem trocar USD por ARS legalmente através de títulos.", zh: "经纪人（ALyC）允许您通过债券合法地将美元兑换成比索。" },
    { ru: "Если в обменнике нет нужного объема наличных, вы можете разбить сделку на две части.", en: "If the exchange lacks physical cash, you can split your transaction into two parts.", es: "Si en la financiera no tienen todos los billetes, te pueden hacer la operación en dos partes.", pt: "Se a casa de câmbio não tiver todo o dinheiro, você pode dividir a transação em duas.", zh: "如果兑换处现金不足，您可以将交易分成两部分。" },
    { ru: "При долгосрочном хранении лучше стейкать USDT, чтобы покрывать инфляцию в долларах.", en: "For long-term holding, stake your USDT to beat USD inflation.", es: "Si vas a ahorrar, meté los USDT en staking o Earn para ganarle a la inflación en dólares.", pt: "Para longo prazo, faça staking de USDT para render juros e cobrir a inflação.", zh: "对于长期持有，最好质押您的USDT以抵御美元通胀。" },
    { ru: "В Аргентине многие магазины дают скидку за оплату наличными ARS.", en: "Many Argentine stores offer discounts for cash ARS payments.", es: "Muchos locales hacen descuento pagando en efectivo.", pt: "Muitas lojas dão desconto pagando em dinheiro.", zh: "阿根廷很多商店现金支付会有折扣。" },
    { ru: "Ночью ликвидность P2P ниже, поэтому курс может быть менее выгодным.", en: "P2P liquidity is lower at night, so rates may worsen.", es: "A la noche hay menos liquidez P2P y cambia el precio.", pt: "À noite há menos liquidez no P2P.", zh: "夜间P2P流动性较低，汇率可能较差。" },
    { ru: "В праздничные дни банковские переводы ARS могут приходить с задержкой.", en: "ARS bank transfers may be delayed on holidays.", es: "En feriados las transferencias pueden demorarse.", pt: "Transferências podem atrasar em feriados.", zh: "节假日银行转账可能延迟。" },
    { ru: "Для крупных сумм лучше заранее резервировать наличные доллары.", en: "Reserve physical USD in advance for large amounts.", es: "Para montos grandes conviene reservar dólares antes.", pt: "Para valores altos é melhor reservar dólares.", zh: "大额现金美元建议提前预约。" },
    { ru: "Скриншот перевода не считается подтверждением оплаты.", en: "A screenshot is not proof of payment.", es: "Un screenshot no confirma una transferencia.", pt: "Print não comprova pagamento.", zh: "截图不算付款证明。" },
    { ru: "Большинство P2P переводов в ARS проходят мгновенно в рабочее время.", en: "Most ARS P2P transfers settle instantly during business hours.", es: "Las transferencias suelen acreditarse al instante.", pt: "Transferências P2P geralmente caem na hora.", zh: "大多数P2P转账会即时到账。" },
    { ru: "При обмене наличных всегда проверяйте состояние купюр перед выходом.", en: "Always inspect bills before leaving with cash.", es: "Revisá los billetes antes de irte.", pt: "Confira as notas antes de sair.", zh: "离开前请检查钞票状态。" },
    { ru: "В Аргентине QR-оплата стала популярнее наличных во многих кафе.", en: "QR payments are now more popular than cash in many cafes.", es: "Muchos cafés ya usan más QR que efectivo.", pt: "Pagamentos por QR já superam dinheiro em muitos cafés.", zh: "很多咖啡馆现在更常用二维码支付。" },
    { ru: "При переводе USDT всегда дважды проверяйте сеть.", en: "Always double-check the blockchain network before sending USDT.", es: "Chequeá siempre la red antes de mandar USDT.", pt: "Confira a rede antes de enviar USDT.", zh: "发送USDT前请确认网络。" },
    { ru: "Ошибка в сети перевода может привести к потере средств.", en: "Using the wrong network can result in lost funds.", es: "Mandar por la red equivocada puede hacerte perder plata.", pt: "Rede errada pode causar perda de fundos.", zh: "错误网络可能导致资产丢失。" },
    { ru: "TRC20 обычно подтверждается быстрее ERC20.", en: "TRC20 confirmations are usually faster than ERC20.", es: "TRC20 suele confirmar más rápido que ERC20.", pt: "TRC20 normalmente confirma mais rápido.", zh: "TRC20通常比ERC20更快。" },
    { ru: "Вечером спрос на наличные доллары обычно выше.", en: "Demand for physical USD is usually higher in the evening.", es: "A la tarde suele haber más demanda de dólares físicos.", pt: "À noite a procura por dólares aumenta.", zh: "晚上美元现金需求通常更高。" },
    { ru: "Некоторые банки могут временно удерживать крупные входящие переводы.", en: "Some banks may temporarily hold large incoming transfers.", es: "Algunos bancos retienen transferencias grandes temporalmente.", pt: "Alguns bancos seguram transferências altas.", zh: "部分银行会临时冻结大额转账。" },
    { ru: "Новые долларовые купюры легче обменять и продать.", en: "Newer USD bills are easier to exchange.", es: "Los billetes nuevos siempre circulan mejor.", pt: "Notas novas de USD têm melhor aceitação.", zh: "新版美元更容易兑换。" },
    { ru: "Во время волатильности курс может меняться несколько раз за час.", en: "Rates may change several times per hour during volatility.", es: "Con volatilidad el precio cambia varias veces por hora.", pt: "Em volatilidade a taxa muda rapidamente.", zh: "波动期间汇率可能频繁变化。" },
    { ru: "Банки Аргентины иногда ограничивают операции ночью.", en: "Argentine banks sometimes limit operations at night.", es: "Algunos bancos limitan operaciones de madrugada.", pt: "Bancos podem limitar operações à noite.", zh: "阿根廷银行夜间可能限制操作。" },
    { ru: "Не отправляйте крипту до окончательного подтверждения реквизитов.", en: "Never send crypto before confirming wallet details.", es: "No mandes crypto sin confirmar los datos.", pt: "Nunca envie cripto sem confirmar os dados.", zh: "确认信息前不要发送加密货币。" },
    { ru: "В Аргентине наличные USD по-прежнему считаются самым ликвидным активом.", en: "Physical USD remains the most liquid asset in Argentina.", es: "El dólar billete sigue siendo rey en Argentina.", pt: "Dólar físico continua sendo o ativo mais líquido.", zh: "美元现金仍是最流通资产。" },
    { ru: "Курс крипты и наличного рынка может различаться даже в течение 10 минут.", en: "Crypto and cash markets can diverge within minutes.", es: "Crypto y efectivo pueden diferir en minutos.", pt: "Cripto e cash podem variar rapidamente.", zh: "加密与现金市场可能短时间出现差价。" },
    { ru: "В центре города лучше не пересчитывать крупные суммы на улице.", en: "Avoid counting large sums in public downtown.", es: "No cuentes plata en plena calle.", pt: "Não conte dinheiro na rua.", zh: "不要在街头清点大额现金。" },
    { ru: "При отправке ARS ночью некоторые банки проводят перевод только утром.", en: "Some ARS transfers sent at night settle in the morning.", es: "Algunas transferencias nocturnas impactan recién mañana.", pt: "Transferências noturnas podem cair só pela manhã.", zh: "夜间转账可能次日到账。" },
    { ru: "Stablecoins остаются самым популярным способом хранения капитала у экспатов.", en: "Stablecoins remain the top savings tool for expats.", es: "Las stablecoins son lo más usado por expats.", pt: "Stablecoins seguem populares entre expatriados.", zh: "稳定币仍是外籍人士首选。" },
    { ru: "Некоторые банкоматы Аргентины выдают только небольшие суммы за раз.", en: "Some Argentine ATMs dispense only small amounts.", es: "Muchos cajeros tienen límites bajísimos.", pt: "Muitos caixas têm limites baixos.", zh: "部分ATM单次限额很低。" },
    { ru: "Волатильность песо особенно заметна после экономических новостей.", en: "Peso volatility spikes after economic news releases.", es: "El peso se mueve fuerte después de noticias económicas.", pt: "O peso oscila após notícias econômicas.", zh: "经济新闻后比索波动明显。" },
    { ru: "При крупных переводах банки могут запросить происхождение средств.", en: "Banks may request proof of funds for large transfers.", es: "Para montos altos el banco puede pedir justificación.", pt: "Bancos podem pedir origem dos fundos.", zh: "大额转账银行可能要求资金来源。" },
    { ru: "USDT в Аргентине часто используют вместо обычного банковского счета.", en: "Many people in Argentina use USDT like a bank account.", es: "Muchos usan USDT como cuenta bancaria.", pt: "Muitos usam USDT como conta corrente.", zh: "很多人把USDT当银行账户用。" },
    { ru: "Перед обменом убедитесь, что ваш банк не имеет суточного лимита.", en: "Check your daily transfer limit before exchanging.", es: "Revisá el límite diario de tu banco.", pt: "Confira o limite diário do banco.", zh: "兑换前请检查银行每日限额。" },
    { ru: "В дождливые дни доставка наличных по городу может быть медленнее.", en: "Cash deliveries may slow down during heavy rain.", es: "Con lluvia fuerte las motos tardan más.", pt: "Com chuva entregas podem atrasar.", zh: "暴雨天气现金配送可能变慢。" },
    { ru: "В Аргентине многие арендодатели предпочитают оплату в USDT.", en: "Many landlords in Argentina prefer USDT payments.", es: "Muchos alquileres ya se manejan en USDT.", pt: "Muitos alugueis preferem USDT.", zh: "很多房东更喜欢USDT付款。" },
    { ru: "Некоторые банки автоматически отклоняют переводы с подозрительными комментариями.", en: "Banks may reject transfers with suspicious notes.", es: "No pongas comentarios raros en la transferencia.", pt: "Comentários suspeitos podem bloquear a transferência.", zh: "异常备注可能导致转账失败。" },
    { ru: "Проверяйте первые и последние символы крипто-адреса перед отправкой.", en: "Verify the first and last wallet characters before sending.", es: "Chequeá los primeros y últimos caracteres del wallet.", pt: "Confira início e fim da carteira.", zh: "请检查钱包地址前后字符。" },
    { ru: "При высоком спросе доставка наличных может занять больше времени.", en: "Cash delivery may take longer during peak demand.", es: "Con mucha demanda la entrega puede tardar más.", pt: "Alta demanda pode atrasar entregas.", zh: "高峰期现金配送可能延迟。" },
    { ru: "Наличные песо лучше хранить в купюрах по 10k и 20k ARS.", en: "10k and 20k ARS bills are easier to handle and store.", es: "Las de 10 y 20 mil son mucho más cómodas.", pt: "Notas de 10k e 20k facilitam o transporte.", zh: "1万和2万面额更方便携带。" },
    { ru: "В Аргентине QR-переводы работают даже у уличных продавцов.", en: "Even street vendors often accept QR payments in Argentina.", es: "Hasta los manteros aceptan QR.", pt: "Até vendedores de rua usam QR.", zh: "街头小贩也常用二维码支付。" },
    { ru: "Лучшее время для крупных операций — банковские часы в будни.", en: "Weekday banking hours are best for large operations.", es: "Las operaciones grandes conviene hacerlas en horario bancario.", pt: "Grandes operações são melhores em horário bancário.", zh: "大额操作最好在工作日银行时间。" },
    { ru: "Некоторые банки снижают скорость переводов при подозрении на P2P.", en: "Banks may slow transfers if they suspect P2P activity.", es: "Algunos bancos frenan transferencias por actividad P2P.", pt: "Bancos podem limitar operações P2P.", zh: "银行可能限制P2P相关转账。" },
    { ru: "Для безопасности не публикуйте суммы обмена в соцсетях.", en: "Avoid posting exchange amounts on social media.", es: "No publiques montos ni operaciones en redes.", pt: "Não poste valores em redes sociais.", zh: "不要在社交媒体公开交易金额。" },
    { ru: "В Аргентине многие цены на технику ориентируются на курс Blue.", en: "Electronics pricing often follows the Blue rate.", es: "La electrónica suele seguir el Blue.", pt: "Eletrônicos acompanham o Blue.", zh: "电子产品价格通常参考Blue汇率。" },
    { ru: "Перед обменом всегда уточняйте итоговую сумму к получению.", en: "Always confirm the final received amount before exchanging.", es: "Confirmá el neto final antes de operar.", pt: "Confirme o valor final antes da troca.", zh: "兑换前确认最终到账金额。" },
    { ru: "Старые ARS купюры иногда хуже принимают в маленьких магазинах.", en: "Older ARS bills may be less accepted in small shops.", es: "Algunos kioscos no quieren billetes viejos.", pt: "Notas antigas podem ser recusadas.", zh: "旧版比索可能不易流通。" },
    { ru: "Переводы между цифровыми банками обычно проходят быстрее.", en: "Transfers between digital banks are usually faster.", es: "Entre bancos digitales suele ser más rápido.", pt: "Transferências entre bancos digitais são mais rápidas.", zh: "数字银行间转账通常更快。" },
    { ru: "Во время сильной волатильности обмен может временно приостанавливаться.", en: "Exchanges may pause briefly during extreme volatility.", es: "Con mucha volatilidad algunas operaciones se frenan.", pt: "Operações podem pausar em volatilidade extrema.", zh: "剧烈波动时兑换可能暂停。" },
    { ru: "Для долгого хранения наличных используйте купюры без сгибов и повреждений.", en: "Keep clean, unfolded bills for long-term storage.", es: "Guardá billetes prolijos y sin marcas.", pt: "Guarde notas limpas e sem danos.", zh: "长期保存请使用完好钞票。" },
    { ru: "В Аргентине многие сервисы уже принимают оплату в крипте.", en: "Many Argentine services now accept crypto payments.", es: "Cada vez más lugares aceptan crypto.", pt: "Mais serviços aceitam cripto.", zh: "越来越多商家接受加密支付。" },
    { ru: "При переводе USDT небольшая тестовая транзакция снижает риск ошибки.", en: "A small test transfer reduces mistakes when sending USDT.", es: "Mandar una prueba chica evita errores caros.", pt: "Uma transferência teste evita erros.", zh: "小额测试转账更安全。" },
    { ru: "Днем банковская система Аргентины работает заметно стабильнее.", en: "Argentina's banking system is more stable during daytime.", es: "De día los bancos funcionan mucho mejor.", pt: "O sistema bancário funciona melhor durante o dia.", zh: "白天银行系统更稳定。" },
    { ru: "При обмене крупных сумм лучше использовать приватное место встречи.", en: "Use private meeting spots for large exchanges.", es: "Para montos altos conviene un lugar privado.", pt: "Para grandes valores use locais privados.", zh: "大额交易建议私下会面。" },
    { ru: "Курс наличного рынка может отличаться в разных районах города.", en: "Cash market rates may vary by neighborhood.", es: "El precio cambia según la zona.", pt: "As taxas variam conforme o bairro.", zh: "不同区域现金汇率可能不同。" },
    { ru: "USDT в сети Tron остается стандартом для переводов в LATAM.", en: "Tron USDT remains the LATAM transfer standard.", es: "TRC20 sigue siendo el estándar en LATAM.", pt: "TRC20 continua padrão na LATAM.", zh: "TRC20仍是拉美主流。" },
    { ru: "При нестабильном интернете банковские уведомления могут приходить с задержкой.", en: "Bank notifications may lag with unstable internet.", es: "Las notificaciones bancarias a veces tardan.", pt: "Notificações bancárias podem atrasar.", zh: "银行通知可能延迟。" },
    { ru: "Многие аргентинцы проверяют курс доллара по нескольку раз в день.", en: "Many Argentines check the dollar rate several times daily.", es: "Acá todos miran el dólar varias veces por día.", pt: "Muitos argentinos acompanham o dólar diariamente.", zh: "很多阿根廷人每天多次查看汇率。" },
    { ru: "При переводе крипты всегда копируйте адрес, а не вводите вручную.", en: "Always copy wallet addresses instead of typing them manually.", es: "Nunca escribas un wallet a mano.", pt: "Nunca digite carteira manualmente.", zh: "不要手动输入钱包地址。" },
    { ru: "Добавьте адрес кошелька в белый список Bybit, чтобы не вводить подтверждение при каждом переводе.", en: "Add the wallet address to your Bybit whitelist to avoid confirming every transfer.", es: "Agregá la wallet a la whitelist de Bybit para no confirmar cada transferencia.", pt: "Adicione a carteira à whitelist da Bybit para evitar confirmações em cada envio.", zh: "将钱包地址添加到Bybit白名单中，以避免每次转账时确认。" },
    { ru: "Express Exchange фиксирует курс сразу после оформления заявки.", en: "Express Exchange locks your rate instantly after order placement.", es: "Express Exchange congela tu cotización al crear el pedido.", pt: "A Express Exchange trava sua cotação no momento do pedido.", zh: "Express Exchange在下单时立即锁定汇率。" },
    { ru: "В Express Exchange вы видите финальную сумму без скрытых комиссий.", en: "With Express Exchange, you see the final amount with no hidden fees.", es: "En Express Exchange ves el monto final sin comisiones ocultas.", pt: "Na Express Exchange você vê o valor final sem taxas escondidas.", zh: "Express Exchange无隐藏费用，金额透明。" },
    { ru: "Express Exchange поддерживает быстрые переводы USDT в популярных сетях.", en: "Express Exchange supports fast USDT transfers on popular networks.", es: "Express Exchange soporta transferencias rápidas de USDT.", pt: "A Express Exchange suporta transferências rápidas de USDT.", zh: "Express Exchange支持快速USDT转账。" },
    { ru: "Курьерская доставка наличных помогает экономить ваше время.", en: "Cash courier delivery helps save your time.", es: "La entrega por moto te ahorra tiempo.", pt: "Entrega por motoboy economiza seu tempo.", zh: "现金配送服务节省您的时间。" },
    { ru: "Express Exchange работает с крупными и небольшими суммами.", en: "Express Exchange handles both small and large amounts.", es: "Express Exchange trabaja con montos chicos y grandes.", pt: "A Express Exchange trabalha com valores pequenos e grandes.", zh: "Express Exchange支持大小额兑换。" },
    { ru: "Поддержка отвечает максимально быстро в рабочие часы.", en: "Support replies quickly during business hours.", es: "El soporte responde rápido en horario laboral.", pt: "O suporte responde rapidamente.", zh: "客服响应速度快。" },
    { ru: "Express Exchange создан для удобного обмена без лишней бюрократии.", en: "Express Exchange is built for smooth exchanges without unnecessary bureaucracy.", es: "Express Exchange está pensado para operar simple.", pt: "A Express Exchange foi feita para ser simples.", zh: "Express Exchange操作简单高效。" },
    { ru: "Большинство заявок обрабатывается в кратчайшие сроки.", en: "Most orders are processed in minimal time.", es: "La mayoría de las operaciones salen rapidísimo.", pt: "A maioria das operações é processada rapidamente.", zh: "大多数订单处理迅速。" },
    { ru: "Express Exchange удобно использовать как туристам, так и резидентам.", en: "Express Exchange is convenient for both tourists and residents.", es: "Sirve tanto para turistas como residentes.", pt: "Funciona bem para turistas e residentes.", zh: "适合游客和本地居民。" },
    { ru: "Все реквизиты отправляются автоматически для снижения риска ошибок.", en: "All payment details are sent automatically to reduce mistakes.", es: "Los datos se envían automáticos para evitar errores.", pt: "Os dados são enviados automaticamente.", zh: "自动发送付款信息以减少错误。" },
    { ru: "Express Exchange помогает быстро перейти из крипты в наличные ARS.", en: "Express Exchange helps you move from crypto to ARS cash quickly.", es: "Pasá de crypto a pesos en minutos.", pt: "Converta cripto em pesos rapidamente.", zh: "快速将加密货币兑换成比索现金。" },
    { ru: "Сервис оптимизирован для мобильного использования.", en: "The service is optimized for mobile use.", es: "La app funciona perfecta desde el celular.", pt: "O serviço é otimizado para celular.", zh: "服务针对手机优化。" },
    { ru: "Express Exchange минимизирует время ожидания клиента.", en: "Express Exchange minimizes customer waiting time.", es: "Menos espera, más velocidad.", pt: "Menos espera, mais rapidez.", zh: "减少等待时间。" },
    { ru: "Удобный интерфейс помогает оформить заявку за пару минут.", en: "The interface lets you place an order in minutes.", es: "Podés crear tu pedido en minutos.", pt: "Você cria o pedido em poucos minutos.", zh: "几分钟即可完成订单。" },
    { ru: "Express Exchange подходит для ежедневных обменов и крупных операций.", en: "Suitable for daily exchanges and larger operations.", es: "Ideal para cambios diarios o montos altos.", pt: "Ideal para trocas diárias ou grandes valores.", zh: "适合日常和大额兑换。" },
    { ru: "Автоматизация сервиса ускоряет обработку заявок.", en: "Automation speeds up order processing.", es: "La automatización acelera las operaciones.", pt: "A automação acelera os pedidos.", zh: "自动化加快处理速度。" },
    { ru: "Express Exchange поддерживает популярные криптовалютные сети.", en: "Express Exchange supports major crypto networks.", es: "Compatible con las redes más usadas.", pt: "Compatível com redes populares.", zh: "支持主流加密网络。" },
    { ru: "Вы можете заранее уточнить наличие крупных сумм.", en: "You can confirm large cash availability in advance.", es: "Podés reservar montos grandes antes.", pt: "Você pode reservar grandes valores.", zh: "可提前确认大额库存。" },
    { ru: "Express Exchange делает процесс обмена максимально понятным.", en: "Express Exchange keeps the process simple and clear.", es: "Todo el proceso es claro y simple.", pt: "O processo é simples e transparente.", zh: "兑换流程简单明了。" },
    { ru: "Сервис подходит для пользователей без опыта в крипте.", en: "The service is beginner-friendly for crypto users.", es: "También sirve si recién empezás en crypto.", pt: "Ótimo para iniciantes em cripto.", zh: "对新手也很友好。" },
    { ru: "Express Exchange помогает экономить время на поиске курсов.", en: "Express Exchange saves time searching for rates.", es: "No hace falta perder tiempo buscando cotizaciones.", pt: "Você economiza tempo procurando taxas.", zh: "节省查找汇率的时间。" },
    { ru: "Все детали обмена подтверждаются до отправки средств.", en: "All exchange details are confirmed before transfer.", es: "Todo se confirma antes de operar.", pt: "Tudo é confirmado antes da operação.", zh: "转账前确认所有细节。" },
    { ru: "Express Exchange подходит для удаленных операций без офиса.", en: "Perfect for remote exchanges without visiting an office.", es: "Podés operar sin moverte de tu casa.", pt: "Troque sem sair de casa.", zh: "无需出门即可兑换。" },
    { ru: "Большинство клиентов используют сервис повторно.", en: "Most clients return to use the service again.", es: "Muchos clientes vuelven a operar.", pt: "Muitos clientes usam novamente.", zh: "许多客户会再次使用。" },
    { ru: "Express Exchange работает с учетом реалий аргентинского рынка.", en: "Built around the realities of the Argentine market.", es: "Pensado para el mercado argentino real.", pt: "Feito para o mercado argentino.", zh: "专为阿根廷市场打造。" },
    { ru: "Сервис помогает избежать сложностей с наличными операциями.", en: "The service simplifies cash-related operations.", es: "Menos complicaciones con efectivo.", pt: "Menos complicações com dinheiro vivo.", zh: "简化现金交易。" },
    { ru: "Express Exchange ускоряет переход между криптой и фиатом.", en: "Express Exchange speeds up crypto-to-fiat conversions.", es: "Crypto a fiat mucho más rápido.", pt: "Conversão rápida entre cripto e fiat.", zh: "快速完成加密与法币转换。" },
    { ru: "Заявки можно оформить в любое удобное время.", en: "Orders can be placed anytime.", es: "Podés dejar tu pedido cuando quieras.", pt: "Pedidos podem ser feitos a qualquer hora.", zh: "可随时下单。" },
    { ru: "Express Exchange постоянно улучшает автоматизацию сервиса.", en: "Express Exchange continuously improves automation.", es: "El sistema mejora constantemente.", pt: "A automação melhora constantemente.", zh: "持续优化自动化。" },
    { ru: "Для постоянных клиентов обмен становится еще удобнее.", en: "Returning customers enjoy an even smoother experience.", es: "Los clientes frecuentes operan más fácil todavía.", pt: "Clientes recorrentes têm mais facilidade.", zh: "老客户体验更流畅。" },
    { ru: "Express Exchange помогает сократить риски ошибок при переводах.", en: "Express Exchange helps reduce transfer mistakes.", es: "Menos errores en transferencias.", pt: "Menos erros em transferências.", zh: "减少转账错误。" },
    { ru: "Все инструкции отправляются прямо в чат автоматически.", en: "All instructions are sent automatically in chat.", es: "Las instrucciones llegan directo al chat.", pt: "As instruções chegam direto no chat.", zh: "所有步骤自动发送到聊天中。" },
    { ru: "Express Exchange ориентирован на скорость и удобство.", en: "Focused on speed and convenience.", es: "Velocidad y comodidad primero.", pt: "Foco em rapidez e praticidade.", zh: "专注速度与便利。" },
    { ru: "Клиенту не нужно разбираться в сложных банковских процессах.", en: "Clients don't need to understand complex banking systems.", es: "No hace falta entender bancos complicados.", pt: "Sem burocracia bancária complicada.", zh: "无需了解复杂银行流程。" },
    { ru: "Express Exchange упрощает работу с USDT в Аргентине.", en: "Express Exchange simplifies USDT usage in Argentina.", es: "Más fácil manejar USDT en Argentina.", pt: "Facilita o uso de USDT na Argentina.", zh: "简化USDT在阿根廷的使用。" },
    { ru: "Большая часть операций проходит полностью онлайн.", en: "Most operations are fully online.", es: "La mayoría de las operaciones son online.", pt: "A maioria das operações é online.", zh: "大部分操作可在线完成。" },
    { ru: "Express Exchange экономит время на поездках по городу.", en: "Express Exchange saves time on city travel.", es: "Menos tiempo viajando por la ciudad.", pt: "Menos tempo perdido no trânsito.", zh: "节省在城市中奔波的时间。" },
    { ru: "Процесс обмена остается простым даже для новичков.", en: "The exchange process stays simple even for beginners.", es: "Simple incluso si sos nuevo.", pt: "Simples até para iniciantes.", zh: "即使新手也容易使用。" },
    { ru: "Express Exchange помогает быстро получить доступ к наличным ARS.", en: "Express Exchange gives fast access to ARS cash.", es: "Acceso rápido a pesos en efectivo.", pt: "Acesso rápido a pesos em espécie.", zh: "快速获取比索现金。" },
    { ru: "Автоматические уведомления помогают отслеживать статус заявки.", en: "Automatic notifications help track your order.", es: "Las notificaciones muestran el estado del pedido.", pt: "Notificações acompanham o pedido.", zh: "自动通知追踪订单状态。" },
    { ru: "Express Exchange минимизирует ручной ввод данных.", en: "Express Exchange minimizes manual data entry.", es: "Menos datos escritos a mano.", pt: "Menos digitação manual.", zh: "减少手动输入。" },
    { ru: "Сервис помогает быстрее адаптироваться к аргентинской финансовой системе.", en: "The service helps users adapt to Argentina's financial system faster.", es: "Ayuda a entender mejor cómo manejarse en Argentina.", pt: "Ajuda a se adaptar ao sistema argentino.", zh: "帮助更快适应阿根廷金融体系。" },
    { ru: "Express Exchange делает крипто-обмен более доступным.", en: "Express Exchange makes crypto exchange more accessible.", es: "Hace el intercambio crypto más accesible.", pt: "Torna o câmbio cripto mais acessível.", zh: "让加密兑换更便捷。" },
    { ru: "Быстрая обработка заявок особенно важна при волатильности.", en: "Fast processing matters during market volatility.", es: "La velocidad importa cuando el mercado se mueve.", pt: "Rapidez importa na volatilidade.", zh: "市场波动时速度尤为重要。" },
    { ru: "Express Exchange подходит для обменов без долгого ожидания.", en: "Designed for exchanges without long waiting times.", es: "Sin esperas eternas.", pt: "Sem longas esperas.", zh: "无需长时间等待。" },
    { ru: "Клиенты могут получать актуальные инструкции прямо в приложении.", en: "Clients receive updated instructions directly in the app.", es: "Las instrucciones llegan directo en la app.", pt: "As instruções chegam direto no app.", zh: "最新说明直接在应用中查看。" },
    { ru: "Express Exchange помогает упростить работу с наличными и криптой.", en: "Express Exchange simplifies both cash and crypto operations.", es: "Más simple manejar efectivo y crypto.", pt: "Simplifica dinheiro e cripto.", zh: "简化现金与加密货币操作。" },
    { ru: "Сервис подходит как для разовых операций, так и для постоянного использования.", en: "Suitable for both occasional and regular use.", es: "Sirve para cambios puntuales o diarios.", pt: "Ideal para uso ocasional ou frequente.", zh: "适合偶尔或长期使用。" },
    { ru: "Express Exchange делает обмен более комфортным в повседневной жизни.", en: "Express Exchange makes everyday exchanges more comfortable.", es: "Hace más cómodo cambiar en el día a día.", pt: "Torna o câmbio mais confortável.", zh: "让日常兑换更轻松。" },
    { ru: "Минимум лишних шагов — максимум удобства.", en: "Fewer steps, more convenience.", es: "Menos pasos, más comodidad.", pt: "Menos etapas, mais praticidade.", zh: "步骤更少，更方便。" },
    { ru: "Express Exchange помогает быстро ориентироваться в мире крипты и песо.", en: "Express Exchange helps users navigate crypto and pesos easily.", es: "Más fácil manejar crypto y pesos.", pt: "Facilita lidar com cripto e pesos.", zh: "轻松管理加密货币与比索。" },
    { ru: "В Express Exchange действует кешбек 0.08% с каждой операции.", en: "Express Exchange offers 0.08% cashback on every transaction.", es: "Express Exchange tiene 0.08% de cashback en cada operación.", pt: "A Express Exchange oferece 0,08% de cashback em cada operação.", zh: "Express Exchange每笔交易都有0.08%的返现。" },
    { ru: "В приложении Express Exchange работает бонусная система для постоянных клиентов.", en: "Express Exchange includes a bonus system for returning customers.", es: "Express Exchange tiene un sistema de бонус для clientes frecuentes.", pt: "A Express Exchange possui um sistema de bônus para clientes recorrentes.", zh: "Express Exchange为老客户提供奖励系统。" },
    { ru: "Накопленные бонусы можно использовать для следующих обменов.", en: "Collected bonuses can be used on future exchanges.", es: "Los бонус acumulados se pueden usar en próximos cambios.", pt: "Os bônus acumulados podem ser usados nas próximas operações.", zh: "累计奖励可用于未来兑换。" },
    { ru: "Приглашайте друзей: 1500 бонусов вам и 500 другу — после первого подтверждённого обмена.", en: "Invite friends: 1500 for you and 500 for them after their first confirmed exchange.", es: "Invitá amigos: 1500 para vos y 500 para tu amigo tras su primer cambio confirmado.", pt: "Convide amigos: 1500 para você e 500 para o amigo após o primeiro câmbio confirmado.", zh: "邀请好友：好友首笔确认兑换后，您得1500积分，好友得500积分。" },
    { ru: "Express Exchange помогает быстро перемещать средства между разными странами.", en: "Express Exchange helps move funds quickly between different countries.", es: "Express Exchange ayuda a mover dinero entre distintos países.", pt: "A Express Exchange ajuda a movimentar fundos entre países.", zh: "Express Exchange帮助您在不同国家之间快速转移资金。" },
    { ru: "Вы можете внести наличные рубли в офисе в Москве и получить ARS или USD в Аргентине.", en: "You can deposit RUB cash in Moscow and receive ARS or USD in Argentina.", es: "Podés entregar rublos en efectivo en Moscú y recibir pesos o dólares en Argentina.", pt: "Você pode entregar rublos em Moscou e receber ARS ou USD na Argentina.", zh: "您可以在莫斯科存入卢布现金，并在阿根廷收到ARS或USD。" },
    { ru: "Express Exchange работает с международными денежными перестановками.", en: "Express Exchange supports international fund movements.", es: "Express Exchange trabaja con movimientos internacionales de dinero.", pt: "A Express Exchange trabalha com movimentações internacionais.", zh: "Express Exchange支持国际资金流转。" },
    { ru: "Сервис подходит для переводов между Россией, Аргентиной и другими странами.", en: "The service is suitable for transfers between Russia, Argentina, and other countries.", es: "El servicio sirve para mover fondos entre Rusia, Argentina y otros países.", pt: "O serviço funciona entre Rússia, Argentina e outros países.", zh: "该服务适用于俄罗斯、阿根廷及其他国家之间的转账。" },
    { ru: "Express Exchange помогает организовать получение наличных в другой стране.", en: "Express Exchange helps arrange cash pickup in another country.", es: "Express Exchange ayuda a coordinar entrega de efectivo en otro país.", pt: "A Express Exchange ajuda com retirada de dinheiro em outro país.", zh: "Express Exchange可帮助安排异国现金领取。" },
    { ru: "Крупные международные операции обрабатываются в индивидуальном порядке.", en: "Large international operations are handled individually.", es: "Las operaciones internacionales grandes se manejan de forma personalizada.", pt: "Grandes operações internacionais são tratadas individualmente.", zh: "大型国际交易将单独处理。" },
    { ru: "Express Exchange работает с очень крупными суммами обмена.", en: "Express Exchange works with very large exchange volumes.", es: "Express Exchange trabaja con montos muy grandes.", pt: "A Express Exchange trabalha com valores muito altos.", zh: "Express Exchange支持超大额兑换。" },
    { ru: "Для крупных сумм можно заранее согласовать детали операции.", en: "Large transactions can be arranged in advance.", es: "Los montos grandes se pueden coordinar заранее.", pt: "Grandes operações podem ser coordenadas antecipadamente.", zh: "大额交易可提前协调。" },
    { ru: "Express Exchange помогает перемещать капитал между наличными и криптой.", en: "Express Exchange helps move capital between cash and crypto.", es: "Express Exchange ayuda a mover capital entre efectivo y crypto.", pt: "A Express Exchange conecta dinheiro vivo e cripto.", zh: "Express Exchange帮助在现金与加密货币之间转移资金。" },
    { ru: "Возможны операции с наличными USD, ARS, RUB и криптовалютой.", en: "Operations with USD, ARS, RUB cash and crypto are available.", es: "Se puede operar con USD, ARS, RUB y crypto.", pt: "Operações com USD, ARS, RUB e cripto estão disponíveis.", zh: "支持USD、ARS、RUB现金及加密货币操作。" },
    { ru: "Express Exchange помогает упростить международные расчеты.", en: "Express Exchange simplifies international settlements.", es: "Express Exchange simplifica pagos internacionales.", pt: "A Express Exchange simplifica pagamentos internacionais.", zh: "Express Exchange简化国际结算。" },
    { ru: "Для больших объемов доступны индивидуальные условия обмена.", en: "Custom exchange conditions are available for high volumes.", es: "Hay condiciones personalizadas para grandes volúmenes.", pt: "Grandes volumes podem ter condições especiais.", zh: "大额交易可享受定制条件。" },
    { ru: "Express Exchange подходит для частных и бизнес-операций.", en: "Suitable for both personal and business operations.", es: "Sirve para operaciones personales y comerciales.", pt: "Ideal para uso pessoal e empresarial.", zh: "适用于个人和商业操作。" },
    { ru: "Сервис помогает быстрее организовать международные переводы.", en: "The service helps organize international transfers faster.", es: "El servicio acelera transferencias internacionales.", pt: "O serviço agiliza transferências internacionais.", zh: "加快国际转账流程。" },
    { ru: "Express Exchange позволяет получать наличные в удобной стране получения.", en: "Express Exchange allows cash pickup in a convenient country.", es: "Podés recibir efectivo en el país que te convenga.", pt: "Você pode retirar dinheiro no país desejado.", zh: "可在方便的国家领取现金。" },
];

// --- 4. STORE ---
const ratesBootstrap = getInitialRatesState(RATES, FEES);
let ratesFetchInFlight = null;
let persistSettingsTimer = null;

function getSettingsPayload(get) {
  const s = get();
  const uid = s.telegramUser?.id;
  const local = uid ? loadUserSettingsLocal(uid) : {};
  return {
    theme: s.theme,
    themeCustomized: local.themeUserSet === true,
    language: s.language,
    botNotifications: s.botNotifications,
    cashbackCard: s.cashbackCardId,
  };
}

function flushPersistSettings(get) {
  clearTimeout(persistSettingsTimer);
  persistSettingsTimer = null;
  const s = get();
  const uid = s.telegramUser?.id;
  if (!uid) return Promise.resolve();
  const payload = getSettingsPayload(get);
  saveUserSettingsLocal(uid, payload);
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
  return saveUserSettings(initData, uid, payload).catch((e) =>
    console.warn('saveUserSettings:', e.message || e)
  );
}

function schedulePersistSettings(get) {
  clearTimeout(persistSettingsTimer);
  const s = get();
  const uid = s.telegramUser?.id;
  if (uid) saveUserSettingsLocal(uid, getSettingsPayload(get));
  persistSettingsTimer = setTimeout(() => {
    flushPersistSettings(get);
  }, 300);
}

function persistHistoryToServer(get, item) {
  const uid = get().telegramUser?.id;
  if (!uid || !item?.id) return;
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
  const historyItem = {
    ...item,
    timestamp:
      item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp || new Date().toISOString(),
  };
  saveUserHistoryItem(initData, uid, historyItem).catch((e) =>
    console.warn('saveUserHistory:', e.message || e)
  );
}

function orderStatusLabel(t, status) {
  if (status === 'delivered') return t('status_delivered');
  if (status === 'confirmed') return t('status_confirmed');
  if (status === 'cancelled') return t('status_cancelled');
  return t('status_pending');
}

function orderHistoryStepIndex(status) {
  if (status === 'delivered') return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

function buildOrderHistorySteps(language) {
  const ru = language === 'ru';
  const es = language === 'es';
  const pt = language === 'pt';
  const zh = language === 'zh';
  return [
    {
      id: 'created',
      title: ru ? 'Заявка создана' : es ? 'Solicitud creada' : pt ? 'Pedido criado' : zh ? '订单已创建' : 'Order created',
      desc: '',
    },
    {
      id: 'in_work',
      title: ru ? 'Заявка в работе' : es ? 'En trabajo' : pt ? 'Em andamento' : zh ? '处理中' : 'In progress',
      desc: '',
    },
    {
      id: 'completed',
      title: ru ? 'Выполнено' : es ? 'Completado' : pt ? 'Concluído' : zh ? '已完成' : 'Completed',
      desc: '',
    },
  ];
}

function resolveAppTheme(local, account, storeTheme) {
  const themeCustomized = local.themeUserSet === true || account.themeCustomized === true;
  if (!themeCustomized) return 'dark';
  if (local.theme === 'dark' || local.theme === 'light') return local.theme;
  if (account.theme === 'dark' || account.theme === 'light') return account.theme;
  return storeTheme === 'dark' || storeTheme === 'light' ? storeTheme : 'dark';
}

function orderStatusBadgeClass(status, isDark) {
  if (status === 'delivered') {
    return isDark ? 'bg-emerald-500/25 text-emerald-200' : 'bg-emerald-100 text-emerald-800';
  }
  if (status === 'confirmed') {
    return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
  }
  if (status === 'cancelled') {
    return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700';
  }
  return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700';
}

function rateChangeClass(trend, isDark) {
  if (trend === 'up') return 'text-[#22c55e]';
  if (trend === 'down') return 'text-[#ef4444]';
  return isDark ? 'text-gray-400' : 'text-gray-500';
}

function readFileAsReceiptPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Invalid file data'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        name: file.name || 'receipt',
        mimeType: file.type || 'application/octet-stream',
        dataBase64: base64,
      });
    };
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

function postOrderToServer(payload) {
  const apiBase = (process.env.REACT_APP_BOT_API_URL || '').replace(/\/$/, '');
  const tgInitData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
  return fetch(`${apiBase}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      ...(tgInitData ? { 'X-Telegram-Init-Data': tgInitData } : {}),
    },
    body: JSON.stringify({ ...payload, initData: tgInitData || undefined }),
  });
}

const useExchangeStore = create((set, get) => ({
  // ДОБАВЛЯЕМ ЭТИ ДВЕ СТРОЧКИ:
  telegramUser: null,
  setTelegramUser: (user) => set({ telegramUser: user }),
  setWalletFromServer: (account, { syncTheme = true } = {}) => {
    const uid = account.telegramUserId ?? get().telegramUser?.id;
    const local = uid ? loadUserSettingsLocal(uid) : {};
    const localCard = local.cashbackCard ? normalizeCashbackCardId(local.cashbackCard) : null;
    const serverCard = account.cashbackCard
      ? normalizeCashbackCardId(account.cashbackCard)
      : null;
    const cardId =
      localCard ||
      (serverCard && serverCard !== 'classic' ? serverCard : null) ||
      DEFAULT_CASHBACK_CARD_ID;
    const resolvedTheme = resolveAppTheme(local, account, get().theme);
    const language = account.language || local.language || get().language || 'ru';
    const botNotifications =
      account.botNotifications !== undefined
        ? account.botNotifications !== false
        : local.botNotifications !== false;
    const patch = {
      bonuses: account.bonuses ?? 0,
      friendsInvited: account.friendsInvited ?? 0,
      language,
      botNotifications,
      cashbackCardId: cardId,
      orderHistory: parseOrderHistoryFromServer(account.orderHistory),
    };
    if (syncTheme) patch.theme = resolvedTheme;
    set(patch);
    if (uid) {
      const saved = { language, botNotifications, cashbackCard: cardId };
      if (syncTheme) saved.theme = resolvedTheme;
      saveUserSettingsLocal(uid, saved);
    }
  },

  theme: 'dark',
  cashbackCardId: DEFAULT_CASHBACK_CARD_ID,
  botNotifications: true,
  setCashbackCardId: (cashbackCardId) => {
    set({ cashbackCardId: normalizeCashbackCardId(cashbackCardId) });
    schedulePersistSettings(get);
  },
  setTheme: (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    set({ theme: next });
    const uid = get().telegramUser?.id;
    if (uid) saveUserSettingsLocal(uid, { ...getSettingsPayload(get), themeUserSet: true });
    schedulePersistSettings(get);
  },
  toggleTheme: () => {
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
    const uid = get().telegramUser?.id;
    if (uid) saveUserSettingsLocal(uid, { ...getSettingsPayload(get), themeUserSet: true });
    schedulePersistSettings(get);
  },
  setBotNotifications: (on) => {
    set({ botNotifications: Boolean(on) });
    schedulePersistSettings(get);
  },
  
  activeTab: 'home', 
  setActiveTab: (tab) => set({ activeTab: tab }),

  /** 1 = список услуг; 2+ = форма — без свайпа между вкладками */
  servicesStep: 1,
  setServicesStep: (step) =>
    set({ servicesStep: Math.max(1, Math.floor(Number(step) || 1)) }),

  // ЯЗЫК
  language: 'ru',
  setLanguage: (lang) => {
    set({ language: lang });
    schedulePersistSettings(get);
  },

  // БОНУСЫ (сервер: server/data/wallets.json по telegram id)
  bonuses: 0,
  friendsInvited: 0,
  setBonuses: (bonuses) =>
    set((state) => {
      const next = Math.max(0, Math.floor(bonuses));
      saveBonusesLocal(state.telegramUser?.id, next);
      return { bonuses: next };
    }),

  aiInsight: null,
  isInsightLoading: false,
  triggerAi: () => {
      set({ isInsightLoading: true, aiInsight: null });
      setTimeout(() => {
          // Получаем текущий язык
          const { language } = get();
          // Выбираем случайный совет из базы ОБМЕНА (50 вариантов)
          const randomTip = AI_EXCHANGE_TIPS[Math.floor(Math.random() * AI_EXCHANGE_TIPS.length)];
          // Ставим совет на нужном языке (фоллбэк на английский)
          set({ aiInsight: randomTip[language] || randomTip['en'], isInsightLoading: false });
      }, 1000); // Крутим анимацию загрузки 1 секунду
  },

  orders: [{ id: 1, give: null, giveAmount: '', get: null, getAmount: '' }],
  orderHistory: [],
  marketData: ratesBootstrap.marketData,
  exchangeRates: ratesBootstrap.exchangeRates,
  pairRates: ratesBootstrap.pairRates,
  pairDisplay: ratesBootstrap.pairDisplay,
  exchangeFees: ratesBootstrap.exchangeFees,
  ratesUpdatedAt: ratesBootstrap.ratesUpdatedAt,
  ratesReady: ratesBootstrap.ratesReady,
  ratesLoading: ratesBootstrap.ratesLoading,

  fetchExchangeRates: async ({ silent = false } = {}) => {
    if (ratesFetchInFlight) return ratesFetchInFlight;

    ratesFetchInFlight = (async () => {
      const wasReady = get().ratesReady;
      if (!silent) {
        set({ ratesLoading: true, ratesReady: false, marketData: [] });
      }

      const urls = ratesFetchUrls();
      let lastErr = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            console.error('fetchExchangeRates: не JSON', url, res.status, text.slice(0, 120));
            lastErr = new Error('not-json');
            continue;
          }
          if (!res.ok || !data.ok) {
            console.error('fetchExchangeRates:', url, res.status, data.error || data);
            lastErr = new Error(data.error || String(res.status));
            continue;
          }

          const pairDisplay = data.pairDisplay || hydratePairDisplayFromApi(data);
          const pairRates = buildCalcPairRates(
            sanitizeSpreadPairRates(data.pairRates || {}),
            pairDisplay
          );
          let marketData = buildHomeMarketData({ ...data, pairDisplay });
          marketData = enrichMarketDataWithTrend(marketData, pairDisplay, data.pairHistory || {});

          if (!marketData.length) {
            lastErr = new Error('empty marketData');
            continue;
          }
          if (marketData.length < 15) {
            console.warn(
              `fetchExchangeRates: только ${marketData.length}/15 пар. Перезапустите npm start (и npm run bot).`
            );
          }

          const baseRates = data.rates || get().exchangeRates || RATES;
          const exchangeRates = buildExchangeRatesFromPairRates(pairRates, baseRates);
          const exchangeFees = buildCalcFees({ ...FEES, ...(data.fees || {}) }, pairDisplay);
          const ratesUpdatedAt = data.updatedAt || new Date().toISOString();

          const payload = {
            exchangeRates,
            pairRates,
            pairDisplay,
            pairHistory: data.pairHistory || {},
            exchangeFees,
            marketData,
            ratesUpdatedAt,
          };

          saveRatesCache(payload);
          set({ ...payload, ratesReady: true, ratesLoading: false });
          console.log('📈 Курсы из Google Sheets:', data.source, marketData.length, 'пар', url);
          return;
        } catch (e) {
          lastErr = e;
          console.warn('fetchExchangeRates:', url, e.message || e);
        }
      }

      const cached = loadRatesCache();
      if (cached?.marketData?.length) {
        const rebuilt = enrichMarketDataWithTrend(
          buildHomeMarketData(cached),
          cached.pairDisplay || {},
          cached.pairHistory || {}
        );
        const pairDisplay = cached.pairDisplay || {};
        const pairRates = buildCalcPairRates(
          sanitizeSpreadPairRates(cached.pairRates || {}),
          pairDisplay
        );
        const exchangeRates = buildExchangeRatesFromPairRates(
          pairRates,
          cached.exchangeRates || RATES
        );
        set({
          marketData: rebuilt.length > 0 ? rebuilt : cached.marketData,
          exchangeRates,
          pairRates,
          pairDisplay,
          exchangeFees: buildCalcFees({ ...FEES, ...(cached.exchangeFees || {}) }, pairDisplay),
          ratesUpdatedAt: cached.ratesUpdatedAt,
          ratesReady: true,
          ratesLoading: false,
        });
        console.warn('fetchExchangeRates: API недоступен, показан сохранённый кэш');
      } else {
        set({ ratesLoading: false });
        if (!get().ratesReady) {
          console.error(
            'fetchExchangeRates: не удалось загрузить курсы.',
            lastErr?.message || lastErr,
            'Проверьте npm run bot и REACT_APP_BOT_API_URL.'
          );
        }
      }
    })();

    try {
      await ratesFetchInFlight;
    } finally {
      ratesFetchInFlight = null;
    }
  },

  confirmCurrentOrder: (deliveryDetails, orderId) => set((state) => {
      const id = orderId || `ORD-${Date.now().toString().slice(-6)}`;
      const newHistoryItem = {
          id,
          type: 'exchange',
          timestamp: new Date(),
          items: [...state.orders],
          delivery: deliveryDetails,
          status: 'pending',
      };
      persistHistoryToServer(get, newHistoryItem);
      return {
          orderHistory: [newHistoryItem, ...state.orderHistory],
          orders: [{ id: Date.now(), give: null, giveAmount: '', get: null, getAmount: '' }],
      };
  }),

  addServiceOrder: (serviceDetails, orderId) => set((state) => {
      const id = orderId || `SRV-${Date.now().toString().slice(-6)}`;
      const newHistoryItem = {
          id,
          type: 'service',
          timestamp: new Date(),
          details: serviceDetails,
          status: 'pending',
      };
      persistHistoryToServer(get, newHistoryItem);
      return { orderHistory: [newHistoryItem, ...state.orderHistory] };
  }),

  updateOrder: (id, field, value, options = {}) => {
    const syncArsGiveTop = options.syncArsGiveTop === true;
    const spreadSnapUsdtGive = options.spreadSnapUsdtGive;
    const clearSpreadPayUsdt = options.clearSpreadPayUsdt === true;
    const spreadPayUsdtPassthrough = options.spreadPayUsdtPassthrough === true;
    const enforceArsCardMin = options.enforceArsCardMin === true;
    const enforceArsCashMin = options.enforceArsCashMin === true;
    set(state => {
      const newOrders = state.orders.map(order => {
        if (order.id !== id) return order;
        let newOrder = { ...order, [field]: value };
        
        // 1. Полный сброс при смене валюты
        if (field === 'give' || field === 'get') { 
          const currentGive = field === 'give' ? value : newOrder.give;
          const currentGet = field === 'get' ? value : newOrder.get;
          const allowed = PAIRS[currentGive] || []; 
          const isDuplicate = state.orders.some(o => o.id !== id && o.give === currentGive && o.get === currentGet);
          
          if (!allowed.includes(currentGet) || isDuplicate) newOrder.get = null; 
          newOrder.giveAmount = '';
          newOrder.getAmount = '';
          return newOrder;
        }

        if (clearSpreadPayUsdt && isSpreadPayUsdtMode(newOrder.give, newOrder.get)) {
          newOrder.giveAmount = '';
          newOrder.getAmount = '';
          return newOrder;
        }

        if (
          spreadPayUsdtPassthrough &&
          isSpreadPayUsdtMode(newOrder.give, newOrder.get)
        ) {
          const exchangeFees = state.exchangeFees || FEES;
          const pairDisplay = state.pairDisplay || {};
          const spreadFee = resolveSpreadFeePercent(
            newOrder.give,
            newOrder.get,
            exchangeFees,
            pairDisplay
          );
          const cashGet = newOrder.get === 'USD' || newOrder.get === 'EUR';

          if (field === 'giveAmount') {
            const raw = String(value ?? '').trim();
            const amt = parseFloat(raw);
            newOrder.giveAmount = String(value ?? '');
            if (!raw || !Number.isFinite(amt) || amt <= 0) {
              newOrder.giveAmount = '';
              newOrder.getAmount = '';
            } else if (amt < 100) {
              newOrder.getAmount = '';
            } else {
              const usdNominal = cashGet ? normalizeUsdCashAmount(amt) : amt;
              const { usd } = calcUsdtFiatSpreadPair(usdNominal, spreadFee, 'payUsdt');
              if (usd > 0) newOrder.getAmount = String(usd);
            }
          }
          if (field === 'getAmount') {
            const raw = String(value ?? '').trim();
            const amt = parseFloat(raw);
            newOrder.getAmount = String(value ?? '');
            if (!raw || !Number.isFinite(amt) || amt <= 0) {
              newOrder.giveAmount = '';
              newOrder.getAmount = '';
            } else if (amt < 100) {
              newOrder.giveAmount = '';
            } else {
              const usdNominal = cashGet ? normalizeUsdCashAmount(amt) : amt;
              const { usdt, usd } = calcUsdtFiatSpreadPair(usdNominal, spreadFee, 'payUsdt');
              if (usd > 0) {
                newOrder.getAmount = String(usd);
                newOrder.giveAmount = formatSpreadUsdtAmount(usdt);
              }
            }
          }
          return newOrder;
        }

        if (newOrder.give && newOrder.get) {
          const exchangeRates = state.exchangeRates || RATES;
          const pairRates = state.pairRates || {};
          const pairDisplay = state.pairDisplay || {};
          const exchangeFees = state.exchangeFees || FEES;
          const pairKey = `${newOrder.give}-${newOrder.get}`;
          let feePercent = getSpreadFeePercent(
            newOrder.give,
            newOrder.get,
            exchangeFees,
            pairDisplay
          );
          if (feePercent == null && exchangeFees[pairKey] !== undefined) {
            feePercent = exchangeFees[pairKey];
          }

          // НОВАЯ ЛОГИКА: Проверяем, есть ли в корзине получение ПЕСО
          const activePeso = state.orders.some(o => o.id !== id && (o.get === 'ARS' || o.get === 'ARS_CARD' || (o.give === 'RUB' && (o.get === 'USD' || o.get === 'EUR')))) || newOrder.get === 'ARS' || newOrder.get === 'ARS_CARD' || (newOrder.give === 'RUB' && (newOrder.get === 'USD' || newOrder.get === 'EUR'));
          
          // Если меняем крипту на нал (или наоборот) И есть Песо -> процент в инпутах не учитываем (он пойдет в плашку)
          if (((newOrder.give === 'USDT' && (newOrder.get === 'USD' || newOrder.get === 'EUR')) || 
               ((newOrder.give === 'USD' || newOrder.give === 'EUR') && newOrder.get === 'USDT')) && activePeso) {
              feePercent = 0;
          }

          const spreadPair = isUsdtFiatSpreadPair(newOrder.give, newOrder.get);

          if (field === 'giveAmount') {
            if (spreadSnapUsdtGive) {
              newOrder.giveAmount = String(spreadSnapUsdtGive.usdt);
              newOrder.getAmount = String(spreadSnapUsdtGive.usd);
              return newOrder;
            }
            if (spreadPair && isSpreadPayUsdtMode(newOrder.give, newOrder.get)) {
              const rawGive = String(newOrder.giveAmount ?? '').trim();
              const amount = parseFloat(rawGive);
              if (!rawGive || !Number.isFinite(amount) || amount <= 0) {
                newOrder.giveAmount = '';
                newOrder.getAmount = '';
              }
              return newOrder;
            }
            const rawGive = String(newOrder.giveAmount ?? '').trim();
            const amount = parseFloat(rawGive);
            if (!rawGive || !Number.isFinite(amount) || amount <= 0) {
              newOrder.giveAmount = '';
              newOrder.getAmount = '';
            } else if (spreadPair && amount < 100) {
              newOrder.getAmount = '';
            } else if (spreadPair && amount >= 100) {
              const spreadFee = resolveSpreadFeePercent(
                newOrder.give,
                newOrder.get,
                exchangeFees,
                pairDisplay
              );
              const { usdt } = calcUsdtFiatSpreadPair(amount, spreadFee, 'receiveUsdt');
              newOrder.getAmount = usdt.toFixed(2);
            } else {
              let exactRes = convertExchangeAmount(
                newOrder.give,
                newOrder.get,
                amount,
                exchangeRates,
                pairRates,
                feePercent,
                false,
                pairDisplay
              );
              if (exactRes == null) exactRes = 0;
              
              if (newOrder.get === 'USD' || newOrder.get === 'EUR') {
                  if (isArsToForeignPair(newOrder.give, newOrder.get)) {
                      newOrder.getAmount = calcGetFromArsGive(
                          newOrder.give,
                          newOrder.get,
                          amount,
                          pairRates,
                          pairDisplay
                      );
                  } else if (isForeignToArsCardPair(newOrder.give, newOrder.get)) {
                      const synced = applyForeignGiveToArsGet(
                          newOrder.give,
                          newOrder.get,
                          amount,
                          pairRates,
                          pairDisplay
                      );
                      if (synced.giveAmount != null) newOrder.giveAmount = synced.giveAmount;
                      newOrder.getAmount = synced.getAmount;
                  } else if (
                      isForeignToArsRatePair(newOrder.give, newOrder.get) &&
                      newOrder.get === 'ARS'
                  ) {
                      newOrder.getAmount = Math.floor(exactRes).toString();
                  } else {
                      let issued = 0;
                      if (newOrder.give === 'RUB') {
                          issued = issueUsdCashFromExact(exactRes);
                      } else if (newOrder.give === 'USDT') {
                          issued = issueUsdCashNearestValid(exactRes);
                      } else {
                          let n = Math.floor(exactRes / 10) * 10;
                          while (n >= 100) {
                              if (![10, 30, 90].includes(n % 100)) { issued = n; break; }
                              n -= 10;
                          }
                      }
                      newOrder.getAmount = issued > 0 ? issued.toString() : '0';
                  }
              } else if (newOrder.get === 'USDT') {
                  if (isArsToForeignPair(newOrder.give, newOrder.get)) {
                      newOrder.getAmount = calcGetFromArsGive(
                          newOrder.give,
                          newOrder.get,
                          amount,
                          pairRates,
                          pairDisplay
                      );
                  } else if (isForeignToArsCardPair(newOrder.give, newOrder.get)) {
                      const synced = applyForeignGiveToArsGet(
                          newOrder.give,
                          newOrder.get,
                          amount,
                          pairRates,
                          pairDisplay
                      );
                      if (synced.giveAmount != null) newOrder.giveAmount = synced.giveAmount;
                      newOrder.getAmount = synced.getAmount;
                  } else if (
                      isForeignToArsRatePair(newOrder.give, newOrder.get) &&
                      newOrder.get === 'ARS'
                  ) {
                      newOrder.getAmount = Math.floor(exactRes).toString();
                  } else {
                      newOrder.getAmount = formatUsdtGetAmount(exactRes);
                  }
              } else if (newOrder.get === 'ARS' || newOrder.get === 'ARS_CARD') {
                  if (isForeignToArsCardPair(newOrder.give, newOrder.get)) {
                      const synced = applyForeignGiveToArsGet(
                          newOrder.give,
                          newOrder.get,
                          amount,
                          pairRates,
                          pairDisplay
                      );
                      if (synced.giveAmount != null) newOrder.giveAmount = synced.giveAmount;
                      newOrder.getAmount = synced.getAmount;
                  } else if (
                      isForeignToArsRatePair(newOrder.give, newOrder.get) &&
                      newOrder.get === 'ARS'
                  ) {
                      newOrder.getAmount = Math.floor(exactRes).toString();
                  } else {
                      const isWhole = newOrder.get.includes('ARS') || newOrder.get.includes('RUB');
                      newOrder.getAmount = isWhole
                          ? Math.floor(exactRes).toString()
                          : (Math.floor(exactRes * 100) / 100).toString();
                  }
              } else {
                  const isWhole = newOrder.get.includes('ARS') || newOrder.get.includes('RUB');
                  newOrder.getAmount = isWhole ? Math.floor(exactRes).toString() : (Math.floor(exactRes * 100) / 100).toString();
              }
            }
          }

          if (field === 'getAmount') {
            if (spreadPair && isSpreadPayUsdtMode(newOrder.give, newOrder.get)) {
              const rawGet = String(newOrder.getAmount ?? '').trim();
              const amount = parseFloat(rawGet);
              if (!rawGet || !Number.isFinite(amount) || amount <= 0) {
                newOrder.giveAmount = '';
                newOrder.getAmount = '';
              }
              return newOrder;
            }
            const rawGet = String(newOrder.getAmount ?? '').trim();
            const amount = parseFloat(rawGet);
            if (!rawGet || !Number.isFinite(amount) || amount <= 0) {
              newOrder.giveAmount = '';
              newOrder.getAmount = '';
            } else if (spreadPair && amount < 100) {
              newOrder.giveAmount = '';
            } else if (spreadPair && amount >= 100) {
              const spreadFee = resolveSpreadFeePercent(
                newOrder.give,
                newOrder.get,
                exchangeFees,
                pairDisplay
              );
              if (newOrder.get === 'USDT') {
                const feeN = Number(spreadFee);
                const feeMul = 1 + (Number.isFinite(feeN) ? feeN : 0) / 100;
                const usdNominal = feeMul !== 0 ? amount / feeMul : amount;
                const { usd } = calcUsdtFiatSpreadPair(usdNominal, spreadFee, 'receiveUsdt');
                newOrder.giveAmount = usd > 0 ? String(usd) : '0';
              } else {
                const { usdt } = calcUsdtFiatSpreadPair(amount, spreadFee, 'receiveUsdt');
                newOrder.getAmount = usdt.toFixed(2);
              }
            } else if (isArsToForeignPair(newOrder.give, newOrder.get)) {
              if (newOrder.get === 'USD' || newOrder.get === 'EUR') {
                const validUsd =
                  amount >= MIN_FOREIGN_GET_ARS_PAIRS
                    ? normalizeUsdCashAmount(amount)
                    : amount;
                newOrder.getAmount = String(validUsd);
                const arsGive = calcGiveArsFromForeignGet(
                  newOrder.give,
                  newOrder.get,
                  validUsd,
                  pairRates,
                  pairDisplay
                );
                if (arsGive != null) newOrder.giveAmount = arsGive;
              } else if (newOrder.get === 'USDT') {
                const validUsdt = Math.floor(amount * 100) / 100;
                newOrder.getAmount = formatUsdtGetAmount(validUsdt);
                const arsGive = calcGiveArsFromForeignGet(
                  newOrder.give,
                  newOrder.get,
                  validUsdt,
                  pairRates,
                  pairDisplay
                );
                if (arsGive != null) newOrder.giveAmount = arsGive;
              }
            } else if (isForeignToArsCardPair(newOrder.give, newOrder.get)) {
              const rate = getForeignToArsRate(
                newOrder.give,
                newOrder.get,
                pairRates,
                pairDisplay
              );
              const minGetArs =
                rate != null ? Math.floor(MIN_FOREIGN_GET_ARS_PAIRS * rate) : 0;
              const synced = applyArsCardGetToForeignGive(
                newOrder.give,
                newOrder.get,
                amount,
                pairRates,
                pairDisplay,
                enforceArsCardMin
              );
              newOrder.giveAmount = synced.giveAmount;
              const giveAtMin =
                synced.giveAmount &&
                parseFloat(synced.giveAmount) <= MIN_FOREIGN_GET_ARS_PAIRS;
              if (
                enforceArsCardMin ||
                (giveAtMin && minGetArs > 0 && amount < minGetArs)
              ) {
                newOrder.getAmount = synced.getAmount;
              } else {
                newOrder.getAmount = rawGet;
              }
            } else if (isForeignToArsCashPair(newOrder.give, newOrder.get)) {
              const rate = getForeignToArsRate(
                newOrder.give,
                newOrder.get,
                pairRates,
                pairDisplay
              );
              const minGetArs =
                rate != null ? Math.floor(MIN_FOREIGN_GET_ARS_PAIRS * rate) : 0;
              const synced = applyArsCashGetToForeignGive(
                newOrder.give,
                newOrder.get,
                amount,
                pairRates,
                pairDisplay,
                enforceArsCashMin
              );
              newOrder.giveAmount = synced.giveAmount;
              const giveAtMin =
                synced.giveAmount &&
                parseFloat(synced.giveAmount) <= MIN_FOREIGN_GET_ARS_PAIRS;
              if (
                enforceArsCashMin ||
                (giveAtMin && minGetArs > 0 && amount < minGetArs)
              ) {
                newOrder.getAmount = synced.getAmount;
              } else {
                newOrder.getAmount = rawGet;
              }
            } else {
              let exactRes = convertExchangeAmount(
                newOrder.get,
                newOrder.give,
                amount,
                exchangeRates,
                pairRates,
                feePercent,
                true,
                pairDisplay
              );
              if (exactRes == null) exactRes = 0;
              
              if (newOrder.give === 'RUB') {
                  newOrder.giveAmount = (Math.ceil(exactRes / 1000) * 1000).toString();
              } else if (newOrder.give === 'USD' || newOrder.give === 'EUR') {
                  let n = Math.ceil(exactRes / 10) * 10;
                  if (n < 100) n = 100;
                  while (n >= 100) {
                      if (![10, 30, 90].includes(n % 100)) break;
                      n += 10;
                  }
                  newOrder.giveAmount = n.toString();
              } else {
                  const isWhole = newOrder.give.includes('ARS') || newOrder.give.includes('RUB');
                  newOrder.giveAmount = isWhole ? Math.ceil(exactRes).toString() : (Math.ceil(exactRes * 100) / 100).toFixed(2);
              }
            }
          }
        } else {
          if (field === 'giveAmount') newOrder.getAmount = '';
          if (field === 'getAmount') newOrder.giveAmount = '';
        }
        return newOrder;
      });
      return { orders: newOrders };
    });
  },

  addOrder: () => set(state => ({ 
    orders: [...state.orders, { id: Date.now(), give: null, giveAmount: '', get: null, getAmount: '' }] 
  })),

 removeOrder: (id) => set(state => { 
    if (state.orders.length <= 1) return state;

    // 1. Удаляем сделку
    const newOrders = state.orders.filter(o => o.id !== id);

    // 2. Проверяем, остались ли в корзине еще какие-то сделки с песо?
    const activePeso = newOrders.some(o => 
        o.get === 'ARS' || o.get === 'ARS_CARD' || 
        (o.give === 'RUB' && (o.get === 'USD' || o.get === 'EUR'))
    );

    // 3. Пересчитываем оставшиеся сделки, чтобы вернуть комиссию, если нужно
    const recalculatedOrders = newOrders.map(order => {
        const isCryptoCash = (order.give === 'USDT' && (order.get === 'USD' || order.get === 'EUR')) || 
                             ((order.give === 'USD' || order.give === 'EUR') && order.get === 'USDT');
        
        if (isCryptoCash && order.getAmount && parseFloat(order.getAmount) > 0) {
            const pairKey = `${order.give}-${order.get}`;
            const fees = get().exchangeFees || FEES;
            const feePercent = fees[pairKey] !== undefined ? fees[pairKey] : 0;
            
            // Если песо больше нет, комиссия ВОЗВРАЩАЕТСЯ. Если песо есть - остается 0.
            const actualFee = activePeso ? 0 : feePercent;
            
            const amountGet = parseFloat(order.getAmount);
            let newGive;
            
            // Считаем новую сумму Отдаете на основе Получаете
            if (order.give === 'USDT') newGive = amountGet * (1 + actualFee / 100);
            else newGive = amountGet / (1 + actualFee / 100);

            return {
                ...order,
                giveAmount: newGive % 1 === 0 ? newGive.toString() : newGive.toFixed(2)
            };
        }
        return order;
    });

    return { orders: recalculatedOrders };
  }),

  validateOrders: () => { 
    const { orders } = get(); 
    return orders.every(o => {
        const val = parseFloat(o.giveAmount);
        if (!val || val <= 0) return false;

        if (isSpreadPayUsdtMode(o.give, o.get)) {
            const getVal = parseFloat(o.getAmount);
            if (!getVal || getVal < MIN_FOREIGN_GET_ARS_PAIRS) return false;
            if (o.get === 'USD' || o.get === 'EUR') {
                return getVal === normalizeUsdCashAmount(getVal);
            }
            return true;
        }
        if (!o.getAmount) return false;
        
        // Жесткая проверка правил перед тем, как включить кнопку "Далее"
        if (o.give === 'RUB') return val >= 10000 && val % 1000 === 0;
        if (isArsToForeignPair(o.give, o.get)) {
            const getVal = parseFloat(o.getAmount);
            const pairRates = get().pairRates || {};
            const pairDisplay = get().pairDisplay || {};
            const exchangeRates = get().exchangeRates || RATES;
            const minArs = minArsNumForForeignGet(
                o.give,
                o.get,
                exchangeRates,
                pairRates,
                pairDisplay
            );
            if (!getVal || getVal < MIN_FOREIGN_GET_ARS_PAIRS) return false;
            if (minArs > 0 && val < minArs) return false;
            if (o.get === 'USD' || o.get === 'EUR') {
                return getVal === normalizeUsdCashAmount(getVal);
            }
            return true;
        }
        if (o.give === 'ARS') return val >= 500000;
        if (o.give === 'USD' || o.give === 'EUR') {
            let n = Math.round(val / 10) * 10;
            if (n < 100) return false;
            const lastTwo = n % 100;
            if ([10, 30, 90].includes(lastTwo)) n += 10;
            return val === n; // Пропускаем только если сумма идеально ровная
        }
        return true;
    }); 
  }
}));

// --- 5. UI КОМПОНЕНТЫ ---

/** Модалки поверх нижнего меню (portal → body, z-index выше nav). */
function AppModalOverlay({ open, onClose, isDark, sheetClassName = '', children }) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return undefined;
    }
    if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 280);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, mounted]);

  const requestClose = () => {
    if (!closing) onClose();
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1500] app-modal-backdrop flex items-end sm:items-center justify-center ${closing ? 'app-modal-backdrop-out' : 'app-modal-backdrop-in'}`}
      onClick={requestClose}
      role="presentation"
    >
      <div
        className={`w-full max-w-sm flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-[calc(1.5rem+var(--app-safe-bottom))] ${closing ? 'app-modal-sheet-out' : 'app-modal-sheet-in'} ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'} ${sheetClassName}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// 5.1 PROFILE COMPONENT (WITH LANG)
const RenderProfile = () => {
    const {
        theme,
        setTheme,
        cashbackCardId,
        setCashbackCardId,
        bonuses,
        friendsInvited,
        language,
        setLanguage,
        telegramUser,
        botNotifications,
        setBotNotifications,
        orderHistory,
    } = useExchangeStore();
    // ПОДГОТОВКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
    const firstName = telegramUser?.first_name || 'Guest';
    const lastName = telegramUser?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const username = telegramUser?.username ? `@${telegramUser.username}` : '';
    // Делаем инициалы (первая буква имени + первая буква фамилии)
    const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase() || 'TG';
    const avatarUrl = telegramUser?.photo_url; // Аватарка из Телеграма
    const isDark = theme === 'dark';
    const [showLangModal, setShowLangModal] = useState(false);
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showPersonalModal, setShowPersonalModal] = useState(false);

    const profileStats = useMemo(() => {
        let exchangeCount = 0;
        let serviceCount = 0;
        (orderHistory || []).forEach((order) => {
            if (order.type === 'service') serviceCount += 1;
            else exchangeCount += 1;
        });
        return {
            friendsInvited: friendsInvited || 0,
            exchangeCount,
            serviceCount,
            totalOrders: exchangeCount + serviceCount,
        };
    }, [orderHistory, friendsInvited]);
    const [copied, setCopied] = useState(false);
    
    // СТЕЙТ ДЛЯ ГЛЯНЦЕВОГО БЛИКА
    const [tilt, setTilt] = useState({ x: 50, y: 50 });
    const cardRef = useRef(null);

    const t = (key) => TRANSLATIONS[language][key] || key;
    const botUsername = (process.env.REACT_APP_BOT_USERNAME || 'exexchange_bot').replace(/^@/, '');
    const refLink = telegramUser?.id
      ? `https://t.me/${botUsername}?start=ref_${telegramUser.id}`
      : `https://t.me/${botUsername}`;
    
    // ПРОГРЕССИВНАЯ МАТЕМАТИКА КЭШБЭКА
    const calculatedRate = Math.min(0.2, 0.08 + (friendsInvited * 0.01));
    const currentCashbackRate = calculatedRate.toFixed(2) + '%';
    const activeCard = getCashbackCard(cashbackCardId);
    const cardBgUrl = cashbackCardImageUrl(cashbackCardId);
    const hasCardImage = Boolean(cardBgUrl);



    // ЛОГИКА ГИРОСКОПА И МЫШИ ДЛЯ БЛИКА
    useEffect(() => {
        const handleOrientation = (e) => {
            if (e.gamma === null || e.beta === null) return;
            // Gamma (влево-вправо): -45 до 45 переводим в 0% - 100%
            let x = (e.gamma / 45) * 50 + 50; 
            // Beta (на себя-от себя): вычитаем 40 (стандартный угол удержания телефона)
            let y = ((e.beta - 40) / 45) * 50 + 50; 
            
            // Ограничиваем вылет блика
            setTilt({ 
                x: Math.max(-20, Math.min(120, x)), 
                y: Math.max(-20, Math.min(120, y)) 
            });
        };

        const handleMouseMove = (e) => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            // Вычисляем позицию мыши относительно карточки
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setTilt({ x, y });
        };

        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(refLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        const shareText = language === 'ru' 
            ? "Меняй валюту выгодно! Держи 500 ARS приветственного бонуса на первый обмен:" 
            : "Exchange currency at the best rates! Here is a 500 ARS welcome bonus for your first order:";
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, '_blank');
        }
    };

    const MenuItem = ({ icon, label, value, onClick, isDanger }) => (
        <button
            type="button"
            onClick={onClick}
            className={`profile-menu-item w-full flex items-center justify-between p-4 text-left border-0 outline-none touch-manipulation transition-colors first:rounded-t-[2rem] last:rounded-b-[2rem] ${
                onClick ? 'cursor-pointer active:bg-black/5 dark:active:bg-white/5' : 'cursor-default'
            } ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'}`}
        >
            <div className="flex items-center gap-4 pointer-events-none">
                <div className={`p-2 rounded-full ${isDanger ? 'bg-red-500/10 text-red-500' : (isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-black')}`}>
                    {icon}
                </div>
                <span className={`font-bold text-sm ${isDanger ? 'text-red-500' : (isDark ? 'text-white' : 'text-slate-900')}`}>{label}</span>
            </div>
            <div className="flex items-center gap-2 pointer-events-none">
                {value && <span className="text-xs font-medium opacity-50">{value}</span>}
                <ChevronRight size={16} className="opacity-30" />
            </div>
        </button>
    );

    return (
        <div className="px-6 pt-0 pb-32 space-y-6">
            {/* HEADER */}
            <div className="flex items-center gap-4 pt-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0 overflow-hidden">
                    {/* Если есть фотка в ТГ - показываем её, если нет - инициалы */}
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        initials
                    )}
                </div>
                <div className="flex flex-col">
                    <h2 className={`text-2xl font-black tracking-tight leading-none mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                        {fullName}
                    </h2>
                    {username && <span className="text-sm font-bold opacity-40">{username}</span>}
                </div>
            </div>

            {/* БЛОК ФИНАНСОВ (КАРТА + БАННЕР) */}
            <div className="space-y-3">
                
                {/* 1. КАРТОЧКА КЭШБЭКА */}
                <div
                    ref={cardRef}
                    className="w-full min-h-[11.5rem] rounded-[2rem] p-7 flex flex-col relative overflow-hidden text-white shadow-2xl border border-white/15"
                >
                    {hasCardImage ? (
                        <>
                            <img
                                src={cardBgUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover scale-105"
                                draggable={false}
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/50 to-black/35" />
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a]" />
                            <div className="absolute -right-16 -top-16 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -left-10 bottom-0 w-40 h-40 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
                        </>
                    )}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none transition-transform duration-75 ease-out"
                        style={{
                            background: `radial-gradient(circle 280px at ${tilt.x}% ${tilt.y}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 72%)`,
                        }}
                    />
                    <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-white/5" />

                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/60">
                                    {t('bonus_card_title')}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider backdrop-blur-md ${
                                        friendsInvited > 0
                                            ? isDark
                                                ? 'bg-[#D0FD00] text-black shadow-lg shadow-[#D0FD00]/25'
                                                : 'bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30'
                                            : 'bg-white/15 text-white border border-white/20'
                                    }`}
                                >
                                    {currentCashbackRate}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-[3.25rem] font-black tracking-tighter leading-none drop-shadow-lg">
                                    {bonuses}
                                </span>
                                <span className="text-lg font-bold text-white/55 tracking-wide">ARS</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl shrink-0 bg-white/10 border border-white/20 shadow-inner">
                            <Gift size={22} strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 relative z-10 mt-auto pt-2">
                        <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest leading-snug">
                            {t('bonus_card_sub')}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/35 truncate max-w-[42%]">
                            {t(activeCard.labelKey)}
                        </span>
                    </div>
                </div>

                {/* 2. БАННЕР РЕФЕРАЛКИ */}
                <div className={`w-full p-5 rounded-[1.5rem] flex flex-col gap-4 transition-all ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                    <div className="flex items-start gap-4 px-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md ${isDark ? 'bg-[#D0FD00] text-black' : 'bg-black text-white'}`}>
                            <Users size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col mt-0.5">
                            <span className={`text-base font-black tracking-tight leading-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {t('prof_referral_title')}
                            </span>
                            <span className={`text-xs font-bold leading-snug ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                {t('prof_referral_desc')}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-1">
                        <button 
                            onClick={handleCopy}
                            disabled={!telegramUser?.id}
                            className={`flex-1 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none ${copied ? 'bg-emerald-500 text-white shadow-md' : (isDark ? 'bg-[#2C2C2E] text-white hover:bg-white/10' : 'bg-gray-50 text-slate-900 hover:bg-gray-100')}`}
                        >
                            {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
                            {copied ? (language === 'ru' ? 'Скопировано' : 'Copied') : (language === 'ru' ? 'Скопировать' : 'Copy Link')}
                        </button>
                        <button 
                            onClick={handleShare}
                            disabled={!telegramUser?.id}
                            className={`flex-1 py-3 rounded-full font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${isDark ? 'bg-[#D0FD00] text-black hover:brightness-95' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            <Share2 size={14}/>
                            {language === 'ru' ? 'Поделиться' : 'Share'}
                        </button>
                    </div>
                </div>

            </div>

            {/* MENUS */}
            <div className="space-y-1 mt-4">
                <div className="px-4 text-[10px] font-black uppercase opacity-40 tracking-widest">{t('prof_account')}</div>
                <div className={`rounded-[2rem] overflow-hidden ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                    <MenuItem icon={<User size={18} />} label={t('prof_personal')} value={String(profileStats.totalOrders)} onClick={() => setShowPersonalModal(true)} />
                    <MenuItem icon={<Info size={18} />} label={t('prof_about')} value="v2.1" onClick={() => setShowAboutModal(true)} />
                </div>
            </div>

            <div className="space-y-1">
                <div className="px-4 text-[10px] font-black uppercase opacity-40 tracking-widest">{t('prof_app')}</div>
                <div className={`rounded-[2rem] overflow-hidden ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                    <MenuItem 
                        icon={<Globe size={18} />} 
                        label={t('prof_lang')} 
                        value={LANGUAGES_LIST.find(l => l.code === language).name} 
                        onClick={() => setShowLangModal(true)} 
                    />
                    <MenuItem 
                        icon={isDark ? <Sun size={18} /> : <Moon size={18} />} 
                        label={t('prof_theme')} 
                        value={`${isDark ? t('theme_dark') : t('theme_light')} · ${t(activeCard.labelKey)}`}
                        onClick={() => setShowThemeModal(true)}
                    />
                    <MenuItem
                        icon={<Bell size={18} />}
                        label={t('prof_notif')}
                        value={botNotifications ? t('prof_notif_on') : t('prof_notif_off')}
                        onClick={() => setShowNotifModal(true)}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <div className="px-4 text-[10px] font-black uppercase opacity-40 tracking-widest">{t('prof_support')}</div>
                <div className={`rounded-[2rem] overflow-hidden ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`}>
                    <MenuItem 
                        icon={<HelpCircle size={18} />} 
                        label={t('prof_chat')} 
                        onClick={openSupportTelegram} 
                    />
                </div>
            </div>

            <AppModalOverlay
                open={showThemeModal}
                onClose={() => setShowThemeModal(false)}
                isDark={isDark}
                sheetClassName="max-h-[min(88dvh,100%)]"
            >
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('prof_theme')}</h3>
                            <button type="button" onClick={() => setShowThemeModal(false)} className="p-2 bg-gray-500/10 rounded-full touch-manipulation"><X size={20}/></button>
                        </div>
                        <div className="overflow-y-auto no-scrollbar min-h-0 flex-1 space-y-5 -mx-1 px-1">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{t('theme_section')}</p>
                                <div className={`p-4 rounded-2xl flex items-center justify-between gap-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        {isDark ? <Moon size={20} className="text-[#D0FD00]" /> : <Sun size={20} className="text-amber-500" />}
                                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{isDark ? t('theme_dark') : t('theme_light')}</span>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isDark}
                                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                        className={`relative w-14 h-8 rounded-full shrink-0 transition-colors ${isDark ? 'bg-white' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform ${isDark ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{t('theme_card_section')}</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {CASHBACK_CARDS.map((card) => {
                                        const url = cashbackCardImageUrl(card.id);
                                        const selected = cashbackCardId === card.id;
                                        return (
                                            <button
                                                key={card.id}
                                                type="button"
                                                onClick={() => {
                                                    setCashbackCardId(card.id);
                                                    flushPersistSettings(useExchangeStore.getState);
                                                }}
                                                className={`relative aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                                                    selected
                                                        ? isDark
                                                            ? 'border-orange-500 ring-2 ring-orange-500/40'
                                                            : 'border-orange-500 ring-2 ring-orange-500/30'
                                                        : isDark
                                                          ? 'border-white/10'
                                                          : 'border-gray-200'
                                                }`}
                                            >
                                                {url ? (
                                                    <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1c1c1e] to-[#2a2a2e]" />
                                                )}
                                                <div className="absolute inset-0 bg-black/35" />
                                                {selected && (
                                                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow">
                                                        <CheckCircle size={12} />
                                                    </span>
                                                )}
                                                <span className="absolute bottom-0 inset-x-0 py-1 px-0.5 text-[7px] font-bold text-center leading-tight text-white bg-black/55">
                                                    {t(card.labelKey)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
            </AppModalOverlay>

            <AppModalOverlay
                open={showAboutModal}
                onClose={() => setShowAboutModal(false)}
                isDark={isDark}
                sheetClassName="max-h-[min(88dvh,100%)]"
            >
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('prof_about')}</h3>
                            <button type="button" onClick={() => setShowAboutModal(false)} className="p-2 bg-gray-500/10 rounded-full touch-manipulation"><X size={20}/></button>
                        </div>
                        <div className="overflow-y-auto no-scrollbar min-h-0 flex-1 space-y-4 -mx-1 px-1">
                            <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{t('about_intro')}</p>
                        </div>
            </AppModalOverlay>

            <AppModalOverlay
                open={showPersonalModal}
                onClose={() => setShowPersonalModal(false)}
                isDark={isDark}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('prof_personal')}</h3>
                    <button type="button" onClick={() => setShowPersonalModal(false)} className="p-2 bg-gray-500/10 rounded-full touch-manipulation"><X size={20}/></button>
                </div>
                <div className="space-y-3">
                    {[
                        { label: t('prof_stats_friends'), value: profileStats.friendsInvited },
                        { label: t('prof_stats_exchanges'), value: profileStats.exchangeCount },
                        { label: t('prof_stats_services'), value: profileStats.serviceCount },
                    ].map((row) => (
                        <div
                            key={row.label}
                            className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                        >
                            <span className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{row.label}</span>
                            <span className={`text-lg font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </AppModalOverlay>

            <AppModalOverlay open={showNotifModal} onClose={() => setShowNotifModal(false)} isDark={isDark}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('prof_notif')}</h3>
                            <button type="button" onClick={() => setShowNotifModal(false)} className="p-2 bg-gray-500/10 rounded-full touch-manipulation"><X size={20}/></button>
                        </div>
                        <div className={`p-4 rounded-2xl flex items-center justify-between gap-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('prof_notif_bot')}</div>
                                <div className={`text-xs mt-2 leading-snug whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>{t('prof_notif_bot_desc')}</div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={botNotifications}
                                onClick={() => setBotNotifications(!botNotifications)}
                                className={`relative w-14 h-8 rounded-full shrink-0 transition-colors ${botNotifications ? 'bg-emerald-500' : isDark ? 'bg-white/20' : 'bg-gray-300'}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${botNotifications ? 'translate-x-6' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>
                        <p className={`text-xs mt-4 text-center ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                            {botNotifications ? t('prof_notif_on') : t('prof_notif_off')}
                        </p>
            </AppModalOverlay>

            <AppModalOverlay
                open={showLangModal}
                onClose={() => setShowLangModal(false)}
                isDark={isDark}
                sheetClassName="max-h-[min(85dvh,100%)]"
            >
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('prof_lang')}</h3>
                            <button type="button" onClick={() => setShowLangModal(false)} className="p-2 bg-gray-500/10 rounded-full touch-manipulation"><X size={20}/></button>
                        </div>
                        <div className="space-y-2 overflow-y-auto no-scrollbar min-h-0 flex-1 -mx-1 px-1">
                            {LANGUAGES_LIST.map((lang) => (
                                <button 
                                    type="button"
                                    key={lang.code}
                                    onClick={() => { setLanguage(lang.code); setShowLangModal(false); }}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-between font-bold transition-all touch-manipulation active:scale-95 ${language === lang.code ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : (isDark ? 'bg-white/5 text-white active:bg-white/10' : 'bg-gray-50 text-slate-900 active:bg-gray-100')}`}
                                >
                                    <span className="flex items-center gap-3"><span className="text-2xl">{lang.flag}</span> {lang.name}</span>
                                    {language === lang.code && <CheckCircle size={20}/>}
                                </button>
                            ))}
                        </div>
            </AppModalOverlay>
        </div>
    );
};

// 5.2 SERVICES COMPONENT
// 5.2 SERVICES COMPONENT (С AI СОВЕТАМИ)
// 5.2 SERVICES COMPONENT (С AI СОВЕТАМИ И ИСПРАВЛЕННОЙ ТЕМНОЙ ТЕМОЙ)
// 5.2 SERVICES COMPONENT (С АРГЕНТИНСКИМИ НОМЕРАМИ И КНОПКОЙ "ДРУГОЕ")
// 5.2 SERVICES COMPONENT (СОВРЕМЕННЫЙ ДИЗАЙН ИНПУТОВ)
// 5.2 SERVICES COMPONENT (С КРАСНОЙ ВАЛИДАЦИЕЙ НОМЕРА)
// 5.2 SERVICES COMPONENT (ИДЕАЛЬНЫЙ: ВСЕ ФУНКЦИИ ВОССТАНОВЛЕНЫ)
// 5.2 SERVICES COMPONENT (СТРОГО ПО ТРЕБОВАНИЯМ ДЛЯ ТЕЛЕФОНА)
const RenderServices = () => {
    const { addServiceOrder, theme, language, telegramUser, setWalletFromServer, setServicesStep } = useExchangeStore();
    const isDark = theme === 'dark';
    const srvCard = isDark
        ? 'bg-[#1C1C1E] border-0 hover:bg-[#2C2C2E]'
        : 'bg-white border-transparent shadow-sm hover:bg-gray-50';
    const srvIcon = isDark ? 'bg-white text-black' : 'bg-black text-white';
    const srvScrollWrap =
        'services-form-scroll flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain';

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [step, setStep] = useState(1);
    
    const [provider, setProvider] = useState('');
    const [customProvider, setCustomProvider] = useState(''); 
    const [account, setAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [comment, setComment] = useState('');
    const [scannedCode, setScannedCode] = useState('');
    const [file, setFile] = useState(null);
    const receiptInputRef = useRef(null);
    // --- СТЕЙТЫ И ЛОГИКА ДЛЯ MERCADO LIBRE ---
    const [mlDni, setMlDni] = useState('');
    const [mlDelivery, setMlDelivery] = useState('pickup'); 
    const [mlAddress, setMlAddress] = useState('');
    const [mlLinks, setMlLinks] = useState(['']);
    const [mlSuggestions, setMlSuggestions] = useState([]);
    const [mlShowSuggestions, setMlShowSuggestions] = useState(false);
    const [mlIsLocating, setMlIsLocating] = useState(false);
    const [mlCoords, setMlCoords] = useState(null); // НОВАЯ ПЕРЕМЕННАЯ ДЛЯ КАРТЫ

    useEffect(() => {
        const t = setTimeout(async () => {
            if (mlAddress.length > 3 && !mlAddress.includes('GPS') && !mlSuggestions.find(s => s.formatted === mlAddress)) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${mlAddress}, City of Buenos Aires&countrycodes=ar&limit=5&addressdetails=1`);
                    const data = await res.json();
                    setMlSuggestions(data.map(item => {
                        const { road, house_number, suburb, city_district, city } = item.address || {};
                        let mainPart = road || ''; if (house_number) mainPart += ` ${house_number}`;
                        const dist = suburb || city_district || city || '';
                        return { 
                            formatted: (mainPart && dist) ? `${mainPart}, ${dist}` : (mainPart || item.display_name.split(',')[0]),
                            lat: item.lat, 
                            lon: item.lon // СОХРАНЯЕМ КООРДИНАТЫ ИЗ ПОИСКА
                        };
                    }));
                    setMlShowSuggestions(true);
                } catch(e){}
            } else if (mlSuggestions.length === 0) setMlShowSuggestions(false);
        }, 500);
        return () => clearTimeout(t);
    }, [mlAddress]);

    const handleMlGeolocation = () => {
        if (!navigator.geolocation) return;
        setMlIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setMlCoords({ lat: latitude, lon: longitude }); // СТАВИМ ТОЧКУ НА КАРТУ ПРИ GPS
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
                    const data = await res.json();
                    if (data?.address) {
                        const { road, house_number, suburb, city_district, city } = data.address;
                        let mainPart = road || ''; if (house_number) mainPart += ` ${house_number}`;
                        const dist = suburb || city_district || city || '';
                        setMlAddress((mainPart && dist) ? `${mainPart}, ${dist}` : (mainPart || data.display_name.split(',')[0]));
                    } else setMlAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                } catch (e) { setMlAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); }
                setMlIsLocating(false);
            }, () => setMlIsLocating(false)
        );
    };

    const [aiMessage, setAiMessage] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const t = (key) => TRANSLATIONS[language][key] || key;

    const reset = () => {
        setSelectedCategory(null); setStep(1); setProvider(''); setCustomProvider(''); 
        setAccount(''); setAmount(''); setComment(''); setScannedCode(''); setFile(null);
        setAiMessage(null);
        setServicesStep(1);
    };

    const serviceStepRef = useRef(step);
    serviceStepRef.current = step;

    useEffect(() => {
        setServicesStep(step);
    }, [step, setServicesStep]);

    useEffect(() => {
        const onSwipeBack = () => {
            if (serviceStepRef.current > 1) reset();
        };
        window.addEventListener(SERVICES_SWIPE_BACK_EVENT, onSwipeBack);
        return () => window.removeEventListener(SERVICES_SWIPE_BACK_EVENT, onSwipeBack);
    }, []);

    useEffect(() => {
        handleTriggerAi();
        const interval = setInterval(() => { handleTriggerAi(); }, 20000);
        return () => clearInterval(interval);
    }, [selectedCategory, language]);

    const handleTriggerAi = () => {
        setIsAiLoading(true); setAiMessage(null);
        setTimeout(() => {
            const catId = selectedCategory ? selectedCategory.id : 'general';
            const tipsArray = AI_SERVICE_TIPS[catId] || AI_SERVICE_TIPS['general'];
            const randomTip = tipsArray[Math.floor(Math.random() * tipsArray.length)];
            setAiMessage(randomTip[language] || randomTip['en']);
            setIsAiLoading(false);
        }, 1200);
    };

    const handleScan = () => {
        const tg = window.Telegram?.WebApp;
        const canScanInTelegram = Boolean(
            tg?.initData &&
            typeof tg.showScanQrPopup === 'function'
        );

        if (canScanInTelegram) {
            try {
                tg.showScanQrPopup(
                    { text: language === 'ru' ? 'Сканируйте QR или штрих-код' : 'Scan QR or barcode' },
                    (text) => {
                        if (text) {
                            setScannedCode(text);
                            setAccount(text);
                        }
                        return true;
                    }
                );
            } catch (err) {
                console.warn('showScanQrPopup failed:', err);
                const manual = window.prompt(
                    language === 'ru' ? 'Введите номер лицевого счёта' : 'Enter account number'
                );
                if (manual?.trim()) {
                    setScannedCode(manual.trim());
                    setAccount(manual.trim());
                }
            }
            return;
        }

        const manual = window.prompt(
            language === 'ru'
                ? 'Сканер доступен в Telegram. Введите номер вручную:'
                : 'Scanner works in Telegram only. Enter number manually:'
        );
        if (manual?.trim()) {
            setScannedCode(manual.trim());
            setAccount(manual.trim());
        }
    };

    // --- ЛОГИКА ВАЛЮТ И РАСЧЕТОВ (Перенесли выше, чтобы использовать в истории) ---
    // --- ЛОГИКА ВАЛЮТ И РАСЧЕТОВ ---
    const rateUSDT = 1150; 
    const rateRUB = 17.7;  
    
    const amountLen = amount.length;
    const amountNum = Number(amount);
    let detectedCurrency = null;
    let finalToPay = 0;

    // Создаем группу, где ввод ВСЕГДА в ARS, а оплата в USDT (Телефон, Свет, Газ, Вода)
    const isArsInput = ['mobile', 'electricity', 'gas', 'water', 'internet', 'transport', 'education', 'health', 'rent', 'other'].includes(selectedCategory?.id);

    if (isArsInput) {
        finalToPay = amountNum / rateUSDT;
    } else {
        if (amountLen >= 3 && amountLen <= 4) {
            detectedCurrency = 'USDT';
            finalToPay = amountNum * rateUSDT;
        } else if (amountLen >= 5 && amountLen <= 6) {
            detectedCurrency = 'RUB';
            finalToPay = selectedCategory?.id === 'card' ? amountNum * rateRUB : amountNum / rateRUB;
        }
    }

    const submitServiceToServer = (orderId, serviceDetails, receiptFile = null) => {
        postOrderToServer({
            orderId,
            orderKind: 'service',
            language,
            receiptFile: receiptFile || undefined,
            telegramUser: telegramUser
                ? {
                      id: telegramUser.id,
                      first_name: telegramUser.first_name,
                      last_name: telegramUser.last_name,
                      username: telegramUser.username,
                  }
                : null,
            serviceDetails,
            historyItem: {
                id: orderId,
                type: 'service',
                status: 'pending',
                timestamp: new Date().toISOString(),
                details: serviceDetails,
            },
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    console.error('POST /api/orders (service):', res.status, data);
                    return;
                }
                if (data.wallet) setWalletFromServer(data.wallet);
            })
            .catch((e) => console.error('Ошибка POST /api/orders (service):', e));
    };

    const openReceiptPicker = (e) => {
        e.preventDefault();
        receiptInputRef.current?.click();
    };

    // --- СОЗДАНИЕ ЗАКАЗА ---
    const handleConfirm = async () => {
        const orderId = `SRV-${Date.now().toString().slice(-6)}`;
        let receiptFile = null;
        if (file) {
            try {
                receiptFile = await readFileAsReceiptPayload(file);
            } catch (err) {
                console.error('Receipt read failed:', err);
            }
        }

        if (selectedCategory?.id === 'mercadolibre') {
            const fee = mlDelivery === 'pickup' ? 5 : 10;
            const deliveryText = mlDelivery === 'pickup' ? 'Самовывоз из офиса' : `Доставка на дом: ${mlAddress}`;
            const serviceDetails = {
                categoryId: 'mercadolibre',
                category: 'Mercado Libre',
                provider: 'Выкуп товаров',
                account: 'Mercado Libre',
                amount: `${fee} USDT (Услуга) + Оплата товаров`,
                code: '',
                comment: `${deliveryText} | Ссылок: ${mlLinks.filter((l) => l.trim()).length}`,
                hasFile: false,
            };
            addServiceOrder(serviceDetails, orderId);
            submitServiceToServer(orderId, serviceDetails);
            setStep(3);
            return;
        }
        const finalProvider = provider === 'Other' ? customProvider : (provider || selectedCategory.providers[0]);
        const finalAccount = selectedCategory.id === 'mobile' ? `+54 9 ${account}` : account;

        let displayAmount = '';
        if (isArsInput) {
            displayAmount = `${finalToPay.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USDT → ${amountNum.toLocaleString('ru-RU')} ARS`;
        } else if (selectedCategory.id === 'card') {
            displayAmount = `${amountNum.toLocaleString('ru-RU')} ${detectedCurrency || 'USDT'} → ${Math.floor(finalToPay).toLocaleString('ru-RU')} ARS`;
        } else {
            if (detectedCurrency === 'RUB') {
                displayAmount = `${amountNum.toLocaleString('ru-RU')} RUB → ${finalToPay.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USDT`;
            } else {
                displayAmount = `${amountNum.toLocaleString('ru-RU')} USDT → ${Math.floor(finalToPay).toLocaleString('ru-RU')} ARS`;
            }
        }

        const serviceDetails = {
            categoryId: selectedCategory.id,
            category: t(selectedCategory.translationKey),
            provider: finalProvider,
            account: finalAccount,
            amount: displayAmount,
            code: scannedCode,
            comment: comment,
            hasFile: !!file,
        };
        addServiceOrder(serviceDetails, orderId);
        submitServiceToServer(orderId, serviceDetails, receiptFile);
        setStep(3);
    };

    // ВАЛИДАЦИЯ ОШИБОК
    const minAmountRequired = selectedCategory?.id === 'transport' ? 10000 : 100;
    const isMinError = selectedCategory?.id !== 'mobile' && amount.length > 0 && amountNum < minAmountRequired;
    const isStepError = !isArsInput && detectedCurrency === 'RUB' && amountNum % 1000 !== 0;
    const hasAnyAmountError = isMinError || isStepError;

    const handleAmountBlur = () => {
        // Автоисправление для SUBE: если ввели меньше 10 000, ставим 10 000
        if (selectedCategory?.id === 'transport' && amount.length > 0 && amountNum < 10000) {
            setAmount('10000');
        } 
        // Автоисправление для Рублей (кратность 1000)
        else if (!isArsInput && detectedCurrency === 'RUB' && isStepError && !isMinError) {
            const rounded = Math.round(amountNum / 1000) * 1000;
            setAmount(rounded.toString());
        }
    };

    const isMobileIncomplete = selectedCategory?.id === 'mobile' && account.length > 0 && account.length < 10;
    const isCardAccountError = selectedCategory?.id === 'card' && account.length > 0 && /^\d+$/.test(account) && account.length !== 22;

   const isFormValid = account && amount && amountNum > 0 && !hasAnyAmountError &&
                        (selectedCategory?.id !== 'mobile' || account.length === 10) && 
                        !isCardAccountError && 
                        (provider !== 'Other' || customProvider.trim().length > 0);

    // Новая проверка валидности для Mercado Libre
    const isMlValid = mlLinks.some(l => l.trim().length > 10) && (mlDelivery === 'pickup' || mlAddress.trim() !== '');
    const currentIsValid = selectedCategory?.id === 'mercadolibre' ? isMlValid : isFormValid;

    const toPayLabels = { ru: "К оплате:", en: "To Pay:", es: "Total a pagar:", pt: "Total a pagar:", zh: "待支付:" };
    const toReceiveLabels = { ru: "К получению:", en: "To receive:", es: "A recibir:", pt: "A receber:", zh: "到账金额:" };

    const AiInsightBox = () => {
        if (!aiMessage && !isAiLoading) return null;
        return (
            <div className={`mb-4 rounded-[2rem] p-5 flex gap-3 items-start animate-in slide-in-from-top-2 border-0 ${isDark ? 'bg-[#D0FD00]' : 'bg-black shadow-sm'}`}>
                <div className={`mt-0.5 shrink-0 ${isDark ? 'text-black' : 'text-white'}`}><Sparkles size={16} /></div>
                <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-black' : 'text-white'}`}>{isAiLoading ? t('insight_loading') : aiMessage}</p>
            </div>
        );
    };

    const AiButton = () => (
        <button type="button" onClick={handleTriggerAi} className={`ai-sparkle-btn ${isDark ? 'ai-sparkle-btn--dark' : 'ai-sparkle-btn--light'} p-3 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-sm ${isAiLoading ? 'opacity-70' : ''}`}>
            {isAiLoading ? <Loader2 size={18} className="animate-spin" color={isDark ? '#000000' : '#FFFFFF'} /> : <Sparkles size={18} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={2} />}
        </button>
    );

    if (step === 1) return (
        <div className={`${srvScrollWrap} px-6 pt-0 pb-32 animate-in fade-in space-y-6`} onFocusCapture={handleFormFocusCapture}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black">{t('srv_title')}</h2>
                <AiButton />
            </div>
            <AiInsightBox />
            {/* БЛОК MERCADO LIBRE (НАД СЕТКОЙ) */}
            <div className={`p-5 rounded-[2rem] flex items-center gap-4 mb-4 ${isDark ? 'bg-[#1C1C1E] border-0' : 'bg-white border border-transparent shadow-sm'}`}>
                 <div className="w-12 h-12 rounded-2xl bg-[#FFE600] flex items-center justify-center p-2 shadow-sm">
                     <img src="/imagemercado.svg" alt="ML" className="w-full h-full object-contain" />
                 </div>
                 <div>
                     <div className={`font-black text-lg leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>Mercado Libre</div>
                     <div className={`text-xs font-bold opacity-60 mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{language === 'ru' ? 'Выкуп и доставка' : 'Buy & Deliver'}</div>
                 </div>
                 <button onClick={() => { setSelectedCategory({ id: 'mercadolibre', translationKey: 'Mercado Libre', name: 'Mercado Libre', icon: <Package size={24}/> }); setStep(2); setMlLinks(['']); }} className="ml-auto px-6 py-2.5 bg-[#FFE600] text-blue-900 rounded-full text-sm font-black transition-transform active:scale-95 shadow-md">
                     {language === 'ru' ? 'Начать' : 'Start'}
                 </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {SERVICE_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                            setSelectedCategory(cat);
                            setStep(2);
                            setProvider(cat.providers[0]);
                            setAiMessage(null);
                        }}
                        className={`p-4 rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-transform active:scale-95 text-center min-h-[120px] border-0 touch-manipulation ${srvCard}`}
                    >
                        <div className={`p-3 rounded-full pointer-events-none ${srvIcon}`}>{cat.icon}</div>
                        <span className={`text-sm font-bold leading-tight pointer-events-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{t(cat.translationKey)}</span>
                    </button>
                ))}
            </div>
            
        </div>
    );

    if (step === 2) return (
        <div className={`${srvScrollWrap} px-6 pt-0 pb-40 animate-in slide-in-from-right space-y-6`} onFocusCapture={handleFormFocusCapture}>
            <button onClick={reset} className="flex items-center gap-2 text-sm font-bold opacity-50 mb-2"><ArrowLeft size={16}/> {t('back')}</button>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${srvIcon}`}>{selectedCategory.icon}</div>
                    <h2 className="text-2xl font-black">{t(selectedCategory.translationKey)}</h2>
                </div>
                <AiButton />
            </div>
            
            <AiInsightBox />

            {/* --- НАЧАЛО РАЗВИЛКИ: MERCADO LIBRE ИЛИ ОБЫЧНЫЕ УСЛУГИ --- */}
            {selectedCategory.id === 'mercadolibre' ? (
                <div className="space-y-6 mt-4 animate-in fade-in pb-4">
                    
                    {/* Доставка (С контрастной подложкой) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase opacity-50 ml-1">{language === 'ru' ? 'Вид доставки' : 'Delivery Method'}</label>
                        <div className={`grid grid-cols-2 p-1 rounded-xl ${isDark ? 'bg-black/40' : 'bg-black/5'}`}>
                            {DELIVERY_METHODS.map(m => (
                                <div 
                                    key={m.id} 
                                    onClick={() => setMlDelivery(m.id)} 
                                    className={`flex items-center justify-center gap-2 py-3 rounded-lg cursor-pointer transition-all font-bold text-sm ${mlDelivery === m.id ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-black') : 'text-slate-500'}`}
                                >
                                    {m.icon} {t(m.translationKey)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Адрес и КАРТА OPENSTREETMAP (только если Домой) */}
{mlDelivery === 'delivery' && (
    <div className={`relative ${mlShowSuggestions ? 'z-[50]' : 'z-20'} animate-in slide-in-from-top-2 flex flex-col gap-2`}>
        <div className="relative">
            
            {/* 1. Кнопка "Где я?" сверху справа */}
            <div className="flex justify-end mb-2 px-1">
                <button 
                    onClick={(e) => { e.preventDefault(); handleMlGeolocation(); }} 
                    disabled={mlIsLocating} 
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-900'}`}
                >
                    {mlIsLocating ? <Loader2 size={14} className="animate-spin" strokeWidth={2.5}/> : <Locate size={14} strokeWidth={2.5}/>} 
                    <span>{mlIsLocating ? '...' : t('del_gps')}</span>
                </button>
            </div>

            {/* 2. Поле ввода (скругленное - rounded-2xl и без внутренних кнопок) */}
            <input 
                type="text" 
                value={mlAddress} 
                onChange={(e) => { 
                    setMlAddress(e.target.value); 
                    if(e.target.value === '') setMlCoords(null); 
                }} 
                placeholder={t('del_addr_ph')} 
                className={`w-full p-4 rounded-2xl font-bold outline-none border transition-all ${isDark ? 'bg-[#1C1C1E] border-white/10 focus:border-yellow-400/50 text-white' : 'bg-white shadow-sm border-gray-200 focus:border-yellow-400/50 text-slate-900'}`}
            />

            {/* 3. Выпадающий список (тоже скруглили углы до rounded-2xl) */}
            {mlShowSuggestions && (
                <div className={`absolute top-full left-0 w-full mt-2 z-[50] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#2C2C2E] border-white/10 text-white' : 'bg-white border-gray-100 text-slate-900'}`}>
                    {mlSuggestions.map((s, i) => (
                        <div 
                            key={i} 
                            onClick={() => { 
                                setMlAddress(s.formatted); 
                                // ЖЕСТКО ПЕРЕВОДИМ В ЧИСЛА, ЧТОБЫ КАРТА НЕ ЛОМАЛАСЬ
                                setMlCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) }); 
                                setMlShowSuggestions(false); 
                            }} 
                            className={`p-4 text-xs font-medium cursor-pointer border-b last:border-0 transition-colors ${isDark ? 'border-white/5 hover:bg-white/10 text-gray-300' : 'border-gray-50 hover:bg-gray-50 text-gray-700'}`}
                        >
                            {s.formatted}
                        </div>
                    ))}
                </div>
            )}
        </div>
                            
                            {/* БЕСПЛАТНАЯ МИНИ-КАРТА OPENSTREETMAP */}
                            {mlCoords && !mlShowSuggestions && (
                                <div className={`w-full h-32 rounded-xl overflow-hidden border shadow-sm animate-in zoom-in-95 duration-300 pointer-events-none ${isDark ? 'border-white/10 opacity-80' : 'border-gray-200'}`}>
                                    <iframe
                                        title="osm-map"
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight="0"
                                        marginWidth="0"
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${mlCoords.lon-0.005},${mlCoords.lat-0.005},${mlCoords.lon+0.005},${mlCoords.lat+0.005}&layer=mapnik&marker=${mlCoords.lat},${mlCoords.lon}`}
                                        style={{ filter: isDark ? 'invert(90%) hue-rotate(180deg) contrast(85%)' : 'none' }}
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ссылки (до 10 штук) */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase opacity-50 ml-1">{language === 'ru' ? `Ссылки на товары (${mlLinks.length}/10)` : `Product Links (${mlLinks.length}/10)`}</label>
                        {mlLinks.map((link, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input type="url" value={link} onChange={(e) => { const newLinks = [...mlLinks]; newLinks[idx] = e.target.value; setMlLinks(newLinks); }} placeholder="https://articulo.mercadolibre..." className={`flex-1 p-3 rounded-xl font-medium outline-none border text-sm transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 text-white focus:border-yellow-400/50' : 'bg-white border-gray-200 text-slate-900 shadow-sm focus:border-yellow-400/50'}`} />
                                {mlLinks.length > 1 && (
                                    <button onClick={() => setMlLinks(mlLinks.filter((_, i) => i !== idx))} className={`w-12 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}><Trash2 size={18} /></button>
                                )}
                            </div>
                        ))}
                        {mlLinks.length < 10 && (
                            <button onClick={() => setMlLinks([...mlLinks, ''])} className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors flex items-center justify-center gap-2 ${isDark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><Plus size={16} /> {language === 'ru' ? 'Добавить ссылку' : 'Add link'}</button>
                        )}
                    </div>

                    {/* Итоговая стоимость услуги */}
                    <div className={`mt-4 flex items-center justify-between px-4 py-4 rounded-[2rem] border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-yellow-400/20' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className={isDark ? "text-yellow-400" : "text-yellow-600"} />
                            <span className={`text-xs font-bold uppercase tracking-tighter ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                                {language === 'ru' ? 'Стоимость услуги:' : 'Service Fee:'}
                            </span>
                        </div>
                        <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{mlDelivery === 'pickup' ? '5 USDT' : '10 USDT'}</span>
                    </div>
                </div>
            ) : (
                /* ---------------- 2. СТАНДАРТНЫЙ ЭКРАН УСЛУГ (ВСЁ ЧТО МЫ ПРАВИЛИ РАНЬШЕ) ---------------- */
                <div className="space-y-6 animate-in fade-in">
                    {/* Провайдер */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase opacity-50 ml-1">
                            {(() => {
                                const id = selectedCategory.id;
                                if (id === 'transport') return language === 'ru' ? 'Карта' : 'Card';
                                if (id === 'mobile') return language === 'ru' ? 'Оператор' : 'Operator'; // <-- Добавили телефон!
                                if (['electricity', 'gas', 'water'].includes(id)) return language === 'ru' ? 'Поставщик' : 'Supplier';
                                if (['other', 'rent'].includes(id)) return language === 'ru' ? 'Услуга' : 'Service';
                                if (id === 'internet') return language === 'ru' ? 'Провайдер' : 'Provider';
                                if (id === 'education') return language === 'ru' ? 'Учебное учреждение' : 'Educational Institution';
                                if (id === 'health') return language === 'ru' ? 'Медицинское учреждение' : 'Medical Institution';
                                return t('srv_provider'); // Для остальных останется стандартное (например, "Банк")
                            })()}
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {selectedCategory.providers.map(p => (
                                <button key={p} onClick={() => { setProvider(p); setCustomProvider(''); }} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${provider === p ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : (isDark ? 'bg-white/10 text-white' : 'bg-white border border-gray-200 text-gray-500')}`}>
                                    {p === 'Other' ? (language === 'ru' ? 'Другое' : 'Other') : p}
                                </button>
                            ))}
                        </div>
                        {provider === 'Other' && (
                            <div className="mt-3 animate-in fade-in zoom-in-95">
                                <input type="text" value={customProvider} onChange={(e) => setCustomProvider(e.target.value)} placeholder={language === 'ru' ? 'Укажите оператора' : 'Enter provider'} className={`w-full p-4 rounded-xl font-bold outline-none border transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 focus:border-emerald-500/50 text-white' : 'bg-white border-gray-200 focus:border-emerald-500/50 text-slate-900'}`} />
                            </div>
                        )}
                    </div>

                    {/* Реквизиты (Телефон / CBU / SUBE) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase opacity-50 ml-1">
                            {selectedCategory.id === 'mobile' 
                                ? (language === 'ru' ? 'Номер телефона' : 'Phone Number') 
                                : selectedCategory.id === 'transport'
                                    ? (language === 'ru' ? 'Номер транспортной карты' : 'Transport Card Number')
                                    : (selectedCategory.id === 'card' || selectedCategory.isTransfer ? t('srv_label_transfer') : t('srv_label_bill'))}
                        </label>
                        
                        {selectedCategory.id === 'mobile' ? (
                            <div className="flex flex-col gap-1">
                                <div className={`flex items-center w-full rounded-xl border transition-colors ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'} ${isMobileIncomplete ? 'border-red-500 focus-within:border-red-500' : (isDark ? 'border-white/10 focus-within:border-emerald-500/50' : 'border-gray-200 focus-within:border-emerald-500/50')}`}>
                                    <div className={`pl-4 pr-2 py-4 font-black text-lg select-none flex items-center opacity-50 ${isDark ? 'text-white' : 'text-slate-900'}`}>🇦🇷 +54 9</div>
                                    <input type="tel" value={account} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 10) setAccount(val); }} placeholder="11 2345 6789" className={`flex-1 bg-transparent py-4 pr-4 font-black outline-none text-xl w-full ${isMobileIncomplete ? 'text-red-500' : (isDark ? 'text-white placeholder-gray-600' : 'text-slate-900 placeholder-gray-300')}`} />
                                </div>
                                {isMobileIncomplete && <div className="text-red-500 text-[11px] font-bold ml-2 animate-in fade-in">{language === 'ru' ? '* Укажите номер полностью (10 цифр)' : '* Enter the full number (10 digits)'}</div>}
                            </div>
                        ) : selectedCategory.isTransfer ? (
                            <div className="flex flex-col gap-2">
                                <textarea rows="2" value={account} onChange={(e) => setAccount(e.target.value)} placeholder={t('srv_ph_transfer')} className={`w-full p-4 rounded-xl font-bold outline-none border text-sm focus:border-emerald-500/50 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 text-white' : 'bg-white border-gray-200 text-slate-900 shadow-sm'}`} />
                                {account.length > 2 && (
                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-[2rem] animate-in slide-in-from-top-1 ${isDark ? 'bg-[#1C1C1E] border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>                                        <CheckCircle size={14} /><span className="text-[11px] font-black uppercase tracking-wider">{/^\d+$/.test(account) ? "CBU / CVU" : "Alias"}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input 
                                        type={selectedCategory.id === 'card' ? 'text' : 'tel'}
                                        inputMode={selectedCategory.id === 'card' ? 'text' : 'numeric'}
                                        autoComplete="off"
                                        value={account} 
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            if (/^\d+$/.test(val) && val.length > 22) return;
                                            setAccount(val);
                                        }} 
                                        placeholder={
                                            selectedCategory.id === 'card' 
                                                ? t('srv_ph_transfer') 
                                                : selectedCategory.id === 'transport'
                                                    ? (language === 'ru' ? 'Введите номер SUBE' : 'Enter SUBE number')
                                                    : t('srv_ph_phone')
                                        } 
                                        className={`flex-1 p-4 rounded-xl font-bold outline-none border transition-colors ${
                                            isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'
                                        } ${
                                            isCardAccountError
                                                ? 'border-red-500 focus:border-red-500 text-red-500'
                                                : `focus:border-emerald-500/50 ${isDark ? 'border-white/10 text-white' : 'border-gray-200 text-slate-900'}`
                                        }`} 
                                    />
                                    {!['card'].includes(selectedCategory.id) && (
                                        <button onClick={handleScan} className={`w-14 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/15 border-0' : 'bg-black text-white shadow-sm'}`}>
                                            {selectedCategory.id === 'transport' ? (
                                                <div className="flex flex-col items-center justify-center pt-0.5">
                                                    <CreditCard size={18} />
                                                    <span className="text-[8px] font-black uppercase mt-0.5 tracking-widest opacity-80">Scan</span>
                                                </div>
                                            ) : (
                                                <QrCode size={24} />
                                            )}
                                        </button>
                                    )}
                                </div>
                                
                                {selectedCategory.id === 'card' && account.length > 2 && (
                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-[2rem] animate-in slide-in-from-top-1 ${
                                        isCardAccountError 
                                            ? (isDark ? 'bg-[#1C1C1E] border border-red-500/30 text-red-500' : 'bg-red-50 border-red-200 text-red-500') 
                                            : (isDark ? 'bg-[#1C1C1E] border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                    }`}>
                                        {isCardAccountError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                                        <span className="text-[11px] font-black uppercase tracking-wider">
                                            {/^\d+$/.test(account) 
                                                ? (isCardAccountError ? (language === 'ru' ? "CBU/CVU: нужно 22 цифры" : "CBU/CVU: 22 digits required") : "CBU / CVU") 
                                                : "Alias"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Поле комментария с Booking/Airbnb логикой */}
                    {selectedCategory.isTransfer && (
                        selectedCategory.id === 'rent' && ['Booking.com', 'Airbnb'].includes(provider) ? (
                            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                <label className="text-xs font-bold uppercase opacity-50 ml-1">
                                    {language === 'ru' ? 'Ссылка на бронирование' : 'Booking Link'}
                                </label>
                                <input type="url" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="https://" className={`w-full p-4 rounded-xl font-medium outline-none border text-sm focus:border-emerald-500/50 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 text-white' : 'bg-white border-gray-200 text-slate-900 shadow-sm'}`} />
                            </div>
                        ) : (
                            <div className="space-y-2 animate-in fade-in">
                                <label className="text-xs font-bold uppercase opacity-50 ml-1">{t('srv_label_comment')}</label>
                                <input 
                                    type="text" 
                                    value={comment} 
                                    onChange={(e) => setComment(e.target.value)} 
                                    placeholder={
                                        selectedCategory.id === 'health' ? (language === 'ru' ? 'Например: Оплата страховки' : 'Ex: Insurance payment') : 
                                        selectedCategory.id === 'rent' ? (language === 'ru' ? 'Например: Оплата Expensas за май' : 'Ex: Expensas payment for May') : 
                                        selectedCategory.id === 'other' ? (language === 'ru' ? 'Например: Оплата билетов на концерт' : 'Ex: Concert tickets payment') : 
                                        t('srv_ph_comment')
                                    } 
                                    className={`w-full p-4 rounded-xl font-medium outline-none border text-sm focus:border-emerald-500/50 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 text-white' : 'bg-white border-gray-200 text-slate-900 shadow-sm'}`} 
                                />
                            </div>
                        )
                    )}

                    {/* Файл */}
                    {!['mobile', 'card', 'transport', 'rent', 'other'].includes(selectedCategory.id) && (
                        <div className="space-y-2 animate-in fade-in">
                            {!file ? (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onPointerDown={openReceiptPicker}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openReceiptPicker(e); }}
                                    className={`w-full p-4 rounded-2xl border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors touch-manipulation ${isDark ? 'border-white/15 hover:bg-[#1C1C1E]' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <input
                                        ref={receiptInputRef}
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const picked = e.target.files?.[0];
                                            if (picked) setFile(picked);
                                            e.target.value = '';
                                        }}
                                    />
                                    <Upload size={18} className="opacity-50"/>
                                    <span className="text-sm font-bold opacity-60">{t('srv_label_file')}</span>
                                </div>
                            ) : (
                                <div className={`relative p-3 rounded-[2rem] border flex items-center gap-3 shadow-sm animate-in zoom-in-95 ${isDark ? 'bg-[#1C1C1E] border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                                    {file.type.startsWith('image/') ? (
                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-black/10" />
                                    ) : (
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                            <FileText size={24} className="text-emerald-500" />
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{file.name}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            {language === 'ru' ? 'Загружено' : 'Uploaded'} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-red-50 text-red-500 shadow-sm'}`}><X size={16} /></button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Блок суммы со ВСЕМИ ПЛАШКАМИ РАСПОЗНАВАНИЯ */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase opacity-50 ml-1">
                            {selectedCategory.id === 'card' 
                                ? (language === 'ru' ? 'Сумма (RUB/USDT)' : 'Amount (RUB/USDT)') 
                                : (isArsInput ? (language === 'ru' ? 'Сумма (ARS)' : 'Amount (ARS)') : t('srv_label_amount'))}
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="done"
                            autoComplete="off"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                            onBlur={handleAmountBlur}
                            placeholder="0.00" 
                            className={`w-full p-4 rounded-xl font-black text-3xl outline-none border transition-colors ${
                                isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'
                            } ${
                                hasAnyAmountError 
                                    ? 'border-red-500 text-red-500 focus:border-red-500' 
                                    : `focus:border-emerald-500/50 ${isDark ? 'border-white/10 text-white' : 'border-gray-200 text-slate-900'}`
                            }`} 
                        />
                        
                        {isArsInput ? (
                            /* 1. Группа ARS (Телефон, Свет, Газ, Вода, Транспорт, Интернет, Образование, Медицина) */
                            amount.length > 0 && amountNum > 0 && (
                                <div className="space-y-2 animate-in fade-in duration-300 mt-2">
                                    {isMinError && selectedCategory.id !== 'mobile' && (
                                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-[2rem] border ${isDark ? 'bg-[#1C1C1E] border-red-500/30 text-red-500' : 'bg-red-50 border-red-200 text-red-500'}`}>
                                            <AlertCircle size={14} />
                                            <span className="text-[11px] font-black uppercase tracking-wider">
                                                {language === 'ru' 
                                                    ? `Минимум ${selectedCategory.id === 'transport' ? '10 000' : '100'} ARS` 
                                                    : `Minimum ${selectedCategory.id === 'transport' ? '10,000' : '100'} ARS`}
                                            </span>
                                        </div>
                                    )}
                                    {!isMinError && (
                                        <div className={`flex items-center justify-between px-3 py-3 rounded-[2rem] border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="opacity-50" />
                                                <span className="text-[11px] font-bold opacity-50 uppercase tracking-tighter">
                                                    {toPayLabels[language] || toPayLabels['en']}
                                                </span>
                                            </div>
                                            <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {finalToPay.toLocaleString('ru-RU', {maximumFractionDigits: 2})} USDT
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            /* 2. ОСТАЛЬНЫЕ (Карта, Аренда, и т.д. - Распознавание валют) */
                            (isMinError || detectedCurrency) && (
                                <div className="space-y-2 animate-in fade-in duration-300 mt-2">
                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-[2rem] border ${hasAnyAmountError ? (isDark ? 'bg-[#1C1C1E] border-red-500/30 text-red-500' : 'bg-red-50 border-red-200 text-red-500') : (isDark ? 'bg-[#1C1C1E] border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600')}`}>
                                        {hasAnyAmountError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                                        <span className="text-[11px] font-black uppercase tracking-wider">
                                            {isMinError 
                                                ? (language === 'ru' ? "Минимум 100" : "Minimum 100") 
                                                : isStepError 
                                                    ? (language === 'ru' ? "Кратность 1000 RUB" : "Multiple of 1000 RUB") 
                                                    : (language === 'ru' ? `${detectedCurrency}` : `${detectedCurrency}`)
                                            }
                                        </span>
                                    </div>
                                    
                                    {!hasAnyAmountError && detectedCurrency && (
                                        <div className={`flex items-center justify-between px-3 py-3 rounded-[2rem] border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="opacity-50" />
                                                <span className="text-[11px] font-bold opacity-50 uppercase tracking-tighter">
                                                    {selectedCategory.id === 'card' 
                                                        ? (toReceiveLabels[language] || toReceiveLabels['en'])
                                                        : (toPayLabels[language] || toPayLabels['en'])
                                                    }
                                                </span>
                                            </div>
                                            <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {selectedCategory.id === 'card' 
                                                    ? `${Math.floor(finalToPay).toLocaleString('ru-RU')} ARS` 
                                                    : (detectedCurrency === 'USDT'
                                                        ? `${Math.floor(finalToPay).toLocaleString('ru-RU')} ARS`
                                                        : `${finalToPay.toLocaleString('ru-RU', {maximumFractionDigits: 2})} USDT`)
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
            {/* --- КОНЕЦ РАЗВИЛКИ --- */}

            <button 
                onClick={handleConfirm} 
                disabled={!(selectedCategory?.id === 'mercadolibre' ? isMlValid : isFormValid)} 
                className={`w-full py-4 rounded-full font-black text-lg shadow-lg mt-6 transition-all ${
                    !(selectedCategory?.id === 'mercadolibre' ? isMlValid : isFormValid)
                        ? 'opacity-50 cursor-not-allowed bg-gray-500 text-white' 
                        : isDark ? 'bg-white text-black active:bg-zinc-200' : 'bg-black text-white active:bg-zinc-800'
                }`}
            >
                {t('srv_btn')}
            </button>
        </div>
    );

    if (step === 3) return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in zoom-in-95 pb-24">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-6"><CheckCircle size={48} /></div>
            <h2 className="text-2xl font-black text-center mb-2">{t('success_title')}</h2>
            <p className="text-center opacity-60 mb-8 max-w-xs">{t('success_desc')}</p>
            <button onClick={reset} className={`w-full py-4 rounded-full font-bold ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black text-white'}`}>{t('btn_ok')}</button>
        </div>
    );
};

const OrderHistoryCard = ({ order, isDark, language = 'ru' }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const t = (key) => TRANSLATIONS[language][key] || key;
    if (!order) return null;

    const status = order.status || 'pending';
    const isCancelled = status === 'cancelled';
    const isDelivered = status === 'delivered';
    const isConfirmed = status === 'confirmed' || isDelivered;
    const historyCircle = isDark ? 'bg-[#D0FD00] text-black' : 'bg-black text-white';
    const histCardShell = isDark
        ? 'rounded-[1.5rem] border-0 overflow-hidden transition-all duration-300 bg-[#1C1C1E]'
        : 'rounded-[1.5rem] border border-gray-200 overflow-hidden transition-all duration-300 bg-white shadow-sm';
    const histExpandBody = isDark ? 'p-5 pt-3' : 'p-5 pt-3 border-t border-gray-100';
    const histHeaderBtn = `w-full p-4 text-left border-0 cursor-pointer flex items-center justify-between transition-colors touch-manipulation ${
        isDark ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-gray-50 bg-transparent'
    }`;

    if (order.type === 'service') {
        const d = order.details || {};
        const dateStr =
            order.timestamp instanceof Date
                ? order.timestamp.toLocaleDateString()
                : new Date(order.timestamp || Date.now()).toLocaleDateString();
        const subtitle = [d.category, d.provider].filter(Boolean).join(' • ') || t('type_service');

        const DetailRow = ({ label, value }) =>
            value ? (
                <div className={`py-2.5 ${isDark ? '' : 'border-b last:border-0 border-dashed border-gray-100'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        {label}
                    </div>
                    <div className={`text-sm font-bold break-all ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
                </div>
            ) : null;

        return (
            <div className={histCardShell}>
                <button
                    type="button"
                    onClick={() => setIsExpanded((v) => !v)}
                    aria-expanded={isExpanded}
                    className={histHeaderBtn}
                >
                    <div className="flex items-center gap-4 min-w-0 pointer-events-none">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                isCancelled
                                    ? isDark
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-red-100 text-red-600'
                                    : historyCircle
                            }`}
                        >
                            {isCancelled ? <X size={20} /> : <Receipt size={20} strokeWidth={2.5} />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
                                    {order.id}
                                </span>
                                <span
                                    className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${orderStatusBadgeClass(status, isDark)}`}
                                >
                                    {orderStatusLabel(t, status)}
                                </span>
                                <span
                                    className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${isDark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {t('type_service')}
                                </span>
                            </div>
                            <div className={`text-xs font-bold mt-1 truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                {subtitle}
                                {d.amount ? ` • ${d.amount}` : ''}
                            </div>
                        </div>
                    </div>
                    <div
                        className={`p-2 rounded-full shrink-0 transition-transform duration-300 pointer-events-none ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-300'}`}
                    >
                        <ChevronDown size={20} strokeWidth={2.5} />
                    </div>
                </button>

                <div
                    className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                    <div className="overflow-hidden">
                        <div className={histExpandBody}>
                            <DetailRow label={t('hist_svc_date')} value={dateStr} />
                            <DetailRow label={t('hist_svc_category')} value={d.category} />
                            <DetailRow label={t('hist_svc_provider')} value={d.provider} />
                            <DetailRow label={t('hist_svc_account')} value={d.account} />
                            <DetailRow label={t('hist_svc_amount')} value={d.amount} />
                            <DetailRow label={t('hist_svc_code')} value={d.code} />
                            <DetailRow label={t('hist_svc_comment')} value={d.comment} />
                            {d.hasFile ? (
                                <div className={`flex items-center gap-2 pt-2 text-xs font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                    <FileText size={14} />
                                    {t('hist_svc_file')}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isPickup = order.delivery?.method === 'pickup';
    const isTransfer = order.delivery?.method === 'transfer';

    const steps = buildOrderHistorySteps(language);
    const currentStep = isCancelled ? -1 : orderHistoryStepIndex(status);
    const isCompleted = !isCancelled && status === 'delivered';

    const mainItem = order.items && order.items[0] ? order.items[0] : null;

    const headerStatusText = orderStatusLabel(t, status);
    
    // Меняем текст на плашке (На карту, Офис или Курьер)
    const deliveryMethod = isTransfer
        ? (language === 'ru' ? 'Карта' : 'Card')
        : isPickup 
            ? (language === 'ru' ? 'Офис' : 'Office') 
            : (language === 'ru' ? 'Курьер' : 'Courier');

    return (
        <div className={histCardShell}>
            <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                className={histHeaderBtn}
            >
                <div className="flex items-center gap-4 pointer-events-none">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isCancelled
                          ? isDark
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-red-100 text-red-600'
                          : isDark
                            ? historyCircle
                            : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-black text-white'
                    }`}>
                        {isCancelled ? <X size={20} /> : isCompleted ? <CheckCircle2 size={20} /> : isConfirmed ? <ShieldCheck size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>{order.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${orderStatusBadgeClass(status, isDark)}`}>
                                {headerStatusText}
                            </span>
                        </div>
                        <div className={`text-xs font-bold mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {mainItem ? `${mainItem.giveAmount} ${mainItem.give} → ${mainItem.getAmount} ${mainItem.get}` : 'Детали обмена'} • {deliveryMethod}
                        </div>
                    </div>
                </div>
                <div className={`p-2 rounded-full transition-transform duration-300 pointer-events-none ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-300'}`}>
                    <ChevronDown size={20} strokeWidth={2.5} />
                </div>
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className={histExpandBody}>
                        {isCancelled ? (
                            <div className={`flex items-start gap-4 py-2 rounded-2xl px-3 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                                <div className={`p-3 rounded-full shrink-0 ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                                    <X size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-black ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                        {orderStatusLabel(t, status)}
                                    </span>
                                    <span className={`text-xs font-medium mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                        {language === 'ru'
                                            ? 'Заявка отменена оператором'
                                            : 'Order was cancelled by the operator'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative pl-3 mt-2 space-y-6">
                                <div className={`absolute top-2 bottom-2 left-[19px] w-[2px] rounded-full ${isDark ? 'bg-[#D0FD00]/30' : 'bg-gray-100'}`} />
                                {steps.map((step, index) => {
                                    const isPast = index < currentStep;
                                    const isActive = index === currentStep;
                                    const isFuture = index > currentStep;
                                    return (
                                        <div key={step.id} className="relative flex items-start gap-5 z-10">
                                            <div
                                                className={`w-4 h-4 mt-0.5 rounded-full flex shrink-0 transition-colors duration-300 ${
                                                    isActive
                                                        ? isDark
                                                            ? 'bg-[#1C1C1E] border-[4px] border-[#D0FD00] shadow-[0_0_0_3px_rgba(208,253,0,0.35)] animate-pulse'
                                                            : 'bg-white border-[4px] border-black shadow-[0_0_0_3px_rgba(0,0,0,0.1)] animate-pulse'
                                                        : isPast
                                                          ? isDark
                                                              ? 'bg-[#D0FD00] border-2 border-[#D0FD00]'
                                                              : 'bg-black border-2 border-black'
                                                          : isDark
                                                            ? 'bg-[#1C1C1E] border-2 border-[#D0FD00]/35'
                                                            : 'bg-white border-2 border-gray-200'
                                                }`}
                                            />
                                            <div
                                                className={`flex flex-col -mt-0.5 transition-opacity duration-300 ${isFuture ? 'opacity-30' : 'opacity-100'}`}
                                            >
                                                <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-black'}`}>
                                                    {step.title}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!isCancelled && isTransfer ? (
                            <div className="flex items-start gap-4 py-2 mt-4">
                                <div className={`p-3 rounded-full mt-0.5 ${isDark ? historyCircle : 'bg-gray-100 text-black'}`}>
                                    <CreditCard size={20} />
                                </div>
                                <div className="flex flex-col w-full overflow-hidden">
                                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-black'}`}>
                                        {language === 'ru' ? 'Перевод на реквизиты' : 'Transfer to account'}
                                    </span>
                                    <span className={`text-xs font-medium mt-1.5 leading-relaxed break-all ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                        {order.delivery.cardAccount}
                                    </span>
                                </div>
                            </div>
                        ) : null}

                        {!isCancelled && isPickup ? (
                            <div className="flex items-start gap-4 py-2 mt-4">
                                <div className={`p-3 rounded-full mt-0.5 ${isDark ? historyCircle : 'bg-gray-100 text-black'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-black'}`}>
                                        {language === 'ru' ? 'Заберите заказ в офисе' : 'Pick up at the office'}
                                    </span>
                                    <span className={`text-xs font-medium mt-1.5 leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                        {language === 'ru' ? 'Пн–Сб: 10:00 – 21:00' : language === 'es' ? 'Lun–Sáb: 10:00 – 21:00' : 'Mon–Sat: 10:00 – 21:00'}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
const ExchangeApp = () => {
  const { 
      theme, toggleTheme,
      orders, updateOrder, addOrder, removeOrder, validateOrders,
      aiInsight, isInsightLoading, triggerAi,
      activeTab, setActiveTab, servicesStep, setServicesStep,
      orderHistory, confirmCurrentOrder,
      marketData, ratesReady, ratesLoading, bonuses, setBonuses, setWalletFromServer, language,
      friendsInvited,
      setTelegramUser,
      telegramUser,
      exchangeRates,
      exchangeFees,
      pairRates,
      pairDisplay,
      fetchExchangeRates,
  } = useExchangeStore();
  
  const [step, setStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [homeVideoOk, setHomeVideoOk] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState(null);
  const [useBonuses, setUseBonuses] = useState(false);
  
  const [cardAccount, setCardAccount] = useState('');
  const spreadUsdtGiveEditStartRef = useRef({});
  const addressInputRef = useRef(null);
  const navSwipeRef = useRef({ x: 0, y: 0, skip: false });
  const dropdownOpenedAtRef = useRef(0);

  const toggleDropdown = (key) => {
      dropdownOpenedAtRef.current = Date.now();
      setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const servicesDeep = activeTab === 'services' && servicesStep > 1;

  useEffect(() => {
      if (activeTab !== 'services') setServicesStep(1);
  }, [activeTab, setServicesStep]);

  const goToTab = (tab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
  };

  const activeTabIndex = APP_NAV_TABS.indexOf(activeTab);
  const tabPanelPct = 100 / APP_NAV_TABS.length;

  const handleNavTouchStart = (e) => {
      if (showSuccess || !servicesDeep) return;
      if (isNavSwipeInteractiveTarget(e.target)) {
          navSwipeRef.current = { skip: true, x: 0, y: 0 };
          return;
      }
      const touch = e.touches?.[0];
      if (!touch) return;
      navSwipeRef.current = {
          skip: false,
          x: touch.clientX,
          y: touch.clientY,
      };
  };

  const handleNavTouchEnd = (e) => {
      if (showSuccess || !servicesDeep) return;
      if (navSwipeRef.current.skip) {
          navSwipeRef.current = { skip: false, x: 0, y: 0 };
          return;
      }
      const touch = e.changedTouches?.[0];
      if (!touch) return;
      const { x: x0, y: y0 } = navSwipeRef.current;
      const dx = touch.clientX - x0;
      const dy = touch.clientY - y0;
      if (dx > SWIPE_BACK_MIN_PX && Math.abs(dy) <= Math.abs(dx) * 0.85) {
          window.dispatchEvent(new CustomEvent(SERVICES_SWIPE_BACK_EVENT));
      }
  };

  const spreadUsdGetEditStartRef = useRef({});
  const spreadPayUsdtBypassBlurRef = useRef({});
  const amountPointerTargetRef = useRef(null);
  const userOpenInflightRef = useRef(null);

  useEffect(() => {
      const onPointerDown = (e) => {
          amountPointerTargetRef.current = e.target;
      };
      document.addEventListener('pointerdown', onPointerDown, true);
      return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  const isMovingToSiblingAmountInput = (orderId, blurEl) => {
      const pt = amountPointerTargetRef.current;
      if (!pt || !blurEl) return false;
      const card = blurEl.closest('[data-order-card]');
      if (!card || card.getAttribute('data-order-card') !== String(orderId)) return false;
      return Boolean(pt.closest('[data-exchange-amount]') && card.contains(pt));
  };

  const syncWalletAndBase = (tg, user) => {
      if (!user?.id) return;
      const userKey = String(user.id);
      if (userOpenInflightRef.current === userKey) return;
      userOpenInflightRef.current = userKey;

      const localFirst = loadUserSettingsLocal(user.id);
      if (localFirst.cashbackCard) {
          useExchangeStore.setState({
              cashbackCardId: normalizeCashbackCardId(localFirst.cashbackCard),
          });
      }
      if (!localFirst.themeUserSet) {
          useExchangeStore.setState({ theme: 'dark' });
      } else if (localFirst.theme === 'dark' || localFirst.theme === 'light') {
          useExchangeStore.setState({ theme: localFirst.theme });
      }

      const initData = tg?.initData || '';
      const startParam = tg?.initDataUnsafe?.start_param || null;
      fetchWalletFromServer(initData, user.id, language, startParam)
          .then((w) => {
              setWalletFromServer(w);
              if (w.baseRegistered) {
                  console.log('📊 Base: новый пользователь', user.id);
              }
              if (w.referral?.ok) {
                  console.log('👥 Реферал привязан при открытии приложения (бонусы после подтверждения заказа)');
              }
          })
          .catch((e) => {
              console.warn('user/open:', e.message || e);
              const local = loadUserSettingsLocal(user.id);
              setBonuses(loadBonusesLocal(user.id));
              const st = useExchangeStore.getState();
              if (local.cashbackCard) st.setCashbackCardId(local.cashbackCard);
              if (local.theme === 'dark' || local.theme === 'light') st.setTheme(local.theme);
              if (local.language) st.setLanguage(local.language);
          })
          .finally(() => {
              if (userOpenInflightRef.current === userKey) {
                  userOpenInflightRef.current = null;
              }
          });
  };

  // === Telegram WebApp ===
  useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if (!tg) return undefined;

      tg.ready();
      if (typeof tg.expand === 'function') tg.expand();

      const user = tg.initDataUnsafe?.user;
      if (user) {
          setTelegramUser(user);
          syncWalletAndBase(tg, user);
      }

      return undefined;
  }, [setTelegramUser, language, setWalletFromServer, setBonuses]);
  // ===================================

  useEffect(() => {
      let lastRatesFetch = Date.now();
      const MIN_RATES_REFRESH_MS = 60_000;

      const refreshRatesIfStale = () => {
          if (document.visibilityState !== 'visible') return;
          if (Date.now() - lastRatesFetch < MIN_RATES_REFRESH_MS) return;
          lastRatesFetch = Date.now();
          fetchExchangeRates({ silent: true });
      };

      document.addEventListener('visibilitychange', refreshRatesIfStale);
      return () => document.removeEventListener('visibilitychange', refreshRatesIfStale);
  }, [fetchExchangeRates]);

  useEffect(() => {
      const refreshWallet = () => {
          if (document.visibilityState !== 'visible') return;
          const tg = window.Telegram?.WebApp;
          const user = telegramUser || tg?.initDataUnsafe?.user;
          if (!user?.id || !tg) return;
          const initData = tg.initData || '';
          const startParam = tg?.initDataUnsafe?.start_param || null;
          fetchWalletFromServer(initData, user.id, language, startParam)
              .then((w) => setWalletFromServer(w))
              .catch(() => {});
      };
      document.addEventListener('visibilitychange', refreshWallet);
      return () => document.removeEventListener('visibilitychange', refreshWallet);
  }, [telegramUser, language, setWalletFromServer]);

  useEffect(() => {
      if (activeTab !== 'deliveries') return;
      const tg = window.Telegram?.WebApp;
      const user = telegramUser || tg?.initDataUnsafe?.user;
      if (!user?.id || !tg) return;
      const initData = tg.initData || '';
      const startParam = tg?.initDataUnsafe?.start_param || null;

      const refreshHistory = () => {
          if (document.visibilityState !== 'visible') return;
          fetchWalletFromServer(initData, user.id, language, startParam)
              .then((w) => setWalletFromServer(w, { syncTheme: false }))
              .catch(() => {});
      };

      refreshHistory();
      const timer = setInterval(refreshHistory, 12_000);
      return () => clearInterval(timer);
  }, [activeTab, telegramUser, language, setWalletFromServer]);

  useEffect(() => {
      const saveOnHide = () => {
          if (document.visibilityState === 'hidden') {
              flushPersistSettings(useExchangeStore.getState);
          }
      };
      const onPageHide = () => flushPersistSettings(useExchangeStore.getState);
      document.addEventListener('visibilitychange', saveOnHide);
      window.addEventListener('pagehide', onPageHide);
      const tg = window.Telegram?.WebApp;
      tg?.onEvent?.('viewportChanged', onPageHide);
      return () => {
          document.removeEventListener('visibilitychange', saveOnHide);
          window.removeEventListener('pagehide', onPageHide);
          tg?.offEvent?.('viewportChanged', onPageHide);
      };
  }, []);

  const isDark = theme === 'dark';
  const isAddressDropdownOpen = suggestions.length > 0 && showSuggestions;
  const isDateDropdownOpen = openDropdown === 'date' || openDropdown === 'time';
  const t = (key) => TRANSLATIONS[language][key] || key;

  const getValidCashStep = normalizeUsdCashAmount;

  const isOrderUsdtFiatSpread = (order) =>
    isUsdtFiatSpreadPair(order.give, order.get);

  const clearSpreadPayUsdtFields = (orderId) => {
    spreadPayUsdtBypassBlurRef.current[orderId] = Date.now();
    updateOrder(orderId, 'giveAmount', '', { clearSpreadPayUsdt: true });
  };

  const shouldSkipSpreadPayUsdtBlur = (orderId) => {
    const ts = spreadPayUsdtBypassBlurRef.current[orderId];
    if (!ts) return false;
    if (Date.now() - ts > 500) {
      delete spreadPayUsdtBypassBlurRef.current[orderId];
      return false;
    }
    delete spreadPayUsdtBypassBlurRef.current[orderId];
    return true;
  };

  const applySpreadPayUsdtCommit = (order, anchorField, liveOrder) => {
    if (!isSpreadPayUsdtMode(order.give, order.get)) return;
    const o = liveOrder ? { ...order, ...liveOrder } : order;
    const r = commitSpreadPayUsdtPair(
      o,
      anchorField,
      exchangeFees,
      pairDisplay
    );
    if (r.action === 'clear') {
      clearSpreadPayUsdtFields(order.id);
      return;
    }
    if (r.action === 'belowMin') {
      return;
    }
    if (r.action === 'snap') {
      updateOrder(order.id, 'giveAmount', r.giveAmount, {
        spreadSnapUsdtGive: r.spreadSnapUsdtGive,
      });
    }
  };

  const handleSpreadGiveBlur = (order, rawFromInput) => {
    if (shouldSkipSpreadPayUsdtBlur(order.id)) return;

    const rawSpreadBlur = String(rawFromInput ?? '').trim();
    const startRaw = spreadUsdtGiveEditStartRef.current[order.id] ?? '';
    delete spreadUsdtGiveEditStartRef.current[order.id];

    if (!rawSpreadBlur) {
      clearSpreadPayUsdtFields(order.id);
      return;
    }
    const spreadBlurVal = parseFloat(rawSpreadBlur);
    if (!Number.isFinite(spreadBlurVal) || spreadBlurVal <= 0) {
      clearSpreadPayUsdtFields(order.id);
      return;
    }
    if (rawSpreadBlur === startRaw) return;
    if (rawSpreadBlur.length < startRaw.length) return;
    if (spreadBlurVal < 100) return;
    if (isSpreadUsdtGiveDeletingThrough(startRaw, rawSpreadBlur)) return;
    applySpreadPayUsdtCommit(order, 'giveAmount', {
      giveAmount: rawSpreadBlur,
      getAmount: order.getAmount,
    });
  };

  const handleSpreadGetBlur = (order, rawFromInput) => {
    if (shouldSkipSpreadPayUsdtBlur(order.id)) return;

    const rawGetSpread = String(rawFromInput ?? '').trim();
    const startGetRaw = spreadUsdGetEditStartRef.current[order.id] ?? '';
    delete spreadUsdGetEditStartRef.current[order.id];

    if (!rawGetSpread) {
      clearSpreadPayUsdtFields(order.id);
      return;
    }
    const getSpreadVal = parseFloat(rawGetSpread);
    if (!Number.isFinite(getSpreadVal) || getSpreadVal <= 0) {
      clearSpreadPayUsdtFields(order.id);
      return;
    }
    if (rawGetSpread === startGetRaw) return;
    if (rawGetSpread.length < startGetRaw.length) return;
    if (getSpreadVal < 100) return;
    if (isSpreadUsdtGiveDeletingThrough(startGetRaw, rawGetSpread)) return;
    applySpreadPayUsdtCommit(order, 'getAmount', {
      giveAmount: order.giveAmount,
      getAmount: rawGetSpread,
    });
  };

  const isUsdtSmall = orders.some(o => o.give === 'USDT' && parseFloat(o.giveAmount) < 100);
  
  const hasCardTransfer = orders.some(o => o.get === 'ARS_CARD');
  const isOnlyCardTransfer = orders.every(o => o.get === 'ARS_CARD');
  const isCardAccountError = hasCardTransfer && cardAccount.length > 0 && /^\d+$/.test(cardAccount) && cardAccount.length !== 22;
  
  useEffect(() => {
      if (isUsdtSmall && deliveryMethod === 'delivery' && !isOnlyCardTransfer) {
          setDeliveryMethod('pickup');
      }
  }, [isUsdtSmall, deliveryMethod, isOnlyCardTransfer]);

  const isStep1Valid = validateOrders();
  
  const isCardValid = !hasCardTransfer || (cardAccount.trim().length > 2 && !isCardAccountError);
  const isDeliveryValid = isOnlyCardTransfer || deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && !isUsdtSmall && address && selectedDate && selectedTimeSlot);
  const isStep2Valid = isCardValid && isDeliveryValid;

  useEffect(() => { 
      let interval;
      if (activeTab === 'create') {
          triggerAi(); 
          interval = setInterval(() => { triggerAi(); }, 20000);
      }
      return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
      const handlePointerOutside = (e) => {
          if (e.target.closest('[data-currency-option]')) return;
          if (openDropdown && Date.now() - dropdownOpenedAtRef.current < 80) return;
          const insideInteractive = e.target.closest(
              '[data-currency-dropdown], [data-delivery-dropdown], [data-currency-pill], [data-exchange-amount], [data-bonus-toggle]'
          );
          if (openDropdown && !insideInteractive) {
              setOpenDropdown(null);
          }
          if (activeTab === 'create' && !insideInteractive) {
              const ae = document.activeElement;
              if (ae?.matches?.('input[data-exchange-amount]')) {
                  ae.blur();
              }
          }
      };
      document.addEventListener('pointerdown', handlePointerOutside, true);
      return () => document.removeEventListener('pointerdown', handlePointerOutside, true);
  }, [openDropdown, activeTab]);

  useEffect(() => {
      setOpenDropdown(null);
  }, [step, activeTab]);

  const formatAddress = (nominatimData) => {
      if (!nominatimData || nominatimData.error) return '';
      
      if (nominatimData.address) {
          const addr = nominatimData.address;
          const road = addr.road || addr.pedestrian || addr.square || addr.path || addr.street || '';
          const house = addr.house_number ? ` ${addr.house_number}` : '';
          const district = addr.suburb || addr.city_district || addr.neighbourhood || '';
          
          if (road) return `${road}${house}${district ? `, ${district}` : ''}`;
      }
      
      if (nominatimData.display_name) {
          return nominatimData.display_name.split(',').slice(0, 2).join(', ');
      }
      return '';
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=es`);
          const data = await response.json();
          
          const formatted = formatAddress(data);
          if (formatted) {
              // Добавляем пробел в конце, если нет номера дома
              setAddress(formatted + (data.address?.house_number ? '' : ' '));
          } else {
              setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch (e) {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setIsLocating(false);
      },
      () => { setIsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
    );
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (address.length > 3 && !address.includes('GPS') && !suggestions.find(s => s.formatted === address)) {
        try {
          const query = `${address}, City of Buenos Aires`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=ar&limit=5&addressdetails=1`);
          const data = await res.json();
          const formattedData = data.map(item => ({ ...item, formatted: formatAddress(item), lat: item.lat, lon: item.lon }));
          setSuggestions(formattedData); 
          setShowSuggestions(true);
        } catch(e){}
      } else {
          if (suggestions.length === 0) setShowSuggestions(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [address]);

  const availableDates = useMemo(() => {
    const dates = [];
    let current = new Date();
    let count = 0;
    const todayId = localDateId();
    while (count < 3) {
      if (current.getDay() !== 0) {
        let isValidDay = true;
        const dateId = localDateId(current);
        const isToday = dateId === todayId;
        if (isToday) {
            const currentHour = new Date().getHours();
            const hasRegularSlots = TIME_SLOTS.some((slot) => currentHour < slot.start);
            const hasExpress = currentHour < 20;
            if (!hasRegularSlots && !hasExpress) isValidDay = false;
        }
        if (isValidDay) {
            let label = current.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', weekday: 'short' });
            if (isToday) label = t('del_today');
            else {
                const realTomorrow = new Date();
                realTomorrow.setDate(realTomorrow.getDate() + 1);
                if (dateId === localDateId(realTomorrow)) label = t('del_tomorrow');
            }
            dates.push({ id: dateId, label });
            count++;
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [language, t]);

  const totalFreeDeliveryUnits = useMemo(() => {
      return orders.reduce((sum, o) => sum + giveAmountToFreeDeliveryUnits(o.giveAmount, o.give, exchangeRates), 0);
  }, [orders, exchangeRates]);

  const isDeliveryFree = totalFreeDeliveryUnits >= FREE_DELIVERY_THRESHOLD;

  const isExpressDelivery = useMemo(() => {
      if (deliveryMethod !== 'delivery' || !selectedDate) return false;
      return selectedDate.id === localDateId() && selectedTimeSlotId === EXPRESS_SLOT_ID;
  }, [deliveryMethod, selectedDate, selectedTimeSlotId]);

  const deliveryFeeUSD = useMemo(() => {
      if (deliveryMethod !== 'delivery') return 0;
      if (isExpressDelivery) return DELIVERY_FEE_USD_EXPRESS;
      if (isDeliveryFree) return 0;
      return DELIVERY_FEE_USD_STANDARD;
  }, [deliveryMethod, isExpressDelivery, isDeliveryFree]);

  /** Для API/таблицы — всегда в USD, без пересчёта в USDT (5, а не 5.10) */
  const deliveryCostLabel = useMemo(() => {
      if (deliveryFeeUSD === 0) return '0';
      return String(deliveryFeeUSD);
  }, [deliveryFeeUSD]);

  /** USDT→USD/EUR: спред уже в поле USDT — без вычета из песо и без зелёных плашек комиссии */
  const usdtSpreadInCart = useMemo(
    () =>
      orders.some(
        (o) =>
          o.give === 'USDT' && (o.get === 'USD' || o.get === 'EUR') && parseFloat(o.getAmount) > 0
      ),
    [orders]
  );

  const effectiveOrders = useMemo(() => {
        const hasDirectARS = orders.some(o => o.get === 'ARS' || o.get === 'ARS_CARD');
        const firstARSId = hasDirectARS ? orders.find(o => o.get === 'ARS' || o.get === 'ARS_CARD').id : null;
        const hasRUBRemainder = orders.some(o => o.give === 'RUB' && (o.get === 'USD' || o.get === 'EUR'));
        const hasAnyARSSource = hasDirectARS || hasRUBRemainder;
        let crossFeeARS = 0;
        let activeFeePercent = 0;

        let remainingDeliveryFeeUSD = deliveryFeeUSD;

        return orders.map((order, index) => {
            let effGive = parseFloat(order.giveAmount) || 0;
            let effGet = parseFloat(order.getAmount) || 0;
            let isFeeDeductedFromARS = false;
            let isARSDeducted = false;
            let deliveryFeeDeductedARS = 0;
            let deliveryFeeAddedGive = 0;

            if (remainingDeliveryFeeUSD > 0) {
                if (hasAnyARSSource) {
                    if ((order.get === 'ARS' || order.get === 'ARS_CARD') || (order.give === 'RUB' && (order.get === 'USD' || order.get === 'EUR'))) {
                        const feeARS = Math.floor((remainingDeliveryFeeUSD / exchangeRates['USD'].rate) * exchangeRates['ARS'].rate);
                        if (order.get === 'ARS' || order.get === 'ARS_CARD') {
                            effGet = Math.max(0, effGet - feeARS);
                        }
                        deliveryFeeDeductedARS = feeARS;
                        remainingDeliveryFeeUSD = 0;
                    }
                } else {
                    if (index === 0 && effGive > 0) {
                        const feeGive = (remainingDeliveryFeeUSD / exchangeRates['USD'].rate) * exchangeRates[order.give].rate;
                        effGive += feeGive;
                        deliveryFeeAddedGive = feeGive;
                        remainingDeliveryFeeUSD = 0;
                    }
                }
            }

            return { ...order, effGive, effGet, isFeeDeductedFromARS, isARSDeducted, crossFeeARS, activeFeePercent, deliveryFeeDeductedARS, deliveryFeeAddedGive };
        });
    }, [orders, deliveryMethod, deliveryFeeUSD, exchangeRates]);

    const orderBonusState = useMemo(() => {
        const baseDisplay = effectiveOrders.map((order) => ({
            ...order,
            displayGive: order.effGive,
            displayGet: order.effGet,
            remainderDisplay: null,
            bonusNote: null,
        }));

        if (!useBonuses || bonuses <= 0) {
            return { bonusMode: 'none', displayOrders: baseDisplay, bonusAppliedArs: 0 };
        }

        const hasArsReceive = effectiveOrders.some((o) =>
            orderReceivesArs(o, exchangeRates, pairRates, pairDisplay, exchangeFees)
        );
        const bonusMode = hasArsReceive ? 'ars' : 'give';
        let bonusRemaining = bonuses;

        const displayOrders = effectiveOrders.map((order) => {
            let displayGive = order.effGive;
            let displayGet = order.effGet;
            let remainderDisplay = null;
            let bonusNote = null;

            if (bonusMode === 'ars' && bonusRemaining > 0) {
                if (order.get === 'ARS' || order.get === 'ARS_CARD') {
                    displayGet = Math.floor(displayGet) + bonusRemaining;
                    bonusNote = { type: 'ars_add', amount: bonusRemaining };
                    bonusRemaining = 0;
                } else if (order.give === 'RUB' && (order.get === 'USD' || order.get === 'EUR')) {
                    let tailARS = calcRubCashRemainderARS(
                        order,
                        exchangeRates,
                        pairRates,
                        pairDisplay,
                        exchangeFees
                    );
                    if (order.deliveryFeeDeductedARS > 0) {
                        tailARS = Math.max(0, tailARS - order.deliveryFeeDeductedARS);
                    }
                    const issuedCash = parseFloat(order.getAmount) || order.effGet;
                    if (tailARS > 0) {
                        displayGet = issuedCash;
                        if (bonusRemaining > 0) {
                            tailARS += bonusRemaining;
                            bonusNote = { type: 'ars_add', amount: bonusRemaining };
                            bonusRemaining = 0;
                        }
                        remainderDisplay = `+ ${tailARS.toLocaleString('ru-RU')} ARS`;
                    }
                }
            } else if (bonusMode === 'give' && bonusRemaining > 0 && order.give && displayGive > 0) {
                const deductGive = Math.min(
                    displayGive,
                    bonusArsToGiveAmount(bonusRemaining, order.give, exchangeRates)
                );
                if (deductGive > 0) {
                    const arsUsed =
                        (deductGive / exchangeRates[order.give].rate) * exchangeRates.ARS.rate;
                    displayGive = Math.max(0, displayGive - deductGive);
                    bonusRemaining = Math.max(0, bonusRemaining - arsUsed);
                    bonusNote = {
                        type: 'give_deduct',
                        giveAmount: deductGive,
                        giveCurrency: order.give,
                        arsAmount: Math.round(arsUsed),
                    };
                }
            }

            return { ...order, displayGive, displayGet, remainderDisplay, bonusNote };
        });

        return {
            bonusMode,
            displayOrders,
            bonusAppliedArs: bonuses - bonusRemaining,
        };
    }, [
        effectiveOrders,
        useBonuses,
        bonuses,
        exchangeRates,
        pairRates,
        pairDisplay,
        exchangeFees,
    ]);

    const totalsToPay = useMemo(() => {
        const totals = {};
        orderBonusState.displayOrders.forEach((o) => {
            const pay = o.displayGive ?? o.effGive;
            if (o.give && pay > 0) {
                if (!totals[o.give]) totals[o.give] = 0;
                totals[o.give] += pay;
            }
        });
        return totals;
    }, [orderBonusState]);

    // === НОВАЯ МАТЕМАТИКА КЭШБЭКА ===
    const calculatedRate = Math.min(0.2, 0.08 + ((friendsInvited || 0) * 0.01));
    const rateDecimal = calculatedRate / 100;
    
    const expectedCashback = useMemo(() => {
        let total = 0;
        effectiveOrders.forEach(o => {
            const giveAmt = parseFloat(o.effGive) || 0;
            const getAmt = parseFloat(o.effGet) || 0;
            if (giveAmt === 0 && getAmt === 0) return;

            const isGiveARS = o.give === 'ARS' || o.give === 'ARS_CARD';
            const isGetARS = o.get === 'ARS' || o.get === 'ARS_CARD';

            if (isGiveARS) {
                total += giveAmt * rateDecimal;
            } else if (isGetARS) {
                total += getAmt * rateDecimal;
            } else {
                // Если нет песо (USDT/USD), считаем 1 USD = 1 ARS базово, и умножаем на процент.
                const usdVolume = (giveAmt / exchangeRates[o.give].rate) * exchangeRates['USD'].rate;
                total += usdVolume * (rateDecimal * 1000); 
            }
        });
        return Math.floor(total);
    }, [effectiveOrders, rateDecimal]);

  const bgMain = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E] border border-white/10' : 'bg-white shadow-sm';
  const exchangeCardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSec = isDark ? 'text-gray-400' : 'text-gray-400';
  const inputBg = isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-50 hover:bg-gray-100';
  const dropdownBg = isDark ? 'bg-[#2C2C2E] border-white/10 text-white' : 'bg-white border-gray-100 text-slate-900';
  const handleConfirmOrder = () => {
      // 1. Создаем уникальный номер заказа
      const orderId = `ORD-${Date.now().toString().slice(-6)}`;

      const deliveryDetails = {
          method: isOnlyCardTransfer ? 'transfer' : deliveryMethod,
          address: isOnlyCardTransfer ? 'Перевод на карту' : (deliveryMethod === 'delivery' ? address : t('del_method_pickup')),
          date: (!isOnlyCardTransfer && deliveryMethod === 'delivery') ? selectedDate?.label : null,
          time: (!isOnlyCardTransfer && deliveryMethod === 'delivery') ? selectedTimeSlot : null,
          cardAccount: hasCardTransfer ? cardAccount : null,
      };

      confirmCurrentOrder(deliveryDetails, orderId);
      
      const bonusUsed = useBonuses ? orderBonusState.bonusAppliedArs : 0;

      const deliveryCost = deliveryCostLabel;
      const deliveryAddress = isOnlyCardTransfer
          ? 'Перевод на карту'
          : deliveryMethod === 'delivery'
            ? address
            : t('del_method_pickup');

      const addressComma = deliveryMethod === 'delivery' && address ? address.lastIndexOf(',') : -1;
      const addressStreet =
          addressComma > 0 ? address.slice(0, addressComma).trim() : deliveryAddress;
      const addressDistrict =
          addressComma > 0 ? address.slice(addressComma + 1).trim() : '';

      const orderPayload = {
              orderId,
              language,
              telegramUser: telegramUser
                  ? {
                        id: telegramUser.id,
                        first_name: telegramUser.first_name,
                        last_name: telegramUser.last_name,
                        username: telegramUser.username,
                    }
                  : null,
              type: isOnlyCardTransfer ? 'Перевод' : deliveryMethod === 'delivery' ? 'Доставка' : 'Офис',
              deliveryMethod: isOnlyCardTransfer ? 'transfer' : deliveryMethod,
              deals: buildDealsForOrderPayload(
                  orders,
                  exchangeRates,
                  pairRates,
                  pairDisplay,
                  exchangeFees
              ),
              bonusesUsed: bonusUsed,
              cashbackEarned: expectedCashback,
              deliveryFee: deliveryFeeUSD,
              deliveryFeeUsd: deliveryFeeUSD,
              deliveryExpress: isExpressDelivery,
              deliveryCost,
              paymentMethod: hasCardTransfer ? 'Перевод (Реквизиты)' : 'USDT',
              address: deliveryAddress,
              district: deliveryMethod === 'delivery' ? addressDistrict : null,
              addressStreet: deliveryMethod === 'delivery' ? addressStreet : null,
              deliveryDate: deliveryMethod === 'delivery' ? selectedDate?.label : null,
              deliveryDateId: deliveryMethod === 'delivery' ? selectedDate?.id : null,
              deliveryTime: deliveryMethod === 'delivery' ? selectedTimeSlot : null,
              coords:
                  deliveryMethod === 'delivery' && coords
                      ? { lat: coords.lat, lng: coords.lon ?? coords.lng }
                      : null,
              cardAccount: hasCardTransfer ? cardAccount : null,
              historyItem: {
                  id: orderId,
                  type: 'exchange',
                  status: 'pending',
                  timestamp: new Date().toISOString(),
                  items: orders.map((o) => ({
                      give: o.give,
                      giveAmount: o.giveAmount,
                      get: o.get,
                      getAmount: o.getAmount,
                  })),
                  delivery: deliveryDetails,
              },
      };

      postOrderToServer(orderPayload)
          .then(async (res) => {
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                  console.error('POST /api/orders failed:', res.status, data);
                  if (data.error === 'insufficient_bonuses') {
                      alert(
                          language === 'ru'
                              ? 'Недостаточно бонусов на счёте'
                              : 'Insufficient bonus balance'
                      );
                      if (data.bonuses != null) setBonuses(data.bonuses);
                      return;
                  }
                  alert(
                      language === 'ru'
                          ? 'Заявка сохранена в приложении, но сервер не ответил. Запустите: npm run bot'
                          : 'Order saved locally but server did not respond. Run: npm run bot'
                  );
                  return;
              }
              if (data.wallet) setWalletFromServer(data.wallet);
              else if (data.bonuses != null) setBonuses(data.bonuses);
          })
          .catch((e) => {
              console.error('Ошибка POST /api/orders:', e);
              alert(
                  language === 'ru'
                      ? 'Нет связи с сервером заказов. Запустите в папке exchange: npm run bot'
                      : 'Cannot reach order server. Run: npm run bot'
              );
          });

      setShowSuccess(true);
  };

  const closeSuccessModal = () => {
      setShowSuccess(false); setUseBonuses(false); setStep(1); setAddress(''); setSelectedDate(null); setSelectedTimeSlot(null); setSelectedTimeSlotId(null); setCardAccount(''); goToTab('deliveries');
  
    };

  const commitPendingSpreadFields = () => {
      orders.forEach((order) => {
          if (!isSpreadPayUsdtMode(order.give, order.get)) return;
          const rawGet = String(order.getAmount ?? '').trim();
          const getVal = parseFloat(rawGet);
          if (Number.isFinite(getVal) && getVal >= MIN_FOREIGN_GET_ARS_PAIRS) {
              applySpreadPayUsdtCommit(order, 'getAmount', {
                  giveAmount: order.giveAmount,
                  getAmount: rawGet,
              });
              return;
          }
          const raw = String(order.giveAmount ?? '').trim();
          const val = parseFloat(raw);
          if (!Number.isFinite(val) || val < MIN_FOREIGN_GET_ARS_PAIRS) return;
          applySpreadPayUsdtCommit(order, 'giveAmount', {
              giveAmount: raw,
              getAmount: order.getAmount,
          });
      });
  };

  const scrollAddressIntoView = () => {
      const el = addressInputRef.current;
      if (!el) return;
      const scrollParent = el.closest('.app-main-scroll');
      if (scrollParent) {
          const top = el.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top + scrollParent.scrollTop - 72;
          scrollParent.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  const nextStep = () => {
      if (step === 1) {
          commitPendingSpreadFields();
          if (validateOrders()) setStep(2);
      } else if (step === 2 && isStep2Valid) {
          setStep(3);
      } else if (step === 3) {
          commitPendingSpreadFields();
          handleConfirmOrder();
      }
  };

  const handleMainCtaPointerDown = (e) => {
      if (e.button !== 0) return;
      const disabled = (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid);
      if (disabled) return;
      e.preventDefault();
      nextStep();
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const renderHome = () => (
      <div className="flex flex-col px-6 pt-0 pb-24 space-y-6">
          <div className="flex justify-between items-center">
             <div className="flex items-center">
                 <button 
                     onClick={openSupportTelegram}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-gray-50 shadow-sm'}`}
                 >
                     <Headphones size={16} className={isDark ? 'text-[#D0FD00]' : 'text-orange-500'} />
                     <span className="font-aeonik font-bold tracking-[0.06em]">{language === 'ru' ? 'Поддержка 24/7' : 'Support 24/7'}</span>
                 </button>
             </div>
             <button
                 type="button"
                 onClick={toggleTheme}
                 aria-label={isDark ? t('theme_dark') : t('theme_light')}
                 className={`w-14 h-8 flex items-center rounded-full p-1 border-0 cursor-pointer transition-colors duration-300 touch-manipulation ${isDark ? 'bg-white/10' : 'bg-black/5 shadow-inner'}`}
             >
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 shadow-md pointer-events-none ${isDark ? 'translate-x-6 bg-black text-white' : 'translate-x-0 bg-white text-amber-500'}`}>
                     {isDark ? <Moon size={12} className="text-[#D0FD00]"/> : <Sun size={12}/>}
                 </div>
             </button>
          </div>

          <div className={`relative rounded-[2.5rem] aspect-square overflow-hidden shadow-2xl border border-white/5 ${!homeVideoOk ? (isDark ? 'bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-black' : 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900') : ''}`}>
              {homeVideoOk ? (
              <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setHomeVideoOk(false)}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              >
                  <source src="/14218019_1280_720_30fps.mp4" type="video/mp4" />
              </video>
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />
              <div className="relative z-10 flex flex-col items-center justify-between h-full p-8 text-center">
                  <div className="space-y-2 pt-2">
                      <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">{t('home_title')}</h2>
                      <p className="text-sm font-medium text-gray-200 drop-shadow-md">{t('home_sub')}</p>
                  </div>
              <button onClick={() => goToTab('create')} className={`w-full py-3 px-6 pr-3 rounded-full active:scale-95 transition-all group ${isDark ? 'bg-[#D0FD00] text-black hover:brightness-95 shadow-none' : 'bg-white text-black hover:bg-gray-50 shadow-[0_0_30px_rgba(255,255,255,0.15)]'}`}>
                  <span className="flex items-center justify-between gap-4">
                      <span className="flex-1 ml-4 text-xl font-aeonik font-bold tracking-[0.01em]">{t('home_btn')}</span>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 ${isDark ? 'bg-black/10' : 'bg-black/5'}`}>
                           <ChevronRight size={20} strokeWidth={2.5} className="ml-0.5"/>
                      </div>
                  </span>
              </button>
              </div>
          </div>

          {ratesReady && !ratesLoading && marketData.length > 0 ? (
          <div className="space-y-3">
              {marketData.map((pair) => (
                  <div
                      key={pair.code + pair.target}
                      className={`w-full ${cardBg} rounded-2xl p-4 flex items-center justify-between shadow-sm border-0`}
                  >
                      <div className="flex flex-col gap-1 min-w-0">
                          <div className={`text-sm font-bold uppercase tracking-wide ${textMain}`}>
                              {pair.code} <span className={`opacity-40 font-normal ${textSec}`}>→</span> {pair.target}
                          </div>
                          <div className={`flex items-center text-sm font-bold ${rateChangeClass(pair.trend, isDark)}`}>
                              {pair.trend === 'up' ? (
                                  <TrendingUp size={18} className="mr-1.5 shrink-0" strokeWidth={2.5} />
                              ) : pair.trend === 'down' ? (
                                  <TrendingDown size={18} className="mr-1.5 shrink-0" strokeWidth={2.5} />
                              ) : null}
                              {Math.abs(pair.change || 0).toFixed(2)}%
                          </div>
                      </div>
                      <div className={`text-3xl font-black tracking-tighter text-right font-rates shrink-0 ml-3 ${textMain}`}>
                          {pair.price}
                      </div>
                  </div>
              ))}
          </div>
          ) : (
          <div
              className={`${cardBg} rounded-2xl py-14 flex flex-col items-center justify-center gap-3 shadow-sm`}
              aria-busy="true"
              aria-label={t('home_rates_loading')}
          >
              <Loader2
                  size={40}
                  strokeWidth={2.5}
                  className={`animate-spin ${isDark ? 'text-white/70' : 'text-black/45'}`}
              />
              <span className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-white/60' : 'text-black/50'}`}>
                  {t('home_rates_loading')}
              </span>
          </div>
          )}
      </div>
  );

  const renderCreateOrder = () => (
    <div className="flex flex-col px-4 pt-0 pb-24 space-y-4" onFocusCapture={handleFormFocusCapture}>
        <div className="flex justify-between items-center px-2 pt-0 mb-2">
            <div className="flex items-center gap-3">
                {step > 1 && (<button onClick={prevStep} className={`${isDark ? 'bg-white/10' : 'bg-white'} p-2 rounded-full shadow-sm`}><ArrowLeft size={20}/></button>)}
                <h1 className="text-2xl font-black tracking-tighter">{step === 1 ? t('ord_title_1') : step === 2 ? t('ord_title_2') : t('ord_title_3')}</h1>
            </div>
            <button 
                type="button"
                onClick={triggerAi} 
                className={`ai-sparkle-btn ${isDark ? 'ai-sparkle-btn--dark' : 'ai-sparkle-btn--light'} p-3 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-sm ${isInsightLoading ? 'opacity-70' : ''}`}
            >
                {isInsightLoading ? (
                    <Loader2 size={18} className="animate-spin" color={isDark ? '#000000' : '#ffffff'} />
                ) : (
                    <Sparkles size={18} color={isDark ? '#000000' : '#ffffff'} strokeWidth={2} />
                )}
            </button>
        </div>

        {step === 1 && (aiInsight || isInsightLoading) && (
            <div className={`mb-2 rounded-[2rem] p-5 flex gap-3 items-start animate-in slide-in-from-top-2 border-0 ${isDark ? 'bg-[#D0FD00]' : 'bg-black shadow-sm'}`}>
                <div className={`mt-0.5 shrink-0 ${isDark ? 'text-black' : 'text-white'}`}><Sparkles size={16} /></div>
                <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-black' : 'text-white'}`}>{isInsightLoading ? t('insight_loading') : aiInsight}</p>
            </div>
        )}

        {step === 1 && (
            <div className="space-y-4">
                {orders.map((order) => {
                    const cardDropdownOpen =
                        openDropdown === `give-${order.id}` || openDropdown === `get-${order.id}`;
                    return (
                    <div
                        key={order.id}
                        data-order-card={order.id}
                        className={`${exchangeCardBg} rounded-[2rem] p-5 relative overflow-visible ${cardDropdownOpen ? 'z-30' : 'z-0'}`}
                    >
                        {orders.length > 1 && (
                            <button 
                                onClick={() => removeOrder(order.id)} 
                                className={`absolute top-3 right-3 p-2.5 rounded-full transition-colors z-50 ${isDark ? 'text-white hover:bg-white/10 hover:text-white' : 'text-gray-300 hover:bg-black/5 hover:text-red-500'}`}
                            >
                                <Trash2 size={18}/>
                            </button>
                        )}
                        <div className="space-y-4">
                            
                            <div data-currency-dropdown>
                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${textSec}`}>{t('ord_give')}</label>
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                    <div className="relative shrink-0">
                                    <div
                                        role="button"
                                        data-currency-pill
                                        onClick={() => toggleDropdown(`give-${order.id}`)}
                                        className={`${orderCurrencyPillClass(order.give, order.give ? `${inputBg} cursor-pointer` : (isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'))} cursor-pointer touch-manipulation`}
                                    >
                                        {order.give ? (
                                            <>
                                                <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                                    <img src={exchangeRates[order.give].flag} className="w-full h-full object-cover" alt=""/>
                                                </div>
                                                <OrderCurrencyLabel code={order.give} language={language} compact />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        updateOrder(order.id, 'give', null);
                                                        setOpenDropdown(null);
                                                    }} 
                                                    className={`p-1 rounded-full transition-colors shrink-0 ${order.give === 'ARS_CARD' ? 'ml-0.5' : 'ml-1'} ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-gray-400 hover:text-black'}`}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0 ${isDark ? 'bg-[#2C2C2E] text-white' : 'bg-white text-slate-900'}`}>
                                                    <ArrowDown size={14} strokeWidth={3}/>
                                                </div>
                                                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{({ ru: 'Выбрать', en: 'Select', es: 'Seleccionar', pt: 'Selecionar', zh: '选择' })[language?.toLowerCase()] || 'Select'}</span>
                                            </>
                                        )}
                                    </div>
                                    {openDropdown === `give-${order.id}` && (
                                        <div className={`absolute top-full left-0 mt-1 w-48 shadow-xl rounded-2xl border z-[200] overflow-hidden max-h-60 overflow-y-auto custom-scroll ${isDark ? 'bg-[#2C2C2E] border-0 text-white' : dropdownBg}`}>
                                            {Object.keys(PAIRS).map(curr => (
                                                <div
                                                    key={curr}
                                                    role="button"
                                                    data-currency-option
                                                    onPointerDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        updateOrder(order.id, 'give', curr);
                                                        setOpenDropdown(null);
                                                    }}
                                                    className={`flex items-center gap-3 p-3 cursor-pointer touch-manipulation ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm bg-white/5">
                                                        <img src={exchangeRates[curr].flag} className="w-full h-full object-cover" alt=""/>
                                                    </div>
                                                    <OrderCurrencyLabel code={curr} language={language} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 basis-0 flex flex-col items-end relative">
                                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${order.give && order.get && !order.giveAmount ? 'opacity-30 scale-100' : 'opacity-0 scale-75'} ${isDark ? 'text-white' : 'text-slate-500'}`}>
                                            <PenLine size={18} />
                                        </div>
                                        <input 
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            data-exchange-amount="give"
                                            disabled={!order.give || !order.get}
                                            placeholder="" 
                                            value={order.giveAmount}
                                            onChange={(e) => {
                                                const v = sanitizeGiveAmountInput(e.target.value);
                                                if (isSpreadPayUsdtMode(order.give, order.get)) {
                                                    if (!v) {
                                                        clearSpreadPayUsdtFields(order.id);
                                                        return;
                                                    }
                                                    updateOrder(order.id, 'giveAmount', v, {
                                                        spreadPayUsdtPassthrough: true,
                                                    });
                                                    return;
                                                }
                                                updateOrder(order.id, 'giveAmount', v);
                                            }}
                                            onFocus={(e) => {
                                                spreadUsdtGiveEditStartRef.current[order.id] =
                                                    sanitizeGiveAmountInput(e.target.value);
                                            }}
                                            onBlur={(e) => {
                                                if (isMovingToSiblingAmountInput(order.id, e.currentTarget)) {
                                                    return;
                                                }
                                                if (isSpreadPayUsdtMode(order.give, order.get)) {
                                                    handleSpreadGiveBlur(
                                                        order,
                                                        sanitizeGiveAmountInput(e.target.value)
                                                    );
                                                    return;
                                                }

                                                let val = parseFloat(order.giveAmount);
                                                if (!val) return;
                                                
                                                let correctedVal = val;
                                                
                                                if (order.give === 'RUB') {
                                                    if (val < 10000) correctedVal = 10000;
                                                    else if (val % 1000 !== 0) correctedVal = Math.round(val / 1000) * 1000;
                                                }
                                                else if (order.give === 'ARS') {
                                                    if (isArsToForeignPair(order.give, order.get)) {
                                                        const minArs = minArsNumForForeignGet(
                                                            order.give,
                                                            order.get,
                                                            exchangeRates,
                                                            pairRates,
                                                            pairDisplay
                                                        );
                                                        let correctedVal = val;
                                                        if (minArs > 0 && val < minArs) {
                                                            correctedVal = minArs;
                                                        }
                                                        if (correctedVal !== val) {
                                                            updateOrder(
                                                                order.id,
                                                                'giveAmount',
                                                                String(correctedVal),
                                                                { syncArsGiveTop: true }
                                                            );
                                                        } else {
                                                            updateOrder(order.id, 'giveAmount', order.giveAmount, {
                                                                syncArsGiveTop: true,
                                                            });
                                                        }
                                                        return;
                                                    }
                                                    let targetVal = val;
                                                    if (val < 500000) targetVal = 500000; 
                                                    
                                                    if (order.get === 'USD' || order.get === 'EUR') {
                                                        const rateGive = exchangeRates[order.give].rate;
                                                        const rateGet = exchangeRates[order.get].rate;
                                                        const exactRes = (targetVal / rateGive) * rateGet;
                                                        
                                                        let n = Math.round(exactRes / 10) * 10; 
                                                        while (true) {
                                                            if (n < 100) n = 100;
                                                            if ([10, 30, 90].includes(n % 100)) n += 10;
                                                            
                                                            let exactGive = (n / rateGet) * rateGive;
                                                            if (Math.ceil(exactGive) < 500000) {
                                                                n += 10; 
                                                            } else {
                                                                correctedVal = Math.ceil(exactGive);
                                                                break;
                                                            }
                                                        }
                                                    } else {
                                                        correctedVal = targetVal;
                                                    }
                                                }
                                                else if (
                                                    isForeignToArsCardPair(order.give, order.get) &&
                                                    (order.give === 'USD' || order.give === 'EUR')
                                                ) {
                                                    const synced = applyForeignGiveToArsGet(
                                                        order.give,
                                                        order.get,
                                                        val < 100 ? 100 : val,
                                                        pairRates,
                                                        pairDisplay
                                                    );
                                                    updateOrder(
                                                        order.id,
                                                        'giveAmount',
                                                        synced.giveAmount ?? String(val < 100 ? 100 : val)
                                                    );
                                                    return;
                                                }
                                                else if (order.give === 'USD' || order.give === 'EUR') {
                                                    if (val < 100) correctedVal = 100;
                                                    else correctedVal = getValidCashStep(val);
                                                }
                                                
                                                if (isOrderUsdtFiatSpread(order)) {
                                                    return;
                                                }
                                                if (correctedVal !== val) updateOrder(order.id, 'giveAmount', correctedVal.toString());
                                            }}
                                            className={`${ORDER_AMOUNT_INPUT_CLASS} transition-all duration-300 ${(!order.give || !order.get) ? 'opacity-0' : 'opacity-100'} ${
                                                ((order.give === 'RUB' && order.giveAmount > 0 && (order.giveAmount < 10000 || order.giveAmount % 1000 !== 0)) ||
                                                 (order.give === 'ARS' && order.giveAmount > 0 && order.giveAmount < 500000 && !isArsToForeignPair(order.give, order.get)) ||
                                                 (order.give === 'ARS' && isArsToForeignPair(order.give, order.get) && (() => {
                                                    const m = minArsNumForForeignGet(order.give, order.get, exchangeRates, pairRates, pairDisplay);
                                                    return m > 0 && parseFloat(order.giveAmount) < m;
                                                 })()) ||
                                                 ((order.give === 'USD' || order.give === 'EUR') && order.giveAmount > 0 && (order.giveAmount < 100 || parseFloat(order.giveAmount) !== getValidCashStep(parseFloat(order.giveAmount))))
                                                ) ? 'text-red-500' : (isDark ? 'text-white' : 'text-black')
                                            }`}
                                        />
                                        
                                        <div className="absolute -bottom-5 right-1 pointer-events-none flex flex-col items-end">
                                            {order.give === 'RUB' && order.giveAmount > 0 && order.giveAmount < 10000 && (
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-60 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {language === 'ru' ? 'мин. 10 000' : 'min. 10,000'}
                                                </div>
                                            )}
                                            {order.give === 'RUB' && order.giveAmount >= 10000 && order.giveAmount % 1000 !== 0 && (
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-60 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {language === 'ru' ? 'кратно 1 000' : 'multiple of 1,000'}
                                                </div>
                                            )}
                                            {order.give === 'ARS' && order.giveAmount > 0 && order.giveAmount < 500000 && !isArsToForeignPair(order.give, order.get) && (
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-60 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {language === 'ru' ? 'мин. 500 000' : 'min. 500,000'}
                                                </div>
                                            )}
                                            {order.give === 'ARS' && isArsToForeignPair(order.give, order.get) && (() => {
                                                const minArs = minArsNumForForeignGet(order.give, order.get, exchangeRates, pairRates, pairDisplay);
                                                const v = parseFloat(order.giveAmount) || 0;
                                                if (!(minArs > 0 && v > 0 && v < minArs)) return null;
                                                const minLbl = minArs.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
                                                return (
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-60 animate-in fade-in slide-in-from-top-1">
                                                        <AlertCircle size={12} /> {language === 'ru' ? `мин. ${minLbl} ARS` : `min. ${minLbl} ARS`}
                                                    </div>
                                                );
                                            })()}
                                            {(order.give === 'USD' || order.give === 'EUR') && order.giveAmount > 0 && order.giveAmount < 100 && (
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-60 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {language === 'ru' ? 'мин. 100' : 'min. 100'}
                                                </div>
                                            )}
                                            {(order.give === 'USD' || order.give === 'EUR') && order.giveAmount >= 100 && parseFloat(order.giveAmount) !== getValidCashStep(parseFloat(order.giveAmount)) && (
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-60 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {language === 'ru' ? 'купюры 20, 50, 100' : 'bills 20, 50, 100'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}></div>
                                <div className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-white/10 text-white/40 hover:text-white/70' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}>
                                    <ArrowDownUp size={14}/>
                                </div>
                                <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}></div>
                            </div>

                            <div data-currency-dropdown>
                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${textSec}`}>{t('ord_get')}</label>
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                    <div className="relative shrink-0">
                                    <div
                                        role="button"
                                        data-currency-pill
                                        onClick={() => order.give && toggleDropdown(`get-${order.id}`)}
                                        className={orderCurrencyPillClass(
                                            order.get,
                                            !order.give
                                                ? (isDark ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-gray-100 opacity-50 cursor-not-allowed')
                                                : order.get
                                                    ? `${inputBg} cursor-pointer`
                                                    : (isDark ? 'bg-white/10 hover:bg-white/20 cursor-pointer' : 'bg-slate-100 hover:bg-slate-200 cursor-pointer')
                                        ) + ' touch-manipulation'}
                                    >
                                        {order.get ? (
                                            <>
                                                <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                                    <img src={exchangeRates[order.get].flag} className="w-full h-full object-cover" alt=""/>
                                                </div>
                                                <OrderCurrencyLabel code={order.get} language={language} compact />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        updateOrder(order.id, 'get', null);
                                                        setOpenDropdown(null);
                                                    }} 
                                                    className={`p-1 rounded-full transition-colors shrink-0 ${order.get === 'ARS_CARD' ? 'ml-0.5' : 'ml-1'} ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-gray-400 hover:text-black'}`}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0 ${isDark ? 'bg-[#2C2C2E] text-white' : 'bg-white text-slate-900'}`}>
                                                    <ArrowDown size={14} strokeWidth={3}/>
                                                </div>
                                                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {({ ru: 'Выбрать', en: 'Select', es: 'Seleccionar', pt: 'Selecionar', zh: '选择' })[language?.toLowerCase()] || 'Select'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {openDropdown === `get-${order.id}` && (
                                        <div className={`absolute top-full left-0 mt-1 w-48 shadow-xl rounded-2xl border z-[200] overflow-hidden max-h-60 overflow-y-auto custom-scroll ${isDark ? 'bg-[#2C2C2E] border-0 text-white' : dropdownBg}`}>
                                            {(PAIRS[order.give] || [])
                                                .filter((curr) => !orders.some((o) => o.id !== order.id && o.give === order.give && o.get === curr))
                                                .map(curr => (
                                                <div
                                                    key={curr}
                                                    role="button"
                                                    data-currency-option
                                                    onPointerDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        updateOrder(order.id, 'get', curr);
                                                        setOpenDropdown(null);
                                                    }}
                                                    className={`flex items-center gap-3 p-3 cursor-pointer touch-manipulation ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm bg-white/5">
                                                        <img src={exchangeRates[curr].flag} className="w-full h-full object-cover" alt=""/>
                                                    </div>
                                                    <OrderCurrencyLabel code={curr} language={language} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 basis-0 flex flex-col items-end relative">
                                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${order.give && order.get && !order.giveAmount ? 'opacity-30 scale-100' : 'opacity-0 scale-75'} ${isDark ? 'text-white' : 'text-slate-500'}`}>
                                            <PenLine size={18} />
                                        </div>
                                        <input 
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            data-exchange-amount="get"
                                            disabled={!order.give || !order.get}
                                            placeholder="" 
                                            value={(() => {
                                                const isFirstDirectARS = (order.get === 'ARS' || order.get === 'ARS_CARD') && orders.find(o => o.get === 'ARS' || o.get === 'ARS_CARD')?.id === order.id;
                                                if (isFirstDirectARS && !usdtSpreadInCart && parseFloat(order.getAmount) > 0) {
                                                    let tFee = 0; let aARS = 0;
                                                    orders.forEach(o => {
                                                        if (o.give === 'USDT' && (o.get === 'USD' || o.get === 'EUR') && parseFloat(o.getAmount) > 0) {
                                                            const fP = exchangeFees[`${o.give}-${o.get}`] || 0;
                                                            if (fP > 0) tFee += Math.floor((parseFloat(o.getAmount) * (fP / 100) / exchangeRates[o.get].rate) * exchangeRates['ARS'].rate);
                                                        }
                                                        if (o.get === 'ARS' || o.get === 'ARS_CARD') aARS += parseFloat(o.getAmount) || 0;
                                                        if (o.give === 'RUB' && (o.get === 'USD' || o.get === 'EUR')) {
                                                            const eg = calcExactGet(
                                                                o.give,
                                                                o.get,
                                                                parseFloat(o.giveAmount) || 0,
                                                                exchangeRates,
                                                                pairRates,
                                                                pairDisplay,
                                                                exchangeFees
                                                            );
                                                            const is = parseFloat(o.getAmount) || 0;
                                                            const rem = usdToArsAmount(eg - is, exchangeRates, pairRates, pairDisplay);
                                                            if (rem > 0) aARS += rem;
                                                        }
                                                    });
                                                    if (tFee > 0 && aARS >= tFee) return Math.max(0, parseFloat(order.getAmount) - tFee).toString();
                                                }
                                                return order.getAmount;
                                            })()}
                                            onChange={(e) => {
                                                const isFirstDirectARS = (order.get === 'ARS' || order.get === 'ARS_CARD') && orders.find(o => o.get === 'ARS' || o.get === 'ARS_CARD')?.id === order.id;
                                                if (isFirstDirectARS && !usdtSpreadInCart) {
                                                    let tFee = 0; let aARS = 0;
                                                    orders.forEach(o => {
                                                        if (o.give === 'USDT' && (o.get === 'USD' || o.get === 'EUR') && parseFloat(o.getAmount) > 0) {
                                                            const fP = exchangeFees[`${o.give}-${o.get}`] || 0;
                                                            if (fP > 0) tFee += Math.floor((parseFloat(o.getAmount) * (fP / 100) / exchangeRates[o.get].rate) * exchangeRates['ARS'].rate);
                                                        }
                                                        if (o.get === 'ARS' || o.get === 'ARS_CARD') aARS += parseFloat(o.getAmount) || 0;
                                                        if (o.give === 'RUB' && (o.get === 'USD' || o.get === 'EUR')) {
                                                            const eg = calcExactGet(
                                                                o.give,
                                                                o.get,
                                                                parseFloat(o.giveAmount) || 0,
                                                                exchangeRates,
                                                                pairRates,
                                                                pairDisplay,
                                                                exchangeFees
                                                            );
                                                            const is = parseFloat(o.getAmount) || 0;
                                                            const rem = usdToArsAmount(eg - is, exchangeRates, pairRates, pairDisplay);
                                                            if (rem > 0) aARS += rem;
                                                        }
                                                    });
                                                    if (tFee > 0 && aARS >= tFee) {
                                                        const raw = sanitizeAmountInput(e.target.value);
                                                        const val = parseFloat(raw);
                                                        if (!isNaN(val)) updateOrder(order.id, 'getAmount', (val + tFee).toString());
                                                        else updateOrder(order.id, 'getAmount', raw);
                                                        return;
                                                    }
                                                }
                                                const getV = sanitizeAmountInput(e.target.value);
                                                if (isSpreadPayUsdtMode(order.give, order.get)) {
                                                    if (!getV) {
                                                        clearSpreadPayUsdtFields(order.id);
                                                        return;
                                                    }
                                                    updateOrder(order.id, 'getAmount', getV, {
                                                        spreadPayUsdtPassthrough: true,
                                                    });
                                                    return;
                                                }
                                                updateOrder(order.id, 'getAmount', getV);
                                            }}
                                            onFocus={(e) => {
                                                spreadUsdGetEditStartRef.current[order.id] =
                                                    sanitizeAmountInput(e.target.value);
                                            }}
                                            onBlur={(e) => {
                                                if (isMovingToSiblingAmountInput(order.id, e.currentTarget)) {
                                                    return;
                                                }
                                                if (
                                                    isSpreadPayUsdtMode(order.give, order.get)
                                                ) {
                                                    handleSpreadGetBlur(
                                                        order,
                                                        sanitizeAmountInput(e.target.value)
                                                    );
                                                    return;
                                                }

                                                let rawGetBlur = sanitizeAmountInput(e.target.value);
                                                const isFirstDirectARSBlur =
                                                    (order.get === 'ARS' || order.get === 'ARS_CARD') &&
                                                    orders.find(
                                                        (o) => o.get === 'ARS' || o.get === 'ARS_CARD'
                                                    )?.id === order.id;
                                                if (isFirstDirectARSBlur && !usdtSpreadInCart && rawGetBlur) {
                                                    let tFee = 0;
                                                    let aARS = 0;
                                                    orders.forEach((o) => {
                                                        if (
                                                            o.give === 'USDT' &&
                                                            (o.get === 'USD' || o.get === 'EUR') &&
                                                            parseFloat(o.getAmount) > 0
                                                        ) {
                                                            const fP =
                                                                exchangeFees[`${o.give}-${o.get}`] || 0;
                                                            if (fP > 0) {
                                                                tFee += Math.floor(
                                                                    (parseFloat(o.getAmount) *
                                                                        (fP / 100)) /
                                                                        exchangeRates[o.get].rate
                                                                ) * exchangeRates['ARS'].rate;
                                                            }
                                                        }
                                                        if (o.get === 'ARS' || o.get === 'ARS_CARD') {
                                                            aARS += parseFloat(o.getAmount) || 0;
                                                        }
                                                    });
                                                    if (tFee > 0 && aARS >= tFee) {
                                                        const v = parseFloat(rawGetBlur);
                                                        if (Number.isFinite(v)) {
                                                            rawGetBlur = String(v + tFee);
                                                        }
                                                    }
                                                }
                                                let val = parseFloat(rawGetBlur);
                                                if (!rawGetBlur || !Number.isFinite(val) || val <= 0) {
                                                    updateOrder(order.id, 'getAmount', '');
                                                    return;
                                                }
                                                if (isArsToForeignPair(order.give, order.get)) {
                                                    if (order.get === 'USD' || order.get === 'EUR') {
                                                        const correctedVal =
                                                            val < MIN_FOREIGN_GET_ARS_PAIRS
                                                                ? MIN_FOREIGN_GET_ARS_PAIRS
                                                                : normalizeUsdCashAmount(val);
                                                        updateOrder(order.id, 'getAmount', String(correctedVal));
                                                    } else {
                                                        const correctedVal =
                                                            val < MIN_FOREIGN_GET_ARS_PAIRS
                                                                ? MIN_FOREIGN_GET_ARS_PAIRS
                                                                : Math.floor(val * 100) / 100;
                                                        updateOrder(
                                                            order.id,
                                                            'getAmount',
                                                            formatUsdtGetAmount(correctedVal)
                                                        );
                                                    }
                                                    return;
                                                }
                                                if (isForeignToArsCardPair(order.give, order.get)) {
                                                    updateOrder(
                                                        order.id,
                                                        'getAmount',
                                                        String(Math.floor(val)),
                                                        { enforceArsCardMin: true }
                                                    );
                                                    return;
                                                }
                                                if (isForeignToArsCashPair(order.give, order.get)) {
                                                    updateOrder(
                                                        order.id,
                                                        'getAmount',
                                                        String(Math.floor(val)),
                                                        { enforceArsCashMin: true }
                                                    );
                                                    return;
                                                }
                                                if (order.get === 'USD' || order.get === 'EUR') {
                                                    if (isOrderUsdtFiatSpread(order)) {
                                                        const correctedVal = val < 100 ? 100 : normalizeUsdCashAmount(val);
                                                        if (correctedVal !== val) {
                                                            updateOrder(order.id, 'getAmount', correctedVal.toString());
                                                        }
                                                        return;
                                                    }
                                                    let correctedVal = val < 100 ? 100 : getValidCashStep(val);
                                                    if (order.give === 'RUB' && val > 0) {
                                                         correctedVal = issueUsdCashFromExact(val) || (val < 100 ? 100 : getValidCashStep(val));
                                                    }
                                                    if (correctedVal !== val) {
                                                        updateOrder(order.id, 'getAmount', correctedVal.toString());
                                                    }
                                                } else {
                                                    if (order.give === 'USD' || order.give === 'EUR' || order.give === 'RUB') {
                                                        updateOrder(order.id, 'giveAmount', order.giveAmount);
                                                    }
                                                }
                                            }}
                                            className={`${ORDER_AMOUNT_INPUT_CLASS} transition-all duration-300 ${(!order.give || !order.get) ? 'opacity-0' : 'opacity-100'} ${isDark ? 'text-white placeholder-white/20' : 'text-black placeholder-gray-200'}`}
                                        />
                                    </div>
                                </div>
                                
                                {order.give === 'RUB' && (order.get === 'USD' || order.get === 'EUR') && parseFloat(order.getAmount) > 0 && parseFloat(order.giveAmount) > 0 && (
                                    (() => {
                                        const exactGet = calcExactGet(
                                            order.give,
                                            order.get,
                                            parseFloat(order.giveAmount),
                                            exchangeRates,
                                            pairRates,
                                            pairDisplay,
                                            exchangeFees
                                        );
                                        let issuedCash = parseFloat(order.getAmount) || 0; 
                                        const diffUSD = exactGet - issuedCash;
                                        const remainderARS = usdToArsAmount(diffUSD, exchangeRates, pairRates, pairDisplay);
                                        const safeRemainderARS = Math.max(0, remainderARS); 

                                        if (safeRemainderARS > 0) {
                                            return (
                                                <div className={`mt-4 p-3 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-emerald-500/5 border-0' : 'bg-emerald-50 border-emerald-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-200/50'}`}>
                                                            <Wallet size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                                {({ ru: 'Выдаем купюрами', en: 'Cash Issued', es: 'Efectivo entregado', pt: 'Notas emitidas', zh: '发放现金' })[language?.toLowerCase()] || 'Cash Issued'}
                                                            </span>
                                                            <span className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                                {issuedCash} {order.get}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                            {({ ru: '+ Остаток в песо', en: '+ Remainder in ARS', es: '+ Resto en ARS', pt: '+ Restante em ARS', zh: '+ 比索尾款' })[language?.toLowerCase()] || '+ Remainder in ARS'}
                                                        </span>
                                                        <span className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                            {safeRemainderARS.toLocaleString('ru-RU')} ARS
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()
                                )}

                            </div> 
                        </div>
                    </div>
                    );
                })}
                
                {/* ПРЕМИАЛЬНЫЙ БЛОК КЭШБЭКА (ШАГ 1) */}
                {expectedCashback > 0 && (
                    <div className={`mt-2 flex items-center justify-between transition-all animate-in fade-in slide-in-from-bottom-2 ${isDark ? 'py-1' : 'p-4 rounded-[1.5rem] border border-dashed bg-emerald-50/50 border-emerald-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[#D0FD00] text-black' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Coins size={20} strokeWidth={2.5} />
                            </div>
                            <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-emerald-700'}`}>
                                {({ ru: 'Кэшбэк', en: 'Cashback', es: 'Cashback', pt: 'Cashback', zh: '返现' })[language?.toLowerCase()] || 'Cashback'}
                            </span>
                        </div>
                        <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-emerald-600'}`}>
                            +{expectedCashback.toLocaleString('ru-RU')} ARS
                        </span>
                    </div>
                )}
                
                {orders.length < 3 && (<button onClick={addOrder} className={`w-full py-4 rounded-full border border-dashed font-bold flex items-center justify-center gap-2 transition-all mt-4 ${isDark ? 'border-white/20 text-white/40 hover:bg-white/5 hover:text-white/70 hover:border-white/30' : 'border-gray-300 text-gray-400 hover:bg-white hover:border-gray-400 hover:text-gray-600'}`}><Plus size={20}/> {t('ord_add_deal')}</button>)}
            </div>
        )}
        
        {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <div className={`${exchangeCardBg} rounded-[2rem] p-6 shadow-xl space-y-6 relative z-10`}>
                    
                    {!isOnlyCardTransfer && (
                        <>
                            <div data-delivery-dropdown className={`relative grid grid-cols-2 p-1 rounded-full ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                                <div
                                    aria-hidden
                                    className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-transform duration-500 ease-in-out pointer-events-none ${
                                        isDark ? 'bg-white shadow-sm' : 'bg-white shadow-sm'
                                    }`}
                                    style={{
                                        transform: deliveryMethod === 'delivery' ? 'translateX(calc(100% + 0.25rem))' : 'translateX(0)',
                                    }}
                                />
                                {DELIVERY_METHODS.map(m => {
                                    const isDeliveryDisabled = m.id === 'delivery' && isUsdtSmall;
                                    const isActive = deliveryMethod === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            disabled={isDeliveryDisabled}
                                            onClick={() => setDeliveryMethod(m.id)}
                                            className={`relative z-10 flex items-center justify-center gap-2 py-3 rounded-full transition-colors duration-300 font-bold text-sm border-0 touch-manipulation ${
                                                isDeliveryDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                            } ${isActive ? (isDark ? 'text-black' : 'text-black') : 'text-gray-400'}`}
                                        >
                                            {m.icon} {t(m.translationKey)}
                                        </button>
                                    );
                                })}
                            </div>

                            {isUsdtSmall && deliveryMethod === 'pickup' && (
                                <div className={`p-4 rounded-[2rem] border flex items-start gap-3 animate-in slide-in-from-top-2 ${isDark ? 'bg-[#D0FD00] border-0' : 'bg-orange-50 border-orange-200'}`}>
                                    <Info size={18} className={`shrink-0 mt-0.5 ${isDark ? 'text-black' : 'text-orange-500'}`} />
                                    <div className={`text-[11px] font-bold leading-tight ${isDark ? 'text-black' : 'text-orange-600'}`}>
                                        {({ 
                                            ru: 'Суммы менее 100 USDT меняем только самовывозом в офисе.', 
                                            en: 'USDT amounts under 100 are available for office pickup only.',
                                            es: 'Montos menores a 100 USDT solo con retiro en oficina.',
                                            pt: 'Valores abaixo de 100 USDT apenas para retirada na agência.',
                                            zh: '低于100 USDT的金额仅限办公室自取。'
                                        })[language?.toLowerCase()] || 'USDT amounts under 100 are available for office pickup only.'}
                                    </div>
                                </div>
                            )}

                            {deliveryMethod === 'pickup' && (
                                <div className={`p-4 rounded-[2rem] flex items-start gap-4 border animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-white/5 border-0' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`p-3 rounded-full shadow-sm ${isDark ? 'bg-white text-black' : 'bg-white text-orange-600'}`}><MapPin size={24} strokeWidth={2} /></div>
                                    <div><div className={`font-bold text-sm ${textMain}`}>{t('del_pickup_title')}</div><div className={`text-xs mt-1 font-medium ${textSec}`}>Buenos Aires</div></div>
                                </div>
                            )}
                            
                            {deliveryMethod === 'delivery' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 relative">
                                    {!isUsdtSmall && (
                                        <div className={`p-4 rounded-[2rem] border flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-[#1C1C1E] border-0' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center gap-3.5">
                                                <div className={`p-2.5 rounded-full flex items-center justify-center ${isDark ? 'bg-white text-black' : 'bg-white shadow-sm border border-gray-100 text-slate-900'}`}>
                                                    <Package size={20} strokeWidth={2} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${textMain}`}>
                                                        {({ ru: 'Курьерская доставка', en: 'Courier Delivery', es: 'Envío por Moto', pt: 'Entrega via Motoboy', zh: '专人配送' })[language?.toLowerCase()] || 'Courier Delivery'}
                                                    </span>
                                                    {!isDeliveryFree && !isExpressDelivery && (
                                                        <span className={`text-xs font-medium mt-0.5 ${textSec}`}>
                                                            {(() => {
                                                                const missingUnits = Math.max(0, FREE_DELIVERY_THRESHOLD - totalFreeDeliveryUnits);
                                                                const uniqueGives = [...new Set(orders.filter(o => o.give && parseFloat(o.giveAmount) > 0).map(o => o.give))];
                                                                let neededStr = "";
                                                                if (uniqueGives.length === 1) {
                                                                    const c = uniqueGives[0];
                                                                    let neededInC = missingGiveForFreeDelivery(missingUnits, c);
                                                                    if (c === 'RUB' || c.includes('ARS')) neededInC = Math.ceil(neededInC / 1000) * 1000;
                                                                    else if (c === 'USDT' || c === 'USD' || c === 'EUR') neededInC = Math.ceil(neededInC);
                                                                    else neededInC = Math.ceil(neededInC / 10) * 10;
                                                                    neededStr = `${neededInC.toLocaleString('ru-RU')} ${c}`;
                                                                } else { neededStr = `${Math.ceil(missingUnits)} USDT`; }

                                                                return ({
                                                                    ru: `Добавьте ${neededStr} для бесплатной`,
                                                                    en: `Add ${neededStr} for free delivery`,
                                                                    es: `Agregá ${neededStr} para envío gratis`,
                                                                    pt: `Adicione ${neededStr} para entrega grátis`,
                                                                    zh: `再添加 ${neededStr} 即可免费配送`
                                                                })[language?.toLowerCase()] || `Add ${neededStr} for free delivery`;
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                {isDeliveryFree && !isExpressDelivery ? (
                                                    <div className={`py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {({ ru: 'БЕСПЛАТНО', en: 'FREE', es: 'GRATIS', pt: 'GRÁTIS', zh: '免费' })[language?.toLowerCase()] || 'FREE'}
                                                    </div>
                                                ) : (
                                                    <span className={`text-base font-black ${textMain}`}>
                                                        ${deliveryFeeUSD.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`relative ${isAddressDropdownOpen ? 'z-[50]' : 'z-20'}`}>
                                        <div className="flex justify-end mb-2 px-1">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); handleGeolocation(); }} 
                                                disabled={isLocating}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-900'}`}
                                            >
                                                {isLocating ? <Loader2 size={14} className="animate-spin" strokeWidth={2.5}/> : <Locate size={14} strokeWidth={2.5} />} 
                                                <span>{isLocating ? '...' : t('del_gps')}</span>
                                            </button>
                                        </div>
                                        <input 
                                            ref={addressInputRef}
                                            type="text" 
                                            value={address} 
                                            onFocus={() => {
                                                setOpenDropdown('address');
                                                setTimeout(scrollAddressIntoView, 350);
                                            }}
                                            onChange={(e) => { 
                                                setAddress(e.target.value);
                                                if (e.target.value === '') setCoords(null);
                                            }} 
                                            placeholder={t('del_addr_ph')} 
                                            // ДОБАВИЛИ caret-orange-500 (мигающая палочка) и select-text (чтобы не блокировалось)
                                            className={`w-full p-4 rounded-2xl font-bold outline-none border transition-all caret-orange-500 select-text ${isDark ? 'bg-white/5 border-0 focus:bg-white/10 text-white' : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-gray-200 text-slate-900'}`}
                                        />
                                        {isAddressDropdownOpen && (
                                            <div className={`absolute top-full left-0 w-full mt-2 rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#2C2C2E] border-0 text-white' : dropdownBg}`}>
                                                {suggestions.map((s, i) => (
                                                    <div 
                                                        key={i} 
                                                        onPointerDown={(e) => e.preventDefault()} 
                                                        onClick={() => { 
                                                            // Ставим пробел после улицы, чтобы клиент сразу набрал номер дома
                                                            setAddress(s.formatted + (s.address?.house_number ? '' : ' ')); 
                                                            setCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) }); 
                                                            setOpenDropdown(null);
                                                            setShowSuggestions(false);
                                                        }} 
                                                        className={`p-4 text-xs font-medium cursor-pointer border-b last:border-0 transition-colors ${isDark ? 'border-white/5 hover:bg-white/10 text-gray-300' : 'border-gray-50 hover:bg-gray-50 text-gray-700'}`}
                                                    >
                                                        {s.formatted}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {coords && !isAddressDropdownOpen && (
                                        <div className={`w-full h-32 rounded-xl overflow-hidden border shadow-sm animate-in zoom-in-95 duration-300 pointer-events-none ${isDark ? 'border-0 opacity-80' : 'border-gray-200'}`}>
                                            <iframe
                                                title="osm-map-exchange"
                                                width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0"
                                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(coords.lon)-0.005},${parseFloat(coords.lat)-0.005},${parseFloat(coords.lon)+0.005},${parseFloat(coords.lat)+0.005}&layer=mapnik&marker=${parseFloat(coords.lat)},${parseFloat(coords.lon)}`}
                                                style={{ filter: isDark ? 'invert(90%) hue-rotate(180deg) contrast(85%)' : 'none' }}
                                            ></iframe>
                                        </div>
                                    )}

                                    <div className={`flex gap-3 relative ${isDateDropdownOpen ? 'z-[50]' : 'z-10'}`} data-delivery-dropdown>
                                        <div className="flex-1 relative">
                                            <div role="button" tabIndex={0} onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')} className={`p-4 rounded-xl flex justify-between items-center cursor-pointer border transition-all touch-manipulation ${isDark ? 'bg-white/5 border-0 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200'}`}>
                                                <span className={`text-sm font-bold ${selectedDate ? textMain : textSec}`}>{selectedDate ? selectedDate.label : t('del_date')}</span> <Calendar size={18} className={textSec}/>
                                            </div>
                                            {openDropdown === 'date' && (
                                                <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-xl border overflow-hidden z-[60] ${isDark ? 'bg-[#2C2C2E] border-0 text-white' : dropdownBg}`}>
                                                    {availableDates.length === 0 ? (
                                                        <div className={`p-4 text-sm font-medium ${textSec}`}>{t('del_no_slots')}</div>
                                                    ) : availableDates.map(d => (
                                                        <div
                                                            key={d.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            onPointerDown={(e) => e.preventDefault()}
                                                            onClick={() => { setSelectedDate(d); setSelectedTimeSlot(null); setSelectedTimeSlotId(null); setOpenDropdown(null); }}
                                                            className={`p-4 text-sm font-medium cursor-pointer transition-colors touch-manipulation ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-50 text-gray-900'}`}
                                                        >{d.label}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 relative">
                                            <div role="button" tabIndex={0} onClick={() => selectedDate && setOpenDropdown(openDropdown === 'time' ? null : 'time')} className={`p-4 rounded-xl flex justify-between items-center cursor-pointer border transition-all touch-manipulation ${!selectedDate ? 'opacity-50 pointer-events-none' : ''} ${isDark ? 'bg-white/5 border-0 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200'}`}>
                                                <span className={`text-sm font-bold ${selectedTimeSlot ? textMain : textSec}`}>{selectedTimeSlot || t('del_time')}</span> <ArrowDown size={18} className={textSec}/>
                                            </div>
                                            {openDropdown === 'time' && selectedDate && (
                                                <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-xl border overflow-hidden max-h-56 overflow-y-auto custom-scroll z-[60] ${isDark ? 'bg-[#2C2C2E] border-0 text-white' : dropdownBg}`}>
                                                    {(() => {
                                                        const isToday = selectedDate.id === localDateId();
                                                        const items = [];
                                                        const currentHour = new Date().getHours();
                                                        if (isToday && currentHour < 20) {
                                                            items.push({ id: EXPRESS_SLOT_ID, label: t('del_express'), express: true });
                                                        }
                                                        TIME_SLOTS.filter((slot) => {
                                                            if (!isToday) return true;
                                                            return currentHour < slot.start;
                                                        }).forEach((s) =>
                                                            items.push({ id: s.id, label: s.label, express: false })
                                                        );
                                                        return items.map((s) => (
                                                            <div
                                                                key={s.id}
                                                                role="button"
                                                                tabIndex={0}
                                                                onPointerDown={(e) => e.preventDefault()}
                                                                onClick={() => {
                                                                    setSelectedTimeSlot(s.label);
                                                                    setSelectedTimeSlotId(s.id);
                                                                    setOpenDropdown(null);
                                                                }}
                                                                className={`p-4 text-sm font-medium cursor-pointer transition-colors touch-manipulation border-b last:border-0 ${s.express ? (isDark ? 'border-white/10 bg-orange-500/10 text-orange-300' : 'border-gray-100 bg-orange-50 text-orange-700') : ''} ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-50 text-gray-900'}`}
                                                            >
                                                                {s.label}
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {hasCardTransfer && (
                        <div className={`space-y-3 animate-in fade-in ${isOnlyCardTransfer ? '' : `pt-6 mt-6 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}`}>
                            <label className="text-xs font-bold uppercase opacity-50 ml-1">
                                {language === 'ru' ? 'Реквизиты для получения ARS' : 'Account Details for ARS'}
                            </label>
                            <div className="flex flex-col gap-2">
                                <input 
                                    type="text"
                                    inputMode="text"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    value={cardAccount} 
                                    onChange={(e) => {
                                        const val = e.target.value.trim();
                                        if (/^\d+$/.test(val) && val.length > 22) return;
                                        setCardAccount(val);
                                    }} 
                                    placeholder={language === 'ru' ? 'Вставьте CBU, CVU или Alias' : 'Paste CBU, CVU or Alias'} 
                                    className={`w-full p-4 rounded-2xl font-bold outline-none border transition-colors ${
                                        isDark
                                            ? 'bg-white/5 border-0 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/20'
                                            : 'bg-gray-50 border-gray-100 text-slate-900 shadow-sm focus:bg-white focus:border-emerald-500/50'
                                    } ${
                                        isCardAccountError
                                            ? 'border-red-500 focus:border-red-500 text-red-500 bg-red-500/5'
                                            : ''
                                    }`} 
                                />
                                {cardAccount.length > 2 && (
                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-[2rem] animate-in slide-in-from-top-1 border ${
                                        isCardAccountError 
                                            ? (isDark ? 'bg-red-500/10 border-0 text-red-500' : 'bg-red-50 border-red-200 text-red-500') 
                                            : (isDark ? 'bg-emerald-500/10 border-0 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
                                    }`}>
                                        {isCardAccountError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                                        <span className="text-[11px] font-black uppercase tracking-wider">
                                            {/^\d+$/.test(cardAccount) 
                                                ? (isCardAccountError ? (language === 'ru' ? "CBU/CVU: нужно 22 цифры" : "CBU/CVU: 22 digits required") : "CBU / CVU") 
                                                : "Alias"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )}

        {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right">
                <div className={`${exchangeCardBg} rounded-[2rem] p-6 shadow-xl space-y-6`}>
                    <h2 className="text-xl font-black">{t('ord_title_3')}</h2>
                    
                    <div className="space-y-4">
                        {orderBonusState.displayOrders.map((order, idx) => {
                            const getDisplay =
                                order.get === 'ARS' || order.get === 'ARS_CARD'
                                    ? `${Math.floor(order.displayGet).toLocaleString('ru-RU')} ${order.get}`
                                    : order.remainderDisplay
                                      ? `${order.displayGet} ${order.get}`
                                      : `${formatPayAmount(order.displayGet)} ${order.get}`;

                            return (
                                <div key={order.id} className={`p-4 rounded-xl flex flex-col gap-1 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('ord_deal_n')} {idx + 1}</div>
                                    <div className="flex items-center gap-3 font-black text-lg flex-wrap">
                                        
                                        <span>{formatPayAmount(order.displayGive)} {order.give}</span>
                                        <span className={isDark ? 'text-[#D0FD00]' : 'text-orange-500'}>→</span>
                                        
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span>{getDisplay}</span>
                                            
                                            {order.remainderDisplay && (
                                                <span className={`text-sm px-2 py-1 rounded-lg ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {order.remainderDisplay}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {order.bonusNote?.type === 'give_deduct' && (
                                        <div className={`text-xs font-bold mt-1 ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                                            *{' '}
                                            {language === 'ru'
                                                ? `Списано бонусов: −${formatPayAmount(order.bonusNote.giveAmount)} ${order.bonusNote.giveCurrency} (${order.bonusNote.arsAmount.toLocaleString('ru-RU')} ARS по курсу)`
                                                : `Bonuses applied: −${formatPayAmount(order.bonusNote.giveAmount)} ${order.bonusNote.giveCurrency}`}
                                        </div>
                                    )}

                                   {(order.isFeeDeductedFromARS || order.isARSDeducted || order.deliveryFeeDeductedARS > 0 || order.deliveryFeeAddedGive > 0) && (
                                        <div className={`text-xs font-bold mt-2 space-y-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                                            {order.isFeeDeductedFromARS && (
                                                <div>
                                                    * {({ 
                                                        ru: `Комиссия (${order.activeFeePercent}%) удержана из суммы в песо`, 
                                                        en: `Fee (${order.activeFeePercent}%) deducted from ARS amount`, 
                                                        es: `Comisión (${order.activeFeePercent}%) deducida del monto en ARS`, 
                                                        pt: `Taxa (${order.activeFeePercent}%) deduzida do valor em ARS`, 
                                                        zh: `手续费 (${order.activeFeePercent}%) 已从比索金额中扣除` 
                                                    })[language?.toLowerCase()] || `Fee (${order.activeFeePercent}%) deducted from ARS amount`}
                                                </div>
                                            )}
                                            {order.isARSDeducted && (
                                                <div>
                                                    * {({ 
                                                        ru: `Включает вычет комиссии (${order.activeFeePercent}%): -${order.crossFeeARS.toLocaleString('ru-RU')} ARS`, 
                                                        en: `Includes fee deduction (${order.activeFeePercent}%): -${order.crossFeeARS.toLocaleString('ru-RU')} ARS`, 
                                                        es: `Incluye deducción de comisión (${order.activeFeePercent}%): -${order.crossFeeARS.toLocaleString('ru-RU')} ARS`, 
                                                        pt: `Inclui dedução de taxa (${order.activeFeePercent}%): -${order.crossFeeARS.toLocaleString('ru-RU')} ARS`, 
                                                        zh: `包含手续费扣除 (${order.activeFeePercent}%): -${order.crossFeeARS.toLocaleString('ru-RU')} ARS` 
                                                    })[language?.toLowerCase()] || `Includes fee deduction (${order.activeFeePercent}%): -${order.crossFeeARS.toLocaleString('ru-RU')} ARS`}
                                                </div>
                                            )}
                                            {order.deliveryFeeDeductedARS > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <Package size={12}/> 
                                                    {({ 
                                                        ru: 'Оплата доставки удержана из песо', 
                                                        en: 'Delivery fee deducted from ARS', 
                                                        es: 'Costo de envío deducido de los pesos', 
                                                        pt: 'Taxa de entrega deduzida dos pesos', 
                                                        zh: '配送费已从比索中扣除' 
                                                    })[language?.toLowerCase()] || 'Delivery fee deducted from ARS'}
                                                </div>
                                            )}
                                            {order.deliveryFeeAddedGive > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <Package size={12}/> 
                                                    {({ 
                                                        ru: 'Оплата доставки включена в сумму', 
                                                        en: 'Delivery fee included in the amount', 
                                                        es: 'Costo de envío incluido en el monto', 
                                                        pt: 'Taxa de entrega incluída no valor', 
                                                        zh: '配送费已包含在总额中' 
                                                    })[language?.toLowerCase()] || 'Delivery fee included in the amount'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className={`h-[1px] ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                    
                    {bonuses > 0 && (
                        <div
                            role="button"
                            tabIndex={0}
                            data-bonus-toggle
                            onPointerDown={(e) => {
                                e.preventDefault();
                                setUseBonuses((v) => !v);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setUseBonuses((v) => !v);
                                }
                            }}
                            className={`p-4 rounded-xl flex items-center justify-between cursor-pointer border transition-all touch-manipulation select-none ${useBonuses ? (isDark ? 'border-0 bg-white/5' : 'border-black/10 bg-gray-50') : (isDark ? 'bg-white/5 border-0' : 'bg-gray-50 border-gray-100')}`}
                        >
                            <div className="flex items-center gap-3 pointer-events-none min-w-0">
                                <div className={`p-2 rounded-full shadow-sm shrink-0 ${isDark ? 'bg-[#D0FD00] text-black' : 'bg-black text-white'}`}>
                                    <Gift size={16} strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold">{t('ord_bonus_use')}</div>
                                    <div className="text-xs opacity-60">{t('ord_bonus_avail')} {bonuses}</div>
                                </div>
                            </div>
                            <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all pointer-events-none ${
                                    useBonuses
                                        ? isDark
                                            ? 'bg-white border-white text-black'
                                            : 'bg-black border-black text-white'
                                        : isDark
                                          ? 'border-white/35 bg-transparent'
                                          : 'border-gray-300 bg-transparent'
                                }`}
                            >
                                {useBonuses ? (
                                    <Check size={14} strokeWidth={3} className="block" />
                                ) : null}
                            </div>
                        </div>
                    )}
                    {useBonuses && orderBonusState.bonusAppliedArs > 0 && (
                        <p className={`text-xs font-bold -mt-2 px-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {t('ord_bonus_added')} {orderBonusState.bonusAppliedArs.toLocaleString('ru-RU')}{' '}
                            {orderBonusState.bonusMode === 'give'
                                ? language === 'ru'
                                    ? 'бонусов будет вычтено из суммы к оплате (по курсу USDT)'
                                    : language === 'es'
                                      ? 'bonos se descontarán del monto a pagar (según cotización USDT)'
                                      : language === 'pt'
                                        ? 'bônus serão descontados do valor a pagar (cotação USDT)'
                                        : language === 'zh'
                                          ? '积分将从应付金额中扣除（按USDT汇率）'
                                          : 'bonuses will be deducted from the amount to pay (USDT rate)'
                                : language === 'ru'
                                  ? 'бонусов к сумме в песо'
                                  : language === 'es'
                                    ? 'bonos al monto en ARS'
                                    : language === 'pt'
                                      ? 'bônus ao valor em ARS'
                                      : language === 'zh'
                                        ? '积分至比索金额'
                                        : 'bonuses to ARS amount'}
                        </p>
                    )}

                    {/* ПРЕМИАЛЬНЫЙ БЛОК КЭШБЭКА В ЧЕКЕ (ШАГ 3) */}
                    {expectedCashback > 0 && (
                        <div className={`flex items-center justify-between ${isDark ? 'py-2' : 'p-4 rounded-xl border border-dashed bg-emerald-50/50 border-emerald-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[#D0FD00] text-black' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <Coins size={16} strokeWidth={2.5} />
                                </div>
                                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-emerald-700'}`}>
                                    {language === 'ru' ? 'Кэшбэк за заказ' : 'Cashback for order'}
                                </span>
                            </div>
                            <span className={`text-base font-black ${isDark ? 'text-white' : 'text-emerald-600'}`}>
                                +{expectedCashback.toLocaleString('ru-RU')} ARS
                            </span>
                        </div>
                    )}

                    <div className={`h-[1px] ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                    
                    <div className="flex justify-between items-end">
                        <div>
                            <div className={`text-xs font-bold uppercase mb-2 ${textSec}`}>{t('ord_sum')}</div>
                            <div className="flex flex-col gap-1">
                                {Object.keys(totalsToPay).length > 0 ? (
                                    Object.entries(totalsToPay).map(([currency, amount]) => (
                                        <div key={currency} className="text-2xl font-black">
                                            {formatPayAmount(amount)} <span className="text-lg opacity-50">{currency}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-2xl font-black">0.00</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className={`${exchangeCardBg} rounded-[2rem] p-6 shadow-xl`}>
            <div className="flex justify-center gap-2 mb-6">
                <div className={`h-1.5 rounded-full transition-all ${step === 1 ? (isDark ? 'w-8 bg-white' : 'w-8 bg-black') : (isDark ? 'w-1.5 bg-white/20' : 'w-1.5 bg-gray-200')}`}></div>
                <div className={`h-1.5 rounded-full transition-all ${step === 2 ? (isDark ? 'w-8 bg-white' : 'w-8 bg-black') : (isDark ? 'w-1.5 bg-white/20' : 'w-1.5 bg-gray-200')}`}></div>
                <div className={`h-1.5 rounded-full transition-all ${step === 3 ? (isDark ? 'w-8 bg-white' : 'w-8 bg-black') : (isDark ? 'w-1.5 bg-white/20' : 'w-1.5 bg-gray-200')}`}></div>
            </div>
            <button
                type="button"
                disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                onPointerDown={handleMainCtaPointerDown}
                className={`w-full py-4 rounded-full font-black shadow-lg transition-all active:scale-95 mb-2 touch-manipulation ${((step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || step === 3) ? (isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800') : 'bg-gray-500/20 text-gray-500 cursor-not-allowed shadow-none'}`}
            >
                {step === 1 && t('ord_btn_1')}
                {step === 2 && t('ord_btn_2')}
                {step === 3 && t('ord_btn_3')}
            </button>
            {step > 1 && (<button onClick={prevStep} className={`w-full py-4 rounded-full font-bold transition-all active:scale-95 ${isDark ? 'text-white/70 hover:text-white hover:bg-white/5' : 'text-black/70 hover:text-black hover:bg-gray-50'}`}>{t('back')}</button>)}
        </div>
    </div>
  );

  const renderDeliveries = () => (
      <div className="flex flex-col px-4 pt-0 pb-24">
          <h1 className="text-2xl font-black tracking-tighter mb-4 px-2">{t('nav_history')}</h1>
          {orderHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-50 pb-20">
                  <Package size={64} className={`mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                  <p className="text-sm font-medium">{t('del_empty')}</p>
              </div>
          ) : (
              <div className="space-y-4">
                  {orderHistory.map((order) => (
                      <OrderHistoryCard key={order.id} order={order} isDark={isDark} language={language} />
                  ))}
              </div>
          )}
      </div>
  );

  return (
    <div className={`app-shell relative flex flex-col items-center justify-start font-sans transition-colors duration-500 ${bgMain}`}>
      <style>{`
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className={`w-full max-w-md flex-1 min-h-0 flex flex-col ${textMain} relative touch-pan-y`}
        onTouchStart={handleNavTouchStart}
        onTouchEnd={handleNavTouchEnd}
        onTouchCancel={handleNavTouchEnd}
      >
        <div className="app-safe-spacer" aria-hidden />
        <div className="app-tab-viewport flex-1 min-h-0">
            <div
                className="app-tab-track h-full"
                style={{
                    width: `${APP_NAV_TABS.length * 100}%`,
                    transform: `translateX(-${activeTabIndex * tabPanelPct}%)`,
                }}
            >
                {APP_NAV_TABS.map((tab) => (
                    <div
                        key={tab}
                        className="app-tab-panel h-full min-h-0"
                        style={{ width: `${tabPanelPct}%` }}
                        aria-hidden={activeTab !== tab}
                    >
                        {tab === 'services' ? (
                            <div className="app-services-shell h-full">
                                <RenderServices />
                            </div>
                        ) : (
                            <div className="app-main-scroll h-full">
                                {tab === 'home' && renderHome()}
                                {tab === 'create' && renderCreateOrder()}
                                {tab === 'deliveries' && renderDeliveries()}
                                {tab === 'profile' && <RenderProfile />}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {showSuccess && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1500] flex items-center justify-center p-4 animate-in fade-in">
                <div className={`${cardBg} rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl border-none`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto ${isDark ? 'bg-[#D0FD00] text-black' : 'bg-emerald-500/20 text-emerald-500'}`}><CheckCircle size={40}/></div>
                    <h2 className={`text-3xl font-black mb-2 ${textMain}`}>{t('success_title')}</h2>
                    <p className={`font-medium mb-8 ${textSec}`}>{t('success_desc')}</p>
                    <button onClick={closeSuccessModal} className={`w-full font-bold py-4 rounded-full transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}>{t('btn_ok')}</button>
                </div>
            </div>
        )}
      </div>

      <div className={`app-bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-[2rem] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t z-[1000] flex justify-around items-center pt-4 ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-gray-100'}`}>
          <button onClick={() => goToTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? (isDark ? 'text-[#D0FD00]' : 'text-orange-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
              <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} /> <span className="text-[10px] font-bold">{t('nav_home')}</span>
          </button>
          
          <button onClick={() => goToTab('services')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'services' ? (isDark ? 'text-[#D0FD00]' : 'text-orange-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
              <LayoutGrid size={24} strokeWidth={activeTab === 'services' ? 2.5 : 2} /> <span className="text-[10px] font-bold">{t('nav_services')}</span>
          </button>

          <button onClick={() => goToTab('create')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'create' ? (isDark ? 'text-[#D0FD00]' : 'text-orange-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
              <PlusCircle size={24} strokeWidth={activeTab === 'create' ? 2.5 : 2} /> <span className="text-[10px] font-bold">{t('nav_create')}</span>
          </button>
          
          <button onClick={() => goToTab('deliveries')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'deliveries' ? (isDark ? 'text-[#D0FD00]' : 'text-orange-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
              <Package size={24} strokeWidth={activeTab === 'deliveries' ? 2.5 : 2} /> <span className="text-[10px] font-bold">{t('nav_history')}</span>
          </button>
          
          <button onClick={() => goToTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? (isDark ? 'text-[#D0FD00]' : 'text-orange-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
              <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} /> <span className="text-[10px] font-bold">{t('nav_profile')}</span>
          </button>
      </div>
    </div>
  );
};

export default ExchangeApp;
export { useExchangeStore };

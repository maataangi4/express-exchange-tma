const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'wallets.json');
const WELCOME_BONUSES = 500;
const REFERRER_REWARD = 1500;
const REFERRED_REWARD = 500;
/** 0 = без лимита — история услуг и обменов хранится полностью */
const MAX_ORDER_HISTORY = 0;
const SUPPORTED_LANGS = new Set(['ru', 'en', 'es', 'pt', 'zh']);
const DEFAULT_CASHBACK_CARD = 'express_exchange';
const VALID_CASHBACK_CARDS = new Set([
  'classic',
  'express_exchange',
  'steve_29636885',
  'mahmoud_31622918',
  'daniel_35787318',
  'mahmoud_32624441',
  'steve_12824637',
  'steve_15010368',
]);
const LEGACY_CASHBACK_CARD_ALIASES = {
  marina_6614883: 'express_exchange',
};

/** @type {Record<string, object>} */
let wallets = {};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      wallets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('walletStore load:', e.message);
    wallets = {};
  }
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2), 'utf8');
}

function normalizeId(telegramUserId) {
  if (telegramUserId == null || telegramUserId === '') return null;
  return String(telegramUserId);
}

function normLang(lang) {
  const l = String(lang || 'ru').toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.has(l) ? l : 'ru';
}

function normCashbackCard(id) {
  if (id == null || id === '') return DEFAULT_CASHBACK_CARD;
  const s = LEGACY_CASHBACK_CARD_ALIASES[String(id)] || String(id);
  return VALID_CASHBACK_CARDS.has(s) ? s : DEFAULT_CASHBACK_CARD;
}

function ensureAccountFields(w) {
  if (!w) return w;
  if (w.theme !== 'dark' && w.theme !== 'light') w.theme = 'dark';
  if (w.themeCustomized !== true) w.themeCustomized = false;
  if (!w.language) w.language = 'ru';
  if (w.botNotifications === undefined) w.botNotifications = true;
  if (!Array.isArray(w.orderHistory)) w.orderHistory = [];
  w.cashbackCard = normCashbackCard(w.cashbackCard);
  if (w.referredBy != null && w.referralRewardPaid === undefined) {
    w.referralRewardPaid = true;
  }
  if (w.referredBy != null && w.referralPending === undefined) {
    w.referralPending = !w.referralRewardPaid;
  }
  return w;
}

function subtractBonusesUpTo(telegramUserId, amount) {
  const id = normalizeId(telegramUserId);
  const deduct = Math.max(0, Math.floor(Number(amount) || 0));
  if (!id || deduct <= 0) return { reversed: 0, shortfall: 0, bonuses: wallets[id]?.bonuses ?? 0 };

  const w = getOrCreate(id);
  const reversed = Math.min(w.bonuses, deduct);
  w.bonuses -= reversed;
  const shortfall = deduct - reversed;
  w.updatedAt = new Date().toISOString();
  save();
  return { reversed, shortfall, bonuses: w.bonuses };
}

/** ref_123456789 или просто 123456789 */
function parseReferrerId(referrerCode) {
  if (referrerCode == null || referrerCode === '') return null;
  const s = String(referrerCode).trim();
  const m = s.match(/^ref_(\d+)$/i);
  if (m) return m[1];
  if (/^\d+$/.test(s)) return s;
  return null;
}

function accountPayload(telegramUserId) {
  const id = normalizeId(telegramUserId);
  const w = ensureAccountFields(wallets[id]);
  if (!w) return null;
  return {
    telegramUserId: id,
    bonuses: w.bonuses,
    friendsInvited: w.friendsInvited || 0,
    theme: w.theme,
    themeCustomized: w.themeCustomized === true,
    language: w.language,
    botNotifications: w.botNotifications !== false,
    cashbackCard: w.cashbackCard || DEFAULT_CASHBACK_CARD,
    orderHistory: w.orderHistory,
  };
}

/**
 * Новый пользователь по реферальной ссылке: только привязка referredBy.
 * Бонусы (500 другу, 1500 пригласившему) — после первого подтверждённого заказа друга.
 */
function registerReferral(newUserId, referrerCode) {
  const newId = normalizeId(newUserId);
  const refId = parseReferrerId(referrerCode);
  if (!newId || !refId) return { ok: false, reason: 'invalid' };
  if (newId === refId) return { ok: false, reason: 'self_referral' };

  getOrCreate(refId);
  const refWallet = ensureAccountFields(wallets[refId]);

  /** A пригласил B — B не может пригласить A за бонусы */
  if (refWallet?.referredBy === newId) {
    console.log(`👥 Реферал отклонён (взаимное): ${newId} → ${refId}, уже ${refId} ← ${newId}`);
    return { ok: false, reason: 'circular_referral' };
  }

  const existing = wallets[newId];
  if (existing) {
    if (existing.referredBy) {
      return { ok: false, reason: 'already_referred' };
    }
    console.log(`👥 Реферал отклонён (уже в системе): ${newId} ← ${refId}`);
    return { ok: false, reason: 'existing_user' };
  }

  wallets[newId] = {
    bonuses: 0,
    friendsInvited: 0,
    welcomeGranted: false,
    referredBy: refId,
    referralPending: true,
    referralRewardPaid: false,
    referralRewardOrderId: null,
    theme: 'dark',
    themeCustomized: false,
    language: 'ru',
    botNotifications: true,
    orderHistory: [],
    updatedAt: new Date().toISOString(),
  };
  save();

  console.log(`👥 Реферал привязан: ${newId} ← ${refId} (бонусы после подтверждения заказа)`);

  return {
    ok: true,
    reason: 'registered',
    referrerRewarded: false,
    referrerBonus: 0,
    ...accountPayload(newId),
  };
}

/**
 * Первый подтверждённый заказ приглашённого: +500 другу, +1500 пригласившему, friendsInvited++.
 */
function tryCompleteReferralOnFirstApprovedOrder(telegramUserId, orderId) {
  const id = normalizeId(telegramUserId);
  const oid = orderId != null ? String(orderId) : '';
  if (!id || !oid) return { ok: false, reason: 'invalid' };

  const w = ensureAccountFields(wallets[id]);
  if (!w) return { ok: false, reason: 'no_wallet' };
  if (!w.referredBy) return { ok: false, reason: 'no_referrer' };
  if (w.referralRewardPaid) return { ok: false, reason: 'already_paid' };

  const refId = w.referredBy;
  getOrCreate(refId);
  const refWallet = wallets[refId];

  const referredAdd = addBonuses(id, REFERRED_REWARD);
  const referrerAdd = addBonuses(refId, REFERRER_REWARD);
  if (!referredAdd.ok || !referrerAdd.ok) {
    return { ok: false, reason: 'bonus_failed' };
  }

  refWallet.friendsInvited = (refWallet.friendsInvited || 0) + 1;
  w.referralRewardPaid = true;
  w.referralPending = false;
  w.referralRewardOrderId = oid;
  w.updatedAt = new Date().toISOString();
  refWallet.updatedAt = new Date().toISOString();
  save();

  console.log(
    `👥 Реферал выплачен по заказу ${oid}: ${id} +${REFERRED_REWARD}, ${refId} +${REFERRER_REWARD} (friends=${refWallet.friendsInvited})`
  );

  return {
    ok: true,
    reason: 'paid',
    orderId: oid,
    referredId: id,
    referrerId: refId,
    referredBonus: REFERRED_REWARD,
    referrerBonus: REFERRER_REWARD,
    referredBonuses: referredAdd.bonuses,
    referrerBonuses: referrerAdd.bonuses,
  };
}

/**
 * Отмена заказа после подтверждения: если по нему была рефералка — откат, можно начислить снова при следующем заказе.
 */
function revokeReferralRewardIfOrderRevoked(telegramUserId, orderId) {
  const id = normalizeId(telegramUserId);
  const oid = orderId != null ? String(orderId) : '';
  if (!id || !oid) return { ok: false, reason: 'invalid' };

  const w = ensureAccountFields(wallets[id]);
  if (!w?.referralRewardPaid || w.referralRewardOrderId !== oid) {
    return { ok: false, reason: 'skip' };
  }

  const refId = w.referredBy;
  const refWallet = refId ? ensureAccountFields(wallets[refId]) : null;

  const referredRev = subtractBonusesUpTo(id, REFERRED_REWARD);
  let referrerRev = { reversed: 0, shortfall: 0 };
  if (refId) {
    referrerRev = subtractBonusesUpTo(refId, REFERRER_REWARD);
    if (refWallet) {
      refWallet.friendsInvited = Math.max(0, (refWallet.friendsInvited || 0) - 1);
      refWallet.updatedAt = new Date().toISOString();
    }
  }

  w.referralRewardPaid = false;
  w.referralPending = true;
  w.referralRewardOrderId = null;
  w.updatedAt = new Date().toISOString();
  save();

  console.log(
    `👥 Реферал откат по ${oid}: ${id} −${referredRev.reversed}, ${refId || '—'} −${referrerRev.reversed} (можно начислить снова)`
  );

  return {
    ok: true,
    reason: 'revoked',
    orderId: oid,
    referredReversed: referredRev.reversed,
    referrerReversed: referrerRev.reversed,
    referredShortfall: referredRev.shortfall,
    referrerShortfall: referrerRev.shortfall,
  };
}

function getOrCreate(telegramUserId) {
  const id = normalizeId(telegramUserId);
  if (!id) return null;

  if (!wallets[id]) {
    wallets[id] = {
      bonuses: WELCOME_BONUSES,
      friendsInvited: 0,
      welcomeGranted: true,
      theme: 'dark',
      themeCustomized: false,
      language: 'ru',
      botNotifications: true,
      orderHistory: [],
      updatedAt: new Date().toISOString(),
    };
    save();
    console.log(`💰 Кошелёк создан: ${id} → ${WELCOME_BONUSES} бонусов`);
  }
  return ensureAccountFields(wallets[id]);
}

function getWallet(telegramUserId) {
  getOrCreate(telegramUserId);
  return accountPayload(telegramUserId);
}

function updateSettings(telegramUserId, { theme, language, botNotifications, cashbackCard, themeCustomized } = {}) {
  const id = normalizeId(telegramUserId);
  if (!id) return { ok: false, error: 'no_user' };
  const w = getOrCreate(id);
  if (theme === 'dark' || theme === 'light') {
    w.theme = theme;
    w.themeCustomized = true;
  }
  if (themeCustomized === true) w.themeCustomized = true;
  if (language != null) w.language = normLang(language);
  if (typeof botNotifications === 'boolean') w.botNotifications = botNotifications;
  if (cashbackCard != null) w.cashbackCard = normCashbackCard(cashbackCard);
  w.updatedAt = new Date().toISOString();
  save();
  return { ok: true, ...accountPayload(id) };
}

function shouldSendBotNotifications(telegramUserId) {
  const id = normalizeId(telegramUserId);
  if (!id || !wallets[id]) return true;
  return ensureAccountFields(wallets[id]).botNotifications !== false;
}

function sanitizeHistoryItem(item) {
  if (!item || !item.id) return null;
  const ts = item.timestamp
    ? typeof item.timestamp === 'string'
      ? item.timestamp
      : new Date(item.timestamp).toISOString()
    : new Date().toISOString();
  return {
    id: String(item.id),
    type: item.type === 'service' ? 'service' : 'exchange',
    status: item.status || 'pending',
    timestamp: ts,
    items: item.items || undefined,
    delivery: item.delivery || undefined,
    details: item.details || undefined,
  };
}

function appendOrderHistory(telegramUserId, item) {
  const id = normalizeId(telegramUserId);
  const entry = sanitizeHistoryItem(item);
  if (!id || !entry) return { ok: false, error: 'invalid_item' };

  const w = getOrCreate(id);
  const list = Array.isArray(w.orderHistory) ? w.orderHistory : [];
  if (!list.some((h) => h.id === entry.id)) {
    const merged = [entry, ...list];
    w.orderHistory = MAX_ORDER_HISTORY > 0 ? merged.slice(0, MAX_ORDER_HISTORY) : merged;
    w.updatedAt = new Date().toISOString();
    save();
    console.log(`📜 История: ${id} +${entry.id}`);
  }
  return { ok: true, ...accountPayload(id) };
}

/** pending | confirmed | cancelled | delivered */
function updateOrderHistoryStatus(telegramUserId, orderId, status) {
  const id = normalizeId(telegramUserId);
  const oid = String(orderId || '');
  const allowed = new Set(['pending', 'confirmed', 'cancelled', 'delivered']);
  const next = allowed.has(status) ? status : 'pending';
  if (!id || !oid) return { ok: false, error: 'invalid' };

  const w = getOrCreate(id);
  const list = Array.isArray(w.orderHistory) ? w.orderHistory : [];
  const idx = list.findIndex((h) => h && String(h.id) === oid);
  if (idx < 0) return { ok: false, error: 'not_found' };

  list[idx] = { ...list[idx], status: next };
  w.orderHistory = list;
  w.updatedAt = new Date().toISOString();
  save();
  console.log(`📜 История: ${id} #${oid} → ${next}`);
  return { ok: true, ...accountPayload(id) };
}

function deductBonuses(telegramUserId, amount) {
  const id = normalizeId(telegramUserId);
  if (!id) return { ok: false, error: 'no_user' };
  const deduct = Math.max(0, Math.floor(Number(amount) || 0));
  if (deduct <= 0) return { ok: true, ...getWallet(id), deducted: 0 };

  const w = getOrCreate(id);
  if (w.bonuses < deduct) {
    return { ok: false, error: 'insufficient_bonuses', bonuses: w.bonuses };
  }
  w.bonuses -= deduct;
  w.updatedAt = new Date().toISOString();
  save();
  console.log(`💰 ${id}: −${deduct} бонусов → ${w.bonuses}`);
  return { ok: true, ...getWallet(id), deducted: deduct };
}

function addBonuses(telegramUserId, amount) {
  const id = normalizeId(telegramUserId);
  if (!id) return { ok: false, error: 'no_user' };
  const add = Math.max(0, Math.floor(Number(amount) || 0));
  if (add <= 0) return { ok: true, ...getWallet(id), added: 0 };

  const w = getOrCreate(id);
  w.bonuses += add;
  w.updatedAt = new Date().toISOString();
  save();
  console.log(`💰 ${id}: +${add} бонусов → ${w.bonuses}`);
  return { ok: true, ...getWallet(id), added: add };
}

function refundBonuses(telegramUserId, amount) {
  return addBonuses(telegramUserId, amount);
}

function applyCashbackOnApprove(telegramUserId, cashbackEarned) {
  const added = addBonuses(telegramUserId, cashbackEarned);
  return { ...added, cashbackApplied: added.ok && (added.added || 0) > 0 };
}

function revokeAfterConfirm(
  telegramUserId,
  { cashbackEarned = 0, bonusesUsed = 0, cashbackApplied = false, bonusesDeducted = false, bonusesRefundedOnRevoke = false } = {}
) {
  const id = normalizeId(telegramUserId);
  if (!id) return { ok: false, error: 'no_user' };

  const w = getOrCreate(id);
  let cashbackReversed = 0;
  let cashbackShortfall = 0;
  let bonusesRefunded = 0;

  const cbAmount = Math.max(0, Math.floor(Number(cashbackEarned) || 0));
  if (cashbackApplied && cbAmount > 0) {
    cashbackReversed = Math.min(w.bonuses, cbAmount);
    w.bonuses -= cashbackReversed;
    cashbackShortfall = cbAmount - cashbackReversed;
    w.updatedAt = new Date().toISOString();
    save();
    console.log(
      `💰 ${id}: откат кэшбэка −${cashbackReversed}${cashbackShortfall > 0 ? ` (не хватило ${cashbackShortfall})` : ''} → ${w.bonuses}`
    );
  }

  const bonusAmount = Math.max(0, Math.floor(Number(bonusesUsed) || 0));
  if (bonusesDeducted && !bonusesRefundedOnRevoke && bonusAmount > 0) {
    w.bonuses += bonusAmount;
    bonusesRefunded = bonusAmount;
    w.updatedAt = new Date().toISOString();
    save();
    console.log(`💰 ${id}: возврат бонусов +${bonusAmount} → ${w.bonuses}`);
  }

  return {
    ok: true,
    ...getWallet(id),
    cashbackReversed,
    cashbackShortfall,
    bonusesRefunded,
  };
}

load();

module.exports = {
  getWallet,
  updateSettings,
  appendOrderHistory,
  updateOrderHistoryStatus,
  shouldSendBotNotifications,
  registerReferral,
  tryCompleteReferralOnFirstApprovedOrder,
  revokeReferralRewardIfOrderRevoked,
  parseReferrerId,
  deductBonuses,
  addBonuses,
  refundBonuses,
  applyCashbackOnApprove,
  revokeAfterConfirm,
  WELCOME_BONUSES,
  REFERRER_REWARD,
  REFERRED_REWARD,
};

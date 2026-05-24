/** Оформление карточки кэшбэка в кабинете (public/cashback-cards) */
export const DEFAULT_CASHBACK_CARD_ID = 'express_exchange';

export const CASHBACK_CARDS = [
  { id: 'classic', file: null, labelKey: 'card_classic' },
  { id: 'express_exchange', file: 'express-exchange.svg', labelKey: 'card_express_exchange' },
  { id: 'steve_29636885', file: 'steve-29636885.jpg', labelKey: 'card_steve_rings' },
  { id: 'mahmoud_31622918', file: 'mahmoud-31622918.jpg', labelKey: 'card_mahmoud_red' },
  { id: 'daniel_35787318', file: 'daniel-35787318.jpg', labelKey: 'card_daniel_wave' },
  { id: 'mahmoud_32624441', file: 'mahmoud-32624441.jpg', labelKey: 'card_mahmoud_purple' },
  { id: 'steve_12824637', file: 'steve-12824637.jpg', labelKey: 'card_steve_glow' },
  { id: 'steve_15010368', file: 'steve-15010368.jpg', labelKey: 'card_steve_amber' },
];

export const CASHBACK_CARD_IDS = new Set(CASHBACK_CARDS.map((c) => c.id));

const LEGACY_CARD_ALIASES = {
  marina_6614883: 'express_exchange',
};

export function cashbackCardImageUrl(id) {
  const item = CASHBACK_CARDS.find((c) => c.id === id);
  if (!item?.file) return null;
  const base = process.env.PUBLIC_URL || '';
  return `${base}/cashback-cards/${item.file}`;
}

export function normalizeCashbackCardId(id) {
  const raw = String(id || '').trim();
  const mapped = LEGACY_CARD_ALIASES[raw] || raw;
  return CASHBACK_CARD_IDS.has(mapped) ? mapped : DEFAULT_CASHBACK_CARD_ID;
}

export function getCashbackCard(id) {
  return CASHBACK_CARDS.find((c) => c.id === normalizeCashbackCardId(id)) || CASHBACK_CARDS[0];
}

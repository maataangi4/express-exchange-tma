import { apiUrl, getApiBase } from './apiBase';

const BONUS_KEY_PREFIX = 'ex_bonuses_';
const SETTINGS_KEY_PREFIX = 'ex_settings_';
const WELCOME_BONUSES = 500;

export const BONUS_USE_PER_ORDER = 100;

export function getBonusStorageKey(telegramUserId) {
  const id = telegramUserId != null ? String(telegramUserId) : 'guest';
  return `${BONUS_KEY_PREFIX}${id}`;
}

/** Локальный кэш (офлайн / пока грузится сервер). */
export function loadBonusesLocal(telegramUserId) {
  try {
    const key = getBonusStorageKey(telegramUserId);
    const raw = localStorage.getItem(key);
    if (raw === null) return WELCOME_BONUSES;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return WELCOME_BONUSES;
  }
}

export function saveBonusesLocal(telegramUserId, amount) {
  try {
    const key = getBonusStorageKey(telegramUserId);
    localStorage.setItem(key, String(Math.max(0, Math.floor(amount))));
  } catch {
    /* ignore */
  }
}

function getSettingsStorageKey(telegramUserId) {
  const id = telegramUserId != null ? String(telegramUserId) : 'guest';
  return `${SETTINGS_KEY_PREFIX}${id}`;
}

/** Локальный кэш настроек (тема, карточка кэшбэка и т.д.) — переживает быстрый выход из Mini App. */
export function loadUserSettingsLocal(telegramUserId) {
  try {
    const raw = localStorage.getItem(getSettingsStorageKey(telegramUserId));
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function saveUserSettingsLocal(telegramUserId, settings) {
  try {
    const key = getSettingsStorageKey(telegramUserId);
    const prev = loadUserSettingsLocal(telegramUserId);
    localStorage.setItem(key, JSON.stringify({ ...prev, ...settings }));
  } catch {
    /* ignore */
  }
}

/** URL для кошелька / регистрации в base (как курсы — с запасным :3001 на localhost). */
export function walletOpenUrls() {
  const primary = apiUrl('/api/user/open');
  const urls = [primary];
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    !process.env.REACT_APP_BOT_API_URL
  ) {
    const direct = 'http://127.0.0.1:3001/api/user/open';
    if (!urls.includes(direct)) urls.push(direct);
  }
  return urls;
}

/**
 * Открытие сессии: кошелёк + запись в Google Sheets «base» (первый визит).
 */
export async function fetchWalletFromServer(
  initData,
  telegramUserId = null,
  language = 'ru',
  startParam = null
) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  };
  if (initData) headers['X-Telegram-Init-Data'] = initData;

  const sp =
    startParam ||
    (typeof window !== 'undefined' &&
      window.Telegram?.WebApp?.initDataUnsafe?.start_param) ||
    null;

  const payload = {
    initData: initData || undefined,
    language: language || 'ru',
    startParam: sp || undefined,
    telegramUserId: !initData && telegramUserId != null ? telegramUserId : undefined,
  };

  let lastErr;
  for (const url of walletOpenUrls()) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        lastErr = new Error(data.error || `user/open ${res.status} @ ${getApiBase() || url}`);
        continue;
      }
      return {
        bonuses: data.bonuses ?? 0,
        friendsInvited: data.friendsInvited ?? 0,
        telegramUserId: data.telegramUserId,
        theme: data.theme === 'dark' ? 'dark' : 'light',
        themeCustomized: data.themeCustomized === true,
        language: data.language || 'ru',
        botNotifications: data.botNotifications !== false,
        cashbackCard: data.cashbackCard || 'classic',
        orderHistory: data.orderHistory || [],
        referral: data.referral || null,
        baseRegistered: Boolean(data.baseRegistered),
        baseSkipped: Boolean(data.baseSkipped),
        baseError: data.baseError || null,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('user/open failed');
}

export function parseOrderHistoryFromServer(list) {
  return (list || []).map((o) => ({
    ...o,
    timestamp: o.timestamp ? new Date(o.timestamp) : new Date(),
  }));
}

function accountApiUrls(path) {
  const primary = apiUrl(path);
  const urls = [primary];
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    !process.env.REACT_APP_BOT_API_URL
  ) {
    const direct = `http://127.0.0.1:3001${path}`;
    if (!urls.includes(direct)) urls.push(direct);
  }
  return urls;
}

async function postAccountApi(path, initData, telegramUserId, body) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  };
  if (initData) headers['X-Telegram-Init-Data'] = initData;

  const payload = {
    initData: initData || undefined,
    telegramUserId: !initData && telegramUserId != null ? telegramUserId : undefined,
    ...body,
  };

  let lastErr;
  for (const url of accountApiUrls(path)) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        lastErr = new Error(data.error || `${path} ${res.status}`);
        continue;
      }
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`${path} failed`);
}

export async function saveUserSettings(initData, telegramUserId, settings) {
  return postAccountApi('/api/user/settings', initData, telegramUserId, settings);
}

export async function saveUserHistoryItem(initData, telegramUserId, historyItem) {
  return postAccountApi('/api/user/history', initData, telegramUserId, { historyItem });
}

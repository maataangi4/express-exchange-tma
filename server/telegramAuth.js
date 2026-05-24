const crypto = require('crypto');

/**
 * Проверка Telegram WebApp initData.
 * @returns {{ id: number, first_name?: string, username?: string } | null}
 */
function validateInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (authDate > 0) {
      const ageSec = Math.floor(Date.now() / 1000) - authDate;
      if (ageSec > 86400) return null;
    }

    const pairs = [];
    for (const [key, value] of params.entries()) {
      if (key !== 'hash') pairs.push([key, value]);
    }
    pairs.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculated = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculated !== hash) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;
    const user = JSON.parse(userRaw);
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

function resolveTelegramUser({ initData, botToken, botTokens, body, allowDevId }) {
  const tokens = [
    ...new Set(
      [...(botTokens || []), botToken].filter(Boolean).map((t) => String(t).trim())
    ),
  ];

  for (const token of tokens) {
    const fromInit = validateInitData(initData, token);
    if (fromInit) return { user: fromInit, source: 'initData' };
  }

  if (allowDevId) {
    const id = body?.telegramUserId ?? body?.telegramUser?.id;
    if (id != null && String(id).match(/^\d+$/)) {
      return {
        user: body.telegramUser || { id: Number(id) },
        source: 'dev',
      };
    }
  }

  return null;
}

function getStartParamFromInitData(initData) {
  if (!initData) return null;
  try {
    return new URLSearchParams(initData).get('start_param') || null;
  } catch {
    return null;
  }
}

module.exports = { validateInitData, resolveTelegramUser, getStartParamFromInitData };

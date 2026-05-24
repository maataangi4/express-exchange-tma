/** Базовый URL API (:3001). Пусто = относительный путь + proxy в dev. */
export function getApiBase() {
  const fromEnv = (process.env.REACT_APP_BOT_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3001';
    }
  }

  return '';
}

export function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** URL для загрузки курсов: основной + запасной (localhost). */
export function ratesFetchUrls() {
  const primary = apiUrl('/api/rates');
  const urls = [primary];
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    !process.env.REACT_APP_BOT_API_URL
  ) {
    const direct = 'http://127.0.0.1:3001/api/rates';
    if (!urls.includes(direct)) urls.push(direct);
  }
  return urls;
}

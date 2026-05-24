const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rate-pair-history.json');
const MAX_POINTS = 64;

/** @type {{ pairs: Record<string, { values: number[], updatedAt: string }> }} */
let store = { pairs: {} };

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      store = { pairs: raw.pairs || {} };
    }
  } catch (e) {
    console.warn('ratesHistoryStore load:', e.message);
    store = { pairs: {} };
  }
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function normalizePairKey(key) {
  return String(key || '').trim();
}

function parseRate(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim().replace(/\s/g, '').replace(/\u2212/g, '-').replace(',', '.');
  if (s.includes('%')) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * При каждом чтении Excel: если курс пары изменился — добавляем точку в историю.
 * @param {Record<string, number>} pairDisplay
 */
function recordPairDisplay(pairDisplay = {}) {
  const now = new Date().toISOString();
  for (const [rawKey, rawVal] of Object.entries(pairDisplay)) {
    const key = normalizePairKey(rawKey);
    const rate = parseRate(rawVal);
    if (!key || rate == null) continue;

    const entry = store.pairs[key] || { values: [], updatedAt: now };
    const values = Array.isArray(entry.values) ? [...entry.values] : [];
    const last = values[values.length - 1];
    if (last !== rate) {
      values.push(rate);
      while (values.length > MAX_POINTS) values.shift();
    }
    store.pairs[key] = { values, updatedAt: now };
  }
  save();
}

/** @returns {Record<string, number[]>} */
function getPairHistoryMap() {
  const out = {};
  for (const [key, entry] of Object.entries(store.pairs)) {
    if (Array.isArray(entry.values) && entry.values.length > 0) {
      out[key] = [...entry.values];
    }
  }
  return out;
}

load();

module.exports = { recordPairDisplay, getPairHistoryMap, MAX_POINTS };

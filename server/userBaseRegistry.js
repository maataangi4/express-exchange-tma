const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const REGISTRY_FILE = path.join(DATA_DIR, 'base-registry.json');

/** @type {Record<string, { registeredAt: string }>} */
let registry = {};
/** @type {Set<string>} */
const inFlight = new Set();

function load() {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('userBaseRegistry load:', e.message);
    registry = {};
  }
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
}

function normalizeId(telegramUserId) {
  if (telegramUserId == null || telegramUserId === '') return null;
  return String(telegramUserId);
}

function isInRegistry(telegramUserId) {
  const id = normalizeId(telegramUserId);
  return id ? Boolean(registry[id]) : false;
}

function isRegistered(telegramUserId) {
  const id = normalizeId(telegramUserId);
  if (!id) return false;
  return Boolean(registry[id]) || inFlight.has(id);
}

/**
 * Резервируем id до записи в Sheets (защита от двух параллельных запросов).
 * @returns {boolean} true — можно писать в Excel
 */
function tryClaimRegistration(telegramUserId) {
  const id = normalizeId(telegramUserId);
  if (!id) return false;
  if (registry[id] || inFlight.has(id)) return false;
  inFlight.add(id);
  return true;
}

function commitRegistration(telegramUserId) {
  const id = normalizeId(telegramUserId);
  if (!id) return;
  inFlight.delete(id);
  registry[id] = { registeredAt: new Date().toISOString() };
  save();
}

function releaseClaim(telegramUserId) {
  const id = normalizeId(telegramUserId);
  if (id) inFlight.delete(id);
}

/** Пометить id без дублирования (синхронизация из Excel). */
function markRegistered(telegramUserId, { persist = true } = {}) {
  const id = normalizeId(telegramUserId);
  if (!id) return;
  if (!registry[id]) {
    registry[id] = { registeredAt: new Date().toISOString() };
  }
  inFlight.delete(id);
  if (persist) save();
}

function markManyRegistered(ids, { persist = true } = {}) {
  let added = 0;
  for (const raw of ids) {
    const id = normalizeId(raw);
    if (!id || registry[id]) continue;
    registry[id] = { registeredAt: new Date().toISOString() };
    inFlight.delete(id);
    added++;
  }
  if (persist && added > 0) save();
  return added;
}

load();

module.exports = {
  isRegistered,
  isInRegistry,
  tryClaimRegistration,
  commitRegistration,
  releaseClaim,
  markRegistered,
  markManyRegistered,
  save,
  normalizeId,
};

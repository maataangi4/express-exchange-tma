const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'pending-orders.json');

/** @type {Record<string, object>} */
let orders = {};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('ordersStore load:', e.message);
    orders = {};
  }
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function upsert(orderId, data) {
  orders[orderId] = { ...data, orderId, updatedAt: new Date().toISOString() };
  save();
  return orders[orderId];
}

function get(orderId) {
  return orders[orderId] || null;
}

function setStatus(orderId, status) {
  if (!orders[orderId]) return null;
  orders[orderId].status = status;
  orders[orderId].updatedAt = new Date().toISOString();
  save();
  return orders[orderId];
}

load();

module.exports = { upsert, get, setStatus };

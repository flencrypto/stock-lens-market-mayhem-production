'use strict';

const crypto = require('crypto');

function nowIso() {
  return new Date().toISOString();
}

function tradingDay(date = new Date()) {
  // UTC day keeps the game deterministic across Facebook surfaces and mobile/PWA installs.
  return date.toISOString().slice(0, 10);
}

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function hashNumber(input) {
  const hash = crypto.createHash('sha256').update(String(input)).digest();
  return hash.readUInt32BE(0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function round4(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function normaliseText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, 120) || fallback;
}

module.exports = {
  nowIso,
  tradingDay,
  uid,
  hashNumber,
  clamp,
  roundMoney,
  round4,
  safeJsonParse,
  normaliseText
};

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'db.json');

mkdirSync(DATA_DIR, { recursive: true });

function load() {
  if (!existsSync(DB_PATH)) return { marriages: [], kids: [], waterLogs: [], goals: {} };
  try {
    const data = JSON.parse(readFileSync(DB_PATH, 'utf8'));
    if (!data.goals) data.goals = {};
    if (!data.kids) data.kids = [];
    return data;
  } catch { return { marriages: [], kids: [], waterLogs: [], goals: {} }; }
}

function save(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const MAX_SPOUSES = 10;

export function getPartners(userId, guildId) {
  const db = load();
  return db.marriages
    .filter(m => m.guildId === guildId && (m.user1Id === userId || m.user2Id === userId))
    .map(m => ({ partnerId: m.user1Id === userId ? m.user2Id : m.user1Id, marriedAt: m.marriedAt }));
}

export function getPartnerCount(userId, guildId) {
  return getPartners(userId, guildId).length;
}

export function isMarriedTo(userId, partnerId, guildId) {
  const db = load();
  return db.marriages.some(m =>
    m.guildId === guildId &&
    ((m.user1Id === userId && m.user2Id === partnerId) ||
     (m.user1Id === partnerId && m.user2Id === userId))
  );
}

export function createMarriage(user1Id, user2Id, guildId) {
  const db = load();
  db.marriages.push({ user1Id, user2Id, guildId, marriedAt: new Date().toISOString() });
  save(db);
}

export function deleteMarriage(userId, partnerId, guildId) {
  const db = load();
  db.marriages = db.marriages.filter(m => !(
    m.guildId === guildId &&
    ((m.user1Id === userId && m.user2Id === partnerId) ||
     (m.user1Id === partnerId && m.user2Id === userId))
  ));
  save(db);
}

export function addKid(parent1Id, parent2Id, guildId, name) {
  const db = load();
  const id = Date.now().toString();
  db.kids.push({ id, parent1Id, parent2Id, guildId, name, bornAt: new Date().toISOString() });
  save(db);
  return id;
}

export function getKids(userId, guildId) {
  const db = load();
  return db.kids.filter(k => k.guildId === guildId && (k.parent1Id === userId || k.parent2Id === userId));
}

export function getKidsTogether(user1Id, user2Id, guildId) {
  const db = load();
  return db.kids.filter(k =>
    k.guildId === guildId &&
    ((k.parent1Id === user1Id && k.parent2Id === user2Id) ||
     (k.parent1Id === user2Id && k.parent2Id === user1Id))
  );
}

export const DEFAULT_GOAL_ML = 2000;

export function getGoal(userId) {
  const db = load();
  return db.goals[userId] ?? DEFAULT_GOAL_ML;
}

export function setGoal(userId, goalMl) {
  const db = load();
  db.goals[userId] = goalMl;
  save(db);
}

export function resetUserWater(userId, guildId) {
  const db = load();
  const today = todayStr();
  const before = db.waterLogs.length;
  db.waterLogs = db.waterLogs.filter(l =>
    !(l.userId === userId && l.guildId === guildId && l.loggedAt.slice(0, 10) === today)
  );
  save(db);
  return before - db.waterLogs.length;
}

export function resetAllWater(guildId) {
  const db = load();
  const today = todayStr();
  const before = db.waterLogs.length;
  db.waterLogs = db.waterLogs.filter(l =>
    !(l.guildId === guildId && l.loggedAt.slice(0, 10) === today)
  );
  save(db);
  return before - db.waterLogs.length;
}

export function logWater(userId, guildId, amountMl) {
  const db = load();
  db.waterLogs.push({ userId, guildId, amountMl, loggedAt: new Date().toISOString() });
  save(db);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getTodayTotal(userId, guildId) {
  const db = load();
  const today = todayStr();
  return db.waterLogs
    .filter(l => l.userId === userId && l.guildId === guildId && l.loggedAt.slice(0, 10) === today)
    .reduce((sum, l) => sum + l.amountMl, 0);
}

export function getDailyLeaderboard(guildId) {
  const db = load();
  const today = todayStr();
  const totals = {};
  db.waterLogs
    .filter(l => l.guildId === guildId && l.loggedAt.slice(0, 10) === today)
    .forEach(l => { totals[l.userId] = (totals[l.userId] ?? 0) + l.amountMl; });
  return Object.entries(totals)
    .map(([userId, total]) => ({ userId, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

export function getWeeklyLeaderboard(guildId) {
  const db = load();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const totals = {};
  db.waterLogs
    .filter(l => l.guildId === guildId && l.loggedAt >= cutoff)
    .forEach(l => { totals[l.userId] = (totals[l.userId] ?? 0) + l.amountMl; });
  return Object.entries(totals)
    .map(([userId, total]) => ({ userId, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

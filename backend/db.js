import fs from 'fs';
import path from 'path';
import { JSONFilePreset } from 'lowdb/node';
import { DB_PATH } from './config.js';

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const defaultData = {
  meta: {
    lastIndexedBlock: 0,
    lastHarvestBlock: 0,
    lastHarvestTimestamp: null,
    startedAt: new Date().toISOString()
  },
  validators: {},
  protocolStats: {
    totalMONManaged: 0,
    exchangeRate: 1.0,
    fmonSupply: 0,
    lastUpdated: new Date().toISOString()
  },
  alerts: []
};

let db;
let writeQueue = Promise.resolve();

const writeDB = async () => {
  const nextWrite = writeQueue.then(() => db.write(), () => db.write());
  writeQueue = nextWrite.catch(() => {});
  return nextWrite;
};

try {
  db = await JSONFilePreset(DB_PATH, defaultData);
} catch (err) {
  console.error('[Database] DB corrupted, resetting.', err);
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  db = await JSONFilePreset(DB_PATH, defaultData);
}

export const getDB = () => db;

export const getValidators = () => {
  return Object.values(db.data.validators || {});
};

export const getValidator = (id) => {
  return db.data.validators[id.toString()] || null;
};

export const upsertValidator = async (data) => {
  const idStr = data.validatorId.toString();
  const existing = db.data.validators[idStr] || {};
  
  db.data.validators[idStr] = {
    id: Number(data.validatorId),
    authAddress: data.authAddress || existing.authAddress || '0x0000000000000000000000000000000000000000',
    feeSharePct: data.feeSharePct !== undefined 
      ? data.feeSharePct 
      : (data.minFeeShareBps !== undefined ? Number(data.minFeeShareBps) / 100 : existing.feeSharePct || 0),
    totalShared: data.totalShared !== undefined 
      ? Number(data.totalShared) 
      : Number(existing.totalShared || 0),
    shareCount: data.shareCount !== undefined 
      ? Number(data.shareCount) 
      : Number(existing.shareCount || 0),
    lastShareTimestamp: data.lastShareTimestamp || existing.lastShareTimestamp || null,
    active: data.active !== undefined ? data.active : (existing.active !== undefined ? existing.active : true),
    registeredAt: data.registeredAt || existing.registeredAt || new Date().toISOString(),
    shareHistory: existing.shareHistory || []
  };
  await writeDB();
};

export const recordShareEvent = async (id, amount, txHash, blockNumber) => {
  const idStr = id.toString();
  const existing = db.data.validators[idStr] || {
    id: Number(id),
    authAddress: '0x0000000000000000000000000000000000000000',
    feeSharePct: 0,
    totalShared: 0,
    shareCount: 0,
    lastShareTimestamp: null,
    active: true,
    registeredAt: new Date().toISOString(),
    shareHistory: []
  };

  const amountNum = Number(amount);
  existing.totalShared = Number((Number(existing.totalShared || 0) + amountNum).toFixed(6));
  existing.shareCount = Number(existing.shareCount || 0) + 1;
  existing.lastShareTimestamp = new Date().toISOString();
  
  if (!existing.shareHistory) {
    existing.shareHistory = [];
  }
  existing.shareHistory.push({
    amount: amountNum,
    timestamp: new Date().toISOString(),
    txHash,
    blockNumber: Number(blockNumber)
  });

  db.data.validators[idStr] = existing;
  await writeDB();
};

export const updateProtocolStats = async (stats) => {
  db.data.protocolStats = {
    totalMONManaged: Number(stats.totalMONManaged || 0),
    exchangeRate: Number(stats.exchangeRate || 1.0),
    fmonSupply: Number(stats.fmonSupply || 0),
    lastUpdated: new Date().toISOString()
  };
  await writeDB();
};

export const getLastIndexedBlock = () => {
  return Number(db.data.meta.lastIndexedBlock || 0);
};

export const setLastIndexedBlock = async (n) => {
  db.data.meta.lastIndexedBlock = Number(n);
  await writeDB();
};

export const addAlert = async (alert) => {
  if (!db.data.alerts) {
    db.data.alerts = [];
  }
  db.data.alerts.push({
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString()
  });
  await writeDB();
};

export const getAlerts = () => {
  return db.data.alerts || [];
};

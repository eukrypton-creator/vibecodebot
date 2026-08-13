import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'data');
const dbFile = path.join(dataDir, 'licenses.json');

mkdirSync(dataDir, { recursive: true });

function load() {
  try {
    const raw = readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let licenses = load();

function save() {
  writeFileSync(dbFile, JSON.stringify(licenses, null, 2));
}

export function generateKey(adminKey, type, owner) {
  if (!['lifetime', 'monthly'].includes(type)) return { error: 'Invalid type. Use lifetime or monthly.' };

  const key = 'VIBE-' + crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g).join('-');
  licenses.push({
    key,
    type,
    owner: owner ?? null,
    hwid: null,
    banned: false,
    createdAt: Date.now(),
    expiresAt: type === 'monthly' ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
  });
  save();
  return { key };
}

export function verify(licenseKey, hwid) {
  if (!licenseKey || !hwid) return { ok: false, reason: 'missing_fields' };

  const entry = licenses.find((l) => l.key.toLowerCase() === licenseKey.trim().toLowerCase());
  if (!entry) return { ok: false, reason: 'key_not_found' };
  if (entry.banned) return { ok: false, reason: 'banned' };
  if (entry.expiresAt && Date.now() > entry.expiresAt) return { ok: false, reason: 'expired' };

  if (!entry.hwid) {
    entry.hwid = hwid;
    save();
    return { ok: true };
  }

  if (entry.hwid !== hwid) return { ok: false, reason: 'already_bound' };
  return { ok: true };
}

export function listKeys(adminKey) {
  return licenses.map(({ banned, createdAt, expiresAt, hwid, key, owner, type }) => ({
    key,
    type,
    owner,
    hwid,
    banned,
    createdAt,
    expiresAt,
  }));
}

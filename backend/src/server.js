import 'dotenv/config';
import express from 'express';
import { claimKey, findKeysByOwner, generateKey, listKeys, resetHwid, revokeKey, verify } from './db.js';

const { ADMIN_KEY, PORT = 3000 } = process.env;

if (!ADMIN_KEY) {
  console.warn('ADMIN_KEY is not set. Admin endpoints will be unavailable.');
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/verify', (req, res) => {
  const { licenseKey, key, hwid } = req.body ?? {};
  const result = verify(licenseKey ?? key, hwid);
  result.authorized = result.ok === true;
  res.json(result);
});

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return res.status(500).json({ error: 'ADMIN_KEY not configured on server.' });
  const { adminKey } = req.body ?? {};
  if (adminKey !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

app.post('/api/admin/generate', requireAdmin, (req, res) => {
  const { type, owner } = req.body ?? {};
  const result = generateKey(ADMIN_KEY, type, owner);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/admin/list', requireAdmin, (req, res) => {
  res.json({ keys: listKeys() });
});

app.post('/api/admin/lookup-user', requireAdmin, (req, res) => {
  const { discordId } = req.body ?? {};
  res.json(findKeysByOwner(discordId));
});

app.post('/api/admin/claim', requireAdmin, (req, res) => {
  const { key, discordId } = req.body ?? {};
  res.json(claimKey(key, discordId));
});

app.post('/api/admin/revoke', requireAdmin, (req, res) => {
  const { key } = req.body ?? {};
  res.json(revokeKey(key));
});

app.post('/api/admin/reset-hwid', requireAdmin, (req, res) => {
  const { key } = req.body ?? {};
  res.json(resetHwid(key));
});

app.listen(PORT, () => {
  console.log(`License backend listening on http://localhost:${PORT}`);
});

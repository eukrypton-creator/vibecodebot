import 'dotenv/config';
import express from 'express';
import { generateKey, listKeys, verify } from './db.js';

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
  const { licenseKey, hwid } = req.body ?? {};
  const result = verify(licenseKey, hwid);
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

app.listen(PORT, () => {
  console.log(`License backend listening on http://localhost:${PORT}`);
});

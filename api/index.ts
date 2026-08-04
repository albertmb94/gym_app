import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: 'express-v2' });
});

export default app;

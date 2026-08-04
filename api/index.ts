import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: 'express-handler-wrap' });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}

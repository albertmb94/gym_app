import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

console.log('[api] module load');

const app = express();
console.log('[api] express app created');

app.get('/api/health', (_req, res) => {
  console.log('[api] /api/health hit');
  res.json({ ok: true, source: 'express-test' });
});

console.log('[api] routes registered');

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[api] handler invoked', req.url);
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}

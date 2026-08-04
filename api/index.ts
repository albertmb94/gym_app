import express from 'express';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: 'handler-wrap' });
});

export default function handler(req: any, res: any) {
  return (app as any)(req, res);
}

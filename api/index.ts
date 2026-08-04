import express from 'express';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: 'minimal' });
});

export default app;

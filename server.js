require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { AIError } = require('./ai');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
  const origin = process.env.CORS_ORIGIN;
  if (origin) {
    res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, x-student-id', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use('/api/ai', rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many AI requests. Please wait a minute.' } }));
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static((__dirname)));

app.use((err, req, res, next) => {
  if (err instanceof AIError) {
    const status = err.code === 'NO_KEY' ? 503 : 502;
    return res.status(status).json({ error: 'AI is unavailable right now.', fallback: true });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`StudySOS running at http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY) console.log('Note: ANTHROPIC_API_KEY not set. The app uses built-in offline answers.');
});

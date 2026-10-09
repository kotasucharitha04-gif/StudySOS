const express = require('express');
const { q } = require('./db');
const ai = require('./ai');

const router = express.Router();
const ID_RE = /^[0-9a-f-]{36}$/i;
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function student(req, res, next) {
  const id = req.get('x-student-id') || '';
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'Missing or invalid student id' });
  req.sid = id.toLowerCase();
  next();
}

router.get('/health', (req, res) => res.json({ ok: true, aiConfigured: !!process.env.ANTHROPIC_API_KEY }));

router.get('/state', student, (req, res) => {
  const row = q.getState.get(req.sid);
  res.json({ state: row ? JSON.parse(row.state) : null });
});

router.put('/state', student, (req, res) => {
  const s = req.body && req.body.state;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return res.status(400).json({ error: 'Invalid state' });
  const text = JSON.stringify(s);
  if (text.length > 200000) return res.status(413).json({ error: 'State too large' });
  q.putState.run(req.sid, text);
  res.json({ ok: true });
});

router.post('/quiz-attempts', student, (req, res) => {
  const b = req.body || {};
  const subject = clean(b.s, 80), pct = Number(b.pct);
  if (!subject || !Number.isFinite(pct) || pct < 0 || pct > 100) return res.status(400).json({ error: 'Invalid attempt' });
  const weak = (Array.isArray(b.weak) ? b.weak : []).slice(0, 20).map(w => clean(w, 80));
  q.addAttempt.run(req.sid, subject, Math.round(pct), JSON.stringify(weak));
  res.json({ ok: true });
});

router.post('/feedback', (req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 100), email = clean(b.email, 200), message = clean(b.message, 2000);
  if (!name || !/\S+@\S+\.\S+/.test(email) || !message) return res.status(400).json({ error: 'Please complete every field.' });
  q.addFeedback.run(name, email, message);
  res.json({ ok: true });
});

router.post('/ai/doubt', student, wrap(async (req, res) => {
  const b = req.body || {};
  const question = clean(b.q, 1500);
  if (!question) return res.status(400).json({ error: 'Please enter a question.' });
  const result = await ai.doubt({
    subject: clean(b.s, 80) || 'General', topic: clean(b.t, 120) || 'General',
    level: ['Easy', 'Medium', 'Hard'].includes(b.l) ? b.l : 'Medium',
    question, mode: ['simple', 'ex'].includes(b.mode) ? b.mode : 'normal'
  });
  res.json({ result });
}));

router.post('/ai/notes', student, wrap(async (req, res) => {
  const b = req.body || {};
  const topic = clean(b.t, 120);
  if (!topic) return res.status(400).json({ error: 'Please enter a topic.' });
  const result = await ai.notes({
    topic, subject: clean(b.s, 80) || 'General',
    style: ['Quick Revision', 'Detailed Notes', 'Exam-Oriented Notes'].includes(b.m) ? b.m : 'Exam-Oriented Notes',
    level: ['Basic', 'Intermediate', 'Advanced'].includes(b.d) ? b.d : 'Intermediate'
  });
  res.json({ result });
}));

router.post('/ai/quiz', student, wrap(async (req, res) => {
  const b = req.body || {};
  const subject = clean(b.subject, 80);
  const count = Math.min(10, Math.max(1, parseInt(b.count, 10) || 5));
  if (!subject) return res.status(400).json({ error: 'Please select a subject.' });
  const result = await ai.quiz({ subject, count, difficulty: ['Easy', 'Medium', 'Hard'].includes(b.difficulty) ? b.difficulty : 'Medium' });
  res.json({ result });
}));

module.exports = router;

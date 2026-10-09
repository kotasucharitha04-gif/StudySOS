# StudySOS – AI Academic Rescue System

Full-stack version of StudySOS: the same UI and features as the original single-page site, now with a Node/Express backend, SQLite database and server-side AI.

```
studysos/
├── frontend/              Static site (no build step)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── config.js      API base URL (empty = same origin)
│       ├── api.js         Backend client + offline fallback hook
│       └── app.js         All UI logic (original features preserved)
└── backend/
    ├── server.js          Express app, rate limits, static hosting
    ├── src/db.js          SQLite schema and queries
    ├── src/ai.js          Anthropic calls (doubts, notes, quizzes)
    ├── src/routes.js      REST API
    ├── package.json
    └── .env.example
```

## Quick start

Requires **Node.js 18+** (20 recommended).

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env and set ANTHROPIC_API_KEY
npm start
```

Open http://localhost:3000. The backend serves the frontend, so there is nothing else to run.

Without an API key the app still works: AI features fall back to the built-in offline answers, so the demo never breaks.

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Your key. Stays on the server only. |
| `ANTHROPIC_MODEL` | Model name (default `claude-sonnet-4-6`). |
| `PORT` | Server port (default 3000). |
| `DB_PATH` | SQLite file (default `backend/data/studysos.db`). |
| `CORS_ORIGIN` | Only if the frontend is hosted elsewhere. |

## How it works

- **Identity:** no login. The browser creates an anonymous UUID (kept in `localStorage`) and sends it as `x-student-id`.
- **Persistence:** the frontend autosaves the student's state every few seconds and reloads it on startup. First-time visitors get the labeled demo student.
- **AI:** the browser calls `/api/ai/*`; the server builds the prompt, calls the model, validates the JSON shape, and returns it. Student text is passed as data, AI output is HTML-escaped before display, and AI routes are rate limited (20/min).
- **Fallback:** if the AI call fails, `api.js` uses the original offline engine.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Status and whether AI is configured |
| GET / PUT | `/api/state` | Load / save the student's state |
| POST | `/api/ai/doubt` | Structured doubt explanation |
| POST | `/api/ai/notes` | Structured study notes |
| POST | `/api/ai/quiz` | MCQ quiz |
| POST | `/api/quiz-attempts` | Record a quiz result |
| POST | `/api/feedback` | Store contact/feedback |

## Database (SQLite)

`students(id, state, updated_at)`, `quiz_attempts(id, student_id, subject, percent, weak_topics, created_at)`, `feedback(id, name, email, message, created_at)`. Created automatically on first start.

## Deploying

Run `npm start` on any Node host (Render, Railway, a VPS) with the env vars set and a persistent disk for `DB_PATH`. To host the frontend separately (Netlify, Vercel), set `window.STUDYSOS_API` in `frontend/js/config.js` and `CORS_ORIGIN` on the backend.

## Troubleshooting

- **`better-sqlite3` fails to install:** use Node 18/20 LTS; on Linux install `build-essential` and `python3`.
- **AI answers look generic:** the key is missing or invalid; check `/api/health` and the server console.
- **Port in use:** change `PORT`.
- Never commit `.env`; the included `.gitignore` excludes it.

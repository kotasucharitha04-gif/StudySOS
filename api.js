// Talks to the StudySOS backend. No secrets live in the browser.
const API = (() => {
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 3 | 8).toString(16); }));
  let id = null;
  try { id = localStorage.getItem('sos_id'); } catch (e) {}
  if (!id) { id = uuid(); try { localStorage.setItem('sos_id', id); } catch (e) {} }
  const base = window.STUDYSOS_API || '';
  let last = '';

  async function req(path, method, body) {
    const r = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', 'x-student-id': id },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const deepEsc = v => typeof v === 'string' ? esc(v) : Array.isArray(v) ? v.map(deepEsc) : v;

  return {
    async load() { try { return (await req('/api/state', 'GET')).state; } catch (e) { return null; } },
    async save(S) {
      const { qs, ans, ...rest } = S;
      const s = JSON.stringify(rest);
      if (s === last) return;
      try { await req('/api/state', 'PUT', { state: rest }); last = s; } catch (e) {}
    },
    // Server AI first; falls back to the offline engine so the demo never breaks.
    async ai(kind, p, local) {
      try {
        const r = (await req('/api/ai/' + kind, 'POST', p)).result;
        if (kind === 'doubt') Object.keys(r).forEach(k => r[k] = deepEsc(r[k]));
        return r;
      } catch (e) { return local[kind](p); }
    },
    async quiz(subject, count, difficulty) {
      try { return { s: subject, q: (await req('/api/ai/quiz', 'POST', { subject, count, difficulty })).result }; }
      catch (e) { return null; }
    },
    async attempt(a) { try { await req('/api/quiz-attempts', 'POST', a); } catch (e) {} },
    async feedback(f) { try { await req('/api/feedback', 'POST', f); return true; } catch (e) { return false; } }
  };
})();

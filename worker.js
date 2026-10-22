import { departure } from './timing.js';
import { participantTiming } from './public/march.js';

const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"
};
const json = (data, status = 200) => Response.json(data, { status, headers });
const text = (value, max = 100) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`Uzupełnij wymagane pola (maks. ${max} znaków).`);
  return value.trim();
};
async function board(db, id) {
  const results = await db.batch([
    db.prepare('SELECT name FROM rooms WHERE id = ?').bind(id),
    db.prepare('SELECT id, target, coordinates, notes, arrival FROM attacks WHERE room_id = ? ORDER BY arrival, rowid').bind(id),
    db.prepare('SELECT p.id, p.attack_id, p.player, p.units, p.seconds, p.launch, p.march_details FROM participants p JOIN attacks a ON a.id = p.attack_id WHERE a.room_id = ? ORDER BY p.rowid').bind(id)
  ]);
  if (!results[0].results.length) return null;
  const attacks = results[1].results.map(a => ({ ...a, participants: [] }));
  const byId = new Map(attacks.map(a => [a.id, a]));
  for (const { attack_id, march_details, ...p } of results[2].results) byId.get(attack_id)?.participants.push({ ...p, march: march_details ? JSON.parse(march_details) : null });
  return { name: results[0].results[0].name, attacks, now: new Date().toISOString() };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      return response;
    }
    if (!env.DB) return json({ error: 'Brak konfiguracji bazy danych.' }, 503);
    let body = {};
    if (request.method === 'POST') {
      if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: 'Niedozwolone źródło.' }, 403);
      if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'Wymagane dane JSON.' }, 415);
      const reader = request.body?.getReader();
      let bytes = 0, chunks = [];
      if (reader) {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          bytes += value.byteLength;
          if (bytes > 16384) { await reader.cancel(); return json({ error: 'Za dużo danych.' }, 413); }
          chunks.push(value);
        }
      }
      try {
        const combined = new Uint8Array(bytes); let offset = 0;
        for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
        body = JSON.parse(new TextDecoder().decode(combined));
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
      } catch { return json({ error: 'Niepoprawne dane.' }, 400); }
    }
    try {
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        let name;
        try { name = text(body.name); } catch (error) { return json({ error: error.message }, 400); }
        const id = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        await env.DB.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').bind(id, name).run();
        return json({ id, name, attacks: [] }, 201);
      }
      const match = url.pathname.match(/^\/api\/rooms\/([a-f0-9]{48})(?:\/(attacks|participants))?$/);
      if (!match) return json({ error: 'Nie znaleziono.' }, 404);
      const [, id, action] = match;
      const exists = await env.DB.prepare('SELECT id FROM rooms WHERE id = ?').bind(id).first();
      if (!exists) return json({ error: 'Nie znaleziono klanu. Sprawdź link.' }, 404);
      if (request.method === 'GET' && !action) return json(await board(env.DB, id));
      if (request.method !== 'POST') return json({ error: 'Niedozwolona metoda.' }, 405);
      let validated;
      try {
        if (action === 'attacks') {
          departure(body.arrival, 1);
          const arrival = new Date(body.arrival).toISOString();
          if (Date.parse(arrival) <= Date.now()) throw new Error('Godzina dotarcia musi być w przyszłości.');
          validated = [crypto.randomUUID(), id, text(body.target), text(body.coordinates), typeof body.notes === 'string' ? body.notes.slice(0, 1000) : '', arrival];
        } else if (action === 'participants') {
          const attack = await env.DB.prepare('SELECT arrival, coordinates FROM attacks WHERE id = ? AND room_id = ?').bind(text(body.attackId), id).first();
          if (!attack) throw new Error('Nie znaleziono ataku.');
          const timing = participantTiming(attack.arrival, body, attack.coordinates);
          if (Date.parse(timing.launch) <= Date.now()) throw new Error('Termin wysłania już minął. Wybierz krótszy marsz lub późniejszy atak.');
          validated = [crypto.randomUUID(), body.attackId, text(body.player), timing.units, timing.seconds, timing.launch, JSON.stringify(timing)];
        } else return json({ error: 'Nie znaleziono.' }, 404);
      } catch (error) { return json({ error: error.message }, 400); }
      if (action === 'attacks') await env.DB.prepare('INSERT INTO attacks (id, room_id, target, coordinates, notes, arrival) VALUES (?, ?, ?, ?, ?, ?)').bind(...validated).run();
      else await env.DB.prepare('INSERT INTO participants (id, attack_id, player, units, seconds, launch, march_details) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(...validated).run();
      return json(await board(env.DB, id), 201);
    } catch {
      return json({ error: 'Nie udało się zapisać lub odczytać tablicy. Sprawdź dostępność bazy i limity Cloudflare.' }, 503);
    }
  }
};

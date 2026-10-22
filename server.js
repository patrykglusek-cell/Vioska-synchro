import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { departure } from './timing.js';
import { participantTiming } from './public/march.js';

mkdirSync(process.env.DATA_DIR || 'data', { recursive: true });
const db = new DatabaseSync(`${process.env.DATA_DIR || 'data'}/vioska.db`);
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
const text = (v, max = 100) => typeof v === 'string' && v.trim().length <= max && v.trim().length ? v.trim() : (() => { throw new Error('Uzupełnij wymagane pola (maks. ' + max + ' znaków).'); })();
const send = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/march.js': ['march.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      const file = files[url.pathname];
      if (!file) return send(res, 404, { error: 'Nie znaleziono.' });
      res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
      return res.end(readFileSync(new URL('./public/' + file[0], import.meta.url)));
    }
    let body = {};
    if (req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(res, 403, { error: 'Niedozwolone źródło.' });
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 16384) return send(res, 413, { error: 'Za dużo danych.' }); }
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'Niepoprawne dane.' }); }
    }
    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      const room = { name: text(body.name), attacks: [] }; const id = randomBytes(24).toString('hex');
      db.prepare('INSERT INTO rooms VALUES (?, ?)').run(id, JSON.stringify(room));
      return send(res, 201, { id, ...room });
    }
    const match = url.pathname.match(/^\/api\/rooms\/([a-f0-9]{48})(?:\/(attacks|participants))?$/);
    if (!match) return send(res, 404, { error: 'Nie znaleziono.' });
    const row = db.prepare('SELECT data FROM rooms WHERE id = ?').get(match[1]);
    if (!row) return send(res, 404, { error: 'Nie znaleziono klanu. Sprawdź link.' });
    const room = JSON.parse(row.data);
    if (req.method === 'GET' && !match[2]) return send(res, 200, { ...room, now: new Date().toISOString() });
    if (req.method !== 'POST') return send(res, 405, { error: 'Niedozwolona metoda.' });
    if (match[2] === 'attacks') {
      const arrival = new Date(departure(body.arrival, 1)); arrival.setSeconds(arrival.getSeconds() + 1);
      if (arrival.getTime() <= Date.now()) throw new Error('Godzina dotarcia musi być w przyszłości.');
      room.attacks.push({ id: randomUUID(), target: text(body.target), coordinates: text(body.coordinates), notes: typeof body.notes === 'string' ? body.notes.slice(0, 1000) : '', arrival: arrival.toISOString(), participants: [] });
    } else if (match[2] === 'participants') {
      const attack = room.attacks.find(a => a.id === body.attackId);
      if (!attack) throw new Error('Nie znaleziono ataku.');
      const timing = participantTiming(attack.arrival, body, attack.coordinates);
      if (Date.parse(timing.launch) <= Date.now()) throw new Error('Termin wysłania już minął. Wybierz krótszy marsz lub późniejszy atak.');
      attack.participants.push({ id: randomUUID(), player: text(body.player), units: timing.units, seconds: timing.seconds, launch: timing.launch, march: timing });
    } else return send(res, 404, { error: 'Nie znaleziono.' });
    db.prepare('UPDATE rooms SET data = ? WHERE id = ?').run(JSON.stringify(room), match[1]);
    send(res, 201, room);
  } catch (error) { send(res, 400, { error: error.message }); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log('Vioska Synchro: serwer uruchomiony port=' + server.address().port));

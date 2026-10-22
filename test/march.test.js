import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMarch, participantTiming } from '../public/march.js';
const scouts = [{ type: 'SCOUT', count: 20 }];
test('marsz dzienny i najwolniejsza jednostka w mieszanej armii', () => {
  const r = calculateMarch('2026-10-22T02:00:00Z', 10, [...scouts, { type: 'CATAPULT', count: 1 }]);
  assert.equal(r.seconds, 3900);
  assert.equal(r.launch, '2026-10-22T00:55:00.000Z');
  assert.equal(r.slowest, 'Katapulta');
  assert.equal(calculateMarch('2026-10-22T02:00:00Z', 10, scouts).seconds, 750);
});
test('pełna noc i granice faz: świt, zmierzch, północ', () => {
  assert.equal(calculateMarch('2026-10-22T03:30:00Z', 10, scouts).seconds, 900);
  assert.equal(calculateMarch('2026-10-22T04:05:00Z', 10, scouts).launch, '2026-10-22T03:51:00.000Z');
  assert.equal(calculateMarch('2026-10-22T03:05:00Z', 10, scouts).launch, '2026-10-22T02:51:40.000Z');
  assert.equal(calculateMarch('2026-10-23T00:05:00Z', 10, scouts).launch, '2026-10-22T23:51:00.000Z');
  assert.equal(calculateMarch('2026-10-22T04:00:00Z', 10, scouts).launch, '2026-10-22T03:45:00.000Z');
  assert.equal(calculateMarch('2026-10-22T03:00:00Z', 10, scouts).launch, '2026-10-22T02:47:30.000Z');
});
test('marsz wielodniowy zgadza się z sumą przebytej drogi w każdej fazie', () => {
  for (const hour of [0, 3, 4, 7, 12, 23]) {
    const arrival = `2026-10-25T${String(hour).padStart(2,'0')}:17:11Z`;
    const r = calculateMarch(arrival, 1000, scouts);
    let work = 0;
    for (let t = Date.parse(r.launch); t < Date.parse(arrival); t += 1000) work += new Date(t).getUTCHours() % 4 === 3 ? 5/6 : 1;
    assert(Math.abs(work - 75000) < 1.01, String(work));
  }
});
test('stała prędkość dla serwerów bez zegara świata i strefy czasowe', () => {
  assert.equal(calculateMarch('2026-10-22T03:30:00Z', 10, scouts, false).seconds, 750);
  assert.equal(calculateMarch('2026-10-22T05:30:00+02:00', 10, scouts).launch, calculateMarch('2026-10-22T03:30:00Z', 10, scouts).launch);
});
test('walidacja, limit czasu i przeliczenie po stronie serwera zamiast zaufania danym klienta', () => {
  for (const route of [0, -1, 1.5, NaN, 100001]) assert.throws(() => calculateMarch('2026-10-22T03:30Z', route, scouts));
  for (const troops of [[], [{type:'UNKNOWN',count:1}], [{type:'SCOUT',count:0}], [...scouts,...scouts]]) assert.throws(() => calculateMarch('2026-10-22T03:30Z', 1, troops));
  assert.throws(() => calculateMarch('2026-10-22T03:30Z', 10000, scouts));
  assert.throws(() => participantTiming('2026-10-22T03:30Z', { mode:'automatic', origin:'', routeHexes:10,troops:scouts }));
  const result = participantTiming('2026-10-22T03:30Z', { mode:'automatic', origin:'HEX 123', routeHexes:10, troops:scouts, seconds:1, launch:'fake', units:'fake' });
  assert.equal(result.seconds, 900); assert.equal(result.units, '20 × Zwiadowca');
});

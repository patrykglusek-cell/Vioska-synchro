import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMarch, participantTiming, parseCoordinates, estimateRoute } from '../public/march.js';
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

test('model współrzędnych odtwarza dwa przykłady pokazane przez gracza', () => {
  const knights = [{ type:'KNIGHT', count:1351 }];
  assert.equal(estimateRoute('68.0, 71.0', '31.0, -54.0'), 131);
  assert.equal(estimateRoute('68 | 71', '65 | 72'), 4);
  assert.equal(participantTiming('2026-10-24T16:00Z', {mode:'coordinates',origin:'68 | 71',troops:knights,worldClock:false}, '31 | -54').seconds, 39300);
  const short = participantTiming('2026-10-24T16:00Z', {mode:'coordinates',origin:'68 | 71',troops:knights,worldClock:false}, '65 | 72');
  assert.equal(short.seconds,1200);assert.equal(short.estimated,true);assert.equal(short.routeMethod,'coordinates');
});
test('współrzędne: znaki, ułamki, granice zaokrąglenia i odrzucanie niejednoznacznych zapisów', () => {
  assert.deepEqual(parseCoordinates('-31.5 | 72.25'),{x:-31.5,y:72.25});
  assert.equal(estimateRoute('0; 0','3, 4'),5);
  assert.equal(estimateRoute('0 0','3 4.1'),6);
  for (const bad of ['HEX 123','68','68,5,71,5','68 | 71 | 72','Infinity | 1','1000001 | 1']) assert.throws(()=>parseCoordinates(bad));
  assert.throws(()=>estimateRoute('68|71','68|71'));
  const result=participantTiming('2026-10-24T16:00Z',{mode:'coordinates',origin:'68|71',routeHexes:999,seconds:1,units:'fake',troops:scouts,worldClock:false},'65|72');
  assert.equal(result.routeHexes,4);assert.equal(result.seconds,300);
  assert.throws(()=>participantTiming('2026-10-24T16:00Z',{mode:'coordinates',origin:'68|71',target:'65|72',troops:scouts}));
});

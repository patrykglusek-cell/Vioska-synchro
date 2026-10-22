// Dane: oficjalne API wiki Vioska, odczyt 2026-10-22. Patrz docs/MARCH.md.
export const UNITS = [
  {
    "type": "GOVERNOR",
    "name": "Gubernator",
    "secondsPerHex": 420
  },
  {
    "type": "PEASANT",
    "name": "Chłop z widłami",
    "secondsPerHex": 190
  },
  {
    "type": "ARCHER",
    "name": "Łucznik",
    "secondsPerHex": 215
  },
  {
    "type": "PIKEMAN",
    "name": "Pikinier",
    "secondsPerHex": 215
  },
  {
    "type": "SCOUT",
    "name": "Zwiadowca",
    "secondsPerHex": 75
  },
  {
    "type": "SWORDSMAN",
    "name": "Szermierz",
    "secondsPerHex": 230
  },
  {
    "type": "AXEMAN",
    "name": "Topornik",
    "secondsPerHex": 200
  },
  {
    "type": "ARMORED_SPEARMAN",
    "name": "Opancerzony Włócznik",
    "secondsPerHex": 270
  },
  {
    "type": "ARMORED_SWORDSMAN",
    "name": "Opancerzony Szermierz",
    "secondsPerHex": 280
  },
  {
    "type": "ARMORED_AXEMAN",
    "name": "Opancerzony Topornik",
    "secondsPerHex": 250
  },
  {
    "type": "SHIELDED_SWORDSMAN",
    "name": "Tarczownik",
    "secondsPerHex": 305
  },
  {
    "type": "SHIELDED_AXEMAN",
    "name": "Topornik z Tarczą",
    "secondsPerHex": 290
  },
  {
    "type": "LANCER",
    "name": "Lansjer",
    "secondsPerHex": 110
  },
  {
    "type": "SABRE_RIDER",
    "name": "Jeździec z Szablą",
    "secondsPerHex": 100
  },
  {
    "type": "KNIGHT",
    "name": "Rycerz",
    "secondsPerHex": 300
  },
  {
    "type": "CATAPHRACT",
    "name": "Katafrakt",
    "secondsPerHex": 145
  },
  {
    "type": "IRON_RIDER",
    "name": "Żelazny Jeździec",
    "secondsPerHex": 135
  },
  {
    "type": "MOUNTED_KNIGHT",
    "name": "Konny Rycerz",
    "secondsPerHex": 150
  },
  {
    "type": "COMMANDER",
    "name": "Przywódca armii",
    "secondsPerHex": 310
  },
  {
    "type": "RAM",
    "name": "Taran",
    "secondsPerHex": 360
  },
  {
    "type": "CATAPULT",
    "name": "Katapulta",
    "secondsPerHex": 390
  }
];

// Cofamy marsz od zadanego dotarcia, integrując czas w kolejnych fazach UTC.
export function calculateMarch(arrival, routeHexes, troops, worldClock = true) {
  const end = Date.parse(arrival);
  if (!Number.isFinite(end)) throw new Error('Podaj poprawną godzinę dotarcia.');
  if (!Number.isInteger(routeHexes) || routeHexes < 1 || routeHexes > 100000) throw new Error('Podaj rzeczywistą długość trasy: od 1 do 100000 pól.');
  if (typeof worldClock !== 'boolean') throw new Error('Wybierz zasady dnia i nocy.');
  if (!Array.isArray(troops) || !troops.length || troops.length > UNITS.length) throw new Error('Wybierz co najmniej jeden rodzaj wojsk.');
  const seen = new Set();
  const selected = troops.map(t => {
    const unit = UNITS.find(u => u.type === t?.type);
    if (!unit || seen.has(t.type) || !Number.isInteger(t.count) || t.count < 1 || t.count > 1000000000) throw new Error('Podaj poprawne jednostki i całkowitą liczebność (od 1 do miliarda).');
    seen.add(t.type);
    return { ...unit, count: t.count };
  });
  const slowest = selected.reduce((a, b) => a.secondsPerHex >= b.secondsPerHex ? a : b);
  let work = routeHexes * slowest.secondsPerHex * 1000;
  // Nawet cały marsz za dnia nie może przekroczyć limitu aplikacji.
  if (work > 604800000) throw new Error('Czas marszu przekracza maksymalnie 7 dni.');
  let cursor = end;
  while (work > 0.0001) {
    const hourStart = Math.floor((cursor - 1) / 3600000) * 3600000;
    const phaseHour = ((hourStart / 3600000) % 4 + 4) % 4;
    const rate = worldClock && phaseHour === 3 ? 5 / 6 : 1;
    const span = cursor - hourStart;
    if (work <= span * rate) { cursor -= work / rate; work = 0; }
    else { work -= span * rate; cursor = hourStart; }
  }
  // Pokazujemy pełne sekundy; wcześniejszy start zapobiega spóźnieniu przez zaokrąglenie.
  const seconds = Math.ceil((end - cursor - 0.0001) / 1000);
  if (seconds < 1 || seconds > 604800) throw new Error('Czas marszu przekracza maksymalnie 7 dni.');
  return { launch: new Date(end - seconds * 1000).toISOString(), seconds, slowest: slowest.name,
    units: selected.map(u => `${u.count} × ${u.name}`).join(', '), routeHexes, worldClock };
}

export function parseCoordinates(value) {
  if (typeof value !== 'string' || value.length > 100) throw new Error('Podaj współrzędne X i Y, np. 68 | 71 (nie numer sektora).');
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:\||;|,|\s)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) throw new Error('Podaj współrzędne X i Y, np. 68 | 71. Używaj kropki dla części dziesiętnej.');
  const [x, y] = match.slice(1).map(Number);
  if (![x, y].every(n => Number.isFinite(n) && Math.abs(n) <= 1000000)) throw new Error('Współrzędne muszą mieścić się w zakresie od −1000000 do 1000000.');
  return { x, y };
}

export function estimateRoute(origin, target) {
  const start = parseCoordinates(origin), end = parseCoordinates(target);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (distance === 0) throw new Error('Wioska startowa i cel muszą mieć różne współrzędne.');
  return Math.ceil(distance);
}

export function participantTiming(arrival, body, targetCoordinates) {
  if (body.mode === 'automatic' || body.mode === 'coordinates') {
    const estimated = body.mode === 'coordinates';
    const routeHexes = estimated ? estimateRoute(body.origin, targetCoordinates) : body.routeHexes;
    const result = calculateMarch(arrival, routeHexes, body.troops, body.worldClock);
    const origin = typeof body.origin === 'string' ? body.origin.trim() : '';
    if (!origin || origin.length > 100) throw new Error('Podaj HEX / pozycję wioski startowej (maks. 100 znaków).');
    return { ...result, origin, mode: 'automatic', routeMethod: estimated ? 'coordinates' : 'provided', estimated,
      ...(estimated ? { target: targetCoordinates } : {}) };
  }
  if (body.mode && body.mode !== 'manual') throw new Error('Nieznany tryb obliczeń.');
  const end = Date.parse(arrival);
  if (!Number.isFinite(end) || !Number.isInteger(body.seconds) || body.seconds < 1 || body.seconds > 604800) throw new Error('Podaj poprawny czas marszu (maksymalnie 7 dni).');
  if (typeof body.units !== 'string' || !body.units.trim() || body.units.trim().length > 500) throw new Error('Podaj jednostki (maks. 500 znaków).');
  return { launch: new Date(end - body.seconds * 1000).toISOString(), seconds: body.seconds, units: body.units.trim(), mode: 'manual' };
}

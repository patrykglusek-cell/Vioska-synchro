export function departure(arrival, seconds) {
  const timestamp = Date.parse(arrival);
  if (!Number.isFinite(timestamp) || !Number.isInteger(seconds) || seconds < 1 || seconds > 604800) throw new Error('Podaj poprawną godzinę dotarcia i czas marszu (maksymalnie 7 dni).');
  return new Date(timestamp - seconds * 1000).toISOString();
}

const $ = s => document.querySelector(s);
let roomId = location.hash.slice(1), room, activeAttack, clockOffset = 0;
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = v => new Date(v).toLocaleString('pl-PL', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
const now = () => Date.now() + clockOffset;
const seconds = form => ['hours','minutes','seconds'].reduce((s,k,i) => s + Number(form.elements[k].value) * [3600,60,1][i],0);
async function api(path, body) {
  if (!['http:', 'https:'].includes(location.protocol)) throw new Error('Otwórz aplikację przez jej serwer, a nie plik HTML. Ta tablica wymaga połączenia z serwerem.');
  let response;
  try {
    response = await fetch('/api/' + path, { ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}), signal: AbortSignal.timeout(12000) });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? 'Serwer nie odpowiedział w ciągu 12 sekund. Spróbuj ponownie.' : 'Nie można połączyć się z serwerem tablicy. Sprawdź połączenie i adres strony.');
  }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Pod tym adresem nie działa serwer tablicy. Sam podgląd plików strony nie obsługuje tworzenia klanu.');
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Błąd połączenia.'); return data;
}
function message(text, error=false) { $('#message').textContent=text; $('#message').classList.toggle('error',error); }
function render() {
  $('#welcome').hidden=true; $('#board').hidden=false; $('#room-name').textContent=room.name;
  $('#count').textContent=room.attacks.length + ' celów';
  $('#attacks').innerHTML=room.attacks.length ? [...room.attacks].sort((a,b)=>Date.parse(a.arrival)-Date.parse(b.arrival)).map(a=>`<article class="card"><div class="attack-top"><div><div class="eyebrow">ATAK NA</div><h3>${esc(a.target)}</h3><span class="coordinates">Cel: ${esc(a.coordinates)}</span></div><span class="badge">${Date.parse(a.arrival)>now()?'Zaplanowany':'Termin minął'}</span></div><div class="arrival"><small>Wspólna godzina dotarcia</small><strong>${date(a.arrival)}</strong></div>${a.notes?`<p class="notes">${esc(a.notes)}</p>`:''}<button data-join="${a.id}" ${Date.parse(a.arrival)<=now()?'disabled':''}>Dołącz do ataku +</button><div class="players"><small>UCZESTNICY · ${a.participants.length}</small>${a.participants.map(p=>`<div class="player"><strong>${esc(p.player)}</strong><small>${esc(p.units)}</small><small>Marsz: ${Math.floor(p.seconds/3600)}h ${Math.floor(p.seconds%3600/60)}m ${p.seconds%60}s</small><div class="launch">Wyślij: ${date(p.launch)}</div><div class="countdown" data-launch="${p.launch}"></div></div>`).join('') || '<p class="hint">Bądź pierwszą osobą w tym ataku.</p>'}</div></article>`).join('') : '<div class="empty">Brak zaplanowanych ataków.<br>Dodaj pierwszy cel, aby zebrać drużynę.</div>';
  tick();
}
async function refresh() { const start=Date.now(); room=await api('rooms/'+roomId); clockOffset=Date.parse(room.now)-(start+Date.now())/2; render(); }
function tick() { document.querySelectorAll('[data-launch]').forEach(el=>{let s=Math.ceil((Date.parse(el.dataset.launch)-now())/1000);el.textContent=s>0?`Do wysłania: ${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`:'Termin wysłania minął';}); }
async function submit(form, action, errorHandler) { const button=form.querySelector('button:not([type="button"])'); const label=button.textContent;button.disabled=true;button.textContent='Zapisywanie…';try { await action(); }catch(e){errorHandler(e.message);}finally{button.disabled=false;button.textContent=label;} }
$('#room-form').addEventListener('submit', e=>{e.preventDefault();submit(e.target,async()=>{const data=await api('rooms',Object.fromEntries(new FormData(e.target)));roomId=data.id;location.hash=roomId;await refresh();message('Tablica gotowa. Skopiuj link i udostępnij go członkom klanu.');},t=>message(t,true));});
$('#attack-form').addEventListener('submit',e=>{e.preventDefault();submit(e.target,async()=>{const body=Object.fromEntries(new FormData(e.target));body.arrival=new Date(body.arrival).toISOString();await api('rooms/'+roomId+'/attacks',body);e.target.reset();await refresh();message('Atak został zaplanowany.');},t=>message(t,true));});
$('#attacks').addEventListener('click',e=>{const button=e.target.closest('[data-join]');if(!button)return;activeAttack=room.attacks.find(a=>a.id===button.dataset.join);$('#join-form').reset();$('#join-form').elements.attackId.value=activeAttack.id;$('#join-target').textContent=`${activeAttack.target} · dotarcie ${date(activeAttack.arrival)}`;$('#join-error').textContent='';$('#launch-preview').textContent='';$('#join-dialog').showModal();});
$('#close-dialog').onclick=()=>$('#join-dialog').close();
$('#join-form').addEventListener('input',e=>{const s=seconds(e.currentTarget);$('#launch-preview').textContent=s>0?`Wyślij jednostki: ${date(Date.parse(activeAttack.arrival)-s*1000)}`:'Podaj czas marszu, aby zobaczyć godzinę wysłania.';});
$('#join-form').addEventListener('submit',e=>{e.preventDefault();submit(e.target,async()=>{const body=Object.fromEntries(new FormData(e.target));body.seconds=seconds(e.target);await api('rooms/'+roomId+'/participants',body);$('#join-dialog').close();await refresh();message('Zapisano udział i godzinę wysłania jednostek.');},t=>$('#join-error').textContent=t);});
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);message('Link skopiowany. Każdy z linkiem ma dostęp do tablicy.');}catch{message('Skopiuj adres tej strony z paska przeglądarki.');}};
document.querySelectorAll('.timezone').forEach(el=>el.textContent='Godziny w strefie Twojego urządzenia: '+Intl.DateTimeFormat().resolvedOptions().timeZone+'.');
window.addEventListener('hashchange',()=>{roomId=location.hash.slice(1);if(roomId)refresh().catch(e=>message(e.message,true));else location.reload();});
if(roomId)refresh().catch(e=>message(e.message,true));
setInterval(()=>{if(roomId && !document.hidden)refresh().catch(e=>message('Nie udało się odświeżyć tablicy: '+e.message,true));},5000);setInterval(tick,1000);

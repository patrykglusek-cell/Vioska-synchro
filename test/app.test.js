import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { departure } from '../timing.js';

test('godzina wysłania uwzględnia zmianę dnia i strefę', () => {
  assert.equal(departure('2026-10-14T00:30:00+02:00', 3600), '2026-10-13T21:30:00.000Z');
  assert.throws(() => departure('bad', 10));
  assert.throws(() => departure('2026-10-14T00:30:00Z', 0));
});
test('wspólna tablica, zapis uczestnika, walidacja i trwałość po restarcie', async () => {
  const dir=mkdtempSync(join(tmpdir(),'vioska-test-'));
  let child;
  const start=async()=>{
    child=spawn(process.execPath,['server.js'],{env:{...process.env,DATA_DIR:dir,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
    return await new Promise((resolve,reject)=>{child.once('exit',()=>reject(new Error('Server exited')));child.stderr.on('data',()=>{});child.stdout.on('data',d=>{const match=d.toString().match(/port=(\d+)/);if(match)resolve('http://127.0.0.1:'+match[1]);});});
  };
  const stop=()=>new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  try {
    let base=await start();
    const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return [r.status,await r.json()];};
    assert.equal((await fetch(base+'/')).status,200);
    const [status,room]=await post('/api/rooms',{name:'Test klanu'});assert.equal(status,201);
    const path='/api/rooms/'+room.id;
    const arrival=new Date(Date.now()+7200000).toISOString();
    const [attackStatus,data]=await post(path+'/attacks',{target:'Cel',coordinates:'500|500',arrival});assert.equal(attackStatus,201);
    const attackId=data.attacks[0].id;
    const [joinStatus,joined]=await post(path+'/participants',{attackId,player:'Gracz',units:'20 jednostek',seconds:3600});assert.equal(joinStatus,201);
    assert.equal(joined.attacks[0].participants[0].launch,departure(arrival,3600));
    assert.equal((await post(path+'/participants',{attackId,player:'Gracz',units:'20',seconds:0}))[0],400);
    assert.equal((await post(path+'/participants',{attackId,player:'Gracz',units:'20',seconds:10000}))[0],400);
    assert.equal((await fetch(base+'/api/rooms/'+'a'.repeat(48))).status,404);
    await stop();base=await start();
    const restored=await (await fetch(base+path)).json();assert.equal(restored.attacks[0].participants.length,1);
  } finally {if(child && child.exitCode===null)await stop();rmSync(dir,{recursive:true,force:true});}
});

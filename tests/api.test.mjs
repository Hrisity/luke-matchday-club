import { test } from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.LUKE_TEST_URL||'http://127.0.0.1:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie,'local development sign-in must return its test cookie');
let revision=(await (await fetch(base+'/api/game')).json()).revision;
const post=(body,auth=true,origin=base)=>fetch(base+'/api/game',{method:'POST',headers:{'content-type':'application/json',origin,...(auth?{cookie}:{})},body:JSON.stringify(body.action==='draft'||body.action==='submit'?{...body,revision}:body)});
test('anonymous cannot mutate state',async()=>assert.equal((await post({action:'profile',name:'Test'},false)).status,401));
test('cross-origin writes are rejected',async()=>assert.equal((await post({action:'profile',name:'Test'},true,'https://attacker.example')).status,403));
test('unknown fixture rejected',async()=>assert.equal((await post({action:'draft',fixture:'evil',pick:{home:0,away:0,first:'NONE'}})).status,404));
test('out of bound score rejected',async()=>assert.equal((await post({action:'draft',fixture:'f1',pick:{home:99,away:0,first:'HOME'}})).status,422));
test('incomplete round rejected',async()=>assert.equal((await post({action:'submit',picks:{f1:{home:0,away:0,first:'NONE'}}})).status,422));
test('draft persists and anonymous reads cannot see it',async()=>{
 assert.equal((await post({action:'draft',fixture:'f1',pick:{home:2,away:1,first:'HOME'}})).status,200);
 const own=await (await fetch(base+'/api/game',{headers:{cookie}})).json();assert.deepEqual(own.picks.f1,{home:2,away:1,first:'HOME'});
 const anon=await (await fetch(base+'/api/game')).json();assert.deepEqual(anon.picks,{});assert.equal(anon.user,null);
});
test('complete round has persisted receipt and unchanged retries are idempotent',async()=>{
 const picks=Object.fromEntries(Array.from({length:6},(_,i)=>['f'+(i+1),{home:2,away:1,first:'HOME'}]));
 const first=await post({action:'submit',picks});assert.equal(first.status,200);const a=await first.json();
 const second=await post({action:'submit',picks});assert.equal(second.status,200);const b=await second.json();assert.equal(a.receipt.receipt,b.receipt.receipt);
 const state=await (await fetch(base+'/api/game',{headers:{cookie}})).json();assert.equal(state.receipt.receipt,a.receipt.receipt);assert.equal(Object.keys(state.picks).length,6);
});
test('invalid league code does not create membership',async()=>assert.equal((await post({action:'joinLeague',code:'NOT-A-REAL-CODE'})).status,404));
test('league creation and repeat membership join',async()=>{
 const name='QA Club '+Date.now();assert.equal((await post({action:'createLeague',name})).status,200);
 const state=await (await fetch(base+'/api/game',{headers:{cookie}})).json();const league=state.leagues.find(l=>l.name===name);assert.ok(league);assert.equal(league.count,1);
 assert.equal((await post({action:'joinLeague',code:league.code})).status,200);
 const after=await (await fetch(base+'/api/game',{headers:{cookie}})).json();assert.equal(after.leagues.find(l=>l.id===league.id).count,1);
});

import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {server} from './server.js';
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
async function post(path,data,token){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}}
after(()=>{server.closeAllConnections();server.close()});
test('3D page import map, local module assets, model types and credits are served safely',async()=>{
 const page=await fetch(base+'/');const body=await page.text();assert.ok(body.includes('type="importmap"'));assert.ok(!body.includes('__IMPORT_MAP__'));assert.ok(page.headers.get('content-security-policy').includes('sha256-'));
 const module=await fetch(base+'/vendor/three/build/three.module.js');assert.equal(module.status,200);assert.ok(module.headers.get('content-type').includes('javascript'));await module.arrayBuffer();
 const model=await fetch(base+'/assets/models/ready/elephant.glb');assert.equal(model.status,200);assert.equal(model.headers.get('content-type'),'model/gltf-binary');assert.equal(new TextDecoder().decode((await model.arrayBuffer()).slice(0,4)),'glTF');
 const credits=await fetch(base+'/credits.json').then(r=>r.json());assert.deepEqual(credits.map(x=>x.author),['GremorySaiyan','nickheitzman','ollimoisio','ToxaGrom','Patrick Patrikios']);
 assert.equal((await fetch(base+'/assets/models/elephant/model/Elephant%20Idle.fbx')).status,404);
 assert.equal((await fetch(base+'/vendor/three/package.json')).status,404);
});
test('chat synchronizes without interpreting HTML, bounds length, isolates rooms and limits spam',async()=>{
 const a=(await post('join',{name:'Chat A'})).body;
 const b=(await post('join',{name:'Chat B',room:a.room})).body;
 assert.equal((await post('action',{type:'chat',text:'<img src=x onerror=alert(1)> 你好！'},a.token)).status,200);
 const controller=new AbortController();const response=await fetch(base+'/api/events?token='+b.token,{signal:controller.signal});const reader=response.body.getReader();let text='';while(!text.includes('data: '))text+=new TextDecoder().decode((await reader.read()).value);const state=JSON.parse(text.split('data: ')[1].split('\n')[0]);controller.abort();
 assert.equal(state.chat.at(-1).text,'<img src=x onerror=alert(1)> 你好！');assert.equal(state.chat.at(-1).playerId,a.id);
 assert.equal((await post('action',{type:'chat',text:'too fast'},a.token)).status,429);
 assert.equal((await post('action',{type:'chat',text:'x'.repeat(101)},b.token)).status,400);
 await post('leave',{},a.token);await post('leave',{},b.token);
});
test('five seats, overflow routing, shared state, authorization and seat release',async()=>{
 const first=await post('join',{name:'A',avatar:'🐘'});assert.equal(first.status,200);const room=first.body.room;
 const players=[first.body];for(let i=0;i<4;i++){const p=await post('join',{name:'P'+i,room});assert.equal(p.status,200);players.push(p.body)}
 assert.equal((await post('join',{name:'sixth',room})).status,409);
 const next=await post('join',{name:'overflow'});assert.notEqual(next.body.room,room);
 assert.equal((await post('action',{type:'fan'},'fake')).status,401);
 assert.equal((await post('action',{type:'add',food:'fish'},players[0].token)).status,200);
 const controller=new AbortController();const stream=await fetch(base+'/api/events?token='+players[1].token,{signal:controller.signal});const reader=stream.body.getReader();let text='';while(!text.includes('data: ')){text+=new TextDecoder().decode((await reader.read()).value)}const state=JSON.parse(text.split('data: ')[1].split('\n')[0]);assert.equal(state.players.length,5);assert.equal(new Set(state.players.map(p=>p.seat)).size,5);assert.equal(state.food[0].kind,'fish');assert.ok(!text.includes('"token"'));controller.abort();
 assert.equal((await post('action',{type:'eat',id:state.food[0].id},players[1].token)).status,200);
 await post('leave',{},players[2].token);assert.equal((await post('join',{name:'replacement',room})).status,200);
 for(const p of [...players,next.body])await post('leave',{},p.token);
});


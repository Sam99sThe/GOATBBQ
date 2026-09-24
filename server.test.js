import {test,after} from 'node:test';
import assert from 'node:assert/strict';
process.env.BBQ_DB_PATH=':memory:';
const {server}=await import('./server.js');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
async function post(path,data,token){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}}
after(()=>{server.closeAllConnections();server.close()});
test('room names require 5 to 10 ASCII letters and digits',async()=>{
 for(const room of ['abcd1x中文','abcd','abcdefgh','123456','A1_23','A1234567890'])assert.equal((await post('join',{name:'房名測試',room})).status,400);
 for(const room of ['AB123','A123456789']){const p=await post('join',{name:'房名測試',room});assert.equal(p.status,200);await post('leave',{},p.body.token)}
});
test('3D page import map, local module assets, model types and credits are served safely',async()=>{
 const page=await fetch(base+'/');const body=await page.text();assert.ok(body.includes('type="importmap"'));assert.ok(!body.includes('__IMPORT_MAP__'));assert.ok(page.headers.get('content-security-policy').includes('sha256-'));
 const module=await fetch(base+'/vendor/three/build/three.module.js');assert.equal(module.status,200);assert.ok(module.headers.get('content-type').includes('javascript'));await module.arrayBuffer();
 const model=await fetch(base+'/assets/models/ready/elephant.glb');assert.equal(model.status,200);assert.equal(model.headers.get('content-type'),'model/gltf-binary');assert.equal(new TextDecoder().decode((await model.arrayBuffer()).slice(0,4)),'glTF');
 const credits=await fetch(base+'/credits.json').then(r=>r.json());assert.deepEqual(credits.map(x=>x.author),['GremorySaiyan','nickheitzman','ollimoisio','ToxaGrom','manojkmpr','Xander Morningstar (@XMorningstar)','OuterspaceSoftware']);
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

async function snapshot(token){const controller=new AbortController();const response=await fetch(base+'/api/events?token='+token,{signal:controller.signal});const reader=response.body.getReader();let text='';while(!text.includes('data: '))text+=new TextDecoder().decode((await reader.read()).value);controller.abort();return JSON.parse(text.split('data: ')[1].split('\n')[0]);}
const pause=()=>new Promise(r=>setTimeout(r,240));
test('18th raw meal expels once, announces exact text, revokes token and promotes queue',async()=>{
 const players=[];for(let i=0;i<6;i++)players.push((await post('join',{name:'渡劫象'+i,room:'TEST88'})).body);
 const eater=players[0],cook=players[1];
 for(let i=0;i<18;i++){await pause();assert.equal((await post('action',{type:'add',food:'beef'},cook.token)).status,200);const state=await snapshot(cook.token);const result=await post('action',{type:'eat',id:state.food[0].id},eater.token);assert.equal(result.status,200);assert.equal(!!result.body.expelled,i===17);}
 const state=await snapshot(cook.token);assert.ok(!state.players.some(p=>p.id===eater.id));assert.equal(state.players.find(p=>p.id===players[5].id).seat,0);assert.equal(state.chat.filter(m=>m.system).length,1);assert.equal(state.chat.at(-1).text,'渡劫象0 因渡劫失敗先行離席，我們永遠想念他');assert.equal((await post('action',{type:'fan'},eater.token)).status,401);
 for(const p of players.slice(1))await post('leave',{},p.token);
});
test('named rooms support 5 seats plus 10 FIFO spectators, enforce permissions and promote with health intact',async()=>{
 const room='BBQ88';const players=[];
 for(let i=0;i<15;i++){const result=await post('join',{name:'P'+i,room,accessories:['cowboy','cowboy','unknown']});assert.equal(result.status,200);players.push(result.body)}
 assert.equal((await post('join',{name:'overflow',room})).status,409);
 let state=await snapshot(players[0].token);assert.equal(state.id,room);assert.equal(state.players.filter(p=>p.seat!==null).length,5);assert.equal(state.players.filter(p=>p.seat===null).length,10);assert.ok(!JSON.stringify(state).includes('token'));
 const watcher=players[5];for(const type of ['add','flip','fan','sauce','say','motion']){await pause();assert.equal((await post('action',{type},watcher.token)).status,403)}
 await pause();assert.equal((await post('action',{type:'chat',text:'先吃為敬'},watcher.token)).status,200);
 assert.equal((await post('action',{type:'add',food:'fish'},players[0].token)).status,200);
 state=await snapshot(players[0].token);await pause();assert.equal((await post('action',{type:'eat',id:state.food[0].id},watcher.token)).status,200);
 state=await snapshot(players[0].token);assert.equal(state.players.find(p=>p.id===watcher.id).health.nausea,1);
 await post('leave',{},players[2].token);state=await snapshot(players[0].token);assert.equal(state.players.find(p=>p.id===watcher.id).seat,2);assert.equal(state.players.find(p=>p.id===watcher.id).health.nausea,1);assert.equal(state.players.find(p=>p.id===players[6].id).seat,null);
 await pause();assert.equal((await post('action',{type:'fan'},watcher.token)).status,200);
 for(const player of players)await post('leave',{},player.token);
});

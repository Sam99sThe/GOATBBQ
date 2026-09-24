import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyMeal,health,accessoryIds} from './game-rules.js';
import {orderDrink,advanceDrinks} from './drinks.js';
const rooms=new Map(), sessions=new Map();
const foods={fish:['鮮魚',14],beef:['牛肉',9],wing:['雞腿',18],roast:['烤魚',12]};
const avatars=['🐘'];
const projectRoot=fileURLToPath(new URL('.',import.meta.url));
const importMap=JSON.stringify({imports:{three:'/vendor/three/build/three.module.js','three/addons/':'/vendor/three/examples/jsm/'}});
const csp=`default-src 'self'; script-src 'self' 'sha256-${createHash('sha256').update(importMap).digest('base64')}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'`;
function log(r,text){r.log.unshift({id:randomUUID(),text});r.log=r.log.slice(0,15)}
function makeRoom(id){if(!id){do{id="B"+randomUUID().replaceAll("-","").slice(0,4).toUpperCase()+Math.floor(Math.random()*10)}while(rooms.has(id));}const r={id,players:[],food:[],log:[],chat:[],heat:1,event:'今晚的熱量，只存在於想像。',nextEvent:Date.now()+30000};rooms.set(id,r);return r}
function snapshot(r){return {delivery:r.delivery||null,id:r.id,now:Date.now(),players:r.players.map(({id,name,avatar,seat,eaten,bubble,bubbleUntil,motion,nausea,anger,accessories})=>({id,name,avatar,seat,eaten,accessories,health:health({nausea,anger}),motion:motion&&Date.now()-motion.started<3400?motion:null,bubble:bubbleUntil>Date.now()?bubble:''})),food:r.food,log:r.log,chat:r.chat,heat:r.heat,event:r.event}}
function publish(r){const data=`data: ${JSON.stringify(snapshot(r))}\n\n`;for(const p of r.players)if(p.stream&&!p.stream.destroyed)p.stream.write(data)}
function remove(p,reason){const r=rooms.get(p.room);if(reason&&p.stream&&!p.stream.destroyed)p.stream.write('event: expelled\ndata: '+JSON.stringify({reason})+'\n\n');p.stream?.end();sessions.delete(p.token);if(!r)return;r.players=r.players.filter(x=>x!==p);if(p.seat!==null){const next=r.players.find(x=>x.seat===null);if(next){next.seat=p.seat;log(r,`${next.name} 排到了！大象正式入座。`)}}log(r,reason||`${p.name} 帶著一身不存在的炭味離席。`);if(!r.players.length)rooms.delete(r.id);else publish(r)}
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
function act(r,p,b){
 if(p.seat===null&&!['chat','eat'].includes(b.type))fail('卡位中只能聊天與吃食物，入座後就能操作烤爐。',403);
 if(b.type==='drink'){orderDrink(r,p,b.drink);publish(r);return}
 if(b.type==='motion'){const gestures={greet:'揮鼻子跟大家打招呼',ears:'搧動耳朵，宣布自帶電風扇',nod:'點點頭：這肉我可以'};if(!Object.hasOwn(gestures,b.motion))fail('沒有這個大象動作。');if(p.motion&&Date.now()-p.motion.started<3400)fail('大象正在做動作，等一下再試。',429);p.motion={id:randomUUID(),kind:b.motion,started:Date.now()};log(r,`${p.name} ${gestures[b.motion]}。`);publish(r);return}
 if(b.type==='chat'){const text=typeof b.text==='string'?b.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim():'';if(!text||text.length>100)fail('請輸入 1～100 字。');if(Date.now()-(p.lastChat||0)<1200)fail('先喘口氣，一秒後再說。',429);p.lastChat=Date.now();r.chat.push({id:randomUUID(),playerId:p.id,name:p.name,avatar:p.avatar,text,time:Date.now()});r.chat=r.chat.slice(-50);p.bubble=text;p.bubbleUntil=Date.now()+6000;publish(r);return}
 if(b.type==='add'){if(!Object.hasOwn(foods,b.food))fail('這種食物還沒被發明。');if(r.food.length>=9)fail('烤網滿了，先吃掉一點。');let slot=0;while(r.food.some(f=>f.slot===slot))slot++;r.food.push({id:randomUUID(),kind:b.food,slot,owner:p.name,sides:[0,0],side:0});log(r,`${p.name} 放上了${foods[b.food][0]}。`)}
 else if(b.type==='flip'||b.type==='eat'){const f=r.food.find(x=>x.id===b.id);if(!f)fail('太慢了！這一口已經不見了。');if(b.type==='flip'){f.side=1-f.side;log(r,`${p.name} 帥氣翻面，假裝自己很專業。`)}else{r.food=r.food.filter(x=>x!==f);p.eaten++;if(applyMeal(p,f.sides)){const reason=p.name+' 因渡劫失敗先行離席，我們永遠想念他';r.chat.push({id:randomUUID(),playerId:null,name:'烤爐公告',avatar:'📣',text:reason,time:Date.now(),system:true});r.chat=r.chat.slice(-50);remove(p,reason);return {expelled:true,reason};}const burnt=Math.max(...f.sides)>145,raw=Math.min(...f.sides)<65;log(r,`${p.name} ${p.name!==f.owner?'偷吃':'吃掉'}了${f.owner}的${foods[f.kind][0]}。${burnt?'口感：建築材料。':raw?'還沒熟，但你的虛擬肚子很堅強。':'外酥內嫩，現實依然很餓。'}`)}}
 else if(b.type==='fan'){r.heat=Math.min(3,r.heat+.6);log(r,`${p.name} 瘋狂搧風，CPU 聞起來有點香。`)}
 else if(b.type==='sauce'){log(r,`${p.name} 刷上了祖傳 Wi-Fi 醬，訊號多一格。`);p.bubble='🖌️ Wi-Fi 醬真香';p.bubbleUntil=Date.now()+5000}
 else if(b.type==='say'){const lines=['誰把我的肉吃了？','我只負責吃。','這個熟了嗎？','乾杯！🍻','老闆，再一盤！'];if(!Number.isInteger(b.index)||!lines[b.index])fail('未知台詞');p.bubble=lines[b.index];p.bubbleUntil=Date.now()+6000;log(r,`${p.name}：${p.bubble}`)}
 else fail('未知操作');publish(r);
}
export const server=http.createServer(async(req,res)=>{
 const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health')return json(200,{ok:true});
 if(req.method==='POST'&&url.pathname.startsWith('/api/')){
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail('不允許跨站操作',403);
 let raw='';for await(const part of req){raw+=part;if(raw.length>4096)fail('內容太長',413)}let b;try{b=JSON.parse(raw)}catch{fail('無效內容')}
 if(url.pathname==='/api/join'){
 const name=typeof b.name==='string'?b.name.trim().slice(0,16):'';if(!name)fail('先告訴烤爐你的名字。');
 const existing=sessions.get(b.token);if(existing){existing.last=Date.now();return json(200,{token:existing.token,id:existing.id,room:existing.room})}
 const roomName=typeof b.room==='string'?b.room.normalize('NFC').trim():'';if(roomName&&!/^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{5,10}$/.test(roomName))fail('房間名稱需 5～10 碼，且同時包含英文字母與數字。');let r=roomName?(rooms.get(roomName)||makeRoom(roomName)):([...rooms.values()].find(r=>r.players.length<5)||makeRoom());if(r.players.length>=15)fail('這房已有 5 隻大象與 10 位卡位者，請換一個房間。',409);
 if(sessions.size>=500)fail('今晚客滿，請稍後再試。',503);
 const seat=[0,1,2,3,4].find(s=>!r.players.some(p=>p.seat===s))??null;const p={id:randomUUID(),token:randomUUID(),name,avatar:avatars.includes(b.avatar)?b.avatar:avatars[0],seat,room:r.id,eaten:0,nausea:0,anger:0,accessories:[...new Set(Array.isArray(b.accessories)?b.accessories:[])].filter(x=>accessoryIds.includes(x)),last:Date.now(),action:0};r.players.push(p);sessions.set(p.token,p);log(r,seat===null?`${name} 加入卡位隊伍，可以先聊天偷吃。`:`${name} 坐下了。現實中的椅子並沒有動。`);publish(r);return json(200,{token:p.token,id:p.id,room:r.id})}
 const p=sessions.get(req.headers.authorization?.replace('Bearer ',''));if(!p)fail('座位已釋出，請重新入座。',401);p.last=Date.now();const r=rooms.get(p.room);
 if(url.pathname==='/api/leave'){remove(p);return json(200,{ok:true})}
 if(url.pathname==='/api/action'){if(Date.now()-p.action<220)fail('慢一點，夾子只有一支。',429);p.action=Date.now();const outcome=act(r,p,b);return json(200,{ok:true,...outcome})}fail('找不到操作',404);
 }
 if(req.method==='GET'&&url.pathname==='/api/events'){const p=sessions.get(url.searchParams.get('token'));if(!p)return json(401,{error:'座位已釋出'});p.stream?.end();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');p.stream=res;p.last=Date.now();publish(rooms.get(p.room));req.on('close',()=>{if(p.stream===res){p.stream=null;p.last=Date.now()}});return}
 const files={'/delivery-scene.js':['delivery-scene.js','text/javascript'],'/drinks.js':['drinks.js','text/javascript'],'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/scene.js':['scene.js','text/javascript'],'/elephant-motion.js':['elephant-motion.js','text/javascript'],'/night-scene.js':['night-scene.js','text/javascript'],'/style.css':['style.css','text/css'],'/credits.json':['credits.json','application/json']};
 if(url.pathname.startsWith('/assets/models/')||url.pathname.startsWith('/vendor/three/')){
 const vendor=url.pathname.startsWith('/vendor/three/');const root=resolve(projectRoot,vendor?'node_modules/three':'assets/models');const suffix=decodeURIComponent(url.pathname.slice(vendor?14:15));const path=resolve(root,suffix);const type={'.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'}[extname(path).toLowerCase()];
 if(!path.startsWith(root+sep)||!type||(vendor&&extname(path)!=='.js'))return json(404,{error:'找不到素材'});let info;try{info=await stat(path)}catch{return json(404,{error:'找不到素材'})}if(!info.isFile())return json(404,{error:'找不到素材'});
 res.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});const stream=createReadStream(path);stream.on('error',()=>res.destroy());stream.pipe(res);return;
 }
 const file=files[url.pathname];if(!file)return json(404,{error:'找不到頁面'});let data=await readFile(new URL(`./${file[0]}`,import.meta.url));if(file[0]==='index.html')data=data.toString().replace('__IMPORT_MAP__',importMap);res.writeHead(200,{'Content-Type':`${file[1]}; charset=utf-8`,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':csp});res.end(data);
 }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'烤爐打了個嗝，請再試一次。'})}
});
const timer=setInterval(()=>{for(const r of rooms.values()){for(const p of [...r.players]){if(p.stream)p.last=Date.now();else if(Date.now()-p.last>45000)remove(p)}if(!rooms.has(r.id))continue;advanceDrinks(r);for(const f of r.food)f.sides[f.side]=Math.min(200,f.sides[f.side]+100/foods[f.kind][1]*r.heat);r.heat=Math.max(1,r.heat-.04);if(Date.now()>r.nextEvent){const events=['🛸 外星人路過：給這攤一顆米其林隕石。','🌬️ 風把香味吹進了隔壁的試算表。','📞 媽媽來電：你在電腦前烤什麼肉？','🦆 鴨子衛生局：准許邊烤邊胡說八道。'];r.event=events[Math.floor(Math.random()*events.length)];log(r,r.event);r.nextEvent=Date.now()+30000}publish(r)}},1000);timer.unref();
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('BBQ ready on port '+(process.env.PORT||3000)));




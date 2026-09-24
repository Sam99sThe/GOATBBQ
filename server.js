import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const rooms=new Map(), sessions=new Map();
const foods={corn:['玉米',14],beef:['牛肉',9],wing:['雞翅',18],mushroom:['杏鮑菇',12]};
const avatars=['🦖','👽','🦆','🧑‍🚀','🐸','🗿'];
function log(r,text){r.log.unshift({id:randomUUID(),text});r.log=r.log.slice(0,15)}
function makeRoom(){let id;do{id=randomUUID().slice(0,6).toUpperCase()}while(rooms.has(id));const r={id,players:[],food:[],log:[],chat:[],heat:1,event:'今晚的熱量，只存在於想像。',nextEvent:Date.now()+30000};rooms.set(id,r);return r}
function snapshot(r){return {id:r.id,players:r.players.map(({id,name,avatar,seat,eaten,bubble,bubbleUntil})=>({id,name,avatar,seat,eaten,bubble:bubbleUntil>Date.now()?bubble:''})),food:r.food,log:r.log,chat:r.chat,heat:r.heat,event:r.event}}
function publish(r){const data=`data: ${JSON.stringify(snapshot(r))}\n\n`;for(const p of r.players)if(p.stream&&!p.stream.destroyed)p.stream.write(data)}
function remove(p){const r=rooms.get(p.room);p.stream?.end();sessions.delete(p.token);if(!r)return;r.players=r.players.filter(x=>x!==p);log(r,`${p.name} 帶著一身不存在的炭味離席。`);if(!r.players.length)rooms.delete(r.id);else publish(r)}
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
function act(r,p,b){
 if(b.type==='chat'){const text=typeof b.text==='string'?b.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim():'';if(!text||text.length>100)fail('請輸入 1～100 字。');if(Date.now()-(p.lastChat||0)<1200)fail('先喘口氣，一秒後再說。',429);p.lastChat=Date.now();r.chat.push({id:randomUUID(),playerId:p.id,name:p.name,avatar:p.avatar,text,time:Date.now()});r.chat=r.chat.slice(-50);p.bubble=text;p.bubbleUntil=Date.now()+6000;publish(r);return}
 if(b.type==='add'){if(!Object.hasOwn(foods,b.food))fail('這種食物還沒被發明。');if(r.food.length>=9)fail('烤網滿了，先吃掉一點。');let slot=0;while(r.food.some(f=>f.slot===slot))slot++;r.food.push({id:randomUUID(),kind:b.food,slot,owner:p.name,sides:[0,0],side:0});log(r,`${p.name} 放上了${foods[b.food][0]}。`)}
 else if(b.type==='flip'||b.type==='eat'){const f=r.food.find(x=>x.id===b.id);if(!f)fail('太慢了！這一口已經不見了。');if(b.type==='flip'){f.side=1-f.side;log(r,`${p.name} 帥氣翻面，假裝自己很專業。`)}else{r.food=r.food.filter(x=>x!==f);p.eaten++;const burnt=Math.max(...f.sides)>145,raw=Math.min(...f.sides)<65;log(r,`${p.name} ${p.name!==f.owner?'偷吃':'吃掉'}了${f.owner}的${foods[f.kind][0]}。${burnt?'口感：建築材料。':raw?'還沒熟，但你的虛擬肚子很堅強。':'外酥內嫩，現實依然很餓。'}`)}}
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
 let r;if(b.room){r=rooms.get(String(b.room).toUpperCase());if(!r)fail('這桌已散場，請回首頁開新桌。',404);if(r.players.length>=5)fail('這桌五人已滿，請回首頁加入另一桌。',409)}else r=[...rooms.values()].find(r=>r.players.length<5)||makeRoom();
 if(sessions.size>=500)fail('今晚客滿，請稍後再試。',503);
 const seat=[0,1,2,3,4].find(s=>!r.players.some(p=>p.seat===s));const p={id:randomUUID(),token:randomUUID(),name,avatar:avatars.includes(b.avatar)?b.avatar:avatars[0],seat,room:r.id,eaten:0,last:Date.now(),action:0};r.players.push(p);sessions.set(p.token,p);log(r,`${name} 坐下了。現實中的椅子並沒有動。`);publish(r);return json(200,{token:p.token,id:p.id,room:r.id})}
 const p=sessions.get(req.headers.authorization?.replace('Bearer ',''));if(!p)fail('座位已釋出，請重新入座。',401);p.last=Date.now();const r=rooms.get(p.room);
 if(url.pathname==='/api/leave'){remove(p);return json(200,{ok:true})}
 if(url.pathname==='/api/action'){if(Date.now()-p.action<220)fail('慢一點，夾子只有一支。',429);p.action=Date.now();act(r,p,b);return json(200,{ok:true})}fail('找不到操作',404);
 }
 if(req.method==='GET'&&url.pathname==='/api/events'){const p=sessions.get(url.searchParams.get('token'));if(!p)return json(401,{error:'座位已釋出'});p.stream?.end();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');p.stream=res;p.last=Date.now();publish(rooms.get(p.room));req.on('close',()=>{if(p.stream===res){p.stream=null;p.last=Date.now()}});return}
 const files={'/camp.png':['camp.png','image/png'],'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};const file=files[url.pathname];if(!file)return json(404,{error:'找不到頁面'});const data=await readFile(new URL(`./${file[0]}`,import.meta.url));res.writeHead(200,{'Content-Type':`${file[1]}; charset=utf-8`,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"});res.end(data);
 }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'烤爐打了個嗝，請再試一次。'})}
});
const timer=setInterval(()=>{for(const r of rooms.values()){for(const p of [...r.players]){if(p.stream)p.last=Date.now();else if(Date.now()-p.last>45000)remove(p)}if(!rooms.has(r.id))continue;for(const f of r.food)f.sides[f.side]=Math.min(200,f.sides[f.side]+100/foods[f.kind][1]*r.heat);r.heat=Math.max(1,r.heat-.04);if(Date.now()>r.nextEvent){const events=['🛸 外星人路過：給這攤一顆米其林隕石。','🌬️ 風把香味吹進了隔壁的試算表。','📞 媽媽來電：你在電腦前烤什麼肉？','🦆 鴨子衛生局：准許邊烤邊胡說八道。'];r.event=events[Math.floor(Math.random()*events.length)];log(r,r.event);r.nextEvent=Date.now()+30000}publish(r)}},1000);timer.unref();
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('BBQ ready on port '+(process.env.PORT||3000)));



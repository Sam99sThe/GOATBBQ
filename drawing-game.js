import {randomInt,randomUUID} from 'node:crypto';
import {Converter} from 'opencc-js';
const toTraditional=Converter({from:'cn',to:'tw'});
export const QUESTIONS='大象,象鼻,象牙,象耳,象腳,象腿,象尾巴,象眼睛,象嘴,象舌頭,象頭,象背,象肚子,象屁股,象皮,象毛,象腳掌,象腳趾,象指甲,象骨頭,象頭骨,象牙齒,象臼齒,象心臟,象肺,象胃,象腦,象骨架,小象,母象,公象,象群,非洲象,亞洲象,長毛象,猛獁象,大象腳印,大象糞便,大象尿尿,大象眼淚,大象雕像,大象玩偶,大象布偶,大象氣球,大象面具,大象帽子,大象衣服,大象拖鞋,大象抱枕,大象鑰匙圈,大象吊飾,大象貼紙,大象郵票,大象明信片,大象照片,大象畫像,大象壁畫,大象模型,大象積木,大象拼圖,大象公仔,大象存錢筒,大象水壺,大象杯子,大象碗,大象湯匙,大象餅乾,大象蛋糕,大象巧克力,大象糖果,大象鼻子造型吸管,大象造型溜滑梯,大象造型椅子,大象造型垃圾桶,大象造型澆水壺,象牙項鍊,象牙雕刻,象牙塔,象牙梳子,象牙鋼琴鍵,大象飼料,香蕉,西瓜,甘蔗,樹葉,樹枝,草,泥巴,水池,大象澡盆,大象圍欄,大象柵欄,大象運輸箱,大象鞍座,大象鈴鐺,大象腳鏈,大象刷子,大象水桶,大象便便鏟,大象腳印印章'.split(',');
export const COLORS=['#111111','#e53935','#2463eb','#f4c430','#24934f'];
const fail=(text,status=400)=>{throw Object.assign(Error(text),{status})};
export function createGame(){return {id:randomUUID(),epoch:0,phase:'lobby',members:[],round:0,deck:[],drawer:null,deadline:0,strokes:[],version:0,messages:[],guessed:[],points:0};}
function say(g,text,name='烤爐裁判'){g.messages.push({id:randomUUID(),name,text});g.messages=g.messages.slice(-60);}
function active(g){return g.members.filter(m=>!m.left)}
function finish(g){g.phase='finished';g.drawer=null;g.strokes=[];g.epoch++;g.version++;say(g,'本局結束，成績已出爐！');}
function round(g,now){if(g.round>=20||!active(g).length){finish(g);return}const a=active(g);g.drawer=a[g.round%a.length].id;g.round++;g.phase='drawing';g.deadline=now+60000;g.strokes=[];g.epoch++;g.points=0;g.version++;g.guessed=[];say(g,'第 '+g.round+' 題開始！');}
function reveal(g,now){g.phase='reveal';g.deadline=now+3000;say(g,'答案是：'+g.deck[g.round-1]);}
export function tickGame(g,now=Date.now()){if(!g)return;if(['drawing','reveal'].includes(g.phase)&&!active(g).length){finish(g);return}if(g.phase==='drawing'&&now>=g.deadline)reveal(g,now);else if(g.phase==='reveal'&&now>=g.deadline)round(g,now);}
export function leaveGame(g,id,now=Date.now()){if(!g)return;const m=g.members.find(m=>m.id===id&&!m.left);if(!m)return;if(g.phase==='lobby'){g.members=g.members.filter(m=>m.id!==id);return}m.left=true;m.ready=false;say(g,m.name+' 中途離開了');if(!active(g).length)finish(g);else if(g.phase==='drawing'&&g.drawer===id)reveal(g,now);}
export function gameView(g,id,includeCanvas=true){if(!g)return {phase:'lobby',members:[],messages:[],strokes:[],version:0,round:0};return {phase:g.phase,members:g.members.map(m=>({...m})),round:g.round,total:20,drawer:g.drawer,deadline:g.deadline,version:g.version,canvasKey:g.id+':'+g.round+':'+g.epoch,...(includeCanvas?{strokes:g.strokes}:{}),messages:g.messages,guessed:g.guessed,prompt:g.phase==='drawing'&&g.drawer===id?g.deck[g.round-1]:null,answer:g.phase==='reveal'?g.deck[g.round-1]:null,letterCount:g.phase==='drawing'?g.deck[g.round-1].length:0,canStart:g.phase==='lobby'&&g.members.length>=2&&g.members.every(m=>m.ready)};}
export function gameAction(room,p,b,now=Date.now()){
 let g=room.game??=createGame();tickGame(g,now);
 if(b.type==='join'){if(p.seat===null)fail('卡位者可以觀戰與聊天，入座後才能加入遊戲。',403);if(g.phase==='finished')g=room.game=createGame();if(g.phase!=='lobby')fail('本局已開始，請先觀戰。');if(!g.members.some(m=>m.id===p.id))g.members.push({id:p.id,name:p.name,ready:false,score:0,left:false});return;}
 if(b.type==='leave'){leaveGame(g,p.id,now);return;}
 const member=g.members.find(m=>m.id===p.id&&!m.left);
 if(b.type==='ready'){if(!member||g.phase!=='lobby')fail('請先加入遊戲。');member.ready=!member.ready;return;}
 if(b.type==='start'){if(!member||!gameView(g,p.id).canStart)fail('至少兩位大象加入，而且大家都準備好才能開始。');g.deck=[...QUESTIONS];for(let i=g.deck.length-1;i>0;i--){const j=randomInt(i+1);[g.deck[i],g.deck[j]]=[g.deck[j],g.deck[i]]}g.deck=g.deck.slice(0,20);round(g,now);return;}
 if(b.type==='draw'||b.type==='clear'){
  if(g.phase!=='drawing'||g.drawer!==p.id)fail('只有當題畫家能畫畫。',403);if(b.round!==g.round)fail('這題已經結束。',409);
  if(b.type==='clear'){g.strokes=[];g.epoch++;g.points=0;g.version++;return;}
  if(!COLORS.includes(b.color)||!Number.isFinite(b.width)||b.width<1||b.width>14||!Array.isArray(b.points)||b.points.length<1||b.points.length>32||b.points.some(a=>!Array.isArray(a)||a.length!==2||a.some(v=>!Number.isFinite(v)||v<0||v>1)))fail('畫筆資料無效。');
  if(g.points+b.points.length>3000)fail('畫布已滿，請清除後繼續。');g.points+=b.points.length;g.strokes.push({color:b.color,width:b.width,points:b.points});g.version++;return;
 }
 if(b.type==='chat'){
  const text=typeof b.text==='string'?b.text.trim().normalize('NFC'):'';
  if(!text||text.length>100||!/[\p{Script=Han}]/u.test(text)||!/^[\p{Script=Han}\p{P}\p{Zs}0-9]+$/u.test(text)||toTraditional(text)!==text)fail('想要 International 一些，但抱歉这里只支援繁體中文。'.replace('这里','這裡'));
  if(now-(p.gameChatAt||0)<700)fail('稍等一下再送出。',429);p.gameChatAt=now;
  const answer=g.phase==='drawing'?g.deck[g.round-1]:null;
  if(answer&&(g.drawer===p.id||g.guessed.includes(p.id)))fail('畫家與已答對的玩家請先專心看畫，下一題再聊天。');
  if(answer&&text.includes(answer)){
   if(member&&text===answer){member.score+=10;const painter=g.members.find(m=>m.id===g.drawer);if(painter)painter.score+=5;g.guessed.push(p.id);say(g,p.name+' 答對了！');if(active(g).filter(m=>m.id!==g.drawer).every(m=>g.guessed.includes(m.id)))reveal(g,now);}
   else say(g,'答案先保密，留給參賽者猜！',p.name);
  }else say(g,text,p.name);return;
 }
 fail('未知遊戲操作。');
}

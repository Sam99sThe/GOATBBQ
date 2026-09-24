import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS,gameAction,gameView,tickGame,leaveGame} from './drawing-game.js';
const players=()=>[{id:'a',name:'甲',seat:0},{id:'b',name:'乙',seat:1},{id:'v',name:'觀眾',seat:null}];
function setup(){const room={},p=players();for(const a of p.slice(0,2)){gameAction(room,a,{type:'join'},1000);gameAction(room,a,{type:'ready'},1000)}gameAction(room,p[0],{type:'start'},1000);return {room,p};}
test('twenty distinct rounds, secrets stay with painter; spectators cannot draw or score',()=>{
 const {room,p}=setup();assert.equal(QUESTIONS.length,100);assert.equal(new Set(room.game.deck).size,20);
 for(let i=1;i<=20;i++){const g=room.game,drawer=p.find(p=>p.id===g.drawer),guesser=p.find(p=>p.seat!==null&&p.id!==g.drawer);assert.equal(g.round,i);const now=g.deadline-1000;const answer=gameView(g,drawer.id).prompt;assert.ok(answer);assert.equal(gameView(g,guesser.id).prompt,null);assert.ok(!JSON.stringify(gameView(g,p[2].id)).includes('deck'));assert.throws(()=>gameAction(room,p[2],{type:'draw',round:i},now));gameAction(room,p[2],{type:'chat',text:answer},now);assert.equal(g.phase,'drawing');assert.ok(!g.messages.at(-1).text.includes(answer));gameAction(room,guesser,{type:'chat',text:answer},now);assert.equal(g.phase,'reveal');tickGame(g,now+3001);}
 assert.equal(room.game.phase,'finished');assert.equal(room.game.members.reduce((sum,m)=>sum+m.score,0),300);
});
test('readiness uses joined subset; canvas is bounded and only sent on full snapshots',()=>{
 const {room,p}=setup(),g=room.game;gameAction(room,p[0],{type:'draw',round:1,color:'#111111',width:4,points:[[.1,.2],[.3,.4]]},1100);assert.equal(gameView(g,'a',false).strokes,undefined);assert.equal(gameView(g,'b').strokes.length,1);const key=gameView(g,'a').canvasKey;gameAction(room,p[0],{type:'clear',round:1},1200);assert.notEqual(gameView(g,'a').canvasKey,key);assert.throws(()=>gameAction(room,p[0],{type:'draw',round:1,color:'#111111',width:4,points:[[Infinity,0]]},1300));assert.throws(()=>gameAction(room,p[2],{type:'chat',text:'hello'},1500));assert.throws(()=>gameAction(room,p[2],{type:'chat',text:'这是什么'},2500));gameAction(room,p[2],{type:'chat',text:'看不懂啦'},3500);leaveGame(g,'a',4000);assert.equal(g.phase,'reveal');leaveGame(g,'b',4100);assert.equal(g.phase,'finished');
});

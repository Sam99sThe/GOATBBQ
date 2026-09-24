export function mountDrawing({api,getMe,toast}){
 const $=s=>document.querySelector(s),dialog=$('#gameDialog'),canvas=$('#drawCanvas'),ctx=canvas.getContext('2d');let game={},color='#111111',width=4,painting=false,points=[],sending=false,lastVersion=-1,lastRound=-1,lastMessage='',queue=[];
 function stroke(s){ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();s.points.forEach(([x,y],i)=>i?ctx.lineTo(x*800,y*500):ctx.moveTo(x*800,y*500));if(s.points.length===1){ctx.arc(s.points[0][0]*800,s.points[0][1]*500,s.width/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()}
 function paint(){ctx.fillStyle='#fff';ctx.fillRect(0,0,800,500);for(const s of game.strokes||[])stroke(s);for(const s of queue)if(s.round===game.round)stroke(s);if(points.length)stroke({color,width,points});}
 async function command(type,data={}){try{return await api('game',{type,...data})}catch(e){toast(e.message);return null}}
 async function drain(){if(sending)return;sending=true;try{while(queue.length){const s=queue[0];const result=await command('draw',s);queue.shift();await new Promise(r=>setTimeout(r,55));if(!result){queue=[];break}}}finally{sending=false;paint()}}
 function flush(){if(!points.length)return;queue.push({color,width,points,round:game.round});points=[];drain()}
 function position(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]}
 canvas.onpointerdown=e=>{if(game.phase!=='drawing'||game.drawer!==getMe()?.id)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);painting=true;points=[position(e)];paint()};
 canvas.onpointermove=e=>{if(!painting)return;e.preventDefault();points.push(position(e));paint();if(points.length>=12){const last=points.at(-1);flush();points=[last]}};
 canvas.onpointerup=canvas.onpointercancel=e=>{if(!painting)return;points.push(position(e));painting=false;flush()};
 $('#drawColors').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;flush();color=b.dataset.color;document.querySelectorAll('[data-color]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)))};
 $('#drawWidth').oninput=e=>{flush();width=Number(e.target.value)};
 $('#clearDrawing').onclick=()=>command('clear',{round:game.round});
 $('#gameButton').onclick=()=>{if(!getMe()){toast('請先進入烤肉房間。');return}dialog.showModal();paint()};
 $('#closeGame').onclick=()=>dialog.close();
 $('#leaveGame').onclick=async()=>{await command('leave');dialog.close()};
 $('#joinGame').onclick=()=>command('join');$('#readyGame').onclick=()=>command('ready');$('#startGame').onclick=()=>command('start');
 $('#gameChatForm').onsubmit=async e=>{e.preventDefault();const input=$('#gameChatInput'),button=$('#gameChatSend');if(input.value.trim()){button.disabled=true;const result=await command('chat',{text:input.value});if(result)input.value='';button.disabled=false}};
 return {strokeUpdate(event){if(event.canvasKey!==game.canvasKey||event.version<=game.version)return;game.strokes??=[];game.strokes.push(event.stroke);game.version=event.version;lastVersion=event.version;paint();},update(g,now,players){const old=game;game=g||{};if(!game.strokes)game.strokes=game.canvasKey===old.canvasKey?(old.strokes||[]):[];const me=getMe(),member=game.members?.find(m=>m.id===me?.id&&!m.left),self=players.find(p=>p.id===me?.id),lobby=game.phase==='lobby'||game.phase==='finished';
 $('#joinGame').hidden=!!member&&!lobby||!!member&&game.phase==='lobby';$('#joinGame').disabled=!lobby||self?.seat===null;$('#joinGame').textContent=game.phase==='finished'?'加入下一局':'加入';
 $('#readyGame').hidden=!member||game.phase!=='lobby';$('#readyGame').textContent=member?.ready?'取消準備':'準備';$('#startGame').hidden=game.phase!=='lobby';$('#startGame').disabled=!member||!game.canStart;
 $('#leaveGame').hidden=!member;$('#gameRound').textContent=game.phase==='drawing'||game.phase==='reveal'?`第 ${game.round} / 20 題 · ${Math.max(0,Math.ceil((game.deadline-now)/1000))} 秒`:game.phase==='finished'?'本局結束':'等大家加入';
 const painter=game.members?.find(m=>m.id===game.drawer);$('#gamePrompt').textContent=game.prompt?'你畫：'+game.prompt:game.answer?'答案：'+game.answer:game.phase==='drawing'?`${painter?.name||'畫家'} 正在畫 · ${game.letterCount} 個字`:'至少 2 人加入並準備，即可開始';
 $('#gameRoster').replaceChildren(...(game.members||[]).map(m=>{const el=document.createElement('span');el.textContent=m.name+' · '+(m.left?'已離開':m.ready?'已準備':'未準備')+' · '+m.score+' 分';return el}));
 $('#drawingTools').hidden=game.phase!=='drawing'||game.drawer!==me?.id;canvas.classList.toggle('can-draw',game.phase==='drawing'&&game.drawer===me?.id);
 if(game.round!==lastRound||game.canvasKey!==old.canvasKey){painting=false;points=[];queue=[];lastRound=game.round}if(game.version!==lastVersion){lastVersion=game.version;paint()}
 const list=$('#gameMessages'),messages=game.messages||[];if(messages.at(-1)?.id!==lastMessage){const bottom=list.scrollTop+list.clientHeight>=list.scrollHeight-60;list.replaceChildren(...messages.map(m=>{const row=document.createElement('p'),name=document.createElement('b');name.textContent=m.name+'：';row.append(name,document.createTextNode(m.text));return row}));if(bottom)list.scrollTop=list.scrollHeight;lastMessage=messages.at(-1)?.id;}
 $('#gameScores').hidden=game.phase!=='finished';if(game.phase==='finished'){$('#gameScores').replaceChildren(...[...(game.members||[])].sort((a,b)=>b.score-a.score).map((m,i)=>{const el=document.createElement('p');el.textContent=`${i+1}. ${m.name} — ${m.score} 分${m.left?'（中途離開）':''}`;return el}))}
 },close(){dialog.close();game={};queue=[];points=[];}};
}

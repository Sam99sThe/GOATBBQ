import {drinks} from './drinks.js';
import {BBQScene} from './scene.js';
const $=s=>document.querySelector(s), avatars=['🐘'],names=['大象 · 原地 Idle'];
const foods={fish:['🐟','鮮魚',14],beef:['🥩','牛肉',9],wing:['🍗','雞腿',18],roast:['🐟','烤魚',12]};
let avatar=avatars[0],me=null,state=null,events=null,selected=null,sound=false,audio,toastTimer;
let bbq=null;
let danmakuOn=true,chatReady=false,lastChatId='',lane=0;
const seenChat=new Set();
function fly(message){if(!danmakuOn||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const area=$('#danmaku');if(area.children.length>=12)return;const el=document.createElement('span');el.className='danmaku-message'+(message.playerId===me?.id?' mine':'');el.textContent=message.system?message.text:message.avatar+' '+message.name+'：'+message.text;el.style.top=(lane++%5)*17+'%';el.style.setProperty('--travel',area.clientWidth+'px');area.append(el);el.addEventListener('animationend',()=>el.remove());setTimeout(()=>el.remove(),13000)}
function renderChat(){const messages=state.chat||[];$('#chatCount').textContent=state.players.length+'/15';const newest=messages.at(-1)?.id;if(newest&&newest!==lastChatId){const area=$('#chatMessages'),atBottom=area.scrollHeight-area.scrollTop-area.clientHeight<70;for(const message of messages){if(seenChat.has(message.id))continue;if(!lastChatId)area.replaceChildren();const row=document.createElement('div');row.className='message'+(message.playerId===me?.id?' mine':'');row.innerHTML=`<span class="message-avatar">${esc(message.avatar)}</span><div class="message-content"><div class="message-meta"><span>${esc(message.name)}</span><time>${new Date(message.time).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false})}</time></div><div class="message-text">${esc(message.text)}</div></div>`;area.append(row);if(chatReady)fly(message);seenChat.add(message.id);lastChatId=message.id}while(area.children.length>50)area.firstChild.remove();if(atBottom||messages.at(-1)?.playerId===me?.id)area.scrollTop=area.scrollHeight;const ids=new Set(messages.map(m=>m.id));for(const id of seenChat)if(!ids.has(id))seenChat.delete(id)}chatReady=true}
function html(selector,value){const el=$(selector);if(el.innerHTML!==value)el.innerHTML=value}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500)}
async function api(path,data){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(me?{Authorization:'Bearer '+me.token}:{})},body:JSON.stringify(data)});const b=await r.json();if(!r.ok){if(r.status===401){events?.close();me=null;$('#joinDialog').showModal()}throw Error(b.error)}return b}
function beep(){if(!sound)return;audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=220+Math.random()*500;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.start();o.stop(audio.currentTime+.12)}
async function action(data){if(!me){$('#joinDialog').showModal();return}try{const result=await api('action',data);if(result.expelled){handleExpulsion(result.reason);return}beep()}catch(e){toast(e.message)}}
function condition(f){return Math.max(...f.sides)>145?'burnt':Math.min(...f.sides)>=65?'ready':'raw'}
function label(f){return {burnt:'炭化藝術',ready:'開吃！',raw:'還在烤'}[condition(f)]}
function render(){
 renderChat(); bbq?.sync(state,me);renderDrinks();
 const self=state.players.find(p=>p.id===me?.id),waiting=self?.seat===null;
 document.querySelectorAll('[data-add],[data-action],[data-motion],#say,#flip').forEach(b=>b.disabled=!!waiting);
 $('#onlineCount').textContent=state.players.length+' / 15';let queue=0;
 html('#onlineList',state.players.map(p=>'<li>'+esc(p.name)+(p.id===me?.id?' · 你':'')+' <span>'+(p.seat===null?'卡位 #'+(++queue):'大象座位 '+(p.seat+1))+'</span></li>').join(''));
 $('#seatStatus').textContent=waiting?'卡位第 '+(state.players.filter(p=>p.seat===null).findIndex(p=>p.id===me.id)+1)+' 位 · 可以聊天、吃食物；空位自動遞補':self?'你已入座 · 烤爐由你接手':'入座後開始烤肉';
 $('#roomLabel').textContent=`${state.id||"今晚的烤肉桌"} · ${state.players.filter(p=>p.seat!==null).length}/5 大象 · ${state.players.filter(p=>p.seat===null).length}/10 卡位`;
 html('#grill',Array.from({length:9},(_,i)=>{const f=state.food.find(x=>x.slot===i);return f?`<button class="food-slot ${condition(f)}" data-food-id="${f.id}" aria-label="${foods[f.kind][1]}，${label(f)}，點擊操作">${foods[f.kind][0]}<small>${label(f)}</small></button>`:'<div class="food-slot empty"></div>'}).join(''));
 $('#heat').textContent=`🔥 ${Math.round(state.heat*100)}%`;$('#event').textContent=state.event;$('#feed').innerHTML=state.log.map(l=>`<li>${esc(l.text)}</li>`).join('');
 if(selected){const f=state.food.find(f=>f.id===selected);if(f){$('#foodTitle').textContent=foods[f.kind][0]+' '+foods[f.kind][1];$('#foodState').textContent=`${f.owner} 放的 · ${label(f)}。A 面 ${Math.round(f.sides[0])}% / B 面 ${Math.round(f.sides[1])}%（目前烤 ${f.side===0?'A':'B'} 面）。兩面 65% 可吃，超過 145% 烤焦。`}else{$('#foodDialog').close();selected=null;toast('這口已經被吃掉了。')}}
}
$('#roomName').value=new URLSearchParams(location.search).get('room')||'';
const accessoryNames={cowboy:'牛仔帽',goggles:'泳鏡',sunglasses:'太陽眼鏡',mustache:'鬍子',tophat:'紳士帽',thief:'小偷帽',bald:'地中海髮型',laser:'鐳射眼',crown:'皇冠',party:'派對帽'};
$('#accessoryChoices').innerHTML=Object.entries(accessoryNames).map(([id,name])=>'<label><input type="checkbox" value="'+id+'">'+name+'</label>').join('');
function renderDrinks(){const p=state.players.find(p=>p.id===me?.id),d=state.delivery;const blocked=!p||p.seat===null||!!(d&&(d.phase!=='waiting'||d.orders.some(o=>o.playerId===p.id)));$('#drinkButton').disabled=!p||p.seat===null;document.querySelectorAll('[data-drink]').forEach(b=>b.disabled=blocked);$('#drinkStatus').textContent=d?d.phase==='waiting'?'已點 '+d.orders.length+' 杯 · '+Math.max(0,Math.ceil((d.dispatchAt-state.now)/1000))+' 秒後出發':d.phase==='riding'?'外送機車正在路上…':'大家一起喝 · '+Math.max(0,Math.ceil((d.endsAt-state.now)/1000))+' 秒後開放下單':'這一輪，誰先點？';}
$('#drinkChoices').innerHTML=Object.entries(drinks).map(([id,name])=>'<button data-drink="'+id+'">🥤 '+name+'</button>').join('');$('#drinkButton').onclick=()=>{$('#drinkDialog').showModal();renderDrinks()};$('#closeDrink').onclick=()=>$('#drinkDialog').close();$('#drinkChoices').onclick=e=>{const b=e.target.closest('[data-drink]');if(b)action({type:'drink',drink:b.dataset.drink})};
$('#avatars').innerHTML=avatars.map((a,i)=>`<button type="button" data-avatar="${a}" aria-label="${names[i]}" aria-pressed="${i===0}">${a} <span>大象 · 原地 Idle</span></button>`).join('');
$('#avatars').onclick=e=>{const b=e.target.closest('button');if(!b)return;avatar=b.dataset.avatar;$('#avatars').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
$('#menu').innerHTML=Object.entries(foods).map(([k,[emoji,name,sec]])=>`<button data-add="${k}"><b>${emoji}</b><span>${name}<small>每面約 ${sec} 秒</small></span></button>`).join('');
$('#menu').onclick=e=>{const b=e.target.closest('[data-add]');if(b)action({type:'add',food:b.dataset.add})};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action({type:b.dataset.action}));
document.querySelectorAll('[data-motion]').forEach(b=>b.onclick=()=>action({type:'motion',motion:b.dataset.motion}));
$('#say').onchange=e=>{if(e.target.value!=='')action({type:'say',index:Number(e.target.value)});e.target.value=''};
$('#grill').onclick=e=>{const b=e.target.closest('[data-food-id]');if(b){selected=b.dataset.foodId;render();$('#foodDialog').showModal()}};
$('#flip').onclick=()=>action({type:'flip',id:selected});$('#eat').onclick=()=>{action({type:'eat',id:selected});selected=null;$('#foodDialog').close()};$('#closeFood').onclick=()=>{selected=null;$('#foodDialog').close()};$('#foodDialog').onclose=()=>{selected=null};
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent='♫ 音效 '+(sound?'開':'關');$('#sound').setAttribute('aria-pressed',sound);beep()};
$('#danmakuToggle').onclick=()=>{danmakuOn=!danmakuOn;$('#danmakuToggle').textContent='彈幕 '+(danmakuOn?'開':'關');$('#danmakuToggle').setAttribute('aria-pressed',danmakuOn);if(!danmakuOn)$('#danmaku').replaceChildren()};
$('#chatInput').oninput=()=>{$('#chatLength').textContent=$('#chatInput').value.length+' / 100'};
$('#chatForm').onsubmit=async e=>{e.preventDefault();if(!me){$('#joinDialog').showModal();return}const input=$('#chatInput'),text=input.value.trim(),button=$('#chatForm button');if(!text)return;button.disabled=true;try{await api('action',{type:'chat',text});input.value='';$('#chatLength').textContent='0 / 100';input.focus()}catch(error){toast(error.message)}finally{button.disabled=false}};
$('#invite').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('連結已複製，叫朋友帶著空氣來！')}catch{toast('請複製網址列連結邀請朋友。')}};
$('#leave').onclick=async()=>{try{await api('leave',{});sessionStorage.removeItem('bbq');location.href='/'}catch(e){toast(e.message)}};
function handleExpulsion(reason){if(!me)return;events?.close();events=null;sessionStorage.removeItem('bbq');me=null;selected=null;$('#foodDialog').close();$('#leave').hidden=true;$('#invite').hidden=true;$('#connection').textContent='渡劫失敗 · 已離席';$('#joinError').textContent=reason;$('#joinDialog').showModal();toast(reason);}
function connect(){events?.close();chatReady=false;events=new EventSource('/api/events?token='+encodeURIComponent(me.token));events.addEventListener('expelled',e=>handleExpulsion(JSON.parse(e.data).reason));events.onmessage=e=>{state=JSON.parse(e.data);$('#connection').textContent='● 炭火連線中';render()};events.onerror=()=>{$('#connection').textContent='正在重新生火…';if(events.readyState===EventSource.CLOSED){events.close();sessionStorage.removeItem('bbq');me=null;$('#joinError').textContent='座位已釋出，請重新入座。';$('#joinDialog').showModal()}}}
$('#joinForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;$('#joinError').textContent='';try{let token;try{token=JSON.parse(sessionStorage.getItem('bbq'))?.token}catch{}me=await api('join',{name:$('#name').value,avatar,room:$('#roomName').value,accessories:[...document.querySelectorAll('#accessoryChoices input:checked')].map(x=>x.value),token});sessionStorage.setItem('bbq',JSON.stringify(me));history.replaceState({},'', '?room='+encodeURIComponent(me.room));$('#joinDialog').close();$('#invite').hidden=false;$('#leave').hidden=false;connect()}catch(e){$('#joinError').textContent=e.message;$('#newRoom').hidden=false}finally{b.disabled=false}};
$('#joinDialog').addEventListener('cancel',e=>{if(!me)e.preventDefault()});
try{
 bbq=new BBQScene({container:$('#scene3d'),labels:$('#playerLabels'),onFood:id=>{selected=id;render();$('#foodDialog').showModal()},status:(message,error=false)=>{$('#sceneStatus').textContent=message;$('#sceneLoading').classList.toggle('error',error);$('#sceneLoading').classList.toggle('ready',!!bbq?.ready&&!error)}});
 bbq.load().catch(error=>{console.error(error);$('#sceneStatus').textContent='3D 模型載入失敗，請重新整理。'+error.message;$('#sceneLoading').classList.add('error')});
}catch(error){$('#sceneStatus').textContent='此瀏覽器無法啟動 3D，請使用支援 WebGL 2 的瀏覽器。';$('#sceneLoading').classList.add('error');console.error(error)}
$('#resetView').onclick=()=>bbq?.resetCamera();$('#grillView').onclick=()=>bbq?.focusGrill();
async function showCredits(){const dialog=$('#creditsDialog');dialog.showModal();if($('#creditsList').childElementCount)return;try{const records=await fetch('/credits.json').then(r=>r.json());$('#creditsList').innerHTML=records.map(r=>`<article class="credit"><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a><strong>${esc(r.author)}</strong><a class="license" href="${esc(r.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.license)}</a><p>${esc(r.changes)}</p><small>${esc(r.file)}</small></article>`).join('')}catch{$('#creditsList').textContent='Credits 載入失敗，請重新整理重試。'}}
$('#creditsButton').onclick=showCredits;$('#footerCredits').onclick=showCredits;$('#closeCredits').onclick=()=>$('#creditsDialog').close();
state={players:[],food:[],log:[],chat:[],heat:1,event:'☾ 今晚的熱量，只存在於想像。'};render();$('#roomLabel').textContent='今晚，誰來顧火？';$('#joinDialog').showModal();



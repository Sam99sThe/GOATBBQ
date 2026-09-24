export const drinks={green:'無糖綠茶',oil:'冰橄欖油',beer:'啤酒',plum:'梅子綠',milk:'珍珠奶茶',cola:'肥宅快樂水'};
export function orderDrink(room,player,kind,now=Date.now()){
 if(player.seat===null)throw Object.assign(Error('卡位者不能點飲料。'),{status:403});
 if(!Object.hasOwn(drinks,kind))throw Object.assign(Error('沒有這種飲料。'),{status:400});
 advanceDrinks(room,now);const d=room.delivery;
 if(d&&d.phase!=='waiting')throw Object.assign(Error('這批正在配送或享用中，請等大家喝完。'),{status:409});
 if(d?.orders.some(o=>o.playerId===player.id))throw Object.assign(Error('你已點過這批飲料。'),{status:409});
 room.delivery=d||{id:crypto.randomUUID(),phase:'waiting',orders:[]};
 room.delivery.orders.push({playerId:player.id,kind,seat:player.seat});room.delivery.dispatchAt=now+15000;
}
export function advanceDrinks(room,now=Date.now()){
 const d=room.delivery;if(!d)return;
 d.orders=d.orders.filter(o=>room.players.some(p=>p.id===o.playerId&&p.seat!==null));
 if(!d.orders.length){room.delivery=null;return;}
 if(d.phase==='waiting'&&now>=d.dispatchAt){d.phase='riding';d.startedAt=d.dispatchAt;d.servedAt=d.startedAt+10000;d.endsAt=d.servedAt+45000;}
 if(d.phase==='riding'&&now>=d.servedAt)d.phase='drinking';
 if(d.phase==='drinking'&&now>=d.endsAt)room.delivery=null;
}

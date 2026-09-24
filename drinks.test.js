import {test} from 'node:test';import assert from 'node:assert/strict';import {orderDrink,advanceDrinks} from './drinks.js';
test('debounce each new order, one delivery, shared 45-second drink window and spectator restrictions',()=>{
 const a={id:'a',seat:0},b={id:'b',seat:1},c={id:'c',seat:2},room={players:[a,b,c]};
 orderDrink(room,a,'green',0);assert.equal(room.delivery.dispatchAt,15000);
 assert.throws(()=>orderDrink(room,a,'beer',1000));assert.equal(room.delivery.dispatchAt,15000);
 orderDrink(room,b,'oil',14000);assert.equal(room.delivery.dispatchAt,29000);
 orderDrink(room,c,'cola',28000);assert.equal(room.delivery.dispatchAt,43000);
 advanceDrinks(room,42999);assert.equal(room.delivery.phase,'waiting');advanceDrinks(room,43000);assert.equal(room.delivery.phase,'riding');assert.throws(()=>orderDrink(room,a,'green',44000));
 advanceDrinks(room,53000);assert.equal(room.delivery.phase,'drinking');advanceDrinks(room,97999);assert.equal(room.delivery.phase,'drinking');advanceDrinks(room,98000);assert.equal(room.delivery,null);orderDrink(room,a,'beer',98000);
 assert.throws(()=>orderDrink(room,{id:'w',seat:null},'green',99000));
});
test('departing customers never transfer cups to replacement seats; empty order cancels',()=>{const a={id:'a',seat:0},room={players:[a]};orderDrink(room,a,'beer',0);room.players=[{id:'b',seat:0}];advanceDrinks(room,15000);assert.equal(room.delivery,null)});

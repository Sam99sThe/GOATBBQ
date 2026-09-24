import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyMeal,health,nauseaLevels,angerLevels} from './game-rules.js';
test('only crossing the limit expels; recovery from the limit gives another safe level',()=>{
 for(const [field,sides] of [['nausea',[0,100]],['anger',[200,100]]]){const p={nausea:0,anger:0};for(let i=0;i<17;i++)assert.equal(applyMeal(p,sides),false);assert.equal(p[field],17);assert.equal(applyMeal(p,[100,100]),false);assert.equal(p[field],16);assert.equal(applyMeal(p,sides),false);assert.equal(applyMeal(p,sides),true);}
});
test('17 independent health levels, mixed hazards, normal meals recover one level and clamp',()=>{
 const p={nausea:0,anger:0};assert.equal(new Set(nauseaLevels).size,17);assert.equal(new Set(angerLevels).size,17);
 applyMeal(p,[64,100]);assert.deepEqual(p,{nausea:1,anger:0});
 applyMeal(p,[146,100]);assert.deepEqual(p,{nausea:1,anger:1});
 applyMeal(p,[146,20]);assert.deepEqual(p,{nausea:2,anger:2});
 applyMeal(p,[65,145]);assert.deepEqual(p,{nausea:1,anger:1});
 for(let i=0;i<30;i++)applyMeal(p,[200,0]);assert.deepEqual(p,{nausea:17,anger:17});assert.equal(health(p).nauseaText,nauseaLevels[16]);
 applyMeal(p,[100,100]);assert.deepEqual(p,{nausea:16,anger:16});
 for(let i=0;i<30;i++)applyMeal(p,[100,100]);assert.deepEqual(p,{nausea:0,anger:0});assert.equal(health(p).angerText,'');
});

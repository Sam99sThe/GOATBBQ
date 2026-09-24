import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
export function openExpulsionStore(filename=resolve('data/expulsions.sqlite')){
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);db.exec(`CREATE TABLE IF NOT EXISTS expulsions(id TEXT PRIMARY KEY, occurred_at TEXT NOT NULL, player_name TEXT NOT NULL, room_name TEXT NOT NULL, reason TEXT NOT NULL, food_kind TEXT NOT NULL, side_a REAL NOT NULL, side_b REAL NOT NULL, nausea_level INTEGER NOT NULL, anger_level INTEGER NOT NULL);`);
 const insert=db.prepare('INSERT INTO expulsions VALUES(?,?,?,?,?,?,?,?,?,?)');
 return {db,record(p,food,before=p){const raw=Math.min(...food.sides)<65&&before.nausea>=17,burnt=Math.max(...food.sides)>145&&before.anger>=17;insert.run(randomUUID(),new Date().toISOString(),p.name,p.room,raw&&burnt?'未熟與烤焦同時超標':raw?'未熟食物：噁心超標':'烤焦食物：憤怒超標',food.kind,...food.sides,p.nausea,p.anger);},close(){db.close()}};
}

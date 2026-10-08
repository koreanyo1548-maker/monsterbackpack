// Runs the battle simulation in plain Node (no browser, no DOM) from data/game-data.json and a hand-made bag.
// Proves battle-sim.js has no browser dependency and that a battle replays identically from its seed.
//
// Usage:  node tools/sim-node.mjs [--wave 3] [--seed 1]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readData} from './data-io.mjs';

const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:+process.argv[i+1];};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={Math,Map,Set,Object,Array,Number,JSON};sandbox.window=sandbox;     // no document, no canvas, no timers
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/battle-sim.js'),'utf8'),sandbox);

// A 6x6 bag: golem (2x2) up front, two orcs behind it, a goblin and a mage at the back.
const cols=6,cell=(x,y)=>y*cols+x;
const piece=(id,cells)=>({id,cells,power:{hp:1,atk:1,rate:1,tags:[]}});
const groups=[
  {type:'golem',aff:'none',pieces:[piece(1,[cell(0,0),cell(1,0),cell(0,1),cell(1,1)])]},
  {type:'orc',aff:'fire',pieces:[piece(2,[cell(2,0),cell(3,0)]),piece(3,[cell(2,1),cell(3,1)])]},
  {type:'goblin',aff:'none',pieces:[piece(4,[cell(0,3),cell(0,4)])]},
  {type:'mage',aff:'poison',pieces:[piece(5,[cell(2,3),cell(3,3),cell(2,4)])]},
];
const cellPiece=Array(36).fill(null);for(const g of groups)for(const p of g.pieces)for(const i of p.cells)cellPiece[i]=p.id;

function run(wave,seed){
  const data=readData(),Sim=sandbox.createBattleSim(data);
  const b=Sim.createBattle({seed,wave,cols,open:Array(36).fill(true),groups,cellPiece});
  let steps=0;while(!b.end&&steps<2600){Sim.step(b,.025);steps++;}
  const hp=b.units.map(u=>Math.round(u.hp)).join(',');
  return {won:b.won,time:+b.time.toFixed(2),kills:b.stats.kills,hp};
}
const wave=arg('wave',3),seed=arg('seed',1),a=run(wave,seed),b=run(wave,seed);
console.log(`wave ${wave} seed ${seed}:`,a.won?'won':'lost',`${a.time}s, ${a.kills} kills`);
if(JSON.stringify(a)!==JSON.stringify(b)){console.error('NOT deterministic');process.exit(1);}
console.log('replay from the same seed is identical');

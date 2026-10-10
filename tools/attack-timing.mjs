// Attack-animation audit: for every rigged unit type (ally stats and enemy stats) checks that the rig's wind-up is
// visible before each hit and prints how fast the animation plays compared to its authored length.
//
//  - fit:   the attack cycle (1/rate) must hold the wind-up plus a follow-through; playback < 1x means it is cut short.
//  - duel:  a real sim duel (unit vs a tough dummy). Every attack, including the first one after arriving in range,
//           must be preceded by a standing wind-up of at least windupOf(u) seconds.
//
// Usage:  node tools/attack-timing.mjs        (exit code 1 when a unit fails)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readData} from './data-io.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={Math,Map,Set,Object,Array,Number,JSON};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/battle-sim.js'),'utf8'),sandbox);
const data=readData(),Sim=sandbox.createBattleSim(data);

// Rig timings live in assets/stickers/<type>/rig.js as a plain object literal; read start/impact/end from the attack block.
function rigAttack(type){
  const src=fs.readFileSync(path.join(root,'assets/stickers',type,'rig.js'),'utf8');
  const num=k=>+new RegExp(`"?attack"?[\\s\\S]*?"?${k}"?\\s*:\\s*([0-9.]+)`).exec(src)?.[1];
  return {start:num('start'),impact:num('impact'),end:num('end')};
}

let bad=0;
const rows=[];
const dt=.025;
for(const type of Object.keys(data.units)){
  const d=data.units[type];if(d.material||!d.windup)continue;
  const rig=rigAttack(type),natW=rig.impact-rig.start,natR=rig.end-rig.impact;
  for(const side of ['ally','enemy']){
    const s=side==='ally'?d:data.enemies[type];if(!s)continue;
    const cycle=1/s.rate,w=Math.min(d.windup,.5/s.rate),rec=Math.max(.15,Math.min(natR,.9/s.rate-w));
    // duel: one unit against a dummy that cannot die, starting out of range
    const melee=s.range<=60,gap=melee?160:s.range+120;
    const me=Sim.unit(type,side==='ally'?0:1,100,200,{hp:1e9,atk:1,rate:s.rate,range:s.range,speed:s.speed});
    const dummy=Sim.unit('slime',side==='ally'?1:0,100+gap,200,{hp:1e9,atk:0,rate:.0001,range:22,speed:0});
    me.cd=0;                                   // worst case: ready to strike the moment it arrives
    const b={units:[me,dummy],projectiles:[],fx:[],stats:{by:{},kills:0,damage:0},time:0,pieceList:[],adj:new Map(),end:false,boss:false,seed:1,layout:{sx:50,sy:30},allies:1,initialEnemies:1,listener:null};
    let standing=0,worst=1e9,hits=0,first=null;
    b.listener={attack:u=>{if(u!==me)return;if(process.env.DBG)console.log(type,side,'t',b.time.toFixed(2),'cd',me.cd.toFixed(2),'moving',me.moving,'standing',standing.toFixed(2));hits++;if(first===null)first=standing;worst=Math.min(worst,standing);standing=0;}};
    try{for(let i=0;i<Math.ceil(40/dt)&&hits<6;i++){
      const wasIn=Math.hypot(dummy.x-me.x,dummy.y-me.y)<=Sim.reachOf(me,dummy)+4;
      Sim.step(b,dt);
      standing=(wasIn&&!me.moving)?standing+dt:me.moving?0:standing;
    }}catch(e){console.log(type,side,'duel could not run:',e.message);}
    if(process.env.DBG&&hits<3)console.log(type,side,'hits',hits,'me',me.x.toFixed(0),me.y.toFixed(0),'dummy',dummy.x.toFixed(0),dummy.y.toFixed(0),'cd',me.cd.toFixed(2),'hp',dummy.hp,'time',b.time.toFixed(1),'target',!!me.target,'d-reach',(Math.hypot(dummy.x-me.x,dummy.y-me.y)-Sim.reachOf(me,dummy)).toExponential(2),'moving',me.moving);
    const ok=hits>=3&&worst>=w-dt*3&&w+rec<=cycle+.001;
    if(!ok)bad++;
    rows.push([type,side,s.rate,cycle.toFixed(2),natW.toFixed(2),w.toFixed(2),(natW/w).toFixed(2)+'x',natR.toFixed(2),rec.toFixed(2),(natR/rec).toFixed(2)+'x',first===null?'-':first.toFixed(2),worst>1e8?'-':worst.toFixed(2),ok?'ok':'FAIL']);
  }
}
const head=['unit','side','rate','cycle','natWind','wind','playW','natRec','rec','playR','1st stand','min stand','result'];
const w=head.map((h,i)=>Math.max(h.length,...rows.map(r=>String(r[i]).length)));
const line=r=>r.map((c,i)=>String(c).padEnd(w[i])).join('  ');
console.log(line(head));for(const r of rows)console.log(line(r));
process.exit(bad?1:0);

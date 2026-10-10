// Plays a scripted run through scripts/run-rules.js in plain Node (no browser, no DOM, no storage) with an injected
// RNG. Proves the prepare-screen rules are UI-free and that a run replays identically from its seed.
//
// Usage:  node tools/rules-node.mjs [--seed 1]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readData} from './data-io.mjs';

const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:+process.argv[i+1];};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={Math,Map,Set,Object,Array,Number,JSON};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/run-rules.js'),'utf8'),sandbox);

function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

function play(seed){
  const rand=rng(seed),Rules=sandbox.createRunRules(readData()),log=[];
  const st=Rules.createRun('alchemist',rand);
  for(let wave=1;wave<=4;wave++){
    // spend everything: buy what fits, then reroll while affordable
    for(let round=0;round<6;round++){
      for(let i=0;i<3;i++){const r=Rules.buy(st,i);if(r.ok)log.push(`w${wave} buy ${r.piece.type}${r.onBench?' (bench)':''}`);}
      if(!Rules.reroll(st,rand).ok)break;
    }
    // try every material on every swarm, then fuse neighbouring materials
    for(let s=0;s<36;s++)for(let t=0;t<36;t++){const r=Rules.mutationResult(st,s,t);if(r){const m=Rules.applyMutation(st,s,t,r,rand);if(m)log.push(`w${wave} mutate ${st.board[t]?.type} -> ${r.aff} ${m.success?'ok':'fail'}`);break;}}
    log.push(`w${wave} swarm ${Rules.totalCount(st)} gold ${st.gold} open ${st.open.filter(Boolean).length}`);
    const won=Rules.totalCount(st)>0,res=Rules.settleBattle(st,won);
    log.push(`w${wave} settle ${st.status} +${res.earned}`);
    if(st.status==='reward'){log.push('reward '+JSON.stringify(Rules.claimReward(st,'expand')));}
    Rules.advanceRound(st,rand);
  }
  return {log,final:JSON.stringify({...st,board:undefined})};
}
// Aura recipients (what the UI lights up) must agree with powerOf (what the battle uses).
function checkAura(){
  const Rules=sandbox.createRunRules(readData()),st=Rules.createRun('smith',rng(1));
  const slime=Rules.newPiece(st,'slime');slime.x=0;slime.y=1;st.pieces.push(slime);Rules.rebuild(st);
  const golem=st.pieces.find(p=>p.type==='golem'),t=Rules.auraTargets(st,golem);
  const up=t.find(x=>x.dir[1]===-1),down=t.find(x=>x.dir[1]===1);
  if(up.pieces.join()!==String(slime.id)||down.pieces.length)throw new Error('golem aura targets wrong: '+JSON.stringify(t));
  for(const p of st.pieces)for(const q of st.pieces){
    if(p===q)continue;
    const listed=Rules.auraTargets(st,p).some(x=>x.pieces.includes(q.id)),applied=Rules.powerOf(st,q).tags.some(g=>g.kind==='aura'&&g.from===p.type);
    if(listed!==applied)throw new Error(`aura mismatch ${p.type} -> ${q.type}: listed ${listed}, applied ${applied}`);
  }
  console.log('aura targets agree with powerOf (golem lights up the slime above it)');
}
checkAura();
const seed=arg('seed',1),a=play(seed),b=play(seed);
console.log(a.log.join('\n'));
if(a.final!==b.final||a.log.join()!==b.log.join()){console.error('NOT deterministic');process.exit(1);}
console.log('\nreplay from the same seed is identical');

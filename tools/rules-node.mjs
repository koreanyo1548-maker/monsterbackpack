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
const seed=arg('seed',1),a=play(seed),b=play(seed);
console.log(a.log.join('\n'));
if(a.final!==b.final||a.log.join()!==b.log.join()){console.error('NOT deterministic');process.exit(1);}
console.log('\nreplay from the same seed is identical');

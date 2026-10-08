// Prepare-screen regression: plays a seeded random game through the real UI functions (buy, reroll, move, rotate,
// stow, mutate, fuse, sell, fight, rewards...) and logs the full run state + toast after every action.
// Run it before and after touching the run rules and diff the two outputs.
//
// Usage:  NODE_PATH=$(npm root -g) node tools/prepare-regression.mjs [--steps 400] [--seed 1] [--root DIR] [--out file.json]
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium}=createRequire(import.meta.url)('playwright');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const STEPS=+arg('steps',400),SEED=+arg('seed',1),OUT=arg('out',null);
const file=path.resolve(arg('root',path.join(path.dirname(fileURLToPath(import.meta.url)),'..')),'index.html');

const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const ctx=await browser.newContext({viewport:{width:430,height:900}});
await ctx.addInitScript(seed=>{
  window.__TEST__=true;
  let a=seed>>>0;Math.random=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
},SEED*977);
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('file://'+file);await page.waitForTimeout(400);

const log=await page.evaluate(([steps,seed])=>{
  // The policy has its own PRNG so it never perturbs (or depends on) the game's Math.random stream.
  let h=(seed*2654435761)>>>0;const rnd=()=>{h=(h+0x9E3779B9)>>>0;let t=h;t=Math.imul(t^t>>>16,0x85ebca6b);t=Math.imul(t^t>>>13,0xc2b2ae35);return((t^t>>>16)>>>0)/4294967296;};
  const pick=n=>Math.floor(rnd()*n),out=[];
  const maxId=()=>Math.max(0,...state.pieces.map(p=>p.id),...state.bench.filter(Boolean).map(p=>p.id),...state.shop.map(()=>0));
  const snap=(act)=>{const s={...state,board:undefined,nextId:undefined};out.push(JSON.stringify({act,sel:selected,mode,maxId:maxId(),toast:$('toast').classList.contains('show')?$('toast').textContent:'',modal:$('overlay').hidden?'':$('modal').querySelector('h2')?.textContent||'?',s}));};
  const settle=()=>{ // resolve any open dialog like a player would
    if($('overlay').hidden)return;
    if(modalCallback&&rnd()<.7){const cb=modalCallback;cb();}else closeModal();
  };
  const occupied=()=>state.board.map((p,i)=>p?i:-1).filter(i=>i>=0);
  const bags=['lord','alchemist','smith'],cov={};
  for(const f of ['applyMutation','applyFusion','offerMutation','offerFusion','claimReward','nextRound','finishBattle','expand','buy','reroll','sell','stow','rotate','unbenchAt','stowTo','togglePin','bossReward']){const orig=window[f];window[f]=function(...a){cov[f]=(cov[f]||0)+1;return orig.apply(this,a);};}
  newRun(bags[seed%3]);settle();snap('newRun');
  for(let n=0;n<steps;n++){
    let act;const r=rnd();if(rnd()<.1&&mode==='prepare'&&state.status==='playing')state.gold+=6;
    if(state.status==='reward'){const k=['slimes','gold','expand','cursed'][pick(4)];act='claim:'+k;claimReward(k);if(state.status==='reward'&&!$('overlay').hidden)closeModal();}
    else if(mode==='battle'){act='battle';nextRound();}
    else if(state.status==='between'){act='nextRound';nextRound();}
    else if(['cleared','defeated'].includes(state.status)){act='newRun';closeModal();newRun(bags[pick(3)]);}
    else if(r<.10){const mats=state.shop.map((o,i)=>D[o.type].material&&!o.sold?i:-1).filter(i=>i>=0),i=mats.length?mats[pick(mats.length)]:pick(3);act='buy:'+i;buy(i);}
    else if(r<.20){const occ=occupied(),mats=occ.filter(i=>D[state.board[i].type].material),src=mats.length?mats[pick(mats.length)]:-1;
      if(src<0)act='combo:none';else{const tg=occ.filter(i=>state.board[i]!==state.board[src]),t=tg.length?tg[pick(tg.length)]:-1;if(t<0)act='combo:none';else{act=`combo:${src}>${t}`;selected=state.board[src].id;selectCell(src);selectCell(t);}}}
    else if(r<.26){const i=pick(3);act='buy:'+i;buy(i);}
    else if(r<.30){act='reroll';reroll();}
    else if(r<.33){const i=pick(3);act='pin:'+i;togglePin(i);}
    else if(r<.50){const i=pick(36);act='cell:'+i;selectCell(i);}
    else if(r<.64){const occ=occupied();if(occ.length){const f=occ[pick(occ.length)],t=pick(36);act=`move:${f}>${t}`;selected=state.board[f].id;move(f,t);}else act='move:none';}
    else if(r<.69){act='rotate';rotate();}
    else if(r<.75){act='stow';stow();}
    else if(r<.79){const k=pick(state.bench.length);act='bench:'+k;benchTap(k);}
    else if(r<.84){act='sell';sell();}
    else if(r<.87){act='expand';if(rnd()<.2)expand();render();}
    else if(r<.91){const sp=state.pieces.filter(p=>p);if(sp.length){selected=sp[pick(sp.length)].id;}act='select';render();}
    else{act='fight';
      if(totalCount()>0){startBattle();const forced=rnd()<.6;let t=0;if(forced){battle.time=12;battle.stats.kills=7;battle.won=rnd()<.85;battle.end=true;}else while(!battle.end&&t<61){simulate(.025);t+=.025;}snap('fight:'+(battle.won?'won':'lost')+':'+Math.round(battle.time*10));finishBattle(battle.won);
        if(!$('overlay').hidden){ /* result modal: act on its button like the player */
          const btn=$('modal').querySelector('[data-action]')?.dataset.action;act+=':'+btn;
          closeModal();
          if(btn==='bossReward')bossReward();else if(btn==='next')nextRound();else if(btn==='restart')newRun(bags[pick(3)]);
        }
      }}
    settle();snap(act);
  }
  out.push('COV '+JSON.stringify(cov));return out;
},[STEPS,SEED]);
await browser.close();
if(errors.length)console.error('page errors:',errors);
const text=log.join('\n')+'\n';
if(OUT)fs.writeFileSync(OUT,text);else process.stdout.write(text);
const acts={};for(const l of log){if(l.startsWith('COV'))continue;const a=JSON.parse(l).act.split(':')[0];acts[a]=(acts[a]||0)+1;}
console.error(log.length-1+' steps',JSON.stringify(acts));
console.error(log[log.length-1]);

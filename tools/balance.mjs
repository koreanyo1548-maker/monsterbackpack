// Battle balance fitter.
//
// For each wave it builds a "median" player army from the gold the economy has paid out so far,
// simulates the real battle code headlessly with a seeded RNG, and fits TUNE[wave] (enemy HP/ATK
// multipliers in index.html) so that the army wins with ~TARGET of its total HP left.
//
// Median assumptions (not best-case synergies):
//   - the army spends 88% of the gold it has earned, split by fixed gold shares across piece types;
//   - side effects are applied at median strength instead of from a specific layout:
//       group bonus  = real, from same-type pieces packed next to each other,
//       aura + cells = HP x1.087 / ATK x1.09 on every unit, ramped in linearly until wave 8
//                      (early armies have no mage/golem/aura/banner coverage yet),
//       affinity     = only slime(fire) / goblin(water) / mage(poison) groups, from wave 3 on;
// The fit target is the mean HP left in won fights, with at least --minwin (default 90%) of seeds winning.
// The reported margin (+ally HP share left when winning, - enemy HP share left when losing) is continuous across the cliff.
//   - the bag grows to 30 cells after boss 1 and 36 after boss 2.
// Weakness/resistance, skills (barrier, volley, burst, revive) are the real game mechanics.
//
// Usage:  NODE_PATH=$(npm root -g) node tools/balance.mjs [--target 0.10] [--seeds 10] [--verify 24] [--write]
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium}=createRequire(import.meta.url)('playwright');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?+process.argv[i+1]:true);};
const TARGET=arg('target',.10),SEEDS=arg('seeds',10),VERIFY=arg('verify',24),WRITE=process.argv.includes('--write'),MINWIN=arg('minwin',.9),WORKERS=4,BASE=process.argv.includes('--baseline');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'index.html');

const PAGE=`(() => {
  const SHARES={slime:.30,skeleton:.20,goblin:.15,mage:.10,golem:.15,orc:.10},COST={slime:3,skeleton:4,goblin:4,mage:5,golem:6,orc:7},CELLS={slime:1,skeleton:1,goblin:2,mage:3,golem:4,orc:2};
  const earned=r=>r%4===0?12:6+Math.floor((r-1)/4);
  const budget=w=>{let g=5+10;for(let r=1;r<w;r++){g+=earned(r);if(r%4===0)g+=5;}return g*.88;};
  const cap=w=>w<=4?25:w<=8?30:36;
  const cellsOf=n=>Object.entries(n).reduce((a,[t,k])=>a+CELLS[t]*k,0);
  function army(w){const n={slime:2,goblin:1},gold=budget(w),mins={slime:2,goblin:1};let spend=10;
    for(const t in SHARES){const k=Math.floor(SHARES[t]*(gold-10)/COST[t]);n[t]=(n[t]||0)+k;spend+=k*COST[t];}
    while(cellsOf(n)>cap(w)){let best=null;for(const t in n)if(n[t]>(mins[t]||0)&&(best===null||n[t]*CELLS[t]>n[best]*CELLS[best]))best=t;if(!best)break;n[best]--;spend-=COST[best];}
    for(const t of ['skeleton','slime'])while(gold-spend>=COST[t]&&cellsOf(n)+CELLS[t]<=cap(w)){n[t]++;spend+=COST[t];}
    return n;}
  function setup(w){newRun('lord');closeModal();state.pieces=[];state.bench=state.bench.map(()=>null);for(let i=0;i<(w>8?2:w>4?1:0);i++)expand();rebuild();
    const n=army(w),order=['golem','orc','mage','goblin','skeleton','slime'],aff=w>=3?{slime:'fire',goblin:'water',mage:'poison'}:{};
    for(const t of order)for(let i=0;i<(n[t]||0);i++){const p=piece(t);if(aff[t])p.aff=aff[t];if(!place(p))break;}
    state.wave=w;return n;}
  function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  window.BAL={army,setup,
    run(w,seed,m){const real=Math.random;Math.random=rng(seed*7919+w);window.__TEST__=true;
      const oP=powerOf,f=Math.min(1,w/8);powerOf=()=>({hp:1+.087*f,atk:1+.09*f,rate:1,tags:[]});
      TUNE[w-1]={hp:m,atk:Math.sqrt(m)};setup(w);battle=buildBattle();mode='battle';battle.intro=null;
      const allies=battle.units.filter(u=>u.team===0),total=allies.reduce((a,u)=>a+u.maxHp,0);let t=0;
      while(!battle.end&&t<61){simulate(.025);t+=.025;}
      const foes=battle.units.filter(u=>u.team===1),foeTotal=foes.reduce((a,u)=>a+u.maxHp,0);
      const left=allies.reduce((a,u)=>a+Math.max(0,u.hp),0),foeLeft=foes.reduce((a,u)=>a+Math.max(0,u.hp),0),won=battle.won;
      powerOf=oP;Math.random=real;window.__TEST__=false;mode='prepare';battle=null;
      // margin is continuous across the win/loss cliff: +HP share left when winning, -(enemy HP share left) when losing
      return {won,rem:won?left/total:0,margin:won?left/total:-foeLeft/foeTotal,time:t,units:allies.length};},
    mean(w,seeds,m){let r=0,wins=0,mg=0;for(let s=1;s<=seeds;s++){const o=this.run(w,s,m);r+=o.rem;mg+=o.margin;wins+=o.won?1:0;}return {rem:r/seeds,remWon:wins?r/wins:0,margin:mg/seeds,wins:wins/seeds};},
    // Bisect on the mean HP left among won fights (the "typical win"), then back off until >=MINWIN of seeds win,
    // because small armies sit on a win/loss cliff where the mean margin alone hides coin-flip fights.
    fit(w,seeds,target,minWin){let lo=Math.log(.05),hi=Math.log(30);for(let i=0;i<9;i++){const mid=(lo+hi)/2;if(this.mean(w,seeds,Math.exp(mid)).remWon>target)lo=mid;else hi=mid;}
      let m=Math.exp((lo+hi)/2);for(let k=0;k<25&&this.mean(w,seeds,m).wins<minWin;k++)m*=.97;return m;}
  };
})()`;

async function worker(browser,waves){
  const p=await browser.newPage();await p.goto('file://'+file);await p.waitForTimeout(500);
  await p.evaluate(PAGE);const out={};
  for(const w of waves){
    if(BASE){out[w]={m:1,...await p.evaluate(([w,s])=>BAL.mean(w,s,1),[w,VERIFY]),army:await p.evaluate(w=>BAL.army(w),w)};continue;}
    const m=await p.evaluate(([w,s,t,mw])=>BAL.fit(w,s,t,mw),[w,SEEDS,TARGET,MINWIN]);
    const ver=await p.evaluate(([w,s,m])=>{let r=0,wins=0,min=9,max=0,mg=0;for(let k=101;k<101+s;k++){const o=BAL.run(w,k,m);mg+=o.margin;if(o.won){wins++;r+=o.rem;min=Math.min(min,o.rem);max=Math.max(max,o.rem);}}return {rem:wins?r/wins:0,margin:mg/s,wins:wins/s,min,max};},[w,VERIFY,m]);
    out[w]={m,...ver,army:await p.evaluate(w=>BAL.army(w),w)};
    console.error('wave',w,'m=',m.toFixed(3),'HP left when won',(ver.rem*100).toFixed(1)+'%','margin',(ver.margin*100).toFixed(1)+'%','win',(ver.wins*100|0)+'%');
  }
  await p.close();return out;
}
if(process.argv.includes('--scan')){const w=arg('scan',1);const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage();await p.goto('file://'+file);await p.waitForTimeout(500);await p.evaluate(PAGE);
  for(const m of [.6,.8,1,1.3,1.7,2.2,2.8,3.5,4.5,6]){const r=await p.evaluate(([w,m,n])=>{const a=[];for(let k=1;k<=n;k++)a.push(BAL.run(w,k,m));const mg=a.map(o=>o.margin),mean=mg.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(mg.reduce((x,y)=>x+(y-mean)**2,0)/n);return {mean,sd,wins:a.filter(o=>o.won).length/n};},[w,m,VERIFY]);console.log('wave',w,'m',m,'margin',(r.mean*100).toFixed(1)+'%','sd',(r.sd*100).toFixed(1)+'%','win',(r.wins*100|0)+'%');}
  await b.close();process.exit(0);}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const waves=[...Array(12)].map((_,i)=>i+1),groups=Array.from({length:WORKERS},(_,i)=>waves.filter((_,j)=>j%WORKERS===i));
const res=Object.assign({},...await Promise.all(groups.map(g=>worker(browser,g))));await browser.close();
console.log('wave | tune hp/atk | win%  | HP left when won (mean, min-max) | margin | army');
for(const w of waves){const r=res[w];console.log(String(w).padStart(4),'|',r.m.toFixed(3),'/',Math.sqrt(r.m).toFixed(3),'|',String((r.wins*100)|0).padStart(4)+'%','|',(r.rem*100).toFixed(1)+'%',r.min!==undefined&&r.min<9?`(${(r.min*100).toFixed(0)}-${(r.max*100).toFixed(0)}%)`:'','|',(r.margin*100).toFixed(1)+'%','|',JSON.stringify(r.army));}
if(WRITE&&!BASE){let s=fs.readFileSync(file,'utf8');const lit='const TUNE=['+waves.map(w=>`{hp:${res[w].m.toFixed(3)},atk:${Math.sqrt(res[w].m).toFixed(3)}}`).join(',')+'];';
  const re=/const TUNE=(Array\.from\(\{length:12\},\(\)=>\(\{hp:1,atk:1\}\)\)|\[[^\]]*\]);/;if(!re.test(s))throw new Error('TUNE not found');fs.writeFileSync(file,s.replace(re,lit));console.error('wrote TUNE to index.html');}

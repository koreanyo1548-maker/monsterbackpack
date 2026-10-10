// Battle balance fitter.
//
// For each wave it builds a "median" player army from the gold the economy has paid out so far,
// simulates the real battle code headlessly with a seeded RNG, and fits TUNE[wave] (enemy HP/ATK
// multipliers in data/game-data.json) so that the army wins with ~TARGET of its total HP left.
//
// Packing order is front-to-back: golem, orc, skeleton, slime, goblin, mage (the top rows are the front line).
// Median assumptions (not best-case synergies):
//   - the army spends 88% of the gold it has earned, split by fixed gold shares across piece types;
//   - side effects are applied at median strength instead of from a specific layout:
//       group bonus  = real, from same-type pieces packed next to each other,
//       aura + cells = HP x1.087 / ATK x1.09 on every unit, ramped in linearly until wave 8
//                      (early armies have no mage/golem/aura/banner coverage yet),
//       affinity     = only slime(fire) / goblin(water) / mage(poison) groups, from wave 4 on;
// Early-game cushion (default, disable with --noramp): waves 1-3 aim for 35% / 25% / 15% HP left instead of 10%,
// and wave 1 is additionally backed off until the default bag's bare starting piece (a single slime, no purchase) can win it.
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
import {readData,writeData} from './data-io.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?+process.argv[i+1]:true);};
const TARGET=arg('target',.10),SEEDS=arg('seeds',10),VERIFY=arg('verify',24),WRITE=process.argv.includes('--write'),MINWIN=arg('minwin',.9),RAMP=process.argv.includes('--noramp')?{}:{1:.35,2:.25,3:.15},WORKERS=4,BASE=process.argv.includes('--baseline');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'index.html');

const PAGE=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'balance-harness.js'),'utf8');

async function worker(browser,waves){
  const p=await browser.newPage();await p.goto('file://'+file);await p.waitForTimeout(500);
  await p.evaluate(PAGE);const out={};
  for(const w of waves){
    if(BASE){out[w]={m:1,...await p.evaluate(([w,s])=>BAL.mean(w,s,1),[w,VERIFY]),army:await p.evaluate(w=>BAL.army(w),w)};continue;}
    const tgt=RAMP[w]??TARGET;const m=await p.evaluate(([w,s,t,mw,g])=>BAL.fit(w,s,t,mw,g),[w,SEEDS,tgt,MINWIN,w===1&&Object.keys(RAMP).length>0]);
    const ver=await p.evaluate(([w,s,m])=>{let r=0,wins=0,min=9,max=0,mg=0;for(let k=101;k<101+s;k++){const o=BAL.run(w,k,m);mg+=o.margin;if(o.won){wins++;r+=o.rem;min=Math.min(min,o.rem);max=Math.max(max,o.rem);}}let sw;if(w===1)sw=BAL.startWins(m,Math.min(s,12));return {rem:wins?r/wins:0,margin:mg/s,wins:wins/s,min,max,startWins:sw};},[w,VERIFY,m]);
    out[w]={m,tgt,...ver,army:await p.evaluate(w=>BAL.army(w),w)};
    console.error('wave',w,'target',(tgt*100)+'%','m=',m.toFixed(3),'HP left when won',(ver.rem*100).toFixed(1)+'%','margin',(ver.margin*100).toFixed(1)+'%','win',(ver.wins*100|0)+'%');
  }
  await p.close();return out;
}
if(process.argv.includes('--scan')){const w=arg('scan',1);const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage();await p.goto('file://'+file);await p.waitForTimeout(500);await p.evaluate(PAGE);
  for(const m of [.6,.8,1,1.3,1.7,2.2,2.8,3.5,4.5,6]){const r=await p.evaluate(([w,m,n])=>{const a=[];for(let k=1;k<=n;k++)a.push(BAL.run(w,k,m));const mg=a.map(o=>o.margin),mean=mg.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(mg.reduce((x,y)=>x+(y-mean)**2,0)/n);return {mean,sd,wins:a.filter(o=>o.won).length/n};},[w,m,VERIFY]);console.log('wave',w,'m',m,'margin',(r.mean*100).toFixed(1)+'%','sd',(r.sd*100).toFixed(1)+'%','win',(r.wins*100|0)+'%');}
  await b.close();process.exit(0);}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const waves=[...Array(12)].map((_,i)=>i+1),groups=Array.from({length:WORKERS},(_,i)=>waves.filter((_,j)=>j%WORKERS===i));
const res=Object.assign({},...await Promise.all(groups.map(g=>worker(browser,g))));await browser.close();
console.log('wave | target | tune hp/atk | enemy HP x | win%  | HP left when won (mean, min-max) | start-only win% | army');
for(const w of waves){const r=res[w];console.log(String(w).padStart(4),'|',r.tgt!==undefined?(r.tgt*100).toFixed(0)+'%':'-','|',r.m.toFixed(3),'/',Math.sqrt(r.m).toFixed(3),'|',(Math.pow(1.115,w-1)*r.m).toFixed(2),'|',String((r.wins*100)|0).padStart(4)+'%','|',(r.rem*100).toFixed(1)+'%',r.min!==undefined&&r.min<9?`(${(r.min*100).toFixed(0)}-${(r.max*100).toFixed(0)}%)`:'','|',r.startWins!==undefined?Object.entries(r.startWins).map(([b,v])=>b+' '+((v*100)|0)+'%').join(' '):'-','|',JSON.stringify(r.army));}
if(WRITE&&!BASE){const data=readData();data.tune=waves.map(w=>({hp:+res[w].m.toFixed(3),atk:+Math.sqrt(res[w].m).toFixed(3)}));writeData(data);console.error('wrote tune to data/game-data.json and data/game-data.js');}

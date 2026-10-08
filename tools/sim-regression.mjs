// Deterministic battle regression: runs every wave x seed headlessly in index.html and prints one digest per run
// (outcome, time, per-unit hp/position). Run before and after touching the battle code and diff the two outputs.
//
// --headless drops the view (no listener, no fx timers); the digests must match a normal run, which proves the
// outcome never depends on view-side randomness or state.
// --hard N multiplies enemy HP (N>1 forces losses / long fights), --root DIR runs another checkout's index.html.
//
// Usage:  NODE_PATH=$(npm root -g) node tools/sim-regression.mjs [--seeds 6] [--hard 1] [--headless] [--root DIR] [--out file.json]
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readData,jsText,JS_FILE} from './data-io.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
if(fs.readFileSync(JS_FILE,'utf8')!==jsText(readData())){console.error('data/game-data.js is out of date: run node tools/build-data.mjs');process.exit(1);}
const SEEDS=+arg('seeds',6),HARD=+arg('hard',1),HEADLESS=process.argv.includes('--headless'),OUT=arg('out',null);
const dir=path.dirname(fileURLToPath(import.meta.url)),file=path.resolve(arg('root',path.join(dir,'..')),'index.html');
const HARNESS=fs.readFileSync(path.join(dir,'balance-harness.js'),'utf8');

const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('file://'+file);await page.waitForTimeout(500);await page.evaluate(HARNESS);
const res=await page.evaluate(([seeds,hard,headless])=>{
  const out={};
  for(let w=1;w<=12;w++)for(let seed=1;seed<=seeds;seed++){
    const real=Math.random;Math.random=BAL.rng(seed*7919+w);window.__TEST__=true;
    const oP=powerOf,f=Math.min(1,w/8);powerOf=()=>({hp:1+.087*f,atk:1+.09*f,rate:1,tags:[]});
    TUNE[w-1]={hp:TUNE[w-1].hp*hard,atk:TUNE[w-1].atk};BAL.setup(w);battle=buildBattle();mode='battle';battle.intro=null;
    let t=0,n=0;if(headless)battle.listener=null;
    while(!battle.end&&t<61){if(headless)Sim.step(battle,.025);else simulate(.025);t+=.025;n++;}
    const units=battle.units.map(u=>[u.type,u.team,Math.round(u.hp*1000),Math.round(u.x*100),Math.round(u.y*100)].join(':')).join('|');
    let h=2166136261;for(const c of units){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
    const s=battle.stats;
    out[`w${w}s${seed}`]={won:battle.won,ticks:n,time:+battle.time.toFixed(3),kills:s.kills,dmg:Math.round(s.damage),by:Object.keys(s.by).length,hash:h};
    powerOf=oP;Math.random=real;window.__TEST__=false;mode='prepare';battle=null;
  }
  return out;
},[SEEDS,HARD,HEADLESS]);
await browser.close();
if(errors.length)console.error('page errors:',errors);
const json=JSON.stringify(res,null,1);
if(OUT)fs.writeFileSync(OUT,json);else console.log(json);
const wins=Object.values(res).filter(r=>r.won).length;
console.error(`${Object.keys(res).length} runs, ${wins} wins`);

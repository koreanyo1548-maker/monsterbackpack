// Enemy roster scaling, encounters and the matchup advice shown before a fight.
'use strict';
const ENEMY=GD.enemies;
// Per-wave multipliers on top of the base growth curves, fitted by tools/balance.mjs so a median army wins with ~10% HP left.
const TUNE=GD.tune;
const eHp=w=>Math.pow(GD.scaling.enemyHpGrowth,w-1)*TUNE[w-1].hp,eAtk=w=>Math.pow(GD.scaling.enemyAtkGrowth,w-1)*TUNE[w-1].atk;
const ENC=GD.encounters;
const BOSS=GD.bosses;
const ELEM=GD.elements,ELN={fire:'🔥 화염',water:'💧 물',poison:'☠ 독'};
function encounter(w=state.wave){const wts=ENC[w-1],en=GD.scaling.enemyBaseCount+Math.floor(w*GD.scaling.enemyCountPerWave),keys=Object.keys(wts),sum=keys.reduce((a,k)=>a+wts[k],0),list=keys.map(k=>({type:k,count:Math.floor(wts[k]/sum*en),rem:(wts[k]/sum*en)%1}));let left=en-list.reduce((a,o)=>a+o.count,0);list.slice().sort((a,b)=>b.rem-a.rem).forEach(o=>{if(left>0){o.count++;left--;}});return {list:list.filter(o=>o.count>0),total:en,boss:BOSS[w]||null};}
function armyElems(){const m={fire:0,water:0,poison:0};for(const g of groups())for(const e of ELEM[g.aff]||[])m[e]+=g.count;return m;}
function foeAdvice(enc){const am=armyElems(),score={fire:0,water:0,poison:0};for(const o of enc.list)if(ENEMY[o.type].weak)score[ENEMY[o.type].weak]+=o.count;const best=Object.keys(score).sort((a,b)=>score[b]-score[a])[0],hits=enc.list.filter(o=>am[ENEMY[o.type].weak]>0).reduce((a,o)=>a+o.count,0),bad=enc.list.filter(o=>ENEMY[o.type].res&&am[ENEMY[o.type].res]>0&&!(am[ENEMY[o.type].weak]>0)).reduce((a,o)=>a+o.count,0);return {best,bestN:score[best],hits,bad,total:enc.total};}

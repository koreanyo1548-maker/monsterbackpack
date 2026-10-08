// Enemy roster scaling, encounters and the matchup advice shown before a fight.
'use strict';
const ENEMY=GD.enemies;
// Per-wave multipliers on top of the base growth curves, fitted by tools/balance.mjs so a median army wins with ~10% HP left.
const TUNE=GD.tune;
const {eHp,eAtk}=Sim;
const BOSS=GD.bosses;
const ELEM=GD.elements,ELN={fire:'🔥 화염',water:'💧 물',poison:'☠ 독'};
function encounter(w=state.wave){return Sim.encounter(w);}
function armyElems(){const m={fire:0,water:0,poison:0};for(const g of groups())for(const e of ELEM[g.aff]||[])m[e]+=g.count;return m;}
function foeAdvice(enc){const am=armyElems(),score={fire:0,water:0,poison:0};for(const o of enc.list)if(ENEMY[o.type].weak)score[ENEMY[o.type].weak]+=o.count;const best=Object.keys(score).sort((a,b)=>score[b]-score[a])[0],hits=enc.list.filter(o=>am[ENEMY[o.type].weak]>0).reduce((a,o)=>a+o.count,0),bad=enc.list.filter(o=>ENEMY[o.type].res&&am[ENEMY[o.type].res]>0&&!(am[ENEMY[o.type].weak]>0)).reduce((a,o)=>a+o.count,0);return {best,bestN:score[best],hits,bad,total:enc.total};}

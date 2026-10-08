// Enemy roster scaling, encounters and the matchup advice shown before a fight.
'use strict';
const ENEMY=GD.enemies;
// Per-wave multipliers on top of the base growth curves, fitted by tools/balance.mjs so a median army wins with ~10% HP left.
const TUNE=GD.tune;
const {eHp,eAtk}=Sim;
const BOSS=GD.bosses;
const ELEM=GD.elements,ELN={fire:'🔥 화염',water:'💧 물',poison:'☠ 독'};
function encounter(w=state.wave){return Sim.encounter(w);}
function armyElems(){return Rules.armyElems(state);}
function foeAdvice(enc){return Rules.foeAdvice(state,enc);}

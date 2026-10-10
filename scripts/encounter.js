// Enemy encounters (plain units from the unit table, counts set per wave) and the matchup advice shown before a fight.
'use strict';
const ENEMY=GD.enemies;
const BOSS=GD.bosses;
const ELEM=GD.elements,ELN={fire:'🔥 화염',water:'💧 물',poison:'☠ 독'};
function encounter(w=state.wave){return Sim.encounter(w);}
function armyElems(){return Rules.armyElems(state);}
function foeAdvice(enc){return Rules.foeAdvice(state,enc);}

// Bag helpers for the UI: thin wrappers that apply the run rules (scripts/run-rules.js) to the current `state`.
'use strict';
const KIND=GD.bagKinds;
const BAGS=Rules.BAGS;
const AURA=GD.auras;
const STATN={atk:'공격력',hp:'체력',rate:'공격속도'},STATC={atk:'#ff9a78',hp:'#9be59b',rate:'#86cfff'};
const DIRN=d=>d[0]===1?'오른쪽':d[0]===-1?'왼쪽':d[1]===-1?'위':'아래',DIRG=d=>d[0]===1?'r':d[0]===-1?'l':d[1]===-1?'u':'d',ARG={r:'▶',l:'◀',u:'▲',d:'▼'};
function shapeOf(type,rot){return Rules.shapeOf(type,rot);}
function rotDir(d,rot){return Rules.rotDir(d,rot);}
function pieceIdx(p,x,y,rot){return Rules.pieceIdx(state,p,x,y,rot);}
function rebuild(){Rules.rebuild(state);}
function fits(p,x,y,rot,ignore){return Rules.fits(state,p,x,y,rot,ignore);}
function place(p){return Rules.place(state,p);}
function selectedPiece(){return state.pieces.find(p=>p.id===selected)||state.bench.find(p=>p&&p.id===selected);}
function benchOK(k,p){return Rules.benchOK(state,k,p);}
function stash(p){return Rules.stash(state,p);}
function cellKind(i){return Rules.cellKind(state,i);}
function auraDesc(p){return (AURA[p.type]||[]).map(a=>`${DIRN(rotDir(a.d,p.rot))} 인접 ${STATN[a.stat]} +${Math.round(a.v*100)}%`).join(' · ');}
function auraArrows(p,i){const pc=pieceIdx(p),c=state.cols;return (AURA[p.type]||[]).map(a=>{const d=rotDir(a.d,p.rot),x=i%c+d[0],y=Math.floor(i/c)+d[1];if(x<0||x>=c||y<0||y>=state.rows||pc.includes(y*c+x))return '';return `<span class="ar ${DIRG(d)}" style="color:${STATC[a.stat]}">${ARG[DIRG(d)]}</span>`;}).join('');}
// Text for a power tag from Rules.powerOf: {kind:'banner'|'shield', pct} or {kind:'aura', from, stat, pct}.
function tagText(t){return t.kind==='banner'?`군기 공격력 +${t.pct}%`:t.kind==='shield'?`방패 체력 +${t.pct}%`:`${D[t.from].name} ${STATN[t.stat]} +${t.pct}%`;}
function powerOf(p){return Rules.powerOf(state,p);}
function groups(){return Rules.groups(state);}
function neighbors(i,c,n){return Rules.neighbors(i,c,n);}
function bonus(n){return Sim.groupBonus(n);}
function selectedIndex(){const p=state.pieces.find(q=>q.id===selected);return p?pieceIdx(p)[0]:-1;}
function groupAt(i){return Rules.groupAt(state,i);}
function totalCount(){return Rules.totalCount(state);}
function expand(){return Rules.expand(state);}

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
// Stat icons: heart = HP, sword = ATK, bolt = attack speed, grid = cells. Colours match the aura arrows (STATC).
const ICONS={
 hp:'<path d="M12 21s-8-4.8-9.6-9.6C1.3 8 3.2 4.8 6.5 4.8c2 0 3.8 1.1 5.5 3.3 1.7-2.2 3.5-3.3 5.5-3.3 3.3 0 5.2 3.2 4.1 6.6C20 16.2 12 21 12 21z"/>',
 atk:'<path d="M20.5 3.5l-.9 5.2L9.8 18.5l-4.3-4.3L15.3 4.4z"/><path d="M4 15.5l4.5 4.5M3 21l3-3" stroke-linecap="round"/>',
 rate:'<path d="M13.5 2L4.5 13.5H11L9.5 22l10-12.5h-6.8z"/>',
 cell:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>'};
const ICONN={...STATN,cell:'칸'};
function statIcon(kind){return `<svg class="si si-${kind}" viewBox="0 0 24 24" role="img" aria-label="${ICONN[kind]}">${ICONS[kind]}</svg>`;}
const statPct=(stat,pct)=>`<b class="sv sv-${stat}">${statIcon(stat)}+${pct}%</b>`;
// One info row: a small tag, then content.
const infoRow=(tag,body,cls='',style='')=>`<div class="rw ${cls}"><span class="tg"${style?` style="${style}"`:''}>${tag}</span>${body}</div>`;
// Rows describing an auras the piece gives (same stat and value on several sides merge: "위·아래 인접").
function auraRows(p){const by=new Map();for(const a of AURA[p.type]||[]){const k=a.stat+a.v,o=by.get(k)||{stat:a.stat,v:a.v,dirs:[]};o.dirs.push(DIRN(rotDir(a.d,p.rot)));by.set(k,o);}
 return [...by.values()].map(o=>infoRow('오라',`<span>${o.dirs.join('·')} 인접</span>${statPct(o.stat,Math.round(o.v*100))}`));}
// Range of the swarm bonus per stat over all swarm sizes, e.g. hp +5~20%.
function swarmRange(stat){const v=GD.groupBonus.map(x=>Math.round((x[stat]-1)*100)).filter(x=>x>0);return v.length?statPct(stat,v[0]===v[v.length-1]?v[0]:`${v[0]}~${v[v.length-1]}`):'';}
function swarmRow(g,b,bp){if(bp||g.pieces.length<2)return infoRow('무리',`<span class="dim">같은 몬스터를 붙이면</span>${swarmRange('hp')}${swarmRange('atk')}`,'','background:#7a4b2a');
 return infoRow('무리',`<span>×${g.count}</span>${b.hp>1?statPct('hp',Math.round((b.hp-1)*100)):''}${b.atk>1?statPct('atk',Math.round((b.atk-1)*100)):''}`,'','background:#7a4b2a');}
// Bonuses this piece receives (bag cells and other pieces' auras), from Rules.powerOf tags.
function receivedRow(pw){if(!pw.tags.length)return '';const stat={banner:'atk',shield:'hp'};
 return infoRow('받음',pw.tags.map(t=>t.kind==='aura'?`<span class="rcvd">${D[t.from].name} 오라${statPct(t.stat,t.pct)}</span>`:`<span class="rcvd">${t.kind==='banner'?'군기':'방패'}${statPct(stat[t.kind],t.pct)}</span>`).join(''));}
// All rows for a monster piece, most important first (the compact panel shows the first three).
function infoRows(p,g,b,pw,aff,a,bp){const d=D[p.type];
 return [...auraRows(p),swarmRow(g,b,bp),a==='none'?'':infoRow('속성',`<span>${aff.effect}</span>`,'',`background:${aff.color};color:#2c241e`),receivedRow(pw),SKILLD[p.type]?infoRow('스킬',`<span>${SKILLD[p.type]}</span>`):'',`<div class="rw dim">${d.role}</div>`].filter(Boolean);}
// The two stat chips (and speed, if boosted) for a piece.
const statChips=(d,b,pw)=>`<span>${statIcon('hp')}${Math.round(d.hp*b.hp*pw.hp)}</span><span>${statIcon('atk')}${Math.round(d.atk*b.atk*pw.atk)}</span>`+(pw.rate>1?`<span>${statIcon('rate')}×${pw.rate.toFixed(2)}</span>`:'');
// Cells that should light up when the selected piece is on the board: whole pieces that receive its aura.
function recvInfo(){const p=selectedPiece();if(!p||!state.pieces.includes(p))return null;const per=new Map();
 for(const t of Rules.auraTargets(state,p))for(const id of t.pieces){const o=per.get(id)||new Map();o.set(t.stat,(o.get(t.stat)||0)+t.v);per.set(id,o);}
 if(!per.size)return null;const cells=new Map(),badges=new Map(),own=new Set(pieceIdx(p));
 for(const [id,o] of per){const q=state.pieces.find(x=>x.id===id),ix=pieceIdx(q),first=[...o.keys()][0];ix.forEach(i=>cells.set(i,first));badges.set(ix[0],[...o].map(([s,v])=>`<span class="sv sv-${s}">${statIcon(s)}+${Math.round(v*100)}%</span>`).join(''));}
 return {cells,badges,own};}
function auraArrows(p,i){const pc=pieceIdx(p),c=state.cols;return (AURA[p.type]||[]).map(a=>{const d=rotDir(a.d,p.rot),x=i%c+d[0],y=Math.floor(i/c)+d[1];if(x<0||x>=c||y<0||y>=state.rows||pc.includes(y*c+x))return '';return `<span class="ar ${DIRG(d)}" style="color:${STATC[a.stat]}">${ARG[DIRG(d)]}</span>`;}).join('');}
function powerOf(p){return Rules.powerOf(state,p);}
function groups(){return Rules.groups(state);}
function neighbors(i,c,n){return Rules.neighbors(i,c,n);}
function bonus(n){return Sim.groupBonus(n);}
function selectedIndex(){const p=state.pieces.find(q=>q.id===selected);return p?pieceIdx(p)[0]:-1;}
function groupAt(i){return Rules.groupAt(state,i);}
function totalCount(){return Rules.totalCount(state);}
function expand(){return Rules.expand(state);}

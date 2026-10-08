// Bag model: piece shapes and placement, bags, auras, power calculation and swarm grouping.
'use strict';
// A piece is {id,type,aff,rot,x,y}; x,y is the top-left of its bounding box. state.board is derived occupancy (cell -> piece).
function shapeOf(type,rot=0){let c=(SHAPES[type]||[[0,0]]).map(a=>a.slice());for(let k=0;k<((rot%4)+4)%4;k++)c=c.map(([x,y])=>[-y,x]);const mx=Math.min(...c.map(a=>a[0])),my=Math.min(...c.map(a=>a[1]));return c.map(([x,y])=>[x-mx,y-my]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);}
function pieceIdx(p,x=p.x,y=p.y,rot=p.rot){const out=[];for(const [dx,dy] of shapeOf(p.type,rot)){const cx=x+dx,cy=y+dy;if(cx<0||cy<0||cx>=state.cols||cy>=state.rows||!state.open[cy*state.cols+cx])return null;out.push(cy*state.cols+cx);}return out;}
function rebuild(){state.board=Array(state.cols*state.rows).fill(null);for(const p of state.pieces)for(const i of pieceIdx(p)||[])state.board[i]=p;}
function fits(p,x,y,rot,ignore){const ix=pieceIdx(p,x,y,rot);return !!ix&&ix.every(i=>!state.board[i]||state.board[i]===ignore);}
function place(p){for(const rot of [0,1,2,3])for(let y=0;y<state.rows;y++)for(let x=0;x<state.cols;x++)if(fits(p,x,y,rot)){p.rot=rot;p.x=x;p.y=y;state.pieces.push(p);rebuild();return true;}return false;}
function selectedPiece(){return state.pieces.find(p=>p.id===selected)||state.bench.find(p=>p&&p.id===selected);}
const benchOK=(k,p)=>BAGS[state.bag].bench[k]==='any'||(D[p.type].material&&!D[p.type].curse);
function stash(p){if(place(p))return true;const k=state.bench.findIndex((x,j)=>!x&&benchOK(j,p));if(k<0)return false;state.bench[k]=p;return true;}
const KIND=GD.bagKinds;
function mkBag(d){const open=[],kinds={};d.open.join('').split('').forEach((ch,i)=>open.push(ch==='.'));d.kinds.join('').split('').forEach((ch,i)=>{const k={b:'banner',s:'shield',d:'still'}[ch];if(k)kinds[i]=k;});return {...d,open0:open,kinds};}
const BAGS=Object.fromEntries(Object.entries(GD.bags).map(([id,d])=>[id,mkBag(d)]));
const cellKind=i=>BAGS[state.bag]?.kinds[i]||null;
// Directional aura: d is the side (before rotation) whose neighbouring pieces get the bonus.
const AURA=GD.auras;
const STATN={atk:'공격력',hp:'체력',rate:'공격속도'},STATC={atk:'#ff9a78',hp:'#9be59b',rate:'#86cfff'};
const DIRN=d=>d[0]===1?'오른쪽':d[0]===-1?'왼쪽':d[1]===-1?'위':'아래',DIRG=d=>d[0]===1?'r':d[0]===-1?'l':d[1]===-1?'u':'d',ARG={r:'▶',l:'◀',u:'▲',d:'▼'};
function rotDir(d,rot){let [x,y]=d;for(let k=0;k<((rot%4)+4)%4;k++)[x,y]=[-y,x];return [x,y];}
function auraDesc(p){return (AURA[p.type]||[]).map(a=>`${DIRN(rotDir(a.d,p.rot))} 인접 ${STATN[a.stat]} +${Math.round(a.v*100)}%`).join(' · ');}
function auraArrows(p,i){const pc=pieceIdx(p),c=state.cols;return (AURA[p.type]||[]).map(a=>{const d=rotDir(a.d,p.rot),x=i%c+d[0],y=Math.floor(i/c)+d[1];if(x<0||x>=c||y<0||y>=state.rows||pc.includes(y*c+x))return '';return `<span class="ar ${DIRG(d)}" style="color:${STATC[a.stat]}">${ARG[DIRG(d)]}</span>`;}).join('');}
function powerOf(p){const out={hp:1,atk:1,rate:1,tags:[]};if(D[p.type].material||!state.pieces.includes(p))return out;const pc=pieceIdx(p),c=state.cols,frac=k=>pc.filter(i=>cellKind(i)===k).length/pc.length;
 if(frac('banner')){out.atk+=.15*frac('banner');out.tags.push(`군기 공격력 +${Math.round(15*frac('banner'))}%`);}
 if(frac('shield')){out.hp+=.2*frac('shield');out.tags.push(`방패 체력 +${Math.round(20*frac('shield'))}%`);}
 const add={hp:0,atk:0,rate:0};
 for(const sp of state.pieces){if(sp===p||!AURA[sp.type])continue;const sc=pieceIdx(sp);for(const a of AURA[sp.type]){const d=rotDir(a.d,sp.rot);if(sc.some(i=>{const x=i%c+d[0],y=Math.floor(i/c)+d[1];return x>=0&&x<c&&y>=0&&y<state.rows&&pc.includes(y*c+x);})){add[a.stat]+=a.v;out.tags.push(`${D[sp.type].name} ${STATN[a.stat]} +${Math.round(a.v*100)}%`);}}}
 for(const k of ['hp','atk','rate'])out[k]+=Math.min(.6,add[k]);return out;}
function groups(){const b=state.board,c=state.cols,seen=new Set(),out=[];for(const p of state.pieces){if(D[p.type].material||seen.has(p.id))continue;const todo=[p],ps=[];seen.add(p.id);while(todo.length){const a=todo.pop();ps.push(a);for(const i of pieceIdx(a))for(const n of neighbors(i,c,b.length)){const q=b[n];if(q&&q!==a&&q.type===p.type&&q.aff===p.aff&&!seen.has(q.id)){seen.add(q.id);todo.push(q);}}}out.push({pieces:ps,cells:ps.flatMap(a=>pieceIdx(a)),type:p.type,aff:p.aff,count:ps.length*D[p.type].count});}return out;}
function neighbors(i,c,n){return [i%c>0?i-1:-1,i%c<c-1?i+1:-1,i-c,i+c].filter(j=>j>=0&&j<n);}
function bonus(n){return Sim.groupBonus(n);}
function selectedIndex(){const p=state.pieces.find(q=>q.id===selected);return p?pieceIdx(p)[0]:-1;}
function groupAt(i){return groups().find(g=>g.cells.includes(i));}
function totalCount(){return groups().reduce((s,g)=>s+g.count,0);}
function expand(){const st=BAGS[state.bag].steps[state.grown||0];if(!st)return false;st.forEach(([x,y])=>state.open[y*state.cols+x]=true);state.grown=(state.grown||0)+1;rebuild();return true;}

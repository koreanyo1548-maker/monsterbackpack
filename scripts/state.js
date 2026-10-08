// Shared run state: DOM helper, data aliases, globals, save/restore, modal/toast and sound.
'use strict';
const $=id=>document.getElementById(id), SAVE='monster-backpack-v2';
const GD=window.GAME_DATA,D=GD.units;
const Sim=createBattleSim(GD),{W,H}=Sim;
const AFF=GD.affinities;
const RECIPES=GD.recipes;
const FUSE=GD.fusions;
const SHAPES=GD.shapes;
let infoOpen=false;
const images={};let uid=1,state,selected=null,mode='prepare',battle=null,speed=1,paused=false,drag=null,toastTimer,modalCallback=null;
function piece(type,aff='none'){return {id:uid++,type,aff,rot:0,x:0,y:0};}
function newRun(bagId){if(!BAGS[bagId]){bagSelect();return;}const B=BAGS[bagId];uid=1;state={version:3,bag:bagId,grown:0,open:B.open0.slice(),cols:6,rows:6,pieces:[],board:[],bench:B.bench.map(()=>null),rerolls:0,gold:5,wave:1,shop:[],wins:0,mutations:0,status:'playing'};rebuild();for(const [t,x,y] of B.start){const p=piece(t);p.x=x;p.y=y;state.pieces.push(p);}rebuild();selected=state.pieces.find(p=>!D[p.type].material).id;mode='prepare';battle=null;makeShop(true);save();render();toast(B.name+' 원정 시작!');}
function save(){try{localStorage.setItem(SAVE,JSON.stringify({...state,board:undefined,nextId:uid}));}catch(e){}}
function restore(){try{const s=JSON.parse(localStorage.getItem(SAVE));if(!s||s.version!==3||s.cols!==6||s.rows!==6||!BAGS[s.bag]||!Array.isArray(s.open)||s.open.length!==36||!Array.isArray(s.pieces)||!Number.isFinite(s.gold)||s.wave<1||s.wave>12||!Array.isArray(s.shop))return false;for(const p of s.pieces)if(!p||!D[p.type]||!AFF[p.aff]||!Number.isFinite(p.id)||!Number.isInteger(p.x)||!Number.isInteger(p.y)||!Number.isInteger(p.rot))return false;if(s.shop.some(o=>!o||!D[o.type]))return false;if(!Array.isArray(s.bench))s.bench=BAGS[s.bag].bench.map(()=>null);if(s.bench.length!==BAGS[s.bag].bench.length||s.bench.some(b=>b&&(!D[b.type]||!AFF[b.aff]||!Number.isFinite(b.id))))return false;s.rerolls=s.rerolls||0;state=s;const seen=new Set();for(const p of s.pieces){const ix=pieceIdx(p);if(!ix||ix.some(i=>seen.has(i)))return false;ix.forEach(i=>seen.add(i));}rebuild();uid=Math.max(s.nextId||1,...s.pieces.map(p=>p.id+1),...s.bench.filter(Boolean).map(p=>p.id+1));return true;}catch(e){return false;}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function modal(html){$('modal').innerHTML=html;$('overlay').hidden=false;$('modal').querySelector('button')?.focus();}
function closeModal(){$('overlay').hidden=true;modalCallback=null;}
let audio;function beep(f=500,t=.07){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,audio.currentTime+t);g.gain.setValueAtTime(.022,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+t);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+t);}catch(e){}}

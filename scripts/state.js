// Shared run state: DOM helper, data aliases, globals, save/restore, modal/toast and sound.
'use strict';
const $=id=>document.getElementById(id), SAVE='monster-backpack-v3';
const GD=window.GAME_DATA,D=GD.units;
const Sim=createBattleSim(GD),{W,H}=Sim;
const Rules=createRunRules(GD);
const AFF=GD.affinities;
const RECIPES=GD.recipes;
const FUSE=GD.fusions;
const SHAPES=GD.shapes;
let infoOpen=false;
const images={};let state,selected=null,mode='prepare',battle=null,speed=1,paused=false,drag=null,toastTimer,modalCallback=null;
function piece(type,aff='none'){return Rules.newPiece(state,type,aff);}
function newRun(bagId){if(!BAGS[bagId])bagId=GD.run.defaultBag;const B=BAGS[bagId];state=Rules.createRun(bagId);selected=state.pieces.find(p=>!D[p.type].material).id;mode='prepare';battle=null;save();render();toast(B.name+' 원정 시작!');}
function save(){try{localStorage.setItem(SAVE,JSON.stringify({...state,board:undefined}));}catch(e){}}
function restore(){try{const s=Rules.restoreRun(JSON.parse(localStorage.getItem(SAVE)));if(!s)return false;state=s;return true;}catch(e){return false;}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function modal(html){$('modal').innerHTML=html;$('overlay').hidden=false;$('modal').querySelector('button')?.focus();}
function closeModal(){$('overlay').hidden=true;modalCallback=null;}
let audio;function beep(f=500,t=.07){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,audio.currentTime+t);g.gain.setValueAtTime(.022,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+t);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+t);}catch(e){}}

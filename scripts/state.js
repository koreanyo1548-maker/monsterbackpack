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
let audio;const SOUND_KEY='monster-backpack-sound';let soundOn=(()=>{try{return localStorage.getItem(SOUND_KEY)!=='off';}catch(e){return true;}})();
function setSound(on){soundOn=on;try{localStorage.setItem(SOUND_KEY,on?'on':'off');}catch(e){}}
function actx(){if(!soundOn)return null;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();return audio;}catch(e){return null;}}
function beep(f=500,t=.07){try{const a=actx();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(f,a.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,a.currentTime+t);g.gain.setValueAtTime(.022,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+t);}catch(e){}}

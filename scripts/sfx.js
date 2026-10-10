// Synthesized battle sounds (Web Audio, no sample files). View-only: never touches combat or the simulation's RNG.
'use strict';
const sfx=(()=>{
 let ref=null,out=null,noise=null,voices=0;const last={};
 // One compressor + master gain per AudioContext keeps a crowd of simultaneous hits from clipping.
 function bus(a){
  if(ref!==a){ref=a;const comp=a.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=8;const g=a.createGain();g.gain.value=.6;comp.connect(g);g.connect(a.destination);out=comp;
   const len=Math.floor(a.sampleRate*.5),buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;noise=buf;}
  return out;
 }
 const env=(a,g,t0,t,peak)=>{g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(peak,t0+.004);g.gain.exponentialRampToValueAtTime(.0001,t0+t);};
 function tone(a,{type='sine',f0,f1=f0,t=.12,gain=.4,delay=0,pitch=1}){
  const t0=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0*pitch,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1*pitch),t0+t);
  env(a,g,t0,t,gain);o.connect(g);g.connect(out);o.start(t0);o.stop(t0+t+.02);
 }
 function puff(a,{filter='lowpass',f0,f1=f0,q=1,t=.1,gain=.4,delay=0,pitch=1}){
  const t0=a.currentTime+delay,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=noise;f.type=filter;f.Q.value=q;f.frequency.setValueAtTime(f0*pitch,t0);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1*pitch),t0+t);
  env(a,g,t0,t,gain);s.connect(f);f.connect(g);g.connect(out);s.start(t0,Math.random()*.2);s.stop(t0+t+.02);
 }
 // What each attacker sounds like when its blow lands.
 const BODY={
  slime:p=>[{k:'tone',f0:260,f1:90,t:.14,gain:.5,pitch:p},{k:'puff',f0:500,t:.08,gain:.25,pitch:p}],
  skeleton:p=>[{k:'puff',filter:'bandpass',f0:2600,q:4,t:.05,gain:.45,pitch:p},{k:'tone',type:'triangle',f0:1100,f1:350,t:.07,gain:.22,pitch:p}],
  orc:p=>[{k:'puff',f0:900,f1:300,t:.14,gain:.6,pitch:p},{k:'tone',f0:150,f1:55,t:.2,gain:.7,pitch:p},{k:'puff',filter:'highpass',f0:3000,t:.03,gain:.2,pitch:p}],
  golem:p=>[{k:'tone',f0:85,f1:32,t:.32,gain:.9,pitch:p},{k:'puff',f0:350,t:.2,gain:.6,pitch:p}],
  goblin:p=>[{k:'puff',filter:'bandpass',f0:1500,q:2,t:.06,gain:.35,pitch:p},{k:'tone',type:'square',f0:500,f1:250,t:.04,gain:.12,pitch:p}],
  mage:p=>[{k:'tone',type:'sawtooth',f0:900,f1:180,t:.16,gain:.22,pitch:p},{k:'tone',f0:1800,f1:900,t:.12,gain:.15,pitch:p}],
 };
 const GAP={slime:.05,skeleton:.045,orc:.06,golem:.09,goblin:.05,mage:.06,kill:.07};
 function run(a,list,delay=0){for(const s of list){const {k,...o}=s;(k==='tone'?tone:puff)(a,{...o,delay:(o.delay||0)+delay});}}
 function play(name,list,dur,vol=1){
  if(window.__TEST__||voices>=10)return;
  try{const a=actx();if(!a)return;bus(a);
  const now=a.currentTime;if(now-(last[name]||0)<(GAP[name]||.05))return;last[name]=now;
  voices++;setTimeout(()=>{voices--;},dur*1000+40);
  run(a,list.map(s=>({...s,gain:s.gain*vol})));}catch(e){}
 }
 return {
  // tier: 'light' | 'heavy' | 'weak' | 'resist'
  hit(source,tier){
   const body=BODY[source.type];if(!body)return;
   const boss=source.boss,p=(boss?.8:1)*(.94+Math.random()*.12)*(tier==='resist'?.85:1),vol=(boss?1.3:1)*(tier==='heavy'||tier==='weak'?1.25:tier==='resist'?.6:1);
   const list=body(p);
   if(tier==='weak')list.push({k:'tone',f0:1568,t:.09,gain:.22,delay:.012});
   play(source.type,list,.35,vol);
  },
  kill(target){
   const boss=target.boss,big=boss||target.type==='golem'||target.type==='orc',p=(boss?.7:big?.85:1)*(.95+Math.random()*.1);
   play('kill',[{k:'puff',f0:1200,f1:200,t:big?.3:.2,gain:.5,pitch:p},{k:'tone',f0:320,f1:80,t:big?.32:.22,gain:.5,pitch:p}],.4,boss?1.5:1);
  },
 };
})();

// Battle skill effects (view only): readable cues for the active skills and status effects, so the player can
// tell what just happened. Called from battleView (battle-view.js); drawn from draw(). Nothing here touches combat.
'use strict';
const SFX_LIFE={revive:1.1,burst:.8,volley:.55,barrier:.8,bubble:.5,rage:.9,puff:.6,frost:.5};
const easeOut=t=>1-(1-t)*(1-t);
const rnd=(a,b)=>a+Math.random()*(b-a);

function addSfx(kind,x,y,extra={}){const b=battle;if(!b)return;const T=SFX_LIFE[kind]||.6,list=b.sfx||(b.sfx=[]);if(list.length>40)list.shift();list.push({kind,x,y,t:T,T,...extra});}
// Particles drifting up (or out) from a point; g is their own gravity (negative = float up).
function rise(x,y,color,n,{spread=10,vy=-40,life=.8,r=1.8,g=-25,add=true,glyph=null}={}){const b=battle;if(!b)return;for(let i=0;i<n&&b.parts.length<220;i++)b.parts.push({x:x+rnd(-spread,spread),y:y+rnd(-4,4),vx:rnd(-8,8),vy:vy*rnd(.6,1.2),t:life*rnd(.7,1.2),T:life,c:color,r:r*rnd(.8,1.4),add,g,glyph});}
function burstParts(x,y,colors,n,speed,life){const b=battle;if(!b)return;for(let i=0;i<n&&b.parts.length<220;i++){const a=rnd(0,6.283),sp=speed*rnd(.4,1);b.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-18,t:life*rnd(.7,1.2),T:life,c:colors[i%colors.length],r:rnd(1.6,3.2),add:false});}}
// Skill name floating over the unit; several on one unit stack upwards.
function banner(u,text,color,size=14){const b=battle;if(!b||!u)return;const list=b.banners||(b.banners=[]),n=list.filter(x=>x.u===u).length;list.push({u,oy:-unitDrawSize(u)-8-n*15,text,color,size,t:1.2,T:1.2});if(list.length>12)list.shift();}
const SKILL_BANNER={revive:['부활!','#ffe08a'],slimeBurst:['독 폭발!','#c8f08a'],volley:['일제 사격!','#ffe6a8'],barrier:['마력 방벽!','#9fdcff'],rage:['광란!','#ff8a6a']};
const STATUS_TAG={poison:['독','#c8f08a'],burn:['화상','#ffb98a'],slow:['둔화','#bfe6ff']};
const SKILL_SOUND={revive:[520,780],slimeBurst:[150],volley:[900,700],barrier:[700,940],rage:[130]};

// ---- Triggers (called by battleView) ----
function skillFx(kind,u){
  if(!u)return;
  if(kind==='volley'){addSfx('volley',u.x,u.y-8);battle.shake=Math.max(battle.shake,.5);}
  else if(kind==='barrier'){addSfx('barrier',u.x,u.y-4);}
  else if(kind==='slimeBurst'){/* the cloud itself is spawned by the burst effect at the slime's death */}
  const [text,color]=SKILL_BANNER[kind]||[];if(text)banner(u,text,color);
  const snd=SKILL_SOUND[kind]||[];snd.forEach((f,i)=>i?setTimeout(()=>beep(f,.1),90*i):beep(f,.09));
}
function reviveFx(u){addSfx('revive',u.x,u.y);rise(u.x,u.y+6,'#ffe9a8',14,{spread:13,vy:-62,life:.9,g:-30});battle.shake=Math.max(battle.shake,.8);}
function burstFx(u){ // a slime died: toxic cloud over the real blast radius (44)
  addSfx('burst',u.x,u.y);burstParts(u.x,u.y-4,['#a8e060','#c78fe0','#8fcf5a'],16,85,.6);rise(u.x,u.y,'#b9f07a',5,{spread:16,vy:-26,life:.8,add:false,g:-8});battle.shake=Math.max(battle.shake,1.1);
}
function rageFx(u){addSfx('rage',u.x,u.y);rise(u.x,u.y,'#ff8a4a',12,{spread:14,vy:-55,life:.8,g:-35});battle.shake=Math.max(battle.shake,1.8);}
function shieldFx(u){addSfx('bubble',u.x,u.y,{sz:unitDrawSize(u)});}
function healFx(u){rise(u.x,u.y-6,'#9be59b',3,{spread:11,vy:-34,life:.7,g:-6,glyph:'+',r:5});}
// Status just applied by a hit: a puff of the status colour (rate-limited per target).
function statusFx(target,kind){
  const key='_sfx_'+kind;if(battle.time-(target[key]??-9)<.4)return;target[key]=battle.time;
  if(kind==='poison'){addSfx('puff',target.x,target.y-8);rise(target.x,target.y-4,'#b6ef7a',6,{spread:10,vy:-32,life:.8,g:-8,add:false,r:2.4});}
  else if(kind==='burn'){rise(target.x,target.y-6,'#ffb15c',7,{spread:10,vy:-48,life:.7,g:-30,r:2.2});}
  else if(kind==='slow'){addSfx('frost',target.x,target.y+4);rise(target.x,target.y-6,'#cfeeff',5,{spread:11,vy:-20,life:.7,g:10,r:2.2});}
  const tag=STATUS_TAG[kind],last=target._sfx_tag??-9;
  if(tag&&battle.time-last>2.5){target._sfx_tag=battle.time;banner(target,tag[0],tag[1],11);}
}

// ---- Timers ----
function tickSfx(dt){
  const b=battle;for(const f of b.sfx||[])f.t-=dt;b.sfx=(b.sfx||[]).filter(f=>f.t>0);
  for(const x of b.banners||[])x.t-=dt;b.banners=(b.banners||[]).filter(x=>x.t>0);
  // Lingering status: embers, bubbles and snow while a unit is burning, poisoned or slowed.
  for(const u of b.units){if(u.hp<=0)continue;
    if(u.poison>0&&(u._pt=(u._pt??0)-dt)<=0){u._pt=.34;rise(u.x,u.y-8,'#a9e870',1,{spread:8,vy:-22,life:.7,g:-6,add:false,r:2});}
    if(u.burn>0&&(u._bt=(u._bt??0)-dt)<=0){u._bt=.2;rise(u.x,u.y-8,'#ffa24a',1,{spread:8,vy:-38,life:.5,g:-20,r:1.6});}
    if(u.slow>0&&(u._st=(u._st??0)-dt)<=0){u._st=.4;rise(u.x,u.y-12,'#d6f0ff',1,{spread:9,vy:-10,life:.7,g:12,r:1.8});}}
}

// ---- Drawing ----
// Coloured glow under units that are burning, poisoned or slowed (drawn below the sprites).
function drawStatusAura(ctx){
  const t=battle.time;
  for(const u of battle.units){if(u.hp<=0||!(u.burn>0||u.poison>0||u.slow>0))continue;
    const sz=unitDrawSize(u),col=u.poison>0?'150,220,100':u.burn>0?'255,150,70':'130,200,255',a=.32+.1*Math.sin(t*7+u.id);
    const g=ctx.createRadialGradient(u.x,u.y+8,0,u.x,u.y+8,sz*.55);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);
    ctx.save();ctx.translate(u.x,u.y+8);ctx.scale(1,.38);ctx.translate(-u.x,-(u.y+8));ctx.fillStyle=g;ctx.beginPath();ctx.arc(u.x,u.y+8,sz*.55,0,7);ctx.fill();ctx.restore();}
}
function drawSfx(ctx){
  for(const f of battle.sfx||[]){const p=1-f.t/f.T,a=Math.max(0,1-p);ctx.save();
    if(f.kind==='revive'){
      ctx.globalCompositeOperation='lighter';
      const al=p<.15?p/.15:1-(p-.15)/.85,h=72*easeOut(Math.min(1,p*2.2)),w=24*(1-p*.6),base=f.y+10;
      const g=ctx.createLinearGradient(0,base,0,base-h);g.addColorStop(0,`rgba(255,226,140,${.7*al})`);g.addColorStop(1,'rgba(255,226,140,0)');ctx.fillStyle=g;ctx.fillRect(f.x-w/2,base-h,w,h);
      ctx.strokeStyle=`rgba(255,222,130,${al})`;ctx.lineWidth=3*(1-p)+.6;ctx.beginPath();ctx.ellipse(f.x,base,8+34*easeOut(p),3+11*easeOut(p),0,0,7);ctx.stroke();
      const r=(16*(1-p)+8)*1.8,rg=ctx.createRadialGradient(f.x,f.y-6,0,f.x,f.y-6,r);rg.addColorStop(0,`rgba(255,246,205,${.6*al})`);rg.addColorStop(1,'rgba(255,230,140,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y-6,r,0,7);ctx.fill();
    }else if(f.kind==='burst'){
      const R=44*easeOut(Math.min(1,p*1.7));
      const rg=ctx.createRadialGradient(f.x,f.y,R*.1,f.x,f.y,R);rg.addColorStop(0,`rgba(196,242,120,${.6*a})`);rg.addColorStop(.6,`rgba(150,110,205,${.42*a})`);rg.addColorStop(1,'rgba(120,70,170,0)');
      ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,R,0,7);ctx.fill();
      ctx.strokeStyle=`rgba(205,160,240,${a})`;ctx.lineWidth=3.2*(1-p)+.8;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(f.x,f.y,R,0,7);ctx.stroke();
    }else if(f.kind==='volley'){
      ctx.globalCompositeOperation='lighter';
      for(let i=0;i<10;i++){const an=i*.628+.2,r0=6+10*p,r1=14+36*easeOut(p);ctx.strokeStyle=`rgba(255,${i%2?225:245},${i%2?150:210},${a})`;ctx.lineWidth=(i%2?1.6:2.6)*(1-p)+.5;ctx.beginPath();ctx.moveTo(f.x+Math.cos(an)*r0,f.y+Math.sin(an)*r0);ctx.lineTo(f.x+Math.cos(an)*r1,f.y+Math.sin(an)*r1);ctx.stroke();}
      const rg=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,22);rg.addColorStop(0,`rgba(255,240,190,${.8*a})`);rg.addColorStop(1,'rgba(255,220,140,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,22,0,7);ctx.fill();
    }else if(f.kind==='barrier'){
      ctx.globalCompositeOperation='lighter';
      for(let k=0;k<2;k++){const q=Math.max(0,Math.min(1,(p-k*.18)/(1-k*.18)));if(q<=0)continue;ctx.strokeStyle=`rgba(150,215,255,${1-q})`;ctx.lineWidth=3*(1-q)+.6;ctx.beginPath();ctx.ellipse(f.x,f.y+8,10+40*easeOut(q),4+15*easeOut(q),0,0,7);ctx.stroke();}
      for(let i=0;i<6;i++){const an=p*6+i*1.047,r=10+22*easeOut(p);ctx.fillStyle=`rgba(190,235,255,${a})`;ctx.beginPath();ctx.arc(f.x+Math.cos(an)*r,f.y+Math.sin(an)*r*.55,2.2*(1-p)+.6,0,7);ctx.fill();}
    }else if(f.kind==='bubble'){
      const s=.7+.4*easeOut(Math.min(1,p*1.5)),rx=f.sz*.46*s,ry=f.sz*.56*s,cy=f.y-f.sz*.28;
      const rg=ctx.createRadialGradient(f.x,cy,ry*.2,f.x,cy,ry);rg.addColorStop(0,`rgba(150,215,255,${.05*a})`);rg.addColorStop(1,`rgba(150,215,255,${.55*a})`);
      ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(f.x,cy,rx,ry,0,0,7);ctx.fill();ctx.strokeStyle=`rgba(205,236,255,${a})`;ctx.lineWidth=1.8;ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${.9*a})`;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(f.x,cy,rx*.72,3.6,4.6);ctx.stroke();
    }else if(f.kind==='rage'){
      const R=50*easeOut(Math.min(1,p*1.5));
      const rg=ctx.createRadialGradient(f.x,f.y,R*.2,f.x,f.y,R);rg.addColorStop(0,`rgba(255,110,70,${.1*a})`);rg.addColorStop(1,`rgba(255,80,50,${.5*a})`);ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,R,0,7);ctx.fill();
      ctx.strokeStyle=`rgba(255,120,80,${a})`;ctx.lineWidth=4.5*(1-p)+.8;ctx.beginPath();ctx.arc(f.x,f.y,R,0,7);ctx.stroke();
    }else if(f.kind==='puff'){
      const R=8+10*easeOut(p),rg=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,R);rg.addColorStop(0,`rgba(176,240,110,${.55*a})`);rg.addColorStop(1,'rgba(130,200,90,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,R,0,7);ctx.fill();
    }else if(f.kind==='frost'){
      ctx.strokeStyle=`rgba(190,235,255,${a})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(f.x,f.y,6+14*easeOut(p),2+5*easeOut(p),0,0,7);ctx.stroke();
    }
    ctx.restore();}
}
function drawBanners(ctx,cam){
  ctx.textAlign='center';
  for(const x of battle.banners||[]){const p=1-x.t/x.T,pop=p<.14?1+(1-p/.14)*.6:1,al=Math.min(1,x.t/.3),px=x.u.x,py=x.u.y+x.oy-14*easeOut(p);
    ctx.save();ctx.globalAlpha=al;ctx.font=`900 ${x.size*pop/cam.s}px system-ui`;ctx.lineWidth=4/cam.s;ctx.lineJoin='round';ctx.strokeStyle='#241a22';ctx.strokeText(x.text,px,py);ctx.fillStyle=x.color;ctx.fillText(x.text,px,py);ctx.restore();}
}

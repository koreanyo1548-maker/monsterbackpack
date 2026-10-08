// Staff geometry and spell glow only. Combat state and projectile motion belong to the game.
window.createMageComposer=function(data){
 const geometry=data.spell,scale=data.assembly.displayWidth/data.assembly.width;
 const smooth=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
 function crystal(parts,pose){
  const p=parts[geometry.staffPart],[x,y,w,h]=p.rect,px=x+w*p.pivot[0],py=y+h*p.pivot[1];
  const lx=(geometry.crystal[0]-p.pivot[0])*w,ly=(geometry.crystal[1]-p.pivot[1])*h,angle=((p.angle||0)+(pose.staff||0))*Math.PI/180;
  return [px+lx*Math.cos(angle)-ly*Math.sin(angle),py+lx*Math.sin(angle)+ly*Math.cos(angle)];
 }
 function glow(ctx,x,y,radius,alpha){
  ctx.save();ctx.globalAlpha=alpha;
  const g=ctx.createRadialGradient(x,y,0,x,y,radius);
  for(const [stop,colour]of geometry.colours)g.addColorStop(stop,colour);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function compose(ctx,parts,pose,kind,time){
  for(const p of parts){
   const [x,y,w,h]=p.rect;ctx.save();
   if(p.pivot){const px=x+w*p.pivot[0],py=y+h*p.pivot[1];ctx.translate(px,py);ctx.rotate(((p.angle||0)+(pose[p.motion]||0))*Math.PI/180);ctx.translate(-px,-py);}
   ctx.drawImage(p.bitmap,...p.rect);ctx.restore();
  }
  if(kind!=='attack')return;
  const [cx,cy]=crystal(parts,pose),chargeData=geometry.charge;
  if(time>chargeData.start&&time<data.attack.impact){
   const charge=smooth(clamp((time-chargeData.start)/chargeData.duration)),pulse=1+chargeData.pulseAmount*Math.sin(time*chargeData.pulseRate);
   glow(ctx,cx,cy,(chargeData.radius+chargeData.radiusGain*charge)*pulse*scale,charge*chargeData.alpha);
   ctx.save();ctx.globalAlpha=charge*chargeData.ringAlpha;ctx.strokeStyle=chargeData.ringColour;ctx.lineWidth=chargeData.lineWidth*scale;
   ctx.beginPath();ctx.ellipse(cx,cy,(chargeData.ringRadius[0]+charge*chargeData.ringGain[0])*scale,(chargeData.ringRadius[1]+charge*chargeData.ringGain[1])*scale,chargeData.ringAngle+time*chargeData.ringSpeed,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<chargeData.sparks;i++){const phase=time*chargeData.sparkSpeed+i*Math.PI*2/chargeData.sparks,rx=cx+Math.cos(phase)*chargeData.sparkOrbit[0]*scale,ry=cy+Math.sin(phase)*chargeData.sparkOrbit[1]*scale;ctx.fillStyle=chargeData.sparkColour;ctx.beginPath();ctx.arc(rx,ry,chargeData.sparkRadius*scale,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  const elapsed=time-data.attack.impact,flash=geometry.flash;
  // The actual game projectile takes over at release; only the local crystal flash remains.
  if(elapsed>=0&&elapsed<flash.duration){const progress=elapsed/flash.duration;glow(ctx,cx,cy,(flash.radius-flash.radiusDecay*progress)*scale,(1-progress)*flash.alpha);}
 }
 compose.muzzle=crystal;
 return compose;
};

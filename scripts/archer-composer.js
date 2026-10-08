// Archery geometry only. The game supplies time; this module knows no units or combat rules.
window.createArcherComposer=function(data){
 const geometry=data.archery,warps=new Map(),strokeScale=data.assembly.displayWidth/data.assembly.width,smooth=t=>t*t*(3-2*t);
 const rotate=(p,j,degrees)=>{const r=degrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r),x=p[0]-j[0],y=p[1]-j[1];return [j[0]+x*c-y*s,j[1]+x*s+y*c];};
 const joint=p=>[p.rect[0]+p.rect[2]*p.pivot[0],p.rect[1]+p.rect[3]*p.pivot[1]];
 const mapPoint=(p,x,y)=>[p.rect[0]+x*p.rect[2]/p.sourceSize[0],p.rect[1]+y*p.rect[3]/p.sourceSize[1]];
 function warpX(x,c){const a=geometry.forearmStartPx,b=geometry.handStartPx;return x<=a?x:x<b?a+(x-a)*c:a+(b-a)*c+x-b;}
 function hand(parts,pose){const p=parts[geometry.drawingPart],c=pose.forearm??1,raw=geometry.drawingFinger;return rotate(mapPoint(p,warpX(raw[0]*p.sourceSize[0],c),raw[1]*p.sourceSize[1]),joint(p),(p.angle||0)+(pose.drawAngle||0));}
 function bowPoint(parts,pose,point){const p=parts[geometry.bowPart];return rotate(mapPoint(p,...point),joint(p),(p.angle||0)+(pose.bowAngle||0));}
 function armImage(p,c){
  if(c===1)return p.bitmap;const key=c.toFixed(3);if(warps.has(key))return warps.get(key);
  const [w,h]=p.sourceSize,a=geometry.forearmStartPx,b=geometry.handStartPx,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const g=canvas.getContext('2d');g.imageSmoothingQuality='high';
  g.drawImage(p.bitmap,0,0,a,h,0,0,a,h);g.drawImage(p.bitmap,a,0,b-a,h,a,0,(b-a)*c,h);g.drawImage(p.bitmap,b,0,w-b,h,a+(b-a)*c,0,w-b,h);
  warps.set(key,canvas);return canvas;
 }
 function limb(ctx,p,angle,image=p.bitmap){const j=joint(p);ctx.save();ctx.translate(...j);ctx.rotate(angle*Math.PI/180);ctx.translate(-j[0],-j[1]);ctx.drawImage(image,...p.rect);ctx.restore();}
 function compose(ctx,parts,pose,kind,time){
  const bow=parts[geometry.bowPart],body=parts[geometry.bodyPart],arrow=parts[geometry.arrowPart],drawing=parts[geometry.drawingPart];
  const finger=hand(parts,pose),grip=bowPoint(parts,pose,geometry.bowGripPx),tips=geometry.bowTipsPx.map(p=>bowPoint(parts,pose,p));
  limb(ctx,bow,(bow.angle||0)+(pose.bowAngle||0));ctx.drawImage(body.bitmap,...body.rect);
  if(kind==='attack'&&time>geometry.stringStart&&time<geometry.stringEnd){
   const opacity=Math.min(1,(time-geometry.stringStart)/geometry.stringFadeIn)*Math.min(1,(geometry.stringEnd-time)/geometry.stringFadeOut),elapsed=time-data.attack.impact;
   let apex=finger;
   if(elapsed>=0){const q=(finger[1]-tips[0][1])/(tips[1][1]-tips[0][1]),x=tips[0][0]+(tips[1][0]-tips[0][0])*q,t=smooth(Math.min(1,elapsed/geometry.stringSnapDuration));
    const wiggle=elapsed>geometry.stringSnapDuration?Math.sin((elapsed-geometry.stringSnapDuration)*80)*8*strokeScale*Math.exp(-(elapsed-geometry.stringSnapDuration)*18):0;
    apex=[finger[0]+(x-finger[0])*t+wiggle,finger[1]];
   }
   ctx.save();ctx.globalAlpha=opacity;ctx.lineCap='round';ctx.lineJoin='round';
   // Reference line widths are in the approved preview's pixels.
   for(const [colour,w]of [['#30271e',4],['#eedfc2',2]]){ctx.strokeStyle=colour;ctx.lineWidth=w*strokeScale;ctx.beginPath();ctx.moveTo(...tips[0]);ctx.lineTo(...apex);ctx.lineTo(...tips[1]);ctx.stroke();}ctx.restore();
  }
  // At release, the real game projectile takes over; no second flying arrow is painted here.
  const loaded=kind!=='attack'||time<data.attack.impact||time>=geometry.reloadStart;
  if(loaded){
   const rest={forearm:1,drawAngle:0,bowAngle:0},restHand=hand(parts,rest),restGrip=bowPoint(parts,rest,geometry.bowGripPx),nock=mapPoint(arrow,...geometry.arrowNockPx);
   const angle=Math.atan2(grip[1]-finger[1],grip[0]-finger[0])-Math.atan2(restGrip[1]-restHand[1],restGrip[0]-restHand[0]);
   const anchor=[nock[0]+finger[0]-restHand[0],nock[1]+finger[1]-restHand[1]];
   ctx.save();if(kind==='attack'&&time>=geometry.reloadStart)ctx.globalAlpha=smooth(Math.min(1,(time-geometry.reloadStart)/geometry.reloadDuration));
   ctx.translate(...anchor);ctx.rotate(angle);ctx.translate(-nock[0],-nock[1]);ctx.drawImage(arrow.bitmap,...arrow.rect);ctx.restore();
  }
  limb(ctx,drawing,(drawing.angle||0)+(pose.drawAngle||0),armImage(drawing,pose.forearm??1));
 }
 compose.muzzle=(parts,pose)=>bowPoint(parts,pose,geometry.bowGripPx);
 return compose;
};

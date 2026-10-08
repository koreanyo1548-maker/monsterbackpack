// The renderer owns image composition only; the game supplies animation time and combat state.
window.createStickerRenderer = function(data, composer=null) {
  const scale = data.assembly.displayWidth / data.assembly.width;
  const top = data.assembly.bottom - data.assembly.height * scale;
  const parts = data.parts.map(part => ({
    ...part, rect: [data.assembly.left + part.rect[0]*scale, top + part.rect[1]*scale, part.rect[2]*scale, part.rect[3]*scale]
  }));
  const root = parts[data.centre.part].rect;
  const centre = [root[0]+root[2]*data.centre.fraction[0], root[1]+root[3]*data.centre.fraction[1]];
  const frames = new Map();
  const poseFields = data.poseFields || ['sword','bodyAngle','freeArm'];
  let loaded = false, loading, anchor, referenceHeight;

  function poseAt(time) {
    const keys = data.attack.keys;
    time = Math.max(keys[0].time, Math.min(keys[keys.length-1].time, time));
    const end = keys.findIndex((key, i) => i > 0 && time <= key.time);
    const a = keys[end-1], b = keys[end], t = (time-a.time)/(b.time-a.time);
    const progress = a.time === data.attack.fastStart ? t*t : t*t*(3-2*t);
    return Object.fromEntries(poseFields.map(key => [key, a[key]+(b[key]-a[key])*progress]));
  }

  function compose(pose, kind, time) {
    const canvas = document.createElement('canvas');
    canvas.width = data.canvas.width; canvas.height = data.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    ctx.translate(centre[0], centre[1]);
    ctx.rotate((pose.bodyAngle || 0)*Math.PI/180);
    ctx.scale(pose.scaleX || 1, pose.scaleY || 1);
    ctx.translate(-centre[0], -centre[1]);
    // Layer order and shoulder angles belong to the rig, never the combat code.
    if(composer)composer(ctx,parts,pose,kind,time);
    else for (const part of parts) {
      const [x,y,w,h] = part.rect;
      ctx.save();
      if (part.pivot) {
        const px=x+w*part.pivot[0], py=y+h*part.pivot[1];
        ctx.translate(px,py); ctx.rotate(((part.angle || 0)+(pose[part.motion || part.id] || 0))*Math.PI/180); ctx.translate(-px,-py);
      }
      ctx.drawImage(part.bitmap,x,y,w,h); ctx.restore();
    }
    ctx.restore();
    const effects=data.attack.effects, elapsed=time-data.attack.impact;
    if(kind==='attack' && effects && elapsed>=0 && elapsed<effects.duration) {
      const t=elapsed/effects.duration;
      for(const [cx,cy] of effects.contacts) {
        const x=data.assembly.left+cx*scale, y=top+cy*scale;
        ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#8d7350';ctx.lineWidth=(3*(1-t)+1)*scale;
        ctx.beginPath();ctx.ellipse(x,y,(17+47*t)*scale,(3+9*t)*scale,0,0,Math.PI*2);ctx.stroke();
        for(let i=0;i<5;i++) {
          const dx=(i-2)*14*(.35+t)*scale,dy=-Math.sin((t+.12)*Math.PI)*(14+8*(i%2))*scale;
          ctx.fillStyle=i%2?'#a59174':'#c5b79f';ctx.beginPath();ctx.ellipse(x+dx,y+dy,(5*(1-t)+2)*scale,(4*(1-t)+1)*scale,(i-2)*.5,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
    }
    return canvas;
  }

  function frame(kind, time) {
    if (!loaded) return null;
    let key, pose, sampleTime=0;
    if (kind === 'attack') {
      const step = data.attack.sampleStep;
      const sample = Math.max(0, Math.min(data.attack.end, Math.round(time/step)*step));
      sampleTime=sample;
      key = `attack:${Math.round(sample/step)}`;
      pose = poseAt(sample);
      if(data.attack.freeArmDelay)pose.freeArm = poseAt(sample-data.attack.freeArmDelay).freeArm;
    } else {
      const phase = ((time%data.idle.duration)+data.idle.duration)%data.idle.duration;
      const index = Math.floor(phase/data.idle.duration*data.idle.steps);
      key = `idle:${index}`;
      const breath = Math.sin(index/data.idle.steps*Math.PI*2);
      const values=data.idle.values || {sword:data.idle.sword,freeArm:data.idle.freeArm};
      pose = { ...Object.fromEntries(Object.entries(values).map(([field,amount])=>[field,amount*breath])),
        scaleX: 1+data.idle.scaleX*breath, scaleY: 1+data.idle.scaleY*breath };
    }
    if (!frames.has(key)) {
      const result={image:compose(pose,kind,sampleTime),key,anchor,referenceHeight};
      if(composer?.muzzle){const point=composer.muzzle(parts,pose);result.muzzle=[centre[0]+(point[0]-centre[0])*(pose.scaleX||1),centre[1]+(point[1]-centre[1])*(pose.scaleY||1)];}
      frames.set(key,result);
    }
    return frames.get(key);
  }

  function load() {
    if (loading) return loading;
    loading = Promise.all(parts.map(part => new Promise((resolve,reject) => {
      const image = new Image();
      image.onload = () => { part.bitmap=image; resolve(); };
      image.onerror = () => reject(new Error(`Sticker part failed to load: ${part.image}`));
      image.src = part.image;
    }))).then(() => {
      // Bounds are measured at build time, so local-file play needs no canvas pixel reads.
      anchor=[centre[0],data.foot??data.neutralBounds[3]];
      referenceHeight=anchor[1]-data.neutralBounds[1]; loaded=true;
      return api;
    });
    return loading;
  }
  const api = { load, frame };
  return api;
};

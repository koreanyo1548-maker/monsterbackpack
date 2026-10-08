// Rebuilds the UI sprite from the approved sword arm, shield arm, body and rig; originals are preserved.
// Node.js requires sharp and @napi-rs/canvas through NODE_PATH.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),rigPath=path.join(root,'assets/stickers/skeleton/rig.js'),context={window:{}};
vm.runInNewContext(fs.readFileSync(rigPath,'utf8'),context);const data=context.window.SKELETON_STICKER;
(async()=>{
 const canvas=createCanvas(data.canvas.width,data.canvas.height),ctx=canvas.getContext('2d');
 const scale=data.assembly.displayWidth/data.assembly.width,top=data.assembly.bottom-data.assembly.height*scale;
 for(const part of data.parts){
  const [x,y,w,h]=part.rect,px=data.assembly.left+x*scale,py=top+y*scale,pw=w*scale,ph=h*scale;
  ctx.save();if(part.pivot){const jx=px+pw*part.pivot[0],jy=py+ph*part.pivot[1];ctx.translate(jx,jy);ctx.rotate((part.angle||0)*Math.PI/180);ctx.translate(-jx,-jy);}
  ctx.drawImage(await loadImage(path.join(root,part.image)),px,py,pw,ph);ctx.restore();
 }
 const png=canvas.toBuffer('image/png'),{data:p,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(p[(y*info.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
 if(x0===0||y0===0||x1===info.width||y1===info.height)throw Error('Neutral sprite clipped');
 data.neutralBounds=[x0,y0,x1,y1];data.uiBounds=[x0-2,y0-2,x1-x0+4,y1-y0+4];
 await sharp(png).extract({left:x0-2,top:y0-2,width:data.uiBounds[2],height:data.uiBounds[3]}).png().toFile(path.join(root,data.image));
 fs.writeFileSync(rigPath,'// Approved sword swing with fixed centre and guide layer order. Coordinates use the 720 × 620 preview.\nwindow.SKELETON_STICKER = '+JSON.stringify(data,null,2)+';\n');
 console.log(JSON.stringify({image:data.image,neutralBounds:data.neutralBounds,uiBounds:data.uiBounds}));
})().catch(e=>{console.error(e);process.exitCode=1;});

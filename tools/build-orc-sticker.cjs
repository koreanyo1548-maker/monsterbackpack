// Run with Node.js and sharp/@napi-rs/canvas available through NODE_PATH.
// Generates cleaned parts and the transparent UI image without changing the source sheet.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const sharp=require('sharp'), {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'), context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/stickers/orc/rig.js'),'utf8'),context);
const data=context.window.ORC_STICKER;
function keepLargestComponent(pixels,width,height){
  const labels=new Int32Array(width*height),queue=new Int32Array(width*height);
  let label=0,largest=0,size=0;
  for(let start=0;start<labels.length;start++){
    if(labels[start]||!pixels[start*4+3])continue;
    label++;let head=0,tail=1;queue[0]=start;labels[start]=label;
    while(head<tail){
      const index=queue[head++],x=index%width,y=Math.floor(index/width);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;
        if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const next=ny*width+nx;
        if(!labels[next]&&pixels[next*4+3]){labels[next]=label;queue[tail++]=next;}
      }
    }
    if(tail>size){size=tail;largest=label;}
  }
  for(let i=0;i<labels.length;i++)if(labels[i]!==largest)pixels[i*4+3]=0;
}
(async()=>{
  const canvas=createCanvas(data.canvas.width,data.canvas.height),ctx=canvas.getContext('2d');
  const scale=data.assembly.displayWidth/data.assembly.width;
  const top=data.assembly.bottom-data.assembly.height*scale;
  for(const part of data.parts){
    const [left,y,right,bottom]=part.crop,width=right-left,height=bottom-y;
    const pixels=await sharp(path.join(root,data.source)).extract({left,top:y,width,height}).ensureAlpha().raw().toBuffer();
    keepLargestComponent(pixels,width,height);
    const png=await sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer();
    fs.writeFileSync(path.join(root,part.image),png);
    const [x,py,w,h]=part.rect;
    ctx.drawImage(await loadImage(png),data.assembly.left+x*scale,top+py*scale,w*scale,h*scale);
  }
  const buffer=canvas.toBuffer('image/png');
  const {data:pixels,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=0,y1=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(pixels[(y*info.width+x)*4+3]){
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);
  }
  const padding=2,left=Math.max(0,x0-padding),topY=Math.max(0,y0-padding);
  if([x0,y0,x1,y1].some((value,i)=>value!==data.neutralBounds[i]))throw Error('Update rig neutralBounds/uiBounds for the new artwork');
  await sharp(buffer).extract({left,top:topY,width:Math.min(info.width,x1+padding)-left,height:Math.min(info.height,y1+padding)-topY}).png().toFile(path.join(root,data.image));
  console.log(JSON.stringify({image:data.image,neutralBounds:[x0,y0,x1,y1],parts:data.parts.map(part=>part.image)}));
})().catch(error=>{console.error(error);process.exitCode=1;});

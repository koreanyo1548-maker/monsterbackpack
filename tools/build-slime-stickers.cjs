// Run with Node.js and sharp available through NODE_PATH. Source PNGs are preserved.
const path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const variants=['slime','fireSlime'],visibleWidth=252,padding=2;
function cleanSilhouette(pixels,width,height){
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
  if(!largest)throw Error('Empty source image');
  let x0=width,y0=height,x1=0,y1=0,removed=0;
  for(let i=0;i<labels.length;i++){
    if(labels[i]!==largest){if(pixels[i*4+3])removed++;pixels[i*4+3]=0;continue;}
    const x=i%width,y=Math.floor(i/width);
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);
  }
  return {left:x0,top:y0,width:x1-x0,height:y1-y0,removed};
}
(async()=>{
  const results=[];
  for(const variant of variants){
    const source=path.join(root,'assets/stickers',variant,variant+'.png');
    const output=path.join(root,'assets/stickers',variant,'game.png');
    const {data:pixels,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const {removed,...crop}=cleanSilhouette(pixels,info.width,info.height);
    await sharp(pixels,{raw:{width:info.width,height:info.height,channels:4}}).extract(crop)
      .resize({width:visibleWidth}).extend({top:padding,bottom:padding,left:padding,right:padding,background:{r:0,g:0,b:0,alpha:0}})
      .png().toFile(output);
    const meta=await sharp(output).metadata();
    results.push({variant,sourceSize:[info.width,info.height],crop,removed,outputSize:[meta.width,meta.height],output});
  }
  console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});

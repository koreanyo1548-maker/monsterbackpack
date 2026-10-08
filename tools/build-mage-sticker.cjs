// Rebuild the transparent UI image and bounds using the same mage compositor as the game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),rigPath=path.join(root,'assets/stickers/mage/rig.js');
const context={window:{},document:{createElement:()=>createCanvas(1,1)}};
vm.runInNewContext(fs.readFileSync(rigPath,'utf8'),context);vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/mage-composer.js'),'utf8'),context);
const data=context.window.MAGE_STICKER;
(async()=>{
 const scale=data.assembly.displayWidth/data.assembly.width,top=data.assembly.bottom-data.assembly.height*scale,parts=[];
 for(const p of data.parts)parts.push({...p,bitmap:await loadImage(path.join(root,p.image)),rect:[data.assembly.left+p.rect[0]*scale,top+p.rect[1]*scale,p.rect[2]*scale,p.rect[3]*scale]});
 const canvas=createCanvas(data.canvas.width,data.canvas.height),ctx=canvas.getContext('2d');context.window.createMageComposer(data)(ctx,parts,{staff:0,hand:0},'idle',0);
 const png=canvas.toBuffer('image/png'),{data:p,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(p[(y*info.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
 if(!x0||!y0||x1===info.width||y1===info.height)throw Error('Neutral sprite clipped');
 data.neutralBounds=[x0,y0,x1,y1];data.uiBounds=[x0-2,y0-2,x1-x0+4,y1-y0+4];
 await sharp(png).extract({left:x0-2,top:y0-2,width:data.uiBounds[2],height:data.uiBounds[3]}).png().toFile(path.join(root,data.image));
 fs.writeFileSync(rigPath,'// Approved raised staff cast, fixed centre and original guide layer order.\nwindow.MAGE_STICKER = '+JSON.stringify(data,null,2)+';\n');
 console.log(JSON.stringify({image:data.image,neutralBounds:data.neutralBounds,uiBounds:data.uiBounds,foot:data.foot}));
})().catch(e=>{console.error(e);process.exitCode=1;});

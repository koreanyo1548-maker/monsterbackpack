// data/game-data.json is the source of truth for the game tables. Browsers refuse fetch() on file:// pages, so the
// same data is also written as data/game-data.js (window.GAME_DATA = ...) for index.html to load with a <script> tag.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','data');
export const JSON_FILE=path.join(dir,'game-data.json'),JS_FILE=path.join(dir,'game-data.js');

// JSON.stringify, but anything short enough stays on one line so diffs of tables and grids stay readable.
function fmt(v,indent=''){
  const flat=JSON.stringify(v);
  if(flat===undefined||flat.length<=190||typeof v!=='object'||v===null)return flat;
  const pad=indent+' ',items=Array.isArray(v)?v.map(x=>fmt(x,pad)):Object.entries(v).map(([k,x])=>JSON.stringify(k)+': '+fmt(x,pad));
  const [open,close]=Array.isArray(v)?['[',']']:['{','}'];
  return open+'\n'+items.map(s=>pad+s).join(',\n')+'\n'+indent+close;
}
export const readData=()=>JSON.parse(fs.readFileSync(JSON_FILE,'utf8'));
export const jsText=data=>'// Generated from data/game-data.json by tools/build-data.mjs. Do not edit by hand.\nwindow.GAME_DATA = '+fmt(data)+';\n';
export function writeData(data){
  fs.writeFileSync(JSON_FILE,fmt(data)+'\n');
  fs.writeFileSync(JS_FILE,jsText(data));
}

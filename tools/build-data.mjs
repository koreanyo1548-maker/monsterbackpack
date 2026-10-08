// Regenerates data/game-data.js from data/game-data.json.  --check exits 1 if the two are out of sync.
import fs from 'node:fs';
import {readData,writeData,jsText,JS_FILE} from './data-io.mjs';

if(process.argv.includes('--check')){
  const same=fs.existsSync(JS_FILE)&&fs.readFileSync(JS_FILE,'utf8')===jsText(readData());
  if(!same){console.error('data/game-data.js is out of date: run node tools/build-data.mjs');process.exit(1);}
  console.error('data/game-data.js is in sync');
}else writeData(readData());

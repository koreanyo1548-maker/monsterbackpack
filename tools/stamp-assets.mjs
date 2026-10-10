// Adds ?v=<content hash> to every local <script src> and <link href> in index.html, so a browser (or GitHub Pages'
// cache) can never mix a new script with a stale data file. Run after changing any script, style or data file.
//   node tools/stamp-assets.mjs           rewrite index.html
//   node tools/stamp-assets.mjs --check   exit 1 when a stamp is out of date
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'index.html');
const html=fs.readFileSync(file,'utf8');
const out=html.replace(/(<script[^>]*\ssrc="|<link[^>]*\shref=")([^"?:]+)(\?v=[0-9a-f]+)?"/g,(m,pre,src)=>{
  const f=path.join(root,src);if(!fs.existsSync(f))return m;
  return `${pre}${src}?v=${crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0,8)}"`;
});
if(process.argv.includes('--check')){if(out!==html){console.error('index.html asset stamps are out of date: run node tools/stamp-assets.mjs');process.exit(1);}console.error('asset stamps are up to date');}
else fs.writeFileSync(file,out);

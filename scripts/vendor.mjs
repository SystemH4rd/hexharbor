import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'docs/v2/vendor');
await mkdir(out,{recursive:true});
const phone=await readFile(resolve(root,'node_modules/libphonenumber-js/bundle/libphonenumber-max.js'),'utf8');
const exif=await readFile(resolve(root,'node_modules/exifr/dist/full.esm.mjs'),'utf8');
const strip=s=>s.replace(/\/\/[#@] sourceMappingURL=[^\n]*/g,'');
const phoneEsm='/* libphonenumber-js 1.13.7 — MIT; Google metadata — Apache-2.0. See licenses. */\nconst module={exports:{}};const exports=module.exports;\n'+strip(phone)+'\nexport default module.exports;\n';
await writeFile(resolve(out,'phone.js'),phoneEsm);
await writeFile(resolve(out,'exifr.js'),strip(exif));
for(const [source,target] of [['libphonenumber-js/LICENSE','phone-LICENSE.txt'],['libphonenumber-js/LICENSE.Apache','metadata-LICENSE.txt'],['exifr/LICENSE','exifr-LICENSE.txt']])await writeFile(resolve(out,target),await readFile(resolve(root,'node_modules',source)));
const provenance={packages:[{name:'libphonenumber-js',version:'1.13.7',source:'https://github.com/catamphetamine/libphonenumber-js',license:'MIT; metadata Apache-2.0'},{name:'exifr',version:'7.1.3',source:'https://github.com/MikeKovarik/exifr',license:'MIT'}],sha256:{phone:createHash('sha256').update(phoneEsm).digest('hex'),exifr:createHash('sha256').update(strip(exif)).digest('hex')}};
await writeFile(resolve(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log('Built pinned local browser libraries; no CDN runtime dependency.');


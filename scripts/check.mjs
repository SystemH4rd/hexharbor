import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),pub=resolve(root,'docs');
async function walk(dir){let list=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);assert.ok(!entry.isSymbolicLink(),'No symbolic links in published artifact');list.push(...entry.isDirectory()?await walk(path):[path]);}return list;}
const files=await walk(pub);assert.ok(files.includes(resolve(pub,'index.html')));assert.ok(files.includes(resolve(pub,'.nojekyll')));
for(const file of files){
 const path=relative(pub,file),text=await readFile(file,'utf8');
 assert.ok(!/(^|\/)(\.env(?:\..*)?|uploads|private|node_modules|\.git)(\/|$)/.test(path),'Forbidden public file: '+path);
 assert.ok(!/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-proj-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|[0-9]{8,12}:[A-Za-z0-9_-]{35})/.test(text),'Potential credential in '+path);
 assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.)/.test(text),'Private/local URL in published files');
 if(file.endsWith('.json')) JSON.parse(text);
 if(file.endsWith('.html')) for(const match of text.matchAll(/(?:src|href)="([^"]+)"/g)){
  const ref=match[1];if(/^(?:#|https?:|data:)/.test(ref)||ref.startsWith('/hexharbor/'))continue;
  assert.ok(!ref.startsWith('/'),'Root-relative resource breaks project Pages: '+ref);
  const target=resolve(dirname(file),ref),info=await stat(target);
  assert.ok(info.isFile()||(info.isDirectory()&&(await stat(resolve(target,'index.html'))).isFile()),'Missing resource '+ref);
 }
}
const data=JSON.parse(await readFile(resolve(pub,'data/demo.json'),'utf8'));
const schema=JSON.parse(await readFile(resolve(pub,'schema/result.schema.json'),'utf8'));
assert.equal(data.mode,'demo');
for(const mode of ['phone','email','photo']){assert.equal(data[mode].length,3);for(const row of data[mode]){
 for(const key of schema.required) assert.ok(Object.hasOwn(row,key),'Missing '+key);
 assert.equal(row.inputType,mode);assert.ok(['verified','unverified'].includes(row.verificationStatus));
 assert.ok(Number.isInteger(row.confidence)&&row.confidence>=0&&row.confidence<=100);
 assert.ok(!Number.isNaN(Date.parse(row.observedAt)));
 assert.ok(['example.org','example.com','example.net'].includes(new URL(row.sourceUrl).hostname),'Demo source must be reserved example domain');
}}
const app=await readFile(resolve(pub,'assets/app.js'),'utf8');
assert.ok(!/\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon)\b/.test(app),'Demo must not persist or transmit user inputs');
assert.ok(!/\.innerHTML\s*=/.test(app),'Use textContent for dynamic rendering');
const config=JSON.parse(await readFile(resolve(pub,'v2/config.json'),'utf8'));
assert.equal(config.version,'2.0.0');assert.equal(config.transport,'browser');assert.equal(config.apiBase,null,'Pages uses browser DoH by default');
const liveSchema=JSON.parse(await readFile(resolve(pub,'v2/schema/result.schema.json'),'utf8'));
assert.equal(liveSchema.properties.mode.const,'live');
assert.deepEqual(liveSchema.properties.findings.items.properties.status.enum,['observed','derived','unknown','error']);
const provenance=JSON.parse(await readFile(resolve(pub,'v2/vendor/provenance.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
for(const item of provenance.packages)assert.equal(pkg.dependencies[item.name],item.version,'Pinned dependency version must match attribution');
for(const [key,file]of [['phone','phone.js'],['exifr','exifr.js']])assert.equal(createHash('sha256').update(await readFile(resolve(pub,'v2/vendor',file))).digest('hex'),provenance.sha256[key],'Vendor integrity mismatch');
for(const name of ['phone-LICENSE.txt','metadata-LICENSE.txt','exifr-LICENSE.txt'])assert.ok((await readFile(resolve(pub,'v2/vendor',name),'utf8')).length>100,'Missing third-party license');
for(const file of files.filter(f=>f.endsWith('.js')&&f.includes('/v2/')&&!f.includes('/vendor/'))){
 const text=await readFile(file,'utf8');
 assert.ok(!/\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon)\b|\.innerHTML\s*=/.test(text),'Live UI must not persist input or render unsafe HTML');
 assert.ok(!/data\/demo\.json|assets\/core\.js/.test(text),'Live analyzers must not consume demo fixtures');
 for(const ref of text.matchAll(/(?:from\s+|import\s*\(|new URL\()\s*['"](\.[^'"]+)['"]/g))assert.ok((await stat(resolve(dirname(file),ref[1]))).isFile(),'Missing module '+ref[1]);
}
console.log('PASS: '+files.length+' public files; resources, v1 demo fixtures, v2 contract/config, pinned libraries/licenses and hashes verified; no credential-pattern matches. Manual source review remains necessary.');


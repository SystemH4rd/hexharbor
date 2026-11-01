import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import assert from 'node:assert/strict';
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
  assert.ok((await stat(resolve(dirname(file),ref))).isFile(),'Missing resource '+ref);
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
console.log('PASS: '+files.length+' public files, references, 9 synthetic records, no credential-pattern matches; manual review remains required.');


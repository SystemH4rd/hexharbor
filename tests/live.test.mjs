import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {normalizeDomain,emailDomain,exportReport} from '../docs/v2/lib/model.js';
import {queryDns,createDnsCache,dnsText} from '../docs/v2/lib/dns.js';
import {analyzeEmailDomain} from '../docs/v2/lib/email.js';
import {analyzePhone} from '../docs/v2/lib/phone.js';
import {analyzePhoto,imageHeader} from '../docs/v2/lib/photo.js';
import {images} from './image-fixtures.mjs';
const codes={MX:15,A:1,AAAA:28,TXT:16};
function response(name,type,{rcode=0,records=[],ad=true}={}){return {name,type,rcode,records,provider:'Test resolver',sourceUrl:'https://dns.google/resolve?name='+encodeURIComponent(name)+'&type='+type,observedAt:'2026-01-01T00:00:00.000Z',dnssecValidated:ad};}
function fetchStub({status=0,answers=[]}={}){return async url=>{const u=new URL(url),type=codes[u.searchParams.get('type')];return new Response(JSON.stringify({Status:status,AD:true,Question:[{name:u.searchParams.get('name')+'.',type}],Answer:answers.map(data=>({name:u.searchParams.get('name')+'.',type,TTL:2,data}))}));};}
test('domain normalization rejects URL/SSRF-shaped inputs and preserves IDN as ASCII',()=>{
 assert.equal(emailDomain('test@EXAMPLE.org'),'example.org');assert.equal(normalizeDomain('приклад.укр'),'xn--80aikifvh.xn--j1amh');
 for(const value of ['http://127.0.0.1','127.0.0.1','localhost','a.local','x.internal','example.org:443','a..org','example.org/path'])assert.throws(()=>normalizeDomain(value));
});
test('DNS response is checked against the actual question; wrong answers are not evidence',async()=>{
 const bad=async()=>new Response(JSON.stringify({Status:0,Question:[{name:'wrong.org.',type:15}],Answer:[]}));
 await assert.rejects(queryDns('example.org','MX',{fetchImpl:bad}),/не відповіли/);
});
test('DNS NXDOMAIN is an observed negative response; mailbox identity remains unknown',async()=>{
 const report=await analyzeEmailDomain('example.org',{query:async(name,type)=>response(name,type,{rcode:3})});
 assert.equal(report.findings.find(f=>f.id==='MX').status,'observed');
 assert.match(report.findings.find(f=>f.id==='MX').summary,/NXDOMAIN/);
 assert.equal(report.findings.find(f=>f.id==='MAILBOX_SCOPE').scope.mailboxExists,null);
 assert.equal(report.mode,'live');
});
test('Null MX and missing MX are distinguished without claiming mailbox existence',async()=>{
 const nullMx=await analyzeEmailDomain('example.org',{query:async(n,t)=>response(n,t,{records:t==='MX'?[{data:'0 .',ttl:60}]:[]})});
 assert.match(nullMx.findings[0].summary,/Null MX/);
 const noMx=await analyzeEmailDomain('example.org',{query:async(n,t)=>response(n,t)});
 assert.match(noMx.findings[0].summary,/саме по собі не доводить/);
});
test('DoH failover records the provider that actually answered',async()=>{
 let calls=0;const stub=fetchStub({answers:['10 mx.example.org.']});
 const result=await queryDns('example.org','MX',{fetchImpl:async(...args)=>{if(++calls===1)return new Response('',{status:503});return stub(...args);}});
 assert.equal(calls,2);assert.equal(result.providerId,'cloudflare');assert.equal(result.records[0].data,'10 mx.example.org.');
});
test('DoH timeout and cancellation do not produce fixture results',async()=>{
 const hanging=(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));
 await assert.rejects(queryDns('example.org','MX',{fetchImpl:hanging,timeoutMs:3}),e=>e.code==='UPSTREAM_UNAVAILABLE');
 const c=new AbortController();c.abort();await assert.rejects(queryDns('example.org','MX',{signal:c.signal,fetchImpl:hanging}),{name:'AbortError'});
});
test('TTL cache preserves observedAt and expires rather than relabeling old data as new',async()=>{
 let time=1000,calls=0;const stub=fetchStub({answers:['10 mx.example.org.']}),cache=createDnsCache({now:()=>time});
 const first=await cache.query('example.org','MX',{fetchImpl:async(...args)=>{calls++;return stub(...args);}});
 time+=1000;const cached=await cache.query('example.org','MX',{fetchImpl:stub});
 assert.equal(cached.cache.hit,true);assert.equal(cached.observedAt,first.observedAt);assert.equal(cached.cache.ageSeconds,1);
 time+=2000;const fresh=await cache.query('example.org','MX',{fetchImpl:async(...args)=>{calls++;return stub(...args);}});
 assert.equal(fresh.cache.hit,false);assert.equal(calls,2);
});
test('TXT strings are reconstructed and SPF/DMARC are not fabricated from unrelated TXT',async()=>{
 assert.equal(dnsText('"v=spf1 " "include:example.org -all"'),'v=spf1 include:example.org -all');
 const report=await analyzeEmailDomain('example.org',{query:async(n,t)=>response(n,t,{records:[{data:'"unrelated-token"',ttl:60}]})});
 assert.match(report.findings.find(f=>f.id==='SPF').summary,/NODATA/);
});
test('upstream failures remain errors and do not fall back to demo answers',async()=>{
 const report=await analyzeEmailDomain('example.org',{query:async()=>{throw new Error('offline');}});
 assert.equal(report.status,'error');assert.equal(report.findings.filter(f=>f.status==='error').length,5);assert.equal(report.findings.filter(f=>f.status==='observed').length,0);
});
test('phone metadata is real, while ownership/activity stay unknown',()=>{
 const report=analyzePhone('+1 202 555 0142');
 assert.equal(report.findings[0].fields.find(f=>f.label==='E.164').value,'+12025550142');
 assert.equal(report.findings[1].status,'derived');assert.equal(report.findings[2].scope.active,null);
 assert.equal(report.findings[2].scope.owner,null);assert.equal(report.findings[0].sourceVersion,'1.13.7');
 assert.throws(()=>analyzePhone('+999123456789'));
});
test('PNG/JPEG/WebP headers and actual SHA-256 are measured from fixture bytes',async()=>{
 for(const [kind,mime]of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp']]){
  const bytes=Buffer.from(images[kind],'base64'),file=new File([bytes],'test.'+kind,{type:mime}),report=await analyzePhoto(file),header=imageHeader(bytes);
  assert.deepEqual([header.width,header.height],[40,20]);
  assert.equal(report.findings.find(f=>f.id==='PHOTO_HASH').fields[0].value,createHash('sha256').update(bytes).digest('hex'));
  assert.ok(report.findings.every(f=>!('confidence' in f)));
 }
});
test('EXIF camera is read but GPS coordinates are not returned as findings',async()=>{
 const file=new File([Buffer.from(images.jpeg,'base64')],'camera.jpg',{type:'image/jpeg'}),report=await analyzePhoto(file);
 const exif=report.findings.find(f=>f.id==='PHOTO_EXIF');
 assert.equal(exif.fields.find(f=>f.label==='Модель').value,'Synthetic Camera');
 assert.match(exif.fields.find(f=>f.label==='GPS-теги').value,/Присутні/);
 assert.ok(!JSON.stringify(report).includes('"latitude"'));assert.ok(!JSON.stringify(report).includes('"longitude"'));
});
test('oversized pixel headers and MIME mismatch are rejected',async()=>{
 const bytes=Buffer.from(images.png,'base64'),huge=Buffer.from(bytes);huge.writeUInt32BE(50000,16);huge.writeUInt32BE(50000,20);
 assert.throws(()=>imageHeader(huge),/40 мегапікселів/);
 await assert.rejects(analyzePhoto(new File([bytes],'fake.jpg',{type:'image/jpeg'})),/не збігається/);
 const corrupt=Buffer.from(bytes);corrupt[4]=0;assert.throws(()=>imageHeader(corrupt),/заголовок/);
});
test('missing Web Crypto leaves only the hash unknown while file and EXIF checks continue',async()=>{
 const file=new File([Buffer.from(images.png,'base64')],'test.png',{type:'image/png'}),report=await analyzePhoto(file,{cryptoImpl:null});
 assert.equal(report.findings.find(f=>f.id==='PHOTO_HASH').status,'unknown');
 assert.equal(report.findings.find(f=>f.id==='PHOTO_FILE').status,'observed');
 assert.equal(report.findings.find(f=>f.id==='PHOTO_EXIF').status,'observed');
 assert.match(report.findings.find(f=>f.id==='PHOTO_HASH').summary,/HTTPS/);
});
test('export hides identifiers by default and never includes image contents or raw request',async()=>{
 const report=analyzePhone('+1 202 555 0142'),safe=exportReport(report),full=exportReport(report,{includeIdentifiers:true});
 assert.ok(!JSON.stringify(safe).includes('+12025550142'));assert.ok(JSON.stringify(full).includes('+12025550142'));
 assert.ok(!('input' in safe));assert.equal(safe.identifiersIncluded,false);assert.notEqual(safe,report);
});


import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createApiHandler} from '../server/api.mjs';
async function withApi(options,fn){const api=createApiHandler(options),server=createServer(async(req,res)=>{if(!await api(req,res)){res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;try{await fn(base);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
function post(base,body,headers={}){return fetch(base+'/api/v2/analyze',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});}
test('HTTP API rejects unknown origin before any upstream work',async()=>withApi({},async base=>{const r=await post(base,{type:'email',domain:'example.org'},{Origin:'https://untrusted.invalid'});assert.equal(r.status,403);}));
test('HTTP API accepts a configured origin and returns phone scope honestly',async()=>withApi({allowedOrigins:['https://systemh4rd.github.io']},async base=>{const r=await post(base,{type:'phone',value:'+1 202 555 0142'},{Origin:'https://systemh4rd.github.io'});assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'https://systemh4rd.github.io');const data=await r.json();assert.equal(data.mode,'live');assert.equal(data.findings.at(-1).scope.owner,null);}));
test('HTTP API has a per-client rate limit',async()=>withApi({maxRequests:1},async base=>{assert.equal((await post(base,{type:'phone',value:'+1 202 555 0142'})).status,200);const r=await post(base,{type:'phone',value:'+1 202 555 0142'});assert.equal(r.status,429);assert.ok(Number(r.headers.get('retry-after'))>=1);}));
test('HTTP API rejects oversized body and non-JSON',async()=>withApi({maxBody:100},async base=>{assert.equal((await post(base,{type:'phone',value:'x'.repeat(200)})).status,413);const r=await fetch(base+'/api/v2/analyze',{method:'POST',body:'text'});assert.equal(r.status,415);}));
test('HTTP API validates domains rather than fetching arbitrary user URLs',async()=>{let called=0;await withApi({fetchImpl:async()=>{called++;throw new Error('must not fetch');}},async base=>{const r=await post(base,{type:'email',domain:'http://169.254.169.254/latest'});assert.equal(r.status,400);assert.equal(called,0);});});
test('HTTP API returns actual adapter records using the same report contract',async()=>{
 const types={A:1,AAAA:28,MX:15,TXT:16};
 const fetchImpl=async url=>{const u=new URL(url),type=types[u.searchParams.get('type')],name=u.searchParams.get('name');return new Response(JSON.stringify({Status:0,AD:true,Question:[{name:name+'.',type}],Answer:type===15?[{name:name+'.',type,TTL:10,data:'0 .'}]:[]}));};
 await withApi({fetchImpl},async base=>{const r=await post(base,{type:'email',domain:'example.org'});assert.equal(r.status,200);const d=await r.json();assert.equal(d.schemaVersion,'2.0');assert.equal(d.transport,'http-api');assert.match(d.findings[0].summary,/Null MX/);});
});


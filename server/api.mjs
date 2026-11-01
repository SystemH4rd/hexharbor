import {analyzeEmailDomain} from '../docs/v2/lib/email.js';
import {analyzePhone} from '../docs/v2/lib/phone.js';
import {normalizeDomain} from '../docs/v2/lib/model.js';
import {createDnsCache} from '../docs/v2/lib/dns.js';
function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));}
function bad(message,status=400){const e=new Error(message);e.status=status;return e;}
function bodyJson(req,limit){
 return new Promise((resolve,reject)=>{
  let size=0,chunks=[],settled=false;
  req.on('data',chunk=>{if(settled)return;size+=chunk.length;if(size>limit){settled=true;chunks=[];reject(bad('Завеликий запит.',413));return;}chunks.push(chunk);});
  req.on('end',()=>{if(settled)return;settled=true;try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(bad('Некоректний JSON.'));}});
  req.on('error',()=>{if(!settled){settled=true;reject(bad('Не вдалося прочитати запит.'));}});
 });
}
export function createApiHandler({fetchImpl=fetch,allowedOrigins=['https://systemh4rd.github.io','http://localhost:4173','http://127.0.0.1:4173','http://terminal.local:4173'],maxRequests=20,windowMs=60000,maxBody=4096,now=()=>Date.now()}={}){
 const origins=new Set(allowedOrigins),buckets=new Map(),cache=createDnsCache({now});
 return async function handler(req,res){
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith('/api/v2/'))return false;
  const origin=req.headers.origin,headers={};
  if(origin&&!origins.has(origin)){json(res,403,{error:'ORIGIN_NOT_ALLOWED',message:'Origin не дозволений.'});return true;}
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';}
  if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'300'});res.end();return true;}
  if(path==='/api/v2/health'&&req.method==='GET'){json(res,200,{version:'2.0.0',status:'ready',capabilities:['email-domain-dns','phone-numbering-plan'],photo:'browser-local-only',persistentHistory:false},headers);return true;}
  if(path!=='/api/v2/analyze'){json(res,404,{error:'NOT_FOUND'},headers);return true;}
  if(req.method!=='POST'){json(res,405,{error:'METHOD_NOT_ALLOWED'},{...headers,Allow:'POST'});return true;}
  const time=now(),key=req.socket.remoteAddress||'unknown';
  for(const [ip,b]of buckets)if(b.reset<=time)buckets.delete(ip);
  let bucket=buckets.get(key);if(!bucket){if(buckets.size>=256)buckets.delete(buckets.keys().next().value);bucket={count:0,reset:time+windowMs};buckets.set(key,bucket);}
  if(++bucket.count>maxRequests){json(res,429,{error:'RATE_LIMITED',message:'Ліміт перевірок. Спробуйте пізніше.'},{...headers,'Retry-After':String(Math.max(1,Math.ceil((bucket.reset-time)/1000)))});return true;}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(res,415,{error:'JSON_REQUIRED'},headers);return true;}
  if(Number(req.headers['content-length'])>maxBody){req.resume();json(res,413,{error:'BODY_TOO_LARGE'},headers);return true;}
  const controller=new AbortController();
  req.once('aborted',()=>controller.abort());res.once('close',()=>{if(!res.writableEnded)controller.abort();});
  try{
   const input=await bodyJson(req,maxBody);
   if(!input||Array.isArray(input)||typeof input!=='object')throw bad('Потрібен об’єкт запиту.');
   let report;
   if(input.type==='email'){
    const domain=normalizeDomain(input.domain);
    report=await analyzeEmailDomain(domain,{signal:controller.signal,query:(name,type,options)=>cache.query(name,type,{...options,fetchImpl})});
    report.transport='http-api';
   }else if(input.type==='phone')report=analyzePhone(input.value);
   else throw bad('Підтримуються email (лише domain) та phone. Фото обробляється локально.');
   if(!res.writableEnded&&!res.destroyed)json(res,report.status==='error'?502:200,report,headers);
  }catch(error){
   if(controller.signal.aborted||res.destroyed)return true;
   json(res,error.status||400,{error:'INVALID_REQUEST',message:error.status===413?'Завеликий запит.':error.message||'Некоректний запит.'},headers);
  }
  return true;
 };
}


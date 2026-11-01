const PROVIDERS=[
 {id:'google',label:'Google Public DNS',endpoint:'https://dns.google/resolve'},
 {id:'cloudflare',label:'Cloudflare DNS',endpoint:'https://cloudflare-dns.com/dns-query'}
];
export const DNS_TYPES={A:1,AAAA:28,MX:15,TXT:16};
function canonical(s){return String(s).toLowerCase().replace(/\.$/,'');}
function abortError(){return new DOMException('Перевірку скасовано.','AbortError');}
export async function queryDns(name,type,{fetchImpl=fetch,signal,timeoutMs=6000,providers=PROVIDERS}={}){
 if(!Object.hasOwn(DNS_TYPES,type)||!/^[_a-z0-9.-]{3,253}$/i.test(name))throw new Error('Invalid DNS query');
 if(signal?.aborted)throw abortError();
 const failures=[];
 for(const provider of providers){
  const url=new URL(provider.endpoint);url.searchParams.set('name',name);url.searchParams.set('type',type);url.searchParams.set('do','1');
  if(provider.id==='google')url.searchParams.set('edns_client_subnet','0.0.0.0/0');
  const controller=new AbortController(),relay=()=>controller.abort();signal?.addEventListener('abort',relay,{once:true});
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(url.href,{headers:{Accept:'application/dns-json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,redirect:'error'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const text=await response.text();if(text.length>262144)throw new Error('Oversized DNS response');
   const body=JSON.parse(text);
   if(!Number.isInteger(body.Status)||!Array.isArray(body.Question)||!body.Question.some(q=>canonical(q.name)===canonical(name)&&q.type===DNS_TYPES[type]))throw new Error('Unexpected DNS question');
   if(body.TC===true)throw new Error('Truncated DNS response');
   if(![0,3].includes(body.Status))throw new Error('DNS status '+body.Status);
   const records=(body.Answer||[]).filter(r=>r.type===DNS_TYPES[type]).slice(0,100).map(r=>({name:String(r.name).slice(0,253),type:r.type,ttl:Number.isFinite(r.TTL)?Math.max(0,r.TTL):0,data:String(r.data).slice(0,16384)}));
   return {name,type,rcode:body.Status,records,provider:provider.label,providerId:provider.id,sourceUrl:url.href,observedAt:new Date().toISOString(),dnssecValidated:body.AD===true,cache:{hit:false}};
  }catch(error){
   if(signal?.aborted)throw abortError();
   failures.push(provider.label+': '+(error.name==='AbortError'?'тайм-аут':error.message));
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',relay);}
 }
 const error=new Error('DNS-провайдери не відповіли. '+failures.join('; '));error.code='UPSTREAM_UNAVAILABLE';throw error;
}
export function createDnsCache({maxEntries=128,maxTtl=300,now=()=>Date.now()}={}){
 const entries=new Map();
 return {async query(name,type,options={}){
  const key=name.toLowerCase()+'|'+type,cached=entries.get(key),time=now();
  if(cached&&cached.expires>time)return {...structuredClone(cached.value),cache:{hit:true,ageSeconds:Math.floor((time-cached.stored)/1000)}};
  entries.delete(key);
  const value=await queryDns(name,type,options);
  if(value.rcode===0&&value.records.length){
   const ttl=Math.min(maxTtl,...value.records.map(r=>r.ttl));
   if(ttl>0){for(const [k,v]of entries)if(v.expires<=time)entries.delete(k);if(entries.size>=maxEntries)entries.delete(entries.keys().next().value);entries.set(key,{value:structuredClone(value),stored:time,expires:time+ttl*1000});}
  }
  return value;
 },get size(){return entries.size;}};
}
export function dnsText(value){const text=String(value);const chunks=[...text.matchAll(/"((?:\\.|[^"\\])*)"/g)];return chunks.length?chunks.map(x=>x[1].replace(/\\"/g,'"').replace(/\\\\/g,'\\')).join(''):text;}


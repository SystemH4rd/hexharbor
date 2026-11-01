import {normalizeDomain,finding,makeReport} from './model.js';
import {queryDns,dnsText} from './dns.js';
export async function analyzeEmailDomain(value,{query=queryDns,signal}={}){
 const domain=normalizeDomain(value);
 const specs=[['MX',domain,'MX','Поштова маршрутизація'],['A',domain,'A','Адреси IPv4'],['AAAA',domain,'AAAA','Адреси IPv6'],['SPF',domain,'TXT','Політика SPF'],['DMARC','_dmarc.'+domain,'TXT','Політика DMARC']];
 const responses=await Promise.all(specs.map(async spec=>{try{return {spec,response:await query(spec[1],spec[2],{signal})};}catch(error){if(error.name==='AbortError')throw error;return {spec,error};}}));
 const findings=responses.map(({spec,response:r,error})=>{
  const [id,name,type,title]=spec;
  if(error)return finding(id,title,'error','Джерело недоступне. Відповідь не замінено демонстраційними даними.',{source:'DNS over HTTPS',category:id,fields:[{label:'Стан',value:error.code||'UPSTREAM_UNAVAILABLE'}]});
  let records=r.records;
  if(id==='SPF')records=records.filter(x=>/^v=spf1(?:\s|$)/i.test(dnsText(x.data)));
  if(id==='DMARC')records=records.filter(x=>/^v=DMARC1(?:;|\s|$)/i.test(dnsText(x.data)));
  let text=r.rcode===3?'DNS повернув NXDOMAIN: запитане ім’я не існує.':records.length?'Отримано '+records.length+' записів від DNS-резолвера.':'Потрібні записи не повернуті (NODATA).';
  if(id==='MX'&&records.some(x=>/^0\s+\.$/.test(x.data.trim())))text='Отримано Null MX (0 .): домен заявляє, що не приймає пошту.';
  else if(id==='MX'&&!records.length&&r.rcode===0)text='MX-записи не повернуті. Це саме по собі не доводить, що домен не приймає пошту.';
  if(id==='SPF'&&records.length>1)text='Знайдено кілька SPF-записів. Політика потребує окремої перевірки; оцінка відповідності RFC не виконується.';
  if(id==='DMARC'&&!records.length&&r.rcode===0)text='DMARC на цьому імені не знайдено. Організаційний домен і успадкування політики не перевірялися.';
  const fields=[{label:'Запит',value:name+' / '+type},{label:'DNS status',value:r.rcode===3?'NXDOMAIN':'NOERROR'},{label:'DNSSEC',value:r.dnssecValidated?'Резолвер повернув AD=true':'AD=true не повернуто'}];
  for(const record of records)fields.push({label:'Запис · TTL '+record.ttl+' с',value:(type==='TXT'?dnsText(record.data):record.data)});
  if(r.cache?.hit)fields.push({label:'Кеш API',value:'Вік '+r.cache.ageSeconds+' с; час спостереження збережено'});
  return finding(id,title,'observed',text,{source:r.provider,sourceUrl:r.sourceUrl,observedAt:r.observedAt,category:id,fields});
 });
 findings.push(finding('MAILBOX_SCOPE','Скринька та особа','unknown','Перевірено лише DNS домену. Існування, власник, вміст і скомпрометованість конкретної скриньки не визначені.',{source:'Межі перевірки',category:'Межі',scope:{mailboxExists:null,owner:null,breached:null},fields:[{label:'Передано провайдеру',value:'Лише домен; локальна частина email не надсилається'}]}));
 return makeReport('email',findings,{transport:'dns-over-https',subject:domain,notices:['Записи є відповіддю резолвера на вказаний час, а не доказом існування конкретної скриньки.','SPF і DMARC показані як опубліковані записи; повна перевірка політик і успадкування не виконується.']});
}


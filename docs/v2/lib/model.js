export const VERSION='2.0.0';
export const MAX_FILE_SIZE=10*1024*1024;
export const STATUS_LABELS={observed:'Спостереження',derived:'За правилами',unknown:'Не перевірено',error:'Недоступно'};
export function normalizeDomain(value){
 const input=String(value||'').trim().replace(/\.$/,'');
 if(!input||/[\s/@:#?\\]/u.test(input))throw new Error('Вкажіть домен без адреси сторінки, порту або пробілів.');
 let domain;try{domain=new URL('https://'+input).hostname.toLowerCase();}catch{throw new Error('Некоректний домен.');}
 if(domain.length>253||domain.split('.').length<2||domain.split('.').some(s=>!s||s.length>63||!(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s))))throw new Error('Некоректний домен.');
 if(/^\d+(?:\.\d+){3}$/.test(domain)||/(^|\.)(localhost|local|internal|lan|onion)$/.test(domain))throw new Error('Потрібен публічний DNS-домен.');
 return domain;
}
export function emailDomain(value){
 const text=String(value||'').trim();
 if(text.length>254||!(/^[^\s@]+@[^\s@]+$/.test(text)))throw new Error('Вкажіть email у форматі name@example.org.');
 return normalizeDomain(text.slice(text.lastIndexOf('@')+1));
}
export function validatePhone(value){
 const text=String(value||'').trim();
 if(!/^\+[\d\s().-]+$/.test(text)||!(/^[1-9]\d{6,14}$/.test(text.replace(/\D/g,''))))throw new Error('Укажіть міжнародний номер із + та 7–15 цифрами.');
 return text;
}
export function validateFile(file){
 if(!file)throw new Error('Виберіть JPEG, PNG або WebP.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Підтримуються JPEG, PNG та WebP.');
 if(!file.size||file.size>MAX_FILE_SIZE)throw new Error('Файл має бути непорожнім і не перевищувати 10 МБ.');
}
export function finding(id,title,status,summary,{source,sourceUrl=null,sourceVersion=null,fields=[],category='Перевірка',observedAt=new Date().toISOString(),scope}={}){
 if(!Object.hasOwn(STATUS_LABELS,status))throw new Error('Invalid evidence status');
 return {id,title,status,summary,category,source:source||'Локальна перевірка',sourceUrl,sourceVersion,observedAt,fields,...(scope?{scope}:{})};
}
export function makeReport(inputType,findings,{transport='local',subject=null,notices=[]}={}){
 const errors=findings.filter(x=>x.status==='error').length;
 const useful=findings.filter(x=>x.status==='observed'||x.status==='derived').length;
 return {schemaVersion:'2.0',application:'HexHarbor',version:VERSION,inputType,checkedAt:new Date().toISOString(),mode:'live',status:errors?(useful?'partial':'error'):'complete',transport,subject,findings,notices};
}
export function summary(findings){return {total:findings.length,observed:findings.filter(f=>f.status==='observed').length,derived:findings.filter(f=>f.status==='derived').length,unknown:findings.filter(f=>f.status==='unknown'||f.status==='error').length};}
export function exportReport(report,{includeIdentifiers=false}={}){
 const copy=structuredClone(report);
 copy.exportedAt=new Date().toISOString();copy.identifiersIncluded=includeIdentifiers;
 if(!includeIdentifiers){copy.subject=null;for(const f of copy.findings)f.fields=f.fields.map(field=>field.sensitive?{...field,value:'[приховано]'}:field);}
 return copy;
}


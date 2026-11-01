import {VERSION,STATUS_LABELS,emailDomain,validatePhone,validateFile,summary,exportReport} from './lib/model.js';
import {analyzeEmailDomain} from './lib/email.js';
const $=id=>document.getElementById(id),MODES=['phone','email','photo'],names={phone:'Телефон',email:'Email',photo:'Фото'};
let mode='email',current=null,filter='all',controller=null,photo=null,photoUrl=null,fileGeneration=0,runGeneration=0,worker,workerSequence=0;
const pending=new Map();
function el(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function announce(text){$('status-line').textContent=text;}
const configReady=fetch(new URL('./config.json',import.meta.url),{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>({transport:'browser',apiBase:null}));
function getWorker(){
 if(worker)return worker;
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);task.cleanup();data.error?task.reject(new Error(data.error)):task.resolve(data.report);};
 worker.onerror=()=>{for(const task of pending.values()){task.cleanup();task.reject(new Error('Локальний модуль не запустився. Оновіть сторінку.'));}pending.clear();worker.terminate();worker=null;};
 return worker;
}
async function localAnalysis(type,payload,signal){
 if(typeof Worker==='undefined'){if(type==='phone')return (await import('./lib/phone.js')).analyzePhone(payload.value);return (await import('./lib/photo.js')).analyzePhoto(payload.file,{signal});}
 return new Promise((resolve,reject)=>{
  const id=++workerSequence,w=getWorker(),cancel=()=>{pending.delete(id);w.postMessage({id,cancel:true});reject(new DOMException('Скасовано','AbortError'));};
  pending.set(id,{resolve,reject,cleanup:()=>signal.removeEventListener('abort',cancel)});signal.addEventListener('abort',cancel,{once:true});
  w.postMessage({id,type,...payload});
 });
}
async function emailAnalysis(domain,signal){
 const config=await configReady;
 if(config.transport==='api'&&config.apiBase){
  const base=new URL(config.apiBase.replace(/\/$/, '')+'/',location.href);
  if(base.protocol!=='https:'&&base.origin!==location.origin)throw new Error('API має використовувати HTTPS.');
  const apiController=new AbortController(),relay=()=>apiController.abort();signal.addEventListener('abort',relay,{once:true});const timer=setTimeout(()=>apiController.abort(),9000);
  try{
   const response=await fetch(new URL('analyze',base),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',body:JSON.stringify({type:'email',domain}),signal:apiController.signal});
   const report=await response.json();
   if(response.ok&&report.schemaVersion==='2.0'&&Array.isArray(report.findings))return report;
   if(!config.fallbackToBrowser)throw new Error(report.message||'API тимчасово недоступний.');
  }catch(error){if(signal.aborted)throw new DOMException('Скасовано','AbortError');if(!config.fallbackToBrowser)throw error;}
  finally{clearTimeout(timer);signal.removeEventListener('abort',relay);}
  const report=await analyzeEmailDomain(domain,{signal});report.transport='browser-doh';report.notices.unshift('Серверна перевірка не завершилася. Виконано прямі HTTPS-запити браузера до DNS-провайдерів.');return report;
 }
 const report=await analyzeEmailDomain(domain,{signal});report.transport='browser-doh';return report;
}
function error(message){$('input-error').textContent=message;$('input-error').hidden=!message;for(const type of MODES)$(type+'-input').removeAttribute('aria-invalid');if(message)$(mode+'-input').setAttribute('aria-invalid','true');}
function busy(value){$('run-button').disabled=value;document.querySelector('.results-panel').setAttribute('aria-busy',String(value));}
function graph(findings){
 const ns='http://www.w3.org/2000/svg',nodes=$('graph-nodes'),edges=$('graph-edges');nodes.replaceChildren();edges.replaceChildren();$('graph-empty').hidden=findings.length>0;$('graph-count').textContent=findings.length+' перевірок';
 if(!findings.length)return;
 function svg(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,value);if(text)e.textContent=text;return e;}
 const positions=[[365,57],[377,179],[95,163]];
 findings.slice(0,3).forEach((f,index)=>{const [x,y]=positions[index];edges.append(svg('line',{x1:235,y1:118,x2:x,y2:y,class:'graph-edge'}));const g=svg('g',{class:'graph-node '+f.status});g.append(svg('circle',{cx:x,cy:y,r:22}),svg('text',{x,y:y+4},String(index+1).padStart(2,'0')),svg('text',{x,y:y+39,class:'node-label'},f.category));nodes.append(g);});
 const g=svg('g',{class:'graph-node core'});g.append(svg('circle',{cx:235,cy:118,r:31}),svg('text',{x:235,y:123},mode==='email'?'@':mode==='photo'?'▧':'⌕'),svg('text',{x:235,y:168,class:'node-label'},names[mode]));nodes.append(g);
 if(findings.length>3)$('graph-count').textContent='3 із '+findings.length+' перевірок';
}
function metrics(findings){const count=summary(findings);for(const key of ['total','observed','unknown'])$('metric-'+key).textContent=String(count[key]).padStart(2,'0');}
function empty(title,text,loading=false){
 const box=el('div','empty-state'),icon=el('span',loading?'loading-icon':'state-icon',loading?'◌':'◈');icon.setAttribute('aria-hidden','true');box.append(icon,el('h3','',title),el('p','',text));$('results').replaceChildren(box);
}
function reset(message='Готово. Оберіть тип перевірки.'){
 runGeneration++;controller?.abort();controller=null;current=null;filter='all';busy(false);metrics([]);graph([]);$('result-count').textContent='0';$('result-context').textContent='Очікування запиту';$('export-button').disabled=true;$('notices').replaceChildren();$('notices').hidden=true;
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));
 empty('Факт починається з перевірки','Введіть дані або використайте приклад. Результат буде отриманий із джерела під час запиту.');announce(message);
}
function render(){
 const visible=current.findings.filter(f=>filter==='all'||(filter==='unknown'?['unknown','error'].includes(f.status):f.status===filter));metrics(current.findings);graph(visible);$('result-count').textContent=String(visible.length);$('result-context').textContent=names[mode]+' · '+current.transport;$('export-button').disabled=false;$('transport-label').textContent=current.transport==='browser-doh'?'DNS over HTTPS':current.transport==='http-api'?'HTTP API':'Локальна перевірка';
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
 const fragment=document.createDocumentFragment();
 for(const f of visible){
  const card=el('article','result-card evidence-card'),icon=el('div','card-icon',f.status==='observed'?'✓':f.status==='derived'?'⌘':'◇');icon.setAttribute('aria-hidden','true');
  const body=el('div','card-body'),top=el('div','card-topline');top.append(el('h3','',f.title));body.append(top,el('p','card-summary',f.summary));
  if(f.fields.length){const dl=el('dl','evidence-fields');for(const field of f.fields){const row=el('div','data-field');row.append(el('dt','',field.label),el('dd','',String(field.value)));dl.append(row);}body.append(dl);}
  const meta=el('div','card-meta');
  if(f.sourceUrl&&f.sourceUrl.startsWith('https://')){const link=el('a','',f.source+' ↗');link.href=f.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';meta.append(link);}else meta.append(el('span','',f.source));
  if(f.sourceVersion)meta.append(el('span','','версія '+f.sourceVersion));body.append(meta);
  const status=el('div','card-score');status.append(el('span','verification '+f.status,STATUS_LABELS[f.status]),el('small','','ЧАС ПЕРЕВІРКИ'));const time=el('time','',new Date(f.observedAt).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv'}));time.dateTime=f.observedAt;status.append(time);card.append(icon,body,status);fragment.append(card);
 }
 $('results').replaceChildren(fragment);
 if(!visible.length)empty('Немає записів із цим статусом','Оберіть інший фільтр.');
 $('notices').replaceChildren(...current.notices.map(text=>el('p','',text)));$('notices').hidden=!current.notices.length;
}
async function run(event){
 event?.preventDefault();error('');
 let payload;
 try{if(mode==='phone')payload={value:validatePhone($('phone-input').value)};else if(mode==='email')payload={domain:emailDomain($('email-input').value)};else{validateFile(photo);payload={file:photo};}}
 catch(e){error(e.message);announce(e.message);$(mode+'-input').focus();return;}
 controller?.abort();controller=new AbortController();const signal=controller.signal,generation=++runGeneration,runMode=mode;current=null;filter='all';busy(true);metrics([]);graph([]);$('result-count').textContent='0';$('export-button').disabled=true;$('notices').hidden=true;
 empty(mode==='email'?'Запитуємо DNS-джерела':'Читаємо локальні дані',mode==='email'?'Провайдер отримує лише домен. Помилки і порожні відповіді буде показано як є.':'Номер або файл не надсилається зовнішнім сервісам.',true);announce('Перевірка виконується.');
 try{
  const report=mode==='email'?await emailAnalysis(payload.domain,signal):await localAnalysis(mode,payload,signal);
  if(generation!==runGeneration||mode!==runMode||signal.aborted)return;
  current=report;render();announce(report.status==='error'?'Джерела недоступні. Перегляньте статуси перевірок.':report.status==='partial'?'Перевірку завершено частково; окремі джерела недоступні.':'Перевірку завершено. Показано фактичні результати та межі перевірки.');
 }catch(e){if(signal.aborted)return;empty('Не вдалося завершити перевірку',e.message);announce(e.message);}
 finally{if(generation===runGeneration)busy(false);}
}
function clearPhoto(){fileGeneration++;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;photo=null;$('photo-input').value='';$('preview-image').removeAttribute('src');$('photo-preview').hidden=true;$('upload-zone').hidden=false;}
function displayPhoto(file,url){photo=file;photoUrl=url;$('preview-image').src=url;$('photo-name').textContent=file.name;$('photo-preview').hidden=false;$('upload-zone').hidden=true;}
async function example(){
 error('');
 if(mode==='phone')$('phone-input').value='+1 202 555 0142';
 if(mode==='email')$('email-input').value='example@example.org';
 if(mode==='photo'){
  clearPhoto();const ticket=fileGeneration,canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#0c1720';ctx.fillRect(0,0,640,360);ctx.strokeStyle='#73f4cf';ctx.lineWidth=3;ctx.strokeRect(80,70,480,220);ctx.fillStyle='#73f4cf';ctx.font='24px monospace';ctx.fillText('HEXHARBOR / TEST PNG',140,185);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(ticket!==fileGeneration||mode!=='photo')return;if(!blob){error('Не вдалося створити тестове зображення.');return;}const file=new File([blob],'hexharbor-test.png',{type:'image/png'});displayPhoto(file,URL.createObjectURL(file));
 }
 run();
}
function setMode(next){if(!MODES.includes(next))return;const changed=next!==mode;mode=next;for(const b of document.querySelectorAll('[data-mode]')){const selected=b.dataset.mode===mode;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}for(const type of MODES)$('form-'+type).hidden=type!==mode;
 $('example-button').textContent=mode==='email'?'Перевірити example.org ↗':mode==='phone'?'Перевірити тестовий номер ↗':'Створити тестове PNG ↗';$('scope-label').textContent=mode==='email'?'Email: назовні передається лише домен':mode==='phone'?'Телефон: розбір локально, без зовнішніх запитів':'Фото: локально; без завантаження і розпізнавання облич';error('');if(changed)reset('Обрано режим: '+names[mode]+'.');
}
function menuAccessibility(){const hidden=matchMedia('(max-width:700px)').matches&&!$('sidebar').classList.contains('open');$('sidebar').inert=hidden;$('sidebar').setAttribute('aria-hidden',String(hidden));}
function closeMenu(){const focusBack=matchMedia('(max-width:700px)').matches&&$('sidebar').contains(document.activeElement);$('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');menuAccessibility();if(focusBack)$('menu-toggle').focus();}
function info(kind){
 $('dialog-title').textContent=kind==='sources'?'Реєстр джерел':'Архітектура та приватність';const body=$('dialog-content');body.replaceChildren();
 const paragraphs=kind==='sources'?[
 ['Google Public DNS','https://developers.google.com/speed/public-dns/docs/doh/json','Фактичні DNS-відповіді: MX, A, AAAA, TXT. Передається лише домен; використовується ECS 0.0.0.0/0.'],
 ['Cloudflare DNS','https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/','Резервний DNS-провайдер при помилці запиту. Джерело кожної відповіді відображається в картці.'],
 ['libphonenumber-js · 1.13.7','https://github.com/catamphetamine/libphonenumber-js','Локальні правила міжнародного плану нумерації з повним набором metadata/max. Перевірка не визначає абонента або активність.'],
 ['exifr · 7.1.3','https://github.com/MikeKovarik/exifr','Локальне читання підтримуваних EXIF-тегів JPEG/PNG. EXIF із WebP у цій версії не читається. SHA-256 обчислюється через Web Crypto.']
 ]:[
 ['1 · Інтерфейс і локальний Worker',null,'Телефон і фото обробляються у вашому браузері. Власна історія запитів не зберігається.'],
 ['2 · Спільні аналізатори',null,'Окремі модулі нормалізують вхід, виконують перевірки та повертають однаковий контракт доказів: джерело, час, статус і межі.'],
 ['3 · HTTP API',null,'Окремий Node.js API може виконувати DNS-перевірки. Він має тайм-аути, обмеження розміру та частоти запитів, TTL-кеш і список дозволених origin. Публічна версія GitHub Pages використовує прямий DNS over HTTPS.'],
 ['4 · Приватність експорту',null,'Повні ідентифікатори в JSON приховані за замовчуванням. Увімкніть їх лише коли потрібен повний локальний звіт. Файл зображення до експорту не включається.'],
 ['Межі висновків',null,'DNS не підтверджує власника скриньки. План нумерації не підтверджує активний номер. EXIF і SHA-256 не доводять автентичність фото. Невідоме залишається невідомим.']
 ];
 for(const [title,url,text]of paragraphs){const box=el('div','source-item');box.append(el('strong','',title),el('p','',text));if(url){const a=el('a','','Документація джерела ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}body.append(box);}
 if(!$('info-dialog').open)$('info-dialog').showModal();
}
function route(){closeMenu();const hash=location.hash.slice(1);if(hash==='sources'||hash==='architecture'){info(hash);return;}if($('info-dialog').open)$('info-dialog').close();setMode(MODES.includes(hash)?hash:'email');}
$('check-form').addEventListener('submit',run);$('example-button').addEventListener('click',example);
for(const b of document.querySelectorAll('[data-mode]')){b.addEventListener('click',()=>{location.hash=b.dataset.mode;});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let i=MODES.indexOf(mode);i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:-1)+3)%3;location.hash=MODES[i];document.querySelector('[data-mode="'+MODES[i]+'"]').focus();});}
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{if(!current)return;filter=b.dataset.filter;render();});
for(const type of ['phone','email'])$(type+'-input').addEventListener('input',()=>{error('');reset('Вхід змінено. Запустіть нову перевірку.');});
$('clear-button').addEventListener('click',()=>{for(const type of ['phone','email'])$(type+'-input').value='';clearPhoto();error('');reset('Запит очищено.');});
$('remove-photo').addEventListener('click',()=>{clearPhoto();error('');reset('Файл прибрано.');$('photo-input').focus();});
$('photo-input').addEventListener('change',()=>{
 const file=$('photo-input').files[0];clearPhoto();error('');reset();if(!file)return;
 try{validateFile(file);}catch(e){error(e.message);return;}
 const ticket=++fileGeneration,url=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{if(ticket!==fileGeneration){URL.revokeObjectURL(url);return;}if(image.naturalWidth*image.naturalHeight>40000000){URL.revokeObjectURL(url);error('Зображення перевищує 40 мегапікселів.');return;}displayPhoto(file,url);announce('Файл вибрано. Дані залишаються локально.');};
 image.onerror=()=>{URL.revokeObjectURL(url);if(ticket===fileGeneration)error('Браузер не зміг прочитати це зображення.');};image.src=url;
});
$('export-button').addEventListener('click',()=>{if(!current)return;const data=exportReport(current,{includeIdentifiers:$('include-identifiers').checked}),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='hexharbor-v2-'+mode+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Звіт збережено локально.');});
$('menu-toggle').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu-toggle').setAttribute('aria-expanded',String(open));menuAccessibility();});
document.addEventListener('click',e=>{if(!$('sidebar').contains(e.target)&&!$('menu-toggle').contains(e.target))closeMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});matchMedia('(max-width:700px)').addEventListener('change',menuAccessibility);
$('dialog-close').addEventListener('click',()=>{location.hash=mode;});$('info-dialog').addEventListener('cancel',e=>{e.preventDefault();location.hash=mode;});
document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();$('workspace').focus();});window.addEventListener('hashchange',route);window.addEventListener('beforeunload',()=>{controller?.abort();if(photoUrl)URL.revokeObjectURL(photoUrl);worker?.terminate();});
route();reset();


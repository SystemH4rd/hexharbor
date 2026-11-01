import {MODES,validateInput,filterResults,summarize,makeExport,createRunGate} from './core.js';
const $ = id => document.getElementById(id);
const modeNames = {phone:'Телефон',email:'Email',photo:'Фото'};
const gate = createRunGate();
let mode='phone',filter='all',results=[],lastState='idle',photo=null,photoUrl=null,photoGeneration=0,fixtures=null,registry=null,loadError=false;
const ready=Promise.all([
  fetch(new URL('../data/demo.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('fixtures');return r.json();}),
  fetch(new URL('../data/sources.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('sources');return r.json();})
]).then(([data,sources])=>{fixtures=data;registry=sources;}).catch(()=>{loadError=true;});
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function announce(text){$('status-line').textContent=text;}
function setBusy(busy){document.querySelector('.results-panel').setAttribute('aria-busy',String(busy));$('analyze-button').disabled=busy;}
function setError(message){
  $('input-error').textContent=message;$('input-error').hidden=!message;
  for(const id of ['phone-input','email-input','photo-input']) $(id).removeAttribute('aria-invalid');
  if(message)$(mode+'-input').setAttribute('aria-invalid','true');
}
function metrics(data){const s=summarize(data);for(const k of ['total','verified','unverified'])$('metric-'+k).textContent=String(s[k]).padStart(2,'0');}
function graph(data){
  const svgNS='http://www.w3.org/2000/svg',nodes=$('graph-nodes'),edges=$('graph-edges');nodes.replaceChildren();edges.replaceChildren();
  $('graph-empty').hidden=data.length>0;$('graph-count').textContent=data.length+' '+(data.length===1?'связь':data.length>1&&data.length<5?'связи':'связей');
  if(!data.length)return;
  function svg(tag,attrs,text){const e=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
  const points=[[365,57],[377,179],[95,163]];
  data.forEach((row,index)=>{const [x,y]=points[index%points.length];edges.append(svg('line',{x1:235,y1:118,x2:x,y2:y,class:'graph-edge'}));const g=svg('g',{class:'graph-node'});g.append(svg('circle',{cx:x,cy:y,r:22}),svg('text',{x,y:y+4},String(index+1).padStart(2,'0')),svg('text',{x,y:y+39,class:'node-label'},row.category));nodes.append(g);});
  const center=svg('g',{class:'graph-node core'});center.append(svg('circle',{cx:235,cy:118,r:31}),svg('text',{x:235,y:123},mode==='email'?'@':mode==='photo'?'▧':'⌕'),svg('text',{x:235,y:168,class:'node-label'},'Тестовый запрос'));nodes.append(center);
}
function statePanel(kind,title,description,retry=false){
 const box=el('div','empty-state'),icon=el('span',kind==='loading'?'loading-icon':'',kind==='error'?'!':kind==='loading'?'◌':kind==='empty'?'◇':'⌕');icon.setAttribute('aria-hidden','true');
 box.append(icon,el('h3','',title),el('p','',description));
 if(retry){const b=el('button','text-button','Повторить демозапрос ↗');b.type='button';b.addEventListener('click',run);box.append(b);}
 $('results').replaceChildren(box);
}
function resetResults(message='Готово к работе. Используются только демонстрационные данные.'){
 gate.cancel();results=[];filter='all';lastState='idle';setBusy(false);metrics([]);graph([]);$('result-count').textContent='0';$('result-context').textContent='Ожидание запроса';$('export-button').disabled=true;
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));
 statePanel('idle','Каждое исследование начинается с запроса','Выберите тип данных или откройте готовый пример.');
 const b=el('button','text-button','Открыть демопример ↗');b.type='button';b.addEventListener('click',example);$('results').firstElementChild.append(b);announce(message);
}
function renderResults(){
 const visible=filterResults(results,filter);$('result-count').textContent=String(visible.length);$('result-context').textContent=modeNames[mode]+' · демонстрационные данные';$('export-button').disabled=results.length===0;metrics(results);graph(visible);
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
 if(!visible.length){statePanel('empty',results.length?'Нет записей с этим статусом':'Совпадений не найдено',results.length?'Выберите другой фильтр, чтобы увидеть остальные примеры.':'Это пустой демонстрационный ответ. Измените сценарий или откройте пример.');return;}
 const fragment=document.createDocumentFragment();
 for(const row of visible){
  const card=el('article','result-card'),icon=el('div','card-icon',mode==='email'?'@':mode==='photo'?'▧':'⌕');icon.setAttribute('aria-hidden','true');
  const body=el('div','card-body'),top=el('div','card-topline');top.append(el('h3','',row.source),el('span','demo-tag','ДЕМО'));
  const meta=el('div','card-meta'),link=el('a','','Источник-пример ↗');link.href=row.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
  const date=el('time','',new Date(row.observedAt).toLocaleDateString('ru-RU',{timeZone:'Europe/Kyiv'}));date.dateTime=row.observedAt;meta.append(link,date,el('span','',row.category));
  const details=el('details'),summary=el('summary','','О происхождении результата');details.append(summary,el('p','',row.detail));
  body.append(top,el('p','card-summary',row.summary),meta,details);
  const score=el('div','card-score'),status=el('span','verification '+(row.verificationStatus==='unverified'?'unverified':''),row.verificationStatus==='verified'?'✓ В примере подтверждено':'◇ Требует проверки');
  const bar=el('div','score-bar'),fill=el('i');fill.style.width=row.confidence+'%';bar.append(fill);bar.setAttribute('aria-hidden','true');
  score.append(status,el('small','','ОЦЕНКА В ПРИМЕРЕ'),el('strong','',row.confidence+'%'),bar);card.append(icon,body,score);fragment.append(card);
 }
 $('results').replaceChildren(fragment);
}
async function run(event){
 event?.preventDefault();
 const value=mode==='photo'?'':$(mode+'-input').value;
 const error=validateInput(mode,value,photo);setError(error);
 if(error){$(mode+'-input').focus();announce(error);return;}
 const ticket=gate.next(),runMode=mode,scenario=$('scenario').value;
 results=[];filter='all';lastState='loading';setBusy(true);metrics([]);graph([]);$('result-count').textContent='0';$('export-button').disabled=true;
 statePanel('loading','Сопоставляем демонстрационные связи','Используется локальный тестовый набор. Реальный поиск не выполняется.');announce('Демонстрационный анализ выполняется.');
 await ready;await new Promise(resolve=>setTimeout(resolve,650));
 if(!gate.isCurrent(ticket)||mode!==runMode)return;
 setBusy(false);
 if(loadError||scenario==='error'){lastState='error';statePanel('error','Демонстрационный источник недоступен',loadError?'Не удалось загрузить тестовый набор. Обновите страницу или повторите позже.':'Выбран сценарий ошибки. Переключите сценарий на «Результаты найдены» и повторите запрос.',true);$('result-context').textContent='Демонстрационная ошибка';announce('Демонстрационная ошибка. Запрос можно повторить.');return;}
 lastState='success';results=scenario==='empty'?[]:fixtures[mode];renderResults();announce(scenario==='empty'?'Демоанализ завершён: совпадений нет.':'Демоанализ завершён. Показаны '+results.length+' синтетических результата.');
}
function clearPhoto(){
 photoGeneration++;if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}photo=null;$('photo-input').value='';$('preview-image').removeAttribute('src');$('photo-preview').hidden=true;$('upload-zone').hidden=false;
}
function showPhoto(src,name){
 $('preview-image').src=src;$('photo-name').textContent=name;$('photo-preview').hidden=false;$('upload-zone').hidden=true;
}
function example(){
 setError('');$('scenario').value='success';
 if(mode==='phone')$('phone-input').value='+1 202 555 0142';
 if(mode==='email')$('email-input').value='example@example.org';
 if(mode==='photo'){clearPhoto();photo={demo:true};showPhoto(new URL('./sample.svg',import.meta.url).href,'hexharbor-demo.svg');}
 run();
}
function setMode(next){
 if(!MODES.includes(next))return;
 const changed=next!==mode;mode=next;
 for(const b of document.querySelectorAll('[data-mode]')){const selected=b.dataset.mode===mode;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
 for(const m of MODES)$('form-'+m).hidden=m!==mode;
 setError('');if(changed)resetResults('Выбран режим «'+modeNames[mode]+'».');
}
function updateMenuAccessibility(){const hidden=window.matchMedia('(max-width:700px)').matches&&!$('sidebar').classList.contains('open');$('sidebar').inert=hidden;$('sidebar').setAttribute('aria-hidden',String(hidden));}
function closeMenu(){const returnFocus=window.matchMedia('(max-width:700px)').matches&&$('sidebar').contains(document.activeElement);$('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');updateMenuAccessibility();if(returnFocus)$('menu-toggle').focus();}
async function showInfo(kind){
 const dialog=$('info-dialog');$('dialog-content').replaceChildren();$('dialog-title').textContent=kind==='sources'?'Источники и происхождение':'Понимать данные. Беречь приватность.';
 if(kind==='sources'){
  $('dialog-content').append(el('p','','В этой версии используются только синтетические наборы. Ссылки ведут на зарезервированные домены-примеры.'));
  await ready;
  for(const row of registry?.sources||[]){const box=el('div','source-item'),link=el('a','',row.url);link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';box.append(el('strong','',row.name),el('small','',row.access),el('p','',row.restrictions),link);$('dialog-content').append(box);}
 }else{
  for(const text of [
   'HexHarbor — демонстрационное рабочее пространство для анализа телефона, email и фото. Все карточки, связи и оценки вымышлены и не зависят от введенного значения.',
   'Запросы и выбранные изображения не передаются внешним сервисам и не сохраняются в истории. Фото используется только для локального предпросмотра. При обновлении страницы ввод исчезает.',
   '«Подтверждено» означает подтверждение внутри учебного набора. Оценка в процентах иллюстрирует интерфейс и не является вероятностью истинности.',
   'Экспорт содержит только синтетические записи, без введенного номера, адреса или изображения. Реальный поиск, распознавание лиц и мониторинг в этой версии не выполняются.'
  ])$('dialog-content').append(el('p','',text));
 }
 if(location.hash==='#'+kind&&!dialog.open)dialog.showModal();
}
function route(){
 const value=location.hash.slice(1);
 closeMenu();
 if(value==='sources'||value==='about'){showInfo(value);return;}
 if($('info-dialog').open)$('info-dialog').close();
 setMode(MODES.includes(value)?value:'phone');
}
$('analysis-form').addEventListener('submit',run);
for(const b of document.querySelectorAll('[data-mode]')){
 b.addEventListener('click',()=>{if(location.hash==='#'+b.dataset.mode)setMode(b.dataset.mode);else location.hash=b.dataset.mode;});
 b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let index=MODES.indexOf(mode);index=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:-1)+3)%3;location.hash=MODES[index];document.querySelector('[data-mode="'+MODES[index]+'"]').focus();});
}
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{if(lastState!=='success')return;filter=b.dataset.filter;renderResults();announce('Фильтр результатов обновлён.');});
$('example-button').addEventListener('click',example);
$('empty-example').addEventListener('click',example);
$('clear-button').addEventListener('click',()=>{for(const m of ['phone','email'])$(m+'-input').value='';clearPhoto();setError('');$('scenario').value='success';resetResults('Запрос очищен.');$(mode+'-input').focus();});
for(const id of ['phone-input','email-input'])$(id).addEventListener('input',()=>{setError('');resetResults('Запрос изменён. Можно запустить новый демоанализ.');});
$('scenario').addEventListener('change',()=>resetResults('Сценарий демо изменён.'));
$('remove-photo').addEventListener('click',()=>{clearPhoto();setError('');resetResults('Изображение убрано.');$('photo-input').focus();});
$('photo-input').addEventListener('change',()=>{
 const file=$('photo-input').files[0];clearPhoto();setError('');resetResults();
 if(!file)return;
 const error=validateInput('photo','',file);if(error){setError(error);announce(error);return;}
 const ticket=++photoGeneration,url=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{if(ticket!==photoGeneration){URL.revokeObjectURL(url);return;}photo=file;photoUrl=url;showPhoto(url,file.name);announce('Изображение выбрано. Файл остаётся в браузере.');};
 image.onerror=()=>{URL.revokeObjectURL(url);if(ticket===photoGeneration){setError('Не удалось прочитать изображение. Выберите другой файл.');announce('Не удалось прочитать изображение.');}};
 image.src=url;
});
$('export-button').addEventListener('click',()=>{
 if(!results.length)return;
 const blob=new Blob([JSON.stringify(makeExport(mode,results),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');
 a.href=url;a.download='hexharbor-demo-'+mode+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Экспортированы только демонстрационные результаты.');
});
$('menu-toggle').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu-toggle').setAttribute('aria-expanded',String(open));updateMenuAccessibility();});
document.addEventListener('click',event=>{if(!$('sidebar').contains(event.target)&&!$('menu-toggle').contains(event.target))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
$('dialog-close').addEventListener('click',()=>{location.hash=mode;});
$('info-dialog').addEventListener('cancel',event=>{event.preventDefault();location.hash=mode;});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();$('workspace').focus();});
window.matchMedia('(max-width:700px)').addEventListener('change',updateMenuAccessibility);
window.addEventListener('hashchange',route);
window.addEventListener('beforeunload',()=>{if(photoUrl)URL.revokeObjectURL(photoUrl);});
route();


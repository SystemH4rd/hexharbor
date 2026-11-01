import exifr from '../vendor/exifr.js';
import {validateFile,finding,makeReport} from './model.js';
const ascii=(b,start,length)=>String.fromCharCode(...b.slice(start,start+length));
export function imageHeader(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 let width,height,mime;
 if(b.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n)&&ascii(b,12,4)==='IHDR'){mime='image/png';width=v.getUint32(16);height=v.getUint32(20);}
 else if(b.length>=4&&b[0]===255&&b[1]===216){
  mime='image/jpeg';let p=2,segments=0;
  while(p+4<b.length&&segments++<512){if(b[p++]!==255)break;while(b[p]===255)p++;const marker=b[p++];if(marker===217||marker===218)break;if(marker===0||marker===216||(marker>=208&&marker<=215))continue;if(p+2>b.length)break;const len=v.getUint16(p);if(len<2||p+len>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&len>=7){height=v.getUint16(p+3);width=v.getUint16(p+5);break;}p+=len;}
 }else if(b.length>=30&&ascii(b,0,4)==='RIFF'&&ascii(b,8,4)==='WEBP'){
  mime='image/webp';const kind=ascii(b,12,4);
  if(kind==='VP8X'){width=1+b[24]+(b[25]<<8)+(b[26]<<16);height=1+b[27]+(b[28]<<8)+(b[29]<<16);}
  else if(kind==='VP8L'&&b[20]===47){const bits=v.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
  else if(kind==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}
 }
 if(!mime||!width||!height)throw new Error('Не вдалося прочитати підтримуваний заголовок зображення.');
 if(width*height>40000000)throw new Error('Зображення перевищує ліміт 40 мегапікселів.');
 return {mime,width,height};
}
export async function analyzePhoto(file,{signal,cryptoImpl=globalThis.crypto}={}){
 validateFile(file);const bytes=await file.arrayBuffer();if(signal?.aborted)throw new DOMException('Скасовано','AbortError');
 const head=imageHeader(bytes);if(head.mime!==file.type)throw new Error('Тип файлу не збігається з його заголовком.');
 let sha256=null,hashError=null;
 if(cryptoImpl?.subtle){try{const digest=await cryptoImpl.subtle.digest('SHA-256',bytes);sha256=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}catch{hashError='Браузер не зміг обчислити SHA-256 цього файлу.';}}
 else hashError='SHA-256 потребує Web Crypto: відкрийте сайт через HTTPS або localhost.';
 let metadata,metadataError=null;
 if(head.mime==='image/webp')metadataError='У цій версії EXIF із WebP не читається.';
 else try{metadata=await exifr.parse(bytes,{pick:['Make','Model','Software','Orientation','DateTimeOriginal','CreateDate','ISO','FNumber','ExposureTime','GPSLatitude','GPSLongitude'],xmp:false,icc:false,iptc:false});}catch{metadataError='Парсер не зміг прочитати EXIF цього файлу.';}
 if(signal?.aborted)throw new DOMException('Скасовано','AbortError');
 const source={source:'Локальний файл · заголовок і Web Crypto',sourceUrl:null};
 const fields=[{label:'Файл',value:file.name||'Зображення',sensitive:true},{label:'Розмір',value:file.size+' байт'},{label:'MIME за заголовком',value:head.mime},{label:'Розміри заголовка',value:head.width+' × '+head.height+' px'}];
 const findings=[finding('PHOTO_FILE','Властивості файлу','observed','Виміряно байти вибраного файлу. Зображення нікуди не завантажувалося.',{...source,category:'Файл',fields})];
 findings.push(finding('PHOTO_HASH','Цифровий відбиток SHA-256',hashError?'unknown':'observed',hashError||'Обчислено SHA-256 усіх байтів вибраного файлу. Збіг відбитків означає збіг байтів, а не доказ автентичності.',{...source,category:'SHA-256',fields:sha256?[{label:'SHA-256',value:sha256,sensitive:true}]:[]}));
 const keys=[['Make','Виробник'],['Model','Модель'],['Software','Програма'],['Orientation','Орієнтація'],['DateTimeOriginal','Дата з EXIF'],['CreateDate','Дата створення з EXIF'],['ISO','ISO'],['FNumber','Діафрагма'],['ExposureTime','Експозиція']];
 const exifFields=keys.filter(([key])=>metadata?.[key]!==undefined).map(([key,label])=>({label,value:metadata[key] instanceof Date?metadata[key].toISOString():String(metadata[key]),sensitive:['DateTimeOriginal','CreateDate'].includes(key)}));
 const gpsPresent=metadata&&(metadata.GPSLatitude!==undefined||metadata.GPSLongitude!==undefined||metadata.latitude!==undefined||metadata.longitude!==undefined);
 if(!metadataError)exifFields.push({label:'GPS-теги',value:gpsPresent?'Присутні; координати не виводяться':'У прочитаних EXIF-тегах не знайдені'});
 findings.push(finding('PHOTO_EXIF','Метадані EXIF',metadataError?'unknown':'observed',metadataError||'Прочитані вбудовані теги. Їх можна змінити; вони не доводять автентичність або час зйомки.',{source:'exifr · локальне читання',sourceUrl:'https://github.com/MikeKovarik/exifr',sourceVersion:'7.1.3',category:'EXIF',fields:exifFields}));
 findings.push(finding('PHOTO_SCOPE','Походження та особа','unknown','Глобальні збіги, автор, місце зйомки та особи на фото не визначалися. SHA-256 ідентифікує байти, а не підтверджує правдивість зображення.',{source:'Межі перевірки',category:'Межі',scope:{identity:null,origin:null,authenticity:null}}));
 return makeReport('photo',findings,{transport:'local-file',subject:null,notices:['Увесь файл оброблено в браузері. EXIF не є незалежним доказом і може бути змінено.','Координати GPS і серійні номери камери не відображаються.']});
}


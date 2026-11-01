import {analyzePhone} from './lib/phone.js';
import {analyzePhoto} from './lib/photo.js';
const tasks=new Map();
self.addEventListener('message',async({data})=>{
 if(data.cancel){tasks.get(data.id)?.abort();return;}
 const controller=new AbortController();tasks.set(data.id,controller);
 try{const report=data.type==='phone'?analyzePhone(data.value):data.type==='photo'?await analyzePhoto(data.file,{signal:controller.signal}):null;if(!report)throw new Error('Непідтримуваний тип перевірки.');if(!controller.signal.aborted)self.postMessage({id:data.id,report});}
 catch(error){if(!controller.signal.aborted)self.postMessage({id:data.id,error:error.message});}
 finally{tasks.delete(data.id);}
});


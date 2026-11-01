import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createApiHandler} from './api.mjs';
const root=resolve(import.meta.dirname,'../docs'),port=Number(process.env.PORT||4173),host=process.env.HOST||'0.0.0.0';
const configured=process.env.HEX_ALLOWED_ORIGINS?.split(',').map(x=>x.trim()).filter(Boolean);
const api=createApiHandler(configured?{allowedOrigins:configured}:{});
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');let path=decodeURIComponent(url.pathname);
  if(path.startsWith('/hexharbor/'))path=path.slice('/hexharbor'.length);
  if(path.includes('\0')){res.writeHead(400);res.end();return;}
  req.url=path+url.search;
  if(await api(req,res))return;
  if(path==='/'){res.writeHead(302,{Location:'/v2/'});res.end();return;}
  if(path==='/v2/config.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({version:'2.0.0',transport:'api',apiBase:'/api/v2',fallbackToBrowser:true}));return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  if(!(await stat(file)).isFile())throw new Error('not file');
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch{if(!res.headersSent){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}else res.end();}
});
server.listen(port,host,()=>console.log('HexHarbor API and preview listening on http://'+host+':'+port));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));


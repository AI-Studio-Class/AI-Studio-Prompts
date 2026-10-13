import http from 'node:http';
import { readFile, writeFile, mkdir, rename, realpath, lstat } from 'node:fs/promises';
import { dirname, join, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { stages, freshState, queue, answer, back, question, summary, logoConcept, conceptSVG, reportHTML, check } from './core.mjs';

const ui=resolve(dirname(fileURLToPath(import.meta.url)),'../ui');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const atomic=async(path,value)=>{const tmp=path+'.tmp';await writeFile(tmp,value,{mode:0o600});await rename(tmp,path);};
export async function startServer(session) {
  session=await realpath(session);
  const stateFile=join(session,'state.json');
  let state;try{state=JSON.parse(await readFile(stateFile,'utf8'));check(state.version===1&&state.id&&Number.isInteger(state.step)&&state.step>=0&&state.step<stages.length,'不支持的探索存档');}catch(e){if(e.code!=='ENOENT')throw e;state=freshState();}
  const token=randomBytes(32).toString('hex');let origin;
  const persist=()=>atomic(stateFile,JSON.stringify(state,null,2)+'\n');
  const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
  const auth=req=>{const value=(req.headers.authorization||'').replace(/^Bearer /,'');return /^[a-f0-9]{64}$/.test(value)&&timingSafeEqual(Buffer.from(value),Buffer.from(token));};
  async function body(req){check(req.headers['content-type']==='application/json','需要 application/json');let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;check(size<=65536,'请求过大');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
  async function logoFiles(result, requestId) {
    check(Array.isArray(result.logos)&&result.logos.length===3,'需要三个 Logo 方案');
    return Promise.all(result.logos.map(async(raw,i)=>{
      const concept=logoConcept(raw);let data,type,extension;
      if(raw.file){
        check(typeof raw.file==='string'&&!raw.file.includes('\\')&&!raw.file.split('/').includes('..')&&raw.file.startsWith('artifacts/'),'图片只允许读取本次 session/artifacts 内文件');
        const path=await realpath(join(session,raw.file)), rel=relative(join(session,'artifacts'),path);
        check(rel&&!rel.startsWith('..'),'图片路径越界');
        check((await lstat(path)).isFile(),'图片必须为文件');data=await readFile(path);check(data.length<=8*1024*1024,'图片不能超过 8 MB');
        if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){type='image/png';extension='png';}
        else if(data[0]===255&&data[1]===216&&data[2]===255){type='image/jpeg';extension='jpg';}
        else if(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'){type='image/webp';extension='webp';}
        else throw Error('只接受 PNG、JPEG、WebP 图片；矢量概念请使用结构化参数');
      }else{data=Buffer.from(conceptSVG(concept));type='image/svg+xml';extension='svg';}
      const file=`assets/${requestId}-${i}.${extension}`;
      await writeFile(join(session,file),data,{mode:0o600});
      return {...concept,file,type,source:raw.file?'Agent 提供的图片':'Agent 设计的矢量概念稿'};
    }));
  }
  async function handle(req,res){
    res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');res.setHeader('cross-origin-resource-policy','same-origin');
    if(req.headers.host!==new URL(origin).host || (req.headers.origin&&req.headers.origin!==origin))return json(res,403,{error:'只接受本机同源请求'});
    const url=new URL(req.url,origin),route=url.pathname;
    if(route.startsWith('/api/')||route.startsWith('/agent/')){
      if(!auth(req))return json(res,401,{error:'会话授权失效，请使用启动脚本返回的完整地址'});
      if(req.method==='GET'&&route==='/api/state')return json(res,200,{...state,stages});
      if(req.method==='GET'&&route==='/agent/next')return json(res,200,{complete:state.complete,pending:state.pending,session});
      if(req.method==='GET'&&route==='/api/report'){
        const logo=state.selectedLogo===null?'':state.logos[state.selectedLogo];
        const data=logo?'data:'+logo.type+';base64,'+(await readFile(join(session,logo.file))).toString('base64'):'';
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-disposition':'attachment; filename="startup-report.html"'});return res.end(reportHTML(state,data));
      }
      if(req.method==='GET'&&route==='/api/logo'){
        const logo=state.logos[Number(url.searchParams.get('index'))];check(logo,'Logo 不存在');
        res.writeHead(200,{'content-type':logo.type,'cache-control':'no-store'});return res.end(await readFile(join(session,logo.file)));
      }
      if(req.method!=='POST')return json(res,404,{error:'接口不存在'});
      const input=await body(req);
      if(route==='/agent/respond'){
        const request=state.pending;check(request&&request.id===input.id&&request.revision===input.revision,'请求已过期，先重新读取当前请求');
        if(request.kind==='question'){
          const value=question(input.result);
          if(['name','slogan'].includes(request.stage))check(value.options.length===3,'名字与口号需要三个建议');
          state.questions[request.stage]=value;
        }
        else if(request.kind==='summary')state.summary=summary(input.result);
        else state.logos=await logoFiles(input.result,request.id);
        state.pending=null;state.revision++;
      }else if(route==='/api/answer')answer(state,input);
      else if(route==='/api/back')back(state,input.revision);
      else if(route==='/api/retry') {check(input.revision===state.revision,'页面已更新');queue(state);}
      else if(route==='/api/regenerate-logos'){
        check(state.step===11&&!state.pending&&input.revision===state.revision,'请先等待或刷新');state.logos=[];state.selectedLogo=null;state.revision++;queue(state);
        state.pending.wishes=typeof input.wishes==='string'?input.wishes.slice(0,180):'';
      }else if(route==='/api/finish'){
        check(input.revision===state.revision&&state.step===13&&state.summary&&!state.pending,'汇报未就绪或页面已更新');
        if(!state.complete){
          const folder=`exports/revision-${state.revision}`;await mkdir(join(session,folder),{recursive:true,mode:0o700});
          const logo=state.logos[state.selectedLogo];const data=await readFile(join(session,logo.file));
          await atomic(join(session,folder,'report.html'),reportHTML(state,`data:${logo.type};base64,${data.toString('base64')}`));
          await atomic(join(session,folder,'journey.json'),JSON.stringify({answers:state.answers,summary:state.summary,logo:logo.label},null,2));
          await writeFile(join(session,folder,'logo'+extname(logo.file)),data,{mode:0o600});
          state.complete=true;state.exports.push(folder);state.revision++;
        }
      }else if(route==='/agent/stop'){
        await persist();json(res,200,{stopped:true});server.close();server.closeIdleConnections?.();return;
      }else return json(res,404,{error:'接口不存在'});
      await persist();return json(res,200,{...state,stages});
    }
    if(req.method!=='GET')return json(res,405,{error:'不支持此操作'});
    // Only bundled UI files are served, never the project, session or Skill sources.
    const name=route==='/'?'index.html':decodeURIComponent(route.slice(1));
    if(!/^(?:index\.html|app\.js|style\.css|map(?:-scenes)?\.js|assets\/ai-studio-mark\.svg|assets\/scenes\/atlas-[1-5]\.png)$/.test(name))return json(res,404,{error:'文件不存在'});
    const path=join(ui,name);
    res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-cache'});res.end(await readFile(path));
  }
  // Serialize all mutations (including async file IO), so stale answers cannot race.
  let chain=Promise.resolve();
  const server=http.createServer((req,res)=>{chain=chain.then(()=>handle(req,res)).catch(error=>{if(!res.headersSent)json(res,400,{error:error.message});else res.end();});});
  server.requestTimeout=15000;server.headersTimeout=10000;
  await mkdir(join(session,'assets'),{recursive:true,mode:0o700});await mkdir(join(session,'artifacts'),{recursive:true,mode:0o700});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  queue(state);await persist();
  const connection={version:1,origin,token,pid:process.pid,session};
  await atomic(join(session,'connection.json'),JSON.stringify(connection,null,2));
  return {server,connection,url:origin+'/#'+token};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  startServer(resolve(process.argv[2])).then(({url})=>console.log(url)).catch(error=>{console.error(error.message);process.exitCode=1;});
}

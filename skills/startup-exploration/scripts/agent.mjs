import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const [command,session,...args]=process.argv.slice(2);
try{
  if(!['wait','respond','stop'].includes(command)||!session)throw Error('用法：agent.mjs wait <session> [seconds=40] | respond <session> <response.json> | stop <session>');
  const c=JSON.parse(await readFile(join(resolve(session),'connection.json'),'utf8'));
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(c.origin)||!/^[a-f0-9]{64}$/.test(c.token))throw Error('会话连接文件无效');
  async function call(path,body){const r=await fetch(c.origin+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+c.token,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000),redirect:'error'});const data=await r.json();if(!r.ok)throw Error(data.error||'请求失败');return data;}
  if(command==='wait'){
    const seconds=Number(args[0]??40);if(!Number.isFinite(seconds)||seconds<0||seconds>50)throw Error('单次等待需在 0–50 秒之间');
    const until=Date.now()+seconds*1000;let data;
    do{data=await call('/agent/next');if(data.pending||data.complete||Date.now()>=until)break;await new Promise(r=>setTimeout(r,750));}while(true);
    console.log(JSON.stringify(data.pending?{status:'request',request:data.pending}:data.complete?{status:'complete',session:c.session}:{status:'waiting',note:'学生还未提交下一步；可再次 wait，或停止等待并告知学生发送“继续探索”。'},null,2));
  }else if(command==='respond'){
    if(args.length!==1)throw Error('请提供 response.json 路径');
    const result=await call('/agent/respond',JSON.parse(await readFile(resolve(args[0]),'utf8')));
    console.log(JSON.stringify({status:'delivered',revision:result.revision,step:result.step}));
  }else{await call('/agent/stop',{});console.log(JSON.stringify({status:'stopped',session:c.session}));}
}catch(error){console.error(error.message);process.exitCode=1;}

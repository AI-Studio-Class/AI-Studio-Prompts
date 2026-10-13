import { mkdir, readFile, realpath } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
const args=process.argv.slice(2),mode=args[0],value=args[1];
try{
  if(args.length!==2||!['--project','--session'].includes(mode)||!value)throw Error('用法：node scripts/open.mjs --project <项目目录> 或 --session <已保存会话目录>');
  let session;
  if(mode==='--project'){
    const project=await realpath(resolve(value));
    if(project===resolve(dirname(fileURLToPath(import.meta.url)),'..'))throw Error('请指定学生项目目录，不要将 Skill 目录当作项目');
    session=join(project,'.startup-exploration',randomUUID());await mkdir(session,{recursive:true,mode:0o700});
  }else {
    session=await realpath(resolve(value));
    // A mistyped resume path must not silently create a different journey.
    const saved=JSON.parse(await readFile(join(session,'state.json'),'utf8'));
    if(saved.version!==1||!saved.id)throw Error('这个目录没有可恢复的探索记录');
  }
  const inspect=async()=>{try{const c=JSON.parse(await readFile(join(session,'connection.json'),'utf8'));if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(c.origin)||!/^[a-f0-9]{64}$/.test(c.token))return null;const r=await fetch(c.origin+'/api/state',{headers:{authorization:'Bearer '+c.token},signal:AbortSignal.timeout(800),redirect:'error'});return r.ok?c:null;}catch{return null;}};
  let connection=await inspect();
  if(!connection){
    const child=spawn(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),'server.mjs'),session],{detached:true,stdio:'ignore',windowsHide:true});child.unref();
    let spawnError;child.on('error',e=>{spawnError=e;});
    for(let n=0;n<40&&!connection;n++){await new Promise(r=>setTimeout(r,150));if(spawnError)throw spawnError;connection=await inspect();}
    if(!connection)throw Error('本地服务未能启动；请用 node scripts/server.mjs <会话目录> 查看原因：'+session);
  }
  console.log(JSON.stringify({session,url:connection.origin+'/#'+connection.token,note:'请用浏览器打开此本机地址，Agent 随后运行 agent.mjs wait；不要公开 connection.json 或会话目录。'},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}

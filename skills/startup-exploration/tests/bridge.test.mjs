import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {startServer} from '../scripts/server.mjs';
import {question,summary,reportHTML,freshState} from '../scripts/core.mjs';

const q={title:'谁最先会用它？',hint:'选择一种具体人群。',options:[{label:'刚学做饭的人',note:'更需要引导'},{label:'想减少浪费的人',note:'从剩菜出发'},{label:'想准备早餐的人',note:'时间有限'}]};
const logos={logos:['orbit','spark','leaf'].map((motif,i)=>({label:'合成测试方案'+i,description:'只用于测试',initials:'测',color:'#426C9D',motif}))};
const finish={summary:'基于合成测试回答的方向草稿。',nextSteps:['请真实用户试一次'],uncertainties:['实际需求尚未验证']};
async function fixture(t){const session=await mkdtemp(join(tmpdir(),'exploration-test-'));let instance=await startServer(session);t.after(()=>{instance.server.close();instance.server.closeAllConnections?.();});return {session,get instance(){return instance;},async restart(){await new Promise(r=>{instance.server.close(r);instance.server.closeAllConnections?.();});instance=await startServer(session);},async call(path,body,extra={}){const c=instance.connection;const r=await fetch(c.origin+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+c.token,...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}};}
test('validation rejects unsafe structure and empty output',()=>{
  assert.throws(()=>question({...q,options:[q.options[0],q.options[0]]}));
  assert.throws(()=>summary({...finish,summary:''}));
});
test('complete synthetic journey, duplicate reply, refresh, export and restart',async t=>{
  const f=await fixture(t);let s=(await f.call('/api/state')).data;
  assert.equal((await f.call('/api/answer',{revision:s.revision,text:''})).status,400);
  for(let step=0;step<13;step++){
    s=(await f.call('/api/state')).data;assert.equal(s.step,step);
    if(s.pending){const pending=s.pending;const body={id:pending.id,revision:pending.revision,result:pending.kind==='logos'?logos:q};
      const reply=await f.call('/agent/respond',body);assert.equal(reply.status,200);s=reply.data;
      assert.equal((await f.call('/agent/respond',body)).status,400,'duplicate rejected');
    }
    const result=await f.call('/api/answer',{revision:s.revision,...(step===11?{logoIndex:1}:{text:step===0?'帮助新手用剩菜做饭的产品':'合成回答 '+step})});
    assert.equal(result.status,200);s=result.data;
    if(step===3){await f.restart();assert.deepEqual((await f.call('/api/state')).data.answers,s.answers);}
  }
  assert.equal(s.pending.kind,'summary');s=(await f.call('/agent/respond',{id:s.pending.id,revision:s.pending.revision,result:finish})).data;
  s=(await f.call('/api/finish',{revision:s.revision})).data;assert.equal(s.complete,true);
  const html=await readFile(join(f.session,s.exports[0],'report.html'),'utf8');assert.match(html,/data:image\/svg\+xml;base64,/);assert.match(html,/实际需求尚未验证/);
  assert.equal(JSON.parse(await readFile(join(f.session,s.exports[0],'journey.json'),'utf8')).answers.length,13);
  await f.restart();assert.equal((await f.call('/api/state')).data.complete,true);
});
test('stale requests, backtracking and concurrent answers do not overwrite progress',async t=>{
  const f=await fixture(t);let s=(await f.call('/api/answer',{revision:0,text:'学生原始想法'})).data;const old=s.pending;
  s=(await f.call('/api/back',{revision:s.revision})).data;
  assert.equal((await f.call('/agent/respond',{id:old.id,revision:old.revision,result:q})).status,400);
  const responses=await Promise.all([f.call('/api/answer',{revision:s.revision,text:'修改后的想法'}),f.call('/api/answer',{revision:s.revision,text:'不应覆盖'})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);
  s=(await f.call('/api/state')).data;assert.equal(s.answers.length,1);assert.equal(s.answers[0].text,'修改后的想法');assert.notEqual(s.pending.id,old.id);
});
test('localhost authentication, origin and static allowlist isolate project files',async t=>{
  const f=await fixture(t),url=f.instance.connection.origin;
  assert.equal((await fetch(url+'/api/state')).status,401);
  assert.equal((await f.call('/api/state',undefined,{Origin:'https://evil.example'})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>{http.get(url+'/api/state',{headers:{Host:'evil.example',authorization:'Bearer '+f.instance.connection.token}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
  assert.equal(hostStatus,403);
  for(const path of ['/state.json','/connection.json','/scripts/server.mjs','/assets/../../connection.json','/api/unknown'])assert.equal((await fetch(url+path,{headers:{authorization:'Bearer '+f.instance.connection.token}})).status,404,path);
  const r=await fetch(url+'/');assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
});
test('export escapes student and Agent content',()=>{
  const s=freshState();s.answers=[{id:'name',text:'<script>alert(1)</script>'}];s.summary={...finish,summary:'<img src=x onerror=alert(1)>'};
  const html=reportHTML(s);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;script&gt;/);
});
test('image imports reject path traversal and symlink escapes',async t=>{
  const f=await fixture(t);let s;
  for(let step=0;step<11;step++){
    s=(await f.call('/api/state')).data;
    if(s.pending)s=(await f.call('/agent/respond',{id:s.pending.id,revision:s.pending.revision,result:q})).data;
    s=(await f.call('/api/answer',{revision:s.revision,text:'合成回答'})).data;
  }
  const outside=await mkdtemp(join(tmpdir(),'exploration-outside-'));await writeFile(join(outside,'secret.png'),Buffer.from([137,80,78,71,13,10,26,10]));
  await symlink(join(outside,'secret.png'),join(f.session,'artifacts','escape.png'));
  for(const file of ['../../secret.png','artifacts/escape.png','https://example.com/image.png']){
    const result=structuredClone(logos);result.logos[0].file=file;
    assert.equal((await f.call('/agent/respond',{id:s.pending.id,revision:s.pending.revision,result})).status,400);
  }
  assert.equal((await f.call('/api/state')).data.pending.id,s.pending.id);
});

import { randomUUID } from 'node:crypto';

export const stages = [
  ['idea','想法营地','你的初始想法是什么？'], ['audience','伙伴广场','为谁解决问题？'],
  ['occasion','场景瞭望台','什么时候会用到？'], ['problem','观察哨站','最想解决的困难是什么？'],
  ['workaround','旧路观察站','现在是怎么解决的？'], ['value','改变之桥','怎样才算更有帮助？'],
  ['aiRole','搭档工坊','AI 负责哪一部分？'], ['difference','特色岔路','产品有什么不同？'],
  ['feature','第一块积木','第一版只做哪件事？'], ['name','名字小铺','给产品取个名字'],
  ['style','风格画室','你希望是什么风格？'], ['logo','标志工坊','挑选一个 Logo'],
  ['slogan','回声邮局','用一句话介绍产品'], ['confirm','你的工作室','确认并保存成果'],
];
export const check = (condition, message) => { if (!condition) throw new Error(message); };
export function text(value, max = 160) {
  check(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `文字不能为空或超过 ${max} 字`);
  return value.trim();
}
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function question(value) {
  check(value && Array.isArray(value.options) && value.options.length >= 2 && value.options.length <= 3, '问题需要 2–3 个建议');
  const result = {title:text(value.title,80),hint:text(value.hint,240),options:value.options.map(o=>({label:text(o.label,80),note:text(o.note,160)}))};
  check(new Set(result.options.map(o=>o.label)).size === result.options.length, '建议不能重复');
  return result;
}
export function summary(value) {
  check(value && Array.isArray(value.nextSteps) && value.nextSteps.length >= 1 && value.nextSteps.length <= 5 && Array.isArray(value.uncertainties) && value.uncertainties.length <= 5, '汇报需要行动与待验证事项');
  return {summary:text(value.summary,600),nextSteps:value.nextSteps.map(s=>text(s,240)),uncertainties:value.uncertainties.map(s=>text(s,240))};
}
export function logoConcept(value) {
  check(value && /^#[0-9a-f]{6}$/i.test(value.color), 'Logo 颜色需要 #RRGGBB');
  check(['orbit','spark','leaf'].includes(value.motif), 'Logo motif 需为 orbit、spark 或 leaf');
  return {label:text(value.label,40),description:text(value.description,240),initials:text(value.initials,4),color:value.color,motif:value.motif};
}
export function conceptSVG(value) {
  const v=logoConcept(value), shapes={orbit:'<circle cx="160" cy="115" r="49"/><ellipse cx="160" cy="115" rx="89" ry="25" transform="rotate(-30 160 115)"/>',spark:'<path d="m160 39 20 54 56 22-56 21-20 55-20-55-56-21 56-22z"/>',leaf:'<path d="M96 154Q85 65 220 45Q241 186 96 154Z M98 152l90-70"/>'};
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280"><rect width="320" height="280" rx="24" fill="white"/><g fill="none" stroke="${v.color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${shapes[v.motif]}</g><text x="160" y="242" text-anchor="middle" fill="${v.color}" font-family="sans-serif" font-size="35" font-weight="700">${escape(v.initials)}</text></svg>`;
}
export function freshState() {
  return {version:1,id:randomUUID(),revision:0,step:0,answers:[],questions:{},logos:[],selectedLogo:null,summary:null,pending:null,complete:false,exports:[],createdAt:new Date().toISOString()};
}
export function queue(state) {
  if (state.complete || state.pending || state.step===0) return;
  const stage=stages[state.step][0];
  const kind=stage==='logo'?'logos':stage==='confirm'?'summary':'question';
  if ((kind==='question'&&state.questions[stage]) || (kind==='logos'&&state.logos.length) || (kind==='summary'&&state.summary)) return;
  state.pending={id:randomUUID(),kind,stage,revision:state.revision,answers:structuredClone(state.answers.slice(0,state.step)),createdAt:new Date().toISOString()};
}
export function answer(state, input) {
  check(!state.complete && state.step<13 && !state.pending, '请等待当前结果，或先返回修改');
  check(input.revision===state.revision, '页面已更新，请刷新后重试');
  const id=stages[state.step][0];
  let value;
  if(id==='logo') {
    check(Number.isInteger(input.logoIndex) && !!state.logos[input.logoIndex], '请选择一个 Logo');
    state.selectedLogo=input.logoIndex;value=state.logos[input.logoIndex].label;
  } else value=text(input.text);
  state.answers=state.answers.slice(0,state.step);
  state.answers.push({id,text:value,...(state.questions[id]?{question:state.questions[id].title}:{})});
  for(const [key] of stages.slice(state.step+1)) delete state.questions[key];
  if(state.step<11){state.logos=[];state.selectedLogo=null;}
  state.summary=null;state.step++;state.revision++;queue(state);
}
export function back(state, revision) {
  check(revision===state.revision && state.step>0,'无法返回，请刷新后重试');
  state.pending=null;state.complete=false;state.step--;state.revision++;queue(state);
}
export function reportHTML(state, logo='') {
  check(!!state.summary, '汇报尚未生成');
  const a=id=>escape(state.answers.find(a=>a.id===id)?.text||'未填写');
  const image=logo.startsWith('data:image/')?`<img src="${escape(logo)}" alt="选定的产品 Logo">`:'';
  const rows=stages.slice(0,11).filter(([id])=>id!=='name').map(([id,,title])=>`<section><h2>${escape(title)}</h2><p>${a(id)}</p></section>`).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${a('name')} · 创业方向汇报</title><style>body{font-family:system-ui,sans-serif;background:#f5f5f4;color:#262626;margin:0;padding:32px}main{max-width:1050px;margin:auto;background:white;padding:32px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #292929;padding-bottom:20px}img{width:120px;height:120px;object-fit:contain}h1{font-size:32px}h2{font-size:16px}p,li{line-height:1.7;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 30px}section{break-inside:avoid}footer{border-top:1px solid #ccc;padding-top:16px;font-size:12px;color:#666}@media(max-width:600px){body,main{padding:16px}.grid{grid-template-columns:1fr}}@media print{body{padding:0;background:white}main{padding:0}button{display:none}}@page{size:A4;margin:16mm}</style><main><header><div><p>AI STUDIO · 创业方向探索</p><h1>${a('name')}</h1><p>${a('slogan')}</p></div>${image}</header><p>${escape(state.summary.summary)}</p><div class="grid">${rows}<section><h2>下一步</h2><ul>${state.summary.nextSteps.map(s=>`<li>${escape(s)}</li>`).join('')}</ul></section><section><h2>待验证，不是已证实的结论</h2><ul>${state.summary.uncertainties.map(s=>`<li>${escape(s)}</li>`).join('')||'<li>继续和真实使用者验证。</li>'}</ul></section></div><footer>学生确认的方向草稿，由当前 Agent 协助整理。不是市场验证、商标检索或已实现的产品。可通过浏览器打印保存 PDF。</footer></main></html>`;
}

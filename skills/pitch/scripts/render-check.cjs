#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {pathToFileURL}=require('url');
function args(argv){
 const o={width:1600,height:960,selector:'.slide',bodySelector:'.slide-body,[data-slide-body]'};
 const names={'--contract':'contract','--out':'out','--slides':'slides','--pdf':'pdf','--browser':'browser','--selector':'selector','--body-selector':'bodySelector','--expected-pages':'expectedPages','--source-text':'sourceText','--width':'width','--height':'height'};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];if(a==='--help'){o.help=true;continue}
  if(names[a]){if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Missing value for '+a);o[names[a]]=argv[++i]}
  else if(a.startsWith('--')||o.input)throw Error('Unexpected argument: '+a);else o.input=a;
 }
 if(o.help)return o;
 if(!o.input||!o.out)throw Error('Usage: render-check.cjs deck.html --out checks [--slides 1,3-5] [--pdf deck.pdf]');
 for(const k of ['width','height','expectedPages'])if(o[k]!==undefined){o[k]=Number(o[k]);if(!Number.isInteger(o[k])||o[k]<1)throw Error(k+' must be a positive integer')}
 o.input=path.resolve(o.input);o.out=path.resolve(o.out);
 if(!fs.statSync(o.input).isFile())throw Error('Input is not a file');
 if(o.pdf){o.pdf=path.resolve(o.pdf);if(!o.pdf.toLowerCase().endsWith('.pdf')||o.pdf===o.input)throw Error('PDF output must have a .pdf extension')}
 return o;
}
function selected(spec,total){
 if(!spec)return Array.from({length:total},(_,i)=>i);
 const found=new Set();for(const part of spec.split(',')){
  const m=/^(\d+)(?:-(\d+))?$/.exec(part.trim());if(!m)throw Error('Invalid --slides value');
  const a=Number(m[1]),b=Number(m[2]||a);if(a<1||b<a||b>total)throw Error('Slide selection is out of range');
  for(let n=a;n<=b;n++)found.add(n-1);
 }return [...found].sort((a,b)=>a-b);
}
function findBrowser(given){
 const candidates=[given,process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
 if(given&&!fs.existsSync(given))throw Error('Requested browser not found');
 return candidates.find(p=>fs.existsSync(p));
}
// Runs inside the browser and never mutates slide styles or content
function inspect(slide,settings){
 const issues=[],fonts={},exceptions=new Map(),seen=new Set();
 const slideRect=slide.getBoundingClientRect(),cover=slide.matches('.cover,[data-cover]');
 const bodies=slide.querySelectorAll(settings.bodySelector),body=bodies[0],header=slide.querySelector('header,[data-slide-header]'),footer=slide.querySelector('footer,[data-slide-footer]');
 const tolerance=2.5;
 const expected=settings.contract?.expected;
 function issue(code,text='',severity='error'){
  const key=code+'|'+text;if(seen.has(key))return;seen.add(key);issues.push({code,severity,text:text.slice(0,140)});
 }
 const visible=el=>{const st=getComputedStyle(el),r=el.getBoundingClientRect();return !el.closest('[hidden]')&&st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0};
 const outside=(r,b)=>r.left<b.left-tolerance||r.right>b.right+tolerance||r.top<b.top-tolerance||r.bottom>b.bottom+tolerance;
 if(!visible(slide)){issue('slide-not-visible');return {issues,fonts,exceptions:[]}}
 if(!cover&&bodies.length>1)issue('body-region-count','Each page must have exactly one body root');
 if(expected){
  const st=getComputedStyle(slide), canvas=expected.canvas;
  if(Math.abs(parseFloat(st.width)-canvas.width)>.5||Math.abs(parseFloat(st.height)-canvas.height)>.5)issue('baseline-canvas-drift',`${st.width} × ${st.height}`);
  if(!cover){
   if(Math.abs(parseFloat(st.paddingLeft)-expected.paddingX)>.5||Math.abs(parseFloat(st.paddingRight)-expected.paddingX)>.5)issue('baseline-padding-drift',`${st.paddingLeft} / ${st.paddingRight}`);
   const title=slide.querySelector('header h2,[data-slide-header] h2');
   if(!title||!expected.titleSizes.includes(parseFloat(getComputedStyle(title).fontSize)))issue('baseline-title-size-drift',title?getComputedStyle(title).fontSize:'missing title');
   for(const [token,value] of Object.entries(expected.tokens||{}))if(st.getPropertyValue(token).trim().toLowerCase()!==value.toLowerCase())issue('baseline-color-token-drift',token);
  }
 }
 if(!cover&&!body)issue('body-region-missing','Add .slide-body / data-slide-body or provide --body-selector');
 if(settings.sourceText&&(!footer||!visible(footer)||!footer.textContent.includes(settings.sourceText)))issue('source-footer-missing',settings.sourceText);
 const walker=document.createTreeWalker(slide,NodeFilter.SHOW_TEXT);let n;
 while(n=walker.nextNode()){
  const text=n.textContent.trim(),el=n.parentElement;if(!text||el.closest('script,style,svg,[hidden]')||!visible(el))continue;
  const range=document.createRange();range.selectNodeContents(n);const rects=[...range.getClientRects()].filter(r=>r.width&&r.height);if(!rects.length)continue;
  const st=getComputedStyle(el),inBody=body&&body.contains(el);
  if(expected && !el.closest('svg')){
   const firstFamily=st.fontFamily.split(',')[0].trim().replace(/['"]/g,'');
   if(firstFamily!==expected.fontFamily&&!(/^\d{1,2}$/.test(text)&&(expected.numericLabelFamilies||[]).includes(firstFamily)))issue('baseline-font-family-drift',firstFamily);
  }
  if(inBody&&!cover){
   const ex=el.closest('[data-font-exception]');
   if(ex){
    const expected=Number(ex.getAttribute('data-font-exception'));exceptions.set(ex,{text:ex.textContent.trim().slice(0,140),expected,actual:st.fontSize});
    if(!Number.isFinite(expected)||expected<=0||Math.abs(parseFloat(st.fontSize)-expected)>.1)issue('font-exception-mismatch',text);
   }else fonts[st.fontSize]=(fonts[st.fontSize]||0)+text.length;
   if(text.includes('。')&&!el.closest('[data-qa-allow-punctuation]'))issue('body-chinese-full-stop',text);
  }
  const box=el.closest('[data-qa-box],td,th');
  for(const r of rects){
   if(outside(r,slideRect))issue('text-outside-slide',text);
   if(box&&outside(r,box.getBoundingClientRect()))issue('text-outside-content-box',text);
   if(inBody&&!cover){
    if(header&&visible(header)&&r.top<header.getBoundingClientRect().bottom-tolerance)issue('text-over-header',text);
    if(footer&&visible(footer)&&r.bottom>footer.getBoundingClientRect().top+tolerance)issue('text-over-footer',text);
   }
   let ancestor=el;
   while(ancestor&&ancestor!==slide){
    const astyle=getComputedStyle(ancestor),b=ancestor.getBoundingClientRect();
    if((/hidden|clip|auto|scroll/.test(astyle.overflowX)&&(r.left<b.left-tolerance||r.right>b.right+tolerance))||(/hidden|clip|auto|scroll/.test(astyle.overflowY)&&(r.top<b.top-tolerance||r.bottom>b.bottom+tolerance)))issue('text-clipped-by-container',text);
    ancestor=ancestor.parentElement;
   }
  }
 }
 if(!cover&&body&&Object.keys(fonts).length!==1)issue('body-font-size-count',JSON.stringify(fonts));
 if(expected&&!cover){
  const [low,high]=expected.bodySizeRange;
  for(const font of Object.keys(fonts))if(parseFloat(font)<low||parseFloat(font)>high)issue('baseline-body-size-range',font);
 }
 // Short final lines are review signals, never an automatic reason to shrink type
 for(const heading of slide.querySelectorAll('h1,h2,h3,h4,.slide-lead,[data-lead]')){
  if(!visible(heading)||cover)continue;
  const lines=[];const w=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);let t;
  while(t=w.nextNode())for(let i=0;i<t.length;i++){
   if(!t.textContent[i].trim())continue;const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+1);const b=r.getBoundingClientRect();if(!b.width||!b.height)continue;
   let line=lines.find(x=>Math.abs(x.y-b.top)<Math.max(3,b.height*.3));if(!line){line={y:b.top,text:''};lines.push(line)}line.text+=t.textContent[i];
  }
  lines.sort((a,b)=>a.y-b.y);const last=lines.at(-1)?.text||'';
  if(lines.length>1&&(/^[\p{Script=Han}\p{P}]{1,2}$/u.test(last)||/^[A-Za-z]+[.,;:!?]?$/.test(last)))issue('short-last-heading-line',heading.textContent.trim(),'warning');
 }
 return {issues,fonts,exceptions:[...exceptions.values()],slideSize:{width:slideRect.width,height:slideRect.height}};
}
async function main(){
 const o=args(process.argv.slice(2));if(o.help){console.log('render-check.cjs deck.html --out checks [--slides 1,3-5] [--pdf file.pdf] [--expected-pages N] [--source-text TEXT] [--browser PATH] [--selector CSS] [--body-selector CSS] [--width N --height N] [--contract visual-contract.json]');return}
 let contract=null;
 if(o.contract){
  contract=JSON.parse(fs.readFileSync(path.resolve(o.contract),'utf8'));
  // Portable skill: validate the supplied project contract, without a private client master.
  if(!contract.baselineId||!contract.expected?.canvas||!contract.expected?.fontFamily)throw Error('Incomplete project visual contract');
  if(!contract.expected||!Array.isArray(contract.pageReferences))throw Error('Invalid visual contract');
 }
 let chromium;try{({chromium}=require('playwright'))}catch{throw Error('Playwright is required; use the configured runtime and NODE_PATH')}
 fs.mkdirSync(o.out,{recursive:true});const executablePath=findBrowser(o.browser);
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 try{
  const page=await browser.newPage({viewport:{width:o.width,height:o.height},deviceScaleFactor:1});
  const runtimeErrors=[],failedRequests=[],externalRequests=new Set();
  page.on('pageerror',e=>runtimeErrors.push(e.message));
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  page.on('request',r=>{if(/^https?:/.test(r.url()))externalRequests.add(r.url())});
  await page.goto(pathToFileURL(o.input).href,{waitUntil:'load'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})))});
  const slides=page.locator(o.selector),total=await slides.count();if(!total)throw Error('No slides found; check --selector');
  const chosen=selected(o.slides,total),printChosen=o.pdf?selected(null,total):chosen,captures=[],results=[];
  const settings={bodySelector:o.bodySelector,sourceText:o.sourceText,contract};
  async function activate(i){
   await page.evaluate(index=>{if(typeof window.deck?.go==='function')window.deck.go(index);else if(typeof window.Reveal?.slide==='function')window.Reveal.slide(index)},i);
   const loc=slides.nth(i);if(await loc.isVisible())await loc.scrollIntoViewIfNeeded();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return loc;
  }
  async function capture(i,mode,screen){
   const loc=screen?await activate(i):slides.nth(i);
   const check=await loc.evaluate(inspect,settings),identity=await loc.evaluate(el=>({id:el.id,title:el.querySelector('header h2,h1,h2')?.textContent||el.getAttribute('aria-label')||''}));
   results.push({page:i+1,mode,...identity,...check});
   if(await loc.isVisible()){
    const dest=path.join(o.out,`page-${String(i+1).padStart(2,'0')}-${mode}.png`);
    await loc.screenshot({path:dest,animations:'disabled'});captures.push({page:i+1,mode,path:dest});
   }
  }
  for(const i of chosen)await capture(i,'screen',true);
  await page.setViewportSize({width:1024,height:768});for(const i of chosen)await capture(i,'small',true);
  await page.setViewportSize({width:o.width,height:o.height});await page.emulateMedia({media:'print'});
  for(const i of printChosen)await capture(i,'print',false);
  const brokenImages=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>({src:i.getAttribute('src')?.slice(0,180),alt:i.alt})));
  const fontFaces=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
  const errors=results.flatMap(r=>r.issues.filter(i=>i.severity==='error').map(i=>({page:r.page,mode:r.mode,...i})));
  if(o.expectedPages!==undefined&&o.expectedPages!==total)errors.push({code:'page-count-mismatch',expected:o.expectedPages,actual:total});
  errors.push(...runtimeErrors.map(text=>({code:'runtime-error',text})),...failedRequests.map(r=>({code:'request-failed',...r})),...brokenImages.map(i=>({code:'image-not-loaded',...i})),...fontFaces.filter(f=>f.status==='error').map(f=>({code:'font-not-loaded',...f})));
  if(contract){
   if(!contract.expected.allowSystemFont&&!fontFaces.some(f=>f.family.replace(/['"]/g,'')===contract.expected.fontFamily&&f.status==='loaded'))errors.push({code:'baseline-font-not-loaded',family:contract.expected.fontFamily});
   for(const i of chosen){
    const ref=contract.pageReferences.find(r=>r.page===i+1);
    if(!ref||!ref.relationship?.trim()||!Array.isArray(ref.referencePages)||!ref.referencePages.length||ref.referencePages.some(n=>!Number.isInteger(n)||n<1||n>15))errors.push({page:i+1,code:'baseline-reference-record-missing'});
   }
  }
  const warnings=results.flatMap(r=>r.issues.filter(i=>i.severity==='warning').map(i=>({page:r.page,mode:r.mode,...i})));
  if(externalRequests.size)warnings.push({code:'external-resource-dependency',urls:[...externalRequests]});
  let pdfWritten=null;
  if(o.pdf&&!errors.length){fs.mkdirSync(path.dirname(o.pdf),{recursive:true});await page.pdf({path:o.pdf,preferCSSPageSize:true,printBackground:true});pdfWritten=o.pdf}
  const report={schemaVersion:2,visualContract:contract?{path:path.resolve(o.contract),baselineId:contract.baselineId,baselineSha256:contract.baselineSha256,deviations:contract.deviations}:null,input:o.input,inputSha256:crypto.createHash('sha256').update(fs.readFileSync(o.input)).digest('hex'),totalPages:total,checkedPages:chosen.map(i=>i+1),printCheckedPages:printChosen.map(i=>i+1),automaticChecksPassed:errors.length===0,visualReviewRequired:true,pdfRequested:o.pdf||null,pdfWritten,errors,warnings,fontFaces,results,captures};
  const reportPath=path.join(o.out,'report.json');fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
  console.log(JSON.stringify({report:reportPath,totalPages:total,checkedPages:report.checkedPages,errors:errors.length,warnings:warnings.length,screenshots:captures.length,pdfWritten,visualReviewRequired:true},null,2));
  if(errors.length)process.exitCode=2;
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});

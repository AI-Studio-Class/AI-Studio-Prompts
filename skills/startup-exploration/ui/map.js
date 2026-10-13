import { getScene } from './map-scenes.js';
// The SVG is only an atlas viewport. Every visible environment pixel comes from GPT Image.
export class AdventureMap {
 constructor(element,{reducedMotion=false}={}){this.element=element;this.reducedMotion=reducedMotion;this.mapId=null;}
 update({mapId}){
  if(this.mapId===mapId)return;
  this.mapId=mapId;const scene=getScene(mapId),x=scene.cell%2*768,y=Math.floor(scene.cell/2)*512;
  this.element.innerHTML=`<svg viewBox="${x} ${y} 768 512" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${scene.name}，GPT Image 像素场景"><image href="${scene.atlas}" width="1536" height="1024"/></svg>`;
 }
 getAnchors(){return [{x:23,y:66},{x:50,y:55},{x:77,y:66}];}
 async travel(){
  if(this.reducedMotion)return;
  const transition=this.element.animate([{opacity:1},{opacity:.55}],{duration:160,easing:'ease-out'});
  await transition.finished.catch(()=>{});
 }
 reset(){this.mapId=null;}
}

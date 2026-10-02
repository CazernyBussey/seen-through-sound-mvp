const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Element{
 constructor(tag){this.tag=tag;this.attrs={};this.events={};this.children=[];this.hidden=false;this.dataset={};this.classList={toggle:(k,v)=>{this.classes??={};this.classes[k]=v}};this.contentWindow={postMessage:(data,origin)=>messages.push({data,origin})};}
 setAttribute(k,v){this.attrs[k]=v}addEventListener(k,f){this.events[k]=f}append(...xs){this.children.push(...xs)}focus(){document.activeElement=this}querySelector(s){return this.lookup?.[s]||null}fire(k,e={}){return this.events[k]?.(e)}
}
const messages=[],a=new Element('button'),b=new Element('button'),dock=new Element('div'),feedback=new Element('p'),pause=new Element('button'),stop=new Element('button');dock.lookup={'[data-etib-feedback]':feedback,'[data-etib-pause]':pause,'[data-etib-stop]':stop};pause.hidden=stop.hidden=true;
const body=new Element('body'),elements=[];const document={currentScript:{src:'https://talk-to-etib.onrender.com/launcher.js',dataset:{}},body,activeElement:a,querySelectorAll:()=>[a,b],querySelector:s=>s==='[data-etib-bottom]'?dock:null,createElement:tag=>{const e=new Element(tag);elements.push(e);return e}};
const events={},window={addEventListener(k,f){events[k]=f}},location={assign(){throw Error('Unexpected navigation')}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../launcher.js'),'utf8'),{document,window,URL,location,fetch:()=>{throw Error('Unexpected fetch')}});
(async()=>{
 const frame=elements.find(e=>e.tag==='iframe'),panel=body.children[0],bar=panel.children[0],minimize=bar.children[1],close=bar.children[2];
 assert.equal(elements.filter(e=>e.tag==='iframe').length,1);assert.equal(frame.src,undefined,'App is lazy loaded');
 a.fire('click',{preventDefault(){}});assert.equal(frame.src,'https://talk-to-etib.onrender.com/');assert.equal(panel.hidden,false);assert.equal(a.attrs['aria-expanded'],'true');assert.equal(b.attrs['aria-expanded'],'true');
 await events.message({origin:'https://evil.example',source:frame.contentWindow,data:{type:'etib:close'}});assert.equal(panel.hidden,false,'Untrusted message ignored');
 await events.message({origin:'https://talk-to-etib.onrender.com',source:frame.contentWindow,data:{type:'etib:ready'}});assert.equal(messages.at(-1).data.type,'etib:initialize');
 minimize.fire('click');assert.equal(messages.at(-1).data.type,'etib:minimize');assert.equal(frame.src,'https://talk-to-etib.onrender.com/');assert.equal(panel.hidden,false,'Live iframe remains mounted while minimized');assert.equal(frame.attrs['aria-hidden'],'true');assert.equal(a.attrs['aria-expanded'],'false');assert.equal(document.activeElement,a);
 b.fire('click',{preventDefault(){}});assert.equal(frame.attrs['aria-hidden'],'false');assert.equal(elements.filter(e=>e.tag==='iframe').length,1,'Bottom launcher reuses same player');
 pause.fire('click');assert.equal(messages.at(-1).data.command,'pause');stop.fire('click');assert.equal(messages.at(-1).data.command,'stop');
 close.fire('click');assert.equal(messages.at(-1).data.type,'etib:stop');assert.equal(panel.hidden,true);assert.equal(frame.src,'https://talk-to-etib.onrender.com/');
 console.log('PASS: one lazy player shared by both buttons; minimize preserves frame and cancels capture; close stops; dock commands and message origin checks.');
})().catch(e=>{console.error(e);process.exitCode=1});

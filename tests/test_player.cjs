const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/<textarea|type="text"|id="ask"|id="history"/.test(html),'Voice screen must have no text entry or conversation history');
class Element {
 constructor(id){this.id=id;this.hidden=false;this.textContent='';this.children=[];this.attributes={};this.listeners={};this.paused=true;this.muted=false;this.playCalls=0;}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return k==='src'?this.src:this.attributes[k];}removeAttribute(k){if(k==='src')this.src='';else delete this.attributes[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}emit(k,e={}){for(const f of this.listeners[k]||[])f(e);}
 append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}querySelector(){return null;}focus(){focused=this.id;}
 play(){this.playCalls++;if(blocked)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));this.paused=false;this.emit('playing');return Promise.resolve();}pause(){this.paused=true;this.emit('pause');}load(){}click(){this.emit('click');}
}
let focused='',blocked=false,recognition,apiCalls=0;
const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
class Speech{constructor(){recognition=this;}start(){this.onstart();}abort(){}}
const radio={id:'radio',name:'ETIB Radio',media:'https://stream.zeno.fm/test',url:'https://zeno.fm/radio/even-though-im-blind-radio/'};
const episode={id:'experience-0',title:'Latest Experience',media:'https://d3ctxlq1ktw2nl.cloudfront.net/episode.mp3',url:'https://anchor.fm/test'};
const preview={id:'radio-123',title:'Radio Podcast episode',media:'https://p.scdn.co/preview.mp3',url:'https://open.spotify.com/episode/123',preview:true};
const window={SpeechRecognition:Speech,addEventListener(){},parent:null};window.parent=window;
const context=vm.createContext({window,document:{getElementById:id=>{assert(elements[id],'Missing DOM element '+id);return elements[id]},createElement:tag=>new Element(tag),createTextNode:t=>({textContent:t}),addEventListener(){}},location:{origin:'https://etib.test',href:'https://etib.test',assign(){}},URL,AbortController,console,setTimeout:()=>1,clearTimeout(){},fetch:async(url,opts)=>{if(url==='/api/registry')return{json:async()=>[radio]};apiCalls++;const message=JSON.parse(opts.body).message;const item=message.includes('Radio Podcast')?preview:episode;return{ok:true,json:async()=>({text:'Selected '+item.title,session:{},results:[item],action:{type:item.preview?'spotify':'play',item}})}}});
vm.runInContext(fs.readFileSync(path.join(root,'voice.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const flush=()=>new Promise(r=>setImmediate(r));
async function command(text){elements.speak.click();recognition.onresult({results:[Object.assign([{transcript:text}],{isFinal:true})]});recognition.onend();await flush();await flush();}
(async()=>{
 await flush();await command('Play ETIB Radio');assert.equal(apiCalls,0);assert.equal(elements.audio.src,radio.media);assert.equal(elements.audio.paused,false);assert.equal(elements.speak.textContent,'Speak now');
 await command('Pause');assert.equal(elements.audio.paused,true);await command('Resume');assert.equal(elements.audio.paused,false);
 await command('Play the latest Experience episode');assert.equal(elements.audio.src,episode.media);assert.equal(elements.audio.paused,false);assert.equal(elements.speak.disabled,false);assert.equal(vm.runInContext('requestInput.value',context),'');
 await command('Play the latest ETIB Radio Podcast episode');assert.equal(elements.audio.src,preview.media);assert.equal(elements.audio.paused,false);assert.match(elements.track.textContent,/preview/);assert.equal(elements.player.hidden,false);
 elements.results.children=['stale'];await command('Play ETIB Radio');assert.deepEqual(elements.results.children,[]);assert.equal(elements.response.hidden,true);
 blocked=true;await command('Play the latest Experience episode');assert.match(elements['media-status'].textContent,/permission/);assert.equal(elements.play.hidden,false);assert.equal(elements.speak.disabled,false);
 blocked=false;elements.play.click();await flush();assert.equal(elements.audio.paused,false);await command('Stop');assert.equal(elements.audio.src,'');assert.equal(elements.audio.paused,true);
 console.log('Player checks passed: no text entry; spoken radio, Experience and labeled preview start playback; pause/resume/stop; replacement results; ready microphone; permission fallback. Simulated media, not physical-device playback.');
})().catch(e=>{console.error(e);process.exitCode=1});

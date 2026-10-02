const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=new Map();let voice,backendCalls=0,voiceAborts=0,activeCapture=false,beeps=0;const recognizers=[];const windowEvents={},documentEvents={};
class Element{
 constructor(id){this.id=id;this.attrs={};this.events={};this.paused=true;this.currentTime=0;this.hidden=false;this.dataset={};this.textContent='';}
 set src(v){this.attrs.src=v;this.currentTime=0}get src(){return this.attrs.src||''}
 getAttribute(k){return this.attrs[k]||null}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}fire(k,event={}){for(const f of this.events[k]||[])f(event)}
 play(){assert.equal(activeCapture,false,'Audio playback must wait for recognizer release');this.lastPlayed=this.src;this.paused=false;this.fire('playing');return Promise.resolve()}pause(){if(!this.paused)assert.equal(activeCapture,false,'No media changes during capture');this.paused=true;this.fire('pause')}load(){}focus(){doc.activeElement=this}replaceChildren(){}append(){}querySelector(){return null}
}
const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id)};
const doc={getElementById:get,querySelectorAll:()=>[],createElement:()=>new Element('created'),addEventListener(k,f){documentEvents[k]=f},activeElement:null};
const experience={id:'experience-latest',category:'experience',title:'Newest Experience',media:'https://d3ctxlq1ktw2nl.cloudfront.net/full.mp3',preview_media:'https://p.scdn.co/preview.mp3',spotify_url:'https://open.spotify.com/show/2ejjSEAbngiJDrvqiN6vR6',preview:false};
const radio={id:'radio-latest',category:'radio_podcast',title:'Newest Radio Podcast',media:'https://d3ctxlq1ktw2nl.cloudfront.net/radio-full.m4a',url:'https://open.spotify.com/episode/abc',preview:false};
const seen=[1,2,3].map(i=>({id:'seen-'+i,category:'seen',title:'Message '+i,url:'https://cazernybussey.github.io/seen-through-sound-mvp/playlist.html',media:'https://wrczpnhesorptjzwdizd.supabase.co/storage/v1/object/public/audio/message-'+i+'.mp3',preview:false}));
class Speech{constructor(){recognizers.push(this)}start(){activeCapture=true;this.onstart?.()}stop(){activeCapture=false;this.onend?.()}abort(){activeCapture=false;this.onend?.()}}
class AudioContext{constructor(){this.state='running';this.currentTime=0;this.destination={}}createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){beeps++},stop(){}}}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}}
const win={AudioContext,SpeechRecognition:Speech,addEventListener(k,f){windowEvents[k]=f},parent:null};win.parent=win;
const ctx=vm.createContext({document:doc,window:win,URL,location:{origin:'https://test.example',href:'https://test.example',assign(url){this.destination=url}},AbortController,setTimeout:()=>1,clearTimeout(){},fetch:async (url,options)=>({ok:true,json:async()=>url==='/api/audio'?{experience,radio_podcast:radio}:url==='/api/registry'?[]:(backendCalls++,JSON.parse(options.body).message.includes('Seen Through Sound')?{text:'',session:{},action:{type:'play',item:seen[0],queue:[seen[1],{...seen[1],id:'unsafe',media:'https://evil.example/no.mp3'},seen[2]]}}:{text:'',session:{},action:null})})});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),ctx);

const speak=message=>{const before=beeps;get('speak').fire('click');assert.equal(beeps,before+1,'One tone at listening start');recognizers.at(-1).onaudiostart();assert.equal(beeps,before+1,'Duplicate start callbacks must not beep twice');assert.equal(activeCapture,true);recognizers.at(-1).onresult({results:[Object.assign([{transcript:message}],{isFinal:true})]});assert.equal(activeCapture,false);assert.equal(beeps,before+1,'No ending tone');};
(async()=>{
 await new Promise(setImmediate);
 speak('Play Even Though I’m Blind Experience');await new Promise(setImmediate);assert.equal(get('audio').lastPlayed,experience.media);assert.equal(get('audio').paused,false);
 get('audio').currentTime=17;speak('Pause');await new Promise(setImmediate);assert.equal(get('audio').paused,true);
 speak('Resume');await new Promise(setImmediate);assert.equal(get('audio').paused,false);assert.equal(get('audio').currentTime,17);
 speak('Play Even Though I’m Blind Radio Podcast');await new Promise(setImmediate);assert.equal(get('audio').lastPlayed,radio.media);assert.equal(get('audio').paused,false);
 speak('Play Seen Through Sound');await new Promise(setImmediate);assert.equal(get('audio').lastPlayed,seen[0].media);
 get('speak').fire('click');assert.equal(activeCapture,true);get('pause').fire('click');assert.equal(activeCapture,false,'Player controls must release capture first');
 get('speak').fire('click');get('stop').fire('click');assert.equal(activeCapture,false);
 get('fallback-request').value='Play Even Though I’m Blind Experience';get('fallback-form').fire('submit',{preventDefault(){}});await new Promise(setImmediate);assert.equal(get('audio').lastPlayed,experience.media);assert.equal(get('fallback-request').value,'');
 get('speak').fire('click');windowEvents.pagehide();assert.equal(activeCapture,false);assert.equal(get('speak').textContent,'Speak now');
 console.log('PASS: real voice-to-player integration, repeated commands, microphone/media separation, pause/resume position, full podcasts, Seen requests, controls during capture and dictation form.');
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=new Map();let voice,backendCalls=0,voiceAborts=0;const windowEvents={},documentEvents={};
class Element{
 constructor(id){this.id=id;this.attrs={};this.events={};this.paused=true;this.currentTime=0;this.hidden=false;this.dataset={};this.textContent='';}
 set src(v){this.attrs.src=v;this.currentTime=0}get src(){return this.attrs.src||''}
 getAttribute(k){return this.attrs[k]||null}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}fire(k){for(const f of this.events[k]||[])f()}
 play(){this.lastPlayed=this.src;this.paused=false;this.fire('playing');return Promise.resolve()}pause(){this.paused=true;this.fire('pause')}load(){}focus(){doc.activeElement=this}replaceChildren(){}append(){}querySelector(){return null}
}
const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id)};
const doc={getElementById:get,querySelectorAll:()=>[],createElement:()=>new Element('created'),addEventListener(k,f){documentEvents[k]=f},activeElement:null};
const experience={id:'experience-latest',category:'experience',title:'Newest Experience',media:'https://d3ctxlq1ktw2nl.cloudfront.net/full.mp3',preview_media:'https://p.scdn.co/preview.mp3',spotify_url:'https://open.spotify.com/show/2ejjSEAbngiJDrvqiN6vR6',preview:false};
const radio={id:'radio-latest',category:'radio_podcast',title:'Newest Radio Podcast',media:'https://d3ctxlq1ktw2nl.cloudfront.net/radio-full.m4a',url:'https://open.spotify.com/episode/abc',preview:false};
const seen=[1,2,3].map(i=>({id:'seen-'+i,category:'seen',title:'Message '+i,url:'https://cazernybussey.github.io/seen-through-sound-mvp/playlist.html',media:'https://wrczpnhesorptjzwdizd.supabase.co/storage/v1/object/public/audio/message-'+i+'.mp3',preview:false}));
const win={addEventListener(k,f){windowEvents[k]=f},parent:null};win.parent=win;
const ctx=vm.createContext({document:doc,window:win,URL,location:{origin:'https://test.example',href:'https://test.example',assign(url){this.destination=url}},AbortController,setTimeout:()=>1,clearTimeout(){},createListeningTone(){return{arm(){},play(){},cancel(){}}},createVoiceInput(o){voice=o;return{abort(){voiceAborts++},setBusy(){},isListening(){return false}}},fetch:async (url,options)=>({ok:true,json:async()=>url==='/api/audio'?{experience,radio_podcast:radio}:url==='/api/registry'?[]:(backendCalls++,JSON.parse(options.body).message.includes('Seen Through Sound')?{text:'',session:{},action:{type:'play',item:seen[0],queue:[seen[1],{...seen[1],id:'unsafe',media:'https://evil.example/no.mp3'},seen[2]]}}:{text:'',session:{},action:null})})});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),ctx);
(async()=>{
 await new Promise(setImmediate);
 voice.onBeforeListen();assert.equal(get('audio').paused,true);assert.equal(get('audio').lastPlayed,undefined,'Starting microphone must not play an audio element');
 await ctx.send('Play Even Though I’m Blind Experience');assert.equal(get('audio').lastPlayed,experience.media);assert.equal(get('audio').paused,false);assert.equal(get('track-link').href,experience.spotify_url);
 get('audio').currentTime=42;voice.onBeforeListen();assert.equal(get('audio').lastPlayed,experience.media,'Listening preserves the episode source');await ctx.send('Play it');get('audio').fire('loadedmetadata');assert.equal(get('audio').lastPlayed,experience.media,'Play it must restore episode instead of replaying the cue');assert.equal(get('audio').currentTime,42);
 get('audio').fire('error');await Promise.resolve();await Promise.resolve();assert.equal(get('audio').lastPlayed,experience.preview_media,'Full audio failure must switch to available preview');assert.match(get('track').textContent,/preview/);
 await ctx.send('Play Even Though I’m Blind Radio Pod Cast');assert.equal(ctx.location.destination,undefined,'Radio playback must stay on the player page');assert.equal(get('audio').lastPlayed,radio.media,'Radio must play its full RSS audio');assert.equal(get('audio').paused,false);
 get('audio').currentTime=35;voice.onBeforeListen();await ctx.send('Play it');get('audio').fire('loadedmetadata');assert.equal(get('audio').lastPlayed,radio.media);assert.equal(get('audio').currentTime,35);assert.equal(ctx.location.destination,undefined);
 await ctx.send('Pause');assert.equal(get('audio').paused,true);get('play').fire('click');await Promise.resolve();assert.equal(get('audio').paused,false);assert.equal(ctx.location.destination,undefined,'Play button must resume Radio audio without redirect');
 await ctx.send('Stop');assert.equal(get('audio').getAttribute('src'),null);await ctx.send('Play it');assert.equal(get('audio').lastPlayed,radio.media);assert.equal(ctx.location.destination,undefined);assert.equal(backendCalls,0,'Prepared generic podcast commands should start immediately');
 await ctx.send('Play Experience with Angela Harris');assert.equal(backendCalls,1,'Specific episode searches must still reach backend');
 await ctx.send('Play Seen Through Sound');assert.equal(get('audio').lastPlayed,seen[0].media);
 voice.onBeforeListen();assert.equal(get('audio').lastPlayed,seen[0].media,'Listening preserves the selected Seen message');await ctx.send('Play it');assert.equal(get('audio').lastPlayed,seen[0].media);
 await ctx.send('Pause');assert.equal(get('audio').paused,true);await ctx.send('Resume');assert.equal(get('audio').lastPlayed,seen[0].media);
 get('audio').fire('ended');await Promise.resolve();assert.equal(get('audio').lastPlayed,seen[1].media,'End must automatically play second message and skip unsafe queue entries');
 get('audio').fire('error');await Promise.resolve();assert.equal(get('audio').lastPlayed,seen[2].media,'Failed message must advance to next valid message');
 get('audio').fire('ended');await Promise.resolve();assert.match(get('media-status').textContent,/Playlist finished/);assert.equal(get('audio').lastPlayed,seen[2].media,'Final message must not loop');
 await ctx.send('Play Seen Through Sound');await ctx.send('Stop');get('audio').fire('ended');assert.equal(get('audio').getAttribute('src'),null,'Stop cancels automatic advancement');assert.match(get('media-status').textContent,/Stopped/);
 await ctx.send('Play Seen Through Sound');await ctx.send('Play Even Though I’m Blind Experience');get('audio').fire('ended');await Promise.resolve();assert.equal(get('audio').lastPlayed,experience.media,'Switching to another source must clear Seen playlist');
 const before=voiceAborts;doc.visibilityState='hidden';documentEvents.visibilitychange?.();assert.equal(voiceAborts,before,'Transient permission dialogs must not immediately abort voice');windowEvents.pageshow({persisted:true});assert.equal(voiceAborts,before+1);assert.match(get('voice-status').textContent,/Ready/);
 console.log('PASS: Seen playlist advances, pause/resume preserve queue, cue does not advance, failures and unsafe entries are skipped, Stop/source switch cancel, final message does not loop.');
 console.log('PASS: shared audio activation, latest full Experience, preview fallback, Radio full native playback and controls without Spotify navigation, Play it restores episode and position, specific searches.');
})().catch(e=>{console.error(e);process.exitCode=1});

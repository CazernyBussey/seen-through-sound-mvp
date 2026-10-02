const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(options={}){
 let handler,nextTimer=0;
 const timers=new Map(),recognizers=[],requests=[],feedback=[];
 const context=vm.createContext({setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},navigator:{get audioSession(){throw Error('Must not change audio routing')}}});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),context);
 class Speech{constructor(){if(options.constructorError)throw Error('unavailable');recognizers.push(this)}start(){if(options.startError)throw Error('start failed')}stop(){this.stops=(this.stops||0)+1;if(options.syncEnd)this.onend?.()}abort(){this.aborts=(this.aborts||0)+1;this.onend?.()}}
 const button={setAttribute(k,v){this[k]=v},addEventListener(type,fn){handler=fn}};
 const controller=context.createVoiceInput({Speech:options.unsupported?null:Speech,button,feedback:t=>feedback.push(t),onRequest:t=>requests.push(t),onBeforeListen(){},onUnavailable(){}});
 return {button,controller,requests,feedback,recognizers,timers,click:()=>handler(),tick(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn()}},get r(){return recognizers.at(-1)}};
}
const result=(text,final=false)=>({results:[Object.assign([{transcript:text}],{isFinal:final})]});
let v=setup();v.click();v.r.onstart();v.r.onresult(result('Play ETIB Radio',true));assert.equal(v.r.stops,1);assert.equal(v.requests.length,0);v.r.onaudioend();assert.deepEqual(v.requests,['Play ETIB Radio']);assert.equal(v.button.textContent,'Speak now');assert.equal(v.timers.size,0);
v=setup();v.click();v.r.onstart();v.r.onresult(result('play'));v.r.onresult(result('play the latest Experience podcast'));v.tick(650);assert.equal(v.r.stops,1);v.tick(500);assert.deepEqual(v.requests,['play the latest Experience podcast']);assert.equal(v.r.aborts,1,'Missing end recovery must release capture');
v=setup();v.click();v.r.onstart();v.r.onresult(result('play music'));const timer=[...v.timers].find(([,t])=>t.ms===650)[0];v.r.onresult(result('play music'));assert.ok(v.timers.has(timer),'Identical interim text must not keep extending listening');v.tick(650);v.tick(500);assert.equal(v.requests.length,1);
v=setup();v.click();v.r.onstart();v.r.onresult(result('Play Seen Through Sound'));v.click();assert.equal(v.r.stops,1,'Done speaking submits instead of cancels');v.r.onend();assert.deepEqual(v.requests,['Play Seen Through Sound']);
v=setup();v.click();v.r.onstart();v.r.onspeechend();v.r.onresult(result('Take me to ETIB Facebook',true));v.r.onend();assert.deepEqual(v.requests,['Take me to ETIB Facebook'],'A final result arriving after speechend must still be used');
v=setup();v.click();v.r.onstart();v.tick(8000);v.tick(500);assert.equal(v.controller.isListening(),false);assert.equal(v.button.textContent,'Speak now');assert.match(v.feedback.at(-1),/No speech received/);
v=setup();v.click();v.tick(10000);assert.equal(v.button.textContent,'Speak now');assert.equal(v.requests.length,0);
v=setup();v.click();v.r.onstart();const lateEnd=v.r.onend,lateError=v.r.onerror;v.controller.abort();v.click();assert.equal(v.recognizers.length,2,'Use a fresh recognizer after reset');v.r.onstart();lateEnd();lateError({error:'no-speech'});assert.equal(v.controller.isListening(),true,'Stale events must not finish a newer capture');v.r.onresult(result('play music',true));v.tick(500);assert.deepEqual(v.requests,['play music']);
v=setup({syncEnd:true});v.click();v.r.onstart();v.r.onresult(result('pause',true));assert.deepEqual(v.requests,['pause']);assert.equal(v.timers.size,0,'Synchronous end must not leave a recovery timer');
for(const error of ['not-allowed','service-not-allowed','audio-capture','network','no-speech']){v=setup();v.click();v.r.onerror({error});assert.equal(v.button.textContent,'Speak now');assert.equal(v.requests.length,0);assert.match(v.feedback.at(-1),/Microphone|Speech|speech|voice/i);}
for(const options of [{unsupported:true},{constructorError:true},{startError:true}]){v=setup(options);v.click();assert.equal(v.button.textContent,'Speak now');assert.equal(v.requests.length,0);assert.match(v.feedback.at(-1),/suggestion/i);}
v=setup();v.controller.setBusy(true);v.click();assert.equal(v.recognizers.length,0);v.controller.setBusy(false);v.click();v.r.onresult(result('play music'));v.controller.abort();assert.equal(v.requests.length,0,'Cancel must discard captured text');
v=setup();v.click();v.r.onstart();v.r.onresult(result('Play Even Though I’m Blind Radio'));v.r.onspeechend();v.tick(650);assert.equal(v.r.stops,undefined,'Allow the podcast suffix after a long radio name and a short pause');v.r.onresult(result('Play Even Though I’m Blind Radio Podcast',true));v.r.onend();assert.deepEqual(v.requests,['Play Even Though I’m Blind Radio Podcast']);
console.log('PASS: final/interim triggers, identical interim events, manual Done speaking, late final results, 8-second cap, startup timeout, missing/synchronous end, stale events, cancellation and microphone failures.');

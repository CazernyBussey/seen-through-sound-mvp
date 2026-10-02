const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const modes=[];let timerId=0;const timers=new Map();
function setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;}
function clearTimeout(id){timers.delete(id);}
function tick(delay){for(const [id,timer] of [...timers])if(timer.delay===delay){timers.delete(id);timer.fn();}}
const context=vm.createContext({setTimeout,clearTimeout,navigator:{audioSession:{set type(value){modes.push(value)},get type(){return modes.at(-1)}}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),context);
function setup(supported=true){
 let handler, recognition;
 class Speech {constructor(){recognition=this;}start(){this.starts=(this.starts||0)+1;}abort(){this.aborts=(this.aborts||0)+1;}}
 const button={textContent:'',disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(type,fn){handler=fn;}};
 const requests=[],feedback=[],cues=[];
 const controller=context.createVoiceInput({Speech:supported?Speech:null,button,feedback:text=>feedback.push(text),onRequest:text=>{requests.push(text)},onBeforeListen:()=>{},onUnavailable:()=>{},onListening:()=>cues.push('ready')});
 return {button,controller,requests,feedback,cues,click:()=>handler(),get recognition(){return recognition;}};
}
let v=setup();v.click();assert.equal(modes.at(-1),'auto');assert.equal(v.cues.length,0,'No ready cue before capture starts');v.recognition.onstart();assert.equal(v.cues.length,1);assert.equal(v.controller.isListening(),true);
v.recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'Play ETIB Radio'}],{isFinal:true})]});
assert.deepEqual(v.requests,[],'Do not run actions while microphone is still capturing');
v.recognition.onend();assert.equal(modes.at(-1),'auto');assert.deepEqual(v.requests,['Play ETIB Radio']);assert.equal(v.button.attributes['aria-pressed'],'false');
v.controller.setBusy(true);v.click();assert.equal(v.recognition.starts,1,'Do not silently lose a new request while an answer is pending');v.controller.setBusy(false);
v.click();v.recognition.onstart();v.recognition.onresult({results:[[{transcript:'Take me to ETIB Facebook'}]]});v.click();v.recognition.onend();assert.equal(v.requests.length,1,'Cancel must not execute a partially captured command');
for(const error of ['not-allowed','audio-capture','network','no-speech']){v=setup();v.click();v.recognition.onerror({error});v.recognition.onend();assert.equal(v.requests.length,0);assert.match(v.feedback.at(-1),/microphone|speech|dictation/i);assert.equal(v.button.textContent,'Speak now');}
v=setup();v.click();v.recognition.onstart();v.recognition.onend();assert.match(v.feedback.at(-1),/No request was heard/);
v=setup(false);v.click();assert.match(v.feedback.at(-1),/voice assistant in Help and options/);
v=setup();v.click();v.controller.abort();assert.equal(modes.at(-1),'auto','Cancellation restores media routing');
v=setup();v.recognition.start=()=>{throw Error('unavailable')};v.click();assert.equal(modes.at(-1),'auto','Failed startup restores media routing');
console.log('Voice input tests passed: capture completion, command dispatch, cancellation, pending requests, denied/unavailable microphone, no speech, unsupported browser.');

const unavailableButton={setAttribute(){},addEventListener(type,fn){this.click=fn}};const messages=[];context.createVoiceInput({Speech:class{constructor(){throw new Error('unavailable')}},button:unavailableButton,feedback:t=>messages.push(t),onUnavailable(){},onBeforeListen(){},onRequest(){throw Error('must not submit')}});unavailableButton.click();assert.match(messages[0],/does not support/);


// Safari may provide only interim text or omit the end event after stop.
v=setup();v.click();v.recognition.onstart();v.recognition.onresult({results:[Object.assign([{transcript:'play radio'}],{isFinal:false})]});tick(1100);assert.equal(v.requests.length,0);tick(800);assert.deepEqual(v.requests,['play radio']);assert.equal(v.controller.isListening(),false);v.recognition.onend();assert.equal(v.requests.length,1,'Late end must not duplicate a command');
v=setup();v.click();v.recognition.onstart();tick(20000);tick(800);assert.equal(v.button.textContent,'Speak now');assert.equal(v.requests.length,0);
v=setup();v.click();v.recognition.onstart();v.recognition.onresult({results:[Object.assign([{transcript:'play'}],{isFinal:false})]});v.recognition.onresult({results:[Object.assign([{transcript:'play radio'}],{isFinal:false})]});tick(1100);tick(800);assert.deepEqual(v.requests,['play radio'],'Interim revisions replace prior text');
console.log('Safari recovery checks passed: interim-only speech, missing end event, bounded listening, no duplicate dispatch.');

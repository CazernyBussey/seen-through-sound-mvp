const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let options,beeps=0,releases=0,requests=[],listener,timers=new Map(),id=0,volume,closed=0,releaseClose;
const button={setAttribute(){},addEventListener(k,f){listener=f}},feedback=[];
const ctx=vm.createContext({setTimeout(fn){timers.set(++id,fn);return id},clearTimeout(id){timers.delete(id)}});
vm.runInContext(fs.readFileSync('managed-voice.js','utf8'),ctx);
const session={setVolume(v){volume=v.volume},endSession(){closed++;return new Promise(resolve=>releaseClose=resolve)}};
const Conversation={startSession(o){options=o;return new Promise(()=>{})}};
const input=ctx.createManagedVoiceInput({Conversation,button,feedback:s=>feedback.push(s),onRequest:s=>requests.push(s),onBeforeListen(){},onListening(){beeps++},onRelease(){releases++}});
const tick=()=>new Promise(setImmediate);
(async()=>{
 listener();options.onConversationCreated(session);assert.equal(volume,0);options.onConnect();options.onConnect();
 // Duplicate connect callbacks must not sound twice (SDK normally calls once).
 assert.equal(beeps,1);options.onMessage({source:'ai',message:'Ready'});assert.equal(requests.length,0);
 options.onMessage({source:'user',message:'Play Even Though I am Blind Radio Podcast'});
 options.onMessage({source:'user',message:'Play Experience'});assert.equal(requests.length,0,'Wait for microphone release before playback');releaseClose();await tick();assert.deepEqual(requests,['Play Even Though I am Blind Radio Podcast']);assert.equal(closed,1);assert.equal(releases,1);assert.equal(input.isListening(),false);
 const stale=options;listener();options.onConnect();const timeout=[...timers.values()][0];timeout();await tick();assert.equal(input.isListening(),false);assert.equal(button.disabled,false);stale.onMessage({source:'user',message:'Late'});assert.equal(requests.length,1);
 listener();const canceled=options;await input.abort();canceled.onConversationCreated({setVolume(){},endSession(){closed++;return Promise.resolve()}});await tick();assert.equal(closed,2);assert.equal(input.isListening(),false);
 listener();options.onError('denied');await tick();assert.equal(button.disabled,false);assert.match(feedback.at(-1),/Microphone/);
 console.log('Managed voice lifecycle passed: single cue, final-only dispatch, release before playback, timeout, cancellation, late callbacks, denial.');
})().catch(e=>{console.error(e);process.exit(1)});

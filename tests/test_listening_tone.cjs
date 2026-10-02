const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),ctx);
let state='running',resume,starts=[],stops=[],gains=[];
class AudioContext{
 constructor(){this.state=state;this.currentTime=12;this.destination={};}
 resume(){return new Promise(resolve=>{resume=()=>{this.state='running';resolve()}})}
 createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(at){starts.push(at)},stop(at){stops.push(at)}}}
 createGain(){return{gain:{setValueAtTime(value,at){gains.push({value,at})},linearRampToValueAtTime(value,at){gains.push({value,at})}},connect(){},disconnect(){}}}
}
(async()=>{
 const tone=ctx.createListeningTone(AudioContext);
 tone.arm();assert.equal(starts.length,0,'Arming does not signal that capture has started');tone.play();tone.play();assert.equal(starts.length,1,'Exactly one start tone');assert.equal(stops[0],12.17);assert.ok(gains.some(x=>x.value===.4));
 tone.cancel();assert.equal(starts.length,1,'Cancellation has no end tone');tone.arm();tone.play();assert.equal(starts.length,2,'Next request gets its own start tone');
 state='suspended';const delayed=ctx.createListeningTone(AudioContext);delayed.arm();delayed.play();delayed.cancel();resume();await new Promise(setImmediate);assert.equal(starts.length,2,'Canceled resume must not sound later');
 const missing=ctx.createListeningTone(null);missing.arm();missing.play();missing.cancel();
 const failed=ctx.createListeningTone(class{constructor(){throw Error('Audio unavailable')}});failed.arm();failed.play();failed.cancel();
 console.log('PASS: one audible-envelope start cue, no end cue, cancellation of delayed audio, repeated requests and unavailable audio recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),ctx);
let speech,click,requests=0,abortCalls=0;
class Speech{constructor(){speech=this}start(){}stop(){}abort(){abortCalls++}}
const button={setAttribute(){},addEventListener(_,fn){click=fn}};
ctx.createVoiceInput({Speech,button,feedback(){},onBeforeListen(){},onUnavailable(){},onListening(){throw Error('cue failed')},onRelease(){throw Error('cue cleanup failed')},onRequest(){assert.equal(abortCalls,1,'Release capture before playback');requests++}});
click();speech.onstart();speech.onresult({results:[Object.assign([{transcript:'Play ETIB Radio'}],{isFinal:true})]});
assert.equal(requests,1,'Final text dispatches immediately despite cue failure');assert.equal(button.disabled,false);assert.equal(button.textContent,'Speak now');
console.log('PASS: failed start cue and cleanup cannot block microphone release or immediate command dispatch.');

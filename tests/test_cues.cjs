const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),ctx);
let speech,click,requests=0,stopCalls=0;
class Speech{constructor(){speech=this}start(){}stop(){stopCalls++}abort(){}}
const button={setAttribute(){},addEventListener(_,fn){click=fn}};
ctx.createVoiceInput({Speech,button,feedback(){},onBeforeListen(){},onUnavailable(){},onListening(){throw Error('cue failed')},onAfterListen(){throw Error('End cue must not run')},onRequest(){requests++}});
click();speech.onstart();speech.onresult({results:[Object.assign([{transcript:'Play ETIB Radio'}],{isFinal:true})]});
assert.equal(stopCalls,1);assert.equal(requests,0);
speech.onend();assert.equal(requests,1,'Command runs immediately after capture; no end cue');assert.equal(button.disabled,false);
console.log('Start-only cue checks passed: failed cue cannot block capture, final speech stops capture, immediate dispatch without end tone.');

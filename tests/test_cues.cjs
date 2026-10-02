const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const ctx=vm.createContext({setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../voice.js'),'utf8'),ctx);
 let speech,click,requests=0,stopCalls=0;
 class Speech{constructor(){speech=this}start(){}stop(){stopCalls++}abort(){}}
 const button={setAttribute(){},addEventListener(_,fn){click=fn}};
 ctx.createVoiceInput({Speech,button,feedback(){},onBeforeListen(){},onUnavailable(){},onListening(){throw Error('cue failed')},onAfterListen:()=>new Promise(()=>{}),onRequest(){requests++}});
 click();speech.onstart();speech.onresult({results:[Object.assign([{transcript:'Play ETIB Radio'}],{isFinal:true})]});
 assert.equal(stopCalls,1,'Final recognition explicitly stops capture');
 assert.equal(requests,0,'Wait until capture has ended');
 speech.onend();assert.equal(button.disabled,true);
 await new Promise(r=>setTimeout(r,450));
 assert.equal(requests,1,'An unresolved end tone cannot block the command');
 assert.equal(button.disabled,false,'Control recovers after unavailable audio cue');
 console.log('Cue regression checks passed: failed start tone, unresolved end tone, capture stop, command dispatch and control recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});

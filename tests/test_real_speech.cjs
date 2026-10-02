// Explicit integration test: public synthetic speech, real connected ASR.
const {execFileSync}=require('node:child_process'),fs=require('node:fs'),WebSocket=require('ws'),assert=require('node:assert/strict');
const cases=[['Play Even Though I am Blind Radio','radio'],['Play Even Though I am Blind Radio Podcast','radio_podcast'],['Play Even Though I am Blind Experience','experience'],['Play Seen Through Sound','seen']];
async function hear(text){
 const pcm=execFileSync('ffmpeg',['-v','error','-f','lavfi','-i',`flite=text='${text}':voice=slt`,'-ar','16000','-ac','1','-f','s16le','pipe:1']);
 return new Promise((resolve,reject)=>{let interval;const ws=new WebSocket('wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_4101m3yxcvtrexwvrbt19h2kqyfp','convai',{headers:{Origin:'https://talk-to-etib.onrender.com'}});const timer=setTimeout(()=>done(new Error('ASR timeout')),20000);
 function done(error,text){clearTimeout(timer);clearInterval(interval);ws.close();error?reject(error):resolve(text);}
 ws.on('open',()=>ws.send(JSON.stringify({type:'conversation_initiation_client_data',source_info:{source:'js_sdk',version:'1'}})));
 ws.on('error',e=>done(e));ws.on('close',(code,reason)=>{if(code!==1000)done(new Error('Closed '+code+' '+reason))});
 ws.on('message',raw=>{const e=JSON.parse(raw);if(e.type==='ping')ws.send(JSON.stringify({type:'pong',event_id:e.ping_event.event_id}));if(e.type==='conversation_initiation_metadata'){let offset=0;const audio=Buffer.concat([pcm,Buffer.alloc(16000*2*3)]);interval=setInterval(()=>{if(offset>=audio.length){clearInterval(interval);return;}ws.send(JSON.stringify({user_audio_chunk:audio.subarray(offset,offset+640).toString('base64')}));offset+=640;},20);}if(e.type==='user_transcript')done(null,e.user_transcription_event.user_transcript);});
 });
}
(async()=>{for(const [command,category] of cases){const transcript=await hear(command);const response=await fetch('https://talk-to-etib.onrender.com/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:transcript,session:{}})}).then(r=>r.json());assert.equal(response.action?.item?.category,category==='radio'?'media':category,JSON.stringify(response));console.log(JSON.stringify({command,transcript,action:response.action.type,category}));}})().catch(e=>{console.error(e);process.exit(1)});

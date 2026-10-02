/* One managed microphone session per request. No agent reply is played. */
function createManagedVoiceInput({Conversation,button,feedback,onRequest,onBeforeListen,onListening,onRelease,onUnavailable}) {
 let active=null,busy=false,releasing=Promise.resolve();
 function reset(){button.disabled=busy;button.textContent='Speak now';button.setAttribute('aria-pressed','false');}
 function close(a){if(!a.session)return releasing;if(!a.closing)a.closing=Promise.resolve(a.session.endSession()).catch(()=>{});releasing=a.closing;return releasing;}
 function abort(){const a=active;if(!a)return releasing;active=null;a.done=true;clearTimeout(a.timer);onRelease?.();reset();return close(a);}
 async function finish(a,message='',error=''){
  if(active!==a||a.done)return;a.done=true;clearTimeout(a.timer);
  button.disabled=true;button.textContent='Opening…';onRelease?.();
  await close(a);
  if(active!==a)return;active=null;reset();
  if(message){feedback('Opening…');onRequest(message);}
  else {feedback(error||'I did not hear a request. Select Speak now to try again.');onUnavailable?.();}
 }
 function start(){
  if(busy)return;if(active){abort();feedback('Ready.');return;}
  if(!Conversation){feedback('Voice connection unavailable. Use the request field in Help and options.');onUnavailable?.();return;}
  onBeforeListen?.();const a={done:false,session:null,timer:null};active=a;
  button.textContent='Cancel listening';button.setAttribute('aria-pressed','true');feedback('Connecting microphone…');
  a.timer=setTimeout(()=>finish(a,'','Microphone could not connect. Select Speak now to retry, or use the request field in Help and options.'),10000);
  Conversation.startSession({
   agentId:'agent_4101m3yxcvtrexwvrbt19h2kqyfp',connectionType:'websocket',useWakeLock:false,
   workletPaths:{rawAudioProcessor:'/rawAudioProcessor.js',audioConcatProcessor:'/audioConcatProcessor.js'},libsampleratePath:'/libsamplerate.worklet.js',
   onConversationCreated:session=>{a.session=session;session.setVolume({volume:0});if(a.done||active!==a)close(a);},
   onConnect:()=>{if(a.done||active!==a||a.connected)return;a.connected=true;clearTimeout(a.timer);feedback('Listening. Speak your request after the tone.');onListening?.();a.timer=setTimeout(()=>finish(a),10000);},
   onMessage:event=>{if(event.source==='user'&&event.message?.trim())finish(a,event.message.trim());},
   onError:()=>finish(a,'','Microphone connection failed. Allow microphone access, then select Speak now to retry. The request field in Help and options also works.'),
   onDisconnect:()=>{if(!a.done)finish(a);}
  }).then(session=>{a.session=session;if(a.done||active!==a)close(a);}).catch(()=>finish(a,'','Microphone could not start. Allow microphone access, then select Speak now to retry.'));
 }
 button.addEventListener('click',start);reset();
 return {abort,setBusy(value){busy=value;reset();},isListening:()=>!!active};
}

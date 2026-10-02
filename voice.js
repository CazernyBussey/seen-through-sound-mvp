'use strict';
// One request per microphone activation. Dispatch only after capture ends, so
// replies or media cannot be captured as a second command.
function createVoiceInput({Speech, button, feedback, onRequest, onBeforeListen, onUnavailable, onListening}) {
 let recognition=null, active=false, starting=false, busy=false, transcript='', failed=false, canceled=false;
 let idleLabel='Speak now', silenceTimer=null, limitTimer=null, endTimer=null, finished=true;
 function clearTimers(){clearTimeout(silenceTimer);clearTimeout(limitTimer);clearTimeout(endTimer);}
 function finish(){if(finished)return;finished=true;clearTimers();const request=transcript.trim();transcript='';reset();if(!canceled&&!failed&&request){feedback('Opening…');onRequest(request);}else if(!canceled&&!failed)feedback('No request was heard. Select Speak now and try again.');}
 function stopCapture(){if(finished)return;clearTimeout(silenceTimer);try{recognition.stop()}catch{}if(finished)return;clearTimeout(endTimer);endTimer=setTimeout(()=>{if(finished)return;try{recognition.abort()}catch{}finish();},800);}
 if(Speech){try{recognition=new Speech();idleLabel='Speak now';}catch{recognition=null;}}
 // Let Safari choose recording and playback routing without forcing a session type.
 function audioMode(type){try{if(typeof navigator!=='undefined'&&navigator.audioSession)navigator.audioSession.type=type;}catch{}}
 function reset(){audioMode('auto');active=false;starting=false;button.textContent=idleLabel;button.setAttribute('aria-pressed','false');button.disabled=busy;}
 function abort(){finished=true;clearTimers();canceled=true;transcript='';if(active||starting){try{recognition.abort()}catch{} }reset();}
 function setBusy(value){busy=value;button.disabled=value;}
 if(recognition){
  recognition.lang='en-US';recognition.interimResults=true;recognition.continuous=false;
  recognition.onstart=()=>{if(finished)return;starting=false;active=true;button.textContent='Stop listening';button.setAttribute('aria-pressed','true');feedback('Listening…');try{onListening?.();}catch{}};
  recognition.onresult=event=>{if(finished||canceled)return;transcript=Array.from(event.results,result=>result[0]?.transcript||'').join(' ').trim();if(!transcript)return;clearTimeout(silenceTimer);if(Array.from(event.results).some(result=>result.isFinal===true))stopCapture();else silenceTimer=setTimeout(stopCapture,1100);};
  recognition.onerror=event=>{if(finished)return;if(canceled&&event.error==='aborted')return;if(transcript.trim()&&['no-speech','aborted'].includes(event.error)){finish();return;}failed=true;const messages={
   'not-allowed':'Microphone access was not allowed. Open this site in Safari or Chrome and allow its microphone. Select Help and options for another voice assistant.',
   'service-not-allowed':'This browser cannot start its speech service. On iPhone, open the site in Safari and check that Siri or Dictation is enabled. Select Help and options for another voice assistant.',
   'audio-capture':'No microphone was available. Check that your device has an enabled microphone, or open the voice assistant in Help and options.',
   'network':'The browser speech service could not connect. Try again, or open the voice assistant in Help and options.',
   'no-speech':'No speech was heard. Select Speak now and try again.',
   'aborted':'Listening stopped. Select Speak now to try again.'};feedback(messages[event.error]||'Speech recognition could not complete. Try again, or open the voice assistant in Help and options.');finish();};
  recognition.onend=finish;
 }
 button.textContent=idleLabel;
 button.addEventListener('click',()=>{
  if(busy)return;
  if(active||starting){abort();feedback('Listening stopped.');return;}
  if(!recognition){feedback('This browser does not support microphone requests here. Open the site in Safari or Chrome, or open the voice assistant in Help and options.');onUnavailable();return;}
  clearTimers();finished=false;transcript='';failed=false;canceled=false;starting=true;button.textContent='Cancel listening';button.setAttribute('aria-pressed','true');onBeforeListen();feedback('Starting microphone…');
  try{audioMode('auto');recognition.start();if(!finished)limitTimer=setTimeout(stopCapture,20000);}catch{finished=true;clearTimers();reset();failed=true;feedback('The microphone could not start. Open this site in Safari or Chrome, or open the voice assistant in Help and options.');}
 });
 return {abort,setBusy,isListening:()=>active};
}



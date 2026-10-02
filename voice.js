'use strict';
// One request per microphone activation. Dispatch only after capture ends, so
// replies or media cannot be captured as a second command.
function createVoiceInput({Speech, button, feedback, onRequest, onBeforeListen, onUnavailable}) {
 let recognition=null, active=false, starting=false, busy=false, transcript='', failed=false, canceled=false;
 let idleLabel='Speak now';
 if(Speech){try{recognition=new Speech();idleLabel='Speak now';}catch{recognition=null;}}
 // Release capture audio mode before dispatching media commands (Safari/iOS).
 function audioMode(type){try{if(typeof navigator!=='undefined'&&navigator.audioSession)navigator.audioSession.type=type;}catch{}}
 function reset(){audioMode('playback');active=false;starting=false;button.textContent=idleLabel;button.setAttribute('aria-pressed','false');button.disabled=busy;}
 function abort(){canceled=true;transcript='';if(active||starting){try{recognition.abort()}catch{} }reset();}
 function setBusy(value){busy=value;button.disabled=value;}
 if(recognition){
  recognition.lang='en-US';recognition.interimResults=false;recognition.continuous=false;
  recognition.onstart=()=>{starting=false;active=true;button.textContent='Stop listening';button.setAttribute('aria-pressed','true');feedback('Listening. Say a request, such as Play ETIB Radio.');};
  recognition.onresult=event=>{for(let i=event.resultIndex||0;i<event.results.length;i++){if(event.results[i].isFinal!==false)transcript+=event.results[i][0].transcript+' ';}};
  recognition.onerror=event=>{if(canceled&&event.error==='aborted')return;failed=true;const messages={
   'not-allowed':'Microphone access was not allowed. Open this site in Safari or Chrome and allow its microphone. Select Help and options for another voice assistant.',
   'service-not-allowed':'This browser cannot start its speech service. On iPhone, open the site in Safari and check that Siri or Dictation is enabled. Select Help and options for another voice assistant.',
   'audio-capture':'No microphone was available. Check that your device has an enabled microphone, or open the voice assistant in Help and options.',
   'network':'The browser speech service could not connect. Try again, or open the voice assistant in Help and options.',
   'no-speech':'No speech was heard. Select Speak now and try again.',
   'aborted':'Listening stopped. Select Speak now to try again.'};feedback(messages[event.error]||'Speech recognition could not complete. Try again, or open the voice assistant in Help and options.');};
  recognition.onend=()=>{const request=transcript.trim();transcript='';reset();if(!canceled&&!failed&&request){feedback('Heard: '+request+'. Running your request.');onRequest(request);}else if(!canceled&&!failed)feedback('No request was heard. Select Speak now and try again.');};
 }
 button.textContent=idleLabel;
 button.addEventListener('click',()=>{
  if(busy)return;
  if(active||starting){canceled=true;transcript='';try{recognition.abort()}catch{}reset();feedback('Listening stopped.');return;}
  if(!recognition){feedback('This browser does not support microphone requests here. Open the site in Safari or Chrome, or open the voice assistant in Help and options.');onUnavailable();return;}
  transcript='';failed=false;canceled=false;starting=true;button.textContent='Cancel listening';button.setAttribute('aria-pressed','true');onBeforeListen();feedback('Starting microphone. Allow microphone access if your browser asks.');
  try{audioMode('play-and-record');recognition.start()}catch{reset();failed=true;feedback('The microphone could not start. Open this site in Safari or Chrome, or open the voice assistant in Help and options.');}
 });
 return {abort,setBusy};
}


'use strict';
// A fresh recognizer for every request. No shared audio-session settings.
function createVoiceInput({Speech,button,feedback,onRequest,onBeforeListen,onUnavailable,onListening}) {
 let current=null,busy=false,serial=0;
 function reset(){button.textContent='Speak now';button.setAttribute('aria-pressed','false');button.disabled=busy;}
 function clear(attempt){for(const id of attempt.timers.values())clearTimeout(id);attempt.timers.clear();}
 function later(attempt,key,fn,delay){clearTimeout(attempt.timers.get(key));attempt.timers.set(key,setTimeout(()=>{attempt.timers.delete(key);if(current===attempt)fn();},delay));}
 function detach(attempt){const r=attempt.recognition;r.onstart=r.onaudiostart=r.onresult=r.onspeechend=r.onsoundend=r.onaudioend=r.onend=r.onerror=null;}
 function finish(attempt,submit=true){
  if(current!==attempt)return;
  clear(attempt);detach(attempt);current=null;
  try{if(!attempt.ended)attempt.recognition.abort();}catch{}
  reset();
  const text=attempt.transcript.trim();
  if(submit&&text){feedback('Opening…');onRequest(text);}
  else if(submit)feedback('No speech received. Try Speak now, or choose a suggestion.');
 }
 function stopCapture(attempt){
  if(current!==attempt||attempt.stopping)return;
  attempt.stopping=true;clear(attempt);button.textContent='Finishing request';feedback('Finishing…');
  // Set recovery before stop(): Safari may fire end synchronously or omit it.
  later(attempt,'release',()=>finish(attempt),1500);
  try{attempt.recognition.stop();}catch{finish(attempt);}
 }
 function abort(){if(current)finish(current,false);else reset();}
 function setBusy(value){busy=value;button.disabled=value;if(!current)reset();}
 // Leave room for the final word in a long project name, especially Radio Podcast.
 function silenceDelay(text){return /\b(even|though|blind|experience|radio)\b/i.test(text)&&! /\bpod\s*cast\b/i.test(text)?1400:650;}
 function start(){
  if(busy)return;
  if(current){stopCapture(current);return;}
  if(!Speech){feedback('Microphone requests need Safari or Chrome. Choose a suggestion or open the voice assistant in Help and options.');onUnavailable?.();return;}
  let recognition;
  try{recognition=new Speech();}catch{feedback('Microphone unavailable. Choose a suggestion or open Help and options.');reset();return;}
  const attempt={id:++serial,recognition,transcript:'',stopping:false,ended:false,started:false,final:false,timers:new Map()};current=attempt;
  recognition.lang='en-US';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
  function started(){if(current!==attempt||attempt.started||attempt.stopping)return;attempt.started=true;clearTimeout(attempt.timers.get('startup'));button.textContent='Done speaking';button.setAttribute('aria-pressed','true');try{onListening?.();}catch{}feedback('Listening. Say your request.');later(attempt,'limit',()=>stopCapture(attempt),8000);}
  recognition.onstart=started;recognition.onaudiostart=started;
  recognition.onresult=event=>{
   if(current!==attempt)return;
   const results=Array.from(event.results);const text=results.map(r=>r[0]?.transcript||'').join(' ').trim();
   const changed=text!==attempt.transcript;if(text)attempt.transcript=text;
   attempt.final=results.length>0&&results.every(r=>r.isFinal===true);
   if(attempt.ended&&text){finish(attempt);return;}
   if(attempt.final&&text){stopCapture(attempt);return;}
   // Repeated identical interim events must not postpone the trigger forever.
   if(text&&changed&&!attempt.stopping)later(attempt,'silence',()=>stopCapture(attempt),silenceDelay(text));
  };
  function speechEnded(){if(!attempt.transcript)return;if(silenceDelay(attempt.transcript)>650&&!attempt.stopping){if(!attempt.timers.has('silence'))later(attempt,'silence',()=>stopCapture(attempt),1400);}else stopCapture(attempt);}
  recognition.onspeechend=speechEnded;
  recognition.onsoundend=()=>{if(attempt.transcript)speechEnded();};
  recognition.onaudioend=()=>{if(current!==attempt)return;if(attempt.final&&attempt.transcript){finish(attempt);return;}if(!attempt.stopping)stopCapture(attempt);};
  recognition.onend=()=>{if(current!==attempt)return;attempt.ended=true;if(attempt.transcript)finish(attempt);else{attempt.stopping=true;clear(attempt);button.textContent='Finishing request';feedback('Finishing…');later(attempt,'late-result',()=>finish(attempt),1500);}};
  recognition.onerror=event=>{
   if(current!==attempt)return;
   if(attempt.transcript&&['no-speech','aborted'].includes(event.error)){finish(attempt);return;}
   const messages={
    'not-allowed':'Microphone blocked. Open in Safari and allow microphone access. Suggestions work without it.',
    'service-not-allowed':'Speech service unavailable. In Safari, check Siri or Dictation. Suggestions work without the microphone.',
    'audio-capture':'Microphone unavailable. Choose a suggestion or open Help and options.',
    'network':'Speech service could not connect. Try again or choose a suggestion.',
    'no-speech':'No speech received. Try Speak now, or choose a suggestion.',
    'aborted':'Listening stopped. Speak now is ready.'};
   finish(attempt,false);feedback(messages[event.error]||'Voice unavailable. Try again or choose a suggestion.');
  };
  button.textContent='Done speaking';button.setAttribute('aria-pressed','true');feedback('Starting microphone…');
  later(attempt,'startup',()=>{finish(attempt,false);feedback('Microphone did not start. Choose a suggestion or open Help and options.');},10000);
  function startFailed(){finish(attempt,false);feedback('Microphone could not start. Choose a suggestion or open Help and options.');}
  function begin(){if(current!==attempt||attempt.stopping)return;try{recognition.start();}catch(error){
   // Give a just-aborted Safari capture one short chance to release its service.
   if(error.name==='InvalidStateError')later(attempt,'start-retry',()=>{try{recognition.start();}catch{startFailed();}},150);
   else startFailed();
  }}
  try{const delay=onBeforeListen?.();if(Number.isFinite(delay)&&delay>0)later(attempt,'media-settle',begin,Math.min(delay,1000));else begin();}catch{startFailed();}
 }
 button.addEventListener('click',start);reset();
 return {abort,setBusy,isListening:()=>!!current&&!current.stopping};
}

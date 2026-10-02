'use strict';
const $=id=>document.getElementById(id);
const requestInput={value:'',focus:()=>$('speak').focus()};
let radioItem=null;
fetch('/api/registry').then(r=>r.json()).then(rows=>{const r=rows.find(x=>x.id==='radio');if(r)radioItem={...r,title:r.name,preview:false}}).catch(()=>{});
let session={},selected=null,voiceInput=null,controller=null,busy=false,embedded=false, spotifyController=null, spotifyActive=false, spotifyState="Ready";
const approvedHosts=new Set(['eventhoughimblind.com','eventhoughimblind.wordpress.com','cazernybussey.github.io','zeno.fm','stream.zeno.fm','open.spotify.com','p.scdn.co','podcasts.apple.com','anchor.fm','podcasters.spotify.com','creators.spotify.com','donorbox.org','form.jotform.com','www.facebook.com','www.instagram.com','youtube.com','www.youtube.com','www.tiktok.com','twitter.com','x.com','www.linkedin.com','www.threads.net','www.threads.com','cazernybussey.substack.com','flickr.com','calendly.com','eventhoughimblind.us22.list-manage.com','cfly-ai.zapier.app','eventhoughimblind.zapier.app','elevenlabs.io','www.imperfektlymade.com','eyeslikemine.org','etib-community-connect-1.onrender.com','eepurl.com','a.co','music.amazon.com','www.iheart.com','wrczpnhesorptjzwdizd.supabase.co']);
function safeURL(value,media=false){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(approvedHosts.has(u.hostname)||(media&&(u.hostname.endsWith('.cloudfront.net')||u.hostname.endsWith('.spotify.com')||u.hostname.endsWith('.scdn.co'))))?u.href:null}catch{return null}}
// Restore media routing after microphone use; browsers without this API keep their default.
function playbackMode(){try{if(typeof navigator!=='undefined'&&navigator.audioSession)navigator.audioSession.type='playback';}catch{}}
playbackMode();
// Unlock the short listening cue during the user's Speak gesture.
let listeningCueContext=null;
function prepareListeningCue(){
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  listeningCueContext??=new Context();
  void listeningCueContext.resume().catch(()=>{});
 }catch{}
}
async function microphoneCue(frequency,requireListening=false){
 try{
  const context=listeningCueContext;
  if(!context)return;
  await context.resume();
  if(requireListening&&!voiceInput?.isListening())return;
  await new Promise(resolve=>{
   const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
   let finished=false,timer;
   function finish(){
    if(finished)return;finished=true;clearTimeout(timer);
    try{oscillator.stop();oscillator.disconnect();gain.disconnect();}catch{}
    void context.suspend().catch(()=>{});resolve();
   }
   oscillator.frequency.value=frequency;
   gain.gain.setValueAtTime(0,now);
   gain.gain.linearRampToValueAtTime(0.12,now+0.01);
   gain.gain.linearRampToValueAtTime(0,now+0.12);
   oscillator.connect(gain);gain.connect(context.destination);
   oscillator.onended=finish;
   oscillator.start(now);oscillator.stop(now+0.13);
   timer=setTimeout(finish,350);
  });
 }catch{}
}
function status(text){$('status').textContent=text}
let spokenUtterance=null, speechTimer=null;
function silence(){$('greeting-audio').pause();clearTimeout(speechTimer);spokenUtterance=null;if('speechSynthesis'in window)window.speechSynthesis.cancel()}
function read(text,explicit=false){
 if(!explicit&&!$('read-aloud').checked)return;
 if(!('speechSynthesis'in window)){ $('voice-status').textContent='Spoken output is unavailable in this browser. Your screen reader can read the greeting and answers.';return; }
 if(!text)return;
 silence();if(explicit){voiceInput?.abort();if(selected&&(!$('audio').paused||spotifyActive))pause();}else if(!$('audio').paused||spotifyActive)return;
 playbackMode();
 const utterance=new SpeechSynthesisUtterance(text.slice(0,3500));spokenUtterance=utterance;utterance.lang='en-US';
 const voices=window.speechSynthesis.getVoices();utterance.voice=voices.find(v=>v.lang==='en-US'&&v.localService)||voices.find(v=>v.lang.startsWith('en'))||null;
 utterance.onstart=()=>{clearTimeout(speechTimer);$('voice-status').textContent='Speaking. Use Stop spoken response to stop.'};
 utterance.onend=()=>{if(spokenUtterance!==utterance)return;clearTimeout(speechTimer);spokenUtterance=null;$('voice-status').textContent='Spoken message finished.'};
 utterance.onerror=e=>{if(spokenUtterance!==utterance)return;clearTimeout(speechTimer);spokenUtterance=null;if(!['canceled','interrupted'].includes(e.error))$('voice-status').textContent='Your browser could not speak this message. Try Hear greeting or Read last answer, or use your screen reader.'};
 $('voice-status').textContent='Starting spoken message…';window.speechSynthesis.resume();window.speechSynthesis.speak(utterance);
 speechTimer=setTimeout(()=>{if(spokenUtterance===utterance&&!window.speechSynthesis.speaking)$('voice-status').textContent='Spoken output did not start. Select Hear greeting or Read last answer, check your device volume, or use your screen reader.'},6000);
}
function link(url,label){const a=document.createElement('a');a.href=safeURL(url);a.textContent=label;return a}
function resultCard(item){const card=document.createElement('article');card.className='result';const h=document.createElement('h3');h.textContent=item.title;card.append(h);if(item.date){const p=document.createElement('p');p.className='date';const date=new Date(item.date.length===10?item.date+'T12:00:00':item.date);p.textContent=Number.isNaN(date.getTime())?item.date:date.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'America/New_York'});card.append(p)}if(item.description){const p=document.createElement('p');p.textContent=item.description.slice(0,700);card.append(p)}if(safeURL(item.url))card.append(link(item.url,item.preview?'Listen to the full episode on Spotify':'Open '+item.title));if(item.media&&safeURL(item.media,true)){const button=document.createElement('button');button.type='button';button.textContent=(item.preview?'Play preview: ':'Play: ')+item.title;button.addEventListener('click',()=>load(item));card.append(document.createElement('br'),button)}return card}
function unlockAudio(){if(selected)return;const audio=$('audio');audio.muted=true;audio.src='/greeting.mp3';const priming=audio.play();if(priming?.then)priming.then(()=>{if(!selected){audio.pause();audio.currentTime=0;}audio.muted=false}).catch(()=>{audio.muted=false});}
async function play(){voiceInput?.abort();playbackMode();if(spotifyActive){silence();$('media-status').textContent='Activate Play inside the Spotify player to start or resume this episode.';$('spotify-player').querySelector('iframe')?.focus();return}if(!selected){status('Choose audio first.');return}$('audio').hidden=false;silence();const target=selected;try{await Promise.race([$('audio').play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Playback timeout')),12000))])}catch(e){if(selected!==target||e.name==='AbortError')return;$('media-status').textContent='Playback needs your permission or the source is unavailable. Activate Play, or open the media’s official page.';$('play').focus()}}
function pause(){silence();if(spotifyActive){$('media-status').textContent='Use Pause inside the Spotify player.';$('spotify-player').querySelector('iframe')?.focus();return}if(selected){$('audio').pause();$('media-status').textContent='Paused: '+selected.title}else status('No audio is selected.')}
function stop(){silence();if(spotifyActive){spotifyController?.destroy();spotifyController=null;spotifyActive=false;spotifyState='Stopped';$('spotify-player').replaceChildren(Object.assign(document.createElement('div'),{id:'spotify-mount'}));$('spotify-player').hidden=true;$('audio').hidden=false;}$('audio').pause();if(selected){$('audio').removeAttribute('src');$('audio').load();$('audio').hidden=true;$('play').hidden=false;$('pause').hidden=false;$('media-status').textContent='Stopped: '+selected.title}}
async function load(item){if(spotifyActive)stop();const url=safeURL(item.media,true);if(!url){status('This source cannot play here. Open its official page.');return}voiceInput?.abort();silence();$('audio').pause();selected=item;session.playing_id=item.id;session.last_id=item.id;$('player').hidden=false;$('track').textContent=item.title+(item.preview?' — Spotify preview':'');$('track-link').href=safeURL(item.url);$('audio').hidden=false;$('play').hidden=false;$('pause').hidden=false;$('audio').muted=false;$('audio').src=url;$('media-status').textContent='Loading: '+$('track').textContent;await play()}
function navigate(url){url=safeURL(url);if(!url){status('This destination is not approved.');return}stop();if(embedded){window.parent.postMessage({type:'etib:navigate',url},parentOrigin);status('Opening the requested destination.')}else location.assign(url)}
async function send(message){if(busy)return;message=message.trim();if(!message)return;const command=message.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();if(/^(please )?(pause|stop|resume|unpause)( (it|audio|the radio|the podcast|the episode|the music))?( please)?$/.test(command)){voiceInput?.abort();$('error').textContent='';$('response').hidden=true;$('answer').textContent='';$('results').replaceChildren();if(command.includes('pause')&&!command.includes('unpause'))pause();else if(command.includes('stop'))stop();else{if(selected&&!$('audio').getAttribute('src'))$('audio').src=selected.media;await play()}requestInput.value='';$('voice-status').textContent='Speak now is ready for another request.';return}if(radioItem&&/\b(play|listen|start)\b/.test(command)&&/\bradio\b/.test(command)&&!command.includes('podcast')){voiceInput?.abort();$('error').textContent='';$('response').hidden=true;$('answer').textContent='';$('results').replaceChildren();await load(radioItem);requestInput.value='';$('voice-status').textContent='Speak now is ready for another request.';return}busy=true;voiceInput?.abort();voiceInput?.setBusy(true);controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),45000);$('cancel-request').hidden=false;$('error').textContent='';$('response').hidden=true;$('answer').textContent='';$('results').replaceChildren();$('response').setAttribute('aria-busy','true');status('Opening your request…');silence();
try{const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,session}),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'This request could not be completed.');session=data.session||{};$('answer').textContent=data.text;$('results').replaceChildren(...(data.results||[]).map(resultCard));$('response').hidden=!!data.action&&['play','spotify','pause','resume','stop'].includes(data.action.type);$('read-answer').hidden=false;status('Request ready.');const a=data.action;if(!a||a.type==='navigate'){stop();selected=null;$('player').hidden=true;}if(!a||!['play','spotify','resume','pause','stop'].includes(a.type))read(data.text);if(a?.type==='play')await load(a.item);if(a?.type==='spotify'){if(a.item?.media)await load(a.item);else spotify(a.item);}if(a?.type==='pause')pause();if(a?.type==='resume'){if(selected?.provider==='spotify'&&!selected?.media&&!spotifyActive){spotify(selected)}else{if(selected&&!$('audio').getAttribute('src'))$('audio').src=selected.media;void play()}}if(a?.type==='stop')stop();if(a?.type==='identify'){$('answer').textContent=selected?spotifyActive?'Selected in Spotify: '+selected.title+'. Playback is controlled inside the Spotify player.':($('audio').getAttribute('src')?$('audio').ended?'Finished: ':$('audio').paused?'Paused: ':'Playing: ':'Stopped: ')+selected.title+(selected.preview?' — preview':''):'Nothing is playing.';read($('answer').textContent)}if(a?.type==='navigate')navigate(a.url);
}catch(e){$('error').textContent=e.name==='AbortError'?'Request canceled or timed out. Select Speak now to try again.':'Could not retrieve an answer. '+e.message;status('Ready to try again.');requestInput.focus()}finally{clearTimeout(timer);busy=false;voiceInput?.setBusy(false);controller=null;$('cancel-request').hidden=true;$('response').removeAttribute('aria-busy');requestInput.value='';if(!$('error').textContent)$('voice-status').textContent='Speak now is ready for another request.';$('speak').focus();}}
$('cancel-request').addEventListener('click',()=>controller?.abort());$('play').addEventListener('click',()=>{if(selected?.provider==='spotify'&&!selected?.media&&!spotifyActive){spotify(selected);return}if(selected&&!$('audio').getAttribute('src'))$('audio').src=selected.media;play()});$('pause').addEventListener('click',pause);$('stop').addEventListener('click',stop);$('silence').addEventListener('click',()=>{silence();$('voice-status').textContent='Spoken message stopped.'});$('read-aloud').addEventListener('change',()=>{if(!$('read-aloud').checked)silence();else read($('answer').textContent||$('greeting').textContent,true)});$('clear').addEventListener('click',()=>{controller?.abort();stop();session={};selected=null;$('results').replaceChildren();$('answer').textContent='';$('response').hidden=true;$('read-answer').hidden=true;$('player').hidden=true;status('Conversation cleared.');requestInput.focus()});
$('audio').addEventListener('playing',()=>{$('media-status').textContent='Playing: '+$('track').textContent});$('audio').addEventListener('pause',()=>{if(selected&&!$('audio').ended&&$('audio').getAttribute('src'))$('media-status').textContent='Paused: '+$('track').textContent});$('audio').addEventListener('ended',()=>{$('media-status').textContent='Finished: '+$('track').textContent});$('audio').addEventListener('error',()=>{if(selected&&$('audio').getAttribute('src')){$('media-status').textContent='Audio could not be loaded. Try Play or open the official media page.'}});
const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
voiceInput=createVoiceInput({Speech,button:$('speak'),feedback:text=>{$('voice-status').textContent=text},onRequest:message=>{requestInput.value=message;send(message)},onListening:()=>{void microphoneCue(880,true)},onAfterListen:()=>microphoneCue(440),onBeforeListen:()=>{unlockAudio();silence();if(selected&&(!$('audio').paused||spotifyActive))pause();prepareListeningCue()},onUnavailable:()=>{requestInput.focus()}});
$('greet').addEventListener('click',()=>{voiceInput?.abort();silence();if(selected&&(!$('audio').paused||spotifyActive))pause();playbackMode();const audio=$('greeting-audio');audio.hidden=false;audio.currentTime=0;audio.play().catch(()=>{$('voice-status').textContent='Greeting playback could not start. Use Play in the greeting audio controls, or check your device volume.';audio.focus()})});
$('greeting-audio').addEventListener('playing',()=>{$('voice-status').textContent='Playing greeting. Use Stop spoken response to stop.'});
$('greeting-audio').addEventListener('ended',()=>{$('voice-status').textContent='Greeting finished. Select Speak now to tell ETIB what to open or play.'});
$('read-answer').addEventListener('click',()=>read($('answer').textContent,true));
if('speechSynthesis'in window)window.speechSynthesis.getVoices();
else{$('read-aloud').disabled=true;$('read-answer').disabled=true;$('silence').hidden=true;}
const allowedParents=new Set([location.origin,'https://eventhoughimblind.com','https://eventhoughimblind.wordpress.com']);
window.addEventListener('message',e=>{if(!allowedParents.has(e.origin)||e.source!==window.parent)return;if(e.data?.type==='etib:initialize'){embedded=true;parentOrigin=e.origin;$('close').hidden=false;requestInput.focus()}if(e.data?.type==='etib:stop'){stop();voiceInput?.abort()}});
let parentOrigin=location.origin;
$('close').addEventListener('click',()=>{stop();silence();window.parent.postMessage({type:'etib:close'},parentOrigin)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&embedded){e.preventDefault();$('close').click()}});
if(window.parent!==window)window.parent.postMessage({type:'etib:ready'},new URL(document.referrer||location.href).origin);
window.addEventListener('pagehide',()=>{stop();silence();voiceInput?.abort();$('audio').pause()});

function spotify(item){
 voiceInput?.abort();playbackMode();
 const url=safeURL(item.url);if(!url||!/^https:\/\/open\.spotify\.com\/episode\/[A-Za-z0-9]+$/.test(url)){status('Use the official episode link to listen.');return}
 stop();selected={...item,provider:'spotify',preview:false};session.playing_id=item.id;session.last_id=item.id;spotifyActive=true;spotifyState='Selected in Spotify';$('play').hidden=true;$('pause').hidden=true;$('player').hidden=false;$('audio').hidden=true;$('track').textContent=item.title+' — Spotify player';$('track-link').href=url;$('spotify-player').hidden=false;$('media-status').textContent='Use Play inside the Spotify player. Spotify may provide only a preview here. The full episode link is above.';
 const frame=document.createElement('iframe');frame.src='https://open.spotify.com/embed/episode/'+new URL(url).pathname.split('/').pop();frame.title='Spotify player: '+item.title;frame.width='100%';frame.height='232';frame.setAttribute('allow','autoplay; encrypted-media');frame.addEventListener('load',()=>{if(spotifyActive)frame.focus()});$('spotify-player').replaceChildren(frame);
}


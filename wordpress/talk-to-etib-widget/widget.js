'use strict';
(()=>{
 const script=document.currentScript;
 if(window.etibWidgetLoaded)return;window.etibWidgetLoaded=true;
 const appOrigin='https://talk-to-etib.onrender.com';
 const launchers=[...document.querySelectorAll('[data-etib-launcher]')];
 if(!launchers.length)return;
 const top=document.querySelector('[data-etib-top]');
 const header=document.querySelector('.site-header');
 if(top&&header&&header.parentNode)header.insertAdjacentElement('afterend',top);
 const panel=document.createElement('section');panel.id='etib-widget-panel';panel.className='etib-widget-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','etib-widget-title');panel.setAttribute('aria-modal','false');
 const bar=document.createElement('div');bar.className='etib-widget-toolbar';
 const heading=document.createElement('h2');heading.id='etib-widget-title';heading.textContent='Talk to ETIB';
 const minimize=document.createElement('button');minimize.type='button';minimize.textContent='Minimize';
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close Talk to ETIB and stop audio');
 const frame=document.createElement('iframe');frame.title='Talk to ETIB';frame.allow='microphone; autoplay';frame.id='etib-widget-frame';
 bar.append(heading,minimize,close);panel.append(bar,frame);document.body.append(panel);
 let loaded=false,ready=false,expanded=false,previous=null,playing=false;
 const dock=document.querySelector('[data-etib-bottom]');
 const feedback=dock?.querySelector('[data-etib-feedback]');
 const pauseButton=dock?.querySelector('[data-etib-pause]');const stopButton=dock?.querySelector('[data-etib-stop]');
 function post(type,more={}){if(loaded)frame.contentWindow.postMessage({type,...more},appOrigin);}
 function setExpanded(value){expanded=value;panel.classList.toggle('etib-widget-minimized',!value);frame.tabIndex=value?0:-1;frame.setAttribute('aria-hidden',String(!value));bar.hidden=!value;panel.setAttribute('role',value?'dialog':'presentation');for(const b of launchers)b.setAttribute('aria-expanded',String(value));}
 function open(){previous=document.activeElement;panel.hidden=false;setExpanded(true);if(!loaded){loaded=true;frame.src=appOrigin+'/';}if(ready)post('etib:initialize');minimize.focus();}
 function hide(stopAudio=false){post(stopAudio?'etib:stop':'etib:minimize');setExpanded(false);if(stopAudio){panel.hidden=true;if(feedback)feedback.textContent='Ready.';if(pauseButton)pauseButton.hidden=true;if(stopButton)stopButton.hidden=true;}else if(feedback)feedback.textContent='Minimized. Audio can continue.';(previous||launchers[0]).focus();}
 launchers.forEach(b=>{b.setAttribute('aria-controls',panel.id);b.setAttribute('aria-expanded','false');b.addEventListener('click',e=>{e.preventDefault();open();});});
 minimize.addEventListener('click',()=>hide());close.addEventListener('click',()=>hide(true));
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hide();}});
 pauseButton?.addEventListener('click',()=>post('etib:command',{command:playing?'pause':'resume'}));stopButton?.addEventListener('click',()=>post('etib:command',{command:'stop'}));
 function approved(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')return false;if(u.origin==='https://eventhoughimblind.com')return true;if(u.origin==='https://etib-community-connect-1.onrender.com'&&u.pathname==='/index.html')return [...u.searchParams.keys()].every(k=>['q','group'].includes(k))&&(!u.searchParams.has('group')||['media','business'].includes(u.searchParams.get('group')));return false;}catch{return false;}}
 window.addEventListener('message',async e=>{
  if(e.origin!==appOrigin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='etib:ready'){ready=true;if(expanded)post('etib:initialize');}
  if(e.data?.type==='etib:close')hide(true);
  if(e.data?.type==='etib:minimized')hide();
  if(e.data?.type==='etib:playback'){if(feedback)feedback.textContent=String(e.data.text||'Ready.').slice(0,250);playing=!!e.data.playing;if(pauseButton){pauseButton.hidden=!e.data.selected;pauseButton.textContent=playing?'Pause audio':'Resume audio';}if(stopButton)stopButton.hidden=!e.data.selected;}
  if(e.data?.type==='etib:navigate'){
   const value=e.data.url;
   try{const url=new URL(value);let allowed=approved(value);if(!allowed){const response=await fetch(appOrigin+'/api/registry');if(!response.ok)throw Error();const rows=await response.json();allowed=rows.some(x=>new URL(x.url).href===url.href);}
    if(allowed&&url.protocol==='https:'&&!url.username&&!url.password){hide(true);location.assign(url.href);}
   }catch{if(feedback)feedback.textContent='Open the link in Talk to ETIB.';}
  }
 });
})();

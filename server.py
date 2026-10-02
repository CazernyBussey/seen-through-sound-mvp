"""Talk to ETIB: public-source retrieval and allowlisted actions, no paid providers."""
import base64, concurrent.futures, datetime as dt, email.utils, html, json, os, re, threading, time, unicodedata
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qs
import xml.etree.ElementTree as ET

ROOT=Path(__file__).parent
CHAT_SLOTS=threading.BoundedSemaphore(8)
REQUEST_TIMES=[]
REGISTRY=json.loads((ROOT/'registry.json').read_text())
SNAPSHOT=json.loads((ROOT/'snapshot.json').read_text())
CACHE={}; FETCHING=set(); LOCK=threading.Lock(); POOL=concurrent.futures.ThreadPoolExecutor(max_workers=6)
WP='https://public-api.wordpress.com/rest/v1.1/sites/244196168/posts/'
FEED='https://anchor.fm/s/1046548ac/podcast/rss'
RADIO_FEED='https://anchor.fm/s/11630f9b4/podcast/rss'
SPOTIFY='https://open.spotify.com/show/6302Iby2KZMf4MWYq2sr16'
EXPERIENCE_SPOTIFY='https://open.spotify.com/show/2ejjSEAbngiJDrvqiN6vR6'

def clean(s):
    return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]*>',' ',re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>','',s or '',flags=re.S)))).strip()
def norm(s):
    return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9 ]',' ',unicodedata.normalize('NFKD',s.lower().replace('’',"'")).encode('ascii','ignore').decode())).strip()
def safe_url(s,media=False):
    try:
        u=urlparse(s);h=u.hostname or ''
        if u.scheme!='https' or u.username or u.password or u.port not in (None,443):return False
        hosts=['eventhoughimblind.com','eventhoughimblind.wordpress.com','cazernybussey.github.io','zeno.fm','stream.zeno.fm','open.spotify.com','p.scdn.co','podcasts.apple.com','anchor.fm','podcasters.spotify.com','creators.spotify.com','donorbox.org','form.jotform.com','www.facebook.com','www.instagram.com','youtube.com','www.youtube.com','www.tiktok.com','twitter.com','x.com','www.linkedin.com','www.threads.net','www.threads.com','cazernybussey.substack.com','flickr.com','calendly.com','eventhoughimblind.us22.list-manage.com','cfly-ai.zapier.app','eventhoughimblind.zapier.app','elevenlabs.io','www.imperfektlymade.com','eyeslikemine.org','etib-community-connect-1.onrender.com','eepurl.com','a.co','music.amazon.com','www.iheart.com','wrczpnhesorptjzwdizd.supabase.co']
        if h in hosts:return True
        return media and (h.endswith('.spotify.com') or h.endswith('.spotifycdn.com') or h.endswith('.cloudfront.net') or h.endswith('.scdn.co') or h=='d3ctxlq1ktw2nl.cloudfront.net')
    except ValueError:return False

def fetch(url,headers=None):
    # Only application-selected public source URLs reach this function, never user-supplied URLs.
    req=Request(url,headers={'User-Agent':'TalkToETIB/1.0 (+https://eventhoughimblind.com)',**(headers or {})})
    with urlopen(req,timeout=12) as r:
        data=r.read(6_000_001)
        if len(data)>6_000_000:raise ValueError('Source too large')
        return data.decode('utf-8')

def wp_items(raw):
    return [dict(id='wp-'+str(x['ID']),title=clean(x['title']),description=clean(x.get('excerpt','')),text=clean(x.get('content','')),url=x['URL'].replace('http://eventhoughimblind.com','https://eventhoughimblind.com'),date=x.get('date',''),category=x.get('type','post'),raw=x.get('content','')) for x in raw.get('posts',[]) if x.get('status')=='publish' and safe_url(x['URL'].replace('http://eventhoughimblind.com','https://eventhoughimblind.com'))]

def load_wp():
    items=[]
    for page in range(1,51):
        raw=json.loads(fetch(WP+f'?number=100&type=any&page={page}'))
        items.extend(wp_items(raw))
        if page*100>=raw.get('found',0) or not raw.get('posts'):break
    return items

def load_podcast_feed(feed,category,spotify_url):
    root=ET.fromstring(fetch(feed));items=[]
    for x in root.findall('./channel/item'):
        enc=x.find('enclosure');media=enc.get('url','') if enc is not None else ''
        try:date=email.utils.parsedate_to_datetime(x.findtext('pubDate','')).isoformat()
        except Exception:date=''
        url=x.findtext('link','')
        if not safe_url(url):url=next(r['url'] for r in REGISTRY if r['id']==category)
        # The RSS enclosure wraps its public MP3 in an analytics redirect.
        direct=re.search(r'https%3A%2F%2Fd3ctxlq1ktw2nl\.cloudfront\.net%2F[^?]+',media,re.I)
        if direct:
            from urllib.parse import unquote
            decoded=unquote(direct[0])
            if safe_url(decoded,True):media=decoded
        items.append(dict(id=category+'-'+str(len(items)),title=clean(x.findtext('title')),description=clean(x.findtext('description')),text=clean(x.findtext('description')),date=date,url=url,spotify_url=spotify_url,media=media if safe_url(media,True) else '',category=category,preview=False))
    if not items:raise ValueError('No episodes')
    return sorted(items,key=lambda x:x['date'],reverse=True)

def load_experience_feed():
    return load_podcast_feed(FEED,'experience',EXPERIENCE_SPOTIFY)

def load_radio_podcast():
    # Full RSS enclosures are required; unavailable sources use the saved full feed.
    items=load_podcast_feed(RADIO_FEED,'radio_podcast',SPOTIFY)
    for item in items:
        saved=next((x for x in SNAPSHOT.get('radio_podcast',{}).get('items',[]) if norm(x['title'])==norm(item['title'])),None)
        if saved and safe_url(saved.get('spotify_url',saved.get('url',''))):
            item['spotify_url']=saved.get('spotify_url',saved['url'])
    return items

def parse_spotify(s,show_id='6302Iby2KZMf4MWYq2sr16',category='radio_podcast'):
    m=re.search(r'<script id="initialState"[^>]*>(.*?)</script>',s,re.S)
    if not m:raise ValueError('Spotify source changed')
    state=json.loads(base64.b64decode(m.group(1)));show=state['entities']['items']['spotify:show:'+show_id];items=[]
    for item in show['pages']['items']:
        x=item['entity']['data'];media=x.get('previewPlayback',{}).get('audioPreview',{}).get('cdnUrl','')
        items.append(dict(id=category+'-'+x['id'],title=clean(x['name']),description=clean(x.get('description','')),text=clean(x.get('description','')),date=x.get('releaseDate',{}).get('isoString',''),url='https://open.spotify.com/episode/'+x['id'],spotify_url='https://open.spotify.com/episode/'+x['id'],media=media if safe_url(media,True) else '',category=category,preview=True))
    if not items:raise ValueError('No episodes')
    return sorted(items,key=lambda x:x['date'],reverse=True)

def load_experience():
    try:items=load_experience_feed()
    except Exception:items=[]
    try:previews=parse_spotify(fetch(EXPERIENCE_SPOTIFY),'2ejjSEAbngiJDrvqiN6vR6','experience')
    except Exception:previews=[]
    if not items:
        if previews:return previews
        raise ValueError('Experience sources unavailable')
    for item in items:
        preview=next((x for x in previews if norm(x['title'])==norm(item['title'])),None)
        if preview:
            item['spotify_url']=preview['url']
            if preview['media']:item['preview_media']=preview['media']
    return items

def load_seen():
    rows=json.loads(fetch('https://wrczpnhesorptjzwdizd.supabase.co/rest/v1/submissions?select=id,title,speaker_name,anonymous,original_audio_url,processed_audio_url,published_at&status=eq.published&order=published_at.desc&limit=100',{'apikey':'sb_publishable_cm8re92ds8XLhspfdNSwuw_X74b7kDm'}))
    items=[]
    for x in rows:
        media=next((u for u in [x.get('processed_audio_url'),x.get('original_audio_url')] if u and safe_url(u,True)),'')
        items.append(dict(id='seen-'+str(x['id']),title=x.get('title') or 'Encouragement message',description='Shared by '+('Anonymous' if x.get('anonymous') else x.get('speaker_name') or 'Anonymous'),text='',url='https://cazernybussey.github.io/seen-through-sound-mvp/playlist.html',media=media if safe_url(media,True) else '',date=x.get('published_at') or '',category='seen',preview=False))
    return items
LOADERS={'wp':load_wp,'experience':load_experience,'radio_podcast':load_radio_podcast,'seen':load_seen}

def source(key):
    with LOCK:
        cached=CACHE.get(key)
        if cached and time.time()-cached['timestamp']<300:return cached
        if key in FETCHING:
            prior=cached or SNAPSHOT.get(key,{})
            return dict(items=prior.get('items',[]),live=False,checked=prior.get('checked',SNAPSHOT['captured_at']),timestamp=time.time())
        FETCHING.add(key)
    try:
        items=LOADERS[key]();result=dict(items=items,live=True,checked=dt.datetime.now(dt.timezone.utc).isoformat(),timestamp=time.time())
    except Exception:
        prior=cached or SNAPSHOT.get(key,{})
        result=dict(items=prior.get('items',[]),live=False,checked=prior.get('checked',SNAPSHOT['captured_at']),timestamp=time.time())
    with LOCK:
        CACHE[key]=result
        FETCHING.discard(key)
    return result

def current_date():
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo('America/New_York')).date()

def events(items,today=None):
    today=today or current_date();page=next((x for x in items if x['id']=='wp-80'),None);results=[]
    if not page:return results
    chunks=re.split(r'<h[23][^>]*>',page.get('raw',''))
    for chunk in chunks:
        if '</h' not in chunk:continue
        title=clean(re.split(r'</h[23]>',chunk)[0]);body=clean(re.split(r'</h[23]>',chunk)[-1]);m=re.match(r'([A-Za-z]+) (\d{1,2})(?:[–-](\d{1,2}))?, (\d{4})',title)
        if not m:continue
        try:
            start=dt.datetime.strptime(f'{m[1]} {m[2]} {m[4]}','%B %d %Y').date();end=start.replace(day=int(m[3])) if m[3] else start
        except ValueError:continue
        if end<today:continue
        links=re.findall(r'href=["\']([^"\']+)',chunk);url=next((html.unescape(x) for x in links if safe_url(html.unescape(x))),page['url'])
        results.append(dict(id='event-'+start.isoformat(),title=title,description=body,date=start.isoformat(),url=url,category='event'))
    return results

def freshness(s):
    return ('Checked live source '+s['checked'][:10]+'.') if s['live'] else ('Live source is unavailable. These saved results were checked '+s['checked'][:10]+' and may have changed.')

def cards(items):
    return [{k:v for k,v in x.items() if k not in ('raw','text')} for x in items]
STOP={'find','search','show','me','the','an','a','old','older','article','articles','post','posts','episode','episodes','about','etib','podcast','with','that','for','please','can','you','i','want','to','on','what','did','it','of','latest','newest','current','play','tell','radio','experience','full','preview','snippet'}
def rank(items,q):
    words=[w for w in norm(q).split() if w not in STOP]
    if not words:return items[:5]
    scored=[]
    for x in items:
        title=norm(x['title']);text=norm(x.get('description','')+' '+x.get('text',''))
        score=sum(4 if w in title else 1 if w in text else 0 for w in words)
        if score:scored.append((score,x))
    return [x for score,x in sorted(scored,key=lambda v:v[0],reverse=True)[:6]]

def resolve(q):
    n=' '+norm(q)+' ';owner='cazerny' in n or 'cfly' in n or 'c fly' in n
    choices=[]
    for r in REGISTRY:
        if r.get('owner')=='cazerny' and not owner:continue
        if r.get('owner')=='etib' and owner and r['category']=='social':continue
        for a in r['aliases']:
            a=norm(a)
            if ' '+a+' ' in n:choices.append((len(a),r));break
    return max(choices,key=lambda x:x[0])[1] if choices else None

def reply(message,session=None):
    message=re.sub(r'\bpod\s+cast\b','podcast',message,flags=re.I);q=norm(message);session=session or {};out={'text':'','results':[],'action':None,'session':{k:v for k,v in session.items() if k in ['podcast','last_id','playing_id']}}
    def answer(text,items=[],action=None):
        out.update(text=text,results=cards(items),action=action);return out
    if re.fullmatch(r'(hello|hi|hey|greeting|good morning|good afternoon|good evening)( etib)?',q):return answer('Welcome to Talk to ETIB. Say Play ETIB Radio, Play the latest Experience episode, Show upcoming events, or Take me to ETIB Facebook. Select Speak a request for each new voice command.')
    if not q:return answer('Type a question or choose What can I ask.')
    if re.fullmatch(r'(please )?(pause|pause (?:it|audio|the radio|the podcast|the episode|the music))',q):return answer('Pause requested.',action={'type':'pause'})
    if re.fullmatch(r'(please )?(resume|resume (?:it|audio|the radio|the podcast|the episode)|continue|continue playing|unpause)',q):return answer('Resume requested.',action={'type':'resume'})
    if re.fullmatch(r'(please )?(stop|stop (?:it|audio|playing|the radio|the podcast|the episode|the music))',q):return answer('Stop requested.',action={'type':'stop'})
    if any(x in q for x in ['currently playing','what is playing','what s playing','who is this','what am i listening']):return answer('Check the Now playing section for the title and playback state.',action={'type':'identify'})
    if any(x in q for x in ['help','what can i ask','what can you do']):return answer('Try: Play ETIB Radio. Play the latest Experience episode. Find the episode with Angela Harris. Show upcoming events. Find articles about accessibility. Take me to ETIB Facebook. Say pause, resume, or stop to control audio.')
    if any(x in q for x in ['donate for me','send money','submit my','send email','delete','buy ','purchase','pay ']):return answer('I can open an official page for you to review and complete that action yourself. I do not send information, make payments, or change accounts.')
    navigation=bool(re.search(r'\b(take me|go to|open|navigate|bring me)\b',q))
    play=bool(re.search(r'\b(play|listen|start playing)\b',q))
    dest=resolve(message)
    if play and re.fullmatch(r'(please )?(play|listen to|start) (it|that)( please)?',q):
        if out['session'].get('playing_id')=='radio' or out['session'].get('last_id')=='radio':dest=next(r for r in REGISTRY if r['id']=='radio')
    if navigation and re.search(r'\b(their|its|that|this) (page|website|link)\b',q):
        ident=out['session'].get('last_id')
        pool=list(REGISTRY)
        if ident and ident not in [r['id'] for r in pool]:
            for key in ['wp','experience','radio_podcast','seen']:pool+=source(key)['items']
        dest=next((x for x in pool if x['id']==ident),None)
    if play and 'spotify' in q and dest and dest['id'] in ['experience','radio_podcast','radio']:
        kind='radio_podcast' if dest['id']=='radio' else dest['id'];podcast=next(r for r in REGISTRY if r['id']==kind)
        return answer('Opening '+podcast['name']+' on Spotify.',action={'type':'navigate','url':SPOTIFY if kind=='radio_podcast' else 'https://open.spotify.com/show/2ejjSEAbngiJDrvqiN6vR6'})
    if navigation and dest:
        out['session']['last_id']=dest['id'];return answer('Opening '+dest.get('title',dest.get('name'))+'.',[dict(dest,title=dest.get('title',dest.get('name')))],{'type':'navigate','url':dest['url']})
    if dest and dest['id']=='radio' and (play or 'radio' in q) and 'podcast' not in q:
        out['session'].update(last_id='radio',playing_id='radio');item=dict(dest,title=dest['name'],media=dest['media'],preview=False)
        return answer('ETIB Radio is ready. If your browser needs permission, activate Play selected audio.',[item],{'type':'play','item':cards([item])[0]} if play else None)
    episode=bool(re.search(r'\b(episode|podcast)\b',q)) or bool(play and dest and dest['id'] in ['experience','radio_podcast'])
    if episode:
        kind='radio_podcast' if ('radio' in q or dest and dest['id']=='radio_podcast') else 'experience' if 'experience' in q else out['session'].get('podcast')
        if play and not kind and re.fullmatch(r'(please )?play (the )?(latest |newest |full )?episode',q):kind='radio_podcast'
        if not kind:
            return answer('Which podcast: ETIB Radio Podcast or ETIB Experience?',[dict(r,title=r['name']) for r in REGISTRY if r['id'] in ['experience','radio_podcast']])
        out['session']['podcast']=kind;s=source(kind)
        latest=any(w in q for w in ['latest','newest','recent','current']) or re.fullmatch(r'(play )?(radio podcast|etib radio podcast|experience|etib experience)',q) or not re.sub(r'\b(please|play|listen|to|the|a|start|playing|etib|even|though|i|m|im|blind|radio|experience|podcast|episode|full|preview|snippet)\b',' ',q).strip()
        found=s['items'][:1] if latest else rank(s['items'],message)
        if not found:return answer('I could not retrieve a matching episode. Try a guest name or open the official podcast page. '+freshness(s),[dict(r,title=r['name']) for r in REGISTRY if r['id']==kind])
        item=found[0];out['session']['last_id']=item['id']
        if play:out['session']['playing_id']=item['id']
        txt=('Latest available episode: ' if latest and s['live'] else 'Episode found: ')+item['title']+'. '+freshness(s)
        if item.get('preview'):txt+=' The Spotify preview is ready. Use the full episode link to continue listening on Spotify.'
        return answer(txt,found,{'type':'spotify' if item.get('preview') else 'play','item':cards([item])[0]} if play and (item.get('media') or item.get('preview')) else None)
    if dest and dest['id']=='seen':
        if play or not re.search(r'\b(show|find|search|what|about|describe|tell)\b',q):
            s=source('seen');found=[x for x in s['items'] if x.get('media') and safe_url(x['media'],True)]
            if found and found[0].get('media'):
                out['session'].update(last_id=found[0]['id'],playing_id=found[0]['id']);return answer('Seen Through Sound will play '+str(len(found))+' published message'+('s' if len(found)!=1 else '')+' in order. '+freshness(s),found[:1],{'type':'play','item':cards(found[:1])[0],'queue':cards(found[1:])})
            return answer('Open the official Seen Through Sound playlist to listen. '+freshness(s),[dict(dest,title=dest['name'])])
        return answer(dest['description'],[dict(dest,title=dest['name'])])
    if re.search(r'\b(events|event|calendar|upcoming)\b',q):
        s=source('wp');found=events(s['items'])
        if not s['live']:return answer('I cannot confirm current events while the live source is unavailable. Open the official events page for confirmation.',[dict(r,title=r['name']) for r in REGISTRY if r['id']=='events'])
        return answer(('Upcoming ETIB events. Times and locations may still be to be determined. ' if found else 'No upcoming dated events are listed in the live events page. ')+freshness(s),found or [dict(r,title=r['name']) for r in REGISTRY if r['id']=='events'])
    if re.search(r'\b(blog|article|post|search|find|latest|newest)\b',q):
        s=source('wp');items=[x for x in s['items'] if x['category']=='post'] if re.search(r'\b(blog|article|post)\b',q) else s['items'];found=items[:1] if any(w in q for w in ['latest','newest']) else rank(items,message)
        if found:out['session']['last_id']=found[0]['id']
        return answer(('Here is what I found. ' if found else 'No matching ETIB content was found. Try a topic or name. ')+freshness(s),found)
    if dest:
        out['session']['last_id']=dest['id'];return answer(dest['description'],[dict(dest,title=dest['name'])])
    s=source('wp');found=rank(s['items'],message)
    if found:
        out['session']['last_id']=found[0]['id'];return answer(found[0]['description'] or found[0]['text'][:550],found[:3])
    return answer('I could not match that request yet. Try a project, a guest name, or a topic, or open ETIB’s existing AI chat.',[dict(r,title=r['name']) for r in REGISTRY if r['id']=='ai'])

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass # Do not retain conversational text or IP logs.
    def send(self,status,body,kind='application/json; charset=utf-8'):
        self.send_response(status);self.send_header('Content-Type',kind);
        if self.path=='/api/registry':self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Cache-Control','no-store' if '/api/' in self.path else 'no-cache');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('Permissions-Policy','camera=(), geolocation=(), microphone=(self)');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' https://eventhoughimblind.com https://eventhoughimblind.wordpress.com; media-src https:; connect-src 'self' wss://api.elevenlabs.io; frame-src 'self' https://open.spotify.com; frame-ancestors 'self' https://eventhoughimblind.com https://eventhoughimblind.wordpress.com; base-uri 'none'; form-action 'self'; object-src 'none'");self.end_headers();self.wfile.write(body)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/health':return self.send(200,json.dumps({'ok':True,'name':'Talk to ETIB','provider':'rules-and-public-sources','speech_provider':'ElevenLabs','speech_uses_connected_account':True}).encode())
        if path=='/api/registry':return self.send(200,json.dumps(REGISTRY).encode())
        if path=='/api/audio':
            latest={}
            for key in ['experience','radio_podcast']:
                items=source(key)['items']
                if items:
                    item=dict(items[0]);item.setdefault('spotify_url',EXPERIENCE_SPOTIFY if key=='experience' else item['url']);latest[key]=cards([item])[0]
            return self.send(200,json.dumps(latest).encode())
        mapping={'/speech-sdk.js':'speech-sdk.js','/managed-voice.js':'managed-voice.js','/rawAudioProcessor.js':'rawAudioProcessor.js','/audioConcatProcessor.js':'audioConcatProcessor.js','/libsamplerate.worklet.js':'libsamplerate.worklet.js','/':'index.html','/index.html':'index.html','/listening-cue.wav':'listening-cue.wav','/greeting.mp3':'greeting.mp3','/voice.js':'voice.js','/app.js':'app.js','/style.css':'style.css','/launcher.js':'launcher.js','/launcher-demo':'launcher-demo.html','/integration':'integration.html'}
        f=mapping.get(path)
        if not f:return self.send(404,b'{"error":"Not found"}')
        kind='audio/wav' if f.endswith('wav') else 'audio/mpeg' if f.endswith('mp3') else 'text/html; charset=utf-8' if f.endswith('html') else 'text/javascript; charset=utf-8' if f.endswith('js') else 'text/css; charset=utf-8'
        self.send(200,(ROOT/f).read_bytes(),kind)
    def do_POST(self):
        if self.path!='/api/chat':return self.send(404,b'{"error":"Not found"}')
        with LOCK:
            now=time.monotonic()
            REQUEST_TIMES[:]=[x for x in REQUEST_TIMES if now-x<60]
            limited=len(REQUEST_TIMES)>=120
            if not limited:REQUEST_TIMES.append(now)
        if limited or not CHAT_SLOTS.acquire(blocking=False):return self.send(429,b'{"error":"ETIB is busy. Please try again shortly."}')
        origin=self.headers.get('Origin');host=self.headers.get('Host')
        if origin and urlparse(origin).netloc!=host:
            CHAT_SLOTS.release()
            return self.send(403,b'{"error":"Origin not allowed"}')
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=6000:return self.send(413,b'{"error":"Request too large"}')
            data=json.loads(self.rfile.read(length));message=data.get('message');session=data.get('session',{})
            if not isinstance(message,str) or len(message)>1000 or not isinstance(session,dict):raise ValueError()
            self.send(200,json.dumps(reply(message,session)).encode())
        except (ValueError,TypeError):self.send(400,b'{"error":"Please enter a question of 1000 characters or fewer."}')
        except Exception:self.send(503,b'{"error":"ETIB sources are unavailable. Please try again."}')
        finally:CHAT_SLOTS.release()

if __name__=='__main__':
    if os.environ.get('ETIB_RUN_SPEECH_CHECK')=='1':
        import runpy
        POOL.submit(runpy.run_path,str(Path(__file__).resolve().parent/'tests/check_live_speech.py'),run_name='__main__')
    # Warm caches without delaying the first page or free-tier health checks.
    for key in LOADERS:POOL.submit(source,key)
    ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()

import sys,datetime as dt,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));import server
for key,value in server.SNAPSHOT.items():
 if isinstance(value,dict):server.CACHE[key]=dict(value,live=True,timestamp=server.time.time())
def check(q,session=None):
 r=server.reply(q,session);print(q,'=>',r['text'][:100],r['action']['type'] if r['action'] else 'none');return r
r=check('Take me to ETIB Facebook');assert r['action']['url'].startswith('https://www.facebook.com/share/')
r=check('Show ETIB Facebook');assert r['action'] is None and len(r['results'])==1
r=check('Take me to Cazerny Instagram');assert 'cazernybussey' in r['action']['url']
r=check('Play ETIB Radio');assert r['action']['item']['media']=='https://stream.zeno.fm/qvlhys2h2odvv'
for q in ["Play Even Though I'm Blind Radio","Play Even Though I’m Blind Radio","Listen to Even Though I'm Blind Experience Podcast","Play Even Though I'm Blind Experience","Play the newest Even Though I'm Blind Radio Podcast"]:
 result=check(q);assert result['action']['type'] in ['play','spotify']
 if 'Experience' in q:assert result['action']['item']['id']==server.CACHE['experience']['items'][0]['id']
for q,kind in [('Play Even Though I’m Blind Radio Pod Cast','radio_podcast'),('Play Even Though I’m Blind Experience Pod Cast','experience')]:
 result=check(q);assert result['action']['item']['id']==server.CACHE[kind]['items'][0]['id']
for q,show in [('Play Even Though I’m Blind Radio Podcast on Spotify','6302Iby2KZMf4MWYq2sr16'),('Play Even Though I’m Blind Experience Podcast on Spotify','2ejjSEAbngiJDrvqiN6vR6')]:
 assert check(q)['action']['url']=='https://open.spotify.com/show/'+show
for request in ['Seen Through Sound','Play Seen Through Sound','Scene to sound','Play scene through sound']:
 result=check(request);assert result['action']['type']=='play';assert result['action']['item']['id']==server.CACHE['seen']['items'][0]['id']
assert check('Show Seen Through Sound')['action'] is None
assert check('Take me to Seen Through Sound')['action']['type']=='navigate'
assert check('Play it',{'playing_id':'radio'})['action']['item']['id']=='radio'
assert check('Play E T I B Radio')['action']['item']['id']=='radio'
seen=server.CACHE['seen']['items'];server.CACHE['seen']['items']=[dict(seen[0],media=''),*seen]
assert check('Seen Through Sound')['action']['item']['id']==seen[0]['id']
server.CACHE['seen']['items']=seen
for q,a in [('Pause' ,'pause'),('Resume','resume'),('Stop','stop')]:assert check(q)['action']['type']==a
r=check('Play the latest ETIB Experience episode');assert r['action']['type']=='play' and not r['results'][0]['preview']
r=check('Play the latest ETIB Radio Podcast episode');assert r['action']['type']=='spotify' and r['action']['item']['preview']
radio=server.CACHE['radio_podcast']['items'];server.CACHE['radio_podcast']['items']=[dict(radio[0],media=''),*radio[1:]]
assert check('Play Even Though I’m Blind Radio Podcast')['action']['type']=='spotify'
server.CACHE['radio_podcast']['items']=radio
r=check('Play the latest episode');assert r['action'] is None and 'Which podcast' in r['text']
r=check('Find the episode with Angela Harris',{'podcast':'experience'});assert 'Angela' in r['results'][0]['title']
r=check('Find an old article about accessibility');assert r['results']
r=check('What is the newest ETIB blog post?');assert 'Dear Fathers' in r['results'][0]['title']
r=check('Show upcoming events');assert len(r['results'])==3
assert not server.events(server.CACHE['wp']['items'],dt.date(2027,1,1))
assert not server.safe_url('javascript:alert(1)') and not server.safe_url('https://eventhoughimblind.com.evil.com/')
r=check('Take me to https://evil.com/');assert not r['action']
server.CACHE['wp']['live']=False;r=check('What events are coming up?');assert 'cannot confirm' in r['text']
print('PASS: routing, official URLs, media, archives, current sources, date filtering, and unsafe URLs')

original_feed,original_fetch=server.load_experience_feed,server.fetch
original_parse=server.parse_spotify
preview=dict(server.CACHE['experience']['items'][0],media='https://p.scdn.co/preview.mp3',preview=True,url='https://open.spotify.com/episode/test')
server.fetch=lambda url:''
server.parse_spotify=lambda *args:[preview]
server.load_experience_feed=lambda: (_ for _ in ()).throw(ValueError('RSS unavailable'))
assert server.load_experience()[0]['preview']
server.load_experience_feed=lambda:[dict(preview,media='https://d3ctxlq1ktw2nl.cloudfront.net/full.mp3',preview=False)]
matched=server.load_experience()[0]
assert matched['preview_media']==preview['media'] and matched['spotify_url']==preview['url']
server.load_experience_feed,server.fetch,server.parse_spotify=original_feed,original_fetch,original_parse
print('PASS: Experience RSS failure uses Spotify preview; full episode retains matching preview fallback.')

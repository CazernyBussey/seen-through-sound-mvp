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
for q,a in [('Pause','pause'),('Resume','resume'),('Stop','stop')]:assert check(q)['action']['type']==a
r=check('Play the latest ETIB Experience episode');assert r['action']['type']=='play' and not r['results'][0]['preview']
r=check('Play the latest ETIB Radio Podcast episode');assert r['action']['type']=='spotify' and r['action']['item']['preview']
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

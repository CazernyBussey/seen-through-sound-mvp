import json,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server,directory
for key,value in server.SNAPSHOT.items():
 if isinstance(value,dict):server.CACHE[key]=dict(value,live=True,timestamp=time.time())
rows=server.CACHE['directory']['items']
assert len(rows)==13
for row in rows:
 result=server.reply('Open '+row['title']+' directory profile')
 assert result['action']['type']=='navigate',result
 assert result['action']['url']==row['url'],result
 assert server.safe_url(row['url'])
for request,ident in [('Play White Canes Connect podcast','white-canes-connect'),('Play Blind Table Talk','blind-table-talk'),('Show podcasts by Dr. Kirk Adams','podcasts-by-dr-kirk-adams'),('Open Dr. Kirk Adams podcast','podcasts-by-dr-kirk-adams'),('Take me to BPN','blind-professionals-network'),('Open Imperfectlymade Foundation','imperfektlymade-foundation'),('Open Eyes Like Mine','eyes-like-mine'),('Play North Carolina Reading Service radio','north-carolina-reading-service')]:
 result=server.reply(request,{'podcast':'experience'});assert result['results'][0]['id']=='directory-'+ident,(request,result)
 if request.startswith(('Play','Open','Take')):assert result['action']['url'].endswith('business='+ident)
for request,count in [('Show other podcasts',4),('What podcasts are there',4),('Show media',7),('Show podcasts and media',7),('Find businesses',6),('Find consulting businesses',1)]:
 result=server.reply(request);matches=[x for x in result['results'] if x['id']!='directory-browse'];assert len(matches)==count,(request,len(matches),result)
for request,part in [('Open the podcast directory','q=podcast&group=media'),('Show the podcast directory','q=podcast&group=media'),('Open the media directory','group=media'),('Take me to the business directory','group=business'),('Open ETIB Community Connect Directory','index.html')]:
 result=server.reply(request);assert result['action']['type']=='navigate';assert result['action']['url'].endswith(part),(request,result)
result=server.reply('Play Made Up Unicorn Podcast',{'podcast':'experience'})
assert result['action'] is None and 'No published directory listing' in result['text']
result=server.reply('Show White Canes Connect');follow=server.reply('Open their page',result['session']);assert follow['action']['url'].endswith('business=white-canes-connect')
for request,category in [('Play ETIB Radio','media'),('Play Even Though I am Blind Experience','experience'),('Play Even Though I am Blind Radio Podcast','radio_podcast')]:
 result=server.reply(request);assert result['action']['type']=='play' and result['action']['item']['category']==category,(request,result)
# A snapshot stays responsive during source failure and reports its age.
server.CACHE['directory']=dict(server.SNAPSHOT['directory'],live=False,timestamp=time.time())
assert 'saved results' in server.reply('Show other podcasts')['text']
# Public loader follows pagination, respects the source's media grouping, excludes inactive/unsafe IDs.
public=[{'id':'sample-one','name':'Sample One','categories':['Podcast'],'services':[],'contact':{'website':'javascript:alert(1)'}},{'id':'sample-two','name':'Sample Two','categories':['Consulting'],'services':[],'contact':{'website':'https://sample.example/'}},{'id':'inactive','name':'Inactive','status':'inactive'},{'id':'../bad','name':'Bad'}]
calls=[]
def fetch(url):
 from urllib.parse import urlparse,parse_qs
 calls.append(url);params=parse_qs(urlparse(url).query)
 if 'group' in params:return json.dumps({'listings':[public[0]],'pagination':{'totalPages':1}})
 return json.dumps({'listings':public[:2] if params['page']==['1'] else public[2:],'pagination':{'totalPages':2}})
loaded=directory.load(fetch,server.clean)
assert len(loaded)==2 and len(calls)==3 and loaded[0]['website_url']==''
assert loaded[0]['directory_group']=='media' and loaded[1]['directory_group']=='business'
print('PASS: all 13 profile links, four podcasts, seven media listings, six businesses, named voice requests, categories, unknown names, follow-ups, fast saved results, live pagination and safe website handling.')

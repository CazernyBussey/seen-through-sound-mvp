"""Read the existing public Community Connect catalog; link to its accessible profiles."""
import re
from urllib.parse import urlencode, urlparse

DIRECTORY='https://etib-community-connect-1.onrender.com'
MEDIA_TERMS=('podcast','accessible media','media distribution','radio','audio information','reading service','news and information','disability news')

def view_url(group='',query=''):
    params={}
    if query:params['q']=query
    if group:params['group']=group
    return DIRECTORY+'/index.html'+('?' + urlencode(params) if params else '')

def public_website(value):
    try:
        u=urlparse(value or '')
        return bool(u.scheme=='https' and u.hostname and '.' in u.hostname and not u.username and not u.password and u.port in (None,443) and not re.fullmatch(r'[0-9.]+',u.hostname) and not u.hostname.endswith(('.local','.internal')))
    except ValueError:return False

def listing(item,clean,media_ids=None):
    ident=item.get('id','');name=item.get('name','')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',ident) or not isinstance(name,str) or not name.strip() or item.get('status','active')!='active':return None
    categories=[clean(x) for x in item.get('categories',[]) if isinstance(x,str)]
    services=[clean(x) for x in item.get('services',[]) if isinstance(x,str)]
    media=(ident in media_ids) if media_ids is not None else (item.get('directoryGroup')=='media' if item.get('directoryGroup') else ident!='etib-inc' and any(term in ' '.join(categories+services).lower() for term in MEDIA_TERMS))
    location=item.get('location',{})
    contact=item.get('contact',{})
    website=contact.get('website')
    description=clean(item.get('summary') or item.get('description') or '')
    text=clean(' '.join([item.get('description') or '',item.get('spokenSummary') or '',item.get('accessibility') or '',item.get('blindCommunitySupport') or '',item.get('hours') or '',item.get('listingType') or '',*categories,*services,*[str(x) for x in location.values() if x]]))
    return dict(id='directory-'+ident,title=clean(name),description=description,text=text,url=DIRECTORY+'/business-profile.html?'+urlencode({'business':ident}),category='directory',directory_group='media' if media else 'business',categories=categories,services=services,website_url=website if public_website(website) else '',last_verified=item.get('lastVerified',''),listing_type=item.get('listingType',''))

def load(fetch,clean):
    import json
    def pages(group=''):
        rows=[]
        for page in range(1,51):
            params={'pageSize':100,'page':page}
            if group:params['group']=group
            data=json.loads(fetch(DIRECTORY+'/api/listings?'+urlencode(params)))
            if not isinstance(data.get('listings'),list):raise ValueError('Invalid directory response')
            rows.extend(data['listings'])
            if page>=int(data.get('pagination',{}).get('totalPages',1)):return rows
        raise ValueError('Directory pagination limit exceeded')
    rows=pages();media_ids={x.get('id') for x in pages('media')};items=[];seen=set()
    for row in rows:
        x=listing(row,clean,media_ids)
        if x and x['id'] not in seen:items.append(x);seen.add(x['id'])
    return items

QUERY_WORDS={'play','listen','start','please','show','find','search','take','me','go','to','open','bring','navigate','the','a','an','i','want','would','like','can','you','my','for','about','with','in','on','at','directory','podcast','podcasts','business','businesses','organization','organizations','resource','resources','media','page','website','their','official','other','certain','different','some','any','are','there','what','which','all','list','of','and','etib','community','connect','blind','visually','impaired','owned','service','services'}

def named(items,q,norm):
    # Require a name, never a generic category or incidental description word.
    n=' '+q+' ';matches=[]
    for x in items:
        name=norm(re.sub(r'\([^)]*\)','',x['title']));aliases=[name]
        short=re.sub(r'\b(podcast|inc|llc|foundation)\b','',name).strip()
        if len(short.split())>=2:aliases.append(re.sub(r'\s+',' ',short))
        if 'imperfektlymade' in name:aliases += [a.replace('imperfektlymade','imperfectlymade') for a in aliases]
        if name=='white canes connect':aliases.append('white cane connect')
        if re.search(r'\bpodcasts?\b',q) and name.startswith('podcasts by '):aliases.append(name.removeprefix('podcasts by '))
        acronym=re.search(r'\(([A-Z]{2,6})\)',x['title'])
        if acronym:aliases.append(acronym[1].lower())
        for alias in aliases:
            if ' '+alias+' ' in n:matches.append((len(alias),x));break
    return max(matches,key=lambda pair:pair[0])[1] if matches else None

def request(message,items,norm,explicit_etib=False):
    q=re.sub(r'\bi am\b','i m',norm(message));match=named(items,q,norm)
    directory_words=bool(re.search(r'\b(directory|business(?:es)?|organizations?|resources?)\b',q))
    # ETIB playback always wins unless the user explicitly asks for its directory profile.
    if match and match['id'] in ('directory-etib-inc','directory-even-though-im-blind-experience-podcast') and not directory_words:match=None
    if match:
        navigation=bool(re.search(r'\b(open|take me|bring me|go to|play|listen|start|visit)\b',q))
        return dict(items=[match],text=match['description'],action={'type':'navigate','url':match['url']} if navigation else None)
    if explicit_etib and not directory_words:return None
    podcast=bool(re.search(r'\b(podcasts?)\b',q))
    media=bool(re.search(r'\bmedia\b',q))
    podcast=podcast and not media
    businesses=bool(re.search(r'\b(business(?:es)?|organizations?)\b',q))
    if not (directory_words or podcast or media):return None
    if re.search(r'\bepisode\b',q) and not directory_words:return None
    group='media' if podcast or media else 'business' if businesses else ''
    candidates=[x for x in items if not group or x['directory_group']==group]
    if re.search(r'\bblind owned\b',q):candidates=[x for x in candidates if 'blind' in x.get('listing_type','').lower() or x.get('listing_type')=='Both']
    if podcast:candidates=[x for x in candidates if any('podcast' in c.lower() for c in x['categories'])]
    words=[w for w in q.split() if w not in QUERY_WORDS]
    if words:
        scored=[]
        for x in candidates:
            text=norm(x['title']+' '+x['text'])
            if all(w in text.split() for w in words):scored.append(x)
        candidates=scored
    query=' '.join(words) if words else 'podcast' if podcast else ''
    url=view_url(group,query)
    label='Podcasts in Community Connect' if podcast else 'Media in Community Connect' if media else 'Businesses in Community Connect' if businesses else 'Community Connect Directory'
    browse=dict(id='directory-browse',title=label,description='Browse the directory’s published listings.',url=url,category='directory',directory_group=group)
    navigation=bool(re.search(r'\b(open|take me|bring me|go to|visit)\b',q)) or (directory_words and not words and not re.search(r'\b(find|search)\b',q))
    if navigation:return dict(items=[browse],text='Opening '+label+'.',action={'type':'navigate','url':url})
    return dict(items=candidates[:12]+[browse],text=(str(len(candidates))+' matching directory listings.' if candidates else 'No published directory listing matched that request. You can browse the directory or try another name.'),action=None)

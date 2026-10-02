"""Explicit hosting-only integration check. Uses synthetic public commands, never user audio."""
import base64,hashlib,json,os,socket,ssl,struct,threading,time,sys,select,traceback
from pathlib import Path

def hear(pcm):
 raw=socket.create_connection(('api.elevenlabs.io',443),timeout=15)
 conn=ssl.create_default_context().wrap_socket(raw,server_hostname='api.elevenlabs.io')
 key=base64.b64encode(os.urandom(16)).decode()
 conn.sendall(('GET /v1/convai/conversation?agent_id=agent_4101m3yxcvtrexwvrbt19h2kqyfp HTTP/1.1\r\nHost: api.elevenlabs.io\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: '+key+'\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Protocol: convai\r\nOrigin: https://talk-to-etib.onrender.com\r\n\r\n').encode())
 header=b''
 while not header.endswith(b'\r\n\r\n'):header+=conn.recv(1)
 if b' 101 ' not in header:raise RuntimeError('Handshake refused: '+header.split(b'\r\n')[0].decode())
 stop=threading.Event();lock=threading.Lock()
 def send(data,opcode=1):
  data=json.dumps(data).encode() if isinstance(data,dict) else data
  mask=os.urandom(4);size=len(data);prefix=bytes([0x80|opcode,0x80|(size if size<126 else 126)])
  if size>=126:prefix+=struct.pack('!H',size)
  with lock:conn.sendall(prefix+mask+bytes(x^mask[i%4] for i,x in enumerate(data)))
 def exact(n):
  data=b''
  while len(data)<n:
   part=conn.recv(n-len(data))
   if not part:raise RuntimeError('Speech socket closed')
   data+=part
  return data
 def read():
  first,second=exact(2);size=second&127
  if size==126:size=struct.unpack('!H',exact(2))[0]
  elif size==127:size=struct.unpack('!Q',exact(8))[0]
  mask=exact(4) if second&128 else None;data=exact(size)
  if mask:data=bytes(x^mask[i%4] for i,x in enumerate(data))
  opcode=first&15
  if opcode==8:raise RuntimeError('Speech service closed: '+data[2:].decode(errors='replace'))
  if opcode==9:send(data,10);return {}
  return json.loads(data) if opcode==1 else {}
 try:
  send({'type':'conversation_initiation_client_data','source_info':{'source':'js_sdk','version':'1'}})
  deadline=time.monotonic()+20
  audio=pcm+bytes(32000*4);offset=0;streaming=False;next_send=0
  while time.monotonic()<deadline:
   now=time.monotonic()
   if streaming and offset<len(audio) and now>=next_send:
    send({'user_audio_chunk':base64.b64encode(audio[offset:offset+640]).decode()});offset+=640;next_send=now+.02
   if not conn.pending() and not select.select([conn],[],[],.01)[0]:continue
   event=read()
   if event.get('type')=='conversation_initiation_metadata':streaming=True
   elif event.get('type')=='ping':send({'type':'pong','event_id':event['ping_event']['event_id']})
   elif event.get('type')=='user_transcript':return event['user_transcription_event']['user_transcript']
  raise RuntimeError('Transcript timeout')
 finally:
  stop.set()
  try:send(struct.pack('!H',1000),8)
  except OSError:pass
  conn.close()

def run():
 sys.path.insert(0,str(Path(__file__).resolve().parents[1]));import server
 try:
  for case in json.loads(Path(__file__).with_name('speech-fixtures.json').read_text()):
   transcript=hear(base64.b64decode(case['pcm']))
   reply=server.reply(transcript,{})
   category=(reply.get('action') or {}).get('item',{}).get('category')
   expected='media' if case['category']=='radio' else case['category']
   if category!=expected:raise AssertionError(f'{case["command"]}: heard {transcript!r}, routed {category!r}')
   print('ETIB_SPEECH_CHECK PASS '+json.dumps({'command':case['command'],'transcript':transcript,'category':category}),flush=True)
  print('ETIB_SPEECH_CHECK ALL_PASS',flush=True)
 except Exception as error:
  print('ETIB_SPEECH_CHECK FAIL '+str(error),flush=True);traceback.print_exc()
if __name__=='__main__':run()

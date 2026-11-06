"""Check each curated exercise page and resolve its actual video, without copying media."""
import json,subprocess,re,concurrent.futures,html,tempfile,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
catalog=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./program.js").catalog))'],cwd=root))
cache=Path(os.environ.get('DEMO_AUDIT_DIR',Path(tempfile.gettempdir())/'noga-demo-audit'));cache.mkdir(exist_ok=True)
catalog={**catalog,**{k+'_secondary':{'demo_url':e['second_demo_url']} for k,e in catalog.items() if e.get('second_demo_url')}}
previous={r['key']:r for r in json.loads((cache/'results.json').read_text())} if (cache/'results.json').exists() else {}
def check(item):
 key,e=item;url=e['demo_url'];path=cache/(key+'.html')
 if key in previous and previous[key].get('page')==url and not previous[key].get('error'):return previous[key]
 if 'youtube.com/watch?' in url:
  out=subprocess.run(['curl','-fsSL','--max-time','20','https://www.youtube.com/oembed?url='+url+'&format=json'],capture_output=True,text=True)
  try:
   info=json.loads(out.stdout);return {'key':key,'page':url,'video':url,'title':info['title'],'author':info['author_name']}
  except:return {'key':key,'page':url,'error':'YouTube oEmbed unavailable'}
 p=subprocess.run(['curl','-fsSL','-A','Mozilla/5.0','--max-time','25',url,'-o',str(path)],capture_output=True,text=True)
 if p.returncode:return {'key':key,'page':url,'error':p.stderr.strip()[:150]}
 if url.endswith('.mp4'):return {'key':key,'page':url,'video':url,'direct_video':True}
 text=path.read_text(errors='replace');title=re.search(r'<title>(.*?)</title>',text,re.S)
 frames=re.findall(r'<iframe[^>]+src=[\"\']([^\"\']+)',text,re.I)
 vids=[html.unescape(x) for x in frames if re.search(r'(?:youtube(?:-nocookie)?\.com/embed/[\w-]{11}|vimeo\.com/video/\d+)',x)]
 if not vids:vids=re.findall(r'"embedUrl":"([^"]+)"',text)
 return {'key':key,'page':url,'title':html.unescape(title.group(1)) if title else '', 'videos':vids,'bytes':len(text),'error':None if vids else 'No embedded video found'}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex: results=list(ex.map(check,catalog.items()))
(cache/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))

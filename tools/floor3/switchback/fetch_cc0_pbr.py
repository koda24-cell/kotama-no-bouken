"""Download Poly Haven CC0 photo-based PBR for F3 ruined switchback model.
No Pinterest or user reference image is copied into the texture.
Network failure is reported explicitly and procedural source remains available.
"""
import json, pathlib, urllib.request, hashlib, time
root=pathlib.Path('/work/out/source_textures');root.mkdir(parents=True,exist_ok=True)
asset='concrete_moss'
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'kotama-3d-asset-provenance/1.0'})
 with urllib.request.urlopen(req,timeout=35) as r:return r.read()
status={'source':'https://polyhaven.com/a/concrete_moss','asset':asset,'license':'CC0 1.0','attempted_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'maps':{},'errors':[]}
try:
 data=json.loads(fetch('https://api.polyhaven.com/files/'+asset))
 groups={'diffuse':('Diffuse','diffuse'),'normal':('nor_gl','Normal (GL)','normal_gl'),'rough':('Rough','rough')}
 for dest,aliases in groups.items():
  group=next((data[k] for k in aliases if k in data),{})
  versions=group.get('1k') or group.get('2k') or {}
  variant=versions.get('jpg') or versions.get('png') or next(iter(versions.values()),None)
  if not isinstance(variant,dict) or not variant.get('url'):
   status['errors'].append('missing map '+dest)
   continue
  url=variant['url'];raw=fetch(url)
  ext='.jpg' if raw.startswith(bytes.fromhex('ffd8')) else '.png' if raw[:8]==bytes.fromhex('89504e470d0a1a0a') else None
  if not ext:raise RuntimeError('unknown format '+dest)
  path=root/(dest+ext);path.write_bytes(raw)
  status['maps'][dest]={'url':url,'path':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
  print('PBR_CC0_DOWNLOAD_OK',dest,url,len(raw))
except Exception as e:
 status['errors'].append(repr(e))
 print('PBR_CC0_DOWNLOAD_FAILED',repr(e))
(root/'provenance.json').write_text(json.dumps(status,indent=2)+'\n')
print('PBR_STATUS',status)

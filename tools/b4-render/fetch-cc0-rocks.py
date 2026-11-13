#!/usr/bin/env python3
"""Fetch vetted CC0 Kenney rock GLBs, validate GLB header and retain provenance."""
import hashlib,json,pathlib,urllib.request,struct
root=pathlib.Path(__file__).resolve().parents[2]
manifest=json.loads((root/'docs/3d/cc0-rock-library.json').read_text())
dest=root/'assets/reference/cc0/kenney-nature-rocks'
dest.mkdir(parents=True,exist_ok=True)
results=[]
for item in manifest['files']:
 name=item['name']
 req=urllib.request.Request(item['url'],headers={'User-Agent':'kotama-asset-library/1.0'})
 with urllib.request.urlopen(req,timeout=35) as response: data=response.read()
 if len(data)<20 or data[:4]!=b'glTF' or struct.unpack_from('<I',data,8)[0]!=len(data):
  raise ValueError('Invalid GLB: '+name)
 (dest/name).write_bytes(data)
 results.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'source':item['url']})
 print('VERIFIED_GLB',name,len(data))
 (dest/'PROVENANCE.json').write_text(json.dumps({'license':'CC0-1.0','source':'https://kenney.nl/assets/nature-kit','models':results},indent=2)+'\n')
print('TOTAL',len(results))

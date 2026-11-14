"""Download CC0 Poly Haven texture maps via documented API; no hardcoded asset URLs."""
import json,urllib.request,os
root='/work/tools/floor3/elevated_bridge/textures'
os.makedirs(root,exist_ok=True)
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'kotama-asset-research/1.0'}),timeout=25) as r:return r.read()
for query,dest in [('concrete','concrete_diff.jpg'),('rust','rust_diff.jpg')]:
 try:
  assets=json.loads(get('https://api.polyhaven.com/assets?t=textures&c='+query))
  candidates=[(key,val) for key,val in assets.items() if query in (key+' '+str(val.get('name',''))).lower()]
  if not candidates:candidates=list(assets.items())
  if not candidates:raise RuntimeError('No texture assets returned')
  key,_=candidates[0]
  files=json.loads(get('https://api.polyhaven.com/files/'+key))
  options=files.get('Diffuse') or files.get('diffuse') or {}
  variants=options.get('1k') or options.get('2k') or {}
  item=variants.get('jpg') or variants.get('png') or next(iter(variants.values()),None)
  if not item or not item.get('url'):raise RuntimeError('No diffuse map')
  blob=get(item['url']);open(os.path.join(root,dest),'wb').write(blob)
  print('TEXTURE_FETCH_OK',query,key,len(blob),item['url'])
 except Exception as exc:
  print('TEXTURE_FETCH_FAILED_USING_PROCEDURAL_FALLBACK',query,repr(exc))

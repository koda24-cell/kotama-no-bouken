"""Download official CC0 1k PBR maps for the 3F switchback stair.
Run within GitHub Actions; fail on missing maps or digest mismatch.
Powered by Poly Haven — https://polyhaven.com/
"""
import hashlib,json,pathlib,urllib.request,time,datetime
ROOT=pathlib.Path('out/pbr_sources')
ROOT.mkdir(parents=True,exist_ok=True)
USER_AGENT='Kotama-Asset-Research/1.0 (GitHub Actions; Poly Haven CC0)'

def get(url):
  req=urllib.request.Request(url,headers={'User-Agent':USER_AGENT})
  for attempt in range(3):
    try:
      with urllib.request.urlopen(req,timeout=50) as res:return res.read()
    except Exception:
      if attempt==2:raise
      time.sleep(2*(attempt+1))

def find(mapdict,candidates):
  key=next((k for k in mapdict if k.lower() in candidates),None)
  if key is None:raise KeyError(f"Missing map {candidates}; available: {list(mapdict)}")
  variants=mapdict[key]
  resolution=next((r for r in ('1k','2k') if r in variants),None)
  if resolution is None:raise KeyError(f"Missing 1k/2k resolution for {key}")
  formats=variants[resolution]
  fmt=next((e for e in ('jpg','png') if e in formats),None)
  if fmt is None:raise KeyError(f"Missing jpg/png for {key}: {list(formats)}")
  return formats[fmt],fmt,key

manifest={'supplier':'Poly Haven','attribution':'Powered by Poly Haven','license':'CC0',
          'license_url':'https://polyhaven.com/license',
          'retrieved_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'maps':{}}
for asset in ('chipped_concrete','concrete_moss'):
  api='https://api.polyhaven.com/files/'+asset
  data=json.loads(get(api))
  manifest['maps'][asset]={}
  for kind,candidates in [('diffuse',('diffuse','basecolor','albedo')),
                          ('normal',('nor_gl','normal_gl','normal')),
                          ('roughness',('rough','roughness'))]:
    info,ext,original_key=find(data,candidates)
    raw=get(info['url'])
    if info.get('md5'):
      digest=hashlib.md5(raw).hexdigest()
      assert digest.lower()==info['md5'].lower(),f"Poly Haven MD5 mismatch for {asset} {kind}"
    assert len(raw)>1024,f"empty {asset}/{kind}"
    if ext=='png':assert raw[:8]==bytes.fromhex('89504e470d0a1a0a')
    if ext=='jpg':assert raw[:3]==bytes.fromhex('ffd8ff')
    out=ROOT/f'{asset}_{kind}.{ext}'
    out.write_bytes(raw)
    manifest['maps'][asset][kind]={'path':str(out.relative_to(pathlib.Path('out'))),
                                 'url':info['url'],'api_key':original_key,
                                 'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
    print('FETCHED',asset,kind,len(raw),flush=True)
(ROOT/'sources.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('POLY_HAVEN_CC0_TEXTURES_VERIFIED')

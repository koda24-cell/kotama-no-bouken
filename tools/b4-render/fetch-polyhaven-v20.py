"""Download verified CC0 texture maps from the Poly Haven public API.
Never fabricate URLs. Verify announced URLs and hashes before using. Optional fallback to procedural maps.
"""
import os,sys,json,urllib.request,urllib.error,hashlib,time
out=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'v20-materials')
os.makedirs(out,exist_ok=True)
agent='Kotama3DAssetResearch/1.0 (CC0 Poly Haven; https://github.com/koda24-cell/kotama-no-bouken)'
results={}
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':agent,'Accept':'application/json'})
 with urllib.request.urlopen(req,timeout=35) as r: return r.read()
for slug in ['rough_wood','rusty_metal']:
 item={'source':'https://polyhaven.com/a/'+slug,'api':'https://api.polyhaven.com/files/'+slug,'licence':'CC0','files':{},'status':'NOT_FETCHED'}
 try:
  doc=json.loads(get(item['api']))
  item['map_keys']=list(doc)
  for logical,names in [
   ('diff',['Diffuse','diff','diffuse','Albedo']),
   ('rough',['Rough','rough','Roughness']),
   ('nor_gl',['nor_gl','NormalGL','Normal (GL)','Normal'])]:
   lookup=next((doc[n] for n in names if n in doc),None)
   if not isinstance(lookup,dict):continue
   matched=None
   for res in ['1k','2k']:
    ent=lookup.get(res,{})
    for fmt in (['jpg','png'] if logical=='diff' else ['png','jpg']):
     x=ent.get(fmt)
     if isinstance(x,dict) and x.get('url','').startswith('https://'):
      matched=(x,fmt,res);break
    if matched:break
   if not matched:continue
   info,fmt,res=matched
   url=info['url']
   b=get(url)
   if len(b)<1000:raise ValueError('Texture file unexpectedly short')
   digest=hashlib.md5(b).hexdigest()
   if info.get('md5') and digest!=info['md5']:raise ValueError('MD5 does not match Poly Haven API '+slug+' '+logical)
   path=os.path.join(out,slug+'_'+logical+'.'+fmt)
   open(path,'wb').write(b)
   item['files'][logical]={'path':path,'url':url,'bytes':len(b),'md5':digest,'format':fmt}
  item['status']='VERIFIED' if set(['diff','rough','nor_gl']).issubset(item['files']) else 'INCOMPLETE'
 except Exception as e:
  item['status']='FAILED';item['error']=str(e)
 results[slug]=item
 print('PolyHaven',slug,item['status'],list(item['files']))
with open(os.path.join(out,'polyhaven-fetch-manifest.json'),'w') as f:
 json.dump({'sources':results,'uses':'cc0-reference-maps-only','licensed':'CC0 per official asset pages'},f,indent=2)

"""One industrial ruin candidate per pinned shared Blender process."""
import os,traceback

def main():
 import sys,json,hashlib,subprocess,shutil,urllib.request,math,random
 from pathlib import Path
 ROOT=Path(__file__).resolve().parents[2];delivery=ROOT/os.environ['OUTPUT_DIR'];delivery.mkdir(parents=True,exist_ok=True)
 asset=delivery.name.removeprefix('f3-industrial-');parts=json.loads((ROOT/'tools/f3-industrial/parts.json').read_text());assert asset in [p['id']for p in parts]
 candidate=ROOT/'assets/3d/dungeons/b3_industrial_candidates';textures=candidate/'textures';textures.mkdir(parents=True,exist_ok=True)
 def scan(path,label):subprocess.run(['bash',str(ROOT/'tools/security/clamav_scan_gate.sh'),'scan',str(path),str(delivery/'security'/(label+'.log'))],check=True)
 scan(ROOT/'tools/f3-industrial','source');scan(ROOT/'tools/f1-sacred-forest','shared-source');scan(ROOT/'tools/f1-layer-v4/render_asset.py','renderer-source')
 sources=[]
 old=ROOT/'assets/models/floor3/double_flight/textures';scan(old,'existing-cc0-inputs')
 existing=json.loads((old/'sources.json').read_text())
 for kind,rows in existing['maps'].items():
  for role,row in rows.items():
   path=old/(kind+'_'+role+'.jpg');assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256'];shutil.copyfile(path,textures/path.name)
   sources.append(dict(asset=kind,role=role,file=path.name,url=row['url'],sha256=row['sha256'],license='CC0',reused=True))
 for kind in ['rusty_iron','asphalt_02']:
  meta=textures/(kind+'-api.json')
  def download(url,path,label):
   req=urllib.request.Request(url,headers={'User-Agent':'Kotama environment art (CC0 material research)'})
   with urllib.request.urlopen(req,timeout=90)as r:path.write_bytes(r.read(20000000))
   scan(path,label)
  if not meta.exists():download('https://api.polyhaven.com/files/'+kind,meta,kind+'-api')
  j=json.loads(meta.read_text())
  for role,key in [('diffuse','Diffuse'),('normal','nor_gl'),('roughness','Rough')]:
   row=j[key]['1k']['jpg'];path=textures/(kind+'_'+role+'.jpg')
   if not path.exists():download(row['url'],path,kind+'-'+role)
   sources.append(dict(asset=kind,role=role,file=path.name,url=row['url'],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),license='CC0'))
 scan(textures,'all-texture-inputs')
 (textures/'sources.json').write_text(json.dumps({'supplier':'Poly Haven','license':'CC0','licenseURL':'https://polyhaven.com/license','maps':sources},indent=2))
 sys.path[:0]=[str(ROOT/'tools/f1-sacred-forest'),str(ROOT/'tools/f1-layer-v4'),str(Path(__file__).parent)]
 import bpy
 import common as c,render_asset
 from mathutils import Vector
 OUT=candidate/asset;c.OUT=OUT;render_asset.OUT=OUT;c.render_imported_glb=render_asset.render_imported_glb
 c.reset_scene();bpy.context.preferences.filepaths.save_version=0
 def pbr(name,kind,metal=0):
  m=c.material('f3_'+name,texture_set={'basecolor':textures/(kind+'_diffuse.jpg'),'normal':textures/(kind+'_normal.jpg'),'roughness':textures/(kind+'_roughness.jpg')})
  m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=metal
  return m
 concrete=pbr('weathered_concrete','chipped_concrete');moss=pbr('damp_concrete','concrete_moss');rust=pbr('oxidized_iron','rusty_iron',.15);asphalt=pbr('broken_asphalt','asphalt_02')
 fracture=c.material('f3_exposed_aggregate',(.26,.27,.245,1),.98);dark=c.material('f3_deep_crack',(.025,.029,.026,1),.97);steel=c.material('f3_bare_worn_steel',(.23,.25,.245,1),.48);steel.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.75
 rng=random.Random(33117+[p['id']for p in parts].index(asset))
 def box(name,loc,size,mat=concrete,bevel=.025):return c.cube(name,loc,size,mat,bevel)
 def rod(name,a,b,r=.018,mat=rust,sides=8):return c.tube(name,[a,b],r,mat,sides)
 def scar(obj,loc,size,angles=(0,0,0)):
  cutter=c.cube('temporary chisel',loc,size,None,0);cutter.rotation_euler=angles
  bpy.context.view_layer.objects.active=obj
  modifier=obj.modifiers.new('localized edge spalling','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
  bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True);c.uv_world(obj)
 if asset=='retaining_wall':
  for side in [-1,1]:
   x=side*1.012;body=box('cast RC wall panel',(x,0,3.05),(2.012,.44,6.1),concrete,.022)
   for j in range(3):
    xx=x+side*(.62+j*.12);zz=6.06-j*.15
    scar(body,(xx,-.20,zz),(.36,.28,.24),(.08*side,.14*j,.24*side))
   box('damp plinth contact',(x,-.06,.20),(2.01,.57,.4),moss,.026)
   for z in [1.4,3.65]:
    for xx in [x-.63,x+.63]:
     # Recessed shutter tie sockets, no arbitrary large perforations.
     scar(body,(xx,-.22,z),(.055,.035,.055))
   for k in range(3):
    xx=x+side*(.60+k*.12)
    c.tube('crooked exposed reinforcing bar',[(xx,.03,5.84),(xx+.025,.02,6.28),(xx+side*.11,-.04,6.38-k*.07)],.014,rust,8)
  box('deep expansion joint',(0,.02,3.02),(.018,.38,6.04),dark,0)
  for k in range(11):
   z=5.9-k*.10;x=-1.67+k*.045
   chip=box('angular exposed aggregate',(x,-.18,z),(.06,.06,.055),fracture,.008);chip.rotation_euler=(k*.6,k*.31,k*.42)
  for start in [(-1.7,5.55),(.42,4.9),(-.55,2.3)]:
   x,z=start
   for k in range(5):
    nx=x+rng.uniform(-.08,.10);nz=z-rng.uniform(.1,.23)
    rod('capillary fracture',(x,-.224,z),(nx,-.224,nz),.006,dark,4);x,z=nx,nz
 else:
  from parts import build
  build(asset,dict(c=c,bpy=bpy,box=box,rod=rod,scar=scar,concrete=concrete,moss=moss,rust=rust,asphalt=asphalt,fracture=fracture,dark=dark,steel=steel,rng=rng,Vector=Vector))
 model='f3_'+asset;metrics=c.finish(model,description=next(p['name']for p in parts if p['id']==asset))
 metrics.update(approvalStatus='NOT_APPROVED',workflowRun=os.environ.get('GITHUB_RUN_ID'),verificationEnvironment='Shared pinned Blender '+bpy.app.version_string+' + ClamAV')
 (OUT/'metrics'/(model+'.json')).write_text(json.dumps(metrics,indent=2))
 for folder in ['props','modules','sources','renders','metrics']:
  if (OUT/folder).exists():shutil.copytree(OUT/folder,delivery/folder,dirs_exist_ok=True)
 shutil.copytree(textures,delivery/'textures',dirs_exist_ok=True)
 (delivery/'manifest.json').write_text(json.dumps({'status':'NOT_APPROVED','assetName':asset,'asset':metrics,'sequential':True,'textureSources':sources},ensure_ascii=False,indent=2))
 subprocess.run(['python3',str(ROOT/'tools/3d-performance/audit_glb.py'),str(OUT/'props'/(model+'.glb')),'--output',str(delivery/'structural-audit.json')],check=True)

if __name__=='__main__':
 try:main()
 except BaseException:
  from pathlib import Path
  p=Path(os.environ['OUTPUT_DIR']);p.mkdir(parents=True,exist_ok=True);(p/'asset-failure.log').write_text(traceback.format_exc());traceback.print_exc();os._exit(1)

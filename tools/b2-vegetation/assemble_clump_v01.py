"""Review-only B2 maidenhair clump builder. Depends on V03 frond review GLB.
The V08 leaf inside the frond is reused without re-modeling.
Invocation: python tools/b2-vegetation/assemble_clump_v01.py --frond-glb arched.glb
"""
from pathlib import Path
import argparse,hashlib,json,math,random
import numpy as np,trimesh
def generate(source,output):
 frond=trimesh.load(source,force='scene')
 output.mkdir(parents=True,exist_ok=True)
 result={'status':'NOT_APPROVED','frond_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'variants':{}}
 for name,count in (('spaced',4),('balanced',6),('full',8)):
  rng=random.Random(311+count)
  scene=trimesh.Scene()
  for i in range(count):
   yaw=i*math.tau/count+rng.uniform(-.35,.35)
   lean=.12+rng.uniform(0,.22)
   transform=trimesh.transformations.rotation_matrix(yaw,[0,1,0])@trimesh.transformations.rotation_matrix(lean,[1,0,0])
   transform[:3,:3]*=rng.uniform(.72,1.10)
   transform[:3,3]=[rng.uniform(-.025,.025),rng.uniform(-.002,.003),rng.uniform(-.025,.025)]
   for node in frond.graph.nodes_geometry:
    local,key=frond.graph[node];mesh=frond.geometry[key].copy()
    mesh.apply_transform(local);mesh.apply_transform(transform)
    scene.add_geometry(mesh,geom_name=f'{name}_{i:02}_{key}')
  glb=output/(name+'.glb');scene.export(glb)
  result['variants'][name]={'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'meshes':len(scene.geometry),'bounds':scene.bounds.tolist()}
 (output/'manifest.json').write_text(json.dumps(result,indent=2))
 print('B2_FERN_CLUMP_V01',len(result['variants']))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--frond-glb',required=True,type=Path)
 p.add_argument('--output',type=Path,default=Path('render-output/b2-fern-clump-v01'))
 a=p.parse_args();generate(a.frond_glb,a.output)

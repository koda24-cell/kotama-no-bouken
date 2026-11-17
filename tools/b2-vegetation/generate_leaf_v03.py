"""B2 maidenhair pinnule V03. Five isolated botanical leaf geometries.
Original generated models, no third-party image; review only, not approved.
This is a standalone leaf prototype, not a whole plant.
pip install numpy trimesh
python tools/b2-vegetation/generate_leaf_v03.py
"""
import math, json, hashlib, os
from pathlib import Path
import numpy as np
import trimesh
OUT = Path(os.environ.get("B2_LEAF_OUTPUT","render-output/b2-fern-leaf-v03"))
OUT.mkdir(parents=True,exist_ok=True)
VARIANTS=[
 dict(name='A_round',width=.86,length=.116,notch=.07,camber=.11,twist=.05,hue=1.00,lobes=3),
 dict(name='B_lobed',width=1.00,length=.121,notch=.105,camber=.11,twist=.07,hue=.94,lobes=5),
 dict(name='C_young',width=.69,length=.084,notch=.04,camber=.19,twist=.08,hue=1.19,lobes=3),
 dict(name='D_weathered',width=.94,length=.112,notch=.085,camber=.14,twist=.09,hue=.78,lobes=4),
 dict(name='E_curled',width=.89,length=.125,notch=.085,camber=.20,twist=.17,hue=.99,lobes=4)
]
def build_leaf(spec):
 length=spec['length'];nang=51;nrad=14
 angles=np.linspace(-1.05,1.05,nang);rings=np.linspace(0,1,nrad)
 verts=[];colors=[];faces=[];lobes=spec['lobes'];hue=spec['hue']
 for r in rings:
  for a in angles:
   lobe_wave=(1-np.cos(lobes*(a+1.05)*math.pi/2.10))*.5
   dents=sum(math.exp(-((a-(-1.05+2.10*k/lobes))/.105)**2) for k in range(1,lobes))
   R=length*(1-.045*lobe_wave-spec['notch']*dents)
   x=spec['width']*R*math.sin(a)*.91*r+.002*math.sin(3*a+r*2)*r*r
   y=R*math.cos(a)*r
   z=(spec['camber']*length*math.sin(math.pi*r)*math.cos(a*.8)
      +spec['twist']*length*r*r*math.sin(a*2.1)+.0011*r*r*math.sin(a*19))
   verts.append([x,y,z])
   gradient=.90+.18*r+.07*math.cos(a*2.8)
   col=np.clip(np.array([66,126,73])*hue*gradient,0,255).astype(np.uint8)
   if spec['name']=='D_weathered' and abs(a)>.86 and r>.88:col=np.array([100,110,65],dtype=np.uint8)
   colors.append([*col,255])
 for ri in range(nrad-1):
  for ai in range(nang-1):
   p=ri*nang+ai;q=p+nang
   faces.extend([[p,p+1,q],[p+1,q+1,q],[q,p+1,p],[q,q+1,p+1]])
 leaf=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 leaf.visual.vertex_colors=np.array(colors,dtype=np.uint8)
 veins=[]
 for ai in range(4,nang-1,6):
  points=[]
  for ri in range(1,nrad):
   v=np.asarray(verts[ri*nang+ai]).copy();v[2]+=.0004;points.append(v)
  veins.append(points)
 return leaf,veins
def create_scene(spec):
 leaf,veins=build_leaf(spec)
 scene=trimesh.Scene();scene.add_geometry(leaf,geom_name='pinnule_surface')
 for i,ps in enumerate(veins):
  points=np.asarray(ps);tube_verts=[];tube_faces=[];sides=5
  for j,p in enumerate(points):
   tangent=points[min(j+1,len(points)-1)]-points[max(j-1,0)]
   tangent/=max(np.linalg.norm(tangent),1e-8)
   cross=np.cross(tangent,[0,0,1]);cross/=max(np.linalg.norm(cross),1e-8)
   normal=np.cross(tangent,cross)
   radius=.00025*(1-j/len(points))+.00011
   for k in range(sides):
    ang=math.tau*k/sides
    tube_verts.append(p+radius*(math.cos(ang)*cross+math.sin(ang)*normal))
   if j:
    for k in range(sides):
     a=(j-1)*sides+k;b=(j-1)*sides+(k+1)%sides;c=j*sides+k;d=j*sides+(k+1)%sides
     tube_faces.extend([[a,b,c],[b,d,c]])
  tube=trimesh.Trimesh(vertices=tube_verts,faces=tube_faces,process=False)
  tube.visual.vertex_colors=np.tile(np.array([82,151,87,255],dtype=np.uint8),(len(tube.vertices),1))
  scene.add_geometry(tube,geom_name=f'vein_{i:02}')
 return scene
if __name__=='__main__':
 manifest={'status':'NOT_APPROVED','asset':'maidenhair_leaf_v03','stage':'b2','unit':'m','variants':[],'source':Path(__file__).name}
 for spec in VARIANTS:
  scene=create_scene(spec);p=OUT/(spec['name']+'.glb');scene.export(p)
  manifest['variants'].append({'id':spec['name'],'settings':spec,'glb':p.name,
   'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'meshes':len(scene.geometry),'bounds':scene.bounds.tolist()})
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
 print('B2_LEAF_V03',len(VARIANTS),'candidate GLBs')

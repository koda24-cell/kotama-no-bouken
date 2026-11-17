"""B2 maidenhair-inspired fern V02: self-contained procedural review prototype.
Original meshes, no third-party imagery embedded. Compare with V01; NOT_APPROVED.
pip install numpy trimesh; python tools/b2-vegetation/generate_fern_v02.py
"""
import math, random, json, hashlib, os
from pathlib import Path
import numpy as np
import trimesh

OUT=Path(os.environ.get("B2_FERN_V02_OUTPUT","render-output/b2-wet-fern-v02"))
OUT.mkdir(parents=True, exist_ok=True)

def tube(points, width, color, sides=6):
 p=np.array(points,float); verts=[]; faces=[]
 for j,v in enumerate(p):
  tangent=p[min(j+1,len(p)-1)]-p[max(0,j-1)]
  tangent/=max(np.linalg.norm(tangent),1e-7)
  u=np.cross(tangent,[0,0,1]); u/=max(np.linalg.norm(u),1e-7)
  normal=np.cross(tangent,u)
  rad=width*(.45+.55*(1-j/max(1,len(p)-1)))
  for k in range(sides):
   angle=k*math.tau/sides
   verts.append(v+rad*(u*math.cos(angle)+normal*math.sin(angle)))
 for j in range(len(p)-1):
  for k in range(sides):
   a=j*sides+k; b=j*sides+(k+1)%sides; c=(j+1)*sides+k; d=(j+1)*sides+(k+1)%sides
   faces.extend([(a,b,c),(b,d,c)])
 mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 mesh.visual.vertex_colors=np.tile(np.array(color,dtype=np.uint8),(len(verts),1))
 return mesh

def fan_leaf(anchor,direction,size,rng,color):
 p=np.array(anchor,float); direction=np.array(direction,float); direction/=np.linalg.norm(direction)
 tangent=np.cross(direction,[0,0,1]); tangent/=max(np.linalg.norm(tangent),1e-6)
 normal=np.cross(direction,tangent); normal/=max(np.linalg.norm(normal),1e-6)
 halfwidth=size*(.79+rng.uniform(-.08,.08))
 center=p+direction*size*.36+normal*size*.025
 vertices=[p,center]
 for i in range(13):
  f=i/12; theta=(f-.5)*1.8
  scallop=.015*math.cos(theta*21)*size
  vertices.append(p+direction*(size*(.88+.11*math.cos(theta))+scallop)
                  +tangent*(halfwidth*math.sin(theta)*1.5)
                  +normal*(size*.10*math.sin(f*math.pi)))
 faces=[]
 for i in range(12):
  faces.extend([(1,2+i,3+i),(3+i,2+i,1)])
 faces.extend([(0,1,2),(2,1,0),(0,len(vertices)-1,1),(1,len(vertices)-1,0)])
 mesh=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
 mesh.visual.vertex_colors=np.array([[min(255,int(c*np.clip(.89+.19*np.linalg.norm(v-p)/size,.84,1.12))) for c in color[:3]]+[255] for v in vertices],dtype=np.uint8)
 return mesh

def build(seed=20261117):
 rng=random.Random(seed); meshes=[]
 stalks=12
 for n in range(stalks):
  a=n*math.tau/stalks+rng.uniform(-.35,.35)
  height=rng.uniform(.75,1.08);lean=rng.uniform(.25,.53);twist=rng.uniform(-.22,.22)
  offset=np.array([rng.uniform(-.027,.027),rng.uniform(-.027,.027),0])
  points=[]
  for j in range(28):
   t=j/27; sway=lean*t**1.42
   z=height*(t-.42*t*t)
   points.append(offset+[math.cos(a)*sway+twist*t*t,
                         math.sin(a)*sway+.04*math.sin(t*math.tau+n),z])
  meshes.append(tube(points,.0075,(49,38,31,255)))
  count=rng.randrange(12,17)
  for b in range(count):
   t=.12+.80*(b+.2*rng.random())/count
   base=np.array(points[min(27,int(t*27))]);sign=-1 if b%2 else 1
   angle=a+sign*(1.20+rng.uniform(-.40,.40))
   reach=(.10+.18*math.sin(t*math.pi))*(.78+rng.random()*.37)
   tip=base+[math.cos(angle)*reach,math.sin(angle)*reach,reach*rng.uniform(-.28,.20)]
   meshes.append(tube([base,(base*2+tip)/3,(base+tip*2)/3,tip],.0032,(62,42,35,255),5))
   direction=[math.cos(angle),math.sin(angle),rng.uniform(-.12,.23)]
   size=rng.uniform(.095,.143)*(1.10 if .30<t<.84 else .91)
   color=(rng.randint(78,112),rng.randint(139,181),rng.randint(72,111),255)
   meshes.append(fan_leaf(tip,direction,size,rng,color))
 scene=trimesh.Scene()
 for i,mesh in enumerate(meshes):scene.add_geometry(mesh,geom_name=f"wet_fern_v02_{i:04d}")
 scene.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
 return scene

if __name__=="__main__":
 scene=build(seed=int(os.environ.get("B2_FERN_SEED","20261117")))
 output=OUT/"b2_wet_fern_v02_review.glb";scene.export(output)
 report={"asset":"b2_wet_fern_v02","status":"NOT_APPROVED","source":"original procedural geometry based on Pinterest-scoped fern references and independently viewed botany photos","geometry_count":len(scene.geometry),"bounds":scene.bounds.tolist(),"sha256":hashlib.sha256(output.read_bytes()).hexdigest(),"render_status":"local preview only; GitHub Actions Blender not yet verified"}
 (OUT/"manifest.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print("B2_FERN_V02",output,len(scene.geometry),scene.bounds)

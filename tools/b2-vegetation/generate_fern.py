"""B2 wet ruin fern V01 — standalone reproducible prototype.
Requires: pip install numpy trimesh pillow
Output is a review candidate, NOT_APPROVED; Blender review required.
"""
import math,random,json,os
from pathlib import Path
import numpy as np
import trimesh
OUT=Path(os.environ.get("B2_FERN_OUTPUT","render-output/b2-wet-ruin-fern-v01"))
OUT.mkdir(parents=True,exist_ok=True)
def tube(points,radii,sides=7,color=(54,78,48,255)):
 vertices=[];faces=[]
 for j,p in enumerate(points):
  tangent=np.array(points[min(len(points)-1,j+1)])-np.array(points[max(0,j-1)])
  tangent=tangent/np.linalg.norm(tangent)
  u=np.cross(tangent,[0,1,0]);u=u/(np.linalg.norm(u)+1e-8)
  v=np.cross(tangent,u)
  for k in range(sides):
   a=math.tau*k/sides
   vertices.append(np.array(p)+radii[j]*(math.cos(a)*u+math.sin(a)*v))
 for j in range(len(points)-1):
  for k in range(sides):
   a=j*sides+k;b=j*sides+(k+1)%sides;c=(j+1)*sides+k;d=(j+1)*sides+(k+1)%sides
   faces.extend([(a,b,c),(b,d,c)])
 m=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
 m.visual.vertex_colors=np.array([color]*len(vertices),dtype=np.uint8)
 return m
def leaf(start,end,width,color,segments=7):
 start=np.array(start);end=np.array(end);axis=end-start
 spine=axis/np.linalg.norm(axis)
 perp=np.cross(spine,[0,0,1]);perp=perp/(np.linalg.norm(perp)+1e-8)
 normal=np.cross(spine,perp);verts=[]
 for i in range(segments+1):
  t=i/segments;center=start+axis*t+normal*(.028*math.sin(t*math.pi))
  broad=width*(math.sin(math.pi*t)**.70)*(.80+.20*math.sin(t*math.pi))
  verts.extend([center-perp*broad/2,center+perp*broad/2])
 faces=[]
 for i in range(segments):
  a=i*2;faces.extend([(a,a+1,a+2),(a+1,a+3,a+2),(a+2,a+1,a),(a+2,a+3,a+1)])
 m=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 m.visual.vertex_colors=np.array([color]*len(verts),dtype=np.uint8)
 return m
def build(seed=71):
 rng=random.Random(seed);meshes=[]
 for n in range(11):
  ang=math.tau*(n/11)+rng.uniform(-.22,.22)
  height=rng.uniform(.63,1.15);radius=rng.uniform(.18,.39);count=26;points=[]
  for i in range(count):
   t=i/(count-1)
   points.append((math.cos(ang)*radius*(t**1.55),math.sin(ang)*radius*(t**1.55),height*t*(1-.14*t)))
  meshes.append(tube(points,[.015*(1-i/(count-1))+.002 for i in range(count)],color=(59,84,54,255)))
  for j in range(3,24):
   t=j/25;center=np.array(points[j])
   side=np.array([-math.sin(ang),math.cos(ang),0])
   width=.19*(math.sin(math.pi*t)**.72)*rng.uniform(.82,1.09)
   length=width*(.75+.3*rng.random())
   for sign in (-1,1):
    start=center+np.array([0,0,(sign>0)*.013])
    end=start+side*sign*length+np.array([math.cos(ang),math.sin(ang),.10])*length
    shade=rng.uniform(.85,1.14)
    color=tuple(int(max(0,min(255,c*shade))) for c in (74,130,86))+(255,)
    meshes.append(leaf(start,end,width*.34,color))
 scene=trimesh.Scene()
 for i,m in enumerate(meshes):scene.add_geometry(m,geom_name=f"fern_{i:04}")
 return scene
if __name__=="__main__":
 scene=build()
 # Authoring space is Z-up; glTF/Three.js is Y-up. Rotate once for export.
 scene.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
 p=OUT/"b2_wet_ruin_fern_v01.glb";scene.export(p)
 meta={"asset_id":"b2_wet_ruin_fern_v01","status":"NOT_APPROVED","seed":71,
 "anchor":"root_at_origin","allowed_surfaces":["wet_rock","ruin_crack","shore_soil","cave_floor"],
 "exclude_surfaces":["water","ice_smooth","walkway","door","stairs"],
 "randomize":{"yaw_degrees":[0,360],"uniform_scale":[.70,1.22],"density_per_4m2":[0,3]},
 "clearance_radius_m":.43,"collider":"nonblocking","geometry_count":len(scene.geometry),
 "bounds_m":scene.bounds.tolist(),"source":"tools/b2-vegetation/generate_fern.py"}
 (OUT/"manifest.json").write_text(json.dumps(meta,indent=2,ensure_ascii=False))
 print("B2_FERN_PROTOTYPE",p,len(scene.geometry),scene.bounds)

"""B2 modular fern frond V03. Reuse the visually approved V08 leaf GLB.
Dependencies: numpy trimesh. This is a review-only model, not production.
Example: python tools/b2-vegetation/generate_frond_v03.py --leaf-glb embedded_subtle.glb
The input leaf must be supplied from the approved V08 review and checked by hash.
"""
import argparse,hashlib,json,math,random
from pathlib import Path
import numpy as np,trimesh
APPROVED_V08_SHA256="3c1be5c3d00d2d6dd79f0f2f66db3ad312aa539222fea244799e0cfab9be9"

def tube(points,width,color):
 p=np.asarray(points,float);verts=[];faces=[]
 for i,pos in enumerate(p):
  tangent=p[min(i+1,len(p)-1)]-p[max(i-1,0)]
  tangent/=max(np.linalg.norm(tangent),1e-8)
  u=np.cross(tangent,[0,0,1])
  if np.linalg.norm(u)<.01:u=np.cross(tangent,[0,1,0])
  u/=np.linalg.norm(u);v=np.cross(tangent,u)
  for j in range(6):
   a=math.tau*j/6;r=width*(.78+.22*(1-i/(len(p)-1)))
   verts.append(pos+r*(math.cos(a)*u+math.sin(a)*v))
  if i:
   for j in range(6):
    a=(i-1)*6+j;b=(i-1)*6+(j+1)%6;c=i*6+j;d=i*6+(j+1)%6
    faces.extend(((a,b,c),(b,d,c)))
 mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
 mesh.visual.vertex_colors=np.tile(np.asarray(color,dtype=np.uint8),(len(mesh.vertices),1))
 return mesh

def rotation_from_y(direction):
 src=np.array([0.,1.,0.]);dest=np.asarray(direction,float);dest/=np.linalg.norm(dest)
 axis=np.cross(src,dest);n=np.linalg.norm(axis)
 if n<1e-8:return np.eye(3)
 return trimesh.transformations.rotation_matrix(math.atan2(n,np.dot(src,dest)),axis/n)[:3,:3]

def add_leaf(scene,template,name,pos,direction,scale,twist=0):
 leaf=template.copy();leaf.apply_scale(scale)
 rot=rotation_from_y(direction)
 winding=trimesh.transformations.rotation_matrix(twist,[0,1,0])[:3,:3]
 m=np.eye(4);m[:3,:3]=rot@winding
 leaf.apply_transform(m);leaf.apply_translation(pos)
 scene.add_geometry(leaf,geom_name=name)

def build(template,style,seed):
 rng=random.Random(seed);scene=trimesh.Scene()
 n=31;length={'airy':.65,'arched':.73,'dense':.68}[style]
 lean={'airy':.10,'arched':.18,'dense':.12}[style]
 points=[]
 for k in range(n):
  t=k/(n-1)
  points.append([lean*t*t+.015*math.sin(2.8*t),.028*math.sin(3*t+(-.1 if style!='dense' else .18)),length*(t-.35*t*t)])
 scene.add_geometry(tube(points,.0037,(47,43,34,255)),geom_name='main_rachis')
 count={'airy':8,'arched':10,'dense':12}[style]
 for i in range(count):
  t=.14+(i+.20*rng.random())/(count+.5)*.78
  base=np.asarray(points[min(n-1,int(t*(n-1)))])
  sign=-1 if i%2 else 1
  reach=(.175*(1-t)**.60+.03)*rng.uniform(.82,1.14)
  a=sign*(.90+.16*rng.uniform(-1,1))
  tip=base+np.array([sign*math.sin(abs(a))*reach,math.cos(a)*reach*.23,
                     reach*(.08-.30*t)+rng.uniform(-.008,.008)])
  route=[base,base+.24*(tip-base)+[0,0,.007],base+.59*(tip-base)+[0,0,.005],tip]
  scene.add_geometry(tube(route,.00175,(65,50,36,255)),geom_name=f'side_rachis_{i:02}')
  nleaf={'airy':2,'arched':3,'dense':3}[style]
  for j in range(nleaf):
   frac=(j+.28)/(nleaf+.30)
   p=base+(tip-base)*frac+[0,0,.004*math.sin(math.pi*frac)]
   scale=(.29+.11*rng.random())*(.9+.25*math.sin(math.pi*frac))
   if style=='airy':scale*=.90
   left=-1 if (i+j)%2 else 1
   direction=(tip-base)*.64+[left*.05,left*.08,.018-.025*frac]
   add_leaf(scene,template,f'approved_v08_leaf_{i:02}_{j:02}',p,direction,scale,
            rng.uniform(-.32,.32))
 last=np.asarray(points[-1]);before=np.asarray(points[-5])
 add_leaf(scene,template,'apical_v08_leaf',last,last-before+[.02,0,.02],.33 if style=='airy' else .38)
 scene.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
 return scene

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--leaf-glb',required=True,type=Path)
 parser.add_argument('--output',type=Path,default=Path('render-output/b2-fern-frond-v03'))
 args=parser.parse_args()
 digest=hashlib.sha256(args.leaf_glb.read_bytes()).hexdigest()
 if digest!=APPROVED_V08_SHA256:raise RuntimeError('V08 leaf checksum mismatch; do not substitute')
 original=trimesh.load(args.leaf_glb,force='scene')
 template=original.geometry['one_continuous_lamina'].copy()
 args.output.mkdir(parents=True,exist_ok=True)
 manifest={'status':'NOT_APPROVED','leaf_visual_status':'USER_APPROVED','leaf_sha256':digest,'variants':{}}
 for index,style in enumerate(('airy','arched','dense')):
  scene=build(template,style,10091+219*index)
  output=args.output/(style+'.glb');scene.export(output)
  manifest['variants'][style]={'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'mesh_count':len(scene.geometry)}
 (args.output/'manifest.json').write_text(json.dumps(manifest,indent=2))
 print('FROND_V03_CANDIDATES',len(manifest['variants']))

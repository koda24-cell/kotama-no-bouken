"""V08: preserve V07 Delicate's leaf shape, remove floating vein ribbons.
GLB leaf surface is kept unchanged; subtle pigment veins live on vertices.
Source of prior V07 is the archived GLB supplied for approved front silhouette.
Command: python tools/b2-vegetation/repair_leaf_v08.py --input <V07_delicate.glb>
Review only, NOT_APPROVED. No old assets are overwritten.
"""
import argparse, hashlib, json, math
from pathlib import Path
import numpy as np
import trimesh

def build(source, output):
    old=trimesh.load(source,force='scene')
    lamina=old.geometry['leaf_lamina']
    # Unlike the old separate 21 floating ribbons, only the continuous lamina.
    vertices=np.asarray(lamina.vertices).copy()
    rgb=np.asarray(lamina.visual.vertex_colors)[:,:3].astype(float)
    x,y,z=vertices.T
    a=np.arctan2(x/.91,y)
    r=np.clip(np.sqrt(x*x+y*y)/.122,0,1)
    major_angles=[-.91,-.69,-.44,-.17,.085,.34,.57,.83]
    masks=np.zeros(len(vertices))
    for i,a0 in enumerate(major_angles):
        center=a0+.014*math.sin(i*1.73)*r+.021*np.sin(np.pi*r)*(-1 if i%2 else 1)
        primary=np.exp(-.5*((a-center)/(.010+.008*r))**2)
        primary*=np.clip((r-.10)/.12,0,1)*np.clip((1.02-r)/.16,0,1)
        masks=np.maximum(masks,primary)
        for j,r0 in enumerate((.53,.71) if i%3 else (.62,)):
            advance=np.clip(r-r0,0,1)
            branch=center+(1 if (i+j)%2 else -1)*advance*(.19 if j==0 else .11)
            secondary=np.exp(-.5*((a-branch)/(.007+.006*r))**2)
            secondary*=np.clip(advance/.075,0,1)*np.clip((.99-r)/.13,0,1)
            masks=np.maximum(masks,secondary*.56)
    output.mkdir(parents=True,exist_ok=True)
    manifest={'status':'NOT_APPROVED','base':str(source),'variants':[],'source':'V07 Delicate lamina with continuous normals; no detached vein meshes'}
    for name,strength in [('front_clean',0),('embedded_subtle',.045),('embedded_defined',.080)]:
        mesh=trimesh.Trimesh(vertices=vertices,faces=lamina.faces,process=False)
        result=np.uint8(np.clip(rgb*(1+strength*masks[:,None]),0,255))
        mesh.visual.vertex_colors=np.column_stack((result,np.full(len(result),255,dtype=np.uint8)))
        scene=trimesh.Scene();scene.add_geometry(mesh,geom_name='one_continuous_lamina')
        scene.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
        dest=output/(name+'.glb');scene.export(dest)
        manifest['variants'].append({'name':name,'glb':dest.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'mesh_count':1})
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    print('B2_LEAF_V08',len(manifest['variants']),'comparison models')

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--input',type=Path,required=True,help='V07 Delicate review GLB, not necessarily checked into Git')
    p.add_argument('--output',type=Path,default=Path('render-output/b2-fern-leaf-v08'))
    args=p.parse_args()
    build(args.input,args.output)

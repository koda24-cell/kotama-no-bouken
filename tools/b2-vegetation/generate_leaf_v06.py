"""B2 maidenhair pinnule V06 — suppress artificial striping.
Three incremental leaf candidates, preserve all V03/V04/V05 source files.
Generate with numpy+trimesh; VTK preview is separately produced locally.
"""
import hashlib, json, math, os
from pathlib import Path
import numpy as np
import trimesh

ROOT=Path(os.environ.get('B2_LEAF_V06_OUTPUT','render-output/b2-fern-leaf-v06'))
ROOT.mkdir(parents=True,exist_ok=True)
CONFIGS=[('V06_clean',1),('V06_subtle',2),('V06_edge_detail',3)]
def create_leaf(style):
    nang,nr,L=196,54,.121
    angles=np.linspace(-1.045,1.045,nang);t=(angles+1.045)/2.09
    lobes=[(.14,.023,.066),(.316,.027,.092),(.492,.023,.057),(.713,.028,.076),(.872,.024,.049)]
    dents=sum(d*np.exp(-.5*((t-c)/w)**2) for c,w,d in lobes)
    radius=L*(1+.028*np.cos(angles*1.4)-.028*np.sin(angles+.4))*(1-dents*(1 if style<3 else 1.09))
    if style==3:
        radius*=1+.0045*np.sin(130*t+2)*np.clip((np.abs(angles)-.14)*2,0,1)
    points=[];colors=[];faces=[]
    for ir,s in enumerate(np.linspace(0,1,nr)):
        for ia,a in enumerate(angles):
            r=s*radius[ia]
            x=.91*r*np.sin(a);y=r*np.cos(a)
            z=.0075*np.sin(np.pi*s)*np.cos(a*.7)+.004*s*s*np.sin(a*1.5)+.0012*s*s*np.cos(a*4.3)
            points.append((x,y,z))
            broad=.026*np.sin(2.13*a+.7)+.019*np.cos(a*4.05+1.6)*s
            mottled=0 if style==1 else .014*(math.sin(7*x*43+y*15)+.65*math.cos(y*22-x*19))
            shade=.90+.09*s+broad+mottled+.075*s*s
            rgb=np.clip(np.array([86,151,89])*shade+[6*s,4*s,2*s],0,255).astype(np.uint8)
            colors.append([*rgb,255])
    for ir in range(nr-1):
        for ia in range(nang-1):
            p=ir*nang+ia;q=p+nang
            faces.extend([(p,p+1,q),(p+1,q+1,q)])
    mesh=trimesh.Trimesh(vertices=points,faces=faces,process=False)
    mesh.visual.vertex_colors=np.asarray(colors,dtype=np.uint8)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
    return mesh
if __name__=='__main__':
    manifest={'status':'NOT_APPROVED','asset':'b2_maidenhair_pinnule_v06',
              'quality_note':'No artificial periodic vein stripes; photographic PBR not included',
              'variants':[]}
    for name,style in CONFIGS:
        mesh=create_leaf(style);path=ROOT/(name+'.glb');mesh.export(path)
        manifest['variants'].append({'name':name,'file':path.name,
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bounds':mesh.bounds.tolist()})
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print('B2_LEAF_V06_GENERATED',len(CONFIGS))

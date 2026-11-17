"""Stage 3 ruined city: additive comparative studies. Preserve original building meshes."""
import runpy, random, math, os
import numpy as np
import trimesh
from pathlib import Path
ctx=runpy.run_path('tools/floor3/build.py')
base=ctx['s']
out=Path('render-output');out.mkdir(exist_ok=True)
def add(scene,name,mesh,color):
    mesh.visual.vertex_colors=color
    scene.add_geometry(mesh,geom_name=name)
def beam(scene,name,a,b,r,color,sections=10):
    a=np.array(a,dtype=float);b=np.array(b,dtype=float);v=b-a
    mesh=trimesh.creation.cylinder(radius=r,height=float(np.linalg.norm(v)),sections=sections)
    mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],v))
    mesh.apply_translation((a+b)/2)
    add(scene,name,mesh,color)
def rock(scene,name,center,scale,seed,color):
    rng=np.random.default_rng(seed)
    mesh=trimesh.creation.icosphere(subdivisions=1,radius=1)
    vertices=mesh.vertices.copy()
    vertices*=rng.uniform(.74,1.20,(len(vertices),1))
    vertices*=np.asarray(scale)
    vertices+=np.asarray(center)
    mesh.vertices=vertices
    add(scene,name,mesh,color)
def crack(scene,name,start,seed,color):
    rng=random.Random(seed)
    pts=[np.array(start,dtype=float)]
    for j in range(5):
        old=pts[-1]
        dx=rng.uniform(-.18,.18)
        dz=.16+rng.uniform(-.065,.11)
        pts.append(old+np.array((dx,-.009,dz)))
    for j,(a,b) in enumerate(zip(pts[:-1],pts[1:])):
        beam(scene,name+'_'+str(j),a,b,.009,color,8)
    # micro branches, avoiding visually uniform parallel striping
    j=2
    beam(scene,name+'_branch',pts[j],pts[j]+np.array((rng.uniform(.12,.27),-.004,rng.uniform(-.17,.01))),.007,color,8)
colors={'concrete':[131,130,124,255],'aggregate':[92,90,86,255],'rust':[94,56,38,255],'crack':[54,52,49,255]}
for phase in (1,2,3):
    scene=base.copy()
    rng=random.Random(731+phase)
    for floor,z0 in enumerate((.35,3.78,7.18)):
        # Jagged microfractures embedded just above the existing front loadbearing sections
        for i in range(phase*8):
            x=rng.choice((-5.84,-5.55,-4.87,-4.44,-1.54,-1.36,2.60,3.36))+rng.uniform(-.1,.1)
            z=z0+rng.uniform(.06,1.78)
            crack(scene,f'facade_crack_p{phase}_{floor}_{i}',(x,-3.58,z),phase*200+floor*50+i,colors['crack'])
        # fractured aggregate and embedded rebar concentrate at loadbearing edges
        for i in range(phase*12):
            x=rng.choice((-5.8,-3.7,-1.55,2.52,3.60))+rng.uniform(-.2,.2)
            z=z0+rng.uniform(.15,2.4)
            rock(scene,f'fracture_aggregate_p{phase}_{floor}_{i}',(x,-3.48,z),(.035+rng.random()*.06,.025,.04+rng.random()*.08),phase*1000+floor*100+i,colors['aggregate'])
        for i in range(phase*3):
            x=rng.choice((-3.72,-1.45,2.45))
            z=z0+.5+i*.21
            beam(scene,f'exposed_rebar_p{phase}_{floor}_{i}',(x,-3.4,z),(x+rng.uniform(.20,.48),-3.7,z-rng.uniform(.2,.44)),.022,colors['rust'])
    # Larger debris only below the building failure zones (not evenly sprinkled)
    for i in range(phase*15):
        x=rng.choice((-4.9,-3.35,-1.4,3.86,4.50))+rng.gauss(0,.39)
        y=rng.choice((-4.32,3.71))+rng.gauss(0,.30)
        size=rng.uniform(.13,.48)
        rock(scene,f'localized_rubble_p{phase}_{i}',(x,y,size*.48),(size,size*.71,size*.52),phase*3000+i,colors['concrete'])
    target=out/f'floor3_ruined_building_study_v{phase}.glb'
    scene.export(str(target))
    print('STUDY_EXPORT_OK',target,'meshes',len(scene.geometry))
print('FLOOR3_STUDY_COMPLETE')

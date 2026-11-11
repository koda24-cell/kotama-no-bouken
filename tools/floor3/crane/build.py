"""Stage 3 industrial lattice crane: original procedural geometry, GLB output.
Reference: user-supplied WW2-era industrial crane photograph. Coordinate: Z up.
"""
import math
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix
scene=trimesh.Scene()
GREEN=[66,75,57,255];EDGE=[47,57,45,255];RUST=[104,66,48,255];STEEL=[96,99,89,255];CONCRETE=[143,140,126,255];YELLOW=[169,125,50,255]
def add(name,mesh,color):
    mesh.visual.vertex_colors=color
    scene.add_geometry(mesh,geom_name=name)
def box(name,center,size,color=GREEN):
    mesh=trimesh.creation.box(extents=size);mesh.apply_translation(center);add(name,mesh,color)
def beam(name,a,b,width=.11,depth=.14,color=GREEN):
    a=np.array(a,float);b=np.array(b,float);d=b-a;L=np.linalg.norm(d)
    if L<1e-5:return
    mesh=trimesh.creation.box(extents=[width,depth,L])
    mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],d/L))
    mesh.apply_translation((a+b)/2)
    add(name,mesh,color)
def cylinder(name,a,b,r=.05,color=RUST,sections=8):
    a=np.array(a,float);b=np.array(b,float);d=b-a;L=np.linalg.norm(d)
    mesh=trimesh.creation.cylinder(radius=r,height=L,sections=sections)
    mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],d/L))
    mesh.apply_translation((a+b)/2);add(name,mesh,color)
# 18m-long, 2.5m-deep suspended steel crane girder with real volumetric truss.
# Tapered left nose, machinery at the right; two separated truss walls.
L=18; bays=12
def top(i):return 4.5+.15*i/12
def bottom(i):return 2.0 if i>2 else 3.4-.7*i
for side,y in enumerate([-1.15,1.15]):
    for i in range(bays+1):
        x=-9+i*1.5
        beam(f'top_chord_{side}_{i}',(x-.14,y,top(i)),(x+.14,y,top(i)),.25,.24,EDGE)
        beam(f'bottom_chord_joint_{side}_{i}',(x-.13,y,bottom(i)),(x+.13,y,bottom(i)),.22,.2,EDGE)
        if i<bays:
            x2=x+1.5
            beam(f'upper_chord_{side}_{i}',(x,y,top(i)),(x2,y,top(i+1)),.23,.2)
            beam(f'lower_chord_{side}_{i}',(x,y,bottom(i)),(x2,y,bottom(i+1)),.20,.19)
            beam(f'vertical_{side}_{i}',(x,y,bottom(i)),(x,y,top(i)),.12,.14)
            beam(f'diagonal_{side}_{i}',(x,y,bottom(i)),(x2,y,top(i+1)),.14,.12)
            if i%2==0:
                beam(f'reverse_diagonal_{side}_{i}',(x,y,top(i)),(x2,y,bottom(i+1)),.09,.11,EDGE)
            # Riveted triangular gussets; structural nodes not random detail.
            for z in [top(i),bottom(i)]:
                box(f'gusset_{side}_{i}_{round(z,2)}',(x,y,z),(.42,.055,.42),EDGE)
# Cross members, roof decking and underfloor bracing provide depth.
for i in range(bays+1):
    x=-9+1.5*i
    beam(f'top_cross_{i}',(x,-1.15,top(i)),(x,1.15,top(i)),.14,.14,STEEL)
    beam(f'bottom_cross_{i}',(x,-1.15,bottom(i)),(x,1.15,bottom(i)),.13,.13,STEEL)
    if i<bays:
        x2=x+1.5
        beam(f'roof_x_a_{i}',(x,-1.15,top(i)),(x2,1.15,top(i+1)),.07,.09,EDGE)
        beam(f'roof_x_b_{i}',(x,1.15,top(i)),(x2,-1.15,top(i+1)),.07,.09,EDGE)
        if i%2==0:
            beam(f'floor_x_{i}',(x,-1.15,bottom(i)),(x2,1.15,bottom(i+1)),.08,.09,STEEL)
# Heavier right-end machine housing and counterweight.
box('motor_house',(7.45,0,5.03),(2.5,2.5,.95),GREEN)
box('motor_top',(7.5,0,5.65),(1.75,1.8,.3),EDGE)
box('counterweight',(7.6,0,1.05),(2.55,2.65,1.75),CONCRETE)
for y in [-.83,.83]:
    for x in [6.3,7.1,8.0]:
        beam(f'housing_support_{x}_{y}',(x,y,2.1),(x,y,4.55),.16,.17,STEEL)
# Running rails, overhead trolley, pulley and hanging hook.
for y in [-.57,.57]:
    beam(f'trolley_rail_{y}',(-7.8,y,2.25),(6.4,y,2.25),.10,.13,STEEL)
box('trolley',(0,0,1.94),(1.55,1.5,.33),EDGE)
for y in [-.48,.48]:
    for x in [-.56,.56]:
        cylinder(f'trolley_wheel_{x}_{y}',(x,y-.12,1.9),(x,y+.12,1.9),.19,RUST,12)
for x in [-.27,.27]:
    cylinder(f'pulley_{x}',(x,-.35,1.62),(x,.35,1.62),.29,STEEL,16)
for y in [-.24,.24]:
    cylinder(f'cable_{y}',(0,y,1.6),(0,y,.08),.027,RUST)
box('hook_block',(0,0,.02),(.48,.45,.46),YELLOW)
# Curved steel hook approximated with connected short segments.
pts=[(0,0,-.20),(.07,0,-.43),(.23,0,-.56),(.38,0,-.47),(.40,0,-.32)]
for i in range(len(pts)-1):cylinder(f'hook_{i}',pts[i],pts[i+1],.073,RUST,10)
# Small industrial lamps under the truss, restrained detail.
for i,x in enumerate([-7.5,-3.5,3.5]):
    cylinder(f'lamp_cable_{i}',(x,0,2.1),(x,0,1.83),.027,RUST)
    box(f'lamp_housing_{i}',(x,0,1.75),(.35,.35,.15),STEEL)
scene.export('industrial_truss_crane.glb')
print('geometry_count',len(scene.geometry))

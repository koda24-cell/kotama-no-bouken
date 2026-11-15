"""Individual asset 02: a level forest floor reclaiming the shrine's paving."""
import sys,math,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import reset_scene,cube,mesh,tube,material,finish,OUT
from architecture_details import stone_materials,prism,chipped_rect,moss_lobe

reset_scene()
stone,fracture,earth,moss,root=stone_materials("soil_module_stone","soil_module_bark")
t=OUT/'textures'
soiltex={'basecolor':t/'soil_color_graded.jpg','normal':t/'soil_normal.jpg','roughness':t/'soil_roughness.jpg'}
soil=material('sacred_damp_forest_soil',(.17,.15,.10,1),.94,soiltex if all(p.exists() for p in soiltex.values()) else None)
leafmat=material('sacred_old_leaf_litter',(.24,.18,.08,1),.95)
cube('level_four_metre_soil',(0,0,-.11),(4,4,.22),soil,bevel=0)
# Last fragments of the human route disappear toward the margins.
for i,(xa,xb,ya,yb) in enumerate([(-.82,-.04,-1.9,-1.10),(.05,.81,-1.9,-1.10),(-.72,.02,-1.03,-.18),(.08,.93,-1.02,-.18),(-.65,.18,-.11,.72),(.25,.94,-.11,.72),(-.52,.27,.79,1.64)]):
    poly=chipped_rect(xa,xb,ya,yb,220+i,.07)
    prism('half_buried_processional_slab_%02d'%i,poly,-.07,.003,stone,bevel=.015)
# Strong roots respect the central 1.7m walk corridor and terminate below grade.
paths=[([(-1.88,1.72,-.015),(-1.72,1.32,.045),(-1.40,1.02,.065),(-1.28,.57,.025),(-1.35,.05,-.04)],[.08,.095,.075,.055,.015]),
       ([(1.88,-1.68,-.015),(1.72,-1.31,.06),(1.52,-.87,.08),(1.66,-.44,.03),(1.49,.02,-.03)],[.075,.1,.08,.046,.012]),
       ([(-1.88,-1.58,-.015),(-1.63,-1.44,.025),(-1.44,-1.13,.03),(-1.29,-.99,-.02)],[.046,.06,.045,.008])]
for i,(pts,rs) in enumerate(paths):tube('exposed_side_root_%d'%i,pts,rs,root,sides=9)
for i,(x,y) in enumerate([(-1.8,.65),(-1.61,.88),(-1.79,1.44),(1.79,-1.14),(1.75,-.94),(-1.74,-1.65),(1.78,1.64),(-1.17,1.65)]):
    moss_lobe('root_shadow_moss_%d'%i,(x,y,.012),(.15,.11,.022),moss,320+i)
# Real individual leaf silhouettes, concentrated at root traps rather than a carpet.
r=random.Random(438)
for i in range(42):
    side=-1 if i%2==0 else 1;x=side*r.uniform(1.17,1.87);y=r.uniform(-1.88,1.88)
    length=r.uniform(.045,.11);width=length*r.uniform(.35,.55);a=r.uniform(0,math.tau)
    u=(math.cos(a),math.sin(a));v=(-u[1],u[0]);z=.008
    pts=[(x-u[0]*length,y-u[1]*length,z),(x+v[0]*width,y+v[1]*width,z+.008),(x+u[0]*length,y+u[1]*length,z+.016),(x-v[0]*width,y-v[1]*width,z+.005),(x,y,z+.023)]
    mesh('caught_dry_leaf_%02d'%i,pts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],leafmat)
# The source scan represents a 3m square; retain that scale across modules.
import bpy
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH':
        if any(m and m.name=='sacred_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)
        elif any(m and m.name=='sacred_damp_forest_soil' for m in obj.data.materials):uv_world(obj,scale=2.0)
finish('mod_root_soil_floor_4m','modules','4m level forest soil with buried processional slabs; 1.7m clear central walking strip, roots confined to side margins; boundary surface Z=0.')

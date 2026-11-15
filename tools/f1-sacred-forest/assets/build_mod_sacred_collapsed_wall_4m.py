"""Individual asset 04: genuine asymmetrical crown collapse, not a noise-deformed wall."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import reset_scene,cube,tube,finish
from architecture_details import stone_materials,wall_block,prism,moss_lobe

reset_scene()
stone,fracture,earth,moss,root=stone_materials()
# The truncated core follows the broken silhouette rather than hiding a full rectangular wall.
outline=[(-2,0),(2,0),(2,3.05),(1.77,3.08),(1.70,2.80),(1.28,2.74),(1.16,2.42),(.63,2.39),(.54,2.18),(.08,2.18),(-.10,2.57),(-.52,2.55),(-.70,3.04),(-1.1,3.08),(-1.15,3.55),(-1.64,3.62),(-1.72,4),(-2,3.94)]
prism('collapsed_solid_wall_core',outline,.65,.8,earth,axis='y',bevel=0)
rows=[(0,.59,[-2,-.78,.47,2]),(.62,1.27,[-2,-1.36,-.13,1.04,2]),(1.30,1.96,[-2,-.86,.34,1.51,2])]
for row,(za,zb,xs) in enumerate(rows):
    for col in range(len(xs)-1):wall_block('surviving_lower_course_%d_%d'%(row,col),xs[col]+(.012 if col else 0),xs[col+1]-(.012 if col<len(xs)-2 else 0),za,zb,stone,710+row*11+col,front=.012,back=.68,damage=.05)
# Individual broken crown blocks, each truncated to a different failure plane.
fragments=[('left_tall',[(-2,2),(-1.2,2),(-1.2,3.1),(-1.38,3.48),(-1.71,3.57),(-1.75,3.97),(-2,3.91)]),
 ('left_step',[(-1.17,2),(-.57,2),(-.57,2.55),(-.73,2.98),(-1.08,3.01),(-1.17,2.87)]),
 ('centre_low',[(-.54,2),(.49,2),(.46,2.14),(.16,2.10),(-.12,2.48),(-.41,2.51)]),
 ('right_inner',[(.53,2),(1.20,2),(1.17,2.38),(.87,2.33),(.65,2.39)]),
 ('right_step',[(1.23,2),(1.71,2),(1.68,2.76),(1.40,2.69),(1.27,2.72)]),
 ('right_tip',[(1.74,2),(2,2),(2,3.01),(1.79,3.05),(1.74,2.83)])]
for i,(name,poly) in enumerate(fragments):prism('torn_crown_'+name,poly,.017,.66,stone,axis='y',bevel=.016)
# Exposed fracture fragments describe the direction of the fallen masonry.
prism('fresh_fracture_plane_left',[(-1.70,3.58),(-1.39,3.49),(-1.20,3.12),(-1.32,3.48),(-1.64,3.65)],.013,.11,fracture,axis='y',bevel=.005)
for i,(x,z,sx) in enumerate([(-1.66,3.6,.16),(-1.39,3.47,.13),(-.93,3.01,.15),(-.62,2.54,.11),(.18,2.13,.20),(.71,2.37,.12),(1.51,2.73,.12),(1.88,3.02,.08)]):
    moss_lobe('wet_broken_ledge_moss_%d'%i,(x,.11,z),(.15 if sx>.12 else sx,.09,.025),moss,790+i)
# Roots exploit the collapse's real joints and remain behind the nominal passage face.
tube('root_through_broken_masonry',[(-1.97,.12,.03),(-1.84,.12,.58),(-1.66,.10,1.12),(-1.52,.12,1.78),(-1.38,.13,2.43),(-1.16,.15,2.93),(-.98,.19,3.01)],[.075,.09,.072,.065,.05,.033,.007],root,sides=10)
tube('root_side_fork',[(-1.54,.13,1.72),(-1.17,.11,1.96),(-.87,.12,2.09),(-.57,.14,2.27)],[.041,.034,.023,.006],root,sides=8)
import bpy
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and any(m and m.name=='sacred_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)
finish('mod_sacred_collapsed_wall_4m','modules','4m footprint wall with a genuinely missing asymmetric crown. Highest surviving corner under 4m, solid lower retaining wall, wet ledges and roots exploit actual masonry fractures. Inner face Y=0; depth 0.8m.')

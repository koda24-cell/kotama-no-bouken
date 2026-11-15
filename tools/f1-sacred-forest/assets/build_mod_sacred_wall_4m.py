"""Individual asset 03: a rain-aged sanctuary retaining wall, inner face at Y=0."""
import sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import reset_scene,cube,tube,finish
from architecture_details import stone_materials,wall_block,prism,moss_lobe,chipped_rect

reset_scene()
stone,fracture,earth,moss,root=stone_materials()
# The backing guarantees no cracks reveal the void or light leaks across joined cells.
cube('solid_mortar_core',(0,.72,2),(4,.16,4),earth,bevel=0)
rows=[(0,.58,[-2,-.76,.38,2]),(.61,1.24,[-2,-1.35,-.10,1.05,2]),(1.27,1.98,[-2,-.92,.24,1.38,2]),(2.01,2.67,[-2,-1.25,.04,1.23,2]),(2.70,3.35,[-2,-.76,.55,2]),(3.38,3.81,[-2,-1.19,.08,1.25,2])]
for row,(za,zb,xs) in enumerate(rows):
    for col in range(len(xs)-1):
        xa=xs[col]+(.012 if col else 0);xb=xs[col+1]-(.012 if col<len(xs)-2 else 0)
        # Chipped outer edges and one bitten-out face corner create silhouette-scale wear.
        if (row,col)==(2,2):
            poly=[(xa,za+.03),(xb-.19,za+.02),(xb,za+.25),(xb-.04,zb-.045),(xa+.1,zb),(xa,zb-.15)]
            prism('stone_with_lost_corner',poly,.025,.66,stone,axis='y',bevel=.017)
        else:wall_block('individually_cut_course_%d_%d'%(row,col),xa,xb,za,zb,stone,400+row*17+col,front=.012+(col%2)*.012,back=.67,damage=.035+(row%3)*.012)
# A broad, subdued sanctuary frieze identifies this wall beyond ordinary masonry.
for i,(xa,xb) in enumerate([(-2,-.69),(-.66,.58),(.61,2)]):
    wall_block('worn_upper_lintel_%d'%i,xa,xb,3.84,4,stone,520+i,front=0,back=.8,damage=.018)
# Mineral rain-darkening is confined to mortar channels; moss follows moisture traps.
for i,(x,z) in enumerate([(-1.85,.59),(-1.6,.6),(-1.28,.60),(.63,1.255),(.84,1.255),(1.04,1.255),(-.72,2.685),(-.52,2.685),(-.28,2.685),(-1.37,3.36),(-1.15,3.36)]):
    moss_lobe('damp_joint_growth_%02d'%i,(x,.018,z),(.14,.025,.026),moss,600+i)
# Basal growth and a lateral root grow along the face rather than random decoration.
for i,x in enumerate([-1.83,-1.62,-1.39,-1.16,1.55,1.77]):
    moss_lobe('basal_moss_%d'%i,(x,.025,.045),(.15,.03,.038),moss,650+i)
tube('edge_creeping_root',[(1.94,.044,.04),(1.83,.039,.33),(1.91,.048,.68),(1.74,.06,.96),(1.66,.07,1.24)],[.046,.044,.031,.022,.006],root,sides=8)
# The source scan represents a 3m square; retain that scale across modules.
import bpy
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and any(m and m.name=='sacred_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)
finish('mod_sacred_wall_4m','modules','4m-wide 4m-high sanctuary retaining wall; front surface Y=0, thickness behind face Y=0..0.8. Individual chipped blocks, original corner losses, sheltered basal moss.')

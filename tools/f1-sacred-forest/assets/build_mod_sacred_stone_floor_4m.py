"""Individual asset 01: worn shrine paving, geometry cracks and clipped edges."""
import sys, math, random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import reset_scene,cube,finish
from architecture_details import stone_materials,prism,chipped_rect,moss_lobe,crack_line

reset_scene()
stone,fracture,earth,moss,root=stone_materials()
# Solid footprint, shallow grout channels. All outside edges meet exactly at z=0.
cube('four_metre_continuous_substrate',(0,0,-.13),(4,4,.16),earth,bevel=0)
for label,loc,size in [('north',(0,1.975,-.025),(4,.05,.05)),('south',(0,-1.975,-.025),(4,.05,.05)),('west',(-1.975,0,-.025),(.05,3.9,.05)),('east',(1.975,0,-.025),(.05,3.9,.05))]:
    cube('flush_boundary_'+label,loc,size,stone,bevel=0)
# The principal pedestrian strip is broad, worn and calm. Smaller fragments stay to the sides.
rows=[(-1.95,-1.15,[-1.95,-1.22,-.22,.75,1.95]),(-1.12,-.22,[-1.95,-.95,.12,1.12,1.95]),(-.19,.78,[-1.95,-1.27,-.35,.74,1.95]),(.81,1.95,[-1.95,-1.08,.02,1.08,1.95])]
for row,(ya,yb,xs) in enumerate(rows):
    for col in range(len(xs)-1):
        xa,xb=xs[col]+.012,xs[col+1]-.012
        poly=chipped_rect(xa,xb,ya+.012,yb-.012,100+row*9+col,.045)
        if (row,col)==(3,0):
            # A genuinely absent triangular corner exposes the underlying soil.
            poly=[(xa+.025,ya+.06),(xb-.22,ya+.01),(xb,yb-.22),(xb-.09,yb-.01),(xa+.04,yb-.01),(xa,ya+.24)]
        prism('paving_slab_%d_%d'%(row,col),poly,-.08,0,stone,bevel=.012)
# Hairline dark fissures are shallow geometry in contact with the top surface.
crack_line('left_split',[(-1.41,.92,.001),(-1.18,1.16,.001),(-1.28,1.38,.001),(-1.1,1.64,.001)],earth,.006)
crack_line('right_split',[(1.32,-.94,.001),(1.12,-.78,.001),(1.21,-.55,.001)],earth,.005)
# Fine soil/velvet growth occurs in sheltered joint corners, never over the passage centre.
for i,(x,y,s) in enumerate([(-1.83,1.69,.10),(-1.75,1.81,.13),(-1.55,1.84,.09),(1.81,.89,.11),(1.86,1.08,.08),(-1.76,-.98,.07),(-1.55,-1.09,.075),(1.85,-1.76,.09)]):
    moss_lobe('sheltered_joint_moss_%02d'%i,(x,y,.003),(s,s*.58,.016),moss,i)
# The source scan represents a 3m square; retain that scale across modules.
import bpy
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and any(m and m.name=='sacred_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)
finish('mod_sacred_stone_floor_4m','modules','4m shrine paving; perimeter top Z=0, true chipped slab corners, sheltered seam moss. Blender Z-up / glTF Y-up. Ground placement.')

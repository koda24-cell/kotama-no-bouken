"""Individual asset 05: a shallow sanctuary arch with 2m x 3m clear opening."""
import sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import reset_scene,cube,tube,finish
from architecture_details import stone_materials,wall_block,prism,moss_lobe

reset_scene()
stone,fracture,earth,moss,root=stone_materials()
# Structural jambs. The inner jamb planes remain exactly at +/-1m.
for side in (-1,1):
    xa,xb=(-2,-1) if side<0 else (1,2)
    cube('continuous_jamb_core_'+str(side),((xa+xb)/2,.73,1.5),(1,.14,3),earth,bevel=0)
    for row,(za,zb) in enumerate([(0,.47),(.49,1.07),(1.09,1.72),(1.74,2.33),(2.35,2.98)]):
        # Individual split stone faces, shallow outer-edge breakage only.
        poly=[(xa+.018,za),(xb-.018,za),(xb,za+.055),(xb,zb-.045),(xb-.055,zb),(xa+.06,zb),(xa,zb-.085),(xa,za+.047)]
        prism('jamb_%s_stone_%02d'%(side,row),poly,.012,.69,stone,axis='y',bevel=.012)
# A shallow arch does not reduce the specified rectangular clearance.
def inner(x):return 3.0+.42*math.sqrt(max(0,1-x*x))
curve=[(-1+2*i/16,inner(-1+2*i/16)) for i in range(17)]
backer=[(-2,3),(-1,3)]+curve[1:]+[(2,3),(2,4),(-2,4)]
prism('solid_arch_backing_above_clearance',backer,.65,.8,earth,axis='y',bevel=0)
# Seven differently proportioned voussoirs build the real opening silhouette.
cuts=[-1,-.77,-.48,-.17,.17,.48,.77,1]
for i,(a,b) in enumerate(zip(cuts,cuts[1:])):
    aa=a+.008 if i else a;bb=b-.008 if i<len(cuts)-2 else b
    polygon=[(aa,inner(aa)),((aa+bb)/2,inner((aa+bb)/2)),(bb,inner(bb)),(bb,3.88),(aa,3.88)]
    prism('worn_arch_voussoir_%02d'%i,polygon,.006,.68,stone,axis='y',bevel=.013)
# Small spandrel stones retain the local shrine's modest scale.
for side in (-1,1):
    xa,xb=(-2,-1.02) if side<0 else (1.02,2)
    wall_block('springing_stone_'+str(side),xa,xb,3.01,3.39,stone,940+side,front=.008,back=.7,damage=.025)
    wall_block('upper_spandrel_'+str(side),xa,xb,3.42,3.88,stone,945+side,front=.008,back=.7,damage=.038)
# A split, weather-eroded cornice makes a restrained horizontal landmark.
for i,(xa,xb) in enumerate([(-2,-.67),(-.64,.59),(.62,2)]):
    wall_block('split_cornice_%d'%i,xa,xb,3.9,4.0,stone,960+i,front=0,back=.8,damage=.012)
# Moss sits where water collects above the arch and at the footing.
for i,(x,z,s) in enumerate([(-1.8,.05,.13),(-1.62,.06,.11),(1.72,.05,.13),(-1.74,3.39,.12),(-1.49,3.40,.14),(-.62,3.89,.13),(-.4,3.89,.12),(.92,3.89,.12),(1.14,3.9,.1),(1.8,3.89,.08)]):
    moss_lobe('arch_sheltered_moss_%02d'%i,(x,.025,z),(s,.025,.018),moss,980+i)
# Only the outer jamb is root-bound: the full central 2 x 3m opening stays clear.
tube('outer_jamb_root',[(1.93,.08,.035),(1.78,.085,.52),(1.87,.095,1.1),(1.73,.10,1.67),(1.81,.12,2.18),(1.63,.15,2.70),(1.68,.18,3.22),(1.49,.19,3.42)],[.06,.072,.06,.052,.045,.032,.023,.004],root,sides=9)
import bpy
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and any(m and m.name=='sacred_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)
finish('mod_sacred_arch_4m','modules','4m-wide / 4m-high shallow sanctuary arch, exact unobstructed 2m-wide by 3m-high opening. Interior is -Y (glTF +Z), wall behind face Y=0..0.8. Worn voussoirs and split cornice, peripheral root.')

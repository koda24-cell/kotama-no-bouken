"""Stage 3 ruined concrete building V2: additive structural art pass.
Reads original PR #256 source unchanged; preserves every old named mesh.
Render and QA via dedicated Blender-Docker GitHub Actions.
"""
from pathlib import Path
base=Path(__file__).with_name("build.py").read_text()
marker="s.export('ruined_building_prototype.glb')"
assert base.count(marker)==1
addition=r"""
# V2: physically meaningful irregular structural masonry and facade details.
# Existing 9 artistic/weathering passes above are preserved intact.
# Priorities: non-repeating break silhouettes, window frame failures,
# partial concrete spalling and rainwater tracing down from horizontal slabs.
# Do not use a volume of tiny particle/grain decorations.
import math
art_random=random.Random(31728)
for floor,z in enumerate((.25,3.65,7.05)):
  # Chipped corner material extending outward from original beams,
  # arranged irregularly and attached to the structural shell.
  if floor>0:
    x=-5.62+floor*.37
    y=-3.27
    fracture_cantilever(
      'V2 asymmetric exposed structural floor flank '+str(floor),
      [(x,y),(x+.90,y),(x+1.15,y-.46),(x+.92,y-.73),
       (x+.47,y-.56),(x+.18,y-.84),(x-.20,y-.53)],
      z-.34,z+.10,[119,116,106,255])
    for j in range(3):
      xx=x+.15+j*.33
      rod('V2 roof exposed anchored rebar '+str(floor)+' '+str(j),
          (xx,y-.47,z-.17),(xx+.10,y-.80,z-.37-.08*j),.032,rust)

# Distinct physical broken facade panels and daylight openings.
# Fractures span full floors with thick edge returns, not flat lines.
new_wall_shapes=[
 ('V2 left perforated upper facade', [
   (-5.93,7.48),(-5.92,9.82),(-5.20,9.76),
   (-4.94,9.35),(-5.30,9.04),(-4.75,8.71),
   (-5.08,8.34),(-4.73,8.03),(-5.26,7.58)]),
 ('V2 exposed mid facade spall', [
   (-2.98,4.02),(-1.96,4.02),(-1.81,4.52),
   (-2.14,4.74),(-1.87,5.07),(-2.35,5.41),
   (-2.12,5.86),(-2.75,6.30),(-2.98,6.04)]),
 ('V2 ground broken doorway pier', [
   (-2.43,.35),(-1.85,.35),(-1.79,.88),(-2.14,1.08),
   (-1.83,1.41),(-2.28,1.73),(-1.91,2.03),(-2.43,2.31)]),
]
for name,coords in new_wall_shapes:
 torn_wall(name,coords,y=-3.47,thickness=.36)

# Steel window frames: deliberately partially missing and bent.
for storey,top in enumerate((2.78,6.18,9.58)):
 for window,x in enumerate((-5.10,-3.48,-1.33)):
  if (storey+window)%4==0:continue
  y=-3.69
  rod('V2 rusted steel window lintel '+str(storey)+' '+str(window),
      (x-.32,y,top),(x+.25,y,top-.06),.041,rust)
  if (window+storey)%3!=1:
   rod('V2 hanging steel jamb '+str(storey)+' '+str(window),
      (x+.22,y,top-.07),(x+.26,y-.09,top-.94),.035,rust)
  for bolt in range(2):
   rod('V2 frame anchor bolt '+str(storey)+' '+str(window)+' '+str(bolt),
       (x-.26+bolt*.42,y,top-.06),
       (x-.26+bolt*.42,y+.15,top-.11),.024,rust)

# Broken basement reinforcement with a few large, attached fragments.
for j,(x,y,z) in enumerate([
    (-5.60,-3.44,1.73),(-4.52,-3.45,5.21),(-1.40,-3.47,6.09),
    (2.56,-3.44,2.20),(3.68,2.69,8.90)]):
  rod('V2 fracture-driven exposed reinforcement '+str(j),
      (x,y,z),(x+.27,y-.27,z-.41),.038,rust)
  for k in range(2):
   rod('V2 reinforcement tie '+str(j)+' '+str(k),
     (x+.07,y-.08,z-.10-.13*k),
     (x+.19,y-.12,z-.12-.13*k),.015,rust)
# The landing floors are structural anchors; moss and staining should later
# follow these exact water-collecting horizontal boundaries, not random scatter.
"""
new=base.replace(marker,addition+"\ns.export('ruined_building_v2.glb')")
exec(compile(new,"tools/floor3/build_v2.py","exec"))

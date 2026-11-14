"""V2: preserve V1 geometry; add image PBR and concrete/steel detail."""
exec(compile(open('/work/tools/floor3/elevated_bridge/build.py').read(),'build.py','exec'))
import os,random,math
from mathutils import Vector
TEX='/work/tools/floor3/elevated_bridge/textures'
def texture(mat,filename,scale=2.5):
 p=mat.node_tree.nodes.get('Principled BSDF');nt=mat.node_tree
 tex=nt.nodes.new('ShaderNodeTexImage')
 path=os.path.join(TEX,filename)
 if os.path.isfile(path):
  tex.image=bpy.data.images.load(path,check_existing=True);tex.image.pack()
 else:
  nt.nodes.remove(tex);tex=nt.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=14
  ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.19,.18,.15,1);ramp.color_ramp.elements[1].color=(.55,.53,.46,1)
  nt.links.new(tex.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs['Color'],p.inputs['Base Color'])
  bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.035
  nt.links.new(tex.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],p.inputs['Normal'])
  return
 uv=nt.nodes.new('ShaderNodeTexCoord');mapping=nt.nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=(scale,scale,scale)
 nt.links.new(uv.outputs['Generated'],mapping.inputs[0]);nt.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
 nt.links.new(tex.outputs['Color'],p.inputs['Base Color'])
 bw=nt.nodes.new('ShaderNodeRGBToBW');nt.links.new(tex.outputs['Color'],bw.inputs[0])
 bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.23;bump.inputs['Distance'].default_value=.027
 nt.links.new(bw.outputs['Val'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],p.inputs['Normal'])
texture(stone,'concrete_diff.jpg',2.8)
texture(fracture,'concrete_diff.jpg',4.5)
texture(steel,'rust_diff.jpg',3.0)
for kind in ('straight','end','collapse','support'):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 build(kind)
 rng=random.Random(1200+len(kind))
 # Asphalt fractures: dark embedded hairline seams and varied concrete chunks
 crack=mat('fracture seam dark',(.105,.10,.085))
 for i in range(15):
  x=rng.uniform(-.74,.74);y=rng.uniform(-.72,.72)
  if kind=='collapse' and abs(x)<.22:continue
  points=[(x,y,.498)]
  for j in range(3):
   x+=rng.uniform(-.12,.12);y+=rng.uniform(.06,.17)
   points.append((x,y,.498+rng.uniform(0,.002)))
  for a,b in zip(points,points[1:]):bar('irregular embedded concrete crack',a,b,.004,crack)
 # Broken concrete aggregate: stones partially embedded in deck edge
 for i in range(34):
  x=rng.uniform(-.90,.90);y=rng.choice([-1,1])*rng.uniform(.70,.96)
  rubble('exposed edge aggregate',(x,y,rng.uniform(.21,.43)),(rng.uniform(.02,.07),rng.uniform(.025,.08),rng.uniform(.025,.06)),fracture)
 # Steel joint plates, anchor bolts and corrosion at rail base
 for side in (-1,1):
  for y in (-.90,.87):
   box('rusty rail footing',(side*.86,y,.505),(.18,.19,.03),steel)
   for dx in (-.055,.055):
    for dy in (-.06,.06):bar('bolt head',(side*.86+dx,y+dy,.52),(side*.86+dx,y+dy,.545),.014,steel)
 # Sagging reinforcing bars and exposed debris in damaged tiles
 if kind in ('end','collapse'):
  for i in range(10):
   x=-.7+i*.15
   y=.52 if kind=='end' else rng.uniform(.17,.62)
   bar('protruding reinforcement',(x,y,.27),(x+rng.uniform(-.12,.12),y+rng.uniform(.18,.40),rng.uniform(-.05,.15)),.015,steel)
  for i in range(23):
   rubble('broken concrete fragments',(rng.uniform(-.9,.9),rng.uniform(.32,.92),rng.uniform(.02,.25)),(rng.uniform(.04,.13),rng.uniform(.04,.13),rng.uniform(.025,.09)),fracture)
 if kind=='support':
  for side in (-1,1):
   for i in range(7):
    y=-.29+i*.09
    bar('pier weather streak',(side*.317,y,-1.34),(side*.318,y+.02,-.5+rng.uniform(-.1,.1)),.006,crack)
 export('floor3_elevated_bridge_'+kind+'_v2')
print('V2_RENDER_COMPLETE',os.listdir(TEX) if os.path.isdir(TEX) else 'procedural fallback')

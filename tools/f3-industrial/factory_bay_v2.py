"""Four-storey industrial bay from selected original CC0 facade-kit components.
The complete raw kit remains preserved. Selected meshes retain UV/detail; new
floors, back/return walls, broken roof and rooted growth form a usable volume.
"""
def build(e):
 import json,math
 from mathutils import Matrix,Vector
 c,bpy,box,rod,scan,rng=[e[k]for k in ['c','bpy','box','rod','scan','rng']]
 rust,concrete,moss,fracture,dark=[e[k]for k in ['rust','concrete','moss','fracture','dark']]
 from licensed_gltf_v2 import load
 original,raw=load(c,bpy,scan,'modular_factory_facade');templates={o.name:o for o in original if o.type=='MESH'};nodes={n['name']:n for n in raw['nodes']if'mesh'in n};selected=[]
 def component(name,x,z):
  source=templates[name];old=source.matrix_world.copy();t=nodes[name].get('translation',[0,0,0]);offset=Vector((t[0],-t[2],t[1]))
  o=source.copy();o.data=source.data.copy();bpy.context.collection.objects.link(o);o.parent=None
  o.matrix_world=Matrix.Translation((x+(0 if name=='wall_pier_standard_01' else 1.5),-1.43,z))@Matrix.Translation(-offset)@old
  selected.append(dict(name=name,sourceVertices=len(source.data.vertices),placedAt=[x,z]));return o
 for floor in range(4):
  z=.18+floor*3
  variant='03' if floor in [1,3] else '01'
  component('wall_window_tall_large_'+variant,0,z);window=component('window_tall_large_'+variant,0,z)
  # Keep the original kit archived; a derivative removes glazing from two bays
  # so rooms actually open behind their detailed source frames.
  if floor in [1,3]:
   import bmesh
   bm=bmesh.new();bm.from_mesh(window.data)
   glass={i for i,m in enumerate(window.data.materials)if m and'glass'in m.name.lower()}
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index in glass],context='FACES');bm.to_mesh(window.data);bm.free()
  for x in [-1.5,1.5]:component('wall_pier_standard_01',x,z)
  box('industrial floor slab',(0,-.03,z),(3.24,3.16,.19),concrete,.018)
  inner=c.material('v2_factory_room_shadow',(.025,.032,.029,1),.98)
  box('rear factory bearing',(0,1.48,z+1.5),(3.20,.16,2.86),inner,.014)
  for side in [-1,1]:
   box('thick factory return',(side*1.60,-.02,z+1.5),(.17,3.0,2.86),concrete,.014)
   # Local patched brickwork and steel bearings tie the return to each floor.
   box('steel edge bearing',(side*1.55,-1.26,z+1.47),(.12,.15,2.84),rust,.009)
 component('crown_standard_standard_01',0,12.18)
 for o in original:bpy.data.objects.remove(o,do_unlink=True)
 # Grade photographic kit surfaces through glTF-supported base-colour factors.
 for m in list(bpy.data.materials):
  if not m.name.startswith('modular_factory_facade'):continue
  p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p is None:continue
  factor=(.68,.72,.68,1)if'brick'in m.name else(.50,.55,.51,1)
  socket=p.inputs['Base Color']
  if socket.is_linked:
   previous=socket.links[0].from_socket;mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=factor
   m.node_tree.links.new(previous,mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],socket)
  else:socket.default_value=factor
 # Roof has actual missing strips, exposed deck edges and attached reinforcing bars.
 for x in [-1.55,0,1.55]:box('roof steel purlin',(x,-.02,12.39),(.10,3.15,.16),rust,.006)
 for strip in range(9):
  if strip in [5,6,7]:continue
  x=-1.46+strip*.36;verts=[]
  for y in [-1.56,1.53]:
   for i in range(9):verts.append((x+i*.045,y,12.49+.025*math.cos(i*math.pi)))
  o=c.mesh('weathered corrugated roof strip',verts,[(i,i+1,10+i,9+i)for i in range(8)],rust);c.uv_world(o)
 for x in [.21,.38,.54]:c.tube('severed roof reinforcement',[(x,-1.45,12.3),(x,-1.73,12.31),(x+.08,-1.88,12.08)],.011,rust,8)
 c.tube('factory external downpipe',[(-1.47,-1.69,11.9),(-1.47,-1.69,2.2),(-1.35,-1.79,1.85),(-1.35,-1.79,.35)],.05,rust,12)
 for z in [1,4,7,10]:rod('downpipe wall clip',(-1.47,-1.36,z),(-1.47,-1.76,z),.022,rust,8)
 import ivy
 for x,z in [(-.50,3.30),(.62,9.30)]:
  before=set(bpy.data.objects);ivy.build(e);bpy.context.view_layer.update();t=Matrix.Translation((x,-1.53,z))@Matrix.Diagonal((.75,.65,.75,1))
  for o in set(bpy.data.objects)-before:
   if o.type=='MESH':o.matrix_world=t@o.matrix_world
 (c.OUT/'sources/factory-component-selection.json').write_text(json.dumps(dict(status='NOT_APPROVED',author='James Ray Cock',license='CC0',selected=selected,kitOriginalKept=True,sourceUVPreserved=True,derivativeChanges='Glazing faces removed from two source window variants; photographic materials tinted; own load-bearing volume and decay added.'),indent=2))

"""Stage 2 ice bridge left/right bank modular preview. Blender 4/5."""
import bpy, math, random, os
from mathutils import Vector
from pathlib import Path
random.seed(24)
ROOT=Path(__file__).resolve().parent
OUT=ROOT/"reviews"
OUT.mkdir(exist_ok=True)
def material(name,color,rough=.75,metal=0,trans=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(*color,1);bs.inputs["Roughness"].default_value=rough;bs.inputs["Metallic"].default_value=metal
 if trans:bs.inputs["Transmission Weight"].default_value=trans
 return m
slate=material("Glacial dark slate",(0.15,.25,.32))
ice=material("Glacial translucent cyan",(.32,.72,.82),.18,.02,.25)
snow=material("Frost crust",(.68,.83,.87),.82)
rock=material("Cold eroded stone",(.28,.38,.43))
def cube(name,loc,scale,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:mod=o.modifiers.new("Worn edges","BEVEL");mod.width=bevel;mod.segments=2;o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
 return o
def shard(name,loc,scale,mat,seed):
 rng=random.Random(seed);verts=[]
 for z,rad in [(0,.8),(.42,1),(1,.72)]:
  for k in range(7):
   a=k*math.tau/7;rr=rad*rng.uniform(.72,1.2);verts.append((math.cos(a)*rr*scale[0],math.sin(a)*rr*scale[1],(z-.45)*scale[2]))
 faces=[]
 for j in range(2):
  for k in range(7):
   q=j*7+k;n=j*7+(k+1)%7;faces.append((q,n,n+7,q+7))
 faces.append(tuple(range(6,-1,-1)));faces.append(tuple(range(14,21)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(mat);return o
def create(side):
 bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
 sign=-1 if side=="left" else 1
 # x runs along bridge; edge at +/- 1. Each tile is 2x2 with flush 2m end.
 cube("walkable_ice_bridge_core",(0,0,-.15),(2,1.38,.28),ice,.08)
 for i in range(5):
  x=-.77+i*.38
  cube("frozen_stone_underlay_%02d"%i,(x,0,-.37),(.35,1.7,.25),slate,.055)
 # one bank edge is sculpturally rough; inner side remains flush to adjoining bridge tile
 for i in range(9):
  x=-.86+i*.21; y=sign*(.76+(.1 if i%2 else 0))
  shard("eroded_bank_boulder_%02d"%i,(x,y,-.20),(.22,.25,.43 if i%3 else .65),rock,i+50)
 for i in range(12):
  x=-.85+(i%6)*.34;y=sign*(.63+(i//6)*.22)
  shard("ice_fang_%02d"%i,(x,y,-.04),(.10,.13,.30+((i*7)%5)*.075),ice,i+120)
 for i in range(7):
  x=-.83+i*.28;y=sign*(.73+(i%3)*.09)
  cube("frost_crust_%02d"%i,(x,y,.015),(.22,.12,.035),snow,.025)
 # two flush ends remain clean: bridge tiles can join at x +/-1
 originals=[o for o in bpy.context.scene.objects if o.type=="MESH"]
 bpy.ops.object.select_all(action="DESELECT")
 for o in originals:o.select_set(True)
 bpy.context.view_layer.objects.active=originals[0]
 bpy.ops.export_scene.gltf(filepath=str(OUT/f"ice_bridge_{side}_bank.glb"),export_format="GLB",use_selection=True)
 # review cameras and lighting only after exporting geometry
 bpy.ops.object.light_add(type="AREA",location=(3,-4,6));bpy.context.object.data.energy=800;bpy.context.object.data.size=4
 bpy.ops.object.camera_add();cam=bpy.context.object;bpy.context.scene.camera=cam
 sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=16;sc.render.resolution_x=800;sc.render.resolution_y=600;sc.render.resolution_percentage=100
 sc.world.color=(.22,.25,.28)
 for name,pos in {"front":(0,-4,2.4),"side":(4,0,2.4),"angle":(3,-4,3.2)}.items():
  cam.location=pos;cam.rotation_euler=(Vector((0,0,-.1))-cam.location).to_track_quat("-Z","Y").to_euler()
  sc.render.filepath=str(OUT/f"ice_bridge_{side}_{name}.png");bpy.ops.render.render(write_still=True)
for side in ("left","right"):create(side)
print("ICE_BRIDGE_SIDE_TILE_DONE")

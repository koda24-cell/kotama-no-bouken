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
ice=material("Weathered opaque glacier ice",(.48,.72,.77),.48,.0,0)
snow=material("Frost crust",(.68,.83,.87),.82)
rock=material("Cold eroded stone",(.28,.38,.43))
# Procedural PBR detail: two-scale Noise -> Bump, with matte ice and stone.
def rough_surface(mat,scale,strength,distance):
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 noise=nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=scale;noise.inputs["Detail"].default_value=4.5;noise.inputs["Roughness"].default_value=.72
 bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=strength;bump.inputs["Distance"].default_value=distance
 links.new(noise.outputs["Fac"],bump.inputs["Height"])
 links.new(bump.outputs["Normal"],nodes.get("Principled BSDF").inputs["Normal"])
rough_surface(rock,15,.38,.085)
rough_surface(slate,24,.24,.028)
rough_surface(ice,22,.24,.025)
rough_surface(snow,32,.23,.012)
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
 # Angular fractured glacial slab rather than rounded translucent jelly.
 core=cube("walkable_ice_bridge_core",(0,0,-.15),(2,1.38,.28),ice,.012)
 # Broad frost plate across the middle; visually reads as opaque ice.
 cube("central_opaque_frosted_plate",(0,0,.002),(1.88,1.15,.025),snow,.008)
 # Edge plates with unequal heights and broken silhouettes.
 for j,(x,y,w,d) in enumerate([(-.66,-.47,.48,.30),(-.18,.48,.53,.31),(.47,-.45,.61,.27),(.76,.36,.31,.33)]):
  slab=cube("fractured_glacial_plate_%02d"%j,(x,y,.029+j*.004),(w,d,.055),ice,.006)
  slab.rotation_euler.z=[-.14,.08,.19,-.11][j]
 for i in range(5):
  x=-.77+i*.38
  cube("frozen_stone_underlay_%02d"%i,(x,0,-.37),(.35,1.7,.25),slate,.055)
 # one bank edge is sculpturally rough; inner side remains flush to adjoining bridge tile
 # Irregular large overlapping eroded masses replace the repetitive bead-like row.
 # Keep both X end planes free of overhang for seamless modular connection.
 for i,(x,y,z,sx,sy,sz) in enumerate([
  (-.68,.78,-.31,.57,.46,.59),(-.26,.92,-.35,.71,.54,.74),
  (.30,.80,-.29,.68,.43,.64),(.73,.92,-.37,.43,.51,.71),
  (-.47,1.02,-.48,.56,.44,.50),(.43,1.07,-.47,.55,.41,.58)
 ]):
  o=shard("large_eroded_bank_mass_%02d"%i,(x,sign*y,z),(sx,sy,sz),rock,i+550)
  o.rotation_euler=(.12*i,.06*i,sign*(i-2)*.11)
 for i in range(8):
  x=-.78+i*.22+(.035 if i%3==0 else -.025)
  y=sign*(.76+.12*math.sin(i*2.2))
  shard("small_transition_stone_%02d"%i,(x,y,-.17),(.15,.18,.26+(i%3)*.05),slate,i+50)
 # Fewer larger fractured ice projections; avoid candy-like evenly spaced spikes.
 for i,(x,y,h,w) in enumerate([(-.67,.77,.43,.15),(-.19,.96,.27,.18),(.38,.78,.56,.19),(.73,.89,.34,.14)]):
  shard("fractured_ice_projection_%02d"%i,(x,sign*y,-.12),(w,.19,h),ice,i+120)
 # Patchy frost follows the eroded stone instead of evenly spaced rectangles.
 for i,(x,y,w,d) in enumerate([(-.70,.72,.31,.15),(-.35,.88,.25,.13),(.09,.72,.38,.12),(.47,.95,.20,.16),(.78,.78,.18,.11)]):
  frost=cube("uneven_frost_patch_%02d"%i,(x,sign*y,.035),(w,d,.026),snow,.015)
  frost.rotation_euler.z=sign*(i-2)*.13
 # Irregular shallow cracks, intentionally inset from both tile joins.
 for i,(x,y,w) in enumerate([(-.51,-.18,.25),(-.12,.22,.32),(.34,-.24,.28)]):
  fissure=cube("surface_fissure_%02d"%i,(x,y,-.002),(w,.018,.007),slate,.003)
  fissure.rotation_euler.z=.31*(i-1)
 # two flush ends remain clean: bridge tiles can join at x +/-1
 originals=[o for o in bpy.context.scene.objects if o.type=="MESH"]
 bpy.ops.object.select_all(action="DESELECT")
 for o in originals:o.select_set(True)
 bpy.context.view_layer.objects.active=originals[0]
 bpy.ops.export_scene.gltf(filepath=str(OUT/f"ice_bridge_{side}_bank.glb"),export_format="GLB",use_selection=True)
 # review cameras and lighting only after exporting geometry
 bpy.ops.object.light_add(type="AREA",location=(3,-4,6));bpy.context.object.data.energy=800;bpy.context.object.data.size=4
 bpy.ops.object.camera_add();cam=bpy.context.object;bpy.context.scene.camera=cam
 sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=24;sc.render.resolution_x=800;sc.render.resolution_y=600;sc.render.resolution_percentage=100
 sc.world.color=(.22,.25,.28)
 for name,pos in {"front":(0,-4,2.4),"side":(4,0,2.4),"angle":(3,-4,3.2)}.items():
  cam.location=pos;cam.rotation_euler=(Vector((0,0,-.1))-cam.location).to_track_quat("-Z","Y").to_euler()
  sc.render.filepath=str(OUT/f"ice_bridge_{side}_{name}.png");bpy.ops.render.render(write_still=True)
for side in ("left","right"):create(side)
print("ICE_BRIDGE_SIDE_TILE_DONE")

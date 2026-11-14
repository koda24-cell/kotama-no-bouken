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
slate=material("Glacial dark slate",(0.095,.115,.125))
ice=material("Weathered opaque glacier ice",(.48,.72,.77),.48,.0,0)
snow=material("Frost crust",(.68,.83,.87),.82)
rock=material("Cold eroded stone",(.19,.20,.19))
deep_ice=material("Compressed blue glacial ice",(.12,.34,.52),.34)
# Spatially varied glacier coloration without external image dependencies.
def glacier_color(mat):
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 tex=nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=3.8;tex.inputs["Detail"].default_value=5
 ramp=nodes.new("ShaderNodeValToRGB")
 ramp.color_ramp.elements[0].position=.23;ramp.color_ramp.elements[0].color=(.16,.36,.43,1)
 ramp.color_ramp.elements[1].position=.79;ramp.color_ramp.elements[1].color=(.62,.78,.79,1)
 links.new(tex.outputs["Fac"],ramp.inputs["Fac"])
 links.new(ramp.outputs["Color"],nodes.get("Principled BSDF").inputs["Base Color"])
# Preserve glacier_color as optional study; no noisy ramp on clear ice.
# Procedural PBR detail: two-scale Noise -> Bump, with matte ice and stone.
def rough_surface(mat,scale,strength,distance):
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 noise=nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=scale;noise.inputs["Detail"].default_value=4.5;noise.inputs["Roughness"].default_value=.72
 bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=strength;bump.inputs["Distance"].default_value=distance
 links.new(noise.outputs["Fac"],bump.inputs["Height"])
 links.new(bump.outputs["Normal"],nodes.get("Principled BSDF").inputs["Normal"])
rough_surface(rock,10,.58,.12)
rough_surface(slate,24,.24,.028)
rough_surface(ice,18,.035,.002)
rough_surface(deep_ice,13,.06,.004)
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
 # V4: a continuous, triangulated eroded ice shelf; no rectangular top plates.
 def terrain_shelf(name,mat,half_width,top,bottom,seed):
  rng=random.Random(seed);nx=22;ny=14;verts=[];faces=[]
  for layer,zbase in enumerate((top,(top+bottom)*.54,bottom)):
   for ix in range(nx+1):
    x=-1+2*ix/nx
    for iy in range(ny+1):
     v=-1+2*iy/ny
     # Both end cross sections are identical for X-direction tile continuity.
     # Preserve the exact two tile-end profiles while heavily eroding the long sides.
     edge_taper=math.sin(math.pi*ix/nx)**2
     cliff_break=.16*math.sin(8*x+1.1)+.10*math.sin(17*x-1.5)+.065*math.cos(29*x+2)
     boundary=half_width*(1+edge_taper*cliff_break*(abs(v)**3))
     y=v*boundary
     wave=.035*math.sin(8*x+5*y)+.023*math.sin(17*x-9*y)+rng.uniform(-.012,.012)
     if ix in (0,nx):wave=0
     # Deep undercuts and fractures along the long banks; smooth enough to walk centrally.
     bank_factor=max(0,(abs(v)-.52)/.48)
     cut=.095*bank_factor*math.sin(13*x+5*v)+.075*bank_factor*math.cos(23*x-3*v)
     z=zbase+(wave+cut if layer==0 else (wave*.65-.08*bank_factor+.055*math.sin(14*x+4*v) if layer==1 else wave*.36-.12*bank_factor))
     verts.append((x,y,z))
  n=(nx+1)*(ny+1)
  for ix in range(nx):
   for iy in range(ny):
    a=ix*(ny+1)+iy;b=a+ny+1
    for offset,reverse in ((0,False),(2*n,True)):
     q=(a+offset,b+offset,b+offset+1,a+offset+1)
     faces.append(q[::-1] if reverse else q)
  for ix in range(nx):
   for iy in (0,ny):
    a=ix*(ny+1)+iy;b=(ix+1)*(ny+1)+iy
    faces.append((a,b,b+n,a+n));faces.append((a+n,b+n,b+2*n,a+2*n))
  for iy in range(ny):
   for ix in (0,nx):
    a=ix*(ny+1)+iy;b=a+1
    faces.append((a,b,b+n,a+n))
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
  return obj
 terrain_shelf("continuous_fractured_ice_shelf",ice,.72,-.01,-.30,74)
 terrain_shelf("eroded_rock_bed",slate,.84,-.31,-.60,85)
 # Compressed ice strata emerge from the eroded rock rather than repeating blocks.
 for j,(x,y,z,w,d,h) in enumerate([(-.58,.57,-.31,.42,.31,.23),(.18,-.63,-.35,.53,.25,.19),(.64,.62,-.42,.32,.34,.28)]):
  o=shard("compressed_ice_in_rock_%02d"%j,(x,y,z),(w,d,h),deep_ice,890+j)
  o.rotation_euler.z=.3*j
 # Frost is a subtle mottled material effect, not rectangular white patches.
 # Dark blue inset fissures follow uneven polylines on the top surface.
 def fissure(name,points):
  cu=bpy.data.curves.new(name,"CURVE");cu.dimensions="3D";cu.bevel_depth=.008;cu.bevel_resolution=1
  poly=cu.splines.new("POLY");poly.points.add(len(points)-1)
  for p,(x,y) in zip(poly.points,points):
   z=.004+.035*math.sin(8*x+5*y)+.023*math.sin(17*x-9*y)
   p.co=(x,y,z,1)
  ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(slate)
 fissure("branching_glacial_fissure_A",[(-.74,-.23),(-.48,-.17),(-.26,-.32),(.03,-.25),(.27,-.36)])
 fissure("branching_glacial_fissure_B",[(-.29,.28),(-.08,.18),(.18,.31),(.47,.21),(.74,.32)])
 # one bank edge is sculpturally rough; inner side remains flush to adjoining bridge tile
 # Irregular large overlapping eroded masses replace the repetitive bead-like row.
 # Keep both X end planes free of overhang for seamless modular connection.
 for i,(x,y,z,sx,sy,sz) in enumerate([
  (-.57,.83,-.50,.94,.64,.52),(.16,.98,-.57,1.06,.69,.61),
  (.66,.86,-.47,.58,.65,.43),(-.18,1.11,-.65,.79,.58,.42)
 ]):
  o=shard("large_eroded_bank_mass_%02d"%i,(x,sign*y,z),(sx,sy,sz),rock,i+550)
  o.rotation_euler=(.31+.11*i,.22*i,sign*(i-2)*.29)
 for i,(x,y,z,w,d,h) in enumerate([(-.76,.73,-.24,.20,.21,.30),(-.36,.81,-.22,.27,.22,.22),(.13,.74,-.20,.18,.29,.32),(.59,.79,-.27,.26,.24,.26)]):
  shard("irregular_rock_transition_%02d"%i,(x,sign*y,z),(w,d,h),slate,i+50)
 # Fewer larger fractured ice projections; avoid candy-like evenly spaced spikes.
 for i,(x,y,h,w) in enumerate([(-.67,.77,.43,.15),(-.19,.96,.27,.18),(.38,.78,.56,.19),(.73,.89,.34,.14)]):
  shard("fractured_ice_projection_%02d"%i,(x,sign*y,-.12),(w,.19,h),ice,i+120)
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
 # Test three ice shaders on the same original bank geometry.
 bs=ice.node_tree.nodes.get("Principled BSDF")
 output=ice.node_tree.nodes.get("Material Output")
 for variant,color,rough,trans,density in [
  ("clear",(.43,.76,.88),.10,.82,0),
  ("blue_depth",(.32,.66,.82),.16,.66,.12),
  ("frosted",(.62,.84,.90),.30,.35,.04)
 ]:
  bs.inputs["Base Color"].default_value=(*color,1)
  bs.inputs["Roughness"].default_value=rough
  bs.inputs["Transmission Weight"].default_value=trans
  bs.inputs["IOR"].default_value=1.31
  for link in list(output.inputs["Volume"].links):ice.node_tree.links.remove(link)
  if density:
   vol=ice.node_tree.nodes.get("Ice Depth Absorption")
   if vol is None:
    vol=ice.node_tree.nodes.new("ShaderNodeVolumeAbsorption")
    vol.name="Ice Depth Absorption"
   vol.inputs["Color"].default_value=(.34,.70,.88,1)
   vol.inputs["Density"].default_value=density
   ice.node_tree.links.new(vol.outputs["Volume"],output.inputs["Volume"])
  bpy.ops.object.select_all(action="DESELECT")
  for o in originals:o.select_set(True)
  bpy.context.view_layer.objects.active=originals[0]
  bpy.ops.export_scene.gltf(filepath=str(OUT/f"ice_bridge_{side}_{variant}.glb"),export_format="GLB",use_selection=True)
  cam.location=(3,-4,3.2)
  cam.rotation_euler=(Vector((0,0,-.1))-cam.location).to_track_quat("-Z","Y").to_euler()
  sc.render.filepath=str(OUT/f"ice_bridge_{side}_{variant}_angle.png")
  bpy.ops.render.render(write_still=True)
 bs.inputs["Base Color"].default_value=(.43,.76,.88,1)
 bs.inputs["Roughness"].default_value=.10
 bs.inputs["Transmission Weight"].default_value=.82
 for link in list(output.inputs["Volume"].links):ice.node_tree.links.remove(link)
 for name,pos in {"front":(0,-4,2.4),"side":(4,0,2.4),"angle":(3,-4,3.2)}.items():
  cam.location=pos;cam.rotation_euler=(Vector((0,0,-.1))-cam.location).to_track_quat("-Z","Y").to_euler()
  sc.render.filepath=str(OUT/f"ice_bridge_{side}_{name}.png");bpy.ops.render.render(write_still=True)
for side in ("left","right"):create(side)
print("ICE_BRIDGE_SIDE_TILE_DONE")

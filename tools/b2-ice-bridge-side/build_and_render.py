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
 # V4: a continuous, triangulated eroded ice shelf; no rectangular top plates.
 def terrain_shelf(name,mat,half_width,top,bottom,seed):
  rng=random.Random(seed);nx=22;ny=14;verts=[];faces=[]
  for layer,zbase in enumerate((top,bottom)):
   for ix in range(nx+1):
    x=-1+2*ix/nx
    for iy in range(ny+1):
     v=-1+2*iy/ny
     # Both end cross sections are identical for X-direction tile continuity.
     boundary=half_width*(1+.045*math.sin(6*x+2*v)+.025*math.cos(11*x-3*v))
     y=v*boundary
     wave=.035*math.sin(8*x+5*y)+.023*math.sin(17*x-9*y)+rng.uniform(-.012,.012)
     if ix in (0,nx):wave=0
     z=zbase+(wave if layer==0 else wave*.36)
     verts.append((x,y,z))
  n=(nx+1)*(ny+1)
  for ix in range(nx):
   for iy in range(ny):
    a=ix*(ny+1)+iy;b=a+ny+1
    for offset,reverse in ((0,False),(n,True)):
     q=(a+offset,b+offset,b+offset+1,a+offset+1)
     faces.append(q[::-1] if reverse else q)
  for ix in range(nx):
   for iy in (0,ny):
    a=ix*(ny+1)+iy;b=(ix+1)*(ny+1)+iy
    faces.append((a,b,b+n,a+n))
  for iy in range(ny):
   for ix in (0,nx):
    a=ix*(ny+1)+iy;b=a+1
    faces.append((a,b,b+n,a+n))
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
  return obj
 terrain_shelf("continuous_fractured_ice_shelf",ice,.72,-.01,-.30,74)
 terrain_shelf("eroded_rock_bed",slate,.84,-.31,-.60,85)
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

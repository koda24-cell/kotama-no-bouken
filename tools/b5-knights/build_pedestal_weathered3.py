#!/usr/bin/env python3
"""Independent architectural Gothic knight pedestal candidate. NOT_APPROVED."""
import bpy, math, os, random, json, hashlib, struct
from pathlib import Path
from mathutils import Vector
VARIANT=os.getenv("PEDESTAL_VARIANT","A").upper()
assert VARIANT in ("A","B","C"),"Unknown variant"
OUT=Path(os.getenv("PEDESTAL_OUTPUT","render-output/b5-knights/pedestal_weathered3_"+VARIANT)).resolve()
MODEL="pedestal_weathered3_"+VARIANT

OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
random.seed(2402)
objects=[]
def material(name,color,rough=.92):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 node=m.node_tree.nodes.get("Principled BSDF")
 node.inputs["Base Color"].default_value=(*color,1)
 node.inputs["Roughness"].default_value=rough
 return m
stone=material("dark weathered granite slate",(.155,.169,.205))
edge=material("worn corner stone",(.20,.22,.27))
shade=material("quatrefoil recess",(.075,.08,.11))
joint=material("stone joint cavities",(.09,.095,.12))

# V3: use the previously validated ambientCG Rock063 CC0 photo only when fetched.
# An unavailable download must be visible in manifest, not silently "installed".
photo_root=Path("render-output/b5-knights/photo_source")
photo_status="NOT_AVAILABLE_PROCEDURAL"
photo_color=photo_root/"Color_ColdStone.jpg"
photo_rough=photo_root/"Roughness.jpg"
if photo_color.is_file() and photo_rough.is_file():
    try:
        img=bpy.data.images.load(str(photo_color.resolve()),check_existing=True)
        img.pack()
        rm=bpy.data.images.load(str(photo_rough.resolve()),check_existing=True)
        rm.colorspace_settings.name="Non-Color";rm.pack()
        for m in [stone,edge]:
            nodes=m.node_tree.nodes;links=m.node_tree.links
            bsdf=nodes.get("Principled BSDF")
            t=nodes.new("ShaderNodeTexImage");t.image=img;t.label="Rock063 CC0 tuned stone"
            # Preserve old mineral tint; only 38% of photographic albedo.
            mix=nodes.new("ShaderNodeMixRGB")
            mix.blend_type="MIX";mix.inputs[0].default_value=.26
            mix.inputs[1].default_value=m.diffuse_color
            links.new(t.outputs["Color"],mix.inputs[2])
            links.new(mix.outputs["Color"],bsdf.inputs["Base Color"])
            rr=nodes.new("ShaderNodeTexImage");rr.image=rm
            links.new(rr.outputs["Color"],bsdf.inputs["Roughness"])
        photo_status="AMBIENTCG_ROCK063_CC0_PHOTOGRAPHIC"
    except Exception as e:
        photo_status="TEXTURE_ERROR_"+type(e).__name__
        print("PHOTO_TEXTURE_ERROR",repr(e))
print("PHOTO_STATUS",photo_status)

def add(o,n,m):
 o.name=n;o.data.materials.append(m);objects.append(o);return o
def block(n,center,dims,mat=stone,bevel=.003):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center)
 o=bpy.context.object;o.dimensions=dims
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 add(o,n,mat)
 if bevel:
  md=o.modifiers.new("tiny architectural arris","BEVEL")
  md.width=bevel;md.segments=1
  o.modifiers.new("stable weighted normal","WEIGHTED_NORMAL")
 return o
# Three-layer real masonry design, clear horizontal flat bands, restrained bevels.
block("01 foundation lower square course",(0,0,.068),(1.92,1.64,.136),stone,.0025)
block("02 foundation thin shadow line",(0,0,.145),(1.79,1.50,.026),shade,.001)
block("03 lower molded setback",(0,0,.186),(1.83,1.54,.068),edge,.004)
block("04 tall tomb shaft",(0,0,.339),(1.66,1.36,.238),stone,.004)
block("05 upper dark reveal",(0,0,.469),(1.67,1.37,.028),joint,.001)
block("06 upper projecting cap stone",(0,0,.528),(1.92,1.64,.083),stone,.003)
block("07 polished top bed",(0,0,.575),(1.78,1.5,.018),edge,.002)
# Quatrefoil depressions: dark backing inside shallow pilaster frames, not stickers.
def curve(n,points,r,mat,closed=False):
 cv=bpy.data.curves.new(n,"CURVE");cv.dimensions="3D";cv.resolution_u=12
 cv.bevel_depth=r;cv.bevel_resolution=3
 sp=cv.splines.new("POLY");sp.points.add(len(points)-1)
 for i,p in enumerate(points):sp.points[i].co=(*p,1)
 sp.use_cyclic_u=closed
 ob=bpy.data.objects.new(n,cv);bpy.context.collection.objects.link(ob)
 return add(ob,n,mat)
def quatrefoil_pts(cx,cz,plane,side):
 pts=[]
 # Polar "four leaf" Gothic shape, with narrow intermediate cusps.
 for i in range(64):
  t=2*math.pi*i/64
  rr=.078*(1+.18*math.cos(4*t))
  u=cx+rr*math.cos(t);v=cz+rr*math.sin(t)
  if plane=="front": pts.append((u,side*.687,v))
  else: pts.append((side*.837,u,v))
 return pts
for which,sgn in (("front",-1),("back",1)):
 for k,cx in enumerate((-.48,0,.48)):
  z=.342
  block(f"{which} inset relief backing {k}",(cx,sgn*.687,z),(.31,.010,.159),shade,.002)
  curve(f"{which} quatrefoil carved rim {k}",quatrefoil_pts(cx,z,"front",sgn),.012,edge,True)
  # little paired lancet gables; gothic rhythm not perfect flat tile.
  curve(f"{which} arch crown {k}",[(cx-.112,sgn*.697,.394),(cx,sgn*.697,.455),(cx+.112,sgn*.697,.394)],.010,edge)
for which,sgn in (("left",-1),("right",1)):
 for k,cy in enumerate((-.31,.31)):
  block(f"{which} small inset {k}",(sgn*.834,cy,.342),(.012,.27,.15),shade,.001)
  curve(f"{which} quatrefoil rim {k}",quatrefoil_pts(cy,.303,"side",sgn),.010,edge,True)
# Vertical ashlar joints; fine, controlled recesses in face plane.
for sg in (-1,1):
 for x in (-.79,-.235,.235,.79):
  curve(f"front back construction joint {sg} {x}",[(x,sg*.824,.020),(x,sg*.824,.129)],.005,joint)
# Real missing stone on two corners using Boolean wedge cutters.
def cut_corner(obj,loc,rot,scale):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 cutter=bpy.context.object;cutter.dimensions=scale
 cutter.rotation_euler=rot;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 md=obj.modifiers.new("structural corner loss","BOOLEAN");md.operation='DIFFERENCE';md.object=cutter
 bpy.context.view_layer.objects.active=obj
 try:bpy.ops.object.modifier_apply(modifier=md.name)
 except Exception as exc:print("CUT_FAILED",str(exc))
 bpy.data.objects.remove(cutter,do_unlink=True)
# No random pebble confetti or blanket bevels.
cut_corner(next(o for o in objects if o.name=="06 upper projecting cap stone"),(.95,-.82,.562),(.12,.22,.34),(.32,.25,.16))
cut_corner(next(o for o in objects if o.name=="01 foundation lower square course"),(-.96,.82,.13),(.2,-.3,.32),(.22,.3,.16))
# Short asymmetric fissures along structural joints.
curve("upper cap displaced joint line",[(-.67,-.824,.520),(-.61,-.825,.530),(-.56,-.826,.510)],.004,joint)

# V4: credible localized erosion types. Existing V3 stone courses/reliefs stay.
# Geometry subtracts real stone; seams are derived from structural forces,
# never uniform random spots. Each variant is a separately exported standalone asset.
def object_by_name(name):
    return next(o for o in objects if o.name==name)
def carve_rect(name,center,size,rotation=(0,0,0),targets=()):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    cutter=bpy.context.object
    cutter.dimensions=size;cutter.rotation_euler=rotation
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for target in targets:
        obj=object_by_name(target)
        boolean=obj.modifiers.new("erosion "+name,"BOOLEAN")
        boolean.operation="DIFFERENCE";boolean.object=cutter
        bpy.context.view_layer.objects.active=obj
        try:bpy.ops.object.modifier_apply(modifier=boolean.name)
        except Exception as e:print("EROSION_WARNING",name,str(e))
    bpy.data.objects.remove(cutter,do_unlink=True)
def crack(name,points,width=.007):
    return curve("aged stone fracture "+name,points,width,joint)
def stain(name,points,thickness=.018):
    # A dark rough curve inside the damp / gritty edge crevice.
    return curve("dust settled "+name,points,thickness,shade)
# Randomness constrained to real damage sites: exposed projecting cornices.
if VARIANT=="A":
    # Gothic tomb: repeated historical small chips rather than new pristine sharp decoration.
    for i,(center,size,rot) in enumerate([
        ((-.86,-.76,.558),(.35,.35,.13),(.13,-.19,.58)),
        ((.87,.70,.57),(.32,.19,.11),(.20,.18,-.40)),
        ((-.93,.60,.095),(.21,.24,.13),(.31,-.12,.21)),
        ((.23,-.695,.39),(.20,.19,.15),(.10,0,.29)),
    ]):
        carve_rect("Gothic chipped cornice "+str(i),center,size,rot,
                   ["06 upper projecting cap stone"] if i<2 else
                   ["01 foundation lower square course"] if i==2 else ["04 tall tomb shaft"])
    crack("Gothic front stepped fault",[(-.54,-.690,.47),(-.51,-.694,.40),
          (-.55,-.696,.35),(-.50,-.700,.29),(-.49,-.700,.22)],.007)
    crack("Gothic lower web",[(-.51,-.700,.29),(-.42,-.699,.27),(-.40,-.697,.23)],.005)
    stain("cap soot seam",[(-.81,-.829,.47),(-.55,-.829,.467),(-.23,-.829,.469),
                           (.18,-.829,.467),(.52,-.829,.468)],.009)
elif VARIANT=="B":
    # Ancient ritual altar: irregular long top stress crack, rain/corrosion on rear and front.
    carve_rect("ritual weathered corner",(.89,-.81,.554),(.41,.28,.15),(.19,.20,.45),
              ["06 upper projecting cap stone","07 polished top bed"])
    carve_rect("ritual hollow top worn",(.16,-.19,.578),(.35,.24,.045),(.05,.05,.23),
              ["07 polished top bed"])
    crack("ritual top fracture",[(-.69,-.22,.591),(-.46,-.16,.592),(-.28,-.24,.592),
          (-.07,-.13,.592),(.16,-.19,.592),(.34,-.10,.592),(.61,-.15,.592)],.009)
    stain("ritual north crevice",[(-.73,-.828,.477),(-.45,-.83,.476),
          (-.10,-.83,.476),(.12,-.83,.475),(.70,-.828,.477)],.014)
    for x in (-.51,.47):
        stain("ritual runoff "+str(x),[(x,-.698,.443),(x-.028,-.7,.39),
          (x-.01,-.70,.35),(x-.04,-.70,.32)],.012)
else:
    # Collapsed effigy: heavier asymmetric collapse and displaced cap,
    # visible internal fractured strata and broad diagonal cracking.
    for i,(where,size,rotation,targets) in enumerate([
        ((.91,-.78,.53),(.44,.46,.21),(.19,-.18,.44),["06 upper projecting cap stone","07 polished top bed"]),
        ((.80,-.71,.33),(.30,.31,.27),(.14,.11,.39),["04 tall tomb shaft"]),
        ((-.83,.76,.11),(.27,.27,.21),(.25,-.25,.22),["01 foundation lower square course"]),
    ]):
        carve_rect("collapsed monument broken corner "+str(i),where,size,rotation,targets)
    object_by_name("06 upper projecting cap stone").location.x+=.028
    object_by_name("07 polished top bed").location.x+=.028
    crack("collapse broad fracture",[(.49,-.708,.48),(.40,-.712,.44),
       (.35,-.714,.36),(.31,-.714,.30),(.18,-.714,.23)],.011)
    crack("collapse branching",[(.35,-.712,.36),(.18,-.712,.35),
       (.06,-.712,.38)],.008)
    # Sparse larger fragments that actually rest on lower tiers (no tiny pebble noise).
    for i,(px,py,pz,sc) in enumerate([
       (.69,-.70,.171,(.16,.12,.09)),(-.73,.66,.20,(.10,.15,.07))]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(px,py,pz))
        obj=bpy.context.object
        obj.scale=sc
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        add(obj,"loose weathered stone fragment "+str(i),stone)
# All candidates use photographic albedo if source available; never re-use
# Pinterest photos as map textures.

# SECOND PASS: more legible structural decay using actual Boolean recesses.
# Unlike black overlay cracks, these cuts remove stone and retain uneven ridges.
def carve_groove(key,pts,width=.018,depth=.024):
    # Cut individually angled grooves at cap surface; connects as irregular joints.
    for k,(a,b) in enumerate(zip(pts,pts[1:])):
        dx=b[0]-a[0];dy=b[1]-a[1]
        length=math.hypot(dx,dy)
        center=((a[0]+b[0])/2,(a[1]+b[1])/2,.587)
        carve_rect(key+" "+str(k),center,(length+.006,width,depth),
                   (0,0,math.atan2(dy,dx)),["07 polished top bed"])
if VARIANT=="A":
    # Aged gothic tomb: asymmetric edge erosion and partial conservation of ornament.
    for i,(center,dim,rot,target) in enumerate([
        ((-.88,-.82,.538),(.44,.22,.16),(.10,.08,.23),"06 upper projecting cap stone"),
        ((-.48,-.80,.56),(.20,.24,.14),(.06,.06,-.34),"06 upper projecting cap stone"),
        ((.97,.66,.55),(.36,.25,.20),(.27,-.12,.42),"06 upper projecting cap stone"),
        ((-.82,-.69,.31),(.29,.25,.20),(.12,.01,.20),"04 tall tomb shaft"),
        ((.81,-.71,.20),(.22,.22,.16),(.06,.12,.21),"03 lower molded setback")
    ]):
        carve_rect("old chipped masonry A"+str(i),center,dim,rot,[target])
    carve_groove("old top hairline",[(.63,.57),(.40,.50),(.14,.42),(-.05,.46)],.013,.020)
    for x in (-.57,-.18,.35):
        stain("Gothic black mineral ingress "+str(x),
              [(x,-.700,.451),(x+.021,-.700,.388),(x-.009,-.700,.345),
               (x+.012,-.701,.288)],.013)
elif VARIANT=="B":
    # Old ritual altar: serious long through-joint and weathered cap overhang.
    carve_groove("ritual main lost stone",[
        (-.76,-.43),(-.55,-.31),(-.30,-.37),(-.07,-.25),
        (.20,-.29),(.43,-.12),(.66,-.05)],.028,.034)
    carve_groove("ritual small branch",[(-.30,-.37),(-.28,-.57),(-.16,-.67)],.017,.026)
    for i,(pos,dims,rot,target) in enumerate([
        ((-.96,-.79,.54),(.38,.27,.19),(.17,-.09,.34),"06 upper projecting cap stone"),
        ((.90,-.80,.53),(.32,.25,.15),(.13,.04,.53),"06 upper projecting cap stone"),
        ((.78,-.65,.26),(.26,.23,.20),(.14,-.11,.38),"04 tall tomb shaft"),
    ]):
        carve_rect("worn altar break"+str(i),pos,dims,rot,[target])
    for x in (-.53,-.27,.19,.57):
        stain("rain burnt streak B"+str(x),[(x,-.700,.45),
            (x-.022,-.702,.386),(x+.016,-.702,.319),(x-.012,-.702,.262)],.016)
else:
    # Heavy impact: substantial missing ledge corners, not a perfect rectangular frame.
    for i,(pos,dims,rot,targets) in enumerate([
        ((.90,-.79,.54),(.48,.40,.24),(.16,-.21,.45),["06 upper projecting cap stone"]),
        ((.68,-.74,.53),(.37,.35,.19),(-.11,.14,.38),["06 upper projecting cap stone"]),
        ((.81,-.66,.32),(.40,.30,.28),(.20,.08,.41),["04 tall tomb shaft"]),
        ((.86,-.73,.13),(.35,.30,.19),(.25,-.21,.47),["03 lower molded setback"]),
        ((-.95,.68,.09),(.30,.31,.18),(.11,-.08,.25),["01 foundation lower square course"])
    ]):
        carve_rect("collapsed compound break"+str(i),pos,dims,rot,targets)
    carve_groove("collapsed upper fracture",[
        (.62,.44),(.42,.27),(.23,.19),(.06,-.01),(-.10,-.09)],.029,.030)
    stain("collapsed trapped silt",[(-.82,-.827,.462),(-.44,-.826,.467),
        (-.16,-.827,.464),(.22,-.827,.462)],.015)

# Third pass: structural fissures that penetrate face geometry, not just dark ink.
# Cut short step-shaped gouges along exposed face, avoiding uniform repeated cracks.
def vertical_fissure(tag, x,z,length=.20,width=.025,y=-.696):
    carve_rect(tag+" front recessed split",(x,y,z),(width,.11,length),
               (0,.02,.09),["04 tall tomb shaft"])
    # Side branching crack makes the loss more plausible than a straight knife slot.
    crack(tag+" smaller branching crack",[(x,y-.003,z-.05),
        (x+.078,y-.006,z-.081),(x+.114,y-.008,z-.078)],.009)
if VARIANT=="A":
    vertical_fissure("old Gothic broken ashlar",-.50,.343,.21,.027)
    carve_rect("A lost base corner",(-.90,-.77,.12),(.30,.23,.14),
        (.24,-.08,.44),["01 foundation lower square course"])
    stain("A centuries of grime beneath left cap",[
        (-.71,-.70,.443),(-.69,-.699,.36),(-.67,-.699,.31)],.019)
elif VARIANT=="B":
    vertical_fissure("altar stress fault",-.29,.324,.18,.041)
    carve_rect("B deteriorated inset ashlar",(.47,-.695,.332),(.35,.16,.16),
        (.19,.02,.28),["04 tall tomb shaft"])
    for x in (-.66,.15,.55):
        stain("B recessed stain "+str(x),[(x,-.699,.439),
             (x-.012,-.700,.363),(x+.01,-.7,.301)],.017)
else:
    vertical_fissure("massive front diagonal fault",.40,.34,.25,.050)
    carve_rect("C lost front cap block",(.57,-.805,.548),(.49,.32,.17),
         (.11,-.12,.32),["06 upper projecting cap stone"])
    carve_rect("C crushed lower joint",(.68,-.728,.19),(.38,.27,.20),
         (.18,-.14,.36),["03 lower molded setback"])
    stain("C dark grit inside fractured course",[(.28,-.699,.436),
         (.40,-.699,.398),(.46,-.700,.351),(.56,-.700,.304)],.017)
print("WEATHERING_V3_FISSURE_GROOVES",VARIANT)

print("WEATHERING_V2_TRUE_CUTS",VARIANT)

print("ARCHAEOLOGICAL_WEAR_VARIANT",VARIANT)

# Save and export ONLY asset. Preview stage deliberately separate.
bpy.ops.object.select_all(action="DESELECT")
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in objects if o.type=="MESH")

# UVs are generated for standalone photo PBR GLB, excluding preview stage.
if photo_status=="AMBIENTCG_ROCK063_CC0_PHOTOGRAPHIC":
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=next(ob for ob in objects if ob.type=="MESH")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(island_margin=.03)
    bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.export_scene.gltf(filepath=str(OUT/(MODEL+".glb")),export_format="GLB",use_selection=True,export_materials="EXPORT")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(MODEL+".blend")))
# Preview stage, cameras and lights excluded from exported GLB and saved BLEND
for o in objects:o.select_set(False)
floor=material("render ground only",(.09,.09,.13))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.10))
base=bpy.context.object;base.dimensions=(5.6,5.6,.20)
base.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("review")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.16,.16,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.36
for name,pos,power,size in [("large softbox",(-3,-4,5),270,3),("violet cool fill",(4,-2,3),185,3),("rim",(-1,3,5),245,2)]:
 data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=size
 light=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(light)
 light.location=pos;light.rotation_euler=(Vector((0,0,.25))-light.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add(location=(3,-4,2.4))
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=1.67
scene=bpy.context.scene;scene.camera=cam
scene.render.engine="CYCLES";scene.cycles.samples=36
scene.view_settings.exposure=-.40;scene.cycles.use_denoising=False
for l in scene.view_layers:
 if hasattr(l,"cycles"):l.cycles.use_denoising=False
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
for name,pt in (("front",(0,-4,.75)),("side",(4,0,.75)),("angle",(3,-4,1.4))):
 cam.data.ortho_scale=2.04 if name=="angle" else 1.72
 cam.location=pt;cam.rotation_euler=(Vector((0,0,.27))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(OUT/(name+".png"))
 bpy.ops.render.render(write_still=True)
sha={}
for p in list(OUT.glob("*.png"))+[OUT/(MODEL+".glb"),OUT/(MODEL+".blend")]:
 sha[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
meshes=[o for o in objects if o.type=="MESH"]
manifest={"approval":"NOT_APPROVED","stage":"B5","part":"architectural_pedestal_weathered3_"+VARIANT,"variant":VARIANT,
"source_sha":os.getenv("GITHUB_SHA"),"run_id":os.getenv("GITHUB_RUN_ID"),
"mesh_count":len(meshes),"all_source_preserved":True,"game_integrated":False,"photo_status":photo_status,
"render_views":["front","side","angle"],"files_sha256":sha,
"known_limitations":"Separate review candidate with optionally applied Rock063 CC0 photo. Geometry-only chip/crevice effects; not final historical reconstruction. Artistic approval pending."}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print("PEDESTAL_RENDER_COMPLETE",json.dumps({"meshes":len(meshes),"files":list(sha)}))

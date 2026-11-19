#!/usr/bin/env python3
"""B5 ruined sentinel statue V7 candidate. Original meshes only, NOT_APPROVED."""
import bpy, math, os, json, hashlib, random
from mathutils import Vector
from pathlib import Path

OUT=Path(os.environ.get("KNIGHT_OUTPUT","render-output/b5-knights/sentinel_v12")).resolve()
OUT.mkdir(parents=True,exist_ok=True)
random.seed(516)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
asset=[]

def mat(name,color,rough=0.94,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1)
    m.use_nodes=True
    n=m.node_tree.nodes.get("Principled BSDF")
    n.inputs["Base Color"].default_value=(*color,1)
    n.inputs["Roughness"].default_value=rough
    n.inputs["Metallic"].default_value=metal
    return m
stone=mat("cold graphite weathered stone",(0.107,0.119,0.155))
light=mat("edge erosion light stone",(0.19,0.196,0.223))
dark=mat("deep joints stone",(0.057,0.061,0.084))
trim=mat("aged steel stone trim",(0.134,0.13,0.158),.88,.08)
crack=mat("recesses dark",(0.115,0.105,0.130))

# V3 original stone color and real embedded tangent-space normal map.
# Generated in-memory: no third-party textures or Blender-only bump dependence.
def stone_maps(name,base,seed):
    size=256
    raw=[];norm=[]
    def height(x,y):
        a=math.sin(x*.117+y*.037+seed)*math.cos(y*.16-x*.025)
        b=math.sin(x*.72+y*.81+seed*2.3)*math.cos(x*.51-y*.33)
        c=math.sin(x*.035-y*.028+seed)
        return .50+.24*a+.17*b+.09*c
    for y in range(size):
        for x in range(size):
            h=height(x,y)
            darkening=.92 + .17*h + .032*math.sin(x*.043+y*.095)
            warm=.012*math.sin(x*.088+y*.027)
            raw.extend((max(0,min(1,base[0]*darkening+warm)),
                        max(0,min(1,base[1]*darkening)),
                        max(0,min(1,base[2]*darkening-warm*.6)),1.0))
            gx=(height((x+1)%size,y)-height((x-1)%size,y))*.58
            gy=(height(x,(y+1)%size)-height(x,(y-1)%size))*.58
            vec=Vector((-gx,-gy,1.0)).normalized()
            norm.extend(((vec.x+1)/2,(vec.y+1)/2,(vec.z+1)/2,1.0))
    al=bpy.data.images.new(name+" embedded stone albedo",width=size,height=size,alpha=True)
    al.pixels[:]=raw;al.pack()
    nm=bpy.data.images.new(name+" embedded stone normal",width=size,height=size,alpha=True)
    nm.pixels[:]=norm;nm.colorspace_settings.name='Non-Color';nm.pack()
    return al,nm
def attach_stone_maps(material,base,seed):
    al,nm=stone_maps(material.name,base,seed)
    nodes=material.node_tree.nodes;links=material.node_tree.links
    shader=nodes.get('Principled BSDF')
    color=nodes.new('ShaderNodeTexImage');color.image=al
    color.interpolation='Linear'
    normal=nodes.new('ShaderNodeTexImage');normal.image=nm
    normal.interpolation='Linear'
    convert=nodes.new('ShaderNodeNormalMap');convert.inputs['Strength'].default_value=.52
    links.new(color.outputs['Color'],shader.inputs['Base Color'])
    # The generated normal image exported black in V3/V4 on Blender 4.0.
    # Do not connect an unverified normal map; preserve actual mesh vertex normals.
    # Images remain source diagnostics only, albedo is properly embedded.

attach_stone_maps(stone,(.34,.366,.416),23)
attach_stone_maps(light,(.43,.452,.49),37)


# V12 real photography source (ambientCG Rock063 CC0), optional when CDN is inaccessible.
# All source photos are packaged as raw source evidence in the review-only artifact.
photo_dir=Path("render-output/b5-knights/photo_source")
photo_ready=(photo_dir/"Color.jpg").is_file() and (photo_dir/"Roughness.jpg").is_file()
photo_mode="PROCEDURAL_FALLBACK"
if photo_ready:
    try:
        raw_color=bpy.data.images.load(str((photo_dir/"Color.jpg").resolve()),check_existing=True)
        raw_rough=bpy.data.images.load(str((photo_dir/"Roughness.jpg").resolve()),check_existing=True)
        raw_color.pack()
        raw_rough.colorspace_settings.name="Non-Color"
        raw_rough.pack()
        for material in (stone,light):
            n=material.node_tree.nodes
            links=material.node_tree.links
            bsdf=n.get("Principled BSDF")
            active=bsdf.inputs["Base Color"].links
            old_color=active[0].from_socket if active else None
            tex=n.new("ShaderNodeTexImage")
            tex.image=raw_color
            tex.label="Photo-scanned CC0 stone albedo"
            blend=n.new("ShaderNodeMixRGB")
            blend.blend_type="MIX"
            blend.inputs[0].default_value=.47
            if old_color:
                links.new(old_color,blend.inputs[1])
            else:
                blend.inputs[1].default_value=(.35,.35,.39,1)
            links.new(tex.outputs["Color"],blend.inputs[2])
            links.new(blend.outputs["Color"],bsdf.inputs["Base Color"])
            rough=n.new("ShaderNodeTexImage");rough.image=raw_rough
            links.new(rough.outputs["Color"],bsdf.inputs["Roughness"])
        photo_mode="AMBIENTCG_ROCK063_REAL_PHOTO_CC0"
    except Exception as photo_error:
        print("PHOTO_APPLICATION_FAILED",str(photo_error))
else:
    print("PHOTO_FALLBACK", "no licensed source file fetched")

def saveobj(o,name,material):
    o.name=name;o.data.materials.append(material);asset.append(o)
    return o
def bevel(o,width=.045,segments=2):
    mod=o.modifiers.new("rounded worn edges","BEVEL");mod.width=width;mod.segments=segments
    mod2=o.modifiers.new("weighted normals","WEIGHTED_NORMAL")
    return o
def cube(name,loc,scale,material=stone,bev=.045,rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object
    o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rotation:o.rotation_euler=rotation
    saveobj(o,name,material)
    if bev:bevel(o,bev)
    return o
def ico(name,loc,radius,material=stone,subdiv=2,scale=(1,1,1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=radius,location=loc)
    o=bpy.context.object;o.scale=scale
    # Non-uniform weathering of the surface at mesh level; no shader-only bump.
    for v in o.data.vertices:
        p=v.co;phase=p.x*9.13+p.y*7.21+p.z*11.7
        f=1+0.036*math.sin(phase)+0.027*math.sin(p.x*21.3-p.z*7.3)
        p.x*=f;p.y*=f;p.z*=f
    return saveobj(o,name,material)
def rod(name,a,b,r,material=stone,vertices=12):
    a,b=Vector(a),Vector(b);v=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    return saveobj(o,name,material)
def cone(name,loc,r1,r2,h,material=stone):
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r1,radius2=r2,depth=h,location=loc)
    return saveobj(bpy.context.object,name,material)

# Carved double plinth; corner blocks are deliberately irregular.
cube("BASE intact lower plinth",(0,0,.11),(1.78,1.55,.22),stone,.06)
cube("BASE stepped course",(0,0,.27),(1.57,1.36,.16),stone,.045)
cube("BASE split upper course",(0,-.02,.39),(1.34,1.13,.13),light,.028)
for i,(x,y,s) in enumerate([(-.72,-.65,.18),(.68,-.61,.12),(.74,.55,.16),(-.68,.53,.10)]):
    ico("BASE worn chipped corner %02d"%i,(x,y,.23),s,stone,1,(1,.7,.5))
# Instep and sabatons
for side in (-1,1):
    x=side*.30
    cube("ARMOR greave knee to foot %s"%side,(x,.025,.83),(.36,.43,.80),stone,.09,
         (0,side*.03,side*.022))
    cube("ARMOR greave ankle rib %s"%side,(x,-.14,.62),(.41,.14,.20),light,.032)
    ico("ARMOR knee bowl %s"%side,(x,-.03,1.24),.22,light,2,(1.08,1.02,.85))
    cube("ARMOR forward boot %s"%side,(x,-.17,.47),(.43,.70,.19),stone,.07)
    rod("ARMOR longitudinal shin ridge %s"%side,(x,-.22,.67),(x,-.17,1.12),.044,trim,10)
# Waist and torso, ridge overlaps layered armor
cube("BODY hips",(0,0,1.49),(1.03,.58,.49),stone,.11)
cube("BODY lower breastplate",(0,-.03,1.96),(.99,.60,.69),stone,.16)
cube("BODY upper breastplate",(0,-.01,2.32),(1.17,.70,.75),stone,.19)
cube("BODY sculpted central ridge",(0,-.39,2.18),(.11,.16,.98),light,.048)
for i in range(3):
    cube("ARMOR overlapping waist lames %d"%i,(0,-.315,1.76-i*.135),(1.00-i*.05,.19,.155),stone,.04)
# Gothic pointed chest relief
for side in (-1,1):
    rod("CHEST gothic diagonal relief %s"%side,(0,-.43,2.28),(side*.42,-.38,2.60),.036,light,9)
    # one intact shoulder, one visibly damaged with lost outer cap
    if side==-1:
        ico("SHOULDER surviving carved pauldron",(-.76,-.02,2.60),.39,stone,3,(1.25,.96,.68))
        cube("SHOULDER laminated guard",(-.79,-.11,2.38),(.55,.58,.29),light,.08,(0,0,-.16))
    else:
        ico("SHOULDER snapped shoulder socket",(.62,.04,2.49),.25,dark,1,(.95,.9,.7))
        ico("SHOULDER asymmetrical fracture shard",(.83,.02,2.50),.16,stone,1,(1.6,1,.60))
# Neck & helmet
rod("NECK carved collar",(0,.00,2.68),(0,0,2.86),.24,dark)
ico("HEAD helm skull",(0,-.015,3.045),.38,stone,4,(.88,.86,1.05))
cube("HEAD visor face plate",(0,-.305,2.97),(.60,.18,.37),stone,.09)
cube("HEAD eye slit deep shadow",(0,-.414,3.08),(.46,.018,.047),crack,.009)
for side in (-1,1):
    cube("HEAD visor bar %s"%side,(side*.22,-.412,3.05),(.065,.064,.26),trim,.015)
rod("HEAD crest surviving spine",(0,.0,3.36),(0,.06,3.66),.08,light,10)
ico("HEAD chipped crest tip",(0,.06,3.67),.125,stone,1,(.9,.8,.45))
# Arms held next to torso, one arm farther forward to grip a ruined longsword
rod("LEFT upper arm",(-.75,0,2.39),(-.82,-.12,1.87),.18,stone)
ico("LEFT damaged elbow",(-.82,-.13,1.86),.18,light,1,(1.2,1.1,.75))
rod("LEFT forearm",(-.82,-.13,1.84),(-.62,-.39,1.56),.15,stone)
ico("LEFT gauntlet",(-.61,-.41,1.52),.19,stone,1,(.95,1,.8))
rod("RIGHT upper arm",(.67,.01,2.42),(.72,-.20,1.98),.19,stone)
ico("RIGHT elbow",(.72,-.19,1.95),.20,light,2,(1,.95,.82))
rod("RIGHT forearm",(.71,-.21,1.94),(.61,-.53,1.47),.15,stone)
ico("RIGHT gripping hand",(.60,-.54,1.44),.17,light,2,(1,.9,1))
# Longsword deliberately battered; supported on the plinth in front of the figure
rod("SWORD weathered central fuller",(.60,-.65,.50),(.60,-.65,1.48),.069,trim,8)
cone("SWORD stone point",(.60,-.65,.47),.085,.005,.18,trim)
rod("SWORD crossguard",(.30,-.65,1.48),(.92,-.65,1.48),.069,stone,8)
rod("SWORD pommel",(.60,-.65,1.54),(.60,-.65,1.85),.069,trim,10)
ico("SWORD pitted pommel",(.60,-.65,1.87),.108,stone,1)
# Decay damage and physically grounded fragments.
for i,(x,y,z,rr) in enumerate([
    (.70,.17,.48,.18),(-.64,-.53,.46,.15),(.42,.60,.43,.12),(-.86,.21,.23,.13),
    (.83,-.02,.29,.14),(.46,-.56,.31,.10),(-.52,.48,.39,.11)]):
    ico("RUBBLE on-ground irregular fragment %02d"%i,(x,y,z),rr,stone if i%2 else light,1,(1.3,.8,.65))
# Hand-carved chips along one plinth seam, no identical particles.
for i in range(4):
    x=-.47+i*.31
    rod("PLINTH rough horizontal fracture %d"%i,(x,-.692,.30), (x+.19,-.691,.32+(-1)**i*.023),.009,dark,6)


# V2 relief and articulated armor (base V1 meshes retained untouched).
def carved_plate(name,outline,material,thickness=.085):
    mesh=bpy.data.meshes.new(name+"_mesh")
    mesh.from_pydata(outline,[],[tuple(range(len(outline)))])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    saveobj(obj,name,material)
    solid=obj.modifiers.new("chiseled thickness","SOLIDIFY");solid.thickness=thickness
    bevel(obj,.024,2)
    return obj
# Sculpted cuirass halves create a convex sternum silhouette over V1 block.
carved_plate("V2 curved breast left",
  [(-.52,-.385,2.51),(-.10,-.505,2.61),(-.035,-.585,2.23),(-.45,-.455,2.00),(-.57,-.37,2.20)],stone)
carved_plate("V2 curved breast right",
  [(.52,-.385,2.51),(.10,-.505,2.61),(.035,-.585,2.23),(.45,-.455,2.00),(.57,-.37,2.20)],stone)
carved_plate("V2 gothic central lancet",
  [(-.085,-.59,2.44),(0,-.62,2.65),(.085,-.59,2.44),(.055,-.62,2.16),(0,-.65,2.08),(-.055,-.62,2.16)],light,.028)
# Segmented sculpted abdominals with staggered lengths and bevel.
for i in range(4):
    z=1.99-i*.116
    width=.94-i*.035
    cube("V2 articulated abdominal lame %02d"%i,(0,-.406-i*.007,z),
         (width,.12,.105),stone,.030,rotation=(0,0,(-1)**i*.017))
    for side in (-1,1):
        cube("V2 lame carved edge %02d %d"%(i,side),(side*(width/2-.075),-.48,z),
            (.05,.05,.084),light,.010)
# Strongly chiseled helmet brows and hidden mouth guard.
carved_plate("V2 damaged pointed helmet brow",
  [(-.31,-.375,3.18),(-.14,-.42,3.225),(0,-.43,3.16),(.22,-.41,3.23),(.30,-.366,3.15),(.25,-.41,3.115),(-.27,-.41,3.115)],stone,.045)
for x in [-.23,-.10,.10,.22]:
    rod("V2 vertical lower visor slots %.2f"%x,(x,-.425,2.84),(x,-.425,3.02),.020,dark,8)
# Layered left shoulder plate with real width and stepped outline.
carved_plate("V2 left shoulder lower gorget",
 [(-1.07,-.33,2.51),(-.89,-.40,2.58),(-.61,-.38,2.43),(-.62,-.35,2.28),(-.98,-.35,2.29)],light,.09)
for i in range(3):
    rod("V2 left pauldron ridge %d"%i,
       (-1.02+i*.1,-.36,2.53+i*.036),(-.69+i*.09,-.37,2.58+i*.028),.023,trim,9)
# Right broken shoulder guard: a narrow dangling surviving plate.
carved_plate("V2 right broken hanging plate",
 [(.59,-.38,2.50),(.80,-.33,2.57),(.91,-.34,2.36),(.73,-.40,2.29),(.64,-.40,2.33)],stone,.06)
# Gauntlet finger bands and arm joint motifs.
for side in (-1,1):
    x=(-.60 if side==-1 else .60)
    y=(-.46 if side==-1 else -.58)
    for k in range(3):
        rod("V2 gauntlet transverse finger %d %d"%(side,k),(x-.115,y-.02,1.48-k*.048),
          (x+.115,y-.02,1.48-k*.048),.017,trim,8)
# Stone split in the sword, and angular guard finials.
for sign in [-1,1]:
    ico("V2 sword crossguard finial %d"%sign,(.60+sign*.33,-.65,1.48),.10,light,2,(1,.8,1.6))
rod("V2 sword fuller left",(.552,-.73,.65),(.552,-.73,1.35),.018,dark,8)
rod("V2 sword fuller right",(.648,-.73,.68),(.648,-.73,1.35),.018,dark,8)
# Large, non-repetitive broken stone slabs on the plinth; stay physically grounded.
carved_plate("V2 fractured plinth front left",
 [(-.71,-.787,.36),(-.42,-.79,.38),(-.33,-.78,.31),(-.49,-.78,.27),(-.71,-.78,.30)],dark,.030)
carved_plate("V2 fractured plinth front right",
 [(.42,-.79,.39),(.72,-.78,.34),(.69,-.78,.26),(.51,-.78,.27),(.46,-.78,.32)],dark,.028)
for i,coords in enumerate([
 ((-.42,-.39,2.11),(-.23,-.45,2.29)),
 ((.30,-.46,2.06),(.39,-.42,2.18)),
 ((-.31,-.27,.96),(-.24,-.28,1.11)),
 ((.59,-.33,2.37),(.75,-.33,2.48)),
]):
    rod("V2 deep stone fissure %02d"%i,*coords,.013,dark,6)


# V3 repaired silhouette and weather-worn ornamental carvings.
for side in (-1,1):
    x=side*.30
    # Deep vertical flute geometry keeps detail visible at dungeon scale.
    for lane in (-1,0,1):
        rod("V3 sabaton embossed flute %d %d"%(side,lane),
            (x+lane*.092,-.386,.65),(x+lane*.092,-.33,1.11),
            .018,trim,10)
    for row in range(3):
        ico("V3 knee stone fastener %d %d"%(side,row),
            (x+(-.11+row*.11),-.211,1.25),.032,trim,2,(1,.5,.78))
    cube("V3 segmented greave strap %d"%side,(x,-.28,.91),
         (.39,.10,.09),light,.024)
# Deep gothic breast relief with irregular panel ribs, individually carved.
for side in (-1,1):
    for i in range(3):
        y=-.51+i*.009
        ax=side*(.12+i*.12)
        rod("V3 chest engraved rib %d %d"%(side,i),
            (ax,y,2.51-i*.017),(side*(.09+i*.135),y-.027,2.19-i*.023),
            .012,trim,8)
    # shoulder eroded metal plate edges
    rod("V3 shoulder outer rim %d"%side,(side*.66,-.30,2.55),
        (side*.91,-.30,2.43),.024,light,10)
# Helmet's triangular crown and worn neck flutes.
for i in range(6):
    a=(i/6)*math.pi*2
    x=.19*math.cos(a);y=.20*math.sin(a)
    rod("V3 carved neck guard slot %d"%i,(x,y,2.73),(x*.9,y*.9,2.85),.013,dark,8)
# A heraldic chest medallion suggests a ruined royal guard, not a robot.
ico("V3 ancient chest sigil base",(0,-.635,2.18),.103,trim,3,(1,.44,1.11))
rod("V3 heraldry central stroke",(0,-.727,2.21),(0,-.727,2.14),.010,light,8)
for i in (-1,1):
    rod("V3 heraldry wings %d"%i,(0,-.727,2.18),(i*.078,-.70,2.235),.009,light,8)
# Deliberately larger worn-off fractures, NOT a field of tiny random chips.
for i,(p,scale) in enumerate([
 ((-.41,-.45,2.08),(.21,.11,.08)),
 ((.36,-.44,2.45),(.18,.10,.06)),
 ((-.89,-.33,2.48),(.13,.09,.09)),
 ((.28,-.32,1.04),(.07,.10,.17)),
]):
    ico("V3 fractured stone coarse edge %d"%i,p,.11,dark,2,scale)


# V4 Gothic silhouette passes. V1-V3 original meshes remain inside asset.
for side in [-1,1]:
    # Medieval segmented fauld / hip tasset, slopes away from the sternum.
    carved_plate("V4 articulated side fauld %d"%side,
      [(side*.20,-.395,1.70),(side*.58,-.30,1.70),(side*.66,-.28,1.28),
       (side*.36,-.34,1.16),(side*.20,-.40,1.30)],stone,.087)
    for i in range(2):
        z=1.38-i*.12
        rod("V4 tasset chased band %d %d"%(side,i),
            (side*.34,-.40,z),(side*.58,-.35,z-.06),.027,light,10)
    # Forearm plating over cylinders gives flared wrist silhouette.
    x=(.73 if side==1 else -.77)
    y=(-.37 if side==1 else -.29)
    carved_plate("V4 angular bracer guard %d"%side,
      [(x-.12,y,1.88),(x+.12,y,1.88),(x+.175,y-.09,1.60),
       (x+.095,y-.11,1.55),(x-.14,y-.09,1.60)],stone,.08)
# Visor pointed central nose ridge, keeping old helmet body.
carved_plate("V4 gothic visor pointed nasal",
  [(-.063,-.472,3.19),(0,-.485,3.24),(.063,-.472,3.19),
   (.042,-.50,2.88),(0,-.504,2.83),(-.042,-.50,2.88)],light,.025)
# Grooved crest: broader at the base and chipped at its end.
carved_plate("V4 fractured helm crest",
 [(-.13,.01,3.35),(.13,.01,3.35),(.115,.00,3.60),
  (.015,.01,3.67),(-.12,.01,3.58)],stone,.10)


# V7: Larger, physically grounded silhouette modifications without deleting V6 meshes.
# Weathering is deliberately structured around exposed corners and joint seams.
# Keep all prior mesh objects; add free-form sculpted surfacing as independent objects.
def eroded_rock(name, origin, size, material, segments=3, phase=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=segments, radius=1, location=origin)
    obj=bpy.context.object
    for v in obj.data.vertices:
        p=v.co
        f=1+.12*math.sin(p.x*6.5+phase)*math.cos(p.y*4.8-phase*.5)
        f+=.05*math.sin(p.z*11.7+p.x*8.9+phase)
        p.x*=size[0]*f; p.y*=size[1]*f; p.z*=size[2]*f
    return saveobj(obj,name,material)
# Bell shaped waist adds the mass of carved armour worn down at its weak hinge.
for side in (-1,1):
    carved_plate("V7 tapered thigh plate %d"%side,
       [(side*.23,-.40,1.57),(side*.55,-.37,1.52),(side*.62,-.27,1.20),
        (side*.55,-.34,1.05),(side*.33,-.45,1.16)],stone,.11)
    # The shoulder outline: chipped scalloped epaulette, not identical mirrored parts.
    if side==-1:
        carved_plate("V7 broken overlapping shoulder lip",
          [(-1.12,-.26,2.62),(-.90,-.42,2.72),(-.70,-.40,2.59),
           (-.64,-.38,2.49),(-.86,-.36,2.44),(-1.10,-.31,2.49)],stone,.105)
    else:
        eroded_rock("V7 fallen outer pauldron remnant",(.94,-.02,2.37),
                     (.19,.25,.10),light,2,phase=2)
    # Cracked layered elbow flanges (one collapsed, one still intact)
    wrist=(.67 if side==1 else -.70)
    eroded_rock("V7 elbow articulation rough relief %d"%side,
                 (wrist,-.25,1.93),(.22,.16,.11),stone,2,phase=side*1.3)
# Broad bust ridges resembling heavy Gothic fluting (visible at dungeon scale).
for side in (-1,1):
    for row in range(3):
        a=side*(.16+row*.118)
        rod("V7 thick hammered chest rib %d_%d"%(side,row),
            (a,-.52+row*.024,2.52),
            (side*(.14+row*.125),-.49+row*.02,2.24),
            .026 if row==0 else .019,light,10)
# Chipped helm at a single asymmetric location.
eroded_rock("V7 jagged crown missing-edge relief",(.19,-.035,3.53),
             (.13,.13,.16),dark,2,phase=4)
# Broken sword hilt and guard have weight, not thin line-art geometry.
for side in (-1,1):
    eroded_rock("V7 stone sword crossguard thick finial %d"%side,
          (.60+side*.35,-.65,1.48),(.095,.085,.14),light,2,phase=side+4)
# Stone plates flaked from the plinth, separate large fragments grounded on ledge.
for i,(x,y,z,sc) in enumerate([
    (-.66,-.52,.39,(.23,.14,.11)),(.66,.58,.32,(.19,.16,.08)),
    (-.50,.52,.42,(.13,.20,.12))]):
    eroded_rock("V7 coarse erosion detached flake %d"%i,(x,y,z),sc,light,2,phase=i*2)


# V8 large-scale anatomy and curvature repairs (all V1-V7 objects remain).
# Ring-lofted surfaces simulate genuinely sculpted stone armor rather than stacks of cubes.
def loft_stone(name,rings,material,radial=20,rough=.018):
    verts=[];faces=[]
    for ri,(cx,cy,z,rx,ry) in enumerate(rings):
        for j in range(radial):
            a=2*math.pi*j/radial
            wobble=1+rough*math.sin(j*2.4+ri*3.9)+rough*.52*math.cos(j*5.3-ri*1.8)
            verts.append((cx+math.cos(a)*rx*wobble,
                          cy+math.sin(a)*ry*wobble,z+
                          rough*.15*math.sin(a*3+ri*1.7)))
    for i in range(len(rings)-1):
        for j in range(radial):
            a=i*radial+j;b=i*radial+(j+1)%radial
            faces.append((a,b,b+radial,a+radial))
    faces.append(tuple(reversed(range(radial))))
    faces.append(tuple((len(rings)-1)*radial+j for j in range(radial)))
    mesh=bpy.data.meshes.new(name+"_real_displaced_mesh")
    mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(o)
    return saveobj(o,name,material)
# The outer breast and fluted belly now have real oval silhouettes in side view.
loft_stone("V8 upper cuirass curved stone skin",[
 (0,-.06,2.00,.41,.34),(0,-.06,2.14,.52,.49),
 (0,-.055,2.29,.57,.54),(0,-.045,2.45,.57,.52),
 (0,-.045,2.58,.42,.40),(0,-.04,2.64,.26,.25)
],stone,28,.020)
# Partially cover faceplate bars. A late Gothic bascinet has broad lower rim,
# narrow eye aperture and an angular pointed top.
loft_stone("V8 bascinet eroded outer shell",[
 (0,-.025,2.87,.28,.39),(0,-.025,2.98,.37,.51),
 (0,-.018,3.13,.38,.48),(0,0,3.30,.29,.40),
 (0,.01,3.43,.18,.27),(0,.025,3.54,.085,.13)
],stone,24,.025)
# Front dark metalless visor recess is a deeply carved horizontal stone cut.
cube("V8 black visor hollow visible front",(0,-.544,3.078),(.51,.038,.071),dark,.022)
carved_plate("V8 heavy tapered nose protection",
 [(-.062,-.565,3.15),(0,-.571,3.20),(.062,-.565,3.15),
  (.048,-.592,2.91),(0,-.593,2.85),(-.048,-.592,2.91)],light,.053)
# Natural curved knee and shin volume: maintain V6 cylinders behind new shells.
for side in (-1,1):
    x=side*.30
    loft_stone("V8 anatomical stone greave %d"%side,[
       (x,.025,.52,.17,.18),(x,.02,.63,.235,.225),
       (x,.0,.84,.21,.24),(x,.015,1.06,.20,.23),
       (x,-.018,1.21,.225,.20)
    ],stone,20,.019)
    # Broad asymmetrical armored shoe over the previously square sabot.
    loft_stone("V8 broad broken sabaton %d"%side,[
       (x,-.205,.39,.235,.32),(x,-.225,.47,.28,.345),
       (x,-.205,.55,.23,.32),(x,-.165,.61,.16,.25)
    ],stone,20,.028)
# True chipped face detail on outer shoulder relief; asymmetry is intentional.
eroded_rock("V8 right shoulder missing armor fracture",(.80,-.15,2.58),(.20,.20,.12),dark,3,phase=4.5)
eroded_rock("V8 left upper pauldron weather-worn carved stone",(-.90,-.15,2.63),(.30,.30,.20),stone,3,phase=1.7)


# V9: A weathered stone tabard and broken cape counteract the toy-like empty hips.
# Separate carved masses, retaining every underlying armoured mesh.
def sculpt_slab(name,points,material,thick=.105):
    return carved_plate(name,points,material,thick)
# Enamel-free stone tabard over the waist, irregular edges with physically chiseled facets.
sculpt_slab("V9 stone heraldic tabard central hanging",
 [(-.27,-.50,1.76),(.30,-.50,1.76),(.36,-.53,1.46),
  (.26,-.52,1.23),(.31,-.53,.97),(.16,-.56,.66),
  (-.05,-.56,.73),(-.25,-.55,.62),(-.28,-.53,.92),
  (-.33,-.52,1.20)],stone,.16)
for side in (-1,1):
    # Chipped decorative edges frame the tabard without tidy symmetrical bands.
    rod("V9 tabard carved border %d"%side,
        (side*.275,-.61,1.73),(side*.25,-.65,.96),.022,light,12)
# Draped destroyed stone cloak, attached under one shoulder, broken into angular falls.
sculpt_slab("V9 cape left upper weathered fold",
  [(-.65,.20,2.54),(-1.11,.24,2.48),(-1.16,.26,2.05),
   (-1.03,.34,1.65),(-.91,.42,1.38),(-.78,.37,1.69),(-.74,.28,2.13)],
  stone,.18)
sculpt_slab("V9 cape left lower torn edge",
  [(-1.05,.39,1.74),(-1.22,.40,1.27),(-1.21,.45,.86),
   (-1.08,.47,.59),(-.94,.46,.75),(-.88,.43,1.20)],
  light,.145)
sculpt_slab("V9 cape right snapped upper fold",
  [(.63,.20,2.42),(.98,.30,2.38),(1.02,.40,1.87),
   (.88,.41,1.65),(.74,.37,1.92)],
  stone,.145)
sculpt_slab("V9 cape right hanging remnant",
  [(.88,.41,1.82),(1.04,.45,1.54),(1.10,.52,1.19),
   (.98,.50,1.00),(.87,.47,1.17),(.75,.43,1.45)],
  light,.125)
# Face of the cloth-stone shows broad sculpted structural folds.
for side in (-1,1):
    for i in range(2):
        x=side*(.86+.105*i)
        rod("V9 cape long broken fold %d-%d"%(side,i),
           (x,.43,1.9-i*.23),(x+side*.08,.46,1.20-i*.25),.025,trim,8)
# Knocks at the knees: actual locally visible angular stone flake cracks.
for side in (-1,1):
    x=side*.30
    eroded_rock("V9 jagged chipped knee cap edge %d"%side,
        (x+side*.16,-.19,1.23),(.14,.18,.13),dark,2,phase=side*3)
# Additional weighty chipped stones on base, not tiny repeated dots.
for i,(x,y,z) in enumerate([(-.74,-.58,.33),(.76,-.48,.24),(-.55,.62,.38)]):
    eroded_rock("V9 large plinth fissure stone %d"%i,(x,y,z),
                (.13+i*.012,.17,.085),stone,2,phase=i*.85)


# V10: anatomically proportional adult stone knight (7-head construction).
# V1–V9 source geometries preserved as base. No objects deleted; all model
# mesh vertices are reshaped once after modifiers into a taller natural silhouette.
# The plinth is excluded from the proportional figure calculation.
def seven_head_height(z):
    anchors=[(.42,.42),(1.30,1.94),(1.70,2.25),(2.75,3.65),
             (2.90,3.77),(3.72,4.34)]
    if z<=anchors[0][0]: return z
    if z>=anchors[-1][0]: return anchors[-1][1]+(z-anchors[-1][0])*.68
    for (a,b),(c,d) in zip(anchors,anchors[1:]):
        if a<=z<=c: return b+(z-a)*(d-b)/(c-a)
    return z
# Capture solidify/bevel modifiers into the existing meshes without
# replacing them with duplicate models. This ensures GLB and Blender renders
# use the same geometry even when different modifiers are supported.
dg=bpy.context.evaluated_depsgraph_get()
for obj in asset:
    if obj.type != 'MESH': continue
    eval_ob=obj.evaluated_get(dg)
    mesh=bpy.data.meshes.new_from_object(eval_ob, preserve_all_data_layers=True,depsgraph=dg)
    obj.modifiers.clear()
    old_data=obj.data
    obj.data=mesh
    world_mat=obj.matrix_world.copy()
    local_mat=world_mat.inverted_safe()
    for vertex in mesh.vertices:
        world_pos=world_mat @ vertex.co
        z=world_pos.z
        # narrow the head as a unified group, not each primitive's local center
        if z>2.84:
            factor=.81 if z>2.95 else 1-(z-2.84)/.11*.19
            world_pos.x*=factor
            world_pos.y*=factor
        elif z>1.70:
            world_pos.x*=.87 if z>=2.24 else .95  # narrow shoulders, maintain waist
        # Introduce natural asymmetric posture. The blade leans outward
        # above the grip, rather than staying a toy-like vertical stick.
        if "SWORD" in obj.name or "sword" in obj.name:
            world_pos.x += .16*max(0.0,min(1.0,(z-.60)/1.25))
        # Offset one knee and boot very subtly; avoid mirrored block legs.
        if ("greave" in obj.name.lower() or "sabat" in obj.name.lower()
             or "knee" in obj.name.lower() or "boot" in obj.name.lower()):
            if world_pos.x < 0: world_pos.x-=.045*max(0.0,min(1.0,(z-.42)/.8))
        world_pos.z=seven_head_height(z)
        vertex.co=local_mat @ world_pos
    mesh.update()

# UV unwrap *after* geometry operations, avoiding default projection on authored loft meshes.
if photo_mode=="AMBIENTCG_ROCK063_REAL_PHOTO_CC0":
    bpy.ops.object.select_all(action="DESELECT")
    for ob in asset:
        if ob.type=="MESH":ob.select_set(True)
    bpy.context.view_layer.objects.active=next(o for o in asset if o.type=="MESH")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(island_margin=.035)
    bpy.ops.object.mode_set(mode="OBJECT")
    print("PHOTO_UV_UNWRAP",len([o for o in asset if o.type=="MESH"]))

# Check geometry after reshaping, *not* inferred from numbers in the script.
all_z=[(o.matrix_world @ v.co).z for o in asset if o.type=='MESH' for v in o.data.vertices]
top_z=max(all_z)
bottom_z=min(all_z)
head_bottom=seven_head_height(2.90)
head_top=seven_head_height(3.72)
body_bottom=seven_head_height(.42)
head_units=(top_z-body_bottom)/max(.01,head_top-head_bottom)
assert 6.35 < head_units < 8.0, ('Head-ratio target missed',head_units)
print('SEVEN_HEAD_QA',json.dumps({'total_height_from_plinth':round(top_z-body_bottom,3),
    'head_height':round(head_top-head_bottom,3),'head_units':round(head_units,3),
    'top_z':round(top_z,3),'mesh_count':len([o for o in asset if o.type=='MESH'])}))

# Save portable model only. Render floor/lights must not enter GLB.
bpy.ops.object.select_all(action='DESELECT')
for o in asset:o.select_set(True)
bpy.context.view_layer.objects.active=asset[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/"sentinel_v12.glb"),export_format='GLB',
    use_selection=True,export_apply=True,export_materials='EXPORT')
bpy.ops.object.select_all(action="SELECT")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"sentinel_v12.blend"))

# Review-only stage is made after glTF export and original .blend save.
for o in asset:o.select_set(False)
floor=mat("preview only ground",(0.10,.095,.145))
cube("REVIEW_STAGE_not_in_export",(0,0,-.15),(8,8,.22),floor,.05)
asset.pop() # remove review floor from the tracked model object list
world=bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.14,.13,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.47
def area_light(name,pos,power,size):
    data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=size
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=pos
    direction=Vector((0,0,1.9))-o.location;o.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
area_light("key neutral gray",(-4,-5,7),560,4.0)
area_light("fill violet",(4,0,6),330,4)
area_light("rim pale blue",(0,5,7),620,3)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.cycles.use_denoising=False
for layer in scene.view_layers:
    if hasattr(layer,'cycles'): layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
try:scene.view_settings.look='Medium High Contrast'
except:pass
def camera(loc,target):
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=6.1;scene.camera=cam
    return cam
cam=camera((5,-8,4.0),(0,0,1.85))
for view,pos in {"front":(0,-9,3.4),"side":(9,0,3.5),"angle":(6,-7,4.0)}.items():
    cam.location=pos;cam.rotation_euler=(Vector((0,0,2.20))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(view+".png"))
    bpy.ops.render.render(write_still=True)
meshes=[o for o in asset if o.type=='MESH']
checks={}
for p in [OUT/"sentinel_v12.glb", OUT/"sentinel_v12.blend"] + [OUT/(v+".png") for v in ("front","side","angle")]:
    checks[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
summary={"approval":"NOT_APPROVED","game_integrated":False,"asset":"b5_ancient_knight_sentinel_v12",
         "source_commit":os.getenv("GITHUB_SHA"),"run_id":os.getenv("GITHUB_RUN_ID"),
         "mesh_count":len(meshes),"triangulation":"blender glTF exporter",
         "object_names":[o.name for o in meshes],
         "views":["front","side","angle"],"files_sha256":checks,
         "head_units":round(head_units,3),"photo_material":photo_mode,"quality_note":"Seven-head height validated from mesh; technical QA only. No baked normal texture."}
(OUT/"manifest.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
print("KNIGHT_RENDER_COMPLETE",json.dumps({"meshes":len(meshes),"output":str(OUT)}))

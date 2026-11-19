"""Standalone A/B/C foliage-normal comparison from verified V27 tree Blend.

Never edits input V27 model; only selected leaf objects are copied into review
panel A original normals, B hemisphere custom normals and C normals+vertex AO.
"""
import bpy, json, math, hashlib, os
from mathutils import Vector, Matrix
from pathlib import Path

out=Path("render-output/floor6/foliage_backface_light_trial")
out.mkdir(parents=True, exist_ok=True)
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=1600
scene.render.resolution_y=680
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"

# A preview imported from verified V27 GLB can be used on the prebuilt
# common Blender container, avoiding a costly per-run Blender install.
source_glb=os.environ.get("F6_SOURCE_GLB")
if source_glb:
    assert Path(source_glb).is_file()
    bpy.ops.import_scene.gltf(filepath=str(Path(source_glb).resolve()))
source=[o for o in bpy.data.objects if o.type=="MESH" and (o.name.startswith("tree_mature_leaf_") or o.name.startswith("tree_mature_v25_canopy_"))]
assert len(source)>500, "V27 foliage leaves missing"
def centroid(obj):
    return obj.matrix_world @ (sum((v.co for v in obj.data.vertices),Vector()) / len(obj.data.vertices))
target=Vector((.55,-.08,2.25))
candidates=sorted(((centroid(o)-target).length,o) for o in source if len(o.data.vertices)>=8)
selected=[o for dist,o in candidates if dist<.57][:140]
if len(selected)<70:
    selected=[o for _,o in candidates[:140]]
assert len(selected)>=70
center=sum((centroid(o) for o in selected),Vector())/len(selected)
# Drop input scene only AFTER capturing source meshes and their transforms.
snapshots=[(o.data.copy(),o.matrix_world.copy()) for o in selected]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    if mat.users==0:
        bpy.data.materials.remove(mat)

def make_mat(name, variant):
    """Equal front-face color and .45 normals; only back-face shading differs.

    A = baseline. B = backface diffuse light limited, no glossy sparkle.
    C = B with a mild green-warm translucent-looking *artistic* color.
    This is a Blender material approximation, NOT physically accurate
    transmission or a promised Three.js material.
    """
    m=bpy.data.materials.new(name);m.use_nodes=True
    nodes=m.node_tree.nodes;links=m.node_tree.links
    bs=nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(.21,.39,.20,1)
    bs.inputs["Roughness"].default_value=.92
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value=.13
    elif "Specular" in bs.inputs:
        bs.inputs["Specular"].default_value=.13
    if variant:
        geom=nodes.new("ShaderNodeNewGeometry")
        geom.name="F6_Backing_Face_Detection"
        # Back faces should NOT be identical to the front, which produces
        # the glaring underside currently observed at .45 normal blending.
        # A muted diffuse material cuts the hard white highlight.
        dark=nodes.new("ShaderNodeBsdfDiffuse")
        dark.inputs["Color"].default_value=(.15,.245,.13,1)
        dark.inputs["Roughness"].default_value=.9
        mixer=nodes.new("ShaderNodeMixShader")
        links.new(geom.outputs["Backfacing"],mixer.inputs[0])
        links.new(bs.outputs["BSDF"],mixer.inputs[1])
        if variant==2:
            # Small warm-green back-scattered component, kept dim: a
            # visually motivated approximation only, not actual SSS.
            backmix=nodes.new("ShaderNodeAddShader")
            faint=nodes.new("ShaderNodeEmission")
            faint.inputs["Color"].default_value=(.13,.24,.08,1)
            faint.inputs["Strength"].default_value=.035
            links.new(dark.outputs["BSDF"],backmix.inputs[0])
            links.new(faint.outputs["Emission"],backmix.inputs[1])
            links.new(backmix.outputs[0],mixer.inputs[2])
        else:
            links.new(dark.outputs["BSDF"],mixer.inputs[2])
        outnode=nodes.get("Material Output")
        links.new(mixer.outputs[0],outnode.inputs["Surface"])
    return m
mA=make_mat("A 45pct Normal Original Backside",0)
mB=make_mat("B 45pct Normal Muted Backside",1)
mC=make_mat("C 45pct Normal Soft Backlight",2)
mat=[mA,mB,mC]
panels=(-2.45,0,2.45)
made=[]
changed=0
ao_min=1.0
ao_max=0.0
for pidx,shift in enumerate(panels):
    for idx,(mesh,transform) in enumerate(snapshots):
        m=mesh.copy()
        # Bake imported GLB transforms into geometry, then place all three
        # samples by their actual vertex coordinates. Imported GLB objects may
        # include tiny root scales; assigning matrix_world alone previously
        # left A and C almost on top of B despite all meshes existing.
        m.transform(transform)
        for vertex in m.vertices:
            vertex.co.x += shift
        # Avoid a single material inherited from source which may use an
        # atlas; controlled comparison isolates the normal effect.
        m.materials.clear()
        m.materials.append(mat[pidx])
        ob=bpy.data.objects.new("F6_Test_%s_%03d"%("ABC"[pidx],idx),m)
        bpy.context.collection.objects.link(ob)
        # Identity object transform; baked verts are in tree/world units.
        for face in m.polygons: face.use_smooth=True
        if True:
            normals=[]
            # Blender 4.0 may expose an empty corner_normals collection
            # immediately after GLB import. Fall back to polygon normals,
            # matching each loop to its real polygon instead of indexing
            # a zero-length collection.
            original=[Vector((0,0,1)) for _ in m.loops]
            for polygon in m.polygons:
                for li in polygon.loop_indices:
                    original[li]=polygon.normal.copy()
            if hasattr(m,"corner_normals") and len(m.corner_normals)==len(m.loops):
                original=[Vector(c.normal).copy() for c in m.corner_normals]
            # Compute hemisphere-like normals in the ORIGINAL tree's
            # coordinates, then transform them back to mesh-local space.
            inv=(ob.matrix_world.to_3x3().inverted()).transposed()
            inv.normalize()
            for loop in m.loops:
                point=ob.matrix_world @ m.vertices[loop.vertex_index].co
                # panel-shift independent crown coordinates
                rel=point-Vector((shift,0,0))-center
                outward=Vector((rel.x/.7,rel.y/.7,(rel.z+.35)/.55))
                if outward.length<1e-5: outward=Vector((0,0,1))
                # blend avoids totally homogenizing upper and inner leaf shape
                local=(inv @ outward.normalized()).normalized()
                mix_ratio=.45
                n=(local*mix_ratio + original[loop.index]*(1-mix_ratio)).normalized()
                normals.append(tuple(n))
                changed+=1
            m.normals_split_custom_set(normals)
            m.update()
            assert len(m.loops)==len(normals)
        if False and pidx==2:
            col=m.color_attributes.new(name="F6_SoftAO",type="FLOAT_COLOR",domain="POINT")
            for vert in m.vertices:
                pt=ob.matrix_world @ vert.co
                rel=pt-Vector((shift,0,0))-center
                planar=math.sqrt(rel.x**2+rel.y**2)
                # intentionally mild fake AO, not a physical bake
                shade=max(.70,min(1.0,.72+.24*min(1,planar/.85)+.04*max(-1,min(1,rel.z/.6))))
                col.data[vert.index].color=(shade,shade,shade,1)
                ao_min=min(ao_min,shade);ao_max=max(ao_max,shade)
        made.append(ob)
assert changed>1000
# Numerical image layout gate: these must be three spatially separated
# real foliage sprigs, otherwise visual A/B/C comparison is meaningless.
panel_centroids=[]
for pidx in range(3):
    sampled=made[pidx*len(selected):(pidx+1)*len(selected)]
    pts=[sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices) for o in sampled]
    panel_centroids.append(sum(pts,Vector())/len(pts))
assert abs((panel_centroids[1].x-panel_centroids[0].x)-2.45)<.06, panel_centroids
assert abs((panel_centroids[2].x-panel_centroids[1].x)-2.45)<.06, panel_centroids
print("F6_ABC_LAYOUT_VERIFIED", [round(c.x,2) for c in panel_centroids])
# Reference stylized woody stub is identical between all three panels.
wood=bpy.data.materials.new("Neutral Bark");wood.diffuse_color=(.24,.20,.16,1)
for shift in panels:
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.04,depth=.8,location=(shift,0,1.65))
    bpy.context.object.data.materials.append(wood)
    bpy.context.object.name="ReferenceTwig_%s"%shift

world=bpy.data.worlds.new("F6_TestWorld")
scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.35,.39,.43,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.72
def area(name,position,power,size):
    dat=bpy.data.lights.new(name,"AREA");dat.energy=power;dat.shape="DISK";dat.size=size
    ob=bpy.data.objects.new(name,dat);bpy.context.collection.objects.link(ob)
    ob.location=position
    ob.rotation_euler=(Vector((0,0,2.2))-ob.location).to_track_quat("-Z","Y").to_euler()
area("Key Light",(-4.0,-4.7,7),1150,5)
area("Fill Light",(3.5,2.5,4.5),430,4)
def camera(name,position,at):
    dat=bpy.data.cameras.new(name);dat.type="ORTHO";dat.ortho_scale=6.5
    ob=bpy.data.objects.new(name,dat);bpy.context.collection.objects.link(ob)
    ob.location=position
    ob.rotation_euler=(Vector(at)-ob.location).to_track_quat("-Z","Y").to_euler()
    return ob
render_cameras=[
  ("front",(0,-10,3.25),(0,0,2.2)),
  ("angle",(6,-9,4.7),(0,0,2.2)),
  ("underside",(0,-6.9,.85),(0,0,2.3)),
]
files=[]
for name,pos,at in render_cameras:
    scene.camera=camera("F6_Camera_"+name,pos,at)
    path=out/(name+".png")
    scene.render.filepath=str(path.resolve())
    bpy.ops.render.render(write_still=True)
    files.append(path)
# Full-resolution dedicated closeups are needed: entire-tree views hide
# the normal transfer/AO differences on individual leaves.
scene.render.resolution_x=720
scene.render.resolution_y=720
for idx,shift in enumerate(panels):
    name="ABC"[idx]+"_close"
    ca=camera("F6_Camera_"+name,(shift,-3.3,2.88),(shift,0,2.30))
    ca.data.ortho_scale=1.7
    scene.camera=ca
    path=out/(name+".png")
    scene.render.filepath=str(path.resolve())
    bpy.ops.render.render(write_still=True)
    files.append(path)
# A/B/C are a purely isolated comparison; output glTF test uses only
# the selected leaf geometry, never a promoted in-game tree asset.
bpy.ops.object.select_all(action="DESELECT")
for ob in made:ob.select_set(True)
bpy.context.view_layer.objects.active=made[0]
glb=out/"foliage_normal_test_NOT_APPROVED.glb"
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format="GLB",use_selection=True)
files.append(glb)
blend=out/"foliage_normal_test_NOT_APPROVED.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
files.append(blend)
manifest={
 "trial":"V27 foliage leaves, fixed 45% hemisphere normals, A baseline / B muted backface diffuse / C B+weak warm green emission",
 "intensity":[.45,.45,.45],
 "backface_modes":["baseline","muted_diffuse","muted_diffuse_plus_soft_green_backlight"],
 "state":"NOT_APPROVED",
 "source":"V27 verified Blender artifact from GitHub run 44447197961",
 "selected_source_leaves":len(selected),
 "panel_leaves":[len(selected)]*3,
 "panel_centers_world_x":[c.x for c in panel_centroids],
 "changed_corner_normals":changed,
 "ao_range":None,
 "blender_version":bpy.app.version_string,
 "files":[{"name":f.name,"bytes":f.stat().st_size,"sha256":hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]
}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("F6_BACKFACE_LIGHT_DONE",len(selected),changed,"backface baseline/muted/soft")

"""Render committed reference assets and isolated material swatches."""
import bpy, bmesh, os, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path("assets/3d/dungeons/b1_ancient_forest")
OUT=Path(os.environ.get("OUTPUT_DIR","render-output/design-reference"))
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s=bpy.context.scene
    s.render.engine="CYCLES"; s.cycles.samples=16
    s.render.resolution_x=512; s.render.resolution_y=512; s.render.resolution_percentage=100
    s.world=bpy.data.worlds.new("Review"); s.world.use_nodes=True
    s.world.node_tree.nodes["Background"].inputs[0].default_value=(.3,.3,.3,1)
    s.world.node_tree.nodes["Background"].inputs[1].default_value=.6
    return s
def render(s,center,radius,out,points):
    for direction,power in [((4,-4,6),900),((-4,-2,3),500)]:
        bpy.ops.object.light_add(type="AREA",location=center+Vector(direction)*radius)
        l=bpy.context.object; l.data.energy=power*radius**2; l.data.shape="DISK"; l.data.size=radius*3
        l.rotation_euler=(center-l.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(); c=bpy.context.object; s.camera=c
    c.data.type="ORTHO"; c.data.ortho_scale=radius*3
    for name,d in [("front",(0,-1,0)),("side",(1,0,0)),("top",(0,0,1)),("angle",(1,-1,.7))]:
        c.location=center+Vector(d).normalized()*radius*5
        c.rotation_euler=(center-c.location).to_track_quat("-Z","Y").to_euler()
        inv=c.rotation_euler.to_matrix().transposed()
        projected=[inv@(p-center) for p in points]
        x0,x1=min(p.x for p in projected),max(p.x for p in projected)
        y0,y1=min(p.y for p in projected),max(p.y for p in projected)
        c.location+=c.rotation_euler.to_matrix()@Vector(((x0+x1)/2,(y0+y1)/2,0))
        c.data.ortho_scale=max(x1-x0,y1-y0,.001)*1.18
        c.data.clip_end=max(100,radius*20)
        s.render.filepath=str(out/(name+".png")); bpy.ops.render.render(write_still=True)
def main():
    for path in ([Path(os.environ['REFERENCE_GLB'])] if os.environ.get('REFERENCE_GLB') else [ROOT/"props/blue_wisp_torch.glb",ROOT/"modules/mod_floor_stone_4m.glb"]):
        out=OUT/path.stem; out.mkdir(parents=True,exist_ok=True)
        s=setup(); bpy.ops.import_scene.gltf(filepath=str(path))
        meshes=[o for o in s.objects if o.type=="MESH"]
        points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
        if not points: raise ValueError("No mesh")
        lo=Vector([min(p[i] for p in points) for i in range(3)])
        hi=Vector([max(p[i] for p in points) for i in range(3)])
        render(s,(lo+hi)/2,max((hi-lo).length/2,.01),out,points)
        # Isolate each used material on original geometry, preserving its UVs.
        mats=sorted({m for o in meshes for m in o.data.materials if m},key=lambda m:m.name)
        rows=[]
        for i,mat in enumerate(mats):
            copies=[]
            for o in meshes:
                o.hide_render=True
                slots=[j for j,m in enumerate(o.data.materials) if m==mat]
                if not slots: continue
                clone=o.copy(); clone.data=o.data.copy(); s.collection.objects.link(clone)
                clone.matrix_world=o.matrix_world.copy(); clone.hide_render=False
                bm=bmesh.new(); bm.from_mesh(clone.data)
                bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index not in slots],context="FACES")
                bm.to_mesh(clone.data); bm.free()
                copies.append(clone)
            folder=out/f"material-{i:03d}"; folder.mkdir()
            s.render.filepath=str(folder/"angle.png"); bpy.ops.render.render(write_still=True)
            rows.append({"name":mat.name,"image":str(folder.relative_to(out)/"angle.png"),"mixed_material_meshes_retained":False})
            for clone in copies:
                data=clone.data; bpy.data.objects.remove(clone,do_unlink=True); bpy.data.meshes.remove(data)
        # Standardized UV sphere, camera and illumination for each material.
        for o in list(s.objects): o.hide_render=True
        for i,mat in enumerate(mats):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1)
            sphere=bpy.context.object; sphere.data.materials.append(mat)
            for f in sphere.data.polygons:f.use_smooth=True
            for d,power in [((4,-4,6),900),((-4,-2,3),500)]:
                bpy.ops.object.light_add(type="AREA",location=d)
                light=bpy.context.object;light.data.energy=power;light.data.size=3
                light.rotation_euler=(-light.location).to_track_quat("-Z","Y").to_euler()
            bpy.ops.object.camera_add(location=(3,-5,3))
            cam=bpy.context.object;cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler()
            cam.data.type="ORTHO";cam.data.ortho_scale=2.5;s.camera=cam
            file=out/f"material-{i:03d}"/"standard-sphere.png"
            s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
            rows[i]["standard_sphere"]=str(file.relative_to(out))
            for o in s.objects:o.hide_render=True
        (out/"render-report.json").write_text(json.dumps({"source_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"blender":bpy.app.version_string,"materials":rows,"status":"NOT_APPROVED"},indent=2))
main()

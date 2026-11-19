"""Audit Blender boulder materials, image paths, nodes and available CC0 PBR maps."""
import bpy,json,sys,pathlib
from mathutils import Vector
src=pathlib.Path(sys.argv[sys.argv.index('--')+1]);downloads=pathlib.Path(sys.argv[sys.argv.index('--')+2]);out=pathlib.Path(sys.argv[sys.argv.index('--')+3]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src))
data={"source":src.name,"status":"NOT_APPROVED","objects":[],"materials":[],"available_maps":[]}
for obj in bpy.data.objects:
    if obj.type=="MESH":data["objects"].append({"name":obj.name,"vertices":len(obj.data.vertices),"polygons":len(obj.data.polygons),"uv_layers":[u.name for u in obj.data.uv_layers],"materials":[slot.material.name if slot.material else None for slot in obj.material_slots]})
for mat in bpy.data.materials:
    info={"name":mat.name,"diffuse_color":list(mat.diffuse_color),"nodes":[]}
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            d={"name":node.name,"type":node.type}
            if node.type=="TEX_IMAGE":
                im=node.image
                d["image"]=im.name if im else None
                if im:
                    p=pathlib.Path(bpy.path.abspath(im.filepath))
                    d.update(path=im.filepath,resolved_path=str(p),exists=p.is_file(),packed=bool(im.packed_file),source=im.source,colorspace=im.colorspace_settings.name)
            if node.type=="BSDF_PRINCIPLED":
                for key in ("Base Color","Roughness","Metallic"):
                    socket=node.inputs.get(key)
                    if socket:d[key]={"value":list(socket.default_value) if hasattr(socket.default_value,'__len__') else socket.default_value,"linked":socket.is_linked}
            info["nodes"].append(d)
        info["links"]=[{"from":l.from_node.name+"."+l.from_socket.name,"to":l.to_node.name+"."+l.to_socket.name} for l in mat.node_tree.links]
    data["materials"].append(info)
for p in sorted(downloads.iterdir()):
    if p.suffix.lower() in (".jpg",".png",".exr"):
        data["available_maps"].append({"name":p.name,"bytes":p.stat().st_size})
(out/"texture_audit.json").write_text(json.dumps(data,indent=2,ensure_ascii=False))
print("TEXTURE_AUDIT",json.dumps(data,ensure_ascii=False))

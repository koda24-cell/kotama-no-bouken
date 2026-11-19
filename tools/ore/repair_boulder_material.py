"""Reconnect the original Poly Haven boulder shader to downloaded matching CC0 PBR maps.
Does not change mesh, UVs or geometry. Review use only.
"""
import bpy,sys,pathlib,json
src=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
root=pathlib.Path(sys.argv[sys.argv.index('--')+2]).resolve()
out=pathlib.Path(sys.argv[sys.argv.index('--')+3]).resolve()
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src))
mat=bpy.data.materials.get("boulder_01")
assert mat and mat.use_nodes,"original boulder material missing"
nodes=mat.node_tree.nodes
mapping={"Image Texture":("boulder_01_diff.jpg","sRGB"),"Image Texture.001":("boulder_01_rough.jpg","Non-Color"),"Image Texture.002":("boulder_01_nor.jpg","Non-Color")}
report={"status":"NOT_APPROVED","source":src.name,"reconnected":[]}
for node_name,(filename,space) in mapping.items():
    node=nodes.get(node_name)
    assert node and node.type=="TEX_IMAGE",node_name
    path=root/filename
    assert path.is_file() and path.stat().st_size>1000,str(path)
    image=bpy.data.images.load(str(path),check_existing=True)
    image.colorspace_settings.name=space
    image.pack()
    node.image=image
    report["reconnected"].append({"node":node_name,"file":filename,"bytes":path.stat().st_size,"packed":True})
assert len(report["reconnected"])==3
for node_name in mapping:
    assert nodes[node_name].image.packed_file is not None, 'texture not packed: '+node_name
report['original_meshes']=[{'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons)} for o in bpy.data.objects if o.type=='MESH']
report['shader_links']=[l.from_node.name+' -> '+l.to_node.name for l in mat.node_tree.links]
bpy.ops.wm.save_as_mainfile(filepath=str(out))
(out.parent/"material_repair_report.json").write_text(json.dumps(report,indent=2))
print("MATERIAL_REPAIR",json.dumps(report))

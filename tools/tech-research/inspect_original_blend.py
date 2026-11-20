"""Read-only third-party Blend inspector. Use Blender 5.3 --disable-autoexec."""
import bpy, json, os
from pathlib import Path
assert bpy.app.version[:2] == (5, 3), bpy.app.version_string
assert not bpy.context.preferences.filepaths.use_scripts_auto_execute
out=Path(os.environ.get("AUDIT_OUTPUT_DIR","/tmp/lassyla_audit"));out.mkdir(parents=True,exist_ok=True)
def val(s):
 try:
  v=s.default_value
  return list(v) if hasattr(v,"__iter__") and not isinstance(v,str) else v
 except (AttributeError,TypeError):return None
def tree(t):
 if not t:return None
 return {"name":t.name,"nodes":[{"name":n.name,"type":n.bl_idname,"inputs":{i.name:val(i) for i in n.inputs if not i.is_linked}} for n in t.nodes],"links":[{"from":l.from_node.name,"from_socket":l.from_socket.name,"to":l.to_node.name,"to_socket":l.to_socket.name} for l in t.links]}
report={"blender_version":bpy.app.version_string,"source_filename":Path(bpy.data.filepath).name,"render_engine":bpy.context.scene.render.engine,"scenes":[s.name for s in bpy.data.scenes],"objects":[{"name":o.name,"type":o.type,"dimensions":list(o.dimensions)} for o in bpy.data.objects],"materials":[{"name":m.name,"node_tree":tree(m.node_tree) if m.use_nodes else None} for m in bpy.data.materials],"node_groups":[tree(g) for g in bpy.data.node_groups],"text_blocks":[t.name for t in bpy.data.texts],"drivers":[{"owner":o.name,"data_path":fc.data_path,"expression":fc.driver.expression} for o in bpy.data.objects if o.animation_data for fc in o.animation_data.drivers],"external_libraries":[lib.filepath for lib in bpy.data.libraries],"external_images":[{"name":i.name,"filepath":i.filepath,"packed":bool(i.packed_file)} for i in bpy.data.images]}
(out/"inspection.json").write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str),encoding="utf-8")
print("ORIGINAL_BLEND_INSPECTED_NO_AUTOEXEC")

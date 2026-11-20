"""Render an already ClamAV-cleared, user-supplied Blend with auto-execution disabled.
Never run this on unscanned sources. Keep author Blend out of Git.
"""
import bpy, os, json
from pathlib import Path
assert bpy.app.version[:2] == (5, 3), bpy.app.version_string
assert not bpy.context.preferences.filepaths.use_scripts_auto_execute
output = Path(os.environ["AUDIT_OUTPUT_DIR"])
output.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
engine_values = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
eevee = next((e for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT") if e in engine_values), None)
if eevee is None:
    raise RuntimeError(f"No Eevee engine available: {sorted(engine_values)}")
scene.render.engine = eevee
scene.render.resolution_percentage = 75
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(output / "original_scene_eevee.png")
if scene.camera is None:
    raise RuntimeError("No author camera: refusing to invent an original view")
bpy.ops.render.render(write_still=True)
p=output/"original_scene_eevee.png"
if not p.is_file() or p.stat().st_size < 1000:
    raise RuntimeError("No usable rendered image")
(output/"render_manifest.json").write_text(json.dumps({
    "source": Path(bpy.data.filepath).name,
    "engine": scene.render.engine,
    "blender": bpy.app.version_string,
    "image": p.name,
    "status": "UNREVIEWED_NOT_APPROVED",
},indent=2),encoding="utf-8")
print("ORIGINAL_EEVEE_RENDERED_NOT_APPROVED")

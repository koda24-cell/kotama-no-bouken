"""Generate a separate candidate; never overwrite the source or alter mesh topology."""
import bpy
import os
from pathlib import Path
source=Path(os.environ["RESUME_BLEND"]).resolve(strict=True)
target=Path(os.environ["CANDIDATE_BLEND"]).resolve()
if source==target or target.exists() or target.suffix!=".blend":
    raise RuntimeError("candidate must be a new blend file")
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
mode=os.environ["CANDIDATE_MODE"]
if mode not in ("weighted_normals","roughness_adjust"):
    raise RuntimeError("unsupported candidate")
names=[n for n in os.environ["CANDIDATE_OBJECTS"].split(",") if n]
if not names:
    raise RuntimeError("explicit object selection required")
for name in names:
    obj=bpy.context.scene.objects.get(name)
    if obj is None or obj.type!="MESH":
        raise RuntimeError("invalid mesh selection")
    if mode=="weighted_normals":
        if not any(m.type=="WEIGHTED_NORMAL" for m in obj.modifiers):
            m=obj.modifiers.new("QA candidate weighted normals","WEIGHTED_NORMAL")
            m.keep_sharp=True
    else:
        for slot in obj.material_slots:
            if not slot.material or not slot.material.use_nodes:
                continue
            slot.material=slot.material.copy()
            for node in slot.material.node_tree.nodes:
                if node.type=="BSDF_PRINCIPLED" and not node.inputs["Roughness"].is_linked:
                    v=node.inputs["Roughness"].default_value
                    node.inputs["Roughness"].default_value=min(1,max(0,v+0.05))
target.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(target))

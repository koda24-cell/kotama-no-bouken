#!/usr/bin/env python3
"""GLB-only structural/render-cost audit. No third-party dependencies; no runtime FPS claim."""
import argparse
import glob
import json
from pathlib import Path
import struct
import sys

TRIANGLES = 4
STRIP = 5
FAN = 6

def parse_glb(path):
    with Path(path).open("rb") as f:
        head = f.read(12)
        if len(head) != 12:
            raise ValueError("truncated GLB header")
        magic, version, length = struct.unpack("<4sII", head)
        if magic != b"glTF" or version != 2:
            raise ValueError("invalid glTF 2.0 binary header")
        if length != Path(path).stat().st_size:
            raise ValueError("GLB declared size mismatch")
        chunk = f.read(8)
        if len(chunk) != 8:
            raise ValueError("missing GLB JSON chunk")
        size, kind = struct.unpack("<I4s", chunk)
        if kind != b"JSON" or size > length - 20:
            raise ValueError("invalid GLB JSON chunk")
        js = json.loads(f.read(size).decode("utf-8"))
        if not isinstance(js, dict) or js.get("asset", {}).get("version") != "2.0":
            raise ValueError("invalid glTF JSON document")
        return js

def primitive_triangles(p, accessors):
    index = p.get("indices")
    if index is not None:
        count = accessors[index].get("count", 0)
    else:
        attrs = p.get("attributes", {})
        if "POSITION" not in attrs:
            return 0
        count = accessors[attrs["POSITION"]].get("count", 0)
    mode = p.get("mode", TRIANGLES)
    if mode == TRIANGLES:
        return count // 3
    if mode in (STRIP, FAN):
        return max(0, count - 2)
    return 0

def audit(path):
    path = Path(path)
    js = parse_glb(path)
    meshes = js.get("meshes", [])
    nodes = js.get("nodes", [])
    accessors = js.get("accessors", [])
    materials = js.get("materials", [])
    material_modes = {"OPAQUE": 0, "MASK": 0, "BLEND": 0}
    for m in materials:
        alpha = m.get("alphaMode", "OPAQUE")
        material_modes[alpha] = material_modes.get(alpha, 0) + 1
    mesh_triangles = []
    primitive_counts = []
    for mesh in meshes:
        ps = mesh.get("primitives", [])
        primitive_counts.append(len(ps))
        mesh_triangles.append(sum(primitive_triangles(p, accessors) for p in ps))
    # Count only nodes in the default scene; unreachable source nodes are not drawn.
    scenes = js.get("scenes", [])
    root_ids = scenes[js.get("scene", 0)].get("nodes", []) if scenes else list(range(len(nodes)))
    visited = set()
    reachable = []
    def walk(i):
        if i in visited:
            return
        visited.add(i)
        node = nodes[i]
        reachable.append(node)
        for child in node.get("children", []):
            walk(child)
    for node_id in root_ids:
        walk(node_id)
    instance_meshes = [n["mesh"] for n in reachable if "mesh" in n]
    visible_triangles = sum(mesh_triangles[i] for i in instance_meshes)
    estimated_draws = sum(primitive_counts[i] for i in instance_meshes)
    # Conservative upper estimate: each primitive may take one draw.
    # Skinning, Instancing, material passes and renderer state can change actual calls.
    return {
        "path": path.as_posix(),
        "file_bytes": path.stat().st_size,
        "glb_meshes": len(meshes),
        "total_mesh_primitives": sum(primitive_counts),
        "scene_nodes": len(reachable),
        "scene_mesh_nodes": len(instance_meshes),
        "scene_primitive_instances": estimated_draws,
        "estimated_scene_triangles": visible_triangles,
        "materials": len(materials),
        "material_names": [m.get("name", "") for m in materials],
        "mesh_names": [m.get("name", "") for m in meshes],
        "skins": len(js.get("skins", [])),
        "animations": len(js.get("animations", [])),
        "morph_target_meshes": sum(any("targets" in p for p in mesh.get("primitives", [])) for mesh in meshes),
        "alpha_materials": material_modes,
        "images": len(js.get("images", [])),
        "textures": len(js.get("textures", [])),
        "limitations": "Scene primitive instances are a structural proxy, NOT measured draw calls or FPS. GLTFLoader may merge/reorder resources; frustum culling, instancing and postprocessing affect runtime."
    }

def main(argv=None):
    p = argparse.ArgumentParser(description="Audit binary glTF models without modifying them")
    p.add_argument("patterns", nargs="+", help="Explicit .glb paths or glob patterns")
    p.add_argument("--output", default="render-output/3d-performance/glb-audit.json")
    p.add_argument("--max-scene-primitive-instances", type=int, default=None)
    args = p.parse_args(argv)
    files = sorted({Path(x) for pattern in args.patterns for x in glob.glob(pattern, recursive=True) if x.endswith(".glb") and Path(x).is_file()})
    if not files:
        p.error("no matching .glb files (use repository-relative glob)")
    results = []
    errors = []
    for f in files:
        try:
            results.append(audit(f))
        except Exception as exc:
            errors.append({"path": f.as_posix(), "error": str(exc)})
    report = {"schema": "kotama-glb-audit-v1", "models": results, "errors": errors, "source_only": True}
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for result in results:
        print(f"{result['path']}: mesh_nodes={result['scene_mesh_nodes']} estimated_primitive_instances={result['scene_primitive_instances']} triangles={result['estimated_scene_triangles']} alpha={result['alpha_materials']}")
    if errors:
        for error in errors:
            print("AUDIT_ERROR", error, file=sys.stderr)
        return 1
    if args.max_scene_primitive_instances is not None:
        over = [x for x in results if x["scene_primitive_instances"] > args.max_scene_primitive_instances]
        if over:
            print("AUDIT_BUDGET_FAIL", [x["path"] for x in over], file=sys.stderr)
            return 2
    print("GLB_AUDIT_PASS", len(results))
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Local GLB audit tests using synthetic GLB data, no Blender required."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

file = Path(__file__).with_name("audit_glb.py")
spec = importlib.util.spec_from_file_location("glb_audit", file)
audit_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit_mod)

def write_glb(path, document):
    body = json.dumps(document, separators=(",", ":")).encode("utf-8")
    body += b" " * ((-len(body)) % 4)
    path.write_bytes(struct.pack("<4sII", b"glTF", 2, 20 + len(body)) + struct.pack("<I4s", len(body), b"JSON") + body)

class GLBAuditTests(unittest.TestCase):
    def test_reachable_and_instanced_primitives(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "tiny.glb"
            write_glb(path, {
                "asset": {"version": "2.0"}, "scene": 0,
                "scenes": [{"nodes": [0, 1]}],
                "nodes": [{"mesh": 0, "children": [2]}, {"mesh": 0}, {"mesh": 1}, {"mesh": 1}],
                "meshes": [
                    {"primitives": [{"attributes": {"POSITION": 0}, "material": 0}]},
                    {"primitives": [{"indices": 1, "mode": 5, "material": 1}]}
                ],
                "accessors": [{"count": 9}, {"count": 5}],
                "materials": [{"alphaMode": "MASK"}, {"alphaMode": "OPAQUE"}],
            })
            result = audit_mod.audit(path)
            self.assertEqual(result["glb_meshes"], 2)
            self.assertEqual(result["scene_mesh_nodes"], 3)
            self.assertEqual(result["scene_primitive_instances"], 3)
            self.assertEqual(result["estimated_scene_triangles"], 9)
            self.assertEqual(result["alpha_materials"]["MASK"], 1)

    def test_bad_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.glb"
            path.write_bytes(b"not a GLB")
            with self.assertRaises(ValueError):
                audit_mod.audit(path)

    def test_declared_length_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.glb"
            write_glb(path, {"asset": {"version": "2.0"}})
            path.write_bytes(path.read_bytes() + b"X")
            with self.assertRaises(ValueError):
                audit_mod.audit(path)

if __name__ == "__main__":
    unittest.main()

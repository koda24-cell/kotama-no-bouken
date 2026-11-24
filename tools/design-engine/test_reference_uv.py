import json
import struct
import tempfile
import unittest
from pathlib import Path

from reference_uv import draw_uv, read_glb, read_uv_accessor, read_indices


def make_glb():
    uv = struct.pack("<6f", 0.0, 0.0, 1.0, 0.0, 0.5, 1.0)
    doc = {
        "asset": {"version": "2.0"},
        "buffers": [{"byteLength": len(uv)}],
        "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(uv)}],
        "accessors": [{"bufferView": 0, "componentType": 5126, "count": 3, "type": "VEC2"}],
        "meshes": [{"primitives": [{"attributes": {"TEXCOORD_0": 0}}]}]
    }
    j = json.dumps(doc).encode()
    j += b" " * (-len(j) % 4)
    uv += b"\0" * (-len(uv) % 4)
    body = struct.pack("<I4s", len(j), b"JSON") + j + struct.pack("<I4s", len(uv), b"BIN\0") + uv
    return struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body


class UVReviewTest(unittest.TestCase):
    def test_read_accessor(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "mesh.glb"
            p.write_bytes(make_glb())
            _, doc, binary = read_glb(p)
            values = read_uv_accessor(doc, binary, 0)
            self.assertEqual(values, [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)])

    def test_generate_uv_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "mesh.glb"
            p.write_bytes(make_glb())
            report = draw_uv(p, Path(tmp) / "out", 256)
            self.assertEqual(report["primitives"][0]["status"], "GENERATED")
            self.assertEqual(report["primitives"][0]["triangles"], 1)
            self.assertTrue((Path(tmp) / "out" / "mesh-000-primitive-000.png").is_file())

    def test_read_index_accessor(self):
        doc = {
            "accessors": [{"bufferView": 0, "componentType": 5123, "count": 3, "type": "SCALAR"}],
            "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": 6}]
        }
        binary = struct.pack("<3H", 0, 2, 1)
        self.assertEqual(read_indices(doc, binary, 0), [0, 2, 1])

    def test_reject_truncated_glb(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "bad.glb"
            p.write_bytes(b"glTF")
            with self.assertRaises(ValueError):
                read_glb(p)


if __name__ == "__main__":
    unittest.main()

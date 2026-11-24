import json
import struct
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from reference_uv import draw_uv, read_glb, read_uv_accessor, read_indices, analyze_uv_overlaps, triangle_intersection_area, material_texture_bindings


def make_glb(coords=((0.0, 0.0), (1.0, 0.0), (0.5, 1.0))):
    uv = struct.pack("<6f", *(value for pair in coords for value in pair))
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
            self.assertTrue((Path(tmp) / "out" / "mesh-000-primitive-000-overlap.png").is_file())

    def test_out_of_tile_uvs_are_visible(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "mesh.glb"
            p.write_bytes(make_glb(((-0.7, -2.1), (4.0, -2.8), (2.0, 1.2))))
            out = Path(tmp) / "out"
            report = draw_uv(p, out, 256)
            bounds = report["primitives"][0]["uv_bounds"]
            self.assertAlmostEqual(bounds[0][0], -0.7, places=5)
            self.assertAlmostEqual(bounds[1][0], 4.0, places=5)
            image = Image.open(out / "mesh-000-primitive-000.png").convert("RGB")
            blue_pixels = sum(1 for pixel in image.getdata() if pixel == (196, 219, 245))
            self.assertGreater(blue_pixels, 100)


    def test_detect_positive_area_uv_overlap(self):
        uv = [(0, 0), (1, 0), (0, 1), (0.2, 0.2), (1.2, 0.2), (0.2, 1.2)]
        result = analyze_uv_overlaps(uv, [0, 1, 2, 3, 4, 5])
        self.assertEqual(result["status"], "OVERLAP_FOUND")
        self.assertEqual(result["overlap_pair_count"], 1)
        self.assertAlmostEqual(result["total_pairwise_intersection_area"], 0.18, places=6)

    def test_shared_edge_is_not_overlap(self):
        left = [(0, 0), (1, 0), (0, 1)]
        right = [(1, 0), (1, 1), (0, 1)]
        self.assertAlmostEqual(triangle_intersection_area(left, right), 0.0, places=8)

    def test_uv_report_contains_overlap_review(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "mesh.glb"
            p.write_bytes(make_glb())
            report = draw_uv(p, Path(tmp) / "out", 256)
            self.assertIn("uv_overlap", report["primitives"][0])
            self.assertEqual(report["primitives"][0]["uv_overlap"]["status"],
                             "NO_POSITIVE_AREA_OVERLAP")


    def test_resolve_material_texture_binding(self):
        doc = {
            "materials": [{"name": "stone", "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0, "texCoord": 1}
            }}],
            "textures": [{"source": 2, "sampler": 1}]
        }
        result = material_texture_bindings(doc, {"material": 0})
        self.assertEqual(result["material_name"], "stone")
        self.assertEqual(result["texture_bindings"]["baseColorTexture"]["image_index"], 2)
        self.assertEqual(result["texture_bindings"]["baseColorTexture"]["tex_coord_set"], 1)

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

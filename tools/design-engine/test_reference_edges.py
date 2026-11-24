import unittest,tempfile
from pathlib import Path
import trimesh
from reference_edges import analyze_edges
class EdgesTest(unittest.TestCase):
    def test_cube(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/"cube.glb"
            p.write_bytes(trimesh.Scene(trimesh.creation.box()).export(file_type="glb"))
            a=analyze_edges(p)["parts"][0]
            self.assertAlmostEqual(a["sharp_edge_length_mm"],12000)
            self.assertAlmostEqual(a["convex_sharp_length_mm"],12000)
            self.assertAlmostEqual(a["concave_sharp_length_mm"],0)

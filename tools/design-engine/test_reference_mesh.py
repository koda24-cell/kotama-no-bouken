import unittest,tempfile
from pathlib import Path
import trimesh
from reference_mesh import analyze
class ReferenceTest(unittest.TestCase):
    def test_glb(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/"fixture.glb"
            scene=trimesh.Scene()
            scene.add_geometry(trimesh.creation.box(extents=[1,2,3]),node_name="box",transform=trimesh.transformations.translation_matrix([4,5,6]))
            p.write_bytes(scene.export(file_type="glb"))
            result=analyze(p)
            self.assertEqual(result["dimensions_mm"],[1000,3000,2000])
            self.assertEqual(result["bounds_mm"][0],[3500,-7500,4000])
            self.assertEqual(len(result["sections"]),5)
            self.assertTrue(all(s["segments_mm"] for s in result["sections"]))

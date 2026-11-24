import unittest,tempfile
from pathlib import Path
import trimesh
from reference_views import views
class ViewsTest(unittest.TestCase):
    def test_views(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t); f=p/"box.glb"
            f.write_bytes(trimesh.Scene(trimesh.creation.box(extents=[1,2,3])).export(file_type="glb"))
            result=views(f,p/"out")
            v=result["views"]
            self.assertEqual(len(v),5)
            self.assertEqual(v["front"]["area_px"],v["back"]["area_px"])
            self.assertGreater(v["left"]["area_px"],v["front"]["area_px"])
            self.assertTrue(all((p/"out"/(n+".png")).is_file() for n in v))

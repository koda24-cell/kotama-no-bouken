import unittest,tempfile,json
from pathlib import Path
from PIL import Image
import trimesh
from reference_mesh import analyze
from reference_report import report
class ReportTest(unittest.TestCase):
    def test_report(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t); src=p/"box.glb"
            src.write_bytes(trimesh.Scene(trimesh.creation.box()).export(file_type="glb"))
            data=report(analyze(src),p/"report")
            self.assertEqual(data["part_ratios"][0]["dimension_ratios"],[1,1,1])
            with Image.open(p/"report/sections.png") as im: self.assertEqual(im.size,(1080,760))
            self.assertEqual(len(json.loads((p/"report/manifest.json").read_text())["files"]),2)

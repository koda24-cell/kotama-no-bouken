import unittest,tempfile
from pathlib import Path
from PIL import Image
from visual_qa import compare
class VisualTest(unittest.TestCase):
    def test_masks(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)
            for name,data in [("a",[255,255,0,0]),("b",[0,255,255,0])]:
                im=Image.new("L",(2,2)); im.putdata(data); im.save(p/(name+".png"))
            result=compare(p/"a.png",p/"b.png",p/"out")
            self.assertAlmostEqual(result["iou"],1/3)
            self.assertEqual(result["missing_pixels"],1)
            self.assertEqual(result["excess_pixels"],1)
            self.assertEqual(result["status"],"REVIEW_ONLY")
            same=compare(p/"a.png",p/"a.png",p/"same")
            self.assertEqual(same["iou"],1)

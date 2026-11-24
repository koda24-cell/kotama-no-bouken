import unittest,tempfile
from pathlib import Path
from PIL import Image
from appearance import plan,save
class AppearanceTest(unittest.TestCase):
    def test_plan(self):
        s={"seed":42,"materials":{"bronze":{"base_color":[150,90,40],"roughness":.4,"metallic":.8,"alpha":1}},"ornaments":[{"part":"stud","material":"bronze","count":4,"radius_mm":50,"z_mm":20}]}
        a=plan(s)
        self.assertEqual(a,plan(s))
        self.assertEqual(len(a["instances"]),4)
        self.assertEqual(a["instances"][0]["position_mm"],[50,0,20])
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/"out"; save(s,p)
            with Image.open(p/"material-plan.png") as im:
                self.assertEqual(im.getpixel((20,20)),(150,90,40))
        s["materials"]["bronze"]["roughness"]=2
        with self.assertRaises(ValueError): plan(s)

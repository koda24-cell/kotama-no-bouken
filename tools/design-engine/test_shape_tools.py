import unittest,tempfile
from pathlib import Path
from PIL import Image
from shape_tools import cubic,profile
class ShapeTest(unittest.TestCase):
    def test_curve(self):
        p=[(0,0,0),(0,2,0),(2,2,0),(2,0,0)]
        self.assertEqual(cubic(p,2),[(0,0,0),(1,1.5,0),(2,0,0)])
    def test_profile(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/"mask.png"
            im=Image.new("L",(8,8)); im.paste(255,(2,1,6,3)); im.save(p)
            q=profile(p)
            self.assertEqual(q["bounds"],(2,1,6,3))
            self.assertEqual(q["aspect"],2)
            self.assertEqual(q["rows"][0]["span"],4)

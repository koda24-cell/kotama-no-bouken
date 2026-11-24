import unittest
from loft import loft
class LoftTest(unittest.TestCase):
    def test_sections(self):
        s=[dict(z=0,cx=0,cy=0,rx=2,ry=1),dict(z=10,cx=1,cy=0,rx=4,ry=2)]
        m=loft(s,8,2)
        self.assertEqual(len(m["vertices"]),24)
        self.assertEqual(len(m["faces"]),18)
        self.assertEqual(m["vertices"][0],(2,0,0))
        self.assertEqual(m["vertices"][8],(3.5,0,5))
        self.assertEqual(m["vertices"][16],(5,0,10))
        self.assertTrue(all(0<=i<24 for f in m["faces"] for i in f))
        with self.assertRaises(ValueError): loft(s[::-1])

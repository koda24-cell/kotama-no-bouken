import unittest
from freeform import freeform
class FreeformTest(unittest.TestCase):
    def test_shape(self):
        a={"z":0,"xy":[(0,0),(4,0),(3,2),(0,1)]}
        b={"z":8,"xy":[(1,0),(6,0),(3,4),(0,2)]}
        m=freeform([a,b],4)
        self.assertEqual(len(m["vertices"]),20)
        self.assertEqual(len(m["faces"]),16)
        self.assertEqual(m["vertices"][4],(.15625,0,2))
        self.assertEqual(m["vertices"][16],(1,0,8))
        with self.assertRaises(ValueError): freeform([b,a])
        with self.assertRaises(ValueError): freeform([a,{"z":8,"xy":[(0,0),(1,0),(0,1)]}])

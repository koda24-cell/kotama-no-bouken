import unittest
from production_tiles import plan_tiles
class TileTests(unittest.TestCase):
    def test_coverage(self):
        for c,r in ((2,1),(2,2),(4,2),(4,4)):
            tiles=plan_tiles(101,77,c,r,["front"])
            pixels=[(x,y) for t in tiles for x in range(t["bounds"][0],t["bounds"][2]) for y in range(t["bounds"][1],t["bounds"][3])]
            self.assertEqual(len(pixels),101*77)
            self.assertEqual(len(set(pixels)),101*77)
    def test_identity(self):
        t=plan_tiles(1000,760,4,4,["front","back","side","angle"],[1,2])
        self.assertEqual(len(t),128)
        self.assertEqual(len({x["id"] for x in t}),128)
    def test_invalid(self):
        for args in ((1,1,2,1,["front"]),(100,100,5,5,["front"]),(100,100,2,2,["unknown"])):
            with self.assertRaises(ValueError): plan_tiles(*args)

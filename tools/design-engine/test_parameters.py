import unittest
from parameters import resolve_design
class ParameterTest(unittest.TestCase):
    def spec(self):
        return {"units":"mm","revision":"V02","parameters":{"width":1200,"post":120,"span":"width-2*post"},"bounds":[{"parameter":"span","min":1,"max":3000}],"parts":[{"id":"beam","origin":["post",0,400],"size":["span","post",160]}]}
    def test_resize(self):
        s=self.spec()
        self.assertEqual(resolve_design(s)["parts"][0]["size"][0],960)
        s["parameters"]["width"]=1500
        self.assertEqual(resolve_design(s)["parts"][0]["size"][0],1260)
    def test_cycle(self):
        s=self.spec(); s["parameters"]["width"]="span"
        with self.assertRaises(ValueError): resolve_design(s)
    def test_unsafe(self):
        s=self.spec(); s["parameters"]["width"]="abs(1200)"
        with self.assertRaises(ValueError): resolve_design(s)
    def test_bounds(self):
        s=self.spec(); s["parameters"]["width"]=200
        with self.assertRaises(ValueError): resolve_design(s)

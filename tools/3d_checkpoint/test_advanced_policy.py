import unittest,tempfile
from pathlib import Path
from advanced_material_policy import classify,plan,compare_geometry,review
from advanced_recovery import recovery
from advanced_session import run
class Tests(unittest.TestCase):
    def test_material(self):
        for name,kind in [("granite","stone"),("iron","metal"),("oak","wood"),("unknown","unknown")]:
            self.assertEqual(classify(name)[0],kind)
        self.assertFalse(plan("stone",{"silhouette":.5})["actions"])
        self.assertTrue(plan("wood",{})["actions"])
    def test_reference(self):
        a=dict(aspect_x=1,aspect_y=1,aspect_z=1,surface_density=2)
        self.assertEqual(min(compare_geometry(a,a).values()),1)
        self.assertEqual(review({"front":{"score":1,"technical_pass":True}},compare_geometry(a,a))["approval"],"NOT_APPROVED")
    def test_recovery(self):
        self.assertEqual(recovery("CUDA error: out of memory",0)["device"],"CPU")
        self.assertIsNone(recovery("unknown",0))
        self.assertIsNone(recovery("CUDA error",3))
    def test_session(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);src=p/"source";ref=p/"reference";src.write_text("s");ref.write_text("r")
            calls=[]
            def worker(step,settings,deadline):
                calls.append(step)
                if not settings:return {"ok":False,"error":"CUDA error"}
                f=p/step;f.write_text(step);return {"ok":True,"scan_pass":True,"files":[f]}
            self.assertEqual(run(p/"state",src,ref,["a","b"],worker),"COMPLETE")
            self.assertEqual(len(calls),4)
            self.assertEqual(run(p/"state",src,ref,["a","b"],worker),"COMPLETE")
            self.assertEqual(len(calls),4)
            (p/"a").write_text("corrupt")
            with self.assertRaises(ValueError):run(p/"state",src,ref,["a","b"],worker)
if __name__=="__main__":unittest.main()

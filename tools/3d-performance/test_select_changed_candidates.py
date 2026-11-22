import importlib.util
import unittest
from pathlib import Path
p=Path(__file__).with_name("select_changed_candidates.py")
spec=importlib.util.spec_from_file_location("select_changed_candidates",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CandidateTests(unittest.TestCase):
    def test_safe_changed_only(self):
        plan={"assets":[
            {"path":"assets/models/floor4/basalt.glb","rigid_candidate":True},
            {"path":"assets/models/floor4/lava.glb","rigid_candidate":False},
            {"path":"assets/models/floor2/stone.glb","rigid_candidate":True}
        ]}
        result=m.select(plan,["assets/models/floor4/basalt.glb","assets/models/floor4/lava.glb"],
                        lambda p:True)
        self.assertEqual(result,{"include":[{"source_glb":"assets/models/floor4/basalt.glb"}]})
    def test_missing_or_unapproved_uncommitted_is_skipped(self):
        p={"assets":[{"path":"assets/models/floor6/tree.glb","rigid_candidate":True}]}
        self.assertEqual(m.select(p,["assets/models/floor6/tree.glb"],lambda x:False),{"include":[]})
if __name__=="__main__":unittest.main()

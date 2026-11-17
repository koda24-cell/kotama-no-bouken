import importlib.util
import unittest
from pathlib import Path

p=Path(__file__).with_name("plan_all_floors.py")
spec=importlib.util.spec_from_file_location("plan_all_floors",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class PlanTests(unittest.TestCase):
    def test_floor_detection(self):
        self.assertEqual(m.floor_for_path("assets/3d/dungeons/b2_water_source/pillar.glb"),"floor2")
        self.assertEqual(m.floor_for_path("assets/models/floor6/nature/rock.glb"),"floor6")
        self.assertEqual(m.floor_for_path("assets/3d/dungeons/b1_ancient_forest/p.glb"),"floor1")
        self.assertEqual(m.floor_for_path("assets/3d/other/foo.glb"),"shared_or_unclassified")
    def test_safety_refuses_transparency_and_vfx(self):
        base={"estimated_scene_triangles":50000,"scene_primitive_instances":200}
        def result(path,alpha):
            return m.classify({**base,"path":path,"alpha_materials":alpha})
        self.assertFalse(result("assets/models/floor6/leaf.glb",{"MASK":1})["rigid_candidate"])
        self.assertFalse(result("assets/models/floor4/magma.glb",{})["rigid_candidate"])
        self.assertFalse(result("assets/models/floor1/npc_knight.glb",{})["rigid_candidate"])
        self.assertTrue(result("assets/models/floor3/stone_wall.glb",{})["rigid_candidate"])
    def test_all_floor_report_counts(self):
        d={"models":[
            {"path":"assets/3d/dungeons/b1_ancient_forest/rock.glb","estimated_scene_triangles":100,"scene_primitive_instances":2,"alpha_materials":{}},
            {"path":"assets/models/floor5/stone.glb","estimated_scene_triangles":200,"scene_primitive_instances":3,"alpha_materials":{}}
        ],"errors":[]}
        p=m.produce(d)
        self.assertEqual(p["floors"]["floor1"]["models"],1)
        self.assertEqual(p["floors"]["floor5"]["triangles"],200)
        self.assertFalse(p["approved_for_game_integration"])

if __name__=="__main__":unittest.main()

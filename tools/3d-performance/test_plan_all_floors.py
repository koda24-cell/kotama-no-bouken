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
    def test_opaque_tree_must_not_be_decimated(self):
        example={"path":"assets/models/floor6/nature/tree_mature.glb",
                 "estimated_scene_triangles":42000,
                 "scene_primitive_instances":9000,
                 "alpha_materials":{"OPAQUE":5},
                 "material_names":["leaf_mid","aged_bark"],
                 "skins":0,"animations":0}
        self.assertEqual(m.classify(example)["mode"],"foliage_or_transparency_review")
        self.assertFalse(m.classify(example)["rigid_candidate"])
    def test_vegetation_inside_rock_named_as_material(self):
        item={"path":"assets/models/floor3/ruined_pillar.glb","estimated_scene_triangles":5200,
              "scene_primitive_instances":3,"material_names":["grey_stone","moss_tufts"]}
        self.assertFalse(m.classify(item)["rigid_candidate"])
    def test_rigging_and_animation_rejected(self):
        for key in ("skins","animations","morph_target_meshes"):
            entry={"path":"assets/models/floor5/statue.glb","estimated_scene_triangles":5200,
                   "scene_primitive_instances":3,key:1}
            self.assertFalse(m.classify(entry)["rigid_candidate"])
    def test_stage_folder_not_false_positive_for_rock(self):
        entry={"path":"assets/3d/dungeons/b1_ancient_forest/stone_block.glb",
               "estimated_scene_triangles":3500,"scene_primitive_instances":1}
        self.assertTrue(m.classify(entry)["rigid_candidate"])
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

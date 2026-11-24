import unittest
from production_diagnosis import diagnose,repair_plan
class DiagnosisTest(unittest.TestCase):
    def test_oom(self):
        s=dict(columns=2,rows=2,width=100,height=100)
        p=repair_plan(s,diagnose("CUDA out of memory","render_failed"),0)
        self.assertEqual(p["action"],"replan")
        self.assertEqual(p["settings"]["columns"],4)
        self.assertTrue(p["invalidate_tile_evidence"])
        self.assertEqual(s["columns"],2)
    def test_stop(self):
        self.assertEqual(diagnose("out of memory","security_failed"),"stop")
        self.assertEqual(repair_plan({}, "resume_checkpoint",3)["action"],"stop_retry_limit")
    def test_unknown(self):
        self.assertEqual(repair_plan({},diagnose("unknown","render_failed"),0)["action"],"review")

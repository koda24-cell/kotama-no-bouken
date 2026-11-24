import unittest
from production_controller import next_action
from production_progress import new_session, record_verified

class ControllerTests(unittest.TestCase):
    def setUp(self):
        self.s = new_session("test","a"*40,"b"*64,100)
        record_verified(self.s,"front",1,"c"*64)
        self.v = {"front":self.s["units"]["front"]}
    def test_skip_verified(self):
        x=next_action(self.s,["front","side"],self.v,160,100,estimates={"side":20})
        self.assertEqual((x["action"],x["unit"]),("start_unit","side"))
    def test_active(self):
        x=next_action(self.s,["side"],{},6100,100,phase="rendering")
        self.assertEqual(x["action"],"continue_render")
    def test_recovery(self):
        x=next_action(self.s,["front","side"],self.v,160,100,phase="failed")
        self.assertEqual((x["action"],x["unit"]),("resume_checkpoint","side"))
    def test_cancel(self):
        self.assertEqual(next_action(self.s,["front"],self.v,160,100,cancelled=True)["action"],"stop_cancelled")
    def test_missing_estimate(self):
        self.assertEqual(next_action(self.s,["side"],{},160,100)["action"],"estimate_required")
    def test_finish(self):
        self.assertEqual(next_action(self.s,["front"],self.v,160,100)["action"],"finish")

import unittest
from production_repair_loop import run_loop
class RepairLoopTest(unittest.TestCase):
    def test_replan_then_success(self):
        calls=[]
        def execute(s,a):
            calls.append(s["columns"])
            return {"outcome":"render_failed","log":"out of memory"} if a==0 else {"outcome":"success","artifact":"candidate"}
        result=run_loop(dict(columns=1,rows=1,width=100,height=100),execute,lambda r:dict(technical_pass=True,score=1,target_met=True),lambda h,b:None,lambda:300,10)
        self.assertEqual(calls,[1,2])
        self.assertEqual(result["status"],"target_met")
    def test_retry_ceiling(self):
        calls=[]
        def execute(s,a):
            calls.append(a)
            return dict(outcome="timeout",checkpoint_verified=True,checkpoint="verified")
        run_loop({},execute,lambda r:{},lambda h,b:None,lambda:300,10)
        self.assertEqual(calls,[0,1,2,3])
    def test_security_stop(self):
        result=run_loop({},lambda s,a:dict(outcome="security_failed",log="out of memory"),lambda r:{},lambda h,b:None,lambda:300,10)
        self.assertEqual(result["status"],"stop")

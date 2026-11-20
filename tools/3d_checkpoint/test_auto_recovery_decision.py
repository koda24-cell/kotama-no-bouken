import unittest
from auto_recovery_decision import choose

def run(conclusion="failure"):
    return {"id": 42, "status": "completed", "conclusion": conclusion,
            "head_branch": "development", "head_sha": "a" * 40,
            "path": ".github/workflows/blender53-stage-boundary-checkpoints.yml",
            "event": "push", "repository": {"full_name": "koda24-cell/kotama-no-bouken"}}

def artifact():
    return {"name": "stage-one-b2-watergate-NOT-APPROVED-42", "expired": False,
            "workflow_run": {"id": 42}}

class RecoveryDecisionTests(unittest.TestCase):
    def test_eligible(self):
        self.assertTrue(choose(run(), [artifact()], "koda24-cell/kotama-no-bouken")["dispatch"])
    def test_missing_artifact(self):
        self.assertFalse(choose(run(), [], "koda24-cell/kotama-no-bouken")["dispatch"])
    def test_success(self):
        self.assertFalse(choose(run("success"), [artifact()], "koda24-cell/kotama-no-bouken")["dispatch"])
    def test_duplicate(self):
        self.assertFalse(choose(run(), [artifact(), artifact()], "koda24-cell/kotama-no-bouken")["dispatch"])
    def test_limit(self):
        self.assertFalse(choose(run(), [artifact()], "koda24-cell/kotama-no-bouken", 2)["dispatch"])
    def test_untrusted_branch(self):
        r=run()
        r["head_branch"]="main"
        with self.assertRaises(ValueError):
            choose(r, [artifact()], "koda24-cell/kotama-no-bouken")

if __name__ == "__main__":
    unittest.main()

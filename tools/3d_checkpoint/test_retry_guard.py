import unittest
from retry_guard import decide

SHA = "a" * 40
def event(conclusion="failure", branch="development", path=".github/workflows/blender53-resume-watergate.yml", trigger="push"):
    return {"workflow_run": {"id": 12, "status": "completed", "conclusion": conclusion,
            "head_branch": branch, "head_sha": SHA, "path": path, "event": trigger,
            "repository": {"full_name": "koda24-cell/kotama-no-bouken"}}}

class RetryGuardTests(unittest.TestCase):
    def test_eligible(self):
        self.assertTrue(decide(event(), 0, "koda24-cell/kotama-no-bouken")["retry"])
    def test_success_not_retried(self):
        self.assertFalse(decide(event(conclusion="success"), 0, "koda24-cell/kotama-no-bouken")["retry"])
    def test_limit(self):
        self.assertFalse(decide(event(), 2, "koda24-cell/kotama-no-bouken")["retry"])
    def test_wrong_branch(self):
        with self.assertRaises(ValueError):
            decide(event(branch="main"), 0, "koda24-cell/kotama-no-bouken")
    def test_recursive(self):
        with self.assertRaises(ValueError):
            decide(event(trigger="workflow_run"), 0, "koda24-cell/kotama-no-bouken")
    def test_unknown_workflow(self):
        with self.assertRaises(ValueError):
            decide(event(path=".github/workflows/unknown.yml"), 0, "koda24-cell/kotama-no-bouken")

if __name__ == "__main__":
    unittest.main()

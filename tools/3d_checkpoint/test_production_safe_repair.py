import unittest
from production_safe_repair import validate_candidate

class SafeRepairTests(unittest.TestCase):
    def test_accepts_only_scanned_deterministic_indentation_fix(self):
        old = "def f():\n\treturn 1\n        return 2\n"
        new = "def f():\n        return 1\n        return 2\n"
        self.assertTrue(validate_candidate(old,new,"TabError",scan_pass=True,attempt=0)["accepted"])
    def test_rejects_unscanned(self):
        old = "def f():\n\treturn 1\n        return 2\n"
        new = "def f():\n        return 1\n        return 2\n"
        self.assertEqual(validate_candidate(old,new,"TabError",scan_pass=False,attempt=0)["reason"],"security_scan_failed")
    def test_rejects_semantic_or_unrelated_edits(self):
        old = "def f():\n\treturn 1\n        return 2\n"
        self.assertFalse(validate_candidate(old,"def f():\n        return 9\n        return 2\n","TabError",scan_pass=True,attempt=0)["accepted"])
        self.assertFalse(validate_candidate("x = 1\n","x = 2\n","IndentationError",scan_pass=True,attempt=0)["accepted"])
    def test_retry_ceiling(self):
        old = "def f():\n\treturn 1\n        return 2\n"
        new = "def f():\n        return 1\n        return 2\n"
        self.assertFalse(validate_candidate(old,new,"TabError",scan_pass=True,attempt=3)["accepted"])

if __name__ == "__main__": unittest.main()

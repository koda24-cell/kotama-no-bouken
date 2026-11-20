import unittest
from select_recovery import select


def run(id, status="completed", conclusion="success", branch="development"):
    return {"id": id, "status": status, "conclusion": conclusion, "head_branch": branch}


def artifact(id, run_id, asset="b2", expired=False):
    return {"id": id, "name": f"{asset}-checkpoint-NOT-APPROVED-{run_id}",
            "expired": expired, "workflow_run": {"id": run_id}}


class RecoveryTests(unittest.TestCase):
    def test_last_success(self):
        self.assertEqual(select([run(11), run(12)], [artifact(1, 11), artifact(2, 12)], "b2")["source_run_id"], 12)

    def test_failed_run_rejected(self):
        with self.assertRaises(ValueError):
            select([run(12, conclusion="failure")], [artifact(2, 12)], "b2")

    def test_wrong_branch_rejected(self):
        with self.assertRaises(ValueError):
            select([run(12, branch="main")], [artifact(2, 12)], "b2")

    def test_expired_rejected(self):
        with self.assertRaises(ValueError):
            select([run(12)], [artifact(2, 12, expired=True)], "b2")

    def test_unrelated_artifact_rejected(self):
        with self.assertRaises(ValueError):
            select([run(12)], [artifact(2, 12, asset="other")], "b2")

    def test_limit(self):
        with self.assertRaises(ValueError):
            select([run(12)], [artifact(2, 12)], "b2", 4)


if __name__ == "__main__":
    unittest.main()

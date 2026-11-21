import unittest
from stage_plan import plan


class StagePlanTests(unittest.TestCase):
    def test_continue_when_time_is_safe(self):
        result = plan(1, 4, 3 * 60)
        self.assertEqual(result["action"], "continue")
        self.assertEqual(result["next_stage"], 2)
        self.assertFalse(result["handoff_required"])

    def test_handoff_at_reserve_boundary(self):
        result = plan(2, 4, 70 * 60)
        self.assertEqual(result["action"], "handoff")
        self.assertEqual(result["next_stage"], 3)
        self.assertTrue(result["handoff_required"])

    def test_handoff_after_budget(self):
        self.assertEqual(plan(1, 4, 91 * 60)["action"], "handoff")

    def test_limit_finishes_even_if_out_of_time(self):
        result = plan(4, 4, 95 * 60)
        self.assertEqual(result["action"], "finish")
        self.assertIsNone(result["next_stage"])

    def test_one_second_before_boundary(self):
        self.assertEqual(plan(2, 4, 70 * 60 - 1)["action"], "continue")

    def test_invalid_stages_rejected(self):
        for a, b in ((0, 4), (5, 4), (1, 0), (1, 13), (-1, 2)):
            with self.subTest(a=a, b=b):
                with self.assertRaises(ValueError):
                    plan(a, b, 60)

    def test_negative_duration_rejected(self):
        with self.assertRaises(ValueError):
            plan(1, 4, -1)

    def test_never_promotes_assets(self):
        self.assertEqual(plan(1, 4, 60)["status"], "NOT_APPROVED")


if __name__ == "__main__":
    unittest.main()

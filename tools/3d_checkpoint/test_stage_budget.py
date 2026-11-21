import unittest
from stage_budget import decide


class BudgetTests(unittest.TestCase):
    def test_early_iteration_allowed(self):
        self.assertTrue(decide(5 * 60)["continue"])

    def test_one_second_before_reserve_continues(self):
        self.assertTrue(decide(70 * 60 - 1)["continue"])

    def test_reserve_boundary_stops(self):
        self.assertFalse(decide(70 * 60)["continue"])

    def test_over_budget_stops(self):
        self.assertFalse(decide(95 * 60)["continue"])

    def test_invalid_budget_rejected(self):
        with self.assertRaises(ValueError):
            decide(0, budget_minutes=10, reserve_minutes=10)

    def test_negative_elapsed_rejected(self):
        with self.assertRaises(ValueError):
            decide(-1)


if __name__ == "__main__":
    unittest.main()

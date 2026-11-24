import unittest
from production_budget import Budget, route

class BudgetTests(unittest.TestCase):
    def test_active_render(self):
        for minute in (80, 90, 200, 344):
            self.assertEqual(route(Budget(), minute, minute, "rendering"), "continue_render")
    def test_hard_limit_reserve(self):
        self.assertEqual(route(Budget(), 345, 345, "rendering"), "protect_checkpoint")
        self.assertEqual(route(Budget(), 345, 345, "idle"), "finish_budget")
    def test_handoff(self):
        self.assertEqual(route(Budget(), 90, 90, "idle"), "handoff")
    def test_future(self):
        self.assertEqual(route(Budget(total_minutes=1440), 400, 20, "idle", 100), "start_unit")
    def test_split(self):
        self.assertEqual(route(Budget(), 10, 10, "idle", 340), "split_or_defer")
    def test_recovery(self):
        self.assertEqual(route(Budget(), 20, 20, "qa_failed"), "recover_saved_render")
        self.assertEqual(route(Budget(), 20, 20, "failed"), "resume_checkpoint")
        self.assertEqual(route(Budget(), 20, 20, "failed", retries=3), "stop_retry_limit")
    def test_cancel(self):
        self.assertEqual(route(Budget(), 20, 20, "failed", cancelled=True), "stop_cancelled")
    def test_invalid(self):
        with self.assertRaises(ValueError):
            Budget(total_minutes=1441)
        with self.assertRaises(ValueError):
            route(Budget(), 1, 2, "idle")

if __name__ == "__main__":
    unittest.main()

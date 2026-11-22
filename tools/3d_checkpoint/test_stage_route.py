import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from stage_route import outputs, main


class RouteTests(unittest.TestCase):
    def test_early_has_inline_continuation(self):
        self.assertEqual(outputs(1, 2, 60)["action"], "continue")

    def test_late_routes_to_new_job(self):
        result = outputs(1, 2, 71 * 60)
        self.assertEqual(result["action"], "handoff")
        self.assertEqual(result["next_stage"], 2)

    def test_limit_finishes(self):
        self.assertEqual(outputs(2, 2, 71 * 60)["action"], "finish")

    def test_invalid_stage_fails(self):
        with self.assertRaises(ValueError):
            outputs(2, 1, 0)

    def test_simulation_denied_without_explicit_branch_guard(self):
        with patch("sys.argv", ["stage_route.py", "--completed-stage", "1", "--max-stages", "2",
                                "--start-epoch", "1", "--simulate-minutes", "71"]):
            with patch.dict(os.environ, {"BUDGET_DRILL_ALLOWED": "false"}):
                with self.assertRaises(ValueError):
                    main()

    def test_output_is_machine_readable(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "outputs"
            with patch.dict(os.environ, {"BUDGET_DRILL_ALLOWED": "true", "GITHUB_OUTPUT": str(file)}):
                with patch("sys.argv", ["stage_route.py", "--completed-stage", "1", "--max-stages",
                                        "2", "--start-epoch", "1", "--simulate-minutes", "71"]):
                    self.assertEqual(main(), 0)
            data = file.read_text()
            self.assertIn("action=handoff\n", data)
            self.assertIn("handoff_required=true\n", data)
            self.assertIn("next_stage=2\n", data)


if __name__ == "__main__":
    unittest.main()

import unittest
from production_retry import recovery_action

class RetryPolicyTest(unittest.TestCase):
    def action(self, **kwargs):
        args = dict(outcome="render_failed", checkpoint_verified=True, retries=0, remaining_minutes=90, estimate_minutes=30)
        args.update(kwargs)
        return recovery_action(**args)
    def test_resume(self):
        self.assertEqual(self.action(), "resume_checkpoint")
        self.assertEqual(self.action(outcome="timeout"), "resume_checkpoint")
    def test_qa(self):
        self.assertEqual(self.action(outcome="qa_failed"), "recover_saved_render")
    def test_stop(self):
        for outcome in ("cancelled", "security_failed", "invalid_input"):
            self.assertEqual(self.action(outcome=outcome), "stop")
    def test_limits(self):
        self.assertEqual(self.action(retries=3), "stop_retry_limit")
        self.assertEqual(self.action(checkpoint_verified=False), "stop_unverified")
        self.assertEqual(self.action(remaining_minutes=44), "defer")
        self.assertEqual(self.action(remaining_minutes=45), "resume_checkpoint")
    def test_success(self):
        self.assertEqual(self.action(outcome="success"), "finish")

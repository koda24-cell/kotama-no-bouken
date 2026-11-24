"""Pure routing policy; caller must persist checkpoints and enforce hard deadlines."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Budget:
    total_minutes: int = 360
    job_minutes: int = 360
    reserve_minutes: int = 15
    soft_minutes: int = 80
    max_retries: int = 3

    def __post_init__(self):
        if not 1 <= self.total_minutes <= 1440:
            raise ValueError("invalid total budget")
        if not 0 < self.reserve_minutes < self.job_minutes <= 360:
            raise ValueError("invalid job budget")
        if not 0 < self.soft_minutes < self.job_minutes or not 0 <= self.max_retries <= 3:
            raise ValueError("invalid routing limits")

def route(budget, elapsed, job_elapsed, phase, estimated_minutes=0, retries=0, cancelled=False):
    """Minutes since persisted session/job start; estimates must be conservative.
    Returns a decision, not a process signal. Hard runner limits remain external.
    """
    if phase not in ("idle", "rendering", "failed", "qa_failed", "complete"):
        raise ValueError("unknown phase")
    if min(elapsed, job_elapsed, estimated_minutes, retries) < 0 or job_elapsed > elapsed:
        raise ValueError("invalid timing")
    remaining = min(budget.total_minutes-elapsed, budget.job_minutes-job_elapsed)
    if cancelled:
        return "stop_cancelled"
    if phase == "complete":
        return "finish"
    if phase == "rendering":
        return "continue_render" if remaining > budget.reserve_minutes else "protect_checkpoint"
    if budget.total_minutes-elapsed <= budget.reserve_minutes:
        return "finish_budget"
    if phase in ("failed", "qa_failed") and retries >= budget.max_retries:
        return "stop_retry_limit"
    if remaining <= budget.reserve_minutes or job_elapsed >= budget.soft_minutes:
        return "handoff"
    if estimated_minutes + budget.reserve_minutes > remaining:
        return "split_or_defer"
    if phase == "qa_failed":
        return "recover_saved_render"
    if phase == "failed":
        return "resume_checkpoint"
    return "start_unit"

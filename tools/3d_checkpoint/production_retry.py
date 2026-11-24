"""Pure retry policy; callers must independently verify checkpoint evidence."""
def recovery_action(*, outcome, checkpoint_verified, retries, remaining_minutes, estimate_minutes, reserve_minutes=15):
    if outcome not in {"success", "cancelled", "timeout", "render_failed", "qa_failed", "security_failed", "invalid_input"}:
        raise ValueError("unknown outcome")
    if min(retries, remaining_minutes, estimate_minutes) < 0 or reserve_minutes <= 0:
        raise ValueError("invalid budget")
    if outcome == "success":
        return "finish"
    if outcome in {"cancelled", "security_failed", "invalid_input"}:
        return "stop"
    if retries >= 3:
        return "stop_retry_limit"
    if not checkpoint_verified:
        return "stop_unverified"
    if estimate_minutes <= 0 or remaining_minutes < estimate_minutes + reserve_minutes:
        return "defer"
    return "recover_saved_render" if outcome == "qa_failed" else "resume_checkpoint"

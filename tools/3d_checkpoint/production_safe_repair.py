"""Allow only deterministic, syntax-safe source repairs before a bounded rerun."""
import ast
from pathlib import Path

def validate_candidate(original, candidate, error, *, scan_pass, attempt, max_retries=3):
    if not isinstance(scan_pass, bool) or not scan_pass:
        return {"accepted": False, "reason": "security_scan_failed"}
    if type(attempt) is not int or type(max_retries) is not int or not 0 <= attempt < min(max_retries, 3):
        return {"accepted": False, "reason": "retry_limit"}
    if "TabError" not in error and "IndentationError" not in error:
        return {"accepted": False, "reason": "unsupported_repair"}
    try:
        ast.parse(original)
    except (TabError, IndentationError):
        pass
    except SyntaxError:
        return {"accepted": False, "reason": "original_has_other_syntax_error"}
    else:
        return {"accepted": False, "reason": "original_is_valid"}
    try:
        ast.parse(candidate)
    except SyntaxError:
        return {"accepted": False, "reason": "candidate_invalid"}
    normalized = "".join(
        line[:len(line) - len(line.lstrip(" \t"))].expandtabs(8) + line.lstrip(" \t")
        for line in original.splitlines(keepends=True)
    )
    if candidate != normalized or candidate == original:
        return {"accepted": False, "reason": "candidate_not_deterministic_normalization"}
    return {"accepted": True, "reason": "safe_indentation_normalization"}

def validate_candidate_file(original_path, candidate_path, error, *, scan_pass, attempt, max_retries=3):
    original = Path(original_path).read_text()
    candidate = Path(candidate_path).read_text()
    return validate_candidate(original, candidate, error, scan_pass=scan_pass, attempt=attempt, max_retries=max_retries)

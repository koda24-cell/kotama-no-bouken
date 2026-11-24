"""Bounded runtime recovery without executing log-generated code."""
def recovery(error, attempt):
    if attempt>=3:return None
    s=error.lower()
    if "out of memory" in s or "cuda error: out of memory" in s:return {"device":"CPU","samples_scale":.5,"reason":"memory"}
    if "optix" in s or "cuda error" in s:return {"device":"CPU","samples_scale":1,"reason":"device"}
    if "taberror" in s or "indentationerror" in s:return {"delegate":"production_safe_repair","reason":"syntax"}
    return None

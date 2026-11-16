"""Optional vision judge for B5 throne. No inference is called without opt-in.
Compatible with an explicitly configured HTTPS OpenAI-style chat/completions API.
The model output is UNTRUSTED: allow only tightly clamped numerical changes.
"""
import base64
import json
import math
import argparse
import os
from pathlib import Path
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen

def clamp(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return 0.0
    return max(low, min(high, float(value)))

def configuration():
    """Offline preflight; never print credentials or contact the provider."""
    enabled = os.getenv("ENABLE_VISION", "false").lower() == "true"
    missing = [key for key in ("VISION_API_URL", "VISION_API_KEY", "VISION_MODEL")
               if not os.getenv(key, "").strip()]
    if enabled and not missing:
        parsed = urlparse(os.environ["VISION_API_URL"].strip())
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username
                or parsed.password or parsed.query or parsed.fragment):
            raise ValueError("VISION_API_URL requires HTTPS without URL credentials, query or fragment")
    return {"enabled": enabled, "ready": enabled and not missing,
            "missing": missing, "network_called": False}


def evaluate(directory: Path):
    endpoint = os.getenv("VISION_API_URL", "").strip()
    model = os.getenv("VISION_MODEL", "").strip()
    token = os.getenv("VISION_API_KEY", "").strip()
    if os.getenv("ENABLE_VISION", "false").lower() != "true":
        return {"mode": "disabled", "artistic_quality": "UNVERIFIED"}
    if not (endpoint and model and token):
        return {"mode": "unconfigured", "artistic_quality": "UNVERIFIED"}
    configuration()
    parsed = urlparse(endpoint)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("VISION_API_URL must be an explicit HTTPS endpoint without credentials in URL")
    content = [{
        "type": "text",
        "text": (
            "You are reviewing a three-view Blender render of a ruined Gothic demon-throne "
            "for a fantasy browser RPG. Base your evaluation ONLY on the images. "
            "Check visual structure, stone depth, credible broken masonry, naturally "
            "supported rubble, nonuniform arch curvature, and decorative cohesion. "
            "Do not claim mesh intersection is verified from pixels. "
            "Return ONLY a JSON object with keys: analysis (Japanese concise text), "
            "confidence (number 0..1), visual_score (number 0..10), and adjustments "
            "(object with rubble_delta integer -3..3, relief_delta integer -3..3, "
            "back_depth_delta float -0.15..0.15, arch_curvature_delta float -0.2..0.2, "
            "exposure_delta float -0.5..0.5). Positive adjustments must be justified "
            "by visible defects. Never authorize deletion of original geometry or approval."
        )
    }]
    for view in ("front", "side", "angle"):
        data = (directory / (view + ".png")).read_bytes()
        if len(data) > 8_000_000:
            raise ValueError("Render too large for optional vision review")
        content.append({"type":"text","text":view+" view"})
        content.append({"type":"image_url","image_url":{
            "url":"data:image/png;base64," + base64.b64encode(data).decode("ascii")}})
    payload = {"model": model, "messages":[{"role":"user","content":content}],
               "max_tokens":650, "temperature":0}
    request = Request(endpoint, data=json.dumps(payload).encode("utf-8"),
                      headers={"Authorization":"Bearer "+token,
                               "Content-Type":"application/json"},
                      method="POST")
    with urlopen(request, timeout=55) as resp:
        if resp.status != 200:
            raise RuntimeError("Vision service HTTP "+str(resp.status))
        raw=resp.read(120_000)
    body=json.loads(raw)
    answer=body["choices"][0]["message"]["content"]
    if isinstance(answer,list):
        answer="".join(v.get("text","") for v in answer if isinstance(v,dict))
    match=re.search(r"\{.*\}", str(answer), re.S)
    if not match:
        raise ValueError("Vision model did not return valid JSON object")
    reply=json.loads(match.group(0))
    if not isinstance(reply,dict):
        raise ValueError("Vision response must be an object")
    adj=reply.get("adjustments",{}) or {}
    if not isinstance(adj,dict):
        adj={}
    safe={
      "rubble_delta":round(clamp(adj.get("rubble_delta",0),-3,3)),
      "relief_delta":round(clamp(adj.get("relief_delta",0),-3,3)),
      "back_depth_delta":round(clamp(adj.get("back_depth_delta",0),-.15,.15),3),
      "arch_curvature_delta":round(clamp(adj.get("arch_curvature_delta",0),-.2,.2),3),
      "exposure_delta":round(clamp(adj.get("exposure_delta",0),-.5,.5),3)
    }
    return {"mode":"model","artistic_quality":"AI_ESTIMATE_NOT_APPROVED",
            "visual_score":round(clamp(reply.get("visual_score",0),0,10),2),
            "confidence":round(clamp(reply.get("confidence",0),0,1),3),
            "analysis":str(reply.get("analysis",""))[:600],"adjustments":safe}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Offline vision configuration check; never calls an API")
    parser.add_argument("--check-config", action="store_true", required=True)
    parser.parse_args()
    try:
        result = configuration()
        print(json.dumps(result))
        raise SystemExit(0 if not result["enabled"] or result["ready"] else 2)
    except ValueError:
        print("Invalid VISION_API_URL; configuration rejected without network usage")
        raise SystemExit(2)

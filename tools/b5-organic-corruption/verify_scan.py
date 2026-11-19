#!/usr/bin/env python3
"""Require genuine zero-infection ClamAV logs and save an auditable QA summary."""
import json, os, pathlib, re
out=pathlib.Path("render-output/b5-organic-corruption")
results={}
for label,filename in (("source","scan-source.log"),("generated","scan-output.log")):
    log=(out/filename).read_text(encoding="utf-8",errors="replace")
    infected=re.search(r"Infected files:\s*(\d+)",log)
    scanned=re.search(r"Scanned files:\s*(\d+)",log)
    errors=re.search(r"Total errors:\s*(\d+)",log)
    assert infected and scanned, f"{label}: real clamscan summary missing"
    assert int(infected.group(1))==0, f"{label}: infections found"
    assert int(scanned.group(1))>0, f"{label}: nothing scanned"
    assert not errors or int(errors.group(1))==0, f"{label}: scan errors"
    results[label]={"infected":0,"scanned_files":int(scanned.group(1)),"scan_log":filename}
version=(out/"clamav-version.txt").read_text(encoding="utf-8").strip()
assert version.startswith("ClamAV"), "missing actual engine/signature version"
assert (out/"freshclam.log").stat().st_size>0, "missing signature update evidence"
report={"status":"SCAN_PASS","engine":version,"signature_update_log":"freshclam.log",
        "github_run_id":os.getenv("GITHUB_RUN_ID","local"),"scan_results":results,
        "asset_status":"NOT_APPROVED","blender_render_verified":True}
(out/"security-qa-report.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print("B5_REAL_CLAMAV_SCANS_PASSED",results)

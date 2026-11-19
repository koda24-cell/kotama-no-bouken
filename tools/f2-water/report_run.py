#!/usr/bin/env python3
"""Always generate a machine-readable and GitHub-visible factual result report.
Does not access or decode unscanned download bytes.
"""
import datetime, json, os, pathlib, sys
root=pathlib.Path("out/f2-water"); root.mkdir(parents=True,exist_ok=True)
def read_json(name):
    p=root/name
    if not p.exists():return None
    try:return json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:return {"status":"INVALID_MANIFEST","error":str(exc)}
scan=read_json("scan_manifest.json")
render=read_json("render_manifest.json")
run=os.environ.get("GITHUB_RUN_ID","")
url=(f"https://github.com/{os.environ.get('GITHUB_REPOSITORY')}/actions/runs/{run}" if run else None)
scan_status=(scan or {}).get("status","NOT_EXECUTED_OR_NO_REPORT")
render_status=("RENDER_FILES_REPORTED_UNVERIFIED" if render else "NOT_RENDERED_OR_NO_REPORT")
if scan_status!="SCANNED_OK_NOT_APPROVED":render_status="BLOCKED_BEFORE_RENDER"
status="CANDIDATE_REVIEW_REQUIRED" if scan_status=="SCANNED_OK_NOT_APPROVED" and render else "BLOCKED_OR_UNVERIFIED"
report={"status":status,"approval":"NOT_APPROVED","run_url":url,"run_id":run or None,
        "timestamp_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "scan_status":scan_status,"render_status":render_status,
        "scanner_version":(scan or {}).get("scanner_version"),
        "asset_sha256":(scan or {}).get("sha256"),
        "scan_exit_code":((scan or {}).get("scan") or {}).get("exit_code"),
        "failure_reason":(scan or {}).get("error"),
        "render_file_count":len((render or {}).get("images",{})),
        "next_action":"Check job logs; do not approve without scan success and actual PNG review"}
(root/"execution_report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
summary=os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary,"a",encoding="utf-8") as f:
        f.write("## F2 water — actual execution evidence\n\n")
        f.write(f"- Status: **{status}**\n- Scan: **{scan_status}**\n- Render: **{render_status}**\n")
        f.write(f"- Run: {url or 'unknown'}\n- Scan exit code: {report['scan_exit_code']}\n")
        f.write("- Review status: **NOT_APPROVED**\n\n")
        f.write("The report is generated even on failure. Actual image and antivirus success must be verified from artifacts/logs.\n")
print(json.dumps(report,ensure_ascii=False),flush=True)

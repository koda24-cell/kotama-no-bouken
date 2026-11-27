#!/usr/bin/env python3
"""Merge selected open pull requests onto the checked-out `development` tree
for the private preview only. Nothing is pushed; `development` and `main` are
never changed. Conflicting PRs are skipped and reported.

Selection comes from tools/cloudflare-preview/preview-sources.json:
  mode "label": open PRs into development carrying the label (default "preview")
  mode "all":   every open, non-draft PR into development
  mode "none":  development only
  exclude:      PR numbers never to include

Env: GITHUB_TOKEN, GITHUB_REPOSITORY. Writes a JSON report (argv[1]).
"""
import json, os, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(HERE, "preview-sources.json")))
repo = os.environ["GITHUB_REPOSITORY"]
report_path = sys.argv[1]


def gh(path):
    out, page = [], 1
    while True:
        req = urllib.request.Request(f"https://api.github.com/repos/{repo}/{path}&page={page}", headers={
            "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"], "Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            rows = json.load(r)
        out += rows
        if len(rows) < 100:
            return out
        page += 1


def git(*args, check=True):
    return subprocess.run(["git", *args], check=check, capture_output=True, text=True)


base_sha = git("rev-parse", "HEAD").stdout.strip()
mode = cfg.get("mode", "label")
label = cfg.get("label", "preview")
exclude = set(cfg.get("exclude", []))
prs = [] if mode == "none" else gh("pulls?state=open&base=development&per_page=100&sort=created&direction=asc")
chosen = []
for p in prs:
    if p["number"] in exclude or p["head"]["repo"] is None or p["head"]["repo"]["full_name"] != repo:
        continue
    if mode == "label" and label not in [l["name"] for l in p.get("labels", [])]:
        continue
    if mode == "all" and p.get("draft"):
        continue
    chosen.append(p)

included, skipped = [], []
for p in chosen:
    n = p["number"]
    f = git("fetch", "--no-tags", "--filter=blob:none", "origin", f"pull/{n}/head:preview-pr-{n}", check=False)
    if f.returncode:
        skipped.append({"number": n, "title": p["title"], "reason": "fetch failed"})
        continue
    m = git("merge", "--no-ff", "--no-edit", "-m", f"preview: include #{n}", f"preview-pr-{n}", check=False)
    if m.returncode:
        git("merge", "--abort", check=False)
        skipped.append({"number": n, "title": p["title"], "reason": "merge conflict with development or earlier PRs"})
    else:
        included.append({"number": n, "title": p["title"], "head": p["head"]["sha"]})

report = {"development": base_sha, "mode": mode, "label": label,
          "included": included, "skipped": skipped, "result_tree": git("rev-parse", "HEAD").stdout.strip()}
json.dump(report, open(report_path, "w"), ensure_ascii=False, indent=1)
summary = os.environ.get("GITHUB_STEP_SUMMARY")
lines = [f"Preview source: development {base_sha[:12]} (mode={mode})"]
lines += [f"- included #{x['number']} {x['title']}" for x in included]
lines += [f"- SKIPPED #{x['number']} {x['title']} — {x['reason']}" for x in skipped]
print("\n".join(lines))
if summary:
    open(summary, "a").write("\n".join(lines) + "\n")

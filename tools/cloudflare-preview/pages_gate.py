#!/usr/bin/env python3
"""Password-gate administration and verification for the private Pages preview.

Subcommands (all read secrets from the environment; nothing secret is printed):
  configure            store PREVIEW_PASSWORD as a Pages secret (production+preview)
  gate [--deployment ID] [--paths ...]
                       unauthenticated + login checks on every hostname
                       (default: all deployments of the project)
  purge-unprotected    delete every deployment not made by the protected pipeline
  prune [--keep N]     delete all but the newest N protected deployments (+ fixed URL)
  rollback             move the fixed URL to the previous protected deployment
  canonical            print the current fixed-URL deployment id

Environment:
  CF_ACCOUNT, CF_TOKEN (existing Pages Read/Edit token), PREVIEW_PASSWORD
"""
import argparse, concurrent.futures, json, os, re, secrets, sys, time
import urllib.error, urllib.parse, urllib.request

PROJECT = "kotama-private-probe-20261127"
ROOT = PROJECT + ".pages.dev"
MARKER = "[protected]"          # commit message prefix of protected deployments
LOGIN_MARK = "kotama-preview-login"
COMPAT_DATE = "2026-11-01"


def die(msg):
    print("::error::" + msg)
    summary("FAIL: " + msg)
    sys.exit(1)


def summary(line):
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        with open(p, "a") as f:
            f.write(line + "\n")


def password():
    pw = os.environ.get("PREVIEW_PASSWORD", "")
    if len(pw) < 12:
        die("PREVIEW_PASSWORD secret missing or shorter than 12 characters")
    return pw


def api(method, suffix, body=None):
    acct = os.environ.get("CF_ACCOUNT", "")
    if not re.fullmatch(r"[0-9a-fA-F]{32}", acct):
        die("CLOUDFLARE_ACCOUNT_ID missing or malformed")
    url = f"https://api.cloudflare.com/client/v4/accounts/{acct}/pages/projects/{PROJECT}{suffix}"
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + os.environ.get("CF_TOKEN", ""),
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        try:
            codes = [x.get("code") for x in json.load(e).get("errors", [])]
        except ValueError:
            codes = []
        die(f"{method} {suffix.split('?')[0] or '/'} -> HTTP {e.code} {codes}")
    if not d.get("success"):
        die(f"{method} {suffix} unsuccessful")
    return d


def project():
    p = api("GET", "")["result"]
    if p["subdomain"] != ROOT:
        die("unexpected project subdomain")
    if set(p.get("domains") or []) - {ROOT}:
        die("unexpected custom domain on project; review manually")
    return p


def deployments():
    out = []
    for page in range(1, 41):
        d = api("GET", f"/deployments?per_page=25&page={page}")
        out += d["result"]
        info = d.get("result_info") or {}
        if len(d["result"]) < 25 or (info.get("total_pages") and page >= info["total_pages"]):
            return out
    die("deployment pagination did not finish")


def is_protected(dep):
    msg = ((dep.get("deployment_trigger") or {}).get("metadata") or {}).get("commit_message") or ""
    return msg.startswith(MARKER)


def hosts_of(dep):
    hs = set()
    for u in [dep.get("url"), *(dep.get("aliases") or [])]:
        if u:
            h = urllib.parse.urlsplit(u if "://" in u else "https://" + u).hostname
            if not h or not (h == ROOT or h.endswith("." + ROOT)):
                die("unexpected hostname in deployment list")
            hs.add(h)
    return hs


# ---------------------------------------------------------------- HTTP checks
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


OPENER = urllib.request.build_opener(NoRedirect())


def http(url, data=None, headers=None):
    h = {"User-Agent": "Kotama-Preview-Gate/3.0", **(headers or {})}
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=data, headers=h, method="POST" if data else "GET")
            try:
                r = OPENER.open(req, timeout=20)
            except urllib.error.HTTPError as e:
                r = e
            with r:
                return r.code, dict(r.headers), r.read(200_000)
        except (OSError, urllib.error.URLError):
            if attempt == 2:
                return 0, {}, b""
            time.sleep(2)


def unauth_ok(code, body):
    # Only the worker's 401 login page counts. TLS/network errors, redirects,
    # 404, 5xx or any 200 are NOT accepted as protection.
    return code == 401 and LOGIN_MARK.encode() in body and len(body) < 8000


def gate(only_dep, paths):
    pw = password()
    p = project()
    deps = deployments()
    canonical = (p.get("canonical_deployment") or {}).get("id")
    if not canonical:
        die("project has no fixed-URL deployment")
    checks = {}  # host -> must be protected (True) / unknown host (False)
    for d in deps:
        if only_dep and d["id"] != only_dep:
            continue
        for h in hosts_of(d):
            checks[h] = True
    if not only_dep:
        checks[ROOT] = True
        checks["gate-" + secrets.token_hex(4) + "." + ROOT] = False  # never-used host
    if only_dep and not checks:
        die("deployment to check not found")
    jobs = []
    for h, real in checks.items():
        for path in (paths if real else ["/", "/index.html"]):
            for variant, hdr in (("no-cookie", {}), ("forged-cookie", {"Cookie": "kp_session=v1.9999999999.AAAA"})):
                jobs.append((h, path, variant, hdr, real))

    def run(j):
        h, path, variant, hdr, real = j
        code, _, body = http("https://" + h + path, headers=hdr)
        ok = unauth_ok(code, body) if real else (code in (401, 404) and b"Dummy content" not in body)
        return h, path, variant, code, ok

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(run, jobs))
    bad = [r for r in results if not r[4]]
    for h, path, variant, code, ok in results:
        print(f"{'OK ' if ok else 'BAD'} https://{h}{path} {variant} HTTP {code}")

    # login checks on each protected host's root
    login_bad = []
    for h in sorted(x for x, real in checks.items() if real):
        base = "https://" + h
        code, _, _ = http(base + "/__login", data=urllib.parse.urlencode(
            {"password": "wrong-" + secrets.token_hex(6), "next": "/"}).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"})
        if code != 401:
            login_bad.append(f"{h}: wrong password returned HTTP {code}")
        code, hdr, _ = http(base + "/__login", data=urllib.parse.urlencode({"password": pw, "next": "/"}).encode(),
                            headers={"Content-Type": "application/x-www-form-urlencoded"})
        cookie = (hdr.get("Set-Cookie") or "").split(";")[0]
        if code != 303 or not cookie.startswith("kp_session=v1."):
            login_bad.append(f"{h}: correct password did not log in (HTTP {code})")
            continue
        for path in paths:
            c2, h2, body = http(base + path, headers={"Cookie": cookie})
            # Pages canonicalises /index.html -> / with a same-host redirect
            same_host_redirect = c2 in (301, 307, 308) and (h2.get("Location") or "").startswith("/")
            if not (c2 == 200 or same_host_redirect) or LOGIN_MARK.encode() in body:
                login_bad.append(f"{h}{path}: signed-in request returned HTTP {c2}")
        print(f"login {h}: wrong=401, correct=303, signed-in files={len(paths)} checked")
    total = len(results)
    if bad or login_bad:
        for x in login_bad:
            print("::error::" + x)
        summary(f"Password gate: NOT PASSED ({len(bad)} unauthenticated failures / {total}, {len(login_bad)} login failures)")
        sys.exit(1)
    summary(f"Password gate: PASS — {total} unauthenticated requests refused on {len(checks)} hosts; "
            f"login (wrong=401, correct=200) verified on {sum(checks.values())} hosts.")
    print("PASS")


def configure():
    pw = password()
    env = {"PREVIEW_PASSWORD": {"type": "secret_text", "value": pw}}
    api("PATCH", "", {"deployment_configs": {
        "production": {"env_vars": env, "compatibility_date": COMPAT_DATE},
        "preview": {"env_vars": env, "compatibility_date": COMPAT_DATE}}})
    print("PREVIEW_PASSWORD stored as Pages secret (production + preview). Value not printed.")


def purge():
    p = project()
    canonical = (p.get("canonical_deployment") or {}).get("id")
    deps = deployments()
    cdep = next((d for d in deps if d["id"] == canonical), None)
    if not cdep or not is_protected(cdep):
        die("fixed URL is not serving a protected deployment; refusing to purge")
    n = 0
    for d in deps:
        if not is_protected(d) and d["id"] != canonical:
            api("DELETE", f"/deployments/{d['id']}?force=true")
            n += 1
    print(f"Deleted {n} unprotected deployment(s); kept {len(deps) - n}.")
    summary(f"Deleted {n} unprotected (pre-password) deployment(s).")


def prune(keep):
    """Keep the fixed-URL deployment and the newest `keep` protected ones (rollback
    targets); delete older ones so gate runs stay small (free request quota)."""
    canonical = project()["canonical_deployment"]["id"]
    deps = sorted(deployments(), key=lambda d: d.get("created_on") or "", reverse=True)
    kept = [d["id"] for d in deps if is_protected(d)][:keep]
    n = 0
    for d in deps:
        if d["id"] != canonical and d["id"] not in kept:
            api("DELETE", f"/deployments/{d['id']}?force=true")
            n += 1
    print(f"Pruned {n} old deployment(s); kept {len(deps) - n}.")


def rollback():
    p = project()
    canonical = p["canonical_deployment"]["id"]
    prod = [d for d in deployments() if d.get("environment") == "production"
            and is_protected(d) and d["id"] != canonical
            and (d.get("latest_stage") or {}).get("status") == "success"]
    if not prod:
        die("no previous protected production deployment to roll back to")
    target = prod[0]["id"]
    api("POST", f"/deployments/{target}/rollback")
    for _ in range(12):
        time.sleep(5)
        if project()["canonical_deployment"]["id"] == target:
            print(f"Fixed URL rolled back {canonical[:8]} -> {target[:8]}")
            summary(f"Rollback: fixed URL {canonical[:8]} -> {target[:8]}")
            return
    die("fixed URL did not move to rollback target")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["configure", "gate", "purge-unprotected", "prune", "rollback", "canonical"])
    ap.add_argument("--keep", type=int, default=5)
    ap.add_argument("--deployment")
    ap.add_argument("--paths", default="/ /index.html /probe.css /probe.js /probe.svg")
    a = ap.parse_args()
    if a.cmd == "configure":
        configure()
    elif a.cmd == "gate":
        gate(a.deployment, a.paths.split())
    elif a.cmd == "purge-unprotected":
        purge()
    elif a.cmd == "prune":
        prune(max(2, a.keep))
    elif a.cmd == "rollback":
        rollback()
    else:
        print(project()["canonical_deployment"]["id"])


if __name__ == "__main__":
    main()

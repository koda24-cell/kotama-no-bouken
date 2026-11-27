#!/usr/bin/env python3
"""Configure (apply) or audit Cloudflare Access for the private Pages preview.

  python3 access_admin.py apply  # create/update the e-mail allow policy and both apps
  python3 access_admin.py audit  # read-only: fail unless both hosts are e-mail-only protected

Environment (from GitHub Actions secrets; never printed):
  CF_ACCOUNT              Cloudflare account ID
  CF_ACCESS_TOKEN         token with Account > Access: Apps and Policies > Edit
                          (+ optional Access: Organizations, Identity Providers, and Groups > Read)
  ACCESS_ALLOWED_EMAILS   comma/newline separated approved addresses

Safety rules enforced in both modes:
  - only the two hostnames in access-config.json (project pages.dev and its wildcard)
  - policy decision must be "allow" with include = e-mail rules only
  - no bypass / non_identity / everyone / e-mail-domain / IP rules on these apps
  - addresses are never printed (public repository logs); only counts
"""
import json, os, re, sys, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, "access-config.json")))
API = "https://api.cloudflare.com/client/v4/accounts/"
EMAIL_RE = re.compile(r"^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$")


def fail(msg):
    print("::error::" + msg)
    summary("FAIL: " + msg)
    sys.exit(1)


def summary(line):
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        with open(p, "a") as f:
            f.write(line + "\n")


def call(method, path, body=None, ok_missing=False):
    acct = os.environ.get("CF_ACCOUNT", "")
    if not re.fullmatch(r"[0-9a-fA-F]{32}", acct):
        fail("CLOUDFLARE_ACCOUNT_ID secret missing or malformed")
    tok = os.environ.get("CF_ACCESS_TOKEN", "")
    if not tok:
        fail("CLOUDFLARE_ACCESS_TOKEN secret is not set (see docs/CLOUDFLARE_ACCESS_SETUP.md)")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + acct + path, data=data, method=method, headers={
        "Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            payload = json.load(e)
        except ValueError:
            payload = {}
        codes = [x.get("code") for x in payload.get("errors", [])]
        if ok_missing:
            return e.code, payload
        # error messages from Cloudflare never contain the token; print codes only
        fail(f"{method} {path.split('?')[0]} -> HTTP {e.code} errors={codes}")


def allowed_emails():
    raw = os.environ.get("ACCESS_ALLOWED_EMAILS", "")
    emails = sorted({e.strip().lower() for e in re.split(r"[,\n;]", raw) if e.strip()})
    if not emails:
        fail("ACCESS_ALLOWED_EMAILS secret is empty; refusing to configure")
    bad = [e for e in emails if not EMAIL_RE.match(e)]
    if bad:
        fail(f"{len(bad)} malformed address(es) in ACCESS_ALLOWED_EMAILS")
    if len(emails) > CFG["max_allowed_emails"]:
        fail("too many approved addresses; raise max_allowed_emails deliberately if intended")
    return emails


def org():
    code, d = call("GET", "/access/organizations", ok_missing=True)
    if code != 200 or not d.get("success") or not d.get("result", {}).get("auth_domain"):
        fail("Zero Trust organization not found. The account owner must finish Zero Trust onboarding "
             "(team name + Free plan) in the dashboard first.")
    return d["result"]


def otp_idp():
    code, d = call("GET", "/access/identity_providers", ok_missing=True)
    if code != 200 or not d.get("success"):
        print("Identity providers not readable with this token (optional permission). "
              "Apps will use the organization default login methods.")
        return None
    otp = [i for i in d["result"] if i.get("type") == "onetimepin"]
    others = [i.get("type") for i in d["result"] if i.get("type") != "onetimepin"]
    print(f"Identity providers: one-time PIN={'yes' if otp else 'NO'}, others={others}")
    if not otp:
        fail("One-time PIN login is not enabled. Add it under Zero Trust > Settings > Authentication.")
    return otp[0]["id"]


def list_apps():
    _, d = call("GET", "/access/apps?per_page=100")
    return d["result"]


def app_domains(app):
    out = set()
    if app.get("domain"):
        out.add(app["domain"].lower())
    for h in app.get("self_hosted_domains") or []:
        out.add(h.lower())
    for dst in app.get("destinations") or []:
        if dst.get("uri"):
            out.add(dst["uri"].lower())
    return {re.sub(r"^https?://", "", h).rstrip("/") for h in out}


def check_policy(p, emails):
    """Return list of problems for one policy (empty = OK)."""
    probs = []
    name = p.get("name", "?")
    if p.get("decision") != "allow":
        probs.append(f"policy '{name}' decision={p.get('decision')} (only allow is permitted)")
    inc = p.get("include") or []
    if not inc:
        probs.append(f"policy '{name}' has an empty include")
    got = set()
    for rule in inc:
        keys = list(rule)
        if keys != ["email"]:
            probs.append(f"policy '{name}' include rule type {keys} is not an e-mail rule")
        else:
            got.add(rule["email"].get("email", "").lower())
    extra = got - set(emails)
    if extra:
        probs.append(f"policy '{name}' allows {len(extra)} address(es) not in ACCESS_ALLOWED_EMAILS")
    for k in ("exclude", "require"):
        for rule in p.get(k) or []:
            if "everyone" in rule:
                probs.append(f"policy '{name}' {k} contains everyone")
    return probs, got


def audit(emails, expect_idp=None):
    apps = list_apps()
    total_problems = []
    for want in CFG["apps"]:
        dom = want["domain"].lower()
        matches = [a for a in apps if dom in app_domains(a)]
        if not matches:
            total_problems.append(f"no Access application covers {dom}")
            continue
        for a in matches:
            _, full = call("GET", f"/access/apps/{a['id']}")
            app = full["result"]
            pols = app.get("policies") or []
            if app.get("type") != "self_hosted":
                total_problems.append(f"{dom}: app type {app.get('type')}")
            if not pols:
                total_problems.append(f"{dom}: application has no policy (would deny all, but is not the intended state)")
            covered = set()
            for p in pols:
                probs, got = check_policy(p, emails)
                total_problems += [f"{dom}: {x}" for x in probs]
                covered |= got
            if expect_idp and app.get("allowed_idps") and expect_idp not in app["allowed_idps"]:
                total_problems.append(f"{dom}: one-time PIN is not among allowed login methods")
            print(f"{dom}: app '{app.get('name')}' policies={len(pols)} "
                  f"approved_addresses={len(covered)}")
    if total_problems:
        for x in total_problems:
            print("::error::" + x)
        summary("Access configuration audit: NOT PASSED (" + str(len(total_problems)) + " problem(s))")
        sys.exit(1)
    summary("Access configuration audit: PASS — both hostnames have e-mail-only allow policies.")
    print("Access configuration audit: PASS")


def apply(emails, idp):
    include = [{"email": {"email": e}} for e in emails]
    pol_body = {"name": CFG["policy_name"], "decision": "allow", "include": include,
                "exclude": [], "require": [], "session_duration": CFG["session_duration"]}
    _, d = call("GET", "/access/policies?per_page=100")
    existing = [p for p in d["result"] if p.get("name") == CFG["policy_name"]]
    if existing:
        pid = existing[0]["id"]
        call("PUT", f"/access/policies/{pid}", pol_body)
        print("Updated reusable policy")
    else:
        _, d = call("POST", "/access/policies", pol_body)
        pid = d["result"]["id"]
        print("Created reusable policy")
    apps = list_apps()
    for want in CFG["apps"]:
        dom = want["domain"].lower()
        body = {"name": want["name"], "domain": dom, "type": "self_hosted",
                "session_duration": CFG["session_duration"], "app_launcher_visible": False,
                "policies": [{"id": pid, "precedence": 1}]}
        if idp:
            body["allowed_idps"] = [idp]
            body["auto_redirect_to_identity"] = True
        matches = [a for a in apps if dom in app_domains(a)]
        if matches:
            # also replaces any policies previously attached (e.g. by the Pages
            # "Enable access policy" toggle) with the single approved-email policy
            for a in matches:
                body["name"] = a.get("name") or want["name"]
                call("PUT", f"/access/apps/{a['id']}", body)
            print(f"Updated {len(matches)} application(s) for {dom}")
        else:
            call("POST", "/access/apps", body)
            print(f"Created application for {dom}")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "audit"
    emails = allowed_emails()
    print(f"Approved addresses: {len(emails)} (values withheld; logs are public)")
    o = org()
    print("Zero Trust organization found (auth domain ends with .cloudflareaccess.com: "
          f"{o['auth_domain'].endswith('.cloudflareaccess.com')})")
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a") as f:
            f.write("auth_domain=" + o["auth_domain"] + "\n")
    idp = otp_idp()
    if mode == "apply":
        apply(emails, idp)
    audit(emails, idp)


if __name__ == "__main__":
    main()

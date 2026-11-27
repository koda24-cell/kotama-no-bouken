#!/usr/bin/env python3
"""Select runtime-only files for the private Cloudflare Pages preview.

Starts from explicit HTML entry points, follows local references found in
HTML (src/href), CSS url()/@import and JS import/string literals, and copies
only those files to an output directory. Nothing outside the allowlisted
top-level roots is ever copied, even if referenced.

This is a static heuristic: paths built at runtime from variables may be
missed. The report lists every missing reference and external URL so that a
human (or browser test) can confirm the game actually works from the bundle.

Usage:
  python3 build_runtime_bundle.py --repo <checkout> --out <dir> [--report r.json]
  python3 build_runtime_bundle.py --repo <checkout> --dry-run
Exit code 1 if a hard limit is violated (file > 25 MiB, > 20,000 files,
Git LFS pointer, denied path).
"""
import argparse, json, os, re, shutil, sys, hashlib, posixpath
from urllib.parse import urlsplit, unquote

ENTRY_POINTS = ["index.html"]
# Top-level roots the runtime may ship from. Anything else is never copied.
# "preview" is allowed only because runtime code imports individual files from
# it (e.g. field-3d-b1-sacred-trial.js -> preview/f1-foliage-coverage.js);
# only referenced files are copied, never the whole folder.
ALLOWED_ROOTS = {"index.html", "style.css", "css", "data", "field", "assets",
                 "shared-3d-library", "preview"}
ALLOWED_ROOT_FILE_RE = re.compile(r"^[A-Za-z0-9_.-]+\.(js|css|html)$")
DENY_PARTS = {"docs", "references", "_trash", "tools", "prototypes",
              "render-output", "review-shots", ".github", ".git", "node_modules",
              # production evidence inside asset folders, not loaded by the game
              "verification", "renders", "metrics", "sources"}
DENY_FILE_RE = re.compile(r"(\.md|\.blend\d*|\.py|\.psd|\.kra|\.zip|\.7z|\.env|\.pem|\.key)$", re.I)
ASSET_EXT = ("js|mjs|css|html|json|png|jpe?g|webp|gif|svg|glb|gltf|bin|ktx2|hdr|exr|"
             "mp3|ogg|wav|m4a|woff2?|ttf|otf|txt|csv|wasm")
MAX_FILE = 25 * 1024 * 1024
MAX_FILES = 20000

HTML_ATTR = re.compile(r"""\b(?:src|href|data-src|poster)\s*=\s*["']([^"'#]+)["']""", re.I)
CSS_URL = re.compile(r"""url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']""")
JS_IMPORT = re.compile(r"""(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']""")
STR_PATH = re.compile(r"""["'`]((?:\./|\.\./|/)?[A-Za-z0-9_\-./%%]+\.(?:%s))(?:\?[^"'`]*)?["'`]""" % ASSET_EXT, re.I)
EXTERNAL = re.compile(r"""https?://[^\s"'`)<>]+""")


def classify_external(url):
    host = (urlsplit(url).hostname or "").lower()
    if "githack" in host or "raw.githubusercontent" in host or host == "github.com":
        return "repo_mirror"   # must be migrated before the repo goes private
    if host in ("cdn.jsdelivr.net", "unpkg.com", "esm.sh", "cdnjs.cloudflare.com"):
        return "cdn_library"
    return "other"


def is_denied(rel):
    parts = rel.split("/")
    if any(p in DENY_PARTS for p in parts):
        return True
    if DENY_FILE_RE.search(rel):
        return True
    top = parts[0]
    if len(parts) == 1:
        return not (top in ALLOWED_ROOTS or ALLOWED_ROOT_FILE_RE.match(top))
    return top not in ALLOWED_ROOTS


def is_lfs_pointer(path):
    try:
        with open(path, "rb") as f:
            return f.read(64).startswith(b"version https://git-lfs.github.com/spec/")
    except OSError:
        return False


def resolve(base_rel, ref):
    ref = unquote(ref.strip())
    if not ref or ref.startswith(("data:", "blob:", "mailto:", "javascript:", "#")):
        return None
    if re.match(r"^[a-z][a-z0-9+.-]*:", ref, re.I) or ref.startswith("//"):
        return None
    ref = ref.split("?")[0].split("#")[0]
    if not ref:
        return None
    if ref.startswith("/"):
        cand = ref.lstrip("/")
    else:
        cand = posixpath.join(posixpath.dirname(base_rel), ref)
    cand = posixpath.normpath(cand)
    if cand.startswith(".."):
        return None
    return cand


DIR_CONST = re.compile(r"""["'`]((?:\.\.?/)?[A-Za-z0-9_\-./]+/)["'`]""")
RUNTIME_FILE_RE = re.compile(r"\.(?:%s)$" % ASSET_EXT, re.I)
MAX_DIR_BYTES = 200 * 1024 * 1024


def dir_candidates(repo, script_rel, d):
    """A directory constant may be page-relative or script-relative."""
    out = []
    for base in ("", posixpath.dirname(script_rel)):
        c = posixpath.normpath(posixpath.join(base, d))
        if c.startswith("..") or c in (".", ""):
            continue
        # never pull in a whole top-level root such as assets/ or field/
        if c.count("/") < 1 or is_denied(c + "/x.png"):
            continue
        if os.path.isdir(os.path.join(repo, c)):
            out.append(c)
    return out


def scan(repo):
    queue = list(ENTRY_POINTS)
    seen, missing, denied, externals, hinted = set(), {}, {}, {}, {}
    dir_included, dir_skipped = {}, {}
    bare = set()
    try:
        im = re.search(r'<script type="importmap">(.*?)</script>',
                       open(os.path.join(repo, "index.html"), encoding="utf-8").read(), re.S)
        bare = set(json.loads(im.group(1))["imports"]) if im else set()
    except (OSError, ValueError, KeyError):
        pass
    while queue:
        rel = queue.pop()
        if rel in seen:
            continue
        seen.add(rel)
        path = os.path.join(repo, rel)
        if not rel.endswith((".html", ".js", ".mjs", ".css", ".json")):
            continue
        try:
            text = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for m in EXTERNAL.finditer(text):
            u = m.group(0).rstrip(".,;")
            externals.setdefault(u, {"kind": classify_external(u), "from": set()})["from"].add(rel)
        refs = []
        if rel.endswith(".html"):
            refs += HTML_ATTR.findall(text)
            for block in re.findall(r"<style[^>]*>(.*?)</style>", text, re.S | re.I):
                refs += [a or b for a, b in CSS_URL.findall(block)]
            for block in re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", text, re.S | re.I):
                refs += [a or b or c for a, b, c in JS_IMPORT.findall(block)]
                refs += STR_PATH.findall(block)
        elif rel.endswith(".css"):
            refs += [a or b for a, b in CSS_URL.findall(text)]
        elif rel.endswith((".js", ".mjs")):
            refs += [a or b or c for a, b, c in JS_IMPORT.findall(text)]
            refs += STR_PATH.findall(text)
        elif rel.endswith(".json"):
            refs += STR_PATH.findall(text)
        dir_hints = [d for d in DIR_CONST.findall(text) if not d.startswith("http")]
        if rel.endswith((".js", ".mjs")):
            # Runtime code often builds file names at run time from a directory
            # constant (BASE + name, new URL(name, DIR)). Ship that directory's
            # runtime-type files so dynamic loads do not 404.
            for d in dir_hints:
                for c in dir_candidates(repo, rel, d):
                    if c in dir_included or c in dir_skipped:
                        continue
                    picked, size = [], 0
                    for root, _, names in os.walk(os.path.join(repo, c)):
                        for n in names:
                            fr = posixpath.relpath(os.path.join(root, n), repo).replace(os.sep, "/")
                            if RUNTIME_FILE_RE.search(n) and not is_denied(fr):
                                picked.append(fr)
                                size += os.path.getsize(os.path.join(root, n))
                    if size > MAX_DIR_BYTES:
                        dir_skipped[c] = {"bytes": size, "from": rel}
                        continue
                    dir_included[c] = {"files": len(picked), "bytes": size, "from": rel}
                    queue.extend(x for x in picked if x not in seen)
        for ref in refs:
            if any(ref == b or (b.endswith("/") and ref.startswith(b)) for b in bare):
                continue  # resolved by the importmap (CDN), not a local file
            cand = resolve(rel, ref)
            if cand is None:
                continue
            full = os.path.join(repo, cand)
            if not os.path.isfile(full):
                # string literals are often relative to the page, not the script
                alt = posixpath.normpath(ref.split("?")[0].lstrip("./")) if not ref.startswith("/") else None
                hit = None
                if alt and os.path.isfile(os.path.join(repo, alt)):
                    hit = alt
                elif "/" not in ref:
                    # filename joined at runtime with a directory constant in the same file
                    for d in dir_hints:
                        c = posixpath.normpath(posixpath.join(d.lstrip("./") if d.startswith("./") else d, ref))
                        if not c.startswith("..") and os.path.isfile(os.path.join(repo, c)):
                            hit = c
                            hinted[c] = rel
                            break
                if hit:
                    cand, full = hit, os.path.join(repo, hit)
                else:
                    # JSON metadata (manifests, metrics) lists many non-runtime paths;
                    # follow what exists but only report misses from code/markup.
                    if not rel.endswith(".json"):
                        missing.setdefault(cand, set()).add(rel)
                    continue
            if is_denied(cand):
                denied.setdefault(cand, set()).add(rel)
                continue
            if cand not in seen:
                queue.append(cand)
    files = sorted(f for f in seen if os.path.isfile(os.path.join(repo, f)))
    # a reference is not missing if a directory include shipped it
    shipped = set(files)
    missing = {k: v for k, v in missing.items() if k not in shipped}
    return files, missing, denied, externals, hinted, dir_included, dir_skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out")
    ap.add_argument("--report")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    files, missing, denied, externals, hinted, dir_included, dir_skipped = scan(repo)
    errors, rows, total = [], [], 0
    for rel in files:
        p = os.path.join(repo, rel)
        size = os.path.getsize(p)
        total += size
        if size > MAX_FILE:
            errors.append("over 25 MiB: " + rel)
        if is_lfs_pointer(p):
            errors.append("Git LFS pointer (real file not present): " + rel)
        if is_denied(rel):
            errors.append("denied path selected: " + rel)
        rows.append({"path": rel, "bytes": size,
                     "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()})
    if len(files) > MAX_FILES:
        errors.append("more than 20,000 files")
    report = {
        "entry_points": ENTRY_POINTS,
        "file_count": len(files),
        "total_bytes": total,
        "largest": sorted(rows, key=lambda r: -r["bytes"])[:10],
        "missing_references": {k: sorted(v) for k, v in sorted(missing.items())},
        "resolved_via_directory_constant": dict(sorted(hinted.items())),
        "included_directories": dir_included,
        "directories_too_large_not_included": dir_skipped,
        "denied_references_not_copied": {k: sorted(v) for k, v in sorted(denied.items())},
        "external_urls": {k: {"kind": v["kind"], "from": sorted(v["from"])} for k, v in sorted(externals.items())},
        "errors": errors,
        "files": rows,
        "note": "Static scan. Runtime-built paths can be missed; a signed-in browser test is still required.",
    }
    if a.report:
        with open(a.report, "w") as f:
            json.dump(report, f, ensure_ascii=False, indent=1)
    kinds = {}
    for v in externals.values():
        kinds[v["kind"]] = kinds.get(v["kind"], 0) + 1
    print(f"files={len(files)} total_bytes={total} missing={len(missing)} "
          f"denied={len(denied)} external={kinds} errors={len(errors)}")
    for e in errors:
        print("ERROR", e)
    if errors:
        return 1
    if a.out and not a.dry_run:
        out = os.path.abspath(a.out)
        if os.path.exists(out):
            shutil.rmtree(out)
        for rel in files:
            dst = os.path.join(out, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(os.path.join(repo, rel), dst)
        with open(os.path.join(out, "_headers"), "w") as f:
            f.write("/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

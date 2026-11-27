"""Extract existing Kotama repository and Pages links from local text records."""

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit

OWNER = "koda24-cell"
REPOSITORY = "kotama-no-bouken"
RAW_HOSTS = {"raw.githack.com", "rawcdn.githack.com", "raw.githubusercontent.com"}
PAGES_HOST = f"{OWNER}.github.io"
URL_PATTERN = re.compile(r"""https://[^\s<>"'`()\[\]\\]+""")
COMMIT_PATTERN = re.compile(r"[0-9a-f]{40}", re.IGNORECASE)


def classify(url):
    parsed = urlsplit(url)
    if parsed.netloc.lower() in RAW_HOSTS:
        prefix = f"/{OWNER}/{REPOSITORY}/"
        if not parsed.path.startswith(prefix):
            return None
        ref_and_path = parsed.path[len(prefix):]
        if "/" not in ref_and_path:
            return None
        ref, path = ref_and_path.split("/", 1)
        # A branch may contain '/', so the original tail remains authoritative.
        kind = "commit" if COMMIT_PATTERN.fullmatch(ref) else "ref_or_path"
        return kind, unquote(ref_and_path), Path(unquote(path)).suffix.lower()
    if parsed.netloc.lower() == PAGES_HOST:
        root = f"/{REPOSITORY}"
        if parsed.path == root or parsed.path.startswith(root + "/"):
            return "pages", unquote(parsed.path), Path(unquote(parsed.path)).suffix.lower()
    return None


def inventory(files):
    matches = defaultdict(set)
    for source in files:
        with source.open(encoding="utf-8") as handle:
            for number, line in enumerate(handle, 1):
                for match in URL_PATTERN.finditer(line):
                    url = match.group().rstrip(".,;")
                    if classify(url):
                        matches[url].add(f"{source}:{number}")
    return [
        {
            "url": url,
            "target_kind": kind,
            "target": target,
            "extension": extension,
            "sources": sorted(matches[url]),
        }
        for url in sorted(matches)
        for kind, target, extension in (classify(url),)
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", type=Path, nargs="+", help="UTF-8 text or exported GitHub records")
    args = parser.parse_args()
    print(json.dumps(inventory(args.files), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

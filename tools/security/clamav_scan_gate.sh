#!/usr/bin/env bash
# Fail-closed ClamAV gate. Run after EVERY third-party download, before unpack/execution,
# and again on generated GLB/PNG/Blend candidates. Do not treat it as a safety certificate.
set -Eeuo pipefail
usage() {
  echo "Usage: bash tools/security/clamav_scan_gate.sh update LOG_DIR | scan TARGET LOG_FILE" >&2
  exit 64
}
[[ $# -eq 2 || $# -eq 3 ]] || usage
mode="$1"
if [[ "$mode" == "update" && $# -eq 2 ]]; then
  out="$2"
  mkdir -p "$out"
  command -v clamscan >/dev/null || { echo "ClamAV unavailable" >&2; exit 1; }
  command -v freshclam >/dev/null || { echo "freshclam unavailable" >&2; exit 1; }
  clamscan --version | tee "$out/clamav-version.txt"
  : > "$out/freshclam.log"
  updated=0
  for attempt in 1 2 3; do
    echo "freshclam attempt $attempt" | tee -a "$out/freshclam.log"
    if freshclam --stdout 2>&1 | tee "$out/freshclam-attempt-$attempt.log" | tee -a "$out/freshclam.log"; then
      # freshclam can exit 0 after successfully updating definitions while still
      # printing an ERROR (e.g. a missing clamd notification target).
      if grep -Eq '(^|[[:space:]])ERROR:' "$out/freshclam-attempt-$attempt.log"; then
        echo "FAIL: freshclam reported an error despite exit code 0" | tee -a "$out/freshclam.log"
      else
        updated=1
        break
      fi
    fi
    if [[ "$attempt" -lt 3 ]]; then sleep 10; fi
  done
  [[ "$updated" -eq 1 ]] || { echo "FAIL: ClamAV definitions not refreshed" >&2; exit 1; }
  [[ -n "$(find /var/lib/clamav -maxdepth 1 -type f \( -name '*.cvd' -o -name '*.cld' \) -print -quit)" ]] || {
    echo "FAIL: No ClamAV signature database found" >&2; exit 1;
  }
  echo "DEFINITIONS_UPDATED" > "$out/definition-status.txt"
elif [[ "$mode" == "scan" && $# -eq 3 ]]; then
  target="$2"
  log="$3"
  [[ -e "$target" ]] || { echo "FAIL: scan target missing: $target" >&2; exit 1; }
  [[ -f /var/lib/clamav/daily.cvd || -f /var/lib/clamav/daily.cld ]] || {
    echo "FAIL: daily virus definitions missing" >&2; exit 1;
  }
  mkdir -p "$(dirname "$log")"
  : > "$log"
  # pipefail makes malware findings (exit 1) and scan errors (exit 2) fatal.
  clamscan --recursive --infected --stdout "$target" 2>&1 | tee "$log"
  grep -Eq '^Infected files: 0[[:space:]]*$' "$log" || { echo "FAIL: nonzero infection count" >&2; exit 1; }
  awk '/^Scanned files:/ { if ($3 > 0) good=1 } END { exit !good }' "$log" || {
    echo "FAIL: no files actually scanned" >&2; exit 1;
  }
  if grep -Eq '^Total errors: [1-9]|(^|[[:space:]])ERROR:' "$log"; then
    echo "FAIL: scan reported errors" >&2
    exit 1
  fi
  echo "SCAN_PASS: $target"
else
  usage
fi

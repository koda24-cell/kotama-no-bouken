#!/usr/bin/env bash
set -euo pipefail
: "${RUN_ID:?source run ID required}"
: "${ASSET:?asset required}"
[[ "$RUN_ID" =~ ^[0-9]+$ ]] || { echo "Invalid run ID"; exit 1; }
case "$ASSET" in cart|furnace|mine-rig) ;; *) echo "Invalid asset"; exit 1;; esac
repo="${GITHUB_REPOSITORY:?}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Reject runs from other workflows/branches and runs that did not succeed.
json="$(gh api "repos/$repo/actions/runs/$RUN_ID")"
status="$(jq -r .conclusion <<<"$json")"
branch="$(jq -r .head_branch <<<"$json")"
workflow="$(jq -r .path <<<"$json")"
[[ "$status" == success && "$branch" == feature/b4-docker-batch-render-20261112 && "$workflow" == .github/workflows/b4-docker-batch-render.yml ]] || {
  echo "Source run must be successful B4 Docker Batch Render on the approved feature branch"; exit 1;
}
gh run download "$RUN_ID" -R "$repo" -n b4-blender-docker-batch -D "$tmp"
glb="$tmp/b4-$ASSET-after.glb"
[[ -s "$glb" ]] || { echo "Missing nonempty GLB"; exit 1; }
# glTF binary header validation: glTF magic, version 2.
[[ "$(head -c 4 "$glb")" == glTF ]] || { echo "Invalid GLB magic"; exit 1; }
[[ "$(od -An -tu4 -j4 -N4 "$glb" | tr -d ' ')" == 2 ]] || { echo "Unsupported GLB version"; exit 1; }
dest="assets/models/floor4"
review="$dest/reviews/$ASSET"
mkdir -p "$review"
cp "$glb" "$dest/$ASSET.glb"
for angle in front side angle; do
  png="$tmp/b4-$ASSET-after-$angle.png"
  [[ -s "$png" ]] || { echo "Missing $angle render"; exit 1; }
  [[ "$(od -An -tx1 -N8 "$png" | tr -d ' \n')" == 89504e470d0a1a0a ]] || { echo "Invalid PNG: $angle"; exit 1; }
  cp "$png" "$review/$angle.png"
done
printf 'Source: https://github.com/%s/actions/runs/%s\nAsset: %s\nApproval: workflow_dispatch APPROVE\n' "$repo" "$RUN_ID" "$ASSET" > "$review/SOURCE.txt"
echo "Validated and staged $ASSET. No game runtime files changed."

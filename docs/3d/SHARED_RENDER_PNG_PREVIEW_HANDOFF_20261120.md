# ChatGPT-accessible 3D PNG review previews (2026-11-20)

State: implementation candidate; publishing and actual image visibility require successful pilot evidence.

## Rationale
The installed GitHub connector can inspect Actions artifact metadata but does not provide a binary ZIP download to this chat. A successful render does not mean the artist has seen the PNG.

## Design
Following a render job's successful model/hash and ClamAV checks, a separate Ubuntu job downloads its artifact, validates the real PNG signatures and manifest SHA-256 entries, then publishes ONLY the PNG plus review-manifest.json on a new parentless Git branch `render-preview/run-RUNID-ATTEMPT`. This branch is not based on development or main, is NOT_APPROVED and must NEVER be merged. GLB, Blend and PBR sources remain in temporary Artifacts. GitHub Actions GITHUB_TOKEN gets `contents: write` only in publisher job; render job keeps minimal access. A failed publisher cannot change the source model.

Image URLs look like `https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-RUNID-ATTEMPT/front.png`; workflow logs and Job Summary provide links and Markdown image previews.

**Important:** The public repository's raw PNG links are public. Use only content permitted to share publicly; do not publish restricted third-party or private art. Git preview branches retain history until explicitly cleaned up. Existence of a raw URL does not guarantee that a particular ChatGPT chat can render remote images inline.

## Sample caller
The shared reusable workflow must exist in the caller's commit (merge reviewed implementation to development, then update target branches deliberately).

```yaml
  publish-preview:
    needs: render
    if: ${{ needs.render.result == 'success' }}
    uses: ./.github/workflows/shared-render-preview-publish.yml
    with:
      artifact_name: b5-gothic-culet-v1-NOT-APPROVED
      artifact_subdirectory: render-output/b5-knights/gothic_culet_v1
    permissions:
      contents: write
      actions: read
```

No `gh` CLI is required. Publisher uses built-in Node fetch to GitHub Git Objects API. If other Blender Docker checkpoint recovery workers fail with `gh: not found`, that is a separate environment dependency failure. Fix their GitHub API transport (host runner or separately verified client) and revalidate checksum and recovery; do not claim checkpoint corruption without evidence.

## Pilot
- B5 knight culet PR #627, initial render success run #44519420889.
- Render-preview publisher added to same production-isolated feature branch; pilot run #44681535827.
- Do not call this broadly active until image links from completed pilot are verified.

## Actual pilot verification (2026-11-20)
- Run [#44681535827](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44681535827): render job **success** (Blender actual six-view render, output SHA verification, source/output ClamAV scan, artifact upload).
- Follow-on `Publish verified PNG-only review link` job **success**, artifact downloaded by `actions/download-artifact` and Node publisher wrote Git Objects with `GITHUB_TOKEN`. **No `gh` CLI was needed.**
- Verified the exact new branch `render-preview/run-44681535827-1` through GitHub Contents API; it contains front.png, left.png, right.png, angle.png, back.png, top.png and review-manifest.json (seven files total), with no GLB/Blend/PBR data.
- [Front PNG](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44681535827-1/front.png) / [Left PNG](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44681535827-1/left.png) / [Angle PNG](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44681535827-1/angle.png) / [Back PNG](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44681535827-1/back.png) / [Top PNG](https://raw.githubusercontent.com/koda24-cell/kotama-no-bouken/render-preview/run-44681535827-1/top.png).
- End-to-end **pilot-specific** PNG publishing is verified. **Shared reusable workflow_call on development and automatic use by all workflows remain NOT_DEPLOYED / NOT_VERIFIED.** Link existence/byte size was checked with GitHub metadata, but pixel-level artistic visual judgement was not conducted in this chat.
- Separate checkpoint-restoration worker with `gh: not found` has NOT been modified or verified by this PNG publisher change. Fix/test it independently.

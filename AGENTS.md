# AI collaboration instructions — コタマのぼうけん

This file is an entry point for ChatGPT, Claude and other AI development sessions.

## Shared Blender 5.3 default for all current and future 3D work (2026-11-20)

- **Default**: Use the proven GitHub Actions Blender **5.3.0 + ClamAV** pinned Docker environment for all new 3D model/render tasks, regardless of ChatGPT normal/Work or AI assistant. Do not claim any particular chat has Blender MCP or direct workflow dispatch permissions.
- **Start of each task**: inspect `development`, this `AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/ASSET_PROMOTION_POLICY.md`, and `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md`; locate the actual current asset branch/PR and workflow. Preserve all prior assets and functionality.
- **Reusable gateway**: after it is reviewed, merged into `development`, and successfully tested, use `.github/workflows/shared-blender53-render.yml` as the common `workflow_call` entry. Follow `docs/3d/SHARED_BLENDER53_ALL_BRANCHES_ROLLOUT.md`. Do **not** describe this gateway as deployed or verified before that happens.
- **New branches**: branch from `development` and add a task-specific push-triggered caller for the actual Blender script. Trigger on relevant script/workflow paths, **not every repository push**. If the gateway is not yet integrated, continue using a proven branch-local workflow.
- **Existing branches**: migrate their workflows only after comparing their current script, output paths, container compatibility and existing successful runs. Never bulk overwrite branch contents, switch all legacy Blender versions without QA, or auto-merge.
- **Verification**: inspect actual GitHub Actions run ID, job status/logs, Blender version, ClamAV input/output scan results, generated multi-angle PNG and GLB/Blend, hashes and Artifacts. A committed workflow or successful step alone is not evidence of visual quality.
- **Security and approval**: scan external downloads immediately before extraction, extracted contents before Blender import, and outputs before use. Keep new GLB/PNG as `NOT_APPROVED` until the user has reviewed images; never automatically promote into game assets or `main`.
- **Execution limitations**: GitHub Actions is not an always-running PC. A reusable workflow must be called from an eligible workflow; adding this rule to AGENTS does not itself install or trigger a workflow on every existing branch. `workflow_dispatch` may require default-branch registration; do not alter `main` merely to expose it.
- **Cross-chat handoff**: use the latest source files, PR and run evidence in GitHub, not a previous assistant's unsupported success claim. When push runs are missing from PR-only queries, inspect GitHub Actions REST run collections.

## Start here
1. Read `docs/3d/BLENDER_DOCKER_HANDOFF.md` for 3D asset creation, Blender Docker render, workflow URLs, verification and troubleshooting.
2. Inspect the latest GitHub `development` branch, related feature branches and PRs before editing. Do not assume a previous chat's state is current.
3. Preserve all existing game functionality, assets, combat logic, save data and stage presentation. Avoid editing shared runtime files for standalone asset experiments.
4. Work in isolated feature branches; prepare PRs against `development`. Never merge into `main` without explicit user authorization.
5. Treat rendered screenshots and GLBs as evidence only after actual successful workflow/artifact verification; do not claim a render succeeded from code commits alone.

## 3D visual-quality-first performance policy (all stages)
For all new and revised 3D models, prioritize distance- and screen-size-based LOD, only loading and rendering visible/needed data, material/geometry batching, and draw-call reduction **without sacrificing near-view quality or changing gameplay/collisions**. See `docs/3d/GLOBAL_3D_LOD_PERFORMANCE_POLICY.md`. This is a design requirement, **not** a claim that every feature is currently implemented. Test with actual PNG/GLB and game frame statistics before promotion.

### Shared GitHub Actions as the default optimization validation path
When building or revising a 3D asset, run the available reusable `Shared 3D GLB Performance Audit` on its actual GLB (or record why it cannot be run). For heavy vegetation, prefer the non-destructive material-group foliage batching review; for opaque rigid static props, use the separate rigid LOD review; for tree far distance, use the multi-view impostor-bake review. Always compare original vs optimized multi-view PNG/GLB and manifest. Full setup and verified runs: `docs/3d/SHARED_3D_ACTIONS_OPTIMIZATION_PLAYBOOK.md`. Do not insert any unapproved candidate into gameplay. Separate measured performance from source-file/structural statistics, and do not claim that Actions automatically optimize every asset without selecting a supported category.

## Default auto-optimization workflow for every floor
After generating a GLB, run the available cross-floor auditing/LOD review Actions and capture the output, following `docs/3d/ALL_FLOOR_AUTO_OPTIMIZATION_HANDOFF.md`. Keep high-quality originals and all approval requirements; automatic processing means report and **unapproved candidates**, never silently replace gameplay models. For foliage, transparent water/magma/VFX, characters or collision-critical models, use specialized optimization rather than automatic decimation. The user's normal modeling instructions do not need to mention optimization separately.

## Stage 4 3D asset policy
Volcanic cave, magma, abandoned mine, mining carts, pickaxes, ore, rocky obstacles, ruined equipment. Improve silhouettes and geometry by ADDING detail to existing models, not replacing/removing original geometry. Render actual models before and after modifications, preferably front/side/angle views. Use screenshots to guide subsequent improvements.

## Other stages
Stage 2: ice/water source. Stage 3: overgrown ruined city. Stage 5: abyssal ruined castle/temple. Keep each stage's identity distinct.

## Handoff
When continuing from a different chat, explicitly inspect `docs/3d/BLENDER_DOCKER_HANDOFF.md`, PR #252 and PR #253, plus current GitHub Actions runs. Do not assume automation or workflow is operational until checked.

## 3D handoff: Claude cannot operate Blender (mandatory for every session)
- Claude's role is **GLB/PNG consumer and game integration**, not Blender modeling/rendering. Do not instruct Claude to open .blend files, run Blender, edit Blender scenes, or visually inspect a 3D asset in Blender.
- GPT/Blender-capable workflows produce the approved `.glb` plus actual `front/side/angle` (and `top` where available) PNG renders and a machine-readable `manifest.json` with file hashes, source commit, workflow run, and approval status.
- Claude must first check the asset manifest and PNG previews, load the GLB directly in the browser via Three.js/GLTFLoader, and check size/origin/materials/tile seams/performance. If modeling or new renders are needed, hand the request back to GPT/Blender workflow rather than claiming to perform Blender work.
- Do not rely on expiring Actions Artifacts as permanent storage. Check that approved GLB/PNG are committed to the repository; if missing, report that they are not yet permanently saved.
- For floor 6 meadow V7, read `docs/3d/F6_MEADOW_V7_CLAUDE_HANDOFF.md` and `docs/3d/F6_COMPLETED_ASSETS.md`.

## B5 gloom 3D tooling and lessons (required for B5 corruption-rock work)
Before modifying B5 gloom/corruption rock or reusing its Blender tools, read `docs/3d/B5_GLOOM_TOOLS_AND_LESSONS.md`. It records CC0 scan sources, Blender/Actions workflows, verified versus unverified resources, V4–V10 failures, and Claude handoff. Preserve existing meshes; do not promote unfinished prototype assets.

## Shared tool/addon information: immediate registration (mandatory)
- Before any 3D, 2D, animation, music, texture or AI tool work, read `docs/3d/TOOLING_AUTO_SHARE_POLICY.md` and `docs/3d/SHARED_TOOLING_CATALOG.md` (and the applicable domain docs).
- When discovering or introducing a new tool, add-on, texture source, helper or technique, **record and share it immediately during the current task**; do not wait for model completion or visual approval. Information-only changes should be promptly merged to `development` through a reviewable PR if safe. Do not auto-merge unverified executable code, assets or game changes.
- After actual installation, execution, Blender render, licensing check or failure, append verification details, evidence URLs and status to the same catalog entry. Never claim unverified integration.
- This is an in-session workflow rule, not a claim that cross-chat background monitoring is already installed.

## Shared VFX reference and reuse
- Before implementing smoke, mist, fog, miasma or battle particles for any floor, read `docs/3d/VFX_TOOL_CATALOG.md` and `docs/3d/VFX_CC0_ASSET_LIBRARY_20261115.md`. Distinguish user-supplied visual references from redistributable CC0 assets. Reuse the shared VFX preset design rather than duplicating effects per floor.

## Shared Blender execution entrypoint (all ChatGPT / Work / Claude sessions)
- Before continuing any Blender automation or rendering across chats, read `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` and follow its links to the **latest** applicable branch/PR and run.
- GitHub Actions Blender rendering and job-to-job checkpoint resume have verified examples. Dedicated Blender MCP is **not automatically available** in every ChatGPT session; API-driven vision aesthetic revision is **not yet verified/connected**.
- Use draft/unapproved assets only for review, never promote them without explicit user approval; preserve base meshes and distinguish technical QA from artistic acceptance.

## Interruption-safe incremental 3D saves (mandatory)
Do not attempt to handle the ChatGPT stop button after it is pressed; a stopped response cannot trigger a final save. Instead commit small source changes, save each verified Blender iteration and manifest/checkpoint before starting the next, and keep GitHub Actions jobs independently resumable where implemented. Do **not** enforce early session termination solely to anticipate GPT timeout. See `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` section 「中断耐性と先行チェックポイント保存」. Keep all unapproved assets outside production promotion.

## Assassin head continuation: prevent legacy-source regression (2026-11-19)
For new Assassin character head modeling/renders, **never use the standalone old Assassin head prototypes** in PR #309, #310, #313, or #513, including `tools/assassin-bare-head/` and `tools/assassin-rebuild/`, as the source mesh, shape reference, or the alleged latest render. Retain those files only as historical archives; do not delete or merge them as current geometry.
Current source of truth: `feature/gpt-character-mesh-reference-study-20261116` and `docs/3d/research/ASSASSIN_HEAD_V18_REFERENCE_STUDY_20261118.md`, based on original Shibu Face component 5 (36-vertex rim). V16/V17 review models may be examined **only to document known defects and regressions**, not copied as final geometry. V18 is not yet built; first validate actual Shibu 36-point rim JSON, gather anatomy references, design anatomically sound patches, then render at six angles. Always label renders by model version and exact source branch/commit/run. Pinterest handoff: `koda24-cell/pinterest-reference-library/handoff/assassin-head-v18-anatomy.md`.

## Assassin V18 native Body source recovery (2026-11-19) — overrides procedural posterior study
**Before starting any new Assassin posterior-head modeling, read** `docs/3d/research/ASSASSIN_V18_NATIVE_BODY_SCALP_SOURCE_20261119.md`. Actual source VRM Shibu `Body` already contains the intact round back of the head and nape. Do **not** synthesize a full rear skull from the `Face` 36-rim, and do not copy V18 A-F procedural failures. Successful Blender source audit runs #44446328687, #44446953188, #44447509958 show 34/36 Face rim points within 1mm of Body triangles, with exactly two mirrored outliers ~8.22mm near ears. Preserve native Face+Body shape, inspect local seam and normals, and only patch isolated mismatches after verifying real closeups. No mesh/texture/model public promotion before Shibu-specific licensing and explicit user approval.

## Assassin original modeling end goal (2026-11-19, USER-CORRECTED; supersedes the 'retain native Shibu Body as final mesh' interpretation)
The user’s **actual final goal is an independently modeled original Assassin head, created from scratch**. Shibu/Vita `Body` and `Face` are **temporary anatomical measurement and visual references only**; they must **not** be the final production head or be copied directly as output geometry. The previous Shibu Body recovery is a valuable *reference audit*, not a permanent geometry directive.
Build a separately versioned original rear cranium first, then own temporal/ear/face/jaw/neck pieces, review front/side/back/oblique actual Blender renders and QA each stage, and progressively replace any reference-only components as original parts pass visual quality. Avoid rejected V18 A-F cap topology and full jaw-to-back caps. Preserve existing game models, previous research and all unrelated features; use isolated branch/Draft PR, and do not promote incomplete parts or merge to main without explicit approval. Current original experiment: `feature/gpt-assassin-original-occiput-v1-20261119`, PR #570. Shibu-specific material licenses remain unverified.

## Browser verification URLs for all AI chats (2026-11-24)

- When presenting a playable browser verification link for this repository, **prefer a fixed commit-SHA raw.githack.com URL** rather than a moving branch URL, GitHub blob URL, or GitHub Pages URL:
  `https://raw.githack.com/koda24-cell/kotama-no-bouken/<full-commit-SHA>/<path-to-HTML>`
- For the full game use `index.html`; for a task-specific preview use the relevant existing `preview/*.html` entry point. Preserve supported query parameters (for example `?floor=0`) if needed.
- Before submitting a link, verify that the commit exists and the target HTML is present at that exact commit; verify referenced assets where practical. Use the merged `development` commit SHA after integration, or clearly label a feature-branch commit as a pre-merge preview.
- Give a directly clickable URL and identify what it opens. Do not claim that the browser, audio, or rendering was tested unless it was actually tested. A file-existence check alone does not establish runtime behavior.
- This is a shared convention for **ChatGPT, Claude, Codex, and future sessions**. Follow it for all game and HTML preview handoffs.


## 全3D制作の進捗サイト共有（2026-11-24）
全AI・全チャット・全作業ブランチの3Dモデル、壁・天井・小部品、設計図を [独立進捗リポジトリ](https://github.com/koda24-cell/kotama-3d-progress) に集約する。作業前に同Repoの AGENTS.md を確認。未マージ・未承認も公開許可と安全検査を満たす場合は状態を明示して掲載する。各正常レンダリング・設計出力・途中チェックポイントごとに安定ID、版、run ID、元commit、日時、公開許可を添えて登録し、失敗時は前回正常画像を保持する。自動登録未対応の場合は手動登録または未登録の引継ぎを行い、実行未確認を完了と報告しない。正式素材承認は別。ゲーム本体に旧ギャラリー・公開台帳を再設置しない。

## GitHub connector recovery (PR #794, 2026-11-26)
- Work on one feature at a time. After a write error, verify the actual remote commit/PR state before retrying; never report success without evidence.
- Observed: ordinary PR creation repeatedly returned `The tool failed internally` despite a valid one-commit diff and repository push permission. Draft PR creation followed by mark-ready succeeded. Use this fallback when normal creation fails; check for duplicate PRs first.
- Observed: normal merge returned `ReadTimeout`, then HTTP 405 `Merge already in progress`, although PR #794 remained open, clean and checks passed. After checking state and expected head SHA, squash merge succeeded (18b0008339ae0e5ea395187dacfdcd0137e4dc24). For an isolated feature, use squash as a fallback when checks and permissions allow; preserve required checks and branch policy. Do not repeatedly submit identical failing requests.
- Root cause and exact connector timeout remain unknown. Do not claim authentication failure or GitHub outage without evidence. Distinguish runtime testing from code integration; user performs game UI testing when requested. Keep main untouched.


## Game/Three.js visual review publication (GPT / Claude / Codex, all floors)
- When a 3D change is produced directly in Three.js or the game (including individual objects, walls, floor, ceiling, layout, VFX and shaders), capture actual browser screenshots and commit them under `docs/3d/<review-directory>/`. Do not substitute source textures, reference photos, mockups or synthetic screenshots.
- After verifying public-review permission, source/licence, safe image files and actual rendering, append a review entry to `docs/3d/scene-review-index.json` in the same development PR (or a small follow-up). The gallery reads this catalog automatically; no gallery HTML edit is required. Do not add screenshots that have not been checked. If unavailable, record missing images in the handoff and continue production.
- Copy the existing entry format. Use stable `id` per object or scene, unique `version`, floor 1–6, author, UTC `updated_at`, full immutable `source_sha` of the commit containing the actual images and linked files, PR number, `public_review: true`, `approval: "NOT_APPROVED"`, `kind: "scene"` or `"asset"`, and `images: [{path,label}]`. Optional `assets` (source links), `design`, `preview`. Paths must be repo-relative, images must be PNG/JPG/JPEG under docs/3d. Never use external URLs. Commit screenshots first, then use that commit SHA in the catalog; preserve previous version entries. Merge only to development, not main.
- This catalog is a publication manifest, not a second gallery. The site lives at koda24-cell/kotama-3d-progress. Browser screenshots and isolated Three.js asset views remain separate from Blender PNG/GLB and AI review statistics. Publication does not approve a model for formal game asset promotion. For unmerged branches, keep review evidence and note pending publication until development integration.


## 制作者による成果物の直接保存・開発確認サイトへの反映（2026-11-26 ユーザー指示・最優先）
**Claude は制作した成果物を自分で保存・掲載する担当者である。自動収集や GPT の後追い登録を待ってはならない。** GPT・Codex にも同じ原則を適用する。従来の自動収集待ち・自動台帳取得を前提とする記述より本節を優先する。

1. 第1〜6層、キャラクター、壁・床・天井・小物・装備・VFX・シェーダー・迷宮全景を含め、制作したものは規模を問わず、制作コード、編集可能な元データ（存在する形式のみ）、実際の確認画像、設計資料を作業ブランチのGitに保存する。Three.js制作物に存在しないGLB/Blendを捏造しない。
2. できた単体素材ごとに、可能なら正面・側面・斜め、ゲーム空間は代表地点を実際に描画・撮影する。制作途中でも検査済みの区切りごとに保存し、最終完成を待たない。画像未取得なら未取得と明示する。作品全景だけで個別素材の確認を済ませない。
3. 撮影画像の公開可否・出典・安全性を確認し、`docs/3d/<review-directory>/` にコミットする。既存の `docs/3d/scene-review-index.json` に安定ID、版、階層、担当、日時、元コミット、PR、画像パス、公開可否、承認状態を追記する。旧版を消さない。Artifactsのみの保存やチャット内の画像だけでは保存完了ではない。
4. **制作者自身が `koda24-cell/kotama-3d-progress` にアクセスし、同RepoのAGENTS.mdに従い、確認サイトへの掲載まで行う。** Three.js/ゲームの実画像は既存の `main/index.html` のゲーム内制作レビュー欄に元コミット固定の画像リンク・名称・版・出典・制作担当を追加する（第5層V6の既存掲載方式を参照）。必要に応じ同欄を階層・個別素材・版ごとに整理する。Blender画像は既存の検査済みPNG登録手順を使用する。画像リンクの到達性、PRのブラウザ検査、公開版への反映を確認する。自動巡回機能の実装を待つ必要はない。
5. 各作業報告に元コード/画像の保存先、元PR、進捗サイト掲載PRと状態を記す。書込権限や安全確認不足で掲載できない場合のみ、理由・画像の保存先・未掲載を明示して引き継ぐ。公開レビューはゲーム採用承認ではなく、未承認の正式素材昇格は禁止。ゲーム本体のmainは変更しない。


## イラスト制作の直接保存・確認サイト登録（2026-11-26）
- GPT・Claude・Codexはコタマ用の立ち絵、敵・ボス、背景、タイトル、UI、アニメーション・GIFを制作したら、公開可否を確認して元画像を適切な assets 配下へ保存し、制作担当自身が `koda24-cell/kotama-3d-progress` の `illustrations.json` に登録する。確認サイト `illustrations.html` で閲覧できるよう掲載PR・表示検証まで行う。自動収集を待たない。
- 固定コミット、安定ID、名称、分類、版、使用参照の有無、承認状況、担当、原本パスを記録する。同一絵のPNG/WebPはまとめ、別ポーズ・別版は別IDで保存し旧版を残す。確認できない権利や承認は未確認とする。非公開資料・Notion/Pinterestの参考画像は公開しない。ゲーム内への採用承認と閲覧用台帳登録は別。
- サイト側のAGENTS.mdの登録仕様を確認し、元PRと掲載PRを報告する。制作・保存・掲載の未実施は明記する。

## 「確認サイトを更新して」＝非公開開発版の更新手順（2026-11-27、GPT・Claude・Codex 共通）
- 確認サイト（非公開開発版）: https://kotama-private-probe-20261127.pages.dev （パスワード認証。中身の一覧は `/preview-info.html`）。raw.githack に代わる動作確認URL。パスワードは GitHub Secret `PREVIEW_PASSWORD` にのみ存在し、チャット・ログ・リポジトリに書かない。
- 中身は **development ＋ 選択した open PR**。選択は `tools/cloudflare-preview/preview-sources.json`（既定 `mode: label` → ラベル `preview` 付き PR。`all` で development 宛の全 open 非draft PR、`none` で development のみ）。競合する PR は自動で除外され、run の Summary と `/preview-info.html` に表示される。development・main には何もマージしない。
- ユーザーに「確認サイトを更新して」と言われたら: (1) 指示された PR に `preview` ラベルを付ける（指示がなければ現状維持）、(2) development の最新コミットの上で `tools/cloudflare-preview/refresh-stamp.txt` に現在時刻を書いた1コミットを作り、`git push --force origin HEAD:refs/heads/preview/refresh`（同じSHAをそのまま push しても workflow は起動しないため。実行時は常に最新の development を使う。run 46015813140 で動作確認済み）、(3) workflow `Cloudflare private dev preview` の run を確認（gate-before / deploy / gate-after がすべて success）、(4) 含めた PR・除外した PR・run URL を報告。run 未確認で「更新した」と言わない。
- **手動更新専用（2026-11-28 ユーザー方針）**: development や main への push・PR マージで確認サイトを更新しない。明示的な「確認サイトを更新して」の依頼時のみ `preview/refresh` の refresh-stamp を変更して配信。緊急停止は変数 `KOTAMA_GAME_PREVIEW_ENABLED` を `true` 以外に。通常の開発・素材制作 Actions は変更しない。
- 配信ファイルは `tools/cloudflare-preview/build_runtime_bundle.py` が runtime の参照から選別する。新しい素材が表示されない場合は run の Artifact `bundle-report` の `missing_references` を確認し、選別ツールを直す（日本語・空白入りファイル名も対象）。
- 詳細: `docs/CLOUDFLARE_ACCESS_SETUP.md`。

# Claude entry point — コタマのぼうけん

Read `AGENTS.md` first. For all tooling, add-ons, animation, textures, Blender, 2D and music tasks, **before starting**, read:
- `docs/3d/TOOLING_AUTO_SHARE_POLICY.md`
- `docs/3d/SHARED_TOOLING_CATALOG.md`
- `docs/3d/STYLIZED_GAME_TECH_LIBRARY.md` for stylized/3D work
- `docs/3d/BLENDER_DOCKER_HANDOFF.md` and `docs/3d/ASSET_PROMOTION_POLICY.md` for 3D assets

When you discover a new useful tool/technique, register it **immediately in the shared catalog** through a docs-only PR to development; update that entry with real validation, logs, licensing, environment and result after testing. Do not silently treat unverified tools as installed or approved. GPT and Claude share the same catalog. Claude should use GLB/PNG/manifest to review Blender output and request Blender rendering from a capable workflow; do not claim direct Blender operation if unavailable.

For Pinterest reference collection, first read `https://github.com/koda24-cell/pinterest-reference-library` AGENTS.md and follow that repo's handoff procedures.

## Claude: verified shared Blender 5.3 execution (2026-11-20)

For all new 3D work, **use the same GitHub Actions Blender 5.3.0 + ClamAV environment as GPT**. This is a repository workflow, not a Claude-specific MCP or local PC connection.

1. Before changing any asset, read `AGENTS.md`, `docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md`, `docs/3d/SHARED_BLENDER53_ALL_BRANCHES_ROLLOUT.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, and `docs/3d/ASSET_PROMOTION_POLICY.md`. Inspect the latest `development` and the actual Claude asset branch / open PR. Do not assume the older `development` model is Claude's latest.
2. For a **new single-script Blender render**, create a task-specific push-triggered caller in its feature branch, referencing `koda24-cell/kotama-no-bouken/.github/workflows/shared-blender53-render.yml@development` with `script: tools/.../render.py` and `output_dir: render-output/...`. The script must write to `os.environ['OUTPUT_DIR']`. Set `permissions: contents: read, packages: read`. Follow the tested caller example in the rollout guide.
3. The reusable workflow was successfully invoked from another branch in [Actions run #44660839692](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44660839692): Blender 5.3, input/output ClamAV, PNG/Blend/JSON QA, and Artifact upload succeeded. **GLB output via this particular gateway and image quality were not proven by that smoke test.** Check each real asset separately.
4. Existing Claude workflows with Node/Three.js export, downloaded textures, multiple scripts, or custom output paths **must retain their working pipeline** until an equivalent adapter is implemented and validated. Do not bulk replace workflows, overwrite Claude's completed B2 models, or change `main`.
5. Inspect the real run ID, logs, front/side/angle PNG, GLB and scan reports. Keep outputs `NOT_APPROVED` until user approval. If Claude cannot invoke GitHub Actions with its available tools, commit the caller on a branch and report the actual trigger/permission limitation; never claim a run started without evidence.



## 制作者による成果物の直接保存・開発確認サイトへの反映（2026-11-26 ユーザー指示・最優先）
**Claude は制作した成果物を自分で保存・掲載する担当者である。自動収集や GPT の後追い登録を待ってはならない。** GPT・Codex にも同じ原則を適用する。従来の自動収集待ち・自動台帳取得を前提とする記述より本節を優先する。

1. 第1〜6層、キャラクター、壁・床・天井・小物・装備・VFX・シェーダー・迷宮全景を含め、制作したものは規模を問わず、制作コード、編集可能な元データ（存在する形式のみ）、実際の確認画像、設計資料を作業ブランチのGitに保存する。Three.js制作物に存在しないGLB/Blendを捏造しない。
2. できた単体素材ごとに、可能なら正面・側面・斜め、ゲーム空間は代表地点を実際に描画・撮影する。制作途中でも検査済みの区切りごとに保存し、最終完成を待たない。画像未取得なら未取得と明示する。作品全景だけで個別素材の確認を済ませない。
3. 撮影画像の公開可否・出典・安全性を確認し、`docs/3d/<review-directory>/` にコミットする。既存の `docs/3d/scene-review-index.json` に安定ID、版、階層、担当、日時、元コミット、PR、画像パス、公開可否、承認状態を追記する。旧版を消さない。Artifactsのみの保存やチャット内の画像だけでは保存完了ではない。
4. **制作者自身が `koda24-cell/kotama-3d-progress` にアクセスし、同RepoのAGENTS.mdに従い、確認サイトへの掲載まで行う。** Three.js/ゲームの実画像は既存の `main/index.html` のゲーム内制作レビュー欄に元コミット固定の画像リンク・名称・版・出典・制作担当を追加する（第5層V6の既存掲載方式を参照）。必要に応じ同欄を階層・個別素材・版ごとに整理する。Blender画像は既存の検査済みPNG登録手順を使用する。画像リンクの到達性、PRのブラウザ検査、公開版への反映を確認する。自動巡回機能の実装を待つ必要はない。
5. 各作業報告に元コード/画像の保存先、元PR、進捗サイト掲載PRと状態を記す。書込権限や安全確認不足で掲載できない場合のみ、理由・画像の保存先・未掲載を明示して引き継ぐ。公開レビューはゲーム採用承認ではなく、未承認の正式素材昇格は禁止。ゲーム本体のmainは変更しない。

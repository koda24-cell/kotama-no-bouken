# 第6層・花園 草原床 V7 — ユーザー採用記録

- 承認: 2026-11-14、ユーザー「これでおkとします」
- 対象: 1マス草原床 V7。V6の淡い黄緑色と風向きを保持し、下層の細かな草を幅広い葉レイヤーに統合
- 最終生成コミット: `6a19623ff4dff32e05cac3a295aecdc98589148f`
- 実レンダリング: [GitHub Actions run 43602069517](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43602069517) — success
- 成果物: artifact `14117056247`、`f6-meadow-floor-v1`（名称は旧来のまま）
- ZIP digest: `sha256:371afe6c8c8ca54eb4198f9d90d4edadad6c0b5303eb225bc6f7153ff59171ae`
- ZIP内の成果物: `f6_meadow_floor_v1.glb`, `f6_meadow_angle.png`, `f6_meadow_front.png`, `f6_meadow_side.png`, `f6_meadow_top.png`
- Blender生成元: `tools/floor6/meadow_floor_v1.py`
- 色設定: `tools/floor6/meadow_color_preset.json`
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/346

## 正式保存の残タスク

ユーザーは見た目の採用を承認済み。Actions Artifactsは一時保管のため、ZIPを展開してGLBとPNGを `assets/models/floor6/` とそのレビュー用ディレクトリへGitコミットし、PRで検証して `development` に統合する必要がある。現時点ではこの文書だけでバイナリ本体の恒久保存が完了したことにはならない。既存の第4層専用promotion workflowを第6層用に誤用しないこと。V6以前の生成履歴を保持すること。

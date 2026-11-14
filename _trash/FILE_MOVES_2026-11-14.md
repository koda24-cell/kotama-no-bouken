# ゴミ箱への移動台帳 — 2026-11-14

| 元パス | 移動先 | 理由 | 状態 |
|---|---|---|---|
| `github-desktop-test.txt` | `_trash/files/github-desktop-test.txt` | GitHub Desktop同期の使い捨てテスト。ファイル本文に同期確認後削除可能と明記 | このブランチで移動済み。development未統合 |

## 復元
移動先のファイルを元のパスへコピーし、`_trash/files/` 側を削除するPRを作成する。Git履歴も保持。

## 未移動・保留
- `assets/3d/dungeons/b2_water_source/models/floor2-water-source-quality-v3.zip` などGLBと同名のZIPは内容が重複している可能性があるが、ZIPの中身・参照先を未検証のため保留。
- `assets/3d/dungeons/b4_dragonfire/models/floor4_Part1_Models.zip`、`textures/floor4_Part2_Textures.zip` は復元・配布用途の可能性があり保留。
- `assets/3d/dungeons/b1_ancient_forest/renders/` の過去比較画像は品質レビュー証拠のため保留。
- `docs/3d/` の引き継ぎ・承認ルールは保護対象。

本整理は独立PRでレビュー後にdevelopmentへ統合する。mainは変更しない。

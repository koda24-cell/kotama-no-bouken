# 第3階層・鉄骨クレーン V4 明るさ改善レンダリング失敗メモ（2026-11-13）

## 対象
- PR #270: https://github.com/koda24-cell/kotama-no-bouken/pull/270
- 失敗 run #43333629517: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43333629517
- 直前のV4造形成功 run #43332438994

## 確認できた原因
- Build GLB / Verify GLB は成功。
- **Pull Blender Docker** が失敗し、Render two views は skipped。
- ログ: `error from registry: retry-after: 413.954µs, allowed: 44000/minute`。Dockerレジストリから制限応答を受け、イメージ取得が中断した。
- **照明変更が原因と断定できない**。Blenderは起動しておらず、照明の明るさ・描画品質は未検証。

## 修正
- `.github/workflows/floor3-crane-docker-render.yml` の docker pull を最大5回、20/40/60/80/100秒の段階的待機で再試行するよう変更。
- レンダリングは正面・斜めの2方向。環境光・露出の変更は保持。

## 検証基準
1. 最新のworkflow runが completed/success。
2. Artifactsに両方のGLBと正面・斜めPNG（通常版と先細り版）が存在。
3. **実際のPNGをチャット内で表示**し、暗部・植物・ワイヤーを目視評価。
4. 未承認GLBは正式素材へ昇格せず、development/mainへマージしない。

## 追加障害：再実行 #43336247684
- Docker取得は成功したが、Blender 5.3.0 の `scene.view_settings.look='Medium High Contrast'` が無効なenum値で停止。
- 実ログ: `TypeError: enum "Medium High Contrast" not found`。正しい値は `AgX - Medium High Contrast`。
- `tools/floor3/crane/render.py` を修正。再実行でPNG出力の有無を確認すること。

# 第3階層クレーン関連・不要データ整理監査（2026-11-13）

## 整理方針
- 既存の `_trash/README.md` に従い、参照元を確認したうえで不要ファイルを `_trash/files/` に移す。
- 使用中・未確認・承認済みの成果物を推測で移動しない。
- 移動時には元パス・理由・日付・復元方法を記録する。

## 今回の確認
- `tools/floor3/crane/build.py` と `taper_build.py`: V4 GLBの制作ソース。**保持**。
- `tools/floor3/crane/render.py`: 成功したレンダリングソース。**保持**。
- `.github/workflows/floor3-crane-docker-render.yml`: 完成品の再レンダリングに必要。**保持**。
- `docs/3d/FLOOR3_CRANE_CLAUDE_HANDOFF.md`: Claude向けの利用情報。**保持**。
- `tools/floor3/crane/asset-manifest.json`: GLBの保存予定パスと来歴を記載。**保持**。正式保存後にパスを再確認。
- `docs/3d/FLOOR3_CRANE_RENDER_FAILURE_2026-11-13.md`: Docker制限・Blender設定エラーの再発防止情報。**保持**。
- `assets/3d/dungeons/`: developmentの既存階層素材群。**変更禁止**。

## 保存先の混同について
- `assets/models/floor3/` は索引ブランチの**正式採用GLBの保存先ルール**。
- `assets/3d/dungeons/` は**既存ゲーム素材の保存場所**。双方の存在は重複・不要の証拠ではない。
- 本監査では、誤って作成された実ファイルや安全に退避可能な重複ファイルを**確認できなかった**。従って移動は0件。

## 次回の整理条件
- 承認済みGLBとPNGを恒久保存し、索引・マニフェストのリンクを修正する。
- その後、旧試作品・重複PNG・未参照スクリプトを参照検索し、証拠を付けて退避する。
- Actions Artifactsは一時成果物であり、Git上のゴミ箱に複製しない。

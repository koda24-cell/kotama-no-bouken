# 第3層 窓枠の接合金具01 — Blender制作引き継ぎ

制作日：2026-11-19。対象は単独の鋼製L字接合金具であり、窓全体、壁、鉄筋、縦材、横材に変更はない。

## 初回V1〜V3
- ソース：`tools/floor3/window_joint01/build.py`
- [Actions #44453691022](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44453691022) **success**。Artifact ID `14496134579`。
- 3バージョンのGLB・Blend・3方向PNG、計15ファイルのSHA-256を実ダウンロードして一致確認。
- GLB構造：V1 1メッシュ/324 triangles、V2 2メッシュ/2836 triangles、V3 4メッシュ/3808 triangles。
- 画像評価：L字の補強構造は読めるが、V2/V3の溶接跡が独立した棒状に突き出る。V3の小さな四角い錆メッシュも人工的。**V1〜V3は造形未承認**。

## V4改善候補
- `tools/floor3/window_joint01/build_v4.py` — V1原形を維持して、L字内側の交差部分へ密着した短い溶接線を追加。錆の浮遊キューブをなくし、劣化は手続きPBR材質へ移した。
- `.github/workflows/f3-window-joint01-v4-render.yml` — 正面・側面・斜め・溶接部拡大の4視点＋GLB/Blend/SHA付きmanifest。
- Blender実画像の完了と品質はActionsのrunとArtifact確認後に追記する。まだ承認済みとしない。

## 保護・再開
- PR #559はDraftでdevelopment向け。ゲーム本体および正式素材フォルダへは未追加。
- 元の承認候補：壁01 V4、鉄筋01 V4、縦材01 V5、横材01 V4のファイルはそのまま保持。
- 現行金具は自作手続きシェーダーで新規PNGテクスチャはない。共有テクスチャ台帳へ追加する画像はまだない。
- ジョブ間の自動checkpoint復元は本金具では未検証。Artifactは14日保管であり恒久保存ではない。
- ウイルススキャン・ゲーム内負荷測定は未確認。

## V4／V5 再レンダリング評価
- [V4 run #44454306704](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44454306704): successful Blender 4-view capture plus 6-file SHA manifest; Artifact ID `14496323672`. 初回V3の溶接棒と角ばった酸化片を撤去し、交差部に短い溶接線を変更。実画像では表面が白っぽく、コンクリートに見えるため美術未合格。
- [V5 run #44454891786](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44454891786): successful Blender 4-view capture, GLB and Blend checkpoint with 6 manifest SHA matches; Artifact ID `14496809259`。V4の元形状・溶接設計を保持して、マテリアルの微細ノイズと暗い金属色、露出を調整。実GLBは2 mesh / 2300 triangles。
- 目視: V5はV4より暗色に調整できたが、**大きな面が均質にザラついており、硬い金属板らしい光のメリハリと風化の局在性が足りない**。接合部には溶接線が写っているが、両端が黒く、円筒のような印象が残る。**美術品質は未承認**。
- 現V5は新規PNG画像テクスチャを作っていないため、共有テクスチャ台帳に追加すべきバイナリはない。将来の改善では全面ノイズを減らし、鋼板エッジの摩耗・継ぎ目の不規則な小さな溶融ビード・局所錆を優先。
- 3Dパフォーマンス共通監査はGitに含まれるGLB向けで、ArtifactにあるV5のゲーム描画FPSを測ったものではない。ClamAV実スキャンは未確認。完成承認前に本番統合しない。

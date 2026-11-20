# 第3層・劣化した窓パテ01 — 造形と実レンダリング比較

対象: 独立した長さ約34cm、16×12mm程度の断面を持つ窓用パテ1片のみ。既存のガラス片V10、押さえ金具01、窓枠、壁、鉄筋とゲームコードは変更しない。ユーザーの明示的な承認前には正式素材として保存しない。

## V1〜V3制作・検証
- V1: `tools/floor3/window_putty01/build_v1.py`、[Actions #44648122506](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44648122506) **success**。Artifact #14589513278。正面/側面/斜め/拡大の実PNGを目視。細長いパテ形状は確認できたが、白い均一な棒のようで表面劣化が弱い。**美術不合格**。
- V2: `tools/floor3/window_putty01/build_v2.py`、[Actions #44648426001](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44648426001) **success**。Artifact #14589887252。GLB実測4 meshes/962 triangles。黒ずみ、輪郭の不均一さを強化。しかし拡大ではひびメッシュが小さな浮いた突起に見え、**美術不合格**。
- V3: `tools/floor3/window_putty01/build_v3.py`、[Actions #44648863840](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44648863840) **success**。Artifact #14588679695。GLB実測**1 mesh / 782 triangles**。V2の突起を完全削除して上端の実形状に小さな欠け3か所を追加し、表面を暗めの古びたパテ色に調整。
- 3バージョンともGLB/Blend/カラーPNG/Roughness PNG/4方向レンダリングPNGの**各8ファイル**をArtifactから実取得し、Manifest SHA256全件一致。実Blender画像を目視で比較。
- V3視覚評価: V1より不規則な上端で、V2の浮いたひびは解消。ただしひびや破損の立体的深さはまだ控えめ。表面が長い灰色の帯に見えるので**美術は未承認**。次に必要なのは破断端/欠けのサイズ差や実際の古いパテの剥離の参考確認。
- 自作画像はV1〜V3各256×256、カラーとNon-Color Roughnessを生成。現在正式GLB/PNG保存未実施。GitHub Actions Artifactは14日の一時保存。
- V3ではClamAV固有の実ファイル検査・Three.jsゲーム内表示/FPSは未実施。Blender 5.3+ClamAV共通イメージを使用したことは、V3固有のスキャン完了を意味しない。

## 保存状態
- [Draft PR #640](https://github.com/koda24-cell/kotama-no-bouken/pull/640) -> development。main未変更。
- 既存のユーザーOK候補は保持。

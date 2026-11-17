# B5朽ちた騎士像・部品別再設計 / architectural pedestal V1
Status: NOT_APPROVED — review-only standalone candidate; V14 geometry is preserved.

## Evidence / shape research
- Metropolitan Museum, *Tomb Effigy of a Knight in Gothic Armor*, ca.1425–50, actual sculpted stone: https://www.metmuseum.org/art/collection/search/34026
- Churches Conservation Trust, fourteenth-century knight effigy: https://www.visitchurches.org.uk/visit/our-churches/st-michaels-church-buslingthorpe-lincolnshire
- Pinterest candidate (not saved, visual not fully verified): https://www.pinterest.com/pin/1095289571895410060/ — Medieval Tomb Effigies
- Pinterest candidate (not saved, visual not fully verified): https://www.pinterest.com/pin/21744010695741644/ — Gothic Pedestal
- Preserve photographic stone PBR from V13/V14 as later material option (actual photo license evidence in existing Artifact). No Pinterest image is used as a texture.

## Pedestal-specific design and QA
- Carved masonry, **three crisp stepped registers**. Large horizontal slab, narrow hollow groove, broad shaft with carved Gothic quatrefoil recesses, bottom chamfer course. No toy-like broad rounded bevels.
- Individual mesh objects named and exported as a standalone `b5_knight_arch_pedestal_v1.glb` with corresponding `.blend` and `front/side/angle.png`.
- Keep the horizontal faces flat and full size; small chipped corners only in two chosen sites. Faint grout and localized joint erosion; no pebble carpet.
- Overall width 1.8m; depth 1.5m; height around .48m. Real origin at base center Z=0.
- Don't delete V14 original. This is a replacement **candidate**, not an overwrite or formal asset.
- Inspect screenshots for squared silhouette, shadow separation, scale, unnatural floating cracks/blocks, equal left/right positioning, texture realism.
- On approval: formal GLB/PNG, then separate integrated knight assembly and game test.

## Later separate assets
1. seven-head anatomical armature/proportion blockout
2. bascinet/gothic helm
3. breastplate and fauld
4. articulated shoulder/elbow/knee/gauntlet
5. longsword and shield as separate GLB
6. **thin** hanging carved cloth; mesh thickness chosen based on stone rather than blanket-like plates
7. full assembled statue three-view and map fit test

No approval, merge, or game inclusion before user review.

## Blender反復・2026-11-17 実行結果
- V1 Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43985469980 ／Artifact 14284239387: GLB、Blend、800px正面/側面/斜め。石棺型の段付き構造・小ベベル・四葉彫刻を確認。薄い胴と白く広い上面のため不採用。
- V2 Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43985917998 ／Artifact 14285437011: 台座の胴を厚くし、カメラと照明を変更。彫刻は明瞭、依然展示模型らしい単色石肌で不採用。
- V3 Run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43986393010 ／Artifact 14285277868: CC0 ambientCG Rock063の実写真Color/Roughnessを取り込み、グレーに調色してUV適用。低い水平カメラで装飾面と笠石の比率を比較。見た目は向上したが、装飾が均一、石材の破断は局所的で古びた建築物の完成品質ではない。
- 3 runともActions成功、GLBヘッダー整合、`front.png`, `side.png`, `angle.png` (800×800)とBlend/GLBのファイルSHA-256がmanifestに一致したことを独立確認。
- V3 manifestの`photo_status=AMBIENTCG_ROCK063_CC0_PHOTOGRAPHIC`が実際の適用状態。現行`known_limitations`文字列に「no photo PBR」が残ったのは文言更新漏れであり、この文字列は誤り。V3 sourceを次版で直すこと。
- 三つとも`NOT_APPROVED`。**旧V14本体は編集していない**。ゲーム内のパーツ置換・衝突・性能検証は未着手。正式保存とdevelopmentマージを行わない。
- 次回の一体制作で優先: 表面テクスチャの方向性、自然な複数箇所の削れと彫刻の欠損、石の接合の厚みを詰める。その後、独立したヘルメット/胸甲/腕関節/剣盾/薄い石彫布を順に作る。

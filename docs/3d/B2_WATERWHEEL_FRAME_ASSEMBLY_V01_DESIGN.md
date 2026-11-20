# 第2層 水車・木製架台 仮組み V01（非破壊）
2026-11-20 / NOT_APPROVED

## 実モデルと出典
- 柱V03: PR #646 / run 44654581027 / Artifact 14591853832 / `b2_single_timber_support_post_v03.glb`
- 筋交いV02: PR #674 / run 44673742682 / Artifact 14600384453 / `b2_single_diagonal_oak_brace_v02.glb`
- 込み栓V02: PR #675 / run 44675019205 / Artifact 14601168044 / `b2_single_oak_drawbore_peg_v02.glb`
- これらのArtifact ZIPをGithub API経由で取得、ClamAV検査後Blender 5.3にIMPORTする。試作自体を再生成・差し替えしない。
- `development` と既存素材、`main` は無変更。既存部品の穴あけ・切削は禁止。

## 実GLBのローカルAABB
- post (glTF Y-up): x[-.184,.192], y[-1.702,.001], z[-.171,.182]、三角形908
- brace (glTF Y-up): x[-.084,.088], y[-.595,.590], z[-.065,.061]、三角形1136
- peg (glTF Y-up): x[-.0155,.0163], y[-.0141,.0157], z[-.205,.0003]、三角形598
- Blender import時に軸変換されるので、import済オブジェクトの世界座標の境界を再計測すること。
- 柱高さ約1.70m。筋交い長さ約1.15m。上接合：柱の高さ約1.3m付近、下接合：柱から横約0.72m。角度約35度の仮組み。
- 込み栓：上接合近傍の位置指標として配置。**穴がない状態のため、物理的な差し込み合格とは判定しない**。
- AABBの重なりは単純な粗い指標であり、実際の表面接触やBVH衝突とは区別する。正面・側面・斜め・上から実レンダリング、部品別配置座標のmanifest保存。

## 評価基準
- V01では組立視認性、素材保持、部品数、外形寸法の確認を優先。
- 接合部の深い不自然な貫通、木材間の隙間、差し込み位置のズレは不合格。
- Blender 5.3+ClamAV入出力、四視点PNG、Blend、仮組みGLB、JSON QA/SHA/共通監査。未承認の一時Artifact。

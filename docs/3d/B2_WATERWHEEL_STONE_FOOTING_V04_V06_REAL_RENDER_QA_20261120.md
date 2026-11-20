# 第2層水車基礎石 V04–V06 実レンダリング QA（2026-11-20）
状態 **NOT_APPROVED** / 制作PR #650 / developmentとmain・既存の水車素材は未変更

## V04: 自然破断の初期試行
- [Blender 5.3 Actions #44668014284](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44668014284) 成功、4方向PNG / GLB / Blend / PBR3画像 / ClamAV / GLB監査。
- 目視は**不合格**。Booleanによる上面受け座が三角の穴に崩れ、側面楔Booleanも黒い穴として現れた。風化の質感より形状崩れが目立つ。

## V05: 不正な欠損を修正
- [Blender 5.3 Actions #44668496968](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44668496968) 成功。
- Boolean切削を撤廃し、12頂点リングを明示的に接続した約19mmの受け座へ変更。三角の上面と側面の黒穴は画像上で解消。
- ただしプロシージャル灰色テクスチャの石らしさが乏しく、磨かれた角柱の印象が残るため未承認。

## V06: CC0写真石材を実際に貼り付け
- [Blender 5.3 Actions #44668952817](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44668952817) **success**。入力CC0写真を事前ダウンロードし、ClamAVでソース画像とコードを検査。BlenderでPBRアルベドに画像を接続・GLBに埋め込み。4視点PNG・GLB・Blend・ラフネス/ハイト画像・SHA manifest・性能監査・出力ClamAVすべて成功。
- 使用実テクスチャ：[Poly Haven Rock Surface](https://polyhaven.com/a/rock_surface) 1K JPEG CC0。実ダウンロードURL: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_surface/rock_surface_diff_1k.jpg`。Blenderで彩度0.43、輝度0.87へ調整。写真はGLB内に埋め込み、独立GLB配布可能。粗さ/ハイトは自作生成画像。
- 実績：GLB 1,515,212 bytes、3342推定三角形、1 mesh、1 material、3画像。性能監査は**構造統計で実FPS測定ではない**。
- 目視：V05より岩肌・変色・粒子の認識が改善。**課題：まだ外形が規則的な四角台に近い、側面の濃い面が硬すぎる、自然な裂け目/大きな欠損が弱い**。美術品質は未承認。
- 単体木製支柱V03との実GLB仮組み・BVH・Three.jsでの表示は未検証。正式素材昇格は禁止。

## 次版
- 既存メッシュ・座面とCC0 PBRは保持。亀裂を暗色の線ではなく、分岐・幅変化・段差つきでジオメトリに刻む。
- 大きな角の崩れを1箇所だけ足し、残りは細かな剥離で整える。別のCC0自然岩モデル [tevy Granite Boulder](https://tevy.dev/models/granite-boulder) の破断面分布を参考にする（モデル本体は未組込）。
- 既存の木製支柱V03を一時的に仮組みして座面への収まりを4方向レビュー。未承認のまま比較する。

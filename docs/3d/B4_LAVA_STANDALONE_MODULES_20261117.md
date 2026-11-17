# 第4層 — 独立溶岩モジュール5種 / V1 制作・検証台帳

## 目的
ユーザーが高評価した第4層のマグマ河川V8/V9の質感を、洞窟・岩壁・地形から独立させ、再配置可能な溶岩専用GLBへ分割する。マグマ河川PR #450の未完成モデルや承認済みマグマ壁を変更しない。

## 5つのGLB（それぞれ独立）
| ID | 用途 | 形状 | GLB名 |
| --- | --- | --- | --- |
| A | 蛇行する細流 | 幅が不規則なS字流路、冷却縁 | `b4-lava-a_sinuous-v1.glb` |
| B | 支流・合流 | 中央主流＋左右2支流、冷却縁 | `b4-lava-b_confluence-v1.glb` |
| C | 溶岩溜まり | 不規則な溜まり、冷却浮島、出口流路 | `b4-lava-c_pool-v1.glb` |
| D | 落下溶岩 | 上から下へ広がる落下流、冷却縁、着地点の溜まりと飛沫 | `b4-lava-d_cascade-v1.glb` |
| E | 冷却溶岩 | 冷却黒皮膜と内部発光、放射状の不規則な赤熱亀裂 | `b4-lava-e_cooling-v1.glb` |

## 実装
- `tools/floor4/lava_modules/build_lava_modules.py`: Blenderで5モデルを独立生成・個別GLB書出し。BlenderのZ-upを原点で統一。岩壁・洞窟・床・光源はGLBに含めない。黒い冷却殻は溶岩の一部として含む。
- 512pxの自作熱分布カラー/EmissionマップをベイクしGLBへ埋め込み。既存の `molten_lava_normal.png` と `molten_lava_roughness.png`、`volcanic_basalt_*` を利用。Pinterest画像をテクスチャに転用しない。既存画像の利用条件は正式採用前に再確認。
- `.github/workflows/b4-lava-modules-review.yml`: Blender/Cyclesで5種×4視点（angle/front/side/top）の20枚、5 GLB、5 Blend、SHA256付きmanifestを出力。GitHub Actions Artifactsは一時保管。
- `NOT_APPROVED`: 生成と技術QAは美術的な合格・ゲーム統合を意味しない。ユーザー承認後にのみ正式保存候補PRを作る。

## 品質判定
1. A: 蛇行が読め、直線的な帯・均一な太さに見えない。
2. B: 支流が主流に自然に合流し、T字パイプや断裂に見えない。
3. C: 広がりが自然で、完全な楕円形の円盤・浮遊板に見えない。
4. D: 上下の連続性、厚み、落下先との位置関係が自然で、板状リボンに見えない。
5. E: 黒い冷却殻と赤熱亀裂が実物の割れ目に見え、装飾的な線模様に見えない。
6. 各GLBの画像内包、実4方向PNG、Blender checkpoint、manifest、ファイルハッシュを検証。
7. 各モデルのゲーム内アニメーション/熱ゆらぎ/煙/火の粉は静止モデルとは別のVFXとして後工程で検証する。

## 初期状態
V1コード・Actionsを作成。レンダリング実行の成功・実画像・品質判定はrunを確認して追記する。5種とも完成承認前。

## V1 Blender実検証・V2修正（2026-11-17）
- V1 GitHub Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43996896778 **success**。Artifact ID 14290017960。GLB 5個（各約8.0–8.5MB）、Blend 5個、4方向PNG 20枚、各manifestを実際に取得・確認。全て `NOT_APPROVED`。
- V1実画像所見: Aの蛇行流は流れの強弱が読める。Bの左右支流は均整の取れたY字で人工的。Cは冷却殻と溶岩溜まりが良いが外周がまだ楕円寄り。Dは正面は良いが側面でほぼ線になり、立体的な厚み不足。Eは中心から均等に放射する黄色い線が魔法陣のようで溶岩亀裂に見えない。
- V2の具体的修正: Bの左右支流の流入高さ・長さ・曲率・幅を非対称化。Cの外周輪郭の低周波・中周波の歪みを増やす。Dの滝の裏面と左右の側面に厚み約0.19を追加し、3本の隆起した溶岩筋を重ねる。Eの13本の放射状亀裂を8本の独立した曲線断層へ変更し、発光を抑える。
- V2ソースは `5b09991dbffe1db13532c73d7b25de5d9652adb9`、ワークフロー `cbc8f2044a1282c5da61d50431da1ab655d61b4b`。**V2のレンダリング結果・品質は未確認**。成功時は各GLBとPNGを目視評価し、問題を修正する。

- V2本番レビューrun: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43997817577 （実行中、未検証）。workflowのbranch filterが一時的にv2へ変わっていたため修正し、現行v1作業ブランチでv2成果物を出す。中間run 43997608785は旧workflow設定のため採用対象外。

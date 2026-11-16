# B4 トロッコ・レール V11 ベースライン実レンダリング（2026-11-16）

## 状態
- **未承認・品質改善前**。ユーザー承認済みV33マグマ岩壁とは別。
- Draft PR #403。既存V11ブランチ `feature/b4-rail-fracture-v11-20261112` を基準とし、造形ソースには変更を加えていない。
- Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43799297476
- Artifact ID: 14195761666 / `b4-cart-rail-v11-baseline`（有効期限14日）
- Source commit: `3faeaeb517827b031b9fc5e600a94e117107fa80`
- Blender 5.0.1、Node 22、Three.js 0.160.1。既存GLTFExporterから12 GLB書き出し、トロッコ＋レール3種の計12枚のPNGをBlender実レンダリングした。
- 検証: run success、計12 PNGとGLBを実際に取得・展開・画像目視。
- 初回run 43799125605はPython NumPy不足でGLB importが失敗し、シェルが失敗を伝播しないためPNGなしで成功扱いになった。修正後は `python3-numpy` をインストールし、各PNGを `test -s`、最終12枚を検証する。
- グレーのclay描画であり、材質・錆・金属光沢の確認は未実施。

## ベースライン所見
- トロッコ: 車輪、補強金具、側板は存在。積載鉱石が荷台シルエットを大きく遮り、車輪/車軸・接合部の読みやすさを改善したい。撮影軸を見直す。
- 直線: 枕木が均一。レールが小箱の連続のように見える。
- 曲線: 曲率は成立。接合金具と枕木配置の連続性の評価が必要。
- 破損: レール破断と木材破損は存在するが、重なり方が複雑で整理が必要。
- 次回は既存形状に追加するモジュールで改善し、before/afterを同じカメラで比較。小粒瓦礫の無意味な増殖は避ける。

## 正式保存・Claude引継ぎゲート
- **未完了**: 新素材の品質改善・承認・正式GLB/PNG/manifest保存・ゲーム統合。
- ユーザーの画像確認と完成承認があるまで正式保存フォルダへ昇格しない。
- 完成後は `assets/models/floor4/` と `reviews/` にGLB、PNG、SHA-256 manifest、ソースコミットとrun IDを保存し、別PRでdevelopmentへ。
- ClaudeはBlender非対応前提。承認済みGLB/PNG/manifestだけを読み、Three.js GLTFLoaderでサイズ、原点、隣接タイル接合、負荷・衝突・保存への影響を検査する。V33の静的GLBはそのまま保持。

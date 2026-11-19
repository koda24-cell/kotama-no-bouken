# 第3層 遺跡都市：窓枠縦材01 制作検証（2026-11-19）

## モデル範囲
- 本体のみ。窓全体、横枠、割れたガラス、ツタ、壁、鉄筋は含めない。
- 2.25mの中空鋼材（約105mm×100mm、板厚10mm設計）。V1基礎、V2局所錆、V3塗膜剥離、V4自作テクスチャ適用。
- 既存の壁01と露出鉄筋01、ゲームコードには変更なし。

## 実Blenderによる証拠
- [初回 V1〜V3 成功 #44448387772](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448387772)：GLB3、Blend3、正面・側面・斜めPNG9枚、SHA256 manifestを検証。
- [V4 テクスチャ版成功 #44448888071](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44448888071)：GLB1、Blend1、正面・側面・斜め・拡大PNG4枚、自作カラーPNG、manifest検証成功。Artifact ID `14494134047`、全7ファイルのSHA256一致。
- V4 GLB：10メッシュ、416三角形、243,064 bytes。構造上の統計でありGPU FPS実測ではない。
- 256×512 自作テクスチャ `F3_WINDOW_AGED_PAINT_RUST_01` SHA256 `3ecfab0e24a56aed12b6cd1ddd5b1aa7bf5e7a13222458d1c2f74c082ee6cfee`。生成コードによって再生成可能。共通台帳に記録し、情報PR #544からdevelopmentにマージ済み。

## 造形と材質の目視判定
- **NOT_APPROVED**。断面が中空の金属材として成立したことは前進。
- V1は新品の細い金属棒。V2/V3の錆と剥離は点状で、板状の塗膜が浮き、実物の劣化に見えにくい。
- V4は面へのカラー画像の貼り付けが成功したが、錆が長い縦縞のように繰り返され、浮いて見える板状破片は未改善。
- 次は窓枠縦材 **同一パーツだけ** に対して：剥離板の厚さを減らし表面へ密着、錆の面積を局所化、法線・ラフネスの調整。大きな横枠やガラスを追加しない。
- ゲーム用のLOD/バッチ化、ウイルススキャン、Three.jsでのゲーム画面検証は未実施。完成承認までassets/へ昇格しない。

## 途中保存
- 各生成段階でBlend/GLB/PNGをActions Artifactへ出力した。実manifestのハッシュを検証済み。Artifactは14日間の一時保管。
- 第3層の窓枠専用のジョブ間自動復旧はまだ検証していない。再開時はcommit SHA・run ID・manifestを突合する。

## V5 UVペイント／Roughness比較（2026-11-19）
- [GitHub Actions run #44450317443](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44450317443) **success**。Artifact `f3-window-mullion01-v5-textured`, ID `14495033109`。GLB/Blend/正面・側面・斜め・拡大PNG、カラー・Roughness PNGの計8ファイルを実取得しmanifestのSHA-256全一致を確認。
- 同じ中空金属縦材を保持し、V4の浮いた板状塗膜メッシュをV5では使用しない。モデル構造は実GLBで1メッシュ/236三角形（V4は10メッシュ/416三角形）。FPS実測ではない。
- `F3_WINDOW_ENAMEL_RUST_V5.png`: 256×512、SHA-256 `e1e76aa48c6a55fe1d1e7bfb2919148bc3c63d5b72a7dbf30d8330579a0c3628`。
- `F3_WINDOW_ROUGHNESS_V5.png`: 256×512、SHA-256 `9dcb8e20ad4bbeb39a2369366c0479023fad435a900cf4e0be8e665e91f1da58`。non-color dataとして使用。
- **美術QA未合格**：以前の板状剥離問題は減少。大部分の塗装が残り、錆は局所化したが、拡大では細長い縦筋に見える。次は錆の面分布・角の欠損・端面の違いを小規模修正する。
- この時点で独立したV5素材のClamAV実スキャンは未確認。ゲーム統合/ユーザー承認/正式保存は未実施。旧V1〜V4の成果は変更していない。

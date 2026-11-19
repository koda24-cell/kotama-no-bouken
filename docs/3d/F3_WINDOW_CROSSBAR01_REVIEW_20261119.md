# F3 窓枠横材01 — 独立モデル制作レビュー（2026-11-19）

対象：単独の金属製横材のみ。既存の承認候補・壁01 V4、露出鉄筋01 V4、窓枠縦材01 V5を変更しない。

- Draft PR #551、制作元: `tools/floor3/window_crossbar01/build.py`、レンダー: `.github/workflows/f3-window-crossbar01-render.yml`
- [GitHub Actions run #44451653102](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44451653102): **success**。Artifact ID 14494619940。
- V1〜V3の各GLB・Blend・正面/側面/斜めPNG、カラー/Roughness PNG計21ファイルのSHA-256をダウンロードしたzipとmanifestで照合し全一致。
- 構造統計: V1〜V3いずれも実GLB解析で1 mesh、236 triangles。これはGPU draw call/FPS測定を意味しない。
- 素材：V1 基本塗装、V2 局所薄錆、V3 端部と下側の錆/摩耗。実レンダリングではV1〜V3の差は小さい。
- 美術評価：**未承認**。角・端面の荒れを拡大して制作すること。現状は整った細長い棒の印象が強く、端部の接続形状と風化の説得力が不足。
- V1〜V3の画像テクスチャ合計6枚のハッシュは共通台帳 `docs/3d/SHARED_TEXTURE_ASSET_CATALOG.md` に登録済み（docs PR #553からdevelopmentにマージ）。PNG実ファイルはArtifactにあり、GitHub正式素材フォルダには未保存。
- **未確認**：ClamAV実スキャン・Three.jsゲーム実装性能・ジョブ間自動checkpoint復旧。
- 次は「横材01のみ」の端部と接合部のクローズアップを増やし、自然な摩耗を追加。窓全体の組立ては縦・横各部材の承認が済んだ後に行う。

## V4 端部クローズアップ（2026-11-19）
- [GitHub Actions #44452731722](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44452731722): Blender 5方向撮影とGLB/Blend/PNG形式・SHA manifest検査成功。Artifact ID `14496631274`、ファイル `f3-window-crossbar01-v4-end-detail`。
- 元のV3中空U字金属形状を残し、両端の切断面に局所的な不均一変形・露出金属色の別マテリアルを加えた。正面・側面・斜め・左端・右端の実PNGを目視確認。
- **美術QA未承認**。U字中空断面は判読可能だが、切断面がまだ整った工業製品のように見え、欠けの大小のバリエーションが足りない。色の変化はあるが、端部の表面破断と奥行きが乏しい。次は現状の端面を保ちながら、小さい局所的な損傷と接合方向の設計を追加検証する。
- V1〜V3・縦材・壁・鉄筋・ゲーム本体には変更なし。新しいテクスチャ画像は増やしていないため、共有テクスチャ台帳への新規登録は不要。
- モデルGLBはActions Artifactの一時保存。未承認のため正式素材フォルダへの保存・ゲーム統合は未実施。ClamAV実スキャン・ゲーム内FPS検証は未確認。

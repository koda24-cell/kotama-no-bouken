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

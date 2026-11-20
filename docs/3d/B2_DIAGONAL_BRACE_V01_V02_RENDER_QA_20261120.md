# B2 水車斜め筋交い V01–V02 実レンダリングレビュー
2026-11-20 / **NOT_APPROVED** / Draft PR #674

- V01 [GitHub Actions #44673262288](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44673262288) success。長さ約1.15m、断面約14.5×11.5cm。PNG4／GLB／Blend、画像3枚（古材Albedo・Roughness・木口）埋込、ClamAV入力/出力、SHA、GLB構造監査すべて通過。目視では木目が規則的な縦縞で、筋交いとして理解しづらい直立レビュー姿勢。
- V02初回 [#44673579550](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44673579550) failure。Pythonコードにリテラル\\nが混入しSyntaxError。コードを修正。
- V02再実行 [#44673742682](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44673742682) **success**。画像4方向、GLB／Blend／画像3枚／ハッシュ／ClamAV／構造監査成功。
- V02のテクスチャはV01より縞が弱まり、木材の側面が読みやすくなった。レビュー撮影時だけY軸34°回転し、GLB出力前に戻す。正面・斜めで筋交いに見える。GLB 791980 bytes、約1136推定三角形、2マテリアル、3埋込画像（実行時FPS未測定）。
- **残課題**：右側面の黒帯が強く、凹んだ溝というよりUV/照明の暗い面に見える。端面年輪もかなり同心円が均一。接合面・ほぞ・木柱の干渉も未確認。
- 既存支柱V03・基礎石V07を保持。試作ブランチのみ保存。正式保存・マージはユーザー承認後。次工程では木柱と仮組みし、接合角と黒帯の起因を調べる。

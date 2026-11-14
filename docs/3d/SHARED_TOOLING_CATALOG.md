# 共有ツール・技術・アドオン台帳

本台帳は発見時点で登録し、検証後に同じ項目を更新する。運用: [TOOLING_AUTO_SHARE_POLICY.md](TOOLING_AUTO_SHARE_POLICY.md)。元の広域研究: [STYLIZED_GAME_TECH_LIBRARY.md](STYLIZED_GAME_TECH_LIBRARY.md)。

| 名称・技術 | 用途 | 情報/導入/検証状態 | 出典・実装・証拠 |
| --- | --- | --- | --- |
| Blender標準 Bevel / Weighted Normal | 建築・鉄骨エッジ | 実装済み・Actions描画検証済み（高架V1） | PR #353 / run 43601312291 |
| Blender標準 Noise / Bump / 画像マテリアル | コンクリート・錆・表面凹凸 | V2実装済み・結果要確認 | PR #353 / `tools/floor3/elevated_bridge/build_v2.py` |
| Poly Haven CC0 texture API | concrete/rust 画像取得 | 自動取得コード実装済み・実取得成否要確認 | https://polyhaven.com/ / PR #353 / `fetch_textures.py` |
| Blender標準 Icosphere/Boolean/Geometry Nodes | 破損・瓦礫・侵食の自動造形 | Icosphere/付加メッシュは実装済み。Boolean/Geometry Nodesは候補 | PR #344, #353 / Blender公式ドキュメント |
| Blender標準 Python錆・摩耗・欠け追加 | 工業素材の表面劣化 | V3実装済み・Actions成功。品質は別途評価 | PR #344 / run 43487499572 |
| Blender Docker on GitHub Actions | GLB/3方向PNG出力 | 高架V1成功。環境依存に注意 | run 43601312291 / `floor3-elevated-bridge-render.yml` |
| MaterialCreator | ノード型PBR作成 | 情報のみ・導入未確認・ライセンス要確認 | https://github.com/Calla-Ji/materialcreator |
| BlendAtlas damage nodes | 破損ノード素材 | 情報のみ・未導入・ライセンス要確認 | https://blendatlas.com/products/damage |
| Procedural Damage & Wear | 破損/摩耗自動化 | 商用アドオンの情報のみ・未購入 | https://www.strayspark.studio/docs/procedural-damage |
| Awesome 3D Blender Addons | アドオン探索索引 | 情報のみ・個別審査必須 | https://github.com/naranyala/awesome-3d-blender-addons |
| Stylized game rendering references | PBR+NPR/ライティング/面処理 | 参考資料整理済み・個別実装未検証 | STYLIZED_GAME_TECH_LIBRARY.md / 元PR #343 |
| Quaternius animations / Rokoko / Mixamo / DeepMotion | 歩行・戦闘アニメ/リターゲット | 別作業の調査・保存が進行中。原本Git保存は要再確認 | 関連アニメーションPR #328。素材の再配布条件を確認 |
| Pinterest/Tailwind | 画像リファレンス・GPT/Claude共有 | 共有ルール確認済み。今回の画像取得は未実施 | https://github.com/koda24-cell/pinterest-reference-library |

## 最新の検証待ち
- 高架V2: Actions run 43603580270 等の最新結果を確認し、**Poly Havenの実取得成否とGLB 8点/PNG 24枚の検証、実画像の目視評価**を記録する。
- 破損・摩耗 V3: 画像品質と物理的な欠け（Boolean等）を区別。表面付加パーツだけを本当の欠損と記述しない。
- 未検証アドオンはインストール・安全性・互換性・ライセンスが確認されるまで「使用可能」と断定しない。

## 新規登録テンプレート
```md
### [名称]
- 公式URL:
- 対象分野/目的:
- ライセンス/商用・再配布条件:
- 登録日時・担当:
- 情報状態: 調査中 / 確認済み
- 導入状態: 未導入 / コード追加 / 導入済み
- 検証状態: 未検証 / 失敗 / 成功
- 導入手順・バージョン:
- 検証日時・環境・コマンド:
- 実行ログ・PR・Actions・レンダリング:
- 既知問題/次の作業:
```

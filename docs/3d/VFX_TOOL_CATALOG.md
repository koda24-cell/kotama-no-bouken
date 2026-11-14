# 3D・2D VFX 共通ツール／素材カタログ

更新: 2026-11-14。GPT/Claudeは霧・煙・魔法・天候・環境演出の制作前に本資料を確認し、必要なものだけ選択する。**記載と実際のインストール・動作確認は区別する**。

| 名前 | 配布・仕様 | ライセンス | 使用方針 | 現在の検証 |
| --- | --- | --- | --- | --- |
| Kenney Particle Pack / Smoke | https://github.com/Calinou/kenney-particle-pack ; https://kenney.nl/assets/particle-pack | 配布パック内の LICENSE.txt を参照。CC0版のみ取り込む | 半透明煙PNGを複数枚重ね、奥行きと流れを表現。床の瘴気・背景・魔法・煙突等 | 第5層瘴気V6のBlenderプレビューで実使用済み。今回の遠景用モジュールはテクスチャを差し替え可能 |
| Godot Shaders 2D Fog Overlay | https://godotshaders.com/shader/2d-fog-overlay/ | **個別ページのライセンスを再確認すること**。未確認のコードは複製しない | 時間変化するノイズ霧の**技法を参考**にThree.js用に独自実装 | Godotコードは未移植・未検証。今回のThree.js版は独自ノイズ実装 |
| Godot Volumetric Fog / Fog Shader | https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/fog_shader.html | Godotドキュメントの利用条件に従う。実装の直接流用なし | 3D空間の体積霧・密度・距離減衰の設計資料。高負荷なら軽量平面シェーダーを優先 | 本物の体積霧は未導入。今回の背景は低負荷の多層2D霧 |

## 今回の実装
- `field/b5-distant-fog-background.js`: 独自Three.js ShaderMaterialの多層アニメーション霧 + 建物形状を見せない窓明かり。
- `preview/b5-distant-fog-background.html`: 独立ブラウザ確認ページ（ゲーム本体へ未統合）。
- 初期表示距離: 4マスを目安。ゲーム内での遮蔽・壁判定を先に行い、遠景のみ背景レイヤーを表示すること。
- PNGを追加利用する際はKenney原本・LICENSEをセットで保存。今回の独立プレビューは外部PNGに依存しないのでオフラインでもコード上の描画部分は動作可能（Three.js読み込みは別途必要）。
- 他階層では霧色・濃度・動きだけ変える。未検証の体積霧を導入済みと報告しない。

## 運用
このカタログは**技法・配布元の保存**であり、全ツールのダウンロード／インストール完了を意味しない。第三者素材の利用前にライセンス、ファイルの存在、ゲーム性能を個別に確認する。

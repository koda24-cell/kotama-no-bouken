# 設計図からの原創造形 V1

PR #775。tools/design-engine/build_blueprint.py は kotama-build-v1 / mm の明示的な制作JSONを読み込む。box, extrude, loft, revolve, curve、Boolean hole/groove/raised、bevel、repeat、mirror、PBR、生成チェック柄、smart UV。build-demo.json が試験用。Blender 5.3 + ClamAV 固定DockerでGLB/Blend/正面側面背面上面斜めPNGとSHA manifestを出力する。参考解析 detail.json から制作JSONへの自動変換は未実装。任意CAD曲面、外部テクスチャ、厳密寸法QAは未検証。成果物はNOT_APPROVED。実行成功と目視品質は別。進捗サイト登録は未実施。既存素材変更なし。

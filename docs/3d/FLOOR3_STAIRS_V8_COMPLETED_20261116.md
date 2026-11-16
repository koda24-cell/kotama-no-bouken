# 第3層 遺跡都市：崩壊階段 V8 正式完成記録

- 承認: 2026-11-16、ユーザーがV8の3方向レンダを確認して「完成」と明示。
- 完成範囲: **階段（stairs）V8 1アセットのみ**。スロープ・踊り場のV6は引き続き未承認。
- 原本生成run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43858942490
- Artifact: 14221847568 / floor3-stairs-v8-review。ZIPは一時保存、正式ソースはGitHubで恒久保存。
- 正式GLB: assets/models/floor3/ruined_connector/stairs_v8.glb
- Blender原本: assets/models/floor3/ruined_connector/sources/stairs_v8.blend
- 正面/側面/斜め: assets/models/floor3/ruined_connector/reviews/stairs_v8/{front,side,angle}.png
- アセットmanifest: assets/models/floor3/ruined_connector/stairs_v8.manifest.json (元ファイルのSHA-256/GLB/画像/検査/承認情報)
- Blender再生成コード: tools/floor3/ruined_connector/build_stairs_v8.py と依存する build_stairs_v7.py, build_irregular_v6.py, build_irregular_v5.py, build_irregular_v4.py, build_irregular_v3.py, build_irregular_v2.py, build.py
- 仕上げ: 崩壊した踏み板・両側支持梁・実欠損・露出鉄筋・屈曲した錆びた手すり・凹型亀裂・NormalMap。
- 既知の注意: 第3層迷宮へのThree.jsでの実接続は未実施。既存の2mタイルと床レベル・方向・カリング・当たり判定をテストする。
- Claudeへの作業: GLB/PNG/manifestのみを参照。Blendを開く必要はない。GLTFLoaderで確認し、接合・材質・画角・容量・ロード・セーブに影響がないことを確認する。最終的なゲーム配置は別作業。
- 元のPR #376はスロープ/踊り場の未完成コードを含むため自動マージしない。承認階段だけのこのPRをdevelopmentへ統合する。
- 次の制作: スロープ（ramp）を一つずつ改善し、同様に正面/側面/斜めの実レンダーと承認を経て保存。

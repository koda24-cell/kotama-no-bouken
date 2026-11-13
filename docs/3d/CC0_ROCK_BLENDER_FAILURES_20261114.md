# CC0 Boulder / Blender 5 — 失敗・復旧記録

更新: 2026-11-14
対象PR: https://github.com/koda24-cell/kotama-no-bouken/pull/333

## 実行履歴と原因

1. [Run 43461599389](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43461599389) — **失敗**
   - Blender 5.0.1 の旧FBXインポーター `bpy.ops.import_scene.fbx` が `ModuleNotFoundError: No module named 'numpy'` で停止。
   - 修正: ActionsのBlenderインストール時に `python3-numpy` を追加。Blender内部で `import numpy` を事前検証。
2. [Run 43463595990](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43463595990) — **失敗**
   - NumPy 2.3.5 の読み込みは成功したが、旧FBXインポーターで `AttributeError: 'ImportFBX' object has no attribute 'files'`。
   - 修正: Blender 5では新しい `bpy.ops.wm.fbx_import(filepath=...)` を優先。古いBlender環境向けに旧APIへのフォールバックを残した。
3. [Run 43467108451](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43467108451) — **成功**
   - ワークフロー全体の成功を確認。個々のPNG・GLBの視覚品質や正式採用は別途レビューする。

## 重要な落とし穴

- **Actionsのステップ表示が成功でもBlenderスクリプト自体は失敗し得る。** BlenderがPython例外を表示してもプロセス終了コード0になる場合があった。最終成果物 `front.png`, `side.png`, `angle.png`, `rock_geometry_review.glb` の実在・非空を必ず確認する。
- **Blender 5.0.1の旧FBXインポーターに依存しない。** `bpy.ops.wm.fbx_import` を優先する。Blenderバージョンをログに出す。
- **NumPyはBlenderの実行Python環境から確認する。** OS側に入れたというだけでは不十分。
- **取得したGLTFの外部テクスチャパスに注意。** `textures/...` は正常な相対パスだが、配布URLからの単純な相対取得で404になった。依存ファイルを取得・検証できないGLTFは完成扱いにしない。今回の取得には単体FBXを使用。
- **モデル名の部分一致は危険。** `rock` の部分一致だけでは `Rockingchair_01` が混入した。単語境界に基づいて岩モデルを選ぶ。
- **参照素材と正式素材を混同しない。** 今回の `boulder_01` はPoly Haven CC0の未承認参考モデル。ゲームへの組み込みはレンダリング・ライセンス・容量・見た目の承認後。

## 次回の実行前チェック

1. GitHub `development` と `AGENTS.md`, `docs/3d/BLENDER_DOCKER_HANDOFF.md`, `docs/3d/ASSET_PROMOTION_POLICY.md` を確認。
2. Blenderバージョン、NumPy import、FBXインポーターAPIをチェック。
3. ソースFBXのSHA-256、出典、CC0表記を確認。
4. 正面・側面・斜めPNGとGLBの存在、サイズ、形式、SHA-256を検証。
5. **PNGを実際に開いて目視確認するまで造形品質を保証しない。**
6. 承認前に既存ステージ素材を上書きしない。

## 引き継ぎ

今後のGPT/Claude共同制作では、この記録を岩盤・瓦礫・崖・CC0素材のBlender取り込み時に参照する。

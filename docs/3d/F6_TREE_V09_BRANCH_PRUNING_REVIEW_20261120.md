# F6成木 V09: 枝の分岐集中を整理する実GLB試作

- ユーザー指摘：幹から分かれる部分で枝が重なりすぎる。**葉の密度V08と横に広がる樹冠V25は保持**。
- 対象入力：`F6_painted_bunch_nonuniform_v08_NOT_APPROVED.glb`（V08 GLB SHA256 `6316513dc73ccb5b3dbaaa9d227049a5f9aa66a2139b4e0980f09473569e6099`）。
- 独立GLB：`F6_painted_bunch_pruned_v09_NOT_APPROVED.glb`。trimesh scene graph 273 node → 132 node。**141件の重複する枝・枝先ノードを除外**。葉テクスチャと葉カード6メッシュは無変更。太幹と枝の基礎、7本の主枝は保持。元V08 GLBを上書きせず復元できるよう保存。
- 厳密に言うと「141本の枝」を物理造形で削ったのではなく、**枝に対応する141個のglTFノード／メッシュをV09の独立GLBへの書き出し時に除外**。V08のGLBは無変更。
- VTK EGL 9.6.2へV09実GLBをロードして正面・側面・斜めと葉枝接写4 PNG(1240×980)を実レンダリング。**画像生成ではない**。Blender 5.3とThree.jsでのV09実レンダリングは未実施。
- 目視では中央の枝の混雑が減り、葉群のシルエットは維持。ただし中心上部に枝先の露出は残り、**美術未承認／NOT_APPROVED**。今後は単純な除去ではなく、枝先の方向・長さと葉束の接続を修正する。
- 会話内にV08/V09実描画比較JPG・V09の3方向と接写JPG・実GLB・修正Python・再レンダリングPython・SHA manifestを含む `f6_tree_v09_pruned_actual_GLBRenders_NOT_APPROVED.zip` を保存。GitHubへ画像・GLBのバイナリはまだ保存しておらず、正式アセットへの統合も行わない。

## 使い方
1. V08の配布ZIPから入力GLBを検証し、試作スクリプト `f6_tree_v09_prune.py` の入力パスを調整して実行。
2. `trimesh.SceneGraph.transforms.remove_node` により重複ノードを除外。元V08は不変。
3. `f6_tree_v09_render.py` からVTK描画し、front / side / angle / leaf_detail PNGで比較する。
4. 最終的には共通Blender5.3 ActionsでGLBを確認、Three.js内で正式材質・アルファをチェック。承認後のみ昇格。

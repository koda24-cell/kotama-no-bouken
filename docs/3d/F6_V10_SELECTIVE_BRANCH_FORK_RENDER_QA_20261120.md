# F6 V10 選択的枝整理・復元候補の実レンダリング（2026-11-20）

状態: **NOT_APPROVED**。実際のV08原本ではなく、V27原本＋別系統V31葉束から作ったV08風624束復元候補の派生。原本とゲームのファイルは変更していない。

## 再現できる変更
- 入力GLB: `F6_v08_inspired_candidate624_NOT_APPROVED.glb`、SHA256 `21577c7e9e233a8b55921c53e0b6e4bc906332c9a2ccd7125cda3e0f20ea3820`。
- V15 branchlet各組の重複1枝×10、V16 upper twig各組の重複1枝×8、V14 crown interior末端3 = **21メッシュノードを試作GLBのみに除外**。
- 主枝13本、幹、根、6葉群メッシュは保持。
- 624束の元葉配置を保持し、残す枝の先端から位置を求めて**36束**追加（合計660）。削除・追加は一律密度操作ではない。
- scene nodes 254→233。樹冠AABBの3軸偏差 `<= 0.10`、幹・枝の命名保持assertを実行。
- 出力GLB SHA256: `0d69c92dcde531efe60595b284e6ebfed80ec03a30a5d5c0a28100f7b326f143`。
- VTK 9.6.2/EGLにより front / side / angle / branch_close の実GLBレンダリングPNGと、同視点のbefore/after比較JPGを生成。画像生成AIによる完成予想ではない。**Blender 5.3・Three.jsの新規候補の実行は未検証**。
- 美術QA: 中央の黒い枝重なりは一部改善。ただし右側に露出する小枝、中央の枝接続、葉の平坦さは未合格。元のV08が見つかっていないため完全復元とは呼ばない。
- 成果物: この会話の `f6_v10_fork_review_NOT_APPROVED.zip` にGLB、4方向PNG、4枚比較JPG、修正Python、描画Python、manifestを保管。**GitHubに実GLB・PNGのバイナリはまだコミットされていない**。今後の再開時には必ずZIPを回収する必要がある。
- 正式素材の承認・昇格は行わない。

次: V08元PNG6枚の継続捜索、分岐周囲の接続を近接メッシュで補強。改修した際は実GLB 4方向で繰り返し比較する。

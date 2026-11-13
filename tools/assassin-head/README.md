# Assassin head Blender — 制作・修正メモ

このフォルダはアサシン頭部の**作業場所**です。別チャットの GPT / Claude が再開する場合は、まずこのファイルを読んでください。

- 対象ブランチ: `feature/assassin-head-render-20261113`
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/309 （Draft）
- 造形コード: [assassin_head_blender.py](./assassin_head_blender.py)
- Actions: [assassin-head-render.yml](../../.github/workflows/assassin-head-render.yml)
- 詳細な原因・修正履歴: [ASSASSIN_HEAD_HAIR_FIX_20261113.md](../../docs/3d/ASSASSIN_HEAD_HAIR_FIX_20261113.md)

## 現状（2026-11-13）

| 部位 | 実装状況 |
| --- | --- |
| 肌 | 基本顔メッシュ5,000頂点、三角形面9,900枚。輪郭・目元・耳の精密造形は未完成 |
| 髪 | 100束 × 25断面 × 4頂点 = 10,000頂点。各断面は菱形、側面・両端とも三角形面 |
| 頭頂部 | 隙間を覆う補助スカルプメッシュを追加（髪10,000頂点には**含めていない**） |
| レンダリング | 正面、右側面、左側面、斜めの4方向を出力するコード・CIを用意。**実行成功およびPNG実物は未確認** |
| 正式保存・マージ | 未実施。素材品質の承認が必要 |

## 判明した失敗・原因

1. 三角形化の以前の編集で、Pythonの実際の改行の代わりにリテラル `\\n` をソースへ挿入したため構文が壊れた。現在のコードでは修正済み。
2. 髪が **100束 × 50段 × 2頂点** の薄いリボンだったため、三角形化だけでは立体感が出なかった。現在は **100束 × 25段 × 4頂点** の奥行きがある断面に変更。
3. 頭頂部に基礎となる髪の面がなく、束の隙間から素肌が露出し得る。補助メッシュを追加したが、実際に隠せているかは未検証。
4. 失敗ログの実物は取得できていない。**実際のGitHub Actions失敗原因は未確定**。既に修正した構文・造形上の問題と混同しない。

## 再発防止・次回作業

1. `python -m py_compile tools/assassin-head/assassin_head_blender.py` でPython構文を事前チェック。
2. GitHub Actionsの実行ID、失敗したステップ、ログ、成果物を調査する。Blenderは `--python-exit-code 1` で例外を失敗扱いにする。
3. 頂点・三角形面数を実データから照合。顔5,000頂点・9,900面、髪10,000頂点・19,600面を期待。すべての面が3頂点か確認。
4. **PNGを実際に表示**し、正面・左右側面・斜めで髪の厚み、前髪の重なり、頭皮の露出、ポニーテールの根元と毛先、肌の輪郭を厳しく評価。
5. 作業前後のモデルと原因をここにも記録。重要な詳細は `docs/3d/ASSASSIN_HEAD_HAIR_FIX_20261113.md` に追記。
6. ユーザー承認前に正式アセットフォルダへの昇格や `development` へのマージをしない。

**品質メモ:** 頂点数が合っていても参考イラストの造形再現を保証しない。現在の毛束は最低限の立体化段階で、視覚的な品質は未承認。

## リポジトリの運用ルール

- [AGENTS.md](../../AGENTS.md)
- [BLENDER_DOCKER_HANDOFF.md](../../docs/3d/BLENDER_DOCKER_HANDOFF.md)
- [ASSET_PROMOTION_POLICY.md](../../docs/3d/ASSET_PROMOTION_POLICY.md)

## 2026-11-13 再チャレンジ
- 4方向レンダリングの処理を再実行対象としてコード更新（commit `1d68013c`）。pushトリガーに該当する `tools/assassin-head/assassin_head_blender.py` を変更。
- 従来の Cycles 24 samples から、Blender 3.x は EEVEE、4.x は EEVEE_NEXT に切り替え、CPUレンダリング負荷の軽減を狙う（品質確認前の試験設定）。
- 4枚のPNGファイルサイズ、顔5,000/9,900、髪10,000/19,600 の頂点・三角形数をBlenderスクリプト内でも assert。
- **未検証**: GitHub Actions のrun結果、Blenderバージョン互換性、実際の画像品質。成功と記載しない。失敗したらrun ID/ログを参照して修正する。

## 2026-11-13 再調査：実行状況とCPUレンダリング対策
- GitHub接続でコミットの combined statuses と PRトリガーの workflow runs を調査したが、どちらも空。これだけでは push 起動の有無や失敗理由は判定できない。
- 公開GitHub Actionsページの直接取得は環境のアクセス制限で失敗し、run ID/ジョブログを取得できなかった。原因の確定には実際のrun URLが必要。
- 先のEevee切り替えはヘッドレス環境のGPU/OpenGLやBlender版によるエンジン名の互換性問題を生む可能性がある。**原因としては仮説**。
- 診断目的でBlenderのCPU Cycles、8サンプル、512×512に変更（commit `11a015dd`）。4方向PNGの生成確認を優先し、品質確認後に解像度とサンプル数を戻す。
- Blender/Actions実行成功・PNG実物は未確認。次回はActionsのrun IDと失敗ジョブログを取得し、失敗ステップ別に修正する。

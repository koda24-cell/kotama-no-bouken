# 一層3F 神域ダンジョン試験組込み（現行V3）

現在は画像付き6批評に基づく閉鎖神域V3「苔むす封祠」。`scene/game-layout-v3.json` と追加5個別素材を使う。構造設計は `F1_CLOSED_RUINS_V3_DESIGN.md`、改修と証拠一覧は `../reviews/f1-closed-ruins-v3/README.md`。

ユーザーの「試しに組込みよろしく」により試験組込みを実施する。最終的な美術承認・通常表示への昇格とは区別する。

`index.html?f1sacred=1` でゲームを開き、一層3Fへ進むと新しい静的環境を読む。URL指定のない通常表示と一層1F/2Fは従来経路を維持する。セーブ形式・map・固定ID・FOE・イベント処理は変更しない。

以下は初回V2の履歴。元のJSON/素材/検証記録はV3でも上書きしない。

- 初回development e6b07b2の7 sourceを照合し、別の `scene/game-layout-trial.json` を生成。元の候補JSONと制作時の証拠は保持。
- 床/壁/植生/非歩行土壌/天井をhash確認後に組み、16m空間bucketでInstancedMeshへまとめる。全検証成功後にだけworldへ追加。
- 水、固定7対象、採集/箱開閉/灯/NPC/階段/ボス門、FOEは既存処理を継続。新データから独立した通行ルールを作らない。
- 失敗時は旧F1の静的表示へ戻す。ほかのフロアの3Dを無効にしない。

## 試し方

リポジトリ直下で `python -m http.server 8796` を実行し、`http://localhost:8796/preview/f1-sacred-playtest.html` を開く。実際のindex.htmlを使い、一層3Fから開始する。試遊内のlocalStorage/sessionStorageはメモリへ分離し、通常セーブを読み書きしない。再読込で試遊進行は消える。

通常進行から見る場合は `http://localhost:8796/index.html?f1sacred=1` を使う。この経路は通常ゲームのセーブを使うため、保存分離を希望する場合は上記試遊ページを選ぶ。

実ゲーム証拠は `docs/reviews/f1-sacred-forest-game-trial/`、保存分離証拠は `docs/reviews/f1-sacred-forest-playtest-page/` に保存する。実機FPSと最終美術承認は未完了。平坦な地形、背景の抜け、遠景植生には改善余地がある。mainへのマージや一般向け既定表示への変更は行わない。

## 初回V2の実行結果（2026-11-17 JST）

`node tools/f1-sacred-forest/verify-game-trial.cjs` は3 sessions / 16 checks / 13 screenshotsでpass。通常表示・opt-in・意図的SHA不一致を分離し、移動/壁衝突/宝箱80G一回/モデル交換/NPC/看板/灯/階段往復/戦闘帰還/旧表示fallbackを確認。page/console errorとGPU upload警告は0。通常preload警告や外部font接続問題はレポートに保持する。保存分離ページの別テストもpass。これらは長期進行・実機FPS・最終美術承認を含まない。

## 現行V3

天井504・開口3・far40m。苔が横断する床、根付き瓦礫/低木/下草、不定形岸、水面normal、水底/藻、鳥居から祠へ6mの同軸配置を追加。既存map/機能を保持。新5GLBと元17GLBの確認、編集Blend再open、104経路の実形状検査はpass。最終実ゲームQAは `tools/f1-closed-ruins-v3/verify-game-v3.cjs`、結果は `docs/reviews/f1-closed-ruins-v3-game/`。実機FPS・最終美術承認は別。

V3の最終実行は3 sessions / 18 checks / 実ゲーム画像16枚でpass。通常1F/2F、移動/宝箱/NPC/灯/階段/戦闘帰還/不一致fallbackを確認。page/console errors0、WebGL upload警告0。実geometry rayは歩行床2466点で天井被覆100%、局所3開口は実空洞。詳細な履歴・再利用画像のSHA証明は上記review folderへ保存。

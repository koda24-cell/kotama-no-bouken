# 一層3F「鎮守の根庭」試験組込み

ユーザーの「試しに組込みよろしく」により試験組込みを実施する。最終的な美術承認・通常表示への昇格とは区別する。

`index.html?f1sacred=1` でゲームを開き、一層3Fへ進むと新しい静的環境を読む。URL指定のない通常表示と一層1F/2Fは従来経路を維持する。セーブ形式・map・固定ID・FOE・イベント処理は変更しない。

- 最新development e6b07b2の7 sourceを照合し、別の `scene/game-layout-trial.json` を生成。元の候補JSONと制作時の証拠は保持。
- 床/壁/植生/非歩行土壌/天井をhash確認後に組み、16m空間bucketでInstancedMeshへまとめる。全検証成功後にだけworldへ追加。
- 水、固定7対象、採集/箱開閉/灯/NPC/階段/ボス門、FOEは既存処理を継続。新データから独立した通行ルールを作らない。
- 失敗時は旧F1の静的表示へ戻す。ほかのフロアの3Dを無効にしない。

## 試し方

リポジトリ直下で `python -m http.server 8796` を実行し、`http://localhost:8796/preview/f1-sacred-playtest.html` を開く。実際のindex.htmlを使い、一層3Fから開始する。試遊内のlocalStorage/sessionStorageはメモリへ分離し、通常セーブを読み書きしない。再読込で試遊進行は消える。

通常進行から見る場合は `http://localhost:8796/index.html?f1sacred=1` を使う。この経路は通常ゲームのセーブを使うため、保存分離を希望する場合は上記試遊ページを選ぶ。

実ゲーム証拠は `docs/reviews/f1-sacred-forest-game-trial/`、保存分離証拠は `docs/reviews/f1-sacred-forest-playtest-page/` に保存する。実機FPSと最終美術承認は未完了。平坦な地形、背景の抜け、遠景植生には改善余地がある。mainへのマージや一般向け既定表示への変更は行わない。

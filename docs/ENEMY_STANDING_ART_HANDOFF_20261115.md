# 敵立ち絵 保存・表示対応

ユーザーがこのチャットの全画像保存・敵表示への紐づけ（騎士を含む）を依頼。元画像は削除せず、新規PNG6枚として追加。

|敵ID|敵名|画像|
|---|---|---|
|mushroom|キノコもどき|mushroom-standing-v1.png|
|mist-bat|霧コウモリ|mist-bat-standing-v1.png|
|ore-crab|晶石ガニ|ore-crab-standing-v1.png|
|wraith|さまよう亡霊|wraith-standing-v1.png|
|hiddenBossData|混沌の幻影|chaos-phantom-standing-v1.png|
|dark-knight|魔王軍の騎士|knight-standing-v1.png|

画像ディレクトリは `assets/monsters/`。騎士は白銀・紺のデザインをそのまま敵に採用（ユーザーの敵としての紐づけ指示）。味方の職業画像は変更していない。

一般敵は `data/field-enemies.js`、隠しボスは `data/enemies.js` のimageを更新。戦闘表示・図鑑は既存のimage参照を使用する。ステータス・AI・出現条件は変更しない。全6枚は静止画であり、今回GIF化はしていない。

## Claude引き継ぎ
PNGは直接編集・表示可能。元画像とSHA-256、寸法、対応IDは `assets/monsters/standing-art-manifest.json`。画像修正は同じ敵IDを維持し、別バージョン名で追加してimageを変更する。元GIFは保持。ブラウザでの実戦・図鑑目視確認は未実施。

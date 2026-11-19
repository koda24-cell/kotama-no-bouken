# 第2層 氷洞窟水車 — 木製ハブ片側1個 設計 V01

作成日 2026-11-19 JST / 状態: 設計済み・Blender実検査待ち / NOT_APPROVED

## 対象・既存互換
- **木製の中心ハブ1個のみ**。旧3D水車・外輪V11・スポークV02・羽根・ゲームのコードは不変更。
- `development:field/assets/b2-frozen-waterwheel-scene.js` にてX軸回転、中心(0,3.7,0)、中心車軸半径0.30m、両側の輪位置X=±0.42m、R=2.55m、14スポークを確認。
- 本モデルはX=0で制作し、ゲーム配置の片側X=±0.42へあとから移動する設計。2個目は生成しない。
- 過去ユーザー承認: 外輪V11、スポークV02の**美術判断**。両者の正式保存・ゲーム採用が完了したという意味ではない。

## 実物・技術観察
- [Fränkisches Freilandmuseum: Ausrichten der Speichen am Wellbaum](https://freilandmuseum.de/entdecken/neuigkeiten-und-blogs/einzeleintrag/ausrichten-der-speichen-am-wellbaum) — 大きな木軸に放射状の四角いスポークを挿し、肩と接触面で荷重を受ける。樹皮に近い粗い木肌と部位ごとに異なる摩耗が確認できる。
- [Monumente Online: Hüvener Mühle](https://www.monumente-online.de/de/ausgaben/2025/3/Huevener-Muehle.php) — 軸近傍に帯状補強があり、付け根は単なる棒の重なりではない。今回の金属補強は別パーツとして保留。
- [Library of Congress: Thomas Shepherd's Grist Mill hub](https://www.loc.gov/resource/hhh.wv0152.photos/?sp=10) — 中心軸と多数の放射スポークの組み付き、ボルト配置を参考。写真は鉄製要素もあり木材形状の直接コピーはしない。
- [A Design Manual for Water Wheels](https://www.echocommunity.org/resources/02c8f909-b697-42b8-ab8b7979aa19caa9) — 軸と輪の接合およびスポーク剛性が重要。
- Pinterest公開ピンの確認は現時点では未取得・未保存。ライブラリ側へ調査依頼を記録する。画像を使ったと偽らない。

## 断面・接合方式（設計値）
- 軸穴: 半径 **0.303m**。元軸R=0.300mとのクリアランス3mm/半径。円形貫通穴を完全なメッシュ開口として作る。
- 木胴: X方向長さ **0.36m**、外半径最大 **0.615m**。外端の摩耗した段付き/面取りを0.01–0.02m程度で表現。
- 14個のスポーク座: 角度ピッチ `360/14 = 25.7142857°`。木胴の外周から半径0.50–0.635mまで差し込む独立した実形状の矩形モルティス（Boolean difference）。
- 各モルティス: 幅（接線方向） **0.152m**、軸方向 **0.192m**。片側スポークV02の根元径に合わせて**候補の初期値**とする。
- 干渉リスク: スポークV02はR=0.34まで伸び、ハブの座穴底はR=0.50なので未組立では重複する可能性がある。承認済みスポークを勝手に切らない。仮組み検査と改修案は別途判断。
- 外周木肌: 幾何の細かな経年変形は2–4mm程度、14座の寸法差を壊さず、人工的な均一ギザギザを避ける。
- **今回の設計は完成した実機の工学強度保証ではない**。見た目とモデル互換のための設計草案。

## 質感、材質とUV
- V11外輪のSHA検査済みBlendからPacked PBRマテリアルを**読み取り専用でappend**する。Poly Haven [Fine Grained Wood](https://polyhaven.com/a/fine_grained_wood)（CC0）の画像、ノーマル、ラフネスを活用。
- 長手木目の独立UV、切断された側面の木口には別マテリアルを割り当てる。氷・金属帯は**別部品**として本PRでは作らない。
- 森林の明るい茶色ではなく、湿った暗褐色の木材。写真をそのまま貼り過ぎず、反復とグレー化を実画像で評価。

## モデリング実行と品質ゲート
1. 外輪V11原本の取得→BLEND SHA256検証。
2. X軸の空洞木胴をリングメッシュとして制作。元軸の半径0.30mを侵さない。
3. 14個の差し込み座をBoolean difference。頂点・面数・座幅をmanifestに記録。削り残しがあれば検出。
4. 実Blender Cyclesで正面/側面/斜め/背面のPNG。BLEND/GLB/JSON SHA。Artifactの一時保存14日。
5. 4方向での座の見え方、側面の厚さ、木肌、GLB孔抜けをレビュー。実画像がない場合は成功宣言しない。
6. 旧スポークV02と外輪V11を非破壊仮組みして衝突を検証するまでは完成品としてゲーム採用しない。
7. ユーザーが木製ハブそのものを美術承認してから正式素材への保存PR。PR base=development、mainは触れない。

## チェックポイント
- 旧外輪V11 run 44436858908 (artifact 14488839107)
- 旧スポークV02 run 44439763572 (artifact 14491355757)
- 本モデルが自己完結した木製ハブだけであることをGLBで検証。

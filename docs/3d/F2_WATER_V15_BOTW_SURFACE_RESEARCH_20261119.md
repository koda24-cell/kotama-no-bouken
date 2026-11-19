# 第2層・V15のためのゼルダBotW水面比較研究

更新日: 2026-11-19 / PR #517 / **調査・設計のみ。V15モデル/レンダリングは未制作・未検証。**

## 対象と前提

V14では川底の奥行き0.1〜3mと深度による透過・色減衰を導入し、深場が見えない改善を実PNGで確認済み。現在の課題は「水面が薄いガラス膜に見える」「白い反射線が貼りついて見える」「岸際の接触感」「水平な境界」。V14の河床モデルと水深マスクは**保持**。

## 任天堂の公式発言から言える範囲
- [CEDEC2017 レイヤーで描くBotWの世界](https://cedec.cesa.or.jp/2017/session/VA/s58eed7182c81b.html): 近・中・遠景と時間・空間を意識した絵作り。**水面シェーダー固有の数式や素材構成は公開概要から確認できない**。
- [CEDEC2017 BotW VFX](https://cedec.cesa.or.jp/2017/session/VA/s58eed8209ffce.html): スタイライズド表現と膨大なエフェクト制作が課題。水や溶岩の特殊な質感制作/監修を担当した開発者が登壇。**特定の屈折値やSSR実装を任天堂公式の確定仕様として報告しない**。

## 実ゲーム画面・視覚参考と解釈
- [Hylia Riverのゲーム画面](https://www.zeldadungeon.net/wiki/Hylia_River) には、流れ方向に伸びる幅のある反射の繰り返しと青緑の地色。スクリーンショットは撮影状況依存。
- [ゲーム内河川の浅瀬](https://www.gamesradar.com/zelda-breath-of-the-wild-tips/) は、近岸の底可視/奥の水面反射が共存。
- [浅瀬の光が落ちる場面](https://konc.hatenablog.com/entry/2020/01/14/195704) は、白い模様が全域均等ではなく広い反射帯＋局所的な明るい波として見える。
- 以上は画像を見た**視覚観察**で、どのシェーダーコードを使ったかは画面だけから特定できない。

## 任天堂とは別の、再現向け検証可能な技術資料
1. [NVIDIA GPU Gems 第1章](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)：低周波の幾何波と高周波の法線波を分ける。水深で透明度・反射・波振幅を制御する例がある。
2. [NVIDIA GPU Gems 2 第19章](https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-19-generic-refraction-simulation)：複数BumpのアニメーションとFresnelによる反射/屈折混合、屈折用のテクスチャ座標オフセット。
3. [Three.js WaterMesh](https://threejs.org/docs/pages/WaterMesh.html)：将来のブラウザ実装候補。エンジン版に応じてAPIを再確認。現段階でゲーム本体への統合はしていない。
4. [Cemuを用いたBotW反射のコミュニティ調査](https://www.resetera.com/threads/zelda-breath-of-the-wild-the-technical-analysis.8197/)：SSR/環境反射の議論があるが、一次のNintendo仕様ではなく未確定の検証仮説。

## V15の優先改善内容（評価はA/B）
1. **水面の広い反射**：V14の極細白線ハイライト画像の寄与を下げる。既存の画像を削除せず、低周波の1〜3本の大きな光帯をカメラと光方向に応じた材質出力として重ねる。全面一定のEmissionは使わない。
2. **波の異方性**：川の流向を定め、長い緩い波は流向、細かいNormalは斜交する2波を時間差で動かす。直線を均等に敷き詰めない。Blender静止画では異なる時間パラメータの2〜3フレームも比較候補。
3. **水深連動のFresnel**：V14のbathymetryを維持。浅場では底透過、深場では反射/青緑が優勢に見える。ただし単一の距離依存ではなく水深・視線角を独立調整。
4. **岸際**：水面交差部の青い細い硬線は、局所的な明暗/泡片/湿った石で誤魔化さず、実寸と地形形状に合わせてなめらかにする。泡は落差/障害物に近い場所だけ。
5. **水平線の検査**：深場の帯は地形端・水メッシュ端・ミスト・深度マスク境界のどれが原因か、1つずつON/OFFして対照PNGを残す。

## 判定基準
- 正面/側面/斜め実PNG、可能なら時間違いの水面を比較。浅瀬は底の石が鮮明、深場は消失する。水平帯、格子caustics、白い規則線、ゼリー/曇りガラスがない。水面に方向性と大きい反射が見える。軽量化は実画質の後に検証。
- ClamAVの取得前・取得後スキャン、SHA、3方向PNG、Blender保存を継続。制作は分岐ブランチのDraft PR #517上。承認前にdevelopmentやmainへ素材統合しない。

## Pinterest参照
- Pinterestの風景ボードで `zelda breath of the wild river water surface reflections ripples screenshot` を推薦検索し、候補1件のみ（Pin ID 418201515412997424）返答。**Pinの実画像・ライセンス・適合の精査は未完了、未保存**。公的なゲーム画像およびNVIDIA一次資料で補完。


## V15 試作コード実装（2026-11-19）
- **変更範囲**: 独立ブランチの`tools/f2-water/render_water.py`と専用Actions workflowのみ。V14の0.1–3m深度を持つ河床地形、深度に応じた混合と水面境界、既存岩/テクスチャを変更しない。
- V7の白い稜線の乗算係数を0.075→0.038、画像オーバーレイ0.55→0.40、AI画像0.37→0.25に低減し、表面の白線過多を抑える。
- ワールド座標を(X方向1.28,Y方向0.32)に異方性変形してゆっくりYへ伸びる低周波ノイズを作り、MapRangeのsmoothstepで連続的な反射分布を生成。`Glossy` BSDFを低周波Normalへ追加し、**Emission白線ではなく、シーン照明を反射する**光沢層として独立混合。元の細い法線は屈折層に保持。
- 深度マスクはV14のものを反射強度へ再利用（浅瀬28%、深場100%の範囲）。岸側の透過を残し、深場で表面の反射が見えやすい構成。
- **未確認**: 本処理を実際のBotWの実装だとは断定しない。Three.jsアニメーション本番移植や性能測定、別時間の波の実比較はまだ実施していない。
- [V15 Actions Run #44522093805](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44522093805)。この追記時点では起動済・実描画/目視/品質審査前。合格まではNOT_APPROVEDを維持。


## V15実レンダ結果・3方向画像レビュー（2026-11-20）
- [Actions #44540883021](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44540883021) は **success**。一度目 #44522093805 はaptのUbuntuミラーHTTP 503多数でBlenderインストール前に失敗。次の試行ではapt取得に最大4回再試行を導入して解決。成功は環境セットアップを含む全ジョブ・全ステップで確認。
- Artifact **14538937033**、ZIP約6.73 MBを取得、`f2-water-v15.blend`、front/side/angle PNG、scan/render manifest確認。3画像のSHA-256をmanifestと照合しすべて一致。
- 実スキャン ClamAV 1.5.4/28188、exit 0、`river_small_rocks_diff_1k.jpg: OK`、SHA-256 `adbcaae1f1445d5b49797c71ea2c3f43ccaf7b109f933a427f0d0993d1dbbc51`。`safety_check=CONFIRMED_OK`、`approval=NOT_APPROVED`。
- 深度測定はshore **0.107m**、middle **1.541m**、deep **3.000m** を維持。
- **品質レビュー: 未合格。** V15は水面に広い流れ方向の明暗・ハイライトが増えて、水面の存在がV14より明確。一方、正面の深場と浅場の間に横一直線の強い帯が残り、斜めには水面素材の長方形境界がはっきり見える。側面では白っぽい線がやや規則的に流れ、広い透明膜を貼ったような見た目になっている。深場の遮蔽と浅場の視認性は保たれた。
- 次の優先度は **水面外周/遠景の直線境界がどのメッシュ・マスク由来かを分解して消すこと**。反射の形・強度の調整はその次。V15をゲーム本番には採用しない。

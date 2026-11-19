# 第2層・V14 浅瀬から深場への水深グラデーション実装・検証

更新: 2026-11-19 / 制作PR #517

## V13で発見した根本原因
- V13の川底は `primitive_plane_add`、Z=-0.45の平面で、全域の水面と川底の距離はほぼ一定だった。透明/屈折の調整だけでは遠くの底まで同じように見えた。
- 「画面の奥」は単にカメラから離れた領域。光の減衰を決めるのは本来の**水深（光路長）**であり、距離だけをキーにすると不自然になる。深場が遠景側へ配置されるよう、今回のレビューカメラを岸側から川を見る構図に変更。
- V13実画像では、格子模様は解消したが薄い青緑の膜だけで深さの変化が無かった。

## 技術資料
- [Unreal Engine Single Layer Water（公式）](https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine)：吸収係数と散乱係数を別々に制御し、薄い水と深い水を区別。
- [Blender Volume Absorption（公式）](https://docs.blender.org/manual/en/4.1/render/shader_nodes/shader/volume_absorption.html)：光路で色と光量を減衰させる。将来のボリューム実装候補。
- [水深と水底の可視性を比較した研究](https://www.tandfonline.com/doi/pdf/10.1080/19475683.2015.1050064)：深いほど水底の寄与が減少。
- [CEDEC2017 任天堂BotW VFXセッション](https://cedec.cesa.or.jp/2017/session/VA/s58eed8209ffce.html)：水/溶岩の特殊質感も制作・監修対象だったことは公式に確認できる。ただし、水深→色/透明度の正確な実装式は公開セッション概要からは分からない。V14はその再現を断定しない。

## V14の試験内容
- 川底メッシュを76×76グリッドにし、実際のZを `depth_at(x,y)` に沿って変化。岸の0.1m程度から深場の約3mへなだらかに下がる地形を造形。石や砂利の位置も局所の川底Zに追従。既存の岩と原画像テクスチャを保持。
- テクスチャ水面側に別の深度マスクを用意し、岸際はほぼ透過、深い位置では青緑の水面混合を増やす。物理的な光路積分によるBeer-Lambertではなく、実形状と対応づけた**軽量・見た目優先の近似**である。
- カメラは岸側（+Y）から深い水域（-Y）を見るように変更。正面/側面/斜め全方向で「浅瀬→深場」の見え方を確認。
- `render_manifest.json` にshore/middle/deepの計測水深を追加。Actionsの検証ステップで `deep > middle > shore` と深度差>1mを自動判定。ClamAVのfail-closedを維持。
- 追加の外部素材や無検査ファイルを使用しない。既存の表面カラー/アルファ/法線は保持。正式ゲーム素材への昇格は未承認。

## 状態・証拠
- GitHub feature branchにV14コード保存・ワークフロー発火を確認。
- [V14 run #44514755761](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44514755761) は2026-11-19時点で実行開始。**実スキャン成功・実PNG・品質判定はrun検証まで未確認**。
- V13 [#44468842269](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44468842269) は実成功。V13とV14のカメラ位置が異なるので同一画角の厳密比較はまだできない。


## 実行後レビュー（2026-11-19、Run #44514755761）
- **Actions成功**、scan-render / publish-run-linkとも全ステップ正常終了、Artifact ID **14526054365**、ZIP 6,719,746バイト実取得。
- `scan_manifest.json`: ClamAV 1.5.4/28188、`clamscan` exit 0、`river_small_rocks_diff_1k.jpg: OK`、SHA-256 `adbcaae1f1445d5b49797c71ea2c3f43ccaf7b109f933a427f0d0993d1dbbc51`。検証後の素材と一致。
- 実際のfront / side / angle PNGを展開して目視。全3枚、`render_manifest.json`に記録されたSHA-256と照合して一致。実ファイル `f2-water-v14.blend` をZIPに確認。
- 水深ログ: shore **0.107m**、middle **1.541m**、deep **3.0m**。浅瀬では川底が明瞭、深い側は青緑色へ減衰して石の視認性が大きく低下。**V13からの課題だった全域均一の川底可視性に改善あり**。
- **美観は未合格**：正面画像の深場との境界に幅広い水平の帯が見える。斜め方向では岸と水底の境界が均一な薄いフィルム状に見え、水面が厚いガラス板のような印象。側面では水のメッシュ外縁と底面の境界が直線。石が角張り、接地・大きさが水深に見合わず、実際の小川のようには見えにくい。
- 次: (1)正面の目立つ帯の原因が水面メッシュ端/遠景ミスト/材質なのかを分離したA/B実レンダ (2)岸際の薄いフィルム状境界をマスクと弱い泡で改善 (3)最終的な深度透過の滑らかさと色相を検証。V14を承認済みとしない。

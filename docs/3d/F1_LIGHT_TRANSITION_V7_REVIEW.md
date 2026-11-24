# 第一層V7: 暗部の明視性・2F内の石組み推移

ユーザー指摘: 暗すぎて床/草/壁が読めず、2Fに入った瞬間に壁の形・質感が変わる。1Fと3Fの品質差は2F内で自然に繋ぐ。

## 実装

制作済み原本/候補を保持し、今回は配置・既存材の扱い・照明を変更。新規GLB/テクスチャ/外部package/並行agentなし。試験表示だけで、通常表示とマップ/保存/報酬は維持。

2Fの上り階段・下り階段からの歩行距離をそれぞれdu/ddとして、t=du/(du+dd)を固定配置の基準にする。ワールドX/Zやプレイヤーの移動時刻ではなく迷宮の道のりに沿う。t<=.5は1Fの元壁をそのまま残す。後半は下表で隣接する2段階のみをセルの固定hashで分配し、同じ場所へ戻っても変化しない。

|道のり|壁|
|---|---|
|0–50%|元の1F壁|
|50–62.5%|元壁から中間A|
|62.5–75%|中間AからB|
|75–87.5%|中間BからC|
|87.5–100%|中間Cから実際の3F壁|

3F壁はmod_sacred_wall_4m.glbを元のSHA-256で検証して再利用し、見た目が似た別の終端壁ではなく同一源を使用する。各native壁に元の歩行セルを記録し、置換対象の壁だけを非表示にする。ロード失敗/解放時は元壁を復元する。

native石材の詳細テクスチャ混合も前半は1Fと同じ.38/normalScale .28を維持し、後半で.68/.5まで段階化。既存診断stoneDetailBlendは互換用の最大値であり、2F全域へ.68を適用する意味ではない。苔/下草/柱の配置頻度も同じ進行度に従う。既存の草カード3種と岩3種は全階で同じ原本を使用。

試験表示の1F〜3Fには共通のやや暖かいHemisphere（high1.9/low2.2・ground0x626f58）、低強度Ambient(.32)、露出1.48を適用。点灯箇所の追加だけで明るくせず、足元の拡散光を持ち上げる。天井/開口/霧の密度/描画距離は維持。通常表示は露出1.3・追加Ambient0。

## 証拠・再現

- runtime checkpoint: 2744ad727f3b44140b8438e5d663db1f4affce9b。新しいプレビューはこの固定ソースへ接続し、前回の配信回復を維持する。
- `node tools/f1-v6/verify_transition_policy.cjs`: 実マップ264歩行セルの前半すべてnative、階段側のt=0/1とnative/実3F壁の一致、全中間種の存在を確認。セル数はnative148/A26/B63/C20/F3 7。壁の枚数とは区別。
- `node tools/f1-v6/verify_transition_v7.cjs`: 実index.html/実GLBを使い、a86da4aの旧runtime3ファイルをbefore条件だけに差し替え、同位置・同じ視点・同じ表示サイズを撮影。1F/3F各1地点と2F5地点。Three r180のみ既存ローカルpackageへ置換し、ネット配信の検査とは区別する。入力ファイルSHAは実行前後照合。source.commitは開始時のbaseで、正確な検査入力はsource.inputs、上記checkpointと照合可能。
- 結果/実PNGはdocs/reviews/f1-v7/。追加壁/岩の通路検査と実ネットの配信チェックは別に記録する。

新素材の正式昇格・最終美術承認・実機FPS評価・main変更は行わない。

## ローカル実画面検査の結果

全14PNGと通常表示の検査をpass、page/console errors0、実行前後の検査入力SHA一致。2Fの実壁504枚は元壁291・A52・B104・C42・実3F壁15。選んだ5地点のtは.122/.477/.640/.826/.965で、前2地点はnative、後半は中間壁から実3F壁へ移る。比較図は2f-before-after.jpg。

同位置の7組で8bitグレースケール平均は2.20〜3.01倍（1F2.64倍/3F2.49倍）。これは同条件のスクリーンショット内の指標で、測光/FPS/全視点の画質認定ではない。床・壁の凹凸を実画像で確認した。通常表示は露出1.3/hemi1.7/追加fill0、候補表示なしを確認。

verify_v7_clearance.pyは既存の実GLB/経路検査器に今回の実配置記録を入力し、岩/置換壁930配置・675経路の保守的boundsで幅1.8m通路との重なり0。元壁と既存の軟植生/階段は別扱い。追加の角柱は既存mod_pillar_cornerの実bounds±.587mをscale.7で角±1.65mに置き、中心帯との余裕は少なくとも約.339m。原本の作り直しや不可視化で通路を確保したものではない。

## 実ネット検査と配信補修

新しい固定SHAの実ネット検査でnativeの採集ポイントGLBが403となり、起動を阻害するケースを再現（f1-v7-delivery/iterations/initial-model-403.json）。親previewだけへ、固定repo/SHA内GETを別CDNへ再試行するinstallAssetRecoveryを追加。ゲーム/モデルのbyteはcheckpointから変更せず、GLBのhash確認も維持。他のURL/非GET/abortは元の契約に従う。

再現はローカルHTTP8839でparentを配信し、`BROWSER_IGNORE_PROXY_CERT=1 DELIVERY_BASE=http://127.0.0.1:8839 DELIVERY_OUT=docs/reviews/f1-v7-delivery DELIVERY_FLOORS='[1,2]' node tools/f1-v6/verify_delivery.cjs`。管理proxy証明書例外は検査用ブラウザだけ。配布コードではTLS検査を無効にしない。

採集GLBのFastly応答を503にする故障注入後、成功するモデルは実ネットの別経路から取得し、2F/3Fの描画・全候補hash・通常保存sentinel不変・子のmemory saveVersion12をpass。隔離entryを3配信先すべて503にした場合はiframe空/通常保存不変をpass。page errors0、実PNG/JSONをf1-v7-deliveryへ恒久保存。親HTMLはローカル配信で、raw.githackのHTML自体をこの環境で開けたという証跡ではない。モデル故障を注入しないローカル1F〜3Fの比較は前述の独立検査。

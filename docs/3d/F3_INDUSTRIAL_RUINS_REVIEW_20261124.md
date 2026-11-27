# 第3層「遺跡都市」工業廃墟の改修・確認資料

対象はarea3、ゲーム内7–9F。ユーザー訂正どおり階層の移動は行わない。追加20パーツと既存5種の強化を個別に制作し、既存承認済み階段2点を再利用した。候補の美術承認・本番昇格・mainマージは行っていない。通常表示は従来の遺跡都市を維持する。

## 試験入口

[7Fから試す](https://raw.githack.com/koda24-cell/kotama-no-bouken/cdf79cddbc45bd077ce13a1f9fa4ea6e6ed47270/preview/f3-industrial-playtest.html)。raw.githackの案内が出た場合は「Open the page」を押す。ヘッダーの7F/8F/9Fから切り替えられる。素材・ゲームコードは固定SHA `f2645ec8e619940464d7072a308338e75ac63d66` に固定。

通常セーブを読み書きしないメモリ保存の試験画面。見学時は開始地点を変えず既存の通れる街路へ向き、導入会話を省く。再読み込みで試験の進行はリセットされる。見学時はランダム戦闘を止め、FOE接触は通常どおり。通常戦闘へ切り替えるリンクもある。

## 調査・空間構成

[制作前の構造設計](F3_INDUSTRIAL_RUINS_DESIGN_20261124.md)、[Pinterest公開参考24件と採用判断](research/F3_INDUSTRIAL_PINTEREST_20261124.json)。参考写真や既存ゲームの画像はテクスチャへ転用していない。BOTWの遠近景構成、原神の植生群落、エンドフィールドの設備と自然の侵食関係を方向性の目安とし、同等の美術品質に到達したという認定ではない。

7Fは旧市街と電力設備、8Fは工場と保守歩廊、9Fは崩落した交通結節点を強める。既存マップ、階段、イベント、報酬、パズル、戦闘導線を維持した。曇り空と灰緑の靄、欠損した連続外壁と背面遮蔽、グリッド視線判定で隣の街区を見通せない構成にした。暗さではなく近景の輪郭と足元が読める明るさで廃墟の空気を出す。

壁面の窓・シャッター・工場扉を組み合わせ、頭上の歩廊には橋脚を付けて上下の構造を繋ぐ。通路中央の1.8mを確保し、設備と瓦礫は壁際または非歩行領域へ。装飾歩廊は頭上3.55m、実際に登る新規ルートや当たり判定の追加ではない。

## 素材と個別納品

Poly HavenのCC0 `chipped_concrete`、`concrete_moss`、`rusty_iron`、`asphalt_02`を利用。既存の検査済み画像を優先し、新規取得画像も取り込み前に実スキャンした。公式URL・ライセンス・SHAは候補ルート `textures/sources.json`。雨筋、欠け、割れ、錆、蔦の葉脈等の派生画像は自作。共有画像は同一の画像byteをまとめ、近景の形状やテクスチャを劣化させない。

Blender5.3.0 + ClamAVの固定コンテナで、1点ずつ造形・GLB再取り込み・front/back/side/angle/topの実PNG・出力検査・Git保存を行った。並行モデリングagentなし。以下は全てNOT_APPROVED。各フォルダのmanifestと共有QA receiptに元commit/run/全ファイルSHAがある。

| 個別パーツ | 区分 | 三角形相当 | 恒久納品 |
|---|---|---:|---|
| 剥落した鉄筋コンクリート壁 | 追加 | 2,528 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/retaining_wall/renders/f3_retaining_wall/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/retaining_wall/props/f3_retaining_wall.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/retaining_wall/portable_sources/f3_retaining_wall_authoring.blend) |
| 露出した梁柱接合部 | 追加 | 3,460 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/column_joint/renders/f3_column_joint/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/column_joint/props/f3_column_joint.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/column_joint/portable_sources/f3_column_joint_authoring.blend) |
| リベット付き腐食I桁 | 追加 | 3,156 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/riveted_girder/renders/f3_riveted_girder/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/riveted_girder/props/f3_riveted_girder.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/riveted_girder/portable_sources/f3_riveted_girder_authoring.blend) |
| 座屈した鉄骨門型フレーム | 追加 | 1,748 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/buckled_portal/renders/f3_buckled_portal/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/buckled_portal/props/f3_buckled_portal.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/buckled_portal/portable_sources/f3_buckled_portal_authoring.blend) |
| 欠損グレーチング歩廊 | 追加 | 4,896 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/grating_catwalk/renders/f3_grating_catwalk/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/grating_catwalk/props/f3_grating_catwalk.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/grating_catwalk/portable_sources/f3_grating_catwalk_authoring.blend) |
| 崩れた工場保守階段 | 追加 | 11,060 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/service_stair/renders/f3_service_stair/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/service_stair/props/f3_service_stair.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/service_stair/portable_sources/f3_service_stair_authoring.blend) |
| 踊り場と曲がった手摺 | 追加 | 928 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/landing_railing/renders/f3_landing_railing/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/landing_railing/props/f3_landing_railing.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/landing_railing/portable_sources/f3_landing_railing_authoring.blend) |
| 崩壊橋台と露出支承 | 追加 | 1,980 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/bridge_abutment/renders/f3_bridge_abutment/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/bridge_abutment/props/f3_bridge_abutment.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/bridge_abutment/portable_sources/f3_bridge_abutment_authoring.blend) |
| 破損三灯式信号機 | 追加 | 1,540 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/broken_signal/renders/f3_broken_signal/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/broken_signal/props/f3_broken_signal.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/broken_signal/portable_sources/f3_broken_signal_authoring.blend) |
| 折れた街路灯と垂下配線 | 追加 | 588 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/broken_streetlamp/renders/f3_broken_streetlamp/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/broken_streetlamp/props/f3_broken_streetlamp.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/broken_streetlamp/portable_sources/f3_broken_streetlamp_authoring.blend) |
| 扉が開いた腐食制御盤 | 追加 | 3,140 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/control_cabinet/renders/f3_control_cabinet/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/control_cabinet/props/f3_control_cabinet.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/control_cabinet/portable_sources/f3_control_cabinet_authoring.blend) |
| フランジ付き破断配管 | 追加 | 2,552 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/flanged_pipe/renders/f3_flanged_pipe/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/flanged_pipe/props/f3_flanged_pipe.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/flanged_pipe/portable_sources/f3_flanged_pipe_authoring.blend) |
| 垂れ下がる配管ラック | 追加 | 2,116 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/pipe_rack/renders/f3_pipe_rack/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/pipe_rack/props/f3_pipe_rack.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/pipe_rack/portable_sources/f3_pipe_rack_authoring.blend) |
| 破れた工場シャッター | 追加 | 4,396 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/roller_shutter/renders/f3_roller_shutter/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/roller_shutter/props/f3_roller_shutter.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/roller_shutter/portable_sources/f3_roller_shutter_authoring.blend) |
| 割れた鉄製窓と腰壁 | 追加 | 1,316 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/shattered_window/renders/f3_shattered_window/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/shattered_window/props/f3_shattered_window.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/shattered_window/portable_sources/f3_shattered_window_authoring.blend) |
| 鉄筋入り剥落コンクリート群 | 追加 | 42,864 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/rebar_rubble/renders/f3_rebar_rubble/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/rebar_rubble/props/f3_rebar_rubble.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/rebar_rubble/portable_sources/f3_rebar_rubble_authoring.blend) |
| 根で持ち上がった舗装と縁石 | 追加 | 1,372 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/heaved_asphalt/renders/f3_heaved_asphalt/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/heaved_asphalt/props/f3_heaved_asphalt.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/heaved_asphalt/portable_sources/f3_heaved_asphalt_authoring.blend) |
| 土砂の詰まった排水溝 | 追加 | 3,024 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/drain_channel/renders/f3_drain_channel/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/drain_channel/props/f3_drain_channel.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/drain_channel/portable_sources/f3_drain_channel_authoring.blend) |
| 欠けた工場入口と歪んだ扉 | 追加 | 2,242 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/factory_door/renders/f3_factory_door/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/factory_door/props/f3_factory_door.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/factory_door/portable_sources/f3_factory_door_authoring.blend) |
| 鉄と石を覆う蔦・シダの群落 | 追加 | 4,300 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/ivy_pocket/renders/f3_ivy_pocket/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/ivy_pocket/props/f3_ivy_pocket.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/ivy_pocket/portable_sources/f3_ivy_pocket_authoring.blend) |
| 既存・崩壊した集合建築の質感強化 | 既存強化 | 2,602 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/native_ruinedBuilding/renders/f3_native_ruinedBuilding/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/native_ruinedBuilding/props/f3_native_ruinedBuilding.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/native_ruinedBuilding/portable_sources/f3_native_ruinedBuilding_authoring.blend) |
| 既存・崩落高架の表面と接合部強化 | 既存強化 | 1,286 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/native_collapsedOverpass/renders/f3_native_collapsedOverpass/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/native_collapsedOverpass/props/f3_native_collapsedOverpass.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/native_collapsedOverpass/portable_sources/f3_native_collapsedOverpass_authoring.blend) |
| 既存・風化電柱の配線と金具強化 | 既存強化 | 1,472 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/native_utilityPole/renders/f3_native_utilityPole/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/native_utilityPole/props/f3_native_utilityPole.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/native_utilityPole/portable_sources/f3_native_utilityPole_authoring.blend) |
| 既存・鉄骨残骸の腐食強化 | 既存強化 | 741 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/native_steelWreck/renders/f3_native_steelWreck/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/native_steelWreck/props/f3_native_steelWreck.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/native_steelWreck/portable_sources/f3_native_steelWreck_authoring.blend) |
| 既存・廃バス停の屋根接合部強化 | 既存強化 | 1,252 | [実画像](../../assets/3d/dungeons/b3_industrial_candidates/native_abandonedTransitStop/renders/f3_native_abandonedTransitStop/angle.png) / [GLB](../../assets/3d/dungeons/b3_industrial_candidates/native_abandonedTransitStop/props/f3_native_abandonedTransitStop.glb) / [編集用Blend](../../assets/3d/dungeons/b3_industrial_candidates/native_abandonedTransitStop/portable_sources/f3_native_abandonedTransitStop_authoring.blend) |

25点すべてに別ファイルのテクスチャ同梱編集用Blendを用意した。[packing結果](../../assets/3d/dungeons/b3_industrial_candidates/portable_authoring_qa/portability.json)は全ファイルを保存後に開き直し、画像byteと元頂点数を検査。元GLB/Blend/PNGは変更していない。run45371292917成功。再利用した承認済み階段V8/V10は新規20点に数えない。

## 実検証

- 27GLBの実バリデーションは全てerrors0。追加・既存強化25点はwarnings0、元の承認済み階段2点は既存warnings9/46（未使用要素・実行時接線生成など）を保持。[検査](../reviews/f3-industrial-final/gltf-validation.json)
- 全27点を実描画する2回のロード・解放でgeometryは0へ復帰。ガラス透過用rendererキャッシュのtexture1は残るが増えない。素材34/texture58/shared画像50、推定decoded RGBA111542272bytes。[実検査](../reviews/f3-industrial-final/actual-27-model-lifecycle.json)
- PC7–9Fは各27モデルのSHA確認、追加硬物と非歩行領域の不正重なり0、中央1.8m移動帯への干渉0。[実画面と結果](../reviews/f3-industrial-final-pc/pc-results.json)
- 実操作による移動・旋回・壁停止・宝箱・採集・灯籠パズル/門・階段・保存往復・第1層↔第3層の繰り返し遷移を確認。[PC操作](../reviews/f3-industrial-full-controls/pc-results.json)。[スマートフォン実操作](../reviews/f3-industrial-final-mobile/mobile-results.json)もpass。低速描画時の扉表示を固定500ms待ちで判定した初回だけ失敗し、実際の開放を待つ再検査で全項目pass。失敗記録はiterationsへ保持。[モバイル7–9F実表示](../reviews/f3-industrial-mobile-views/mobile-results.json)も全モデルSHA・通行干渉・失敗項目0。
- メモリ保存のcheckpointをdeserializeが復元しない既存不具合を確認し、この機能ブランチ内で補修。正常座標の往復差分0、不正area/floor/非有限/範囲外座標は除外。[保存検査](../reviews/f3-industrial-persistence/checkpoint-restored.json)
- 追加画像のSHA不一致を故障注入すると従来の都市へ戻り、イベント12/都市root1/far80/JS errors0。[fallback](../reviews/f3-industrial-runtime/hash-failure-existing-city.json)。専用フラグなしでは候補の取得0/従来表示を確認。[通常表示](../reviews/f3-industrial-runtime/default-existing-city.json)
- 実CDNの7–9F表示と全モデルSHAを確認。最初の画像配信先503から別の実配信先へ復旧、通常保存sentinel不変、隔離entryを全配信先503にするとゲームを起動しない。成功する応答のローカル差し替えなし。[実ネット検証](../reviews/f3-industrial-live/live-verification.json)

新しい入口の[最終7–9F配信検査](../reviews/f3-industrial-final-delivery/live-verification.json)でも元開始地点・前方通行可・導入lockなし、画像取得先503からの回復・通常保存隔離を全てpass。[実公開URL](../reviews/f3-industrial-public/public-verification.json)はraw.githackの案内ボタン後に200/27モデルSHA/通常保存隔離/pageerrors0まで確認した。

Google Fontsの管理proxy証明書失敗1件を記録。検査用Chromiumの一部だけproxy証明書例外を使い、配布ページのTLS検査は無効化しない。音楽再生の聴感・長期攻略・全端末FPSは未認定。SwiftShaderの描画値は実機性能の保証ではない。

## 共有監査と軽量版比較

[共有25-GLB構造監査](../reviews/f3-industrial-final/shared-audit/summary.json)はrun45372771290で成功。106559三角形相当/101primitive instanceは単体素材の構造合計でありゲーム描画負荷とは異なる。

同runで18種類の不透明剛体を一体ずつLOD0/1/2・各4視点へ比較中。元モデルを保持し、ガラス・蔦・植生を含む既存組立品には汎用decimationを適用しない。軽量候補はゲームへ採用しない。正常な比較画像は独立進捗サイトへ個別登録する。現時点で壁/柱接合/I桁/座屈門型の4比較が完了・共有検査済み・独立進捗サイトへ登録済み。残る14比較は同runの直列キューで継続しており、完了とは扱わない。[実GLB検査](../reviews/f3-industrial-final/lod-validation.json)は完了分12GLBのerrors0/warnings0。[同一カメラの画像差分](../reviews/f3-industrial-final/lod-image-observations.json)も保存するが、背景・影を含む画像差分を美術承認に使わない。

描画改善は共有PBR画像、材質別静的バッチ、可視インスタンスのみ描画、既存植物LODで実施。独自の柔らかな接地影と曇天反射を追加し、原本を失う圧縮は行っていない。

# 第一層 V6 改修試験版・検証記録

2026-11-24 JST。PR736。候補素材はNOT_APPROVED。通常のマップ定義とmainは変更しない。試験表示だけに適用する。

## 結果

- アーチをマス境界へ移し、旋回と横移動中のカメラだけを近接補正。元のアーチ原本/開口幅/プレイヤー当たり判定を保持。
- 3Fの灯・宝箱・看板・NPC2人を行き止まりへ。元のキー/報酬/旧歩行位置を保持。1F/2Fの既存置物は既に終端にあり移動なし。
- 草3種は自作原本から焼く透過アトラス+3交差板、全て6tri/1材質。原本3GLB/Blend/5方向PNGも保持。黒い裏面を草専用材質で補正し、coverage mipとMSAAを併用。
- 岩3種を個別制作。苔の面塗りとボタン状の厚み、丸い穴に見えた欠けは不採用とし、写真由来の連続した石面/表面へ沿う苔/上縁の欠けへ反復。
- 上り石段の余分な180度回転を試験表示時だけ除去。1F下り/2F上下/3F上りが接近側へ向く。
- 2F壁A→B→Cを階段間の経路距離で配分。0.5→0.57→0.67mのコース、丸みと欠け、緑の色調を段階化。壁を元に戻せる構造を保持。

## 実配置数

数は品質合格の代用ではない。実ゲームの読み取り専用診断から取得。

|階|草3種合計|追加岩|移行壁A/B/C|16mバッチ|
|---|---:|---:|---|---:|
|1F|4266|260|0/0/0|315|
|2F|4281|262|257/92/155|485|
|3F|3178|195|0/0/0|264|

## 実素材

|種類|配置用GLB|tri|元run|
|---|---|---:|---|
|sedge|[v6_sedge_cards](../../assets/3d/dungeons/b1_nature_v6_candidates/sedge/props/v6_sedge_cards.glb)|6|[45206056039](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45206056039)|
|trifoliate|[v6_trifoliate_cards](../../assets/3d/dungeons/b1_nature_v6_candidates/trifoliate/props/v6_trifoliate_cards.glb)|6|[45208952908](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45208952908)|
|fern|[v6_fern_cards](../../assets/3d/dungeons/b1_nature_v6_candidates/fern/props/v6_fern_cards.glb)|6|[45208952908](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45208952908)|
|schist|[v6_schist](../../assets/3d/dungeons/b1_nature_v6_candidates/schist/props/v6_schist.glb)|7528|[45214438865](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45214438865)|
|fractured|[v6_fractured](../../assets/3d/dungeons/b1_nature_v6_candidates/fractured/props/v6_fractured.glb)|4626|[45220723124](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45220723124)|
|riverstones|[v6_riverstones](../../assets/3d/dungeons/b1_nature_v6_candidates/riverstones/props/v6_riverstones.glb)|10644|[45215795705](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45215795705)|
|wall_a|[v6_wall_a](../../assets/3d/dungeons/b1_nature_v6_candidates/wall_a/modules/v6_wall_a.glb)|7572|[45215795705](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45215795705)|
|wall_b|[v6_wall_b](../../assets/3d/dungeons/b1_nature_v6_candidates/wall_b/modules/v6_wall_b.glb)|5852|[45215795705](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45215795705)|
|wall_c|[v6_wall_c](../../assets/3d/dungeons/b1_nature_v6_candidates/wall_c/modules/v6_wall_c.glb)|4792|[45215795705](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45215795705)|

草の原本は4320/2278/14780tri。カードのダウンロード容量は一部原本より増えるため、ファイル容量削減やFPS倍率とは主張しない。縦板は真上から薄くなる。Y=0を接地基準とし、透明な余白を含むbbox.minで接地を自動補正しない。ゲームではfield/f1-grass-cutout-lighting-v6.jsの両面照明を使用する。

## 検証

- 実index.htmlで15PNG、会話/看板/回復、宝箱80G一回、通常入力で階段4リンク、戦闘帰還、無指定の元表示、hash不一致fallbackを確認。page/console errors0。入力ファイルのSHAは実行前後一致。docs/reviews/f1-v6-game/verification.json。
- 通常表示の実マップ/元オブジェクト位置・キー・報酬を別途元定義と比較し一致。normal-mode-preservation.json。
- 全721歩行セル×4方向の実UV/透過画像投影で足元の草を確認。実画面と別の幾何検査であり、全端末・全連続位置の画質認定ではない。
- 既存F3ハード998配置/181スイープ、追加岩・2F壁1221配置の実GLB/実配置の保守的boundsで1.8m幅の通路干渉0。軟らかい植物と階段は別扱い。
- カメラ旋回8アーチの実三角形距離と、移動途中1008眼位置のrayで旧78交差→修正0。
- 実GLB12点はglTF-validator errors0/warnings0。原本を含む60方向PNGを保存。共有監査45267597594は12GLB/62410tri（単体合計、ゲームの描画tri/FPSではない）、ClamAV1.5.4で296ファイル検査・検出0。ログ/ハッシュはdocs/reviews/f1-v6-shared-audit/へ恒久保存。
- 試験iframeの通常セーブ隔離は別ブラウザ起動で確認。最初に改修通路を見られるレビュー位置へ調整した後も、別起動で再確認し正常。通常保存sentinel不変、iframeから通常保存を読まないこと、メモリ内saveVersion12を確認。docs/reviews/f1-v6-preview/verification.json。

起動直後の診断APIでworld未初期化時に例外になる競合を発見し、水面数だけnull-safeに補修。全ゲーム検査後の差分はこの読み取り専用ガードだけであることをバイト比較し、他の検査入力が全て不変と確認。補修後のfresh wrapperで起動・隔離を検証。詳細はf1-v6-game/diagnostic-startup-delta.jsonとpreview/iterations/。

## 境界と再開

原本を削らず新規9種類を一つずつ共有Blender5.3+ClamAVで制作。並行agentなし。正式素材昇格/最終美術承認/実機FPS認定/長期キャンペーン完走/main公開は別。途中の代用岩によるPNGはprovisional-grassに隔離し、最終証跡へ流用しない。元のPinterest32件の採用記録を継続使用し、この改修で新しいPinterest検索/保存をしたとは主張しない。

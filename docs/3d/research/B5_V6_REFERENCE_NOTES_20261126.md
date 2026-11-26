# 5層 V6 リファレンス調査メモ（2026-11-26, Claude）

**依頼内容**：5層（深淵・神殿・アビス・ダンジョン・戦争跡）を作る前の下調べ。構造・テクスチャ・自然環境（BotW／原神／エンドフィールド）。
**取得方法**：Pinterest（ユーザーの Chrome で検索結果を目視）＋ Tailwind コネクタ（@soukodama5165、ボード「コタマ 参考」の確認と公開ピンの検索）。画像は**参考目的のみ**。保存・再配布はしていない。
**保存先**：このファイル（URL と参考ポイントだけを記録）。`koda24-cell/pinterest-reference-library` へのセッション追加は権限で拒否されたため、そちらへの記録は未実施。

## 検索と参考ポイント
| 検索語 | 主なピン | 参考ポイント |
|---|---|---|
| gothic cathedral ruins dark fantasy environment concept art | https://jp.pinterest.com/pin/986499493386855121/ ・ https://jp.pinterest.com/pin/1115766876493481785/ ・ https://jp.pinterest.com/pin/1115766876494333707/ ・ https://jp.pinterest.com/pin/1030198483540919810/ ・ https://jp.pinterest.com/pin/285274957643498766/ | 屋根の抜けた身廊、束ね柱の縦線、尖頭窓のトレーサリー、床の瓦礫と水たまり、月光と霧。柱は途中で折れて段差のあるシルエット |
| abyss temple dungeon purple fog game environment | https://jp.pinterest.com/pin/372954412909069200/ ・ https://jp.pinterest.com/pin/805933295861958799/ ・ https://jp.pinterest.com/pin/394909461097098265/ ・ https://jp.pinterest.com/pin/1011972978771615998/ | 紫を主光に暗部は藍。床の円形紋様が発光、霧が床に溜まる。奥に光る門で視線誘導 |
| battlefield ruins swords in ground fantasy environment art | 検索結果一覧（Field of swords ほか） | 剣は群れで刺さり角度がばらばら、折れた剣、旗竿と裂けた赤い旗、倒れた巨大な剣を地形として使う |
| ruined knight statue tattered banners gothic hall game environment | 検索結果一覧（Demon's Souls – Throne of… ArtStation、跪く騎士像のスカルプト） | 騎士像は大剣を床に突き立てて跪く／台座に紋章レリーフ。モジュール化された廃墟アーチのキットシート |
| gothic dungeon corridor unreal engine environment art artstation | 検索結果一覧 | 一点透視の回廊、等間隔のアーチと壁の松明、床のひび、突き当たりの光 |
| gothic iron chandelier candles cathedral dark | 検索結果一覧（The Gothic Crown of Light ほか） | 何段もの鉄の輪、鎖で吊る、ろうそくの蝋垂れ、黒鉄＋少量の真鍮 |
| abyss ruins distant city lights megastructure concept art | 検索結果一覧（The Abyssal Colonnade ほか） | 縦に落ち込む奈落、霞の中に林立する巨大構造、光の筋 |
| zelda breath of the wild ruins environment concept art | 検索結果一覧（BOTW: Cathedral、Temple of Time） | 遺構を覆う緑、角の丸い大きな石組み、空気遠近、廃聖堂の柱だけが残る |
| genshin impact domain ruins interior environment | 検索結果一覧 | 単色の強い照明、中心軸の大階段、浮遊する破片、壁画のような発光 |
| arknights endfield environment ruins | 検索結果一覧 | 灰青の低彩度、巨大な垂直構造が霞に消える、廃墟に咲く白い小花 |
| weathered dark stone temple wall chipped moss texture game art | 検索結果一覧（Ancient Temple Wall、brickwall practice、Ruined Temple Terrain） | 大判の切石、角の欠け、壁が剥がれて内側のレンガが見える、目地の苔 |

ボード「コタマ 参考」（878835383475780768）の最新 3 件（2026-11-26 保存、うち 1 件のタイトル「Dungeon」）は、今回ユーザーがチャットに添付した 6 枚と同系統の参考と判断。

## 遠景ビルの実写写真（CC0、Commons で目視確認）
| ファイル | 解像度 | ライセンス |
|---|---|---|
| https://commons.wikimedia.org/wiki/File:Hong_Kong_skyscrapers_in_a_night_of_typhoon.jpg | 2300×1528 | CC0 1.0 |
| https://commons.wikimedia.org/wiki/File:Clouds_over_Lower_Manhattan_skyscrapers_at_night.jpg | 4608×3456 | CC0 1.0 |
| https://commons.wikimedia.org/wiki/File:Skyscrapers_in_Nishi-Shinjuku_at_night_-_Shinjuku_Mitsui_Building,_Shinjuku_Sumitomo_Building_-_view_from_Hyatt_Regency_Tokyo_Building_(2016-05-18_by_panayota_@Pixabay_2190035).jpg | 5152×3864 | CC0 1.0 |

取得は `koda24-cell/3d-asset-studio` の収集ワークフロー（ClamAV 2 回検査）で行う（ブランチ `claude/asset-harvest-20261126-b5`）。

## 技術資料（Web）
- Genshin のコンソール版：ボリュームフォグと局所光の組み合わせ（Unity Dojo 2021 の miHoYo 講演資料）。
- Breath of the Wild GDC 2017（滝澤 智）：「遊びやすさと現実感の調停」。
- Dishonored 2 のレベルデザイナー：開けすぎて視線を遮るものがないレイアウトは探索感を損なう（80.lv）。
- Game Developer「Making Better Hallways」：回廊の一部の形を取り除いて眺望を見せる手法。

## 追加調査（2026-11-26 午後、ユーザーの指摘を受けて）
**依頼内容**：魔王前に他の区間と違う神々しさ／魔王の間までの参道の雰囲気／奈落とビルが集まったエリアを増やす／階段などの固有物。

| 検索語 | 主なピン | 参考ポイント |
|---|---|---|
| divine throne room cathedral golden light god rays concept art | https://jp.pinterest.com/pin/444026844496264182/ ・ https://jp.pinterest.com/pin/1052083162972856392/ ・ https://jp.pinterest.com/pin/1133077587470004548/ ・ https://jp.pinterest.com/pin/756534437439797416/ | 紫ではなく**金と白の光**。正面奥に巨大な**薔薇窓**、玉座への中心軸、段のある祭壇、磨かれた床の照り返し、光の柱が床に落ちる。暗い区間との明暗差で神々しさが出る |
| ruined cathedral balcony overlooking abyss city lights fantasy | https://jp.pinterest.com/pin/993606736555790911/ ・ https://jp.pinterest.com/pin/1126603663104142864/ ・ https://jp.pinterest.com/pin/1029565164829907069/ ・ https://jp.pinterest.com/pin/1007610116632134502/ | アーチが連なる**開廊（回廊の外側が手すりだけ）**から奈落を見下ろす。浮遊する遺構の破片、霞に林立する尖塔、崩れた手すり |
| throne room approach corridor kneeling knight statues candles carpet | https://jp.pinterest.com/pin/442830575870742907/ ・ https://jp.pinterest.com/pin/339951471898770332/ ・ https://jp.pinterest.com/pin/882705595731102093/ ・ https://jp.pinterest.com/pin/438186238766671190/ | 参道は**赤い絨毯**、両脇にろうそくの列と跪く騎士、突き当たりに一本の光。奥に向かって明るくなる |
| gothic castle stone staircase dungeon game environment | https://jp.pinterest.com/pin/722194490292020673/ ・ https://jp.pinterest.com/pin/1125759238120646507/ ・ https://jp.pinterest.com/pin/1128362881689396272/ | 両側に側壁（手すり）のある石段。上りは光の差すアーチへ、下りは暗がりへ沈む |

# コタマ一層後半：神社・遺跡・樹海ダンジョンの参考調査

調査日: 2026-11-16（日本時間）。担当: reference_research。制作前調査。モデル制作・ゲーム統合・Pinterest保存は未実施。

## 実行と確認範囲

`koda24-cell/pinterest-reference-library` の AGENTS.md、README.md、handoff/README.md、既存 `references/landscape-stone-ruins.md` を読んだ。同一タスクの既存handoffは未検出。

Tailwindで接続済みの唯一の接続アカウント（authorized）とボードを確認。公開の「風景」ボード878835383474642483から89件を取得し、cursorなしまで確認。非公開ボードの内容は取得・転記していない。

公開ピン検索 `get_recommended_pins` を5カテゴリ×4件実行し20件取得（`pinterest-candidates.json`）。画像10件をダウンロードし、`pinterest-contact.jpg` を `view_image` で実視認した。236pxサムネイルの構図・シルエット・大まかな材質分布の確認であり、細密なテクスチャ/寸法/制作手法/作者の確認ではない。タイトルだけの候補を画像確認済みにはしない。Pinの説明に書かれた所在地・作者は独立検証していない。

Pinterestサイト自体の検索URL/ピンページはweb openで403またはアクセス不可だったが、Tailwind検索とpinimg画像取得は成功。検索候補は当該ボードへの保存済みを除外するが、アカウント全体で未保存とは断定しない。Pinterestへの保存・投稿・ボード変更は0件。

## 実画像確認済みの候補と制作上の判断

|分類|ピンURL|画像URL|画像から確認した要素|採用する考え方/避けること|
|---|---|---|---|---|
|神社|https://www.pinterest.com/pin/381046818450953461/|https://i.pinimg.com/236x/d9/40/84/d94084c7322929f4f1c308a48fea7826.jpg|朱色鳥居の脚と笠に苔の載った石灯籠。石灯籠下部は黒ずみ、笠上面の苔が厚い|朱色を面積限定のランドマークに。石の上面/基部/垂直面で劣化を分ける|
|神社|https://www.pinterest.com/pin/479563060298986313/|https://i.pinimg.com/236x/58/4a/26/584a26a4ab3bedfd3226970275c6610f.jpg|複数の石灯籠、異なる高さと笠形状、苔と背後の樹林|同一モデルの等間隔反復を避け、高さ・欠け・苔量を変える。奉納物の集積として配置|
|神殿|https://www.pinterest.com/pin/734931232919203483/|https://i.pinimg.com/236x/71/91/b0/7191b011f7d976206c78fe39674aa7bd.jpg|割れ門状の石建築が反復し、隙間に植生が侵入。暗灰色石と明るい曇天の対比|バリの特徴的意匠は移植せず、破断シルエット・縦方向の重なり・奥行きのみ参考|
|神殿|https://www.pinterest.com/pin/139541288441851774/|https://i.pinimg.com/236x/88/1b/04/881b049663d38c58213d99b1d41241d1.jpg|高い石積み壁、奥の開口部、手前の根と緑色の浅水|石積みと水位・根の取り合い、暗い開口部による誘導。クメール固有の彫刻はコピーしない|
|ダンジョン|https://www.pinterest.com/pin/753578950180265742/|https://i.pinimg.com/236x/4b/4c/16/4b4c16163d44796e97095412fa853abd.jpg|高いアーチ、侵入する枝/根、奥からの明るい光、暗い手前のフレーム|閉鎖→明るい吹抜けのリズム。ゴシック意匠はそのまま採らず岩/木/和風梁へ翻訳|
|ダンジョン|https://www.pinterest.com/pin/683913893454021627/|https://i.pinimg.com/236x/78/0c/36/780c36affbf12a4d7026d6492439ffa3.jpg|崩れた開口部、奥の樹木、床面の割れ石と苔、荒い段差|壁を全面均等破壊せず、光口の下に瓦礫と植生を集める。歩行帯は整理|
|自然環境|https://www.pinterest.com/pin/1118651995023275935/|https://i.pinimg.com/236x/ec/fd/40/ecfd4029555ee19120db74f3a02f83c7.jpg|根に厚い苔、根間の落葉、シダ、右奥の光、細い土の抜け|根/苔/シダ/落葉のサイズ階層。画像は写真か生成か未確認、植物学的正解にはしない|
|自然環境|https://www.pinterest.com/pin/515169644930770071/|https://i.pinimg.com/236x/23/1d/d1/231dd1585286038e58035fb65a5ff754.jpg|深い縦溝の樹皮、樹幹基部の苔、倒木、根元のキノコとシダ|木を円柱にせず基部の張り出し、樹皮の方向性、倒木との接触で見せる|
|樹海|https://www.pinterest.com/pin/328903579019309378/|https://i.pinimg.com/236x/38/ac/a1/38aca136f0c52ada97e7b3b7a47b4e6b.jpg|暗い凹地、露岩、斜めの根、霧の中の細い幹|等間隔の杉林のみで済ませず、地面に不規則な凸凹と横断根を加える|
|樹海|https://www.pinterest.com/pin/352477108347189460/|https://i.pinimg.com/236x/69/90/dc/6990dc23e9ed4e130df0a8be7c592bf1.jpg|苔に覆われた大小の岩塊、根、背後の密な幹。ピンリンク先はFlickr|単純な草カーペットを避け、岩の隙間・根の隆起・裸の落葉帯を共存|

採用判断はデザイン方針であり、モデルへの反映はまだない。サムネイルをゲームテクスチャとして利用しない。素材の再配布許諾は未確認。

## 追加で発見した公開Pinterest資料（実画像確認は未実施）

- 神社: https://www.pinterest.com/pin/shrine-by-erica-caiyeup-jumping-on-that-japanese-shrine-wagon-haha-this-is-a-personal-project-i-made--738449670131884207/ （検索でErica CaiYeupのShrineとして取得）
- 神社: https://www.pinterest.com/pin/581034789415005917/ （検索でLonely Shrine in Feudal Japanとして取得）
- 神殿: https://www.pinterest.com/pin/artstation-ue4-lost-temple-ruins-jonas-axelsson--703756178275443/ （検索でJonas Axelssonとして取得）
- ダンジョン: https://www.pinterest.com/pin/dungeon-concept--7951736821359454/
- 自然の巨大形状: https://in.pinterest.com/pin/806777720721351762/

## 現実の一次資料を補助線にする

- JNTO「Exploring Japan's Magical Moss Gardens」https://www.japan.travel/en/blog/exploring-japan-s-magical-moss-gardens/ — 苔の庭・日用神社周辺の環境資料。ゲーム内では照度/湿度/踏圧で苔の分布を分ける。画像の制作転用はしない。
- 丹生都比売神社「天野の里 名所」https://niutsuhime.or.jp/amanonosato/spot/ — 奥之沢明神の祠など。木造祠と石灯籠の小さなスケールを補助参考。
- 写真家本人の青木ヶ原記録 https://50mm.jp/blog/aokigahara-jukai — 雨天/根/岩の記録。画像未実視認のため、現在は出典候補。
- 山梨県の観光PDF https://www.pref.yamanashi.jp/documents/122515/enn_compressed.pdf — 樹海/自然ガイド関連の一次資料候補。全文精読未完。

## 作品別の公式資料と品質基準

ここからの品質基準は公式の数値仕様ではなく、本制作のための解釈/提案。特定ゲームのモデル・テクスチャ・紋章・固有の建築意匠をコピーしない。

### ゼルダの伝説 ブレス オブ ザ ワイルド

一次資料: Nintendo「A Hyrule that you don't know VOL.03 Lanayru」https://www.nintendo.com/ph/zelda/botw/discovery/lanayru.html 。公式記事本文を確認。雨・水源・峡谷・水辺の遺構・石碑を環境と歴史の関係として紹介している。制作解釈: 水の源→水路→濡れた石→苔という原因の連続を作る。遠景ランドマークが次の進路を予告し、石碑は装飾でなく歴史と探索の意味を持つ。小物の密度で通路を見失わせない。

公式補助資料: Art of Zelda masterclass https://www.nintendo.com/en-gb/News/2017/August/Watch-The-Art-of-The-Legend-of-Zelda-Series-Masterclass-presentation-from-Japan-Expo-1251737.html （記事説明を検索取得、動画未視聴）。

### 原神

一次資料: 公式世界紹介 https://genshin.hoyoverse.com/en/map?region=6 （検索索引本文は取得、動的ページ本文は未取得）。稲妻の森/崖/山と、スメールの森林/古代遺構が紹介される。制作解釈: エリアごとに主役を一つに絞り、葉群と岩の大きな面を整理。明度差と色のアクセントで神域の方向を読ませる。本作では彩度を抑え、PBRの粗さ/湿りの説得力へ翻訳する。

### アークナイツ：エンドフィールド

一次資料: 公式更新ノート https://endfield.gryphline.com/en-us/news/9560 （2026-10-15公開、本文を取得）。落葉の動作/風/キャラクターの動きへの反応など環境表現の更新が記載される。制作解釈: 静止画の情報量だけでなく、風方向、落葉の堆積、草/紙の揺れ、足元の反応の一貫性を品質目標にする。静止Blenderモデル完成とランタイム挙動完成は分けて検証。

## 構造への提案

主題は「樹海の下に沈んだ祭祀水路」。同じ廊下を飾り替えるのではなく、断面と光源を変える。

1. 既存前半から細い岩の切れ目へ。小さな欠けた石碑と紙片を予告にする。
2. 低天井の封印回廊。根が天井に侵入、札は乾いた接着上端と湿った剥がれ下端を分ける。
3. 天井の崩落した樹海中庭。大きな古木を一つ置き、鳥居の向こうの光を次の目的地に。
4. 浅い水路沿いの半壊祭祀路。見下ろし/見上げ/短い迂回があり、一層の中でも空間の断面が変わる。
5. 御神木の根と石積みが噛み合う奥の小祠。主役の石碑に寄れる静かな足場。脱出/戻りの視認性を確保。

石灯籠を等間隔に置くだけ、すべての角を同じノイズで欠けさせる、すべての隙間を緑で埋める、すべての花を満開にする、全画面を同じ霧で覆うことを避ける。

## 次の担当への条件

- 親がdevelopmentのゲームカメラ/移動幅/一層後半の接続位置を確認し寸法を確定する。
- 本調査とhandoff本文をpinterest-reference-libraryへ共有。GitHubへの記録済みとは現時点で主張しない。
- お札/花/蔓は追補の公開資料3画像を確認。花の種同定や細密形態をサムネイルから断定しない。
- 木/石のアセット別に正面・側面・背面・寄り画像を確認。サムネイルだけで精密造形を確定しない。
- どの候補も保存対象には指定されていないためPinterestへの保存はしない。

## 追加調査: お札・花叢・蔓（9候補/3画像を追加確認）

初回20候補/10画像に加え、3カテゴリ各3候補を取得。次の3サムネイルを実視認し、合計29候補/13画像確認。保存・投稿は引き続き0件、画像本体はGitへ同梱しない。

|題材|Pinterest URL|実画像から確認した要素|制作への採用|
|---|---|---|---|
|お札|https://www.pinterest.com/pin/707205947705231865/|細長い白紙、縦組みの黒文字、朱色の印の配置|紙の縦横比と黒/朱の面積比のみ。実在文言/印は複製せず架空紋様へ|
|花叢|https://www.pinterest.com/pin/49469295904990808/|樹林の下の紫色の花群、斜めの日差し、株の密度の疎密|群落を日当たりの良い場所へ限定。ゲーム内は白い五弁花/蕾/種房という独自形状|
|蔓と石壁|https://www.pinterest.com/pin/311029918043523335/|石の目地を縫う太い捻れた木質蔓と上端の葉群|接触面を跨ぐ因果、太さの階層、葉の上側偏り。写真をtextureへ使わない|

初回Pinterest資料は構造設計前に調査し、追補は個別ディテールの制作へ反映。針葉樹/葉脈/木塗膜の画像材は自作し、写真PBRは別途CC0原本を使用した。

"use strict";
/* ============================================================
   data/story.js — フィールドの会話シーン（シナリオ初稿：Claude）
   ------------------------------------------------------------
   仕様：docs/field-and-story/FIELD_SPEC.md 4-2
   ・who：STORY_SPEAKERS のキー、または味方キャラID（kotama / knight / healer / warrior / mage / samurai …）
   ・ifParty:true の行は、そのキャラが編成にいないときは飛ばす（コタマ以外の仲間のセリフに付ける）
   ・once:true のシーンは一度だけ。2回目以降は repeat があればそれを表示する
   ・setFlag：読み終えたときに立てるフラグ（ボスゲートの解放条件などに使う）
   ・文章推敲（GPT担当）では text だけを変える。シーンID・who・setFlag・once・ifParty は変えない
   ・既存のステージ導入／クリアイベント（data/progression.js の stageEvents）は、
     エリア初回入場時／ボス撃破時にそのまま再生される。ここはそれを補う会話。
   ============================================================ */
const STORY_SPEAKERS = {
  narration:    { name: "" },
  elder:        { name: "長老ゲン" },
  woodcutter:   { name: "木こりボルド" },
  "herb-girl":  { name: "薬草摘みのミナ" },
  merchant:     { name: "行商人ロッコ" },
  watchman:     { name: "見張り番タオ" },
  statue:       { name: "魔法の石像" },
  miner:        { name: "鉱夫ガルド" },
  "ghost-knight": { name: "亡霊の騎士" },
  sign:         { name: "看板" },
  lamp:         { name: "" }
};

const STORY_SCENES = {
  /* ---------- 迷宮の歩き方（はじめて第1階層1Fに入ったとき） ---------- */
  "labyrinth-tutorial": {
    once: true,
    lines: [
      { who: "narration", text: "（迷宮では、見えるのは周りの少しの範囲だけ。歩いて見た場所は自動で地図に記録される）" },
      { who: "narration", text: "（右上の小さな地図か「MAP」ボタンで全体マップを確認できる。キーボードなら M キー）" },
      { who: "narration", text: "（左上の玉の色は魔物の気配。青→緑→黄→橙→赤と変わり、赤に近いほど魔物に出会いやすい）" },
      { who: "narration", text: "（マップ上をうろつく強い魔物は「FOE」。こちらが動いたときだけ動き、見つかると追ってくる。無理に戦わなくてもいい）" },
      { who: "narration", text: "（光る草むらは採取ポイント。素材が手に入る。階段で次のフロアへ進み、最奥のボスを目指そう）" }
    ]
  },
  /* ---------- プロローグ（はじめてフィールドに出るとき） ---------- */
  "prologue": {
    once: true,
    lines: [
      { who: "narration", text: "樹海のふもとにある小さな村。そこには昔から、ひとつの言い伝えがあった。" },
      { who: "narration", text: "――樹海の奥に眠る『魔法の石像』が、魔物から村を守ってくれている、と。" },
      { who: "elder", text: "コタマや、よく来てくれた。……実はな、石像の光が消えてしまったのじゃ。" },
      { who: "elder", text: "それからというもの、森の魔物たちが妙に荒っぽくなってのう。村の者は怖がって樹海に近づけん。" },
      { who: "kotama", text: "石像の様子を見てくればいいんだね。まかせて！" },
      { who: "knight", text: "村の守りの要が失われたとあっては、放っておけません。お供します。", ifParty: true },
      { who: "healer", text: "けが人が出たら、わたしがすぐに治しますね。", ifParty: true },
      { who: "warrior", text: "魔物が相手なら話は早い。道はおれが切り開く！", ifParty: true },
      { who: "mage", text: "石像の光……魔力の流れが乱れているのかもしれないわね。調べがいがありそう。", ifParty: true },
      { who: "samurai", text: "義を見てせざるは勇無きなり。拙者も参ろう。", ifParty: true },
      { who: "elder", text: "道中には『導きの灯』がともっておる。灯に触れれば、疲れも傷も癒えるはずじゃ。" },
      { who: "elder", text: "くれぐれも気をつけてな。" }
    ]
  },

  /* ---------- エリア1：はじまりの樹海 ---------- */
  "a1-enter": {
    once: true,
    lines: [
      { who: "kotama", text: "ここが樹海の入り口……。草むらの奥から、何かの気配がする。" },
      { who: "narration", text: "（矢印キー・WASD、または画面のパッドで移動。Z／Enter、またはAボタンで調べる）" }
    ]
  },
  "a1-woodcutter": {
    lines: [
      { who: "woodcutter", text: "おう、村の子か。この先は魔物がうろついてるぞ。" },
      { who: "woodcutter", text: "草むらや森の中を歩いてると、急に飛びかかってきやがる。道の真ん中でも油断するなよ。" },
      { who: "woodcutter", text: "奥に光ってる灯があったろう？　あれに触れりゃ元気が戻る。ありがてえこった。" }
    ],
    repeat: [
      { who: "woodcutter", text: "疲れたら『導きの灯』だ。無理はするなよ。" }
    ]
  },
  "a1-herb-girl": {
    lines: [
      { who: "herb-girl", text: "あ、こんにちは！　わたし、薬草を摘みに来たんだけど……スライムが増えてて困ってるの。" },
      { who: "herb-girl", text: "スライムってね、剣で叩いてもぷよんってはね返しちゃうんだって。" },
      { who: "herb-girl", text: "魔法とか、SPを使う技なら効くみたい。おじいちゃんが言ってた！" },
      { who: "mage", text: "その通りよ。物理より魔力のほうが通りやすい相手ね。", ifParty: true }
    ],
    repeat: [
      { who: "herb-girl", text: "スライムには魔法やSPの技！　がんばってね！" }
    ]
  },
  "a1-sign": {
    lines: [ { who: "sign", text: "『この先　樹海の奥／大きな魔物の目撃あり　―ふもとの村』" } ]
  },
  "a1-boss": {
    lines: [
      { who: "narration", text: "霧の奥から、白銀の毛並みを持つ巨大な狼が静かに姿を現した。" },
      { who: "kotama", text: "あれが樹海の奥を守る狼王……スノードリフト！　みんな、いくよ！" }
    ]
  },

  /* ---------- エリア2：ゴブリンの森 ---------- */
  "a2-enter": {
    once: true,
    lines: [
      { who: "kotama", text: "空気がひんやりしてる……。水音が迷宮の奥から響いてくる。" },
      { who: "warrior", text: "床が凍っている。水辺に棲む魔物の気配もあるな。", ifParty: true }
    ]
  },
  "a2-merchant": {
    lines: [
      { who: "merchant", text: "この先の水源は凍りついていてね。魚の魔物や鉱石の魔物がうろついているんだ。" },
      { who: "merchant", text: "鉱石の魔物は硬い殻を持っている。雷の力なら、きっと通るはずさ。" },
      { who: "merchant", text: "石化の攻撃にも気をつけな。動けなくなったら危険だよ。" },
      { who: "knight", text: "命令……。背後に、群れを操る何者かがいるということでしょうか。", ifParty: true }
    ],
    repeat: [
      { who: "merchant", text: "命があっただけでもめっけもんさ。あんたたちも気をつけてな。" }
    ]
  },
  "a2-watchman": {
    lines: [
      { who: "watchman", text: "ここから先は凍てつく水源だ。水路の奥に、巨大な晶石が眠っている。" },
      { who: "watchman", text: "魚の魔物は氷の術と弱体化を使う。鉱石の魔物は守りが堅く、反撃もしてくるぞ。" }
    ],
    repeat: [
      { who: "watchman", text: "水源の最奥にある晶石守を倒せば、この水路も静まるはずだ。" }
    ]
  },
  "a2-sign": {
    lines: [ { who: "sign", text: "『凍てつく水源／雷属性が有効。鉱石の魔物の反撃に注意』" } ]
  },
  "a2-boss": {
    lines: [
      { who: "narration", text: "凍った水路の奥で、巨大な晶石が青白く輝き始めた。" },
      { who: "kotama", text: "あれが水源を守る晶石守……！ 雷の力で切り開こう！" }
    ]
  },

  /* ---------- エリア3：霧の森 ---------- */
  "a3-enter": {
    once: true,
    lines: [
      { who: "kotama", text: "前が見えないくらいの霧……。どこかで、誰かに呼ばれている気がする。" },
      { who: "healer", text: "なんだか、悲しそうな声……。", ifParty: true }
    ]
  },
  "a3-statue": {
    once: true,
    setFlag: "a3-statue",
    lines: [
      { who: "narration", text: "苔むした石像の目に、かすかな光がともった。" },
      { who: "statue", text: "……よく来た、小さき魔弾の使い手よ。" },
      { who: "kotama", text: "しゃべった！？　あなたが、村を守ってくれていた石像なの？" },
      { who: "statue", text: "いかにも。だが、わが光は魔王の呪いに奪われた。この霧も、呪いが生んだものだ。" },
      { who: "statue", text: "霧の奥にひそむ幻影の狼は、呪いの番人。あれを退ければ、霧は晴れよう。" },
      { who: "statue", text: "魔王は炎竜を従え、焦土の洞窟の先に城を築いた。……わが光を真に取り戻すには、魔王を討つほかない。" },
      { who: "kotama", text: "魔王……。わかった。村のためにも、あなたのためにも、ぼくたちが行く！" },
      { who: "mage", text: "呪いの源を断つ、ということね。望むところよ。", ifParty: true },
      { who: "samurai", text: "長き道のりになりそうだ。だが、退く理由はない。", ifParty: true },
      { who: "statue", text: "……頼んだぞ。霧の奥への道を、少しだけ照らそう。" }
    ],
    repeat: [
      { who: "statue", text: "幻影の狼は、姿を惑わせる。惑わされず、真の姿を見極めよ。" }
    ]
  },
  "a3-gate-locked": {
    lines: [
      { who: "narration", text: "霧がひときわ濃く、先へ進めない……。" },
      { who: "kotama", text: "どこかで聞こえた、あの声の主を探してみよう。" }
    ]
  },
  "a3-sign": {
    lines: [ { who: "sign", text: "『霧の日は　石像の声にみちびかれよ』……古い文字で、そう刻まれている。" } ]
  },
  "a3-boss": {
    lines: [
      { who: "narration", text: "霧の向こうで、いくつもの瞳が光った。低いうなり声が、四方から響いてくる。" },
      { who: "kotama", text: "どれが本物……？　落ち着いて、よく見るんだ！" }
    ]
  },

  /* ---------- エリア4：焦土の溶岩洞窟 ---------- */
  "a4-enter": {
    once: true,
    lines: [
      { who: "kotama", text: "あつい……！　息をするだけで、のどが焼けそうだ。" },
      { who: "knight", text: "溶岩には近づかないように。足を取られたら終わりです。", ifParty: true }
    ]
  },
  "a4-miner": {
    lines: [
      { who: "miner", text: "おお、人だ！　助かった……。炎竜が暴れたせいで坑道が崩れて、出られなくなってたんだ。" },
      { who: "miner", text: "あの竜は、魔王の命令で城への道を守ってやがる。鱗は硬いが、冷気には弱いはずだ。" },
      { who: "miner", text: "火傷にも気をつけな。竜の炎を浴びると、しばらく力が入らなくなる。" }
    ],
    repeat: [
      { who: "miner", text: "竜は冷気に弱い。それと、火傷には気をつけろよ。" }
    ]
  },
  "a4-sign": {
    lines: [ { who: "sign", text: "『この先　竜の巣　立入禁止　―鉱夫組合』" } ]
  },
  "a4-boss": {
    lines: [
      { who: "narration", text: "熱風が吹き荒れ、巨大な翼が洞窟の天井を覆った。" },
      { who: "kotama", text: "炎竜……！　ここを越えれば、魔王の城だ！" }
    ]
  },

  /* ---------- エリア5：魔王城・回廊 ---------- */
  "a5-enter": {
    once: true,
    lines: [
      { who: "kotama", text: "ここが魔王の城……。空気が、冷たくて重い。" },
      { who: "warrior", text: "ここまで来たんだ。最後まで、全員で帰るぞ。", ifParty: true },
      { who: "healer", text: "はい……！　みんなで、村に帰りましょう。", ifParty: true }
    ]
  },
  "a5-ghost-knight": {
    lines: [
      { who: "ghost-knight", text: "……生者か。我らはかつて魔王に挑み、敗れた騎士団の成れの果てだ。" },
      { who: "ghost-knight", text: "魔王は闇と呪いを操る。呪いを受けた者は、癒やしの力が弱まる。" },
      { who: "ghost-knight", text: "だが、やつは雷を嫌う。我らが最後に見た、唯一の隙だ。" },
      { who: "knight", text: "先達の無念、確かに受け取りました。", ifParty: true },
      { who: "ghost-knight", text: "……行け。我らの代わりに、あの玉座を終わらせてくれ。" }
    ],
    repeat: [
      { who: "ghost-knight", text: "呪いに気をつけよ。そして、雷だ。" }
    ]
  },
  "a5-sign": {
    lines: [ { who: "sign", text: "朽ちた旗に、かすれた文字が残っている。『玉座の間　この先』" } ]
  },
  "a5-boss": {
    lines: [
      { who: "narration", text: "玉座の間の扉が、重い音を立てて開いた――。" },
      { who: "kotama", text: "これが最後の戦いだ。みんな、力を貸して！" }
    ]
  },

  /* ============================================================
     [SIDE] サブイベント（探索コンテンツ）　データ：data/field-maps.js の FIELD_SIDE_EVENTS
     ・報酬・完了フラグは field.js が扱う。ここは会話だけ（once は付けない）。
     ============================================================ */
  /* ---------- 第1階層 ---------- */
  "side-a1-old-stump": { lines: [
    { who: "narration", text: "苔むした切り株に、使い込まれた手斧が刺さったままになっている。" },
    { who: "kotama", text: "持ち手に「ボルド」って彫ってある……。木こりのおじさんのかな？　届けてあげよう。" }
  ] },
  "side-a1-old-stump-done": { lines: [ { who: "narration", text: "古い切り株だ。斧が刺さっていた跡が残っている。" } ] },
  "side-a1-root-cache": { lines: [
    { who: "narration", text: "木の根元で、何かがきらりと光った。" },
    { who: "narration", text: "根のすき間に、古い革袋が押し込まれている。昔の旅人の忘れ物だろうか。" },
    { who: "kotama", text: "ありがたく使わせてもらおう！" }
  ] },
  "side-a1-axe-hint": { lines: [
    { who: "woodcutter", text: "そういや、愛用の手斧をどこかに置き忘れちまってな。樹海の入口の階の、奥まった切り株のあたりだと思うんだが……。" },
    { who: "woodcutter", text: "見かけたら持ってきてくれねえか。" }
  ] },
  "side-a1-axe-return": { lines: [
    { who: "kotama", text: "おじさん、これ……切り株に刺さってたよ。" },
    { who: "woodcutter", text: "おお、おれの手斧！　よく見つけてくれたな。" },
    { who: "warrior", text: "いい斧だ。大事に使われてきたのがわかる。", ifParty: true },
    { who: "woodcutter", text: "こいつは礼だ。少ねえが取っといてくれ。" }
  ] },
  "side-a1-herb-medicine": { lines: [
    { who: "herb-girl", text: "わあ、ぷるぷるのゼリー！　ありがとう！" },
    { who: "narration", text: "ミナは薬草とゼリーを手ぎわよく練り合わせた。" },
    { who: "herb-girl", text: "はい、できたて！　傷にぬるとすぐ効くよ。" },
    { who: "healer", text: "上手ですね……！　わたしも見習わなくちゃ。", ifParty: true }
  ] },
  /* ---------- 第2階層 ---------- */
  "side-a2-crate-1": { lines: [
    { who: "narration", text: "踏み荒らされた茂みに、壊れた木箱が転がっている。" },
    { who: "narration", text: "中には布地がきちんと畳まれていた。ふたには「ロッコ商店」の焼き印。" },
    { who: "kotama", text: "行商人さんの荷物だ！　ゴブリンが運ぶ途中で落としたのかな。" }
  ] },
  "side-a2-crate-2": { lines: [
    { who: "narration", text: "木箱の残骸の中で、薬瓶がいくつか無事に残っていた。" },
    { who: "narration", text: "これにも「ロッコ商店」の焼き印がある。" },
    { who: "kotama", text: "これで二つ目。返しに行こう！" }
  ] },
  "side-a2-crate-done": { lines: [ { who: "narration", text: "空になった木箱だ。もう何も入っていない。" } ] },
  "side-a2-cargo-hint": { lines: [
    { who: "merchant", text: "そうだ、もし森で「ロッコ商店」の焼き印がある木箱を見かけたら……。" },
    { who: "merchant", text: "中身だけでも拾ってきてくれないか。たしか二箱、森の浅いところで持っていかれたんだ。" }
  ] },
  "side-a2-cargo-return": { lines: [
    { who: "kotama", text: "ロッコさん、森で見つけた荷物、持ってきたよ！" },
    { who: "merchant", text: "な、なんと！　布地も薬瓶も無事じゃないか！" },
    { who: "knight", text: "困ったときはお互い様です。", ifParty: true },
    { who: "merchant", text: "あんたたちは命の恩人……いや、商売の恩人だ。売り物だが、ぜひ受け取ってくれ。" }
  ] },
  "side-a2-watch-fangs": { lines: [
    { who: "watchman", text: "おお、立派な牙だ。これで鳴子を作れば、ゴブリンが近づいてもすぐわかる。" },
    { who: "watchman", text: "助かったよ。見張りの支給品だが、あんたたちのほうが役立てられるだろう。" }
  ] },
  /* ---------- 第3階層 ---------- */
  "side-a3-shard-1": { lines: [
    { who: "narration", text: "霧の中で、小さなかけらが淡く光っている。" },
    { who: "narration", text: "手に取ると、ほんのりと温かい。石像の目にともっていた光と、同じ色だ。" },
    { who: "kotama", text: "石像の光のかけら……？　持っていこう。" }
  ] },
  "side-a3-shard-2": { lines: [
    { who: "narration", text: "濡れた石の上に、もうひとつの光るかけらが落ちていた。" },
    { who: "mage", text: "魔力の残り香ね。呪いで散らされた光の一部だわ。", ifParty: true },
    { who: "kotama", text: "これで二つ。石像のところへ戻ろう！" }
  ] },
  "side-a3-shard-done": { lines: [ { who: "narration", text: "かけらが落ちていた場所だ。もう光は残っていない。" } ] },
  "side-a3-light-hint": { lines: [
    { who: "statue", text: "……呪いに奪われたわが光は、かけらとなって霧の森に散った。" },
    { who: "statue", text: "森の浅い所に、二つほど感じる。見つけたなら、ここへ。" }
  ] },
  "side-a3-light-return": { lines: [
    { who: "kotama", text: "石像さん、光のかけら、二つとも見つけたよ。" },
    { who: "narration", text: "かけらが石像の胸に吸い込まれ、苔むした体がぼんやりと光った。" },
    { who: "statue", text: "……あたたかい。少しだけ、力が戻った。" },
    { who: "statue", text: "礼に、森の恵みを託そう。魔王のもとへ向かう旅の助けとなれ。" }
  ] },
  /* ---------- 第4階層 ---------- */
  "side-a4-toolbag": { lines: [
    { who: "narration", text: "崩れた岩の陰に、すすだらけの道具袋が置き去りになっている。" },
    { who: "narration", text: "つるはしと、使い込まれた手袋。袋には「ガルド」と縫い取りがある。" },
    { who: "kotama", text: "鉱夫のおじさんの道具だ。届けてあげなきゃ。" }
  ] },
  "side-a4-toolbag-done": { lines: [ { who: "narration", text: "道具袋が置かれていた場所だ。" } ] },
  "side-a4-ore-vein": { lines: [
    { who: "narration", text: "岩壁の割れ目の奥で、赤い光がちらちらとまたたいている。" },
    { who: "narration", text: "手を伸ばすと、熱を帯びた鱗のような石がころりと落ちてきた。小さな金貨の袋も一緒だ。" },
    { who: "kotama", text: "炎竜の鱗……？　昔の鉱夫が隠していったのかも。" }
  ] },
  "side-a4-tool-hint": { lines: [
    { who: "miner", text: "崩れたときに、道具袋を洞窟の入口の階に置いてきちまった。" },
    { who: "miner", text: "あれがありゃ、自分で岩をどけて帰れるんだがなあ……。" }
  ] },
  "side-a4-tool-return": { lines: [
    { who: "kotama", text: "おじさん、これ！　入口の階に落ちてたよ。" },
    { who: "miner", text: "おお、おれの道具袋！　これで坑道を掘り直して、自力で帰れる！" },
    { who: "miner", text: "礼だ、受け取ってくれ。坑道の詰め所にあった薬と、おれのへそくりだ。" }
  ] },
  /* ---------- 第5階層 ---------- */
  "side-a5-emblem": { lines: [
    { who: "narration", text: "床に、ひび割れた紋章が落ちている。剣と盾を組み合わせた、騎士団のしるしだ。" },
    { who: "knight", text: "これは……かつての騎士団の紋章。まさか、こんな所に。", ifParty: true },
    { who: "kotama", text: "亡霊の騎士さんたちのものかもしれない。" }
  ] },
  "side-a5-broken-sword": { lines: [
    { who: "narration", text: "壁ぎわに、根元から折れた剣が立てかけられていた。" },
    { who: "narration", text: "柄には、団長のしるしが刻まれている。" },
    { who: "kotama", text: "最後まで戦った人の剣だ……。持っていこう。" }
  ] },
  "side-a5-relic-done": { lines: [ { who: "narration", text: "騎士団の遺品が残されていた場所だ。" } ] },
  "side-a5-knights-hint": { lines: [
    { who: "ghost-knight", text: "……我らが団の紋章と、団長の剣。この回廊のどこかに、まだ残っているはずだ。" },
    { who: "ghost-knight", text: "あれが戻れば、我らも少しは安らげるのだが。" }
  ] },
  "side-a5-knights-rest": { lines: [
    { who: "kotama", text: "騎士さん、紋章と剣を見つけてきたよ。" },
    { who: "ghost-knight", text: "……おお。団長の剣……。我らの誇りが、帰ってきた。" },
    { who: "narration", text: "亡霊の騎士の姿が、少しだけやわらいだように見えた。" },
    { who: "knight", text: "先達の誇り、必ず玉座まで届けます。", ifParty: true },
    { who: "ghost-knight", text: "礼を言う、生者よ。我らが最後に残した備えだ。玉座の戦いに役立ててくれ。" }
  ] },

  /* ============================================================
     [PUZZLE] 仕掛け・謎解き　データ：data/field-maps.js の FIELD_PUZZLES
     ・ヒント（立て札・石碑など）と、扉を調べたとき・解けたときの会話。once は付けない。
     ============================================================ */
  /* 第1階層 1F：古いレバー */
  "pz-a1-door": { lines: [
    { who: "narration", text: "鉄格子の扉は錆びついていて、押しても引いてもびくともしない。" },
    { who: "kotama", text: "近くに、開ける仕掛けはないかな？" },
    { who: "narration", text: "（扉の西、通路の北側の壁に、古いレバーが付いているようだ）" }
  ] },
  "pz-a1-solve": { lines: [
    { who: "narration", text: "ギギギ……と重い音がして、鉄格子の扉がゆっくりと上がっていく！" },
    { who: "kotama", text: "開いた！　奥に何かある。" }
  ] },
  /* 第2階層 2F：東西の合図石 */
  "pz-a2-plaque": { lines: [
    { who: "sign", text: "『見張りの門／東西の合図石を両方鳴らせば、門はひらく　―見張り番』" },
    { who: "narration", text: "（合図石は、このフロアの西の端と東の端の壁にあるらしい）" }
  ] },
  "pz-a2-door": { lines: [
    { who: "narration", text: "太い丸太を組んだ門だ。かんぬきが向こう側からかかっている。" },
    { who: "kotama", text: "すぐそばの立て札に、何か書いてあるかも。" }
  ] },
  "pz-a2-solve": { lines: [
    { who: "narration", text: "どこか遠くで、ガタンとかんぬきの外れる音がした。見張りの門が開いたようだ！" },
    { who: "warrior", text: "見張りの仕掛けか。よくできてるな。", ifParty: true }
  ] },
  /* 第3階層 1F：三つの石灯籠 */
  "pz-a3-stone": { lines: [
    { who: "sign", text: "『灯は　日の昇る方より　ともせ／次に　日の沈む方／最後に　星のめぐる北の空』" },
    { who: "kotama", text: "日の昇る方は東、沈む方は西……そして北。石灯籠をこの順番でともせばいいのかな。" },
    { who: "mage", text: "古い封印の作法ね。順番を間違えたら、たぶん最初からよ。", ifParty: true }
  ] },
  "pz-a3-door": { lines: [
    { who: "narration", text: "濃い霧が渦を巻いて、門の形を作っている。手を伸ばしても、押し返されてしまう。" },
    { who: "kotama", text: "すぐ近くの石碑に、何か書いてあったはず……。" }
  ] },
  "pz-a3-solve": { lines: [
    { who: "narration", text: "三つの灯がそろうと、遠くで霧の門がすうっと晴れていく気配がした。" },
    { who: "healer", text: "きれい……。霧の向こうに、道が続いてます。", ifParty: true }
  ] },
  /* 第4階層 2F：ひびの入った岩壁（隠し通路） */
  "pz-a4-note": { lines: [
    { who: "narration", text: "岩壁に、つるはしで刻んだ文字が残っている。" },
    { who: "sign", text: "『この先　西の行き止まり　ひびの入った岩は　もろい。体ごとぶつかれば崩れる　―ガルド』" },
    { who: "kotama", text: "西の行き止まり……ひびの入った壁を探してみよう。" }
  ] },
  "pz-a4-solve": { lines: [
    { who: "narration", text: "ドンッ！　ひびの入った岩壁が崩れ、奥へ続く細い通路が現れた！" },
    { who: "kotama", text: "隠し通路だ！　ガルドさんの刻み書きのとおりだね。" }
  ] },
  /* 第5階層 2F：四体の騎士像 */
  "pz-a5-oath": { lines: [
    { who: "sign", text: "『我ら騎士団、誓いの作法――／まず盾を掲げ　次に剣を抜き／杖に祈り　最後に弓を引く』" },
    { who: "kotama", text: "盾、剣、杖、弓……。騎士像に、この順番で触れればいいのかな。" },
    { who: "knight", text: "騎士の誓いの順番です。間違えれば、最初からやり直しでしょう。", ifParty: true }
  ] },
  "pz-a5-door": { lines: [
    { who: "narration", text: "騎士団の紋章が刻まれた重い扉だ。鍵穴はどこにもない。" },
    { who: "kotama", text: "すぐそばの碑文に、開け方が書いてあるかもしれない。" }
  ] },
  "pz-a5-solve": { lines: [
    { who: "narration", text: "四体の騎士像がいっせいに輝き、どこかで重い扉の開く音が響いた。" },
    { who: "kotama", text: "騎士団の人たちが残した部屋……？　行ってみよう！" }
  ] },

  /* ---------- 共通 ---------- */
  "save-point": {
    lines: [
      { who: "lamp", text: "導きの灯が、やさしく揺れている。" },
      { who: "lamp", text: "あたたかな光が、仲間たちの傷と疲れを癒やしていく……。（HP・SPが全回復した）" }
    ]
  }
};

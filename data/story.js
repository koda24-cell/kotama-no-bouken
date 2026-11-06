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
      { who: "narration", text: "道の先で、ぷるぷると揺れる大きな影が行く手をふさいでいる。" },
      { who: "kotama", text: "あれが噂の大きな魔物……！　みんな、いくよ！" }
    ]
  },

  /* ---------- エリア2：ゴブリンの森 ---------- */
  "a2-enter": {
    once: true,
    lines: [
      { who: "kotama", text: "木が踏み倒されてる……。ここを通ったのは、ひとりやふたりじゃなさそうだ。" },
      { who: "warrior", text: "足跡がやたらと揃ってる。群れで動いてるな。", ifParty: true }
    ]
  },
  "a2-merchant": {
    lines: [
      { who: "merchant", text: "ひどい目にあったよ……。ゴブリンどもに荷車ごと荷物を持っていかれちまった。" },
      { who: "merchant", text: "あいつら、前はもっとバラバラで間抜けだったのに、最近は妙に統率がとれてるんだ。" },
      { who: "merchant", text: "まるで誰かに命令されてるみたいにな。" },
      { who: "knight", text: "命令……。背後に、群れを操る何者かがいるということでしょうか。", ifParty: true }
    ],
    repeat: [
      { who: "merchant", text: "命があっただけでもめっけもんさ。あんたたちも気をつけてな。" }
    ]
  },
  "a2-watchman": {
    lines: [
      { who: "watchman", text: "ここから先は霧の森だ。魔法の石像は、その霧のいちばん奥にある。" },
      { who: "watchman", text: "だが、ゴブリンの群れが道をふさいでいる。抜けるなら覚悟していけ。" }
    ],
    repeat: [
      { who: "watchman", text: "石像は霧の森の奥だ。群れを抜けてから行け。" }
    ]
  },
  "a2-sign": {
    lines: [ { who: "sign", text: "『←ふもとの村　霧の森→／ゴブリン多発につき単独行動禁止』" } ]
  },
  "a2-boss": {
    lines: [
      { who: "narration", text: "茂みがいっせいにざわめいた。武器を手にしたゴブリンたちが、こちらを取り囲む！" },
      { who: "kotama", text: "数が多い……でも、ここを抜けなきゃ石像には会えない！" }
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

  /* ---------- 共通 ---------- */
  "save-point": {
    lines: [
      { who: "lamp", text: "導きの灯が、やさしく揺れている。" },
      { who: "lamp", text: "あたたかな光が、仲間たちの傷と疲れを癒やしていく……。（HP・SPが全回復した）" }
    ]
  }
};

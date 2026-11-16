"use strict";
/* 第1階層：新人試験・先輩冒険者・救援要請。旧イベントIDを維持し、旧セーブを保護する。 */
Object.assign(STORY_SPEAKERS, {
  "trial-guard": { name: "受付衛兵" },
  "patrol-guard": { name: "巡回衛兵" },
  "senior-a": { name: "先輩冒険者" },
  "senior-b": { name: "先輩冒険者の相棒" },
  "wounded-soldier": { name: "負傷した兵士" }
});
Object.assign(STORY_SCENES, {
  "prologue": {
    once: true,
    lines: [
      {who:"narration",text:"巨大な迷宮の恵みによって栄える街。ここでは採取も、討伐も、探索も、冒険者の仕事だ。"},
      {who:"narration",text:"迷宮の最奥には、すべての夢がかなう場所があるという。財宝を求める者も、名声を求める者も、その真実を知らない。"},
      {who:"narration",text:"近頃は魔物が増え、騎士団の大規模調査でさえ犠牲が続いている。それでも、迷宮を目指す者は後を絶たない。"},
      {who:"narration",text:"君たちも、その一人だ。夢を追って街へ来た新米冒険者たちは、ギルドを結成し、初めての仕事を受けることになった。"}
    ]
  },
  "a1-enter": {
    once: true,
    lines: [
      {who:"narration",text:"樹海の入口には、新人冒険者の地図試験を担当する衛兵が立っていた。"},
      {who:"trial-guard",text:"今日から探索を始めるギルドだな。まずは新人試験だ。迷宮の地図を作って、帰りに提出してもらう。"},
      {who:"trial-guard",text:"全体マップを開き、踏破率を25%以上にすること。さらに見つけた宝箱と扉の位置に、それぞれ目印をつけるんだ。"},
      {who:"trial-guard",text:"MAP画面で「宝箱」か「扉」を選び、見つけた場所を押せば記録できる。二つの目印をつけたら2Fへの階段で報告してくれ。"},
      {who:"trial-guard",text:"未知の道で頼れるのは、仲間と自分の地図だ。焦らず進め。"}
    ]
  },
  "a1-exam-reminder": { lines: [
    {who:"trial-guard",text:"地図の試験はまだ途中だな。25%以上を踏破し、発見した宝箱と扉をMAP上でそれぞれ記録してくれ。"},
    {who:"trial-guard",text:"地図の記号は、ちゃんと現地で見つけた場所につけるんだ。"}
  ]},
  "a1-exam-pass": {once:true,lines:[
    {who:"trial-guard",text:"……いい地図だ。踏破した道も、重要な目印もわかりやすい。"},
    {who:"trial-guard",text:"合格だ。これで冒険者としての第一歩を踏み出したな。2Fでは他の調査隊にも会うだろう。"},
    {who:"trial-guard",text:"これからは自分たちで判断するんだ。無事に戻ってくることも仕事のうちだぞ。"}
  ]},
  "a1-f2-arrival": {once:true,lines:[
    {who:"narration",text:"2Fには採取に向かう冒険者や巡回中の衛兵の姿があった。迷宮で働く人々の日常が、ここにはある。"},
    {who:"senior-a",text:"おっ、新人か。さっき地図試験を受けてた子たちだな。初仕事、お疲れさま。"},
    {who:"senior-b",text:"ここから先は、知っている道でも油断しちゃだめ。互いに助け合うのが冒険者の鉄則だよ。"},
    {who:"senior-a",text:"俺たちは二人組で調査をしている。またどこかで会えるといいな。"}
  ]},
  "a1-senior-pair": {lines:[
    {who:"senior-a",text:"地図を描くことに慣れたか？　見落とした宝箱や行き止まりにも、役に立つ情報はあるぞ。"},
    {who:"senior-b",text:"無理に強い魔物と戦う必要はないよ。救援が必要なら、仲間や衛兵を頼ってね。"},
    {who:"senior-a",text:"でも、最奥に本当に夢がかなう場所があるなら、一度は見てみたいよな。"}
  ],repeat:[
    {who:"senior-b",text:"疲れたら戻ること。強くなるのは、次の冒険からでも遅くないよ。"}
  ]},
  "a1-patrol": {lines:[
    {who:"patrol-guard",text:"騎士団が奥の異変を調べている。最近は生息域の違う魔物まで目撃されるようになった。"},
    {who:"patrol-guard",text:"それでも今は、荷運びも採取も続いている。街の暮らしを支える大事な仕事だからな。"}
  ]},
  "a1-alarm": {once:true,lines:[
    {who:"narration",text:"階段へ続く通路に、鎧を傷つけた兵士がよろめきながら現れた。"},
    {who:"wounded-soldier",text:"誰か……助けてくれ！　3Fで調査隊が襲われた！"},
    {who:"wounded-soldier",text:"本来この階層にはいないはずの巨大な魔物だ！　退路を断たれ、別階層との連絡もつかない！"},
    {who:"senior-a",text:"……俺が先に3Fへ行く。あの人たちを見捨てられない。"},
    {who:"senior-b",text:"わかった。私は負傷者の護衛をして、出口までの道を確保する。"},
    {who:"senior-b",text:"新人のみんな、無理はしないで。でも、もし行くのなら……どうか慎重に。"},
    {who:"narration",text:"二人の先輩は、迷いなく別々の道へ走り出した。"}
  ]},
  "a1-f3-arrival": {once:true,lines:[
    {who:"narration",text:"3Fは異様な静けさに包まれていた。通路には壊れた装備が散らばり、負傷した衛兵が点々と残っている。"},
    {who:"patrol-guard",text:"通信が途絶えた。上の階へ知らせを送る手段もない。奥で先行した冒険者が魔物を引きつけている。"},
    {who:"patrol-guard",text:"ここに来たからには、助け合うしかない。退ける者は下がれ。進む者は覚悟を決めろ。"}
  ]},
  "a1-f3-besieged": {once:true,lines:[
    {who:"narration",text:"最奥に近づくにつれ、岩を砕く轟音と激しい戦闘音が響いてきた。"},
    {who:"wounded-soldier",text:"あの人が一人で食い止めているんだ。俺たちも援護しようとしたが、近寄れない……。"},
    {who:"narration",text:"先輩冒険者は、まだ戦っている。ここから先に引き返す道はある。だが、助けを待つ人々もいる。"}
  ]},
  "a1-woodcutter": {lines:[
    {who:"patrol-guard",text:"無事だったか。あの異常な魔物のおかげで、調査隊はこの区画から動けなくなった。"},
    {who:"patrol-guard",text:"まだ連絡はつかない。見つけた記録や迷宮の地図があれば、救援の手がかりになるはずだ。"}
  ],repeat:[
    {who:"patrol-guard",text:"生き残ることが最優先だ。必要なら導きの灯で休め。"}
  ]},
  "a1-herb-girl": {lines:[
    {who:"senior-a",text:"ここまで来たのか……。本当に手ごわい相手だ。だが、おまえたちが来てくれたなら希望はある。"},
    {who:"senior-a",text:"負傷者への手当ても頼みたい。無理のない範囲で、素材を集めてくれ。"}
  ],repeat:[
    {who:"senior-a",text:"奥にいるやつを止めないと、誰も脱出できない。……頼む。"}
  ]},
  "a1-sign": {lines:[
    {who:"sign",text:"『調査区域 3F／異常個体の目撃情報あり。無断の単独行動を禁ず　――騎士団調査隊』"}
  ]},
  "a1-boss": {lines:[
    {who:"narration",text:"通路の先で、巨大な獣と先輩冒険者が激しく斬り結んでいた。足元には砕けた岩と深い爪痕が残る。"},
    {who:"senior-a",text:"……ようやく追い詰めた！　こいつの体力は、もう半分ほどだ！"},
    {who:"senior-a",text:"だが俺も限界だ。ここからは……君たちに託す。"},
    {who:"narration",text:"先輩の一撃によって弱った魔物が、こちらを振り向いた。決着をつける時だ。"}
  ]},
  "side-a1-old-stump": {lines:[
    {who:"narration",text:"朽ちた切り株に、調査隊の印がある革の記録袋が引っかかっている。"},
    {who:"narration",text:"中には途中まで記された地形調査票が残っていた。救援活動の手がかりになるかもしれない。"}
  ]},
  "side-a1-old-stump-done": {lines:[{who:"narration",text:"調査票を見つけた切り株だ。もう残されたものはない。"}]},
  "side-a1-root-cache": {lines:[
    {who:"narration",text:"2Fの木の根元に隠された補給袋を見つけた。応急用の薬とわずかな路銀が入っている。"},
    {who:"narration",text:"迷宮の危険に備えた、先輩冒険者たちの置き土産だろう。"}
  ]},
  "side-a1-axe-hint": {lines:[
    {who:"patrol-guard",text:"1Fの古い切り株に調査票を落とした者がいる。見つけたらこちらへ届けてくれ。"}
  ]},
  "side-a1-axe-return": {lines:[
    {who:"patrol-guard",text:"これは……行方不明になった隊の調査票だ！　記載された分岐が救援に使える。"},
    {who:"patrol-guard",text:"よく持ってきてくれた。手間賃だ、受け取ってくれ。"}
  ]},
  "side-a1-herb-medicine": {lines:[
    {who:"senior-a",text:"スライムの素材か。これなら負傷者の応急薬が作れそうだ。"},
    {who:"narration",text:"持参した素材を使って傷薬が調合された。残りは君たちが使ってほしいと渡された。"},
    {who:"senior-a",text:"助かる。こういう小さな働きが、誰かの命をつなぐんだ。"}
  ]}
});

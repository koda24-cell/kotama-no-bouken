"use strict";
/* 第2層（地下4F〜6F）『欲望と死』。
 * 旧IDを保持しつつ台詞を上書き。他階層のシーンは変更しない。
 */
Object.assign(STORY_SPEAKERS, {
  "a2-miner": { name: "鉱石採掘の依頼人" },
  "a2-mother": { name: "息子を探す母親" },
  "a2-senior": { name: "先輩冒険者" },
  "a2-rival": { name: "採掘者" },
  "a2-knight": { name: "騎士団の調査員" },
  "a2-medic": { name: "検視担当の衛兵" },
  "a2-envoy": { name: "王宮の使者" },
  "a2-scout": { name: "先輩冒険者の相棒" }
});
Object.assign(STORY_SCENES, {
  "a2-enter": { once:true, lines: [
    {who:"narration",text:"氷と水晶が光を返す地下4F。鉱脈の周囲には、想像以上に多くの冒険者と騎士が集まっていた。"},
    {who:"narration",text:"彼らの視線は輝く鉱石へ吸い寄せられ、互いを警戒するように武器や道具を握りしめている。"},
    {who:"a2-rival",text:"そこは俺たちが先に見つけた鉱脈だ！　勝手に採るな！"},
    {who:"a2-miner",text:"……喧嘩に巻き込まれるなよ。採掘の依頼なら、規則を守って仕事をしてくれればいい。"},
    {who:"narration",text:"目の前の輝きに、誰もが夢中になっている。"}
  ]},
  "a2-merchant": { lines: [
    {who:"a2-senior",text:"やっと来たか！　ここが6Fの臨時キャンプだ。傷も癒えた相棒と、二人で補給所を作ったんだ。"},
    {who:"a2-senior",text:"王宮からの依頼も、騎士団の露払いも、ここを拠点に進めよう。無理をする前に帰ってきてくれ。"}
  ],repeat:[{who:"a2-senior",text:"補給は十分か？　薬草を見つけたら、ここで引き取れる。ボスの先にはまだ危険が残っているはずだ。"}]},
  "a2-watchman": { lines: [
    {who:"a2-scout",text:"この先に強い魔物がいる。6Fまで追ってくる冒険者は、もうほとんどいない。"},
    {who:"a2-scout",text:"ボスを倒せば後続が通れる。私たちはその先の様子を確かめるつもりだ。"}
  ],repeat:[{who:"a2-scout",text:"命を守るための花が、こんな危険な場所に咲くなんてね。……絶対に持って帰ろう。"}]},
  "a2-family": {once:true,lines:[
    {who:"a2-mother",text:"すみません……。迷宮へ行く方でしょうか。息子を探していただけないでしょうか。"},
    {who:"a2-mother",text:"あの子とは、お金のことでひどい喧嘩をしてしまって……。大金を稼いで帰ると言ったきり、音沙汰がないんです。"},
    {who:"a2-mother",text:"無事なら、それだけでいいんです。どうか、見かけたら戻るよう伝えてください。"}
  ],repeat:[{who:"a2-mother",text:"あの子が最後に持っていた、赤い紐のついた革袋……見つけたら教えてください。"}]},
  "a2-foreman": {lines:[
    {who:"a2-miner",text:"無事に採掘を終えた者には相応の報酬を出す。青く透ける晶石を見つけたら標本を持ってきてくれ。"},
    {who:"a2-miner",text:"最近は一つの採掘場を巡って怪我人まで出る。鉱石の値段が、人の命より重くなっちまったのかね。"}
  ],repeat:[{who:"a2-miner",text:"採掘依頼は継続中だ。持ち帰れる量だけ採れば十分だよ。"}]},
  "a2-senior": {lines:[
    {who:"a2-senior",text:"3Fの一件じゃ助かったよ。相棒はまだ療養中で、今は俺だけで調査してる。"},
    {who:"a2-senior",text:"ここは手に入る金も大きい。けど、稼ぐために生きてるのか、生きるために稼いでるのか……忘れちゃだめだ。"},
    {who:"a2-senior",text:"また一人帰ってこない。おかしいんだ。魔物の数だけじゃ説明がつかない。"}
  ],repeat:[{who:"a2-senior",text:"相棒の治療が済めば合流するつもりだ。お前たちも、どうか無事でいてくれ。"}]},
  "a2-knight": {lines:[
    {who:"a2-knight",text:"ここからが地下5Fだ。先行隊からの連絡が途絶えた。遭難者の救出を優先している。"},
    {who:"a2-knight",text:"遺体が見つかっているが、妙なんだ。離れた場所で発見された者まで、似た傷を負っている。"},
    {who:"a2-knight",text:"危険な魔物の痕跡を集めている。調査のため、牙の標本を持ち帰ってくれ。"}
  ],repeat:[{who:"a2-knight",text:"命令は探索継続だが、無茶はするな。犠牲者を増やすわけにはいかない。"}]},
  "a2-medic": {lines:[
    {who:"a2-medic",text:"傷口の状態が、どの遺体も奇妙に似通っている。倒れた場所も時間も違うはずなのに……。"},
    {who:"a2-medic",text:"魔物の仕業とは限らない。断定はできないからこそ、記録を残すんだ。"},
    {who:"a2-medic",text:"ここから先は、採掘に来た人々の姿も少なくなった。気をつけて進んでくれ。"}
  ]},
  "a2-envoy": {lines:[
    {who:"a2-envoy",text:"あなた方が3Fの救援で功績を挙げたギルドですね。王宮から正式な依頼をお持ちしました。"},
    {who:"a2-envoy",text:"王族の一人が重い病に伏しておられます。治療には、地下6Fに咲くという稀少な『氷晶花』が必要なのです。"},
    {who:"a2-envoy",text:"騎士団も6Fへの安全な通路を求めています。後続のための露払いと、薬草の採取をお願いします。"},
    {who:"a2-envoy",text:"報酬はお約束します。しかし命を落としてしまっては何にもなりません。どうか慎重に。"}
  ],repeat:[{who:"a2-envoy",text:"6Fの薬草採取と露払いの依頼は、引き続きお願いいたします。"}]},
  "a2-sign": {lines:[
    {who:"sign",text:"『水源調査区画／鉱石の無断採取と採掘権の強奪を禁ず。行方不明者の情報は騎士団へ』"}
  ]},
  "a2-boss": {lines:[
    {who:"narration",text:"水晶の奥から異様な気配が満ちる。これより先には、薬草を求めて入った者たちの足跡もない。"},
    {who:"a2-scout",text:"あの魔物を倒せば、後続が通れる。ここまでは私たちが支えよう。"},
    {who:"a2-senior",text:"戦うのはお前たちだ。俺たちは安全な退路を守る。……必ず戻って来いよ。"}
  ]},
  "a2-f4-rivalry": {once:true,lines:[
    {who:"narration",text:"採掘者たちが、狭い通路でにらみ合っている。足元には砕けた水晶と血の付いた採掘具。"},
    {who:"a2-rival",text:"拾ったもん勝ちだろうが！　鉱石に名前でも書いてあるのか！"},
    {who:"a2-knight",text:"そこまでだ。金目の石のために仲間を傷つけるな。"},
    {who:"narration",text:"騎士が間に入っても、冒険者たちの目から熱は消えなかった。"}
  ]},
  "a2-f4-missing": {once:true,lines:[
    {who:"a2-knight",text:"また一人、採掘者が戻ってこないらしい。最後に見たのは、光る岩を追って奥へ進む姿だそうだ。"},
    {who:"a2-senior",text:"……嫌な感じがする。深追いだけはするな。"} 
  ]},
  "a2-f5-arrival": {once:true,lines:[
    {who:"narration",text:"地下5F。そこかしこに折れた装備と散乱した荷物が残り、人の気配が薄い。"},
    {who:"narration",text:"壁際には、動かなくなった探索者の姿もあった。"},
    {who:"a2-knight",text:"犠牲者の死因がどれも似ている。今は無闇に触らず、場所を覚えておいてくれ。"}
  ]},
  "a2-f5-corpses": {once:true,lines:[
    {who:"narration",text:"別々の場所で倒れた探索者にも、同じ特徴が見つかった。争った痕跡はあるが、何に襲われたのかはわからない。"},
    {who:"a2-medic",text:"この傷……また同じだ。単なる遭難として片づけるには不自然すぎる。"},
    {who:"narration",text:"鉱石の輝きはここにもある。しかし、それを集めた人々の声はもう聞こえない。"}
  ]},
  "a2-f5-commission": {once:true,lines:[
    {who:"a2-envoy",text:"6Fは危険が大きく、進める騎士も冒険者も限られています。"},
    {who:"a2-envoy",text:"3Fで救援を成功させたあなた方に、後続のための露払いをお願いしたいのです。"},
    {who:"a2-envoy",text:"加えて氷晶花の採取を。命をつなぐための依頼です。"}
  ]},
  "a2-f6-arrival": {once:true,lines:[
    {who:"narration",text:"地下6Fへ足を踏み入れると、それまで見かけた採掘者も騎士もほとんど姿を消していた。"},
    {who:"a2-senior",text:"ようこそ。ほら、臨時キャンプを作っておいたぞ。休めるときに休んでいけ。"},
    {who:"a2-scout",text:"私も療養を終えた。今度は二人で、お前たちを支えるよ。"},
    {who:"a2-senior",text:"花はここに咲くらしい。採ったら持ち帰ろう。ボスの奥へは、まだ手を出さないでくれ。"}
  ]},
  "a2-f6-deep": {once:true,lines:[
    {who:"narration",text:"静まり返った洞窟。氷と水晶のすき間に、かすかに色の違う花が揺れている。"},
    {who:"narration",text:"遠くからは、不規則な振動と水の滴る音だけが響いてくる。"}
  ]},
  "side-a2-crate-1": {lines:[
    {who:"narration",text:"鉱石の詰まった箱が乱暴に投げ出されている。所有権を主張する印が何度も上書きされていた。"},
    {who:"narration",text:"箱の底には採掘記録が残っている。争いが起きた経緯を調べる手がかりになりそうだ。"}
  ]},
  "side-a2-crate-2": {lines:[
    {who:"narration",text:"倒れた青年のそばに、赤い紐の付いた革袋が落ちていた。中には少額の金貨と、何度も書き直された家族宛ての手紙。"},
    {who:"narration",text:"手紙には、帰ったら謝りたいという言葉が残されている。4Fで息子を探していた母親の話を思い出した。"},
    {who:"narration",text:"遺体の身元を確かめられる品だ。家族のもとへ持ち帰ろう。"}
  ]},
  "side-a2-crate-done": {lines:[{who:"narration",text:"手掛かりは回収済みだ。周辺にはもう何も残されていない。"}]},
  "side-a2-cargo-hint": {lines:[{who:"a2-scout",text:"採掘者の箱と、行方不明者が残したもの。両方が揃えば何が起きたか調査隊へ報告できる。"}]},
  "side-a2-cargo-return": {lines:[
    {who:"a2-scout",text:"採掘記録と遺品を見つけたのか……。わかった。調査報告に組み込もう。"},
    {who:"a2-scout",text:"戻れなかった者たちのことも、忘れずに記録する。これは報告への協力に対する礼だ。"}
  ]},
  "side-a2-watch-fangs": {lines:[
    {who:"a2-knight",text:"ありがとう。牙を調べれば、遺体の傷と照らし合わせられる。"},
    {who:"a2-knight",text:"原因がわかるまでは、この階層を安全だと報告できない。"}
  ]},
  "side-a2-ore-sample": {lines:[
    {who:"narration",text:"氷に埋まった青い晶石の鉱脈だ。小さな欠片を採取できそうだ。"},
    {who:"narration",text:"依頼された青晶鉱の標本を慎重に取り出した。持ち帰れば報酬を得られるだろう。"}
  ]},
  "side-a2-ore-done": {lines:[{who:"narration",text:"晶石の採取痕が残っている。必要な標本はもう手に入れた。"}]},
  "side-a2-ore-hint": {lines:[{who:"a2-miner",text:"青晶鉱は4Fの奥にある。見つけたら、ほんの一欠片で構わない。欲張らずに戻ってきてくれ。"}]},
  "side-a2-ore-turnin": {lines:[
    {who:"a2-miner",text:"立派な標本だ。よく無傷で持ち帰ったな。"},
    {who:"a2-miner",text:"本当ならもっと採ってきてほしいところだが……今は無事で戻ってくれたことが一番だ。"}
  ]},
  "side-a2-son-hint": {lines:[{who:"a2-mother",text:"息子はまだ帰ってこないんです。どうか、見つけたら無事を知らせてください……。"}]},
  "side-a2-son-return": {lines:[
    {who:"narration",text:"赤い紐の革袋と手紙を差し出すと、母親は静かに受け取った。"},
    {who:"a2-mother",text:"……これは、あの子の字です。怒ったまま送り出してしまって……。"},
    {who:"narration",text:"彼女はしばらく手紙を握りしめ、何も言わなかった。"},
    {who:"a2-mother",text:"せめて、あの子が何を思っていたのか知ることができました。……届けてくれて、ありがとう。"}
  ]},
  "side-a2-body-report": {lines:[
    {who:"narration",text:"倒れた探索者の傍らには、騎士団の記録札が残されていた。札には他の犠牲者と似た傷の位置が記されている。"},
    {who:"narration",text:"この事実を記録しておこう。何が起こったのか、まだ結論を出すには早い。"}
  ]},
  "side-a2-body-done": {lines:[{who:"narration",text:"検視記録は回収してある。新たな手掛かりはない。"}]},
  "side-a2-flower-collection": {lines:[
    {who:"narration",text:"氷晶のすき間に、淡く白く光る花が咲いている。冷たさの中に、確かな生命の温もりを感じる。"},
    {who:"narration",text:"薬草として使える花を必要な分だけ採取した。王宮の病人を救う手がかりになればいい。"}
  ]},
  "side-a2-flower-done": {lines:[{who:"narration",text:"花を採取した場所だ。根を残してあるため、いつかまた咲くかもしれない。"}]},
  "side-a2-flower-hint": {lines:[{who:"a2-senior",text:"王宮の依頼の花は、6Fの氷晶の奥にあるそうだ。見つけたら、傷つけないよう運んでくれ。"}]},
  "side-a2-flower-handover": {lines:[
    {who:"a2-senior",text:"これが氷晶花か……！　確かに預かった。王宮の使者へ届ける手配をしよう。"},
    {who:"a2-senior",text:"金のためでも、人のためでも、ここまで来た意味はあったんだな。まずは無事でよかった。"}
  ]},
  "pz-a2-plaque": {lines:[
    {who:"sign",text:"『調査用の門／西と東の合図石を鳴らせば、門の封鎖が解ける　――騎士団』"},
    {who:"narration",text:"どうやら水晶採掘の立入制限に使われていた仕掛けのようだ。"}
  ]},
  "pz-a2-door": {lines:[{who:"narration",text:"採掘道具を運ぶための門が閉じている。両側の合図石で開く仕組みらしい。"}]},
  "pz-a2-solve": {lines:[{who:"narration",text:"二つの合図石の音が響き合い、重い門の錠が外れた。奥には放棄された資材が残っている。"}]}
});

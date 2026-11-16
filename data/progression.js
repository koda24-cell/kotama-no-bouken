// 各階層の初回侵入時ナレーション。既存IDはセーブデータとの互換性のため維持。
const stageEvents = [
 {"id":"forest-intro","title":"第1層｜はじまりの迷宮","pages":["ここは　はじまりの迷宮\n今日もまた　多くの冒険者が行き来する","目的は違えど\n誰もが希望を胸に　この地へ足を踏み入れる","幾つもの夢が交わり\n幾つもの運命が　ここから始まってゆく","さあ　君たちも歩み始めるといい\nその小さな一歩が\nいつか　大きな物語となることを願って"]},
 {"id":"goblin-intro","title":"第2層｜氷と水晶の洞窟","pages":["足を踏み入れればそこは\n氷と水晶に覆われた洞窟","多くの者は夢を忘れ\n目の前の輝きに心を奪われる","しかし\n目に映る美しさが\n君たちを迎え入れているとは限らない","もし魅入られたのならば\n二度と振り返らず　立ち去ることだ","輝きを追い続ける彼らに\n引き返す道など　残されていないのだから"]},
 {"id":"wolf-intro","title":"第3層｜遺跡都市","pages":["崩れかけた建物が立ち並び\n静まり返った街並みは　どこまでも続く","古い伝承を知る老婆は告げる\n遥か昔　そこでは恐ろしい戦争があった　と","風が吹き抜けるたび\nどこからか　懐かしい音が聞こえる","それは　街が奏でる記憶なのか\nそれとも\n今もなお　誰かが紡ぐ音なのだろうか","幾度となく季節が巡り\n人も　街も　やがて朽ちてゆく","君たちがこれから歩む道には\nその答えが残されているのかもしれない"]},
 {"id":"dragon-intro","title":"第4層｜火口","pages":["むき出しの岩肌を　灼熱の溶岩が這う\n荒れ狂う炎は　すべてを拒絶する","岩陰に潜む悪意は\n静かに　君たちの訪れを待っている","大地は唸り\n炎は絶えず形を変え\n昨日までの道さえ　明日には失われるだろう","それでも君たちは\nこの地を越えようというのだろうか","大地にとって\n君たちの命など　塵芥に等しいというのに"]},
 {"id":"maou-intro","title":"第5層｜英雄の犠牲","pages":["かつて　大地は荒れ果て　すべての希望を失った","今この大地を構成する全てが\nたった一人の英雄の犠牲でできてると言ったら\n彼らは信じるのだろうか？","多くの者は笑い飛ばすのかもしれない","でも\nどこかに信じてくれるものがいるのだと\n私は願っている","数多の想いを受け継いでここに立つ君たちこそ\nそうであってほしい"]},
 {id:"slime-clear",trigger:"clear",stage:1,title:"樹海の小さな勝利",pages:["スライムを退け、コタマたちは樹海の奥へ進む。","まだ冒険は始まったばかり。仲間と一緒なら、きっと大丈夫だ。"]},
 {id:"goblin-clear",trigger:"clear",stage:2,title:"ゴブリンの包囲を抜けて",pages:["ゴブリンたちの包囲を突破した。","森の奥から、さらに強い気配が近づいてくる。"]},
 {id:"wolf-clear",trigger:"clear",stage:3,title:"静かな森を越えて",pages:["オオカミの幻影が霧の中へ消えていった。","木々の向こうには、赤い光が揺れている。"]},
 {id:"dragon-clear",trigger:"clear",stage:4,title:"炎竜を越えて",pages:["炎竜との激闘を乗り越えた。","残る道は、魔王の城へと続いている。"]},
 {id:"maou-clear",trigger:"clear",stage:5,title:"冒険の終わり",pages:["魔王を倒し、世界に平穏が戻った。","樹海に朝日が差し込み、仲間たちは静かに顔を見合わせた。","コタマたちの冒険は、仲間との絆とともに語り継がれていく。"]},
 {id:"hidden-boss-clear",trigger:"clear",hiddenBoss:true,title:"混沌を越えて",pages:["混沌の幻影を打ち破り、深い静寂が訪れた。","新たな強敵に挑んだ経験は、仲間たちの胸に刻まれた。"]}
];
const growthKeys=["maxHp","attack","defense","maxSp","spAttack","spDefense"];
const growthLabels={maxHp:"最大HP",attack:"攻撃力",defense:"防御力",maxSp:"最大SP",spAttack:"SP攻撃力",spDefense:"SP防御力"};
const growthPerPoint={maxHp:10,attack:2,defense:2,maxSp:5,spAttack:2,spDefense:2};
const achievementDefinitions=[
{id:"first_win",name:"はじめての勝利",description:"初めて戦闘に勝利する",reward:50},
{id:"defeat_10",name:"駆け出しの討伐者",description:"敵を合計10体倒す",reward:100},
{id:"defeat_50",name:"百戦錬磨",description:"敵を合計50体倒す",reward:200},
{id:"dragon_slayer",name:"竜殺し",description:"ドラゴンを倒す",reward:300},
{id:"maou_slayer",name:"魔王討伐",description:"魔王を倒す",reward:500},
{id:"perfect_victory",name:"無傷の勝利",description:"戦闘不能者を出さずに勝利する",reward:100},
{id:"lightning",name:"電光石火",description:"3ターン以内に勝利する",reward:200},
{id:"weapon_smith",name:"はじめての武器職人",description:"武器を初めて製作する",reward:100},
{id:"enhancement_master",name:"強化の極み",description:"武器を+5にする",reward:200},
{id:"compendium_80",name:"図鑑コレクター",description:"通常モンスター図鑑を80%以上埋める",reward:300},
{id:"all_jobs",name:"みんなで冒険",description:"全職業を勝利編成に参加させる",reward:200},
{id:"hidden_boss",name:"さらなる強敵",description:"隠しボスを倒す",reward:500}
];

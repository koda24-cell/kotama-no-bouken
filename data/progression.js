const stageEvents = [
 {id:"forest-intro",title:"はじまりの樹海",pages:["コタマたちは、魔法の石像が眠るという樹海へ足を踏み入れた。","木々の間から、小さな影がこちらを見つめている。冒険の始まりだ。"]},
 {id:"goblin-intro",title:"森の奥へ",pages:["樹海の奥では、ゴブリンたちが道を塞いでいた。","仲間と力を合わせて、先へ進もう。"]},
 {id:"wolf-intro",title:"霧の中の瞳",pages:["ゴブリンの群れを抜けると、森は深い霧に包まれた。","霧の向こうで、いくつもの瞳が光っている。","オオカミだ。姿を惑わせる幻影が、コタマたちを待ち受けていた。"]},
 {id:"dragon-intro",title:"炎の竜",pages:["熱風が吹き荒れ、巨大な翼が空を覆う。","この先に待つのは、炎をまとうドラゴンだ。","仲間たちは武器を握りしめ、炎の中へ踏み出した。"]},
 {id:"maou-intro",title:"魔王の城",pages:["長い冒険の果てに、魔王の城へたどり着いた。","仲間たちとともに、最後の戦いへ。"]},
 {id:"slime-clear",trigger:"clear",stage:1,title:"樹海の小さな勝利",pages:["スライムを退け、コタマたちは樹海の奥へ進む。","まだ冒険は始まったばかり。仲間と一緒なら、きっと大丈夫だ。"]},
 {id:"goblin-clear",trigger:"clear",stage:2,title:"ゴブリンの包囲を抜けて",pages:["ゴブリンたちの包囲を突破した。","森の奥から、さらに強い気配が近づいてくる。"]},
 {id:"wolf-clear",trigger:"clear",stage:3,title:"静かな森を越えて",pages:["オオカミの幻影が霧の中へ消えていった。","木々の向こうには、赤い光が揺れている。"]},
 {id:"dragon-clear",trigger:"clear",stage:4,title:"炎竜を越えて",pages:["炎竜との激闘を乗り越えた。","残る道は、魔王の城へと続いている。"]},
 {id:"maou-clear",trigger:"clear",stage:5,title:"冒険の終わり",pages:["魔王を倒し、世界に平穏が戻った。","樹海に朝日が差し込み、仲間たちは静かに顔を見合わせた。","コタマたちの冒険は、仲間との絆とともに語り継がれていく。"]},
 {id:"hidden-boss-clear",trigger:"clear",hiddenBoss:true,title:"混沌を越えて",pages:["混沌の幻影を打ち破り、深い静寂が訪れた。","新たな強敵に挑んだ経験は、仲間たちの胸に刻まれた。"]}
const growthKeys=["maxHp","attack","defense","maxSp","spAttack","spDefense"];
const growthLabels={maxHp:"最大HP",attack:"攻撃力",defense:"防御力",maxSp:"最大SP",spAttack:"SP攻撃力",spDefense:"SP防御力"};
const growthPerPoint={maxHp:10,attack:2,defense:2,maxSp:5,spAttack:2,spDefense:2}const achievementDefinitions=[
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

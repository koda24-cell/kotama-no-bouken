# 第2層・水車の次パーツ：単体湾曲輪縁 V01–V03 制作・実レンダー検証

状態: **NOT_APPROVED / Draft PR #503 / game runtime untouched.**

## 対象
- 一括の水車ではなく **木製輪縁の1セグメントのみ**。開発版水車の14本スポーク、R=2.55m、軸X方向の寸法に適合する局所モデル。水車本体`field/assets/b2-frozen-waterwheel-scene.js`は変更なし。
- 構造参考: https://www.schoepfraeder.de/english/construc.htm と https://millsarchive.org/2022/03/29/wood-in-millwrighting/ で外輪・木材・放射状スポークの関係を調査。
- Pinterest実写真候補 https://www.pinterest.com/pin/420312577694339168/ は前チャットから継承、今回高解像写真の取得・Pinterestへのピン保存は未実行。ユーザー承認後の正式保存と区別する。

## Blenderでの実制作
| 版 | Actions成功run | Artifact ID | 実ファイル | 実画像の評価 |
| --- | --- | --- | --- | --- |
| V01 | [44228293247](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44228293247) | 14392984380 | BLEND/GLB/4PNG/manifest（SHA256一致） | 輪の曲率に沿う木片と厚みは成立するが、木口が単色・木栓が明るく浮いて見える |
| V02 | [44228783602](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44228783602) | 14394635619 | 同上 | 512×512の木口UV年輪模様を追加したが細かい周期波模様が不自然 |
| V03 | [44229263969](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44229263969) | 14394183005 | 同上 | 公式CC0 Fine Grained Wood写真PBRに変更。単一の板材として木目がまとまり、木口の波が軽減。**まだ木口切断面と木栓の造形精度が不足** |

## テクスチャと出典
- V01/V02の木材写真は [Poly Haven Wood Planks](https://polyhaven.com/a/wood_planks)、CC0。
- V03は [Poly Haven Fine Grained Wood](https://polyhaven.com/a/fine_grained_wood)、CC0、写真`col` / OpenGL Normal `nor_gl` / Roughness `rough`の1K JPEGを実際に取得しBlenderのUVノードへ適用。manifestに3枚のSHA256を記録。
- V03の木口年輪は **Blenderで作成した512×512の手続き画像**（写真ではない）。新しいGLBは合計4画像を埋込。
- V03 GLB実体構造：7 meshes / 7 nodes / 5 materials / 4 embedded images / **1,208 triangles** / **1,476,744 bytes**。編集用BLEND **1,004,425 bytes**。
- V03 ZIPを実取得しmanifest内のGLB/Blend/正面/側面/斜め/背面PNGの **6ファイルすべてのSHA256とサイズ一致をローカル確認**。ワークフローのファイル形式検証もsuccess。
- モデル内の実物輪縁のセグメント位置は局所座標。ゲームでの配置・複製・輪の組立は実行していない。性能監査・GLTFLoader実機FPSも未実行（本レビューはArtifactのみ）。

## 美術評価と今後
- 3版とも生成・PBR・ファイル形式は技術合格。**美術完成には未到達**。現在のV03の課題：輪の外輪セグメントらしさが弱く板材の塊に見える、木口・接合端面がきれい過ぎる、木栓が円盤状、長年の摩耗/腐朽の立体造形が不足。
- 次も輪縁の**1パーツずつ**、まず木材継ぎ目とほぞ・木栓まわりの立体構造を改善。必要なら写真PBRのUV方向再検査。
- 既存の第2層の水車やClaude担当の配置にはいっさい手を加えず、他パーツとまとめてメッシュ生成しない。
- `development`, `main`, 正式`assets/`フォルダへのプロモーションはなし。Artifactsは14日間の一時保存。PRはDraftのままユーザー承認待ち。

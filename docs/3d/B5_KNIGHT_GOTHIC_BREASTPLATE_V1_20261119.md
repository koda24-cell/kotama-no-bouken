# B5 朽ちた騎士像 — 次の独立パーツ: Gothic Breastplate V1

2026-11-19 / 未承認の個別素材候補。V22サレット兜はユーザーが「おｋ」と承認。素材の正式昇格・ゲーム組み込みは別手続き。

## 選択と制作順
- 完成候補の兜 V22: [Actions #44460127042](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44460127042)、GLB/Blend/6方向PNG/ClamAV検査成功。直後のユーザー発言「おｋ・次モデル以降」をデザイン承認として記録する。ただし正式保存・PRマージ実行の指示と同一視しない。
- 次の素材は胸甲単体（Breastplate）。ユーザー指定の「肩甲・肘・剣・盾など1パーツずつ」の順守。腰のファウルドや背甲、肩甲は別モデル候補として次に制作。
- 旧V14騎士像の多量の箱状パーツは壊さない。胸甲は新規高品質化候補。

## 技術参照と実写真
- Met Museum: [Breastplate, German/Austrian ca. 1475–1485](https://www.metmuseum.org/art/collection/search/23143)。現物写真で胸の稜線、丸み、襟ぐりの縁、幅広い肩から絞った腰を確認。
- Cleveland Museum of Art: [Gothic Breastplate and Taces 1475–1500](https://www.clevelandart.org/art/1919.63)。下方に複数の重ね板が続く構造を別パーツ設計に採用。
- [Met Elements of an Armor](https://www.metmuseum.org/art/collection/search/22906)、サレットと胸甲、背甲を分割構成していた例。15世紀甲冑の組み合わせを確認。
- Pinterestの既存参考資料は `koda24-cell/pinterest-reference-library/handoff/b5-decayed-knight-statues-20261116.md`。一次資料の博物館画像を優先した理由は複数個体の形状混同を避けるため。参照画像の貼り付けや第三者素材の再配布なし。

## 形状設計V1
- 細身のゴシック胸甲、幅約0.486m、高さ約0.62m。胸の膨らみをメッシュ断面・面で作り、箱メッシュでごまかさない。
- 中央のわずかな稜線、脇が上方へ切れ込む形、肩上部から鎖骨へ向かう首のえぐり、下端の実厚（約2.6mm）。
- 細い鍛造のフルーティング左右3本、リベット4つ程度。甲冑らしい鍛造板で、浮いた巨大な装飾は禁止。
- 初版は造形優先のグレー金属。前版兜の画像錆テクスチャをそのまま貼り直さず、形状合格後に材質合わせと局所汚れを実施。
- Blenderの実6方向正面・左右・斜め・背面・上面、GLB/Blend/manifest/SHA、ClamAV。GLBが正面のみの単体板であることを明記。
- **承認前の `assets` フォルダ保存・ゲーム統合は禁止。**

## 作業状態
- スクリプト: `tools/b5-knights/build_gothic_breastplate_v1.py`
- Actions: `.github/workflows/b5-gothic-breastplate-v1.yml`
- 実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463864093（初版の完了は別途確認）
- 次の美術検査：正面の胸部半径と中央稜線、側面の厚み、上端のU字襟、脇の切れ込み、下端の腰方向の絞り、金属パーツが浮いて見えないこと。

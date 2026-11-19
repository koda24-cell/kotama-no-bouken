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

## 実行・V2修正（検証中）
- V1初回 [44463864093](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44463864093) は OpenImageDenoiser が非対応のため実描画前に失敗。ソースでデノイズ無効化。
- V1再実行 [44464024978](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44464024978) **成功**。Artifact `14501198010`、GLB/Blendと6方向PNG。マニフェスト8件SHA-256をローカルで再計算・8/8一致。生成ファイルClamAV 10件/感染0。美術面は不合格。
- V1美術不合格理由: 正面の鍛造稜線が薄く、側面の裏側に線が露出する。実表面のyと一致せず食い込んだ別曲線だった。金属反射が白飛び傾向。
- V2ソース `tools/b5-knights/build_gothic_breastplate_v2.py` では、各曲線のx,z点から隣接リング間の正面yを線形補間し、さらに約4.5mm外側へずらして細いリブを固定。明暗・粗さ・照明も調整。旧V1保存。
- V2実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44464448676 はまだ実結果未確認。
- 次のQA: frontの曲線が実際に見える、sideで裏面に浮いた黒線がない、薄板としての板金厚みとネック縁を維持すること。

## V2実レンダリング・品質判定
- V2 run [44464448676](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44464448676): **SUCCESS**。Artifact `14502040429` `b5-gothic-breastplate-v2-NOT-APPROVED`。
- GLB / Blend / 6方向800px Cycles PNG・manifestを実ファイルで確認。全8個SHA-256をローカル再計算、**8/8一致**。
- ClamAV: freshclam更新とソース/生成物スキャン成功。出力10ファイル検査・感染検出0。
- V2の正面では鍛造稜線が明確に可視化し、V1の裏側へ食い込む問題は修正。金属の眩しすぎる反射を緩和。
- ただし胸中央の6本の稜線はまだ直線的な別チューブに見え、実物の鋼板へプレスされた滑らかなリブとは異なる。今後V3では**本体メッシュへの実変形による稜線**へ変更すべき。金属PBR・傷・汚れも兜V22と未統一。側面は薄板として成立するが、背甲が未制作のため完全な胴鎧には見えない。
- **美術判定：未合格（初期の造形候補）**。ユーザーの確認前に正式保存・ゲーム実装は行わない。

# 第3層・高い廃墟壁：Blender反復レビューとClaude引き継ぎ（制作中）

更新日: 2026-11-17 JST / PR #486 / **未承認（NOT_APPROVED）**
ユーザー指示: ビルを一括生成しない。1階分の高い廃墟壁を最初の1パーツとして独立制作。窓・蔓・石・瓦礫は後で**別々**に制作する。

## 現在の素材と実行
- 高壁の基本サイズ: 幅2.0m、高さ4.6m、厚さ約0.34m。ゲームの視線より高く配置する設計。
- V1生成ソース: `tools/floor3/wall/build_tall_wall_v1.py`
- V1技術検査・Blender実レンダー成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44056728438
- V1 Artifact: `14317235209` / `f3-tall-ruined-wall-v1-unapproved`。GLB・Blend・正面/側面/斜め/ゲーム目線PNG4枚・manifest・ログ。
- PBR: developmentの承認済み階段V10に正式保存済みのPoly Haven CC0 `chipped_concrete`と`concrete_moss`。GLB内部の画像／Normal Map検査成功、Blendにも画像pack。
- Pinterest候補: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/f3-tall-wall-v1-20261117.md

## V1実画像を目視した結果
- 正面: 垂直の高い壁としては成立するが、上端が反復する三角ノコギリ型で人工的。コンクリートは比較的白く、物理的な経年劣化が弱い。
- 側面: 厚さはあるが破断断面が白い多角形の塊に見え、露出した骨材としての質感不足。
- 斜め/ゲーム目線: 既存タイルの視界を覆う高さは確認できる。ただし地面際の苔が四角い濃緑の帯で不自然。
- **美術判定: V1は未合格。** V1を完成としない。

## V2の修正対象
- `tools/floor3/wall/build_tall_wall_v2.py`（別名出力でV1保持）
- 上部の破断高低差を非等間隔にする。右側の損傷は本体に対する実Boolean欠け、浮いた薄い破断板を廃止。
- 四角い緑の足元パネルを除去する。実写真Diffuseから彩度と明るさを下げた写真ベースColorをBakeしGLBへpackする。
- Blender Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/f3-tall-ruined-wall-v2-render.yml
- 成功/失敗・4方向画像は**実行完了後に別途確認**する。

## V2実レンダー（ジョブは技術QA条件だけ失敗）
- GitHub Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44057504554
- **Blenderによる4方向PNG/GLB/Blend生成は成功**、Artifact ID `14316068450`。CIの最終結果はfailure。
- 原因: V2では苔の四角い帯を取り去り、未使用の苔材質画像がGLBから除外されたため、古い`4枚以上`条件でAssertionError。実GLBを解析し、使用中のBaseColor、Normal、Roughness 3枚のbufferView内包を確認。
- 実画像は確認済み。V1の四角い緑帯を解消したが、V2の側面の欠けは大きな丸穴に見えるので美術的に未合格。
- CIは「実際に使用している3種類の写真PBR画像が存在するか」に修正。完了run確認前の再検証は成功扱いにしない。

## V3で試す改善
- `tools/floor3/wall/build_tall_wall_v3.py` / workflow `.github/workflows/f3-tall-ruined-wall-v3-render.yml`
- V2の元メッシュを維持し、実形状の大きな丸穴を端へ移動して破断の幅を小さくする。
- 写真テクスチャのUVスケールを縮小（細かな繰り返しが過剰にならないよう調整）。
- 目線より高い4.6m壁の仕様は保持、独立ファイルとしてV1/V2を上書きしない。
- V3 Blender run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44058362906 （成果物成功は実際のrun完了後に確認）。


## 実レンダリング反復 V3〜V5

| 版 | GitHub Actions | 技術検査 | 実画像での評価 |
|---|---|---|---|
| V3 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44058362906 | success / Artifact 14317082089 | 溝の幅は改善、しかし小粒の模様が反復して見え不合格 |
| V4 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44059543631 | success / Artifact 14316644014 | ベース色の低周波マスクがシームレスでなく四角い継ぎ目が露出。不合格 |
| V5 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44060267416 | success / Artifact 14317797495 | 反復用テクスチャの境界を修正。4方向の継ぎ目はV4より目立たなくなった |

- V5のGLB、Blend、front/side/angle/game-eye PNG4枚を実際にArtifactとして取得して視覚確認。
- CC0コンクリート写真由来のDiffuse/Normal/Roughnessを内包したGLBがCI検査を通過。Blendも画像pack済み。
- **V5でも美術的完成ではない。** 主面の風化がまだ均一で、壁が薄い1枚板に近く、破断端面と骨材の表現が平坦。鉄筋の接続と上階連結も未検証。
- 技術検査のsuccessとユーザーによる完成承認を混同しない。現在のモデルはDraft PRで保持、正式素材フォルダには保存しない。
- 次回の優先作業はV6で大きく崩れた断面の複数段差、鉄筋周りの割れ、グラデーション状の雨垂れ（四角いデカールを作らない）、端面にも写真PBRを確実に見せること。

## 次の品質ゲート
1. V1/V2のGLB、Blend、4方向PNGを比較。輪郭/壁厚/接地/材質埋込/白い破断面を検査。
2. 欠け・骨材・非反復の雨染みを自然な実ジオメトリ＋実写真PBRで改善。
3. 壁1点がユーザー承認されるまではwindow/ivy/rubble等に着手しない。
4. GLB/PNG/Blend/manifestを承認後だけGit正式素材へ保存。Claudeはその後Three.js接続と性能/通行判定の確認を担当。
5. 元PR #256/#482とゲームランタイムを変更しない。PR #486はDraft保持、mainには触れない。

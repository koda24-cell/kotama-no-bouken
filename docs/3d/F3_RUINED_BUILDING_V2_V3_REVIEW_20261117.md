# 第3層「遺跡都市」崩壊ビル改良 V2 / 写真PBR V3

- 2026-11-17 JST、制作PR: https://github.com/koda24-cell/kotama-no-bouken/pull/482
- 既存モデル元: PR #256 `feature/floor3-ruined-building-prototype-20261112` の `tools/floor3/build.py`、`render.py`。
- `development`の既存別系統: `field/b3-ruined-city-urban-props.js` に3種の `ruinedBuilding(variant)`、および `field/b3-ruined-city-kit.js`。
- このPRは **PR #256の未完成モデルを引き継ぐDraft**。ベースはPR #256ブランチとし、未承認コードをdevelopmentへ意図せず統合しない。既存ゲームランタイム・第3層公式素材は未変更。
- Pinterest参考候補の共有: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/f3-ruined-building-v2-20261117.md （Pinterestは公開候補取得、個別実画像精査は未実施）
- 公式アート指示: `docs/B3_RUINED_CITY_ART_DIRECTION.md` の「生活圏の廃墟・多層鉄筋コンクリート・露出鉄骨・植生の侵食」を保持。

## V2 実施内容と結果
- 全ての元メッシュと形状を保持し、`tools/floor3/build_v2.py` で追加造形。
- 外壁の不規則な崩落と厚い残存壁、折れた窓枠、露出鉄筋、床とつながる破断を造形。破損箇所と独立した小粒の過剰追加は避けた。
- GitHub Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44052650043 **success**。
- Artifact `14315066152`、GLB `ruined_building_v2.glb`、front/side/angle PNG、manifest。元PR #256のGLBは上書きしていない。
- 実画像評価: 建物の壊れた外形・階層と柱/梁は伝わるが、コンクリートの表面が単色灰色、苔と蔓が角ばった小箱状で不自然、面の風化や雨染みが不足。**美術的には未合格**。

## V3 写真PBR材質の改善
- `tools/floor3/render_v3_photo.py` は上記V2のGLBをBlenderで読み込み、全メッシュを保持したままCC0写真PBRを追加する。使用元は既にユーザー承認済み階段V10の `development/assets/models/floor3/double_flight/textures/` に保存済みの `chipped_concrete`/ `concrete_moss`。
- UVを物理寸法に基づき投影し、材質のBaseColor/Normal/Roughnessを写真から設定。GLBへ画像埋込・Blender `.blend`へpack。
- Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44053194648
- V3が成功したかどうかはActionsの完了ログ・GLB・PNGを別途確認する。未確認を成功扱いにしない。

## 次の品質評価
1. front/side/angle画像の実レンダーを確認。角ばった緑の植生と非自然な破断輪郭を改善する。
2. PBR写真のUVスケール、垂直な雨垂れ、鉄骨の酸化色、窓の厚み、露出鉄筋の根元の支持構造を精査。
3. 物理寸法・ゲーム視点・1マス移動と通行判定・Three.js GLTFLoaderを検証するまではゲーム統合しない。
4. アート承認までDraftのまま。GLB/PNG/Blend/manifestはActionsの一時Artifact、正式フォルダに昇格しない。

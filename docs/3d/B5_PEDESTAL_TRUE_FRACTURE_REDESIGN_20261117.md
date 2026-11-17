# 第5層 石像台座「破断面再設計」— 実物調査 / 2026-11-17
**STATUS: NOT_APPROVED**, previous A/B/C refused; independent revision; source V1–V3, weathered A/B/C cycles, original knight V14 are preserved.

## Source observations
- Observed real statue cracks in Pinterest image: https://www.pinterest.com/pin/574138652485892090/ . A principal fissure branches, traverses the sculpted face and has apparent physical depth. This *image is a reference*, not transferable artwork or texture.
- Photographs of damaged ancient masonry show large discontinuous 3D interior break surfaces and smaller flaked edges. Pale fresh interior of a broken stone differs from dark weathered outer skin.
- NPS / conservation classification: https://www.nps.gov/orgs/1739/upload/book-glossary-masonry-deterioration.pdf . **Distinguish open fracture from spalling, scaling, edge chipping and soot accumulation.**

## New geometry approach, replacing rejected crack workflow
1. Build long rectangular architectural base and projecting top cap in separate mesh objects with negligible bevel. Sculpted main shaft should retain large flat stone planes and cornice proportions.
2. Instead of a tubular dark curve at y≈front, split shaft **into two solids** along a branching, nonuniform X/Z polyline; use actual facing fracture interior, with an opening gap and small displacement in z.
3. Top lid must carry the same broad fracture into the cap, with a missing outside fragment near one corner. Do not render a black curve on top of a whole uninterrupted slab.
4. Add secondary *local* spalls adjacent to main fracture: surface and masonry edges removed by geometry, not stones floating in front. Rough fracture surfaces are grayer than the outer dark-aged skin.
5. Thin crack branches can be shallow recesses only where appropriate, while the main open fracture must be visible in side and 3/4 views.
6. AmbientCG Rock063 CC0 photo is optional for albedo/roughness and never used to fake a deep crack. Do not reuse Pinterest pixels as game textures.

## QA gates
- Actual Blender headless GLB + Blend source + 3 rendered PNG (front/side/angle), SHA-256, and manifest; technical QA ≠ user approval.
- Face-on and diagonal images should show a physical negative gap, not a black raised line; no black tubes for fractures; avoid identical symmetric cuts.
- The third-person game-scale silhouette and rectangle architectural mass must remain. No new changes to game map or original assets.
- Reject if the crack looks like a zigzag lightning icon or if the fracture faces look like smooth plastic.
- Only after review and approval promote official assets through separate PR.

## First real render and image review
- V1 Actions success: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026580207 ; Artifact `14303078042`. GLB (903,124 bytes), Blender source, three 1000×800 PNG and manifest were fetched and real images opened. 3-direction/GLB/hash technical QA passed.
- Actual **artistic failure**: most of the statue pedestal remains blank, white and studio-clean; open split reads as a highly repetitive lightning bolt with unconvincing zigzag angles; both sides appear excessively uniform. True physical separation is achieved but does not establish historically convincing erosion.
- V2 script `tools/b5-knights/build_pedestal_true_fracture_v2.py` changes upper and shaft split to less repetitive slopes, variable fracture-side vertex perturbations through depth, shallower gap, real removed-stone patches on cap/shaft, lower photographic influence and exposure.
- V2 Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027043326 . Results must be checked; a source commit alone is not completion.
- **No variant is approved**; original V1–V3, all old A/B/C, and knight V14 remain preserved without gameplay changes. Repair alternatives proceed one item at a time.

## Debugging and actual Blender artifact review, V1–V7 (2026-11-17)
- V1 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026580207 succeeded; a physical split was generated but the opening looked like a repetitive lightning stroke; surfaces looked too new.
- V2 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027043326 succeeded; more subdued zigzag and surface spall.
- V3 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027540791 succeeded; true mesh displacement. Still artificial and too pristine.
- V4/V5/V6 runs 44028069470, 44028643640, 44029176052 technically succeeded, **but artistic/structural regression**: both shaft meshes were present as GLB nodes with `mesh: null` (no geometry) after repeated destructive spall Booleans. This rendered an implausible empty alcove and floating ornaments. Not acceptable. Lighting change in V6 demonstrated the failure.
- **Root cause** identified by examining actual GLB JSON chunks from ZIPs, not inferring from screenshots. V2 and V3 both had mesh-index references for left/right shaft; V4–V6 did not. All defective versions preserved only as regressions, not candidate assets.
- V7 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44029833293 succeeded; artifact `14304094681`. Derived from valid V3 instead of destructive V4. Fixed outward front/back/side face winding, restored both shaft meshes, avoided destructive repeated spall. New Actions QA asserts both named GLB shaft nodes point to valid mesh primitives.
- V7 downloaded actual images `front/side/angle` 1000×800; ZIP manifest GLB/Blend/3PNG SHA-256 recomputed and all matched. Both shaft nodes in GLB proven: left mesh index 3, right index 4. AmbientCG Rock063 CC0 color/roughness was included. Technical pass ≠ art pass.
- **V7 art review**: shaft restoration works and central open break is visible. Nevertheless sculpted ornament resembles applied clover stickers and surface roughness has low-resolution polygonal flaking, not authentic centuries-old damaged stone. Top course mostly straight and clean. **NOT APPROVED**, no promotion/merge/game insertion.
- Future iteration must favor observational sculpting of rough stone fracture interiors, deeper physically intact shell, erosion concentrated on water paths, and a real baked mineral roughness/normal study; don't use Booleans that invalidate the mesh.

## V8–V9: 非直線亀裂レンダリング反復（2026-11-17）
- 出発点: V7はひびの見え方がほぼ直線・等幅でユーザーから不採用。
- **V8**: `tools/b5-knights/build_pedestal_true_fracture_v8.py`。主亀裂を38点の低周波曲線＋微小乱数へ再生成し、亀裂幅を高さで変える。右/左の石材の分離、法線、GLBノードの存在検査を維持。実Blender3方向描画/GLB/Blend/manifest成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44034016273 。Artifact `14306721195`。ZIP実体の5ファイルSHA-256一致。目視: 曲線化したが依然細い1本線で不採用。
- **V9**: `tools/b5-knights/build_pedestal_true_fracture_v9.py`。主亀裂の低周波うねりを増幅し、狭い先端へ収束する副亀裂を石材にBooleanカットで造形。新規CUTTERは作品GLBには出さず、左右本体の存在と三角面をActionsで検査。実Blender3方向描画/GLB/Blend/manifest成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44034533166 。Artifact `14306162859`。ZIP実体の5ファイルSHA-256一致。副亀裂の視認性は弱く、全体が直線スリットに見える問題が残る。**未合格**。
- Caution: 単に亀裂の座標を揺らすだけでなく、周辺の層状剥離・装飾の不均一欠損・石材断面の粗い微細形状・主割れ周辺の段差を広域に作り直すこと。現在のデザインはむしろ整いすぎていて、現代の模型台に見える。ゲーム距離での視認性を確認すること。
- V1–V9はすべて独立ソースを保持。**NO asset promotion / no merge / no game modification**。

## V10–V14 ユーザー添付青線図に合わせた「側面Y字状亀裂」修正 (2026-11-17)
- **実際に確認した入力**: 2026-11-17チャット添付・3方向の台座画像で SIDE 面にユーザーが青線を手書き。側面の**最上段左寄りから右下に長く曲がりながら走る主亀裂**、その中間より右から下へ伸びる**短い分岐**。ユーザー画像は参考資料であり原画像をゲーム素材に採用していない。
- 実装方向: 座標Y/Zに沿って石材側面 (+X) にメッシュ断面カッターを作成、主亀裂→笠石上の分岐→下段胴体の亀裂を独立に削り込む。実モデルの保全チェックでCapとShaftを残す。
- **V10** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44036833547 : Blender 3方向、GLB/Blend/manifestとhash検証成功。側面の溝は細く、通常撮影でほぼ見えず、**未合格**。
- **V11** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44037640023 : 幅・深さ拡大し`side_detail.png`接写を追加。実GLB・Blend・4 PNG/manifest SHA照合成功。幅が増えたが、側面ではまだラインが見えない。**未合格**。
- **V12** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44038377274 : 下地のBoolean掘り込みと併せ、亀裂内部の暗い鉱物断面を極薄メッシュとして露出。3方向+接写、GLB/Blend、6 filesのSHA検証成功。初めて亀裂と下向き枝が視認できたが、二重の線が不自然。**未合格**。
- **V13** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44039165420 : カメラを水平な側面正投影に変更。実レンダリング4PNG+GLB/Blend全部QA成功。主亀裂と枝の形状が読みやすくなったが、上部の石縁から離れている。
- **V14** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44039845293 : 亀裂の始点をより上縁へ変更、過剰に並行する明るい線を撤去。Artifacts ID `14308583765`、GLB/Blend、front/side/angle/side_detail PNG、manifest SHA-256の全件照合完了。写真系PBRは以前と同様にambientCG Rock063のAlbedo/Roughness。技術QA成功、**芸術品質は未承認**。
- **V14視覚評価**: 長い横方向に下る亀裂と途中から下がる一本の枝は確認できる。ただし、ユーザーの青い線より亀裂が**笠石下縁へ寄りすぎ、溝が均一で、部分的に黒い塗り線の印象**が残る。元画像とV14の接写画像を実際に並べて比較済み。亀裂だけでなく石の端面を破断させる造形へ段階的に進むべき。
- 試作V7〜V14はすべて独立ファイルとして保存。バージョンに`NOT_APPROVED`を維持し、正式素材・development・ゲームへ昇格しない。

## V15 follow-up — actual 4-view Blender and user-uploaded image comparison
- V15 source `tools/b5-knights/build_pedestal_true_fracture_v15.py`, workflow `.github/workflows/b5-knight-pedestal-true-fracture-v15.yml`.
- Why: Compare user's 2048×576 image (SIDE blue annotation, main crack slopes left to right and branch descends) with V14. Old cap is too thin, so V14 main fissure sits too close to lower cornice.
- Shape change: upper cap 07/08 real mesh blocks elongated upward by factor 2 about cap base Z=.483; top bedding blocks 09/10 shifted upward 0.078m. Main upper side fissure and cap segment of fork transformed through same Z mapping, leaving lower branch on shaft intact. V14 source and models preserved.
- **Real Blender success** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44040772172 . Artifact ID `14308893829`, 4 PNG (front, side, angle, side_detail) + GLB + Blend, SHA256 all 6 match manifest. `photo_status=CC0_AMBIENTCG_ROCK063_COLOR_ROUGHNESS`; old geometry-integrity QA of both shaft meshes passes.
- Visual review with user's source image: V15 is closer in broad silhouette; long left-to-right downward groove and the downward fork are readily visible in true horizontal side view. But compared to blue stroke, the opening still looks too smooth and uniformly dark, and the spur near the fork appears like a triangular chip rather than naturally branching stone layers. **No artistic approval**.
- **Status**: V10–V15 independent files in Draft PR #424. User's original uploaded photo is not copied into game assets; compare is generated only for review. No formal promotion or merging.

## V16–V17 Blender反復（2026-11-17 18時台）
- 出発点：ユーザー指定の青線に沿うV15だが、亀裂が単調な黒帯、下向き分岐の形が不自然、剥離表現が足りない。
- **V16** 独立コード `tools/b5-knights/build_pedestal_true_fracture_v16.py`。主亀裂の幅に不均一な変化を追加し、途中の3か所に途切れた石表面の剥離メッシュを増設。GitHub Actions https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44052248395 はSUCCESS。Artifact `14315080211`。実GLB、Blend、4方向PNG、SHA256照合すべてPASS。写真系PBR CC0 Rock063のColor/Roughnessを使用。
- **V17** 独立コード `tools/b5-knights/build_pedestal_true_fracture_v17.py`。V16の黒帯が濃すぎたため暗色断面マテリアルを薄い灰青にして一部奥へ下げ、剥離を控えめにし、余分な黒い縁取りを減らした。GitHub Actions https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44053048931 はSUCCESS。Artifact `14313814817`。実GLB、Blend、4方向PNG、SHA256照合すべてPASS。
- **画像評価**: V16は側面で主亀裂が太い黒い帯、V17は黒帯が軽減した反面、また細く見えにくい。双方ともひびの周りの石肌・内側断面の深さに本物の破断らしい凹凸が足りない。**完成品質ではない**。
- 次の改善は黒帯のマテリアル補正だけでなく、側面の石材そのものを局所的に分割し、破断が上縁の輪郭を崩す3D形状へ変更すべき。旧版V15〜V17の出力を保存。PR #424 Draft、game / developmentへの正式昇格・マージなし。

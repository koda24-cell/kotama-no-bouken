
# 3D全階層共通：視覚品質を保持した軽量化・LOD方針

更新: 2026-11-17。GPT / Claude / Blender / Three.js の共通デザイン原則。研究・仕様書の段階で、ゲームに導入済みと報告しない。

## 最優先原則

**プレイヤーが実際に知覚するシルエット、光、材質を維持し、見えない・遠い・小さいディテールに描画とロードを使わない。**
単純なポリゴン数削減ではなく、距離、画面占有率、向き、遮蔽、重要度、ハードウェア性能に応じて画質を配分する。全ステージの3D制作・新規モデル・既存モデル見直しの共通優先事項とする。ただし演出上・ gameplay上重要なものを消さない。

## アセットごとの推奨

| 種類 | 近景 | 中景 | 遠景・ロード | 優先度・留意 |
| --- | --- | --- | --- | --- |
| 樹木・草・つる・花 | 幹と主要枝の形状＋葉束詳細、草は低面数群 | アトラス葉束/交差面で近似、草密度調整 | 多方向impostor・不要セル非読込 | 最優先。透過の過描画・風・影・枝葉のdraw callを別に計測 |
| 岩・崖・溶岩洞 | 形状の凹凸・亀裂・Normal Map | 主シルエットを残して中小ポリゴン削減 | 遠景ローポリ/表面テクスチャ/チャンク非読込 | 細部はNormalで代替。亀裂・道の連結・溶岩の境界は保持 |
| 遺跡・建物・高架 | 破損縁・梁・扉・柱は立体 | 屋根・壁面のディテールは法線/デカール | 大面積壁面や窓明かりはアトラス・低面数 | 繰返し石/窓/階段をInstancedMesh。入口・破断輪郭・可視内部は保持 |
| 魔王城・柱・燭台・像 | 人物/模様/近接演出を優先 | 奥の装飾を束ねる・非重要飾りを縮退 | 重要景観のimpostorやシルエット面 | 近景主役は勝手に劣化させない。透過VFXと実ジオメトリを別管理 |
| 水面・溶岩・霧・粒子 | シェーダと形状に焦点を当てる | 画面占有率でシミュレーション密度・粒子数を調整 | 非表示セルは更新・描画を停止 | 水・火の演出はLODに適するが、熱流/流向・境界の美観を壊さない |

## 共有レンダリング仕様（予定・要検証）

1. 元のBlender/GLBおよび承認履歴を保持し、最適化は独立作業ブランチ/PRで行う。
2. LOD0/LOD1/LOD2の原点、スケール、ピボット、当たり判定/ナビ情報を整合させる。LODは**描画のみ**変化させ、ゲームの1マス移動・マップ・セーブ互換を維持。
3. ワークフローはモデルを生成・4方向PNG・GLB・Blend・manifestを出力する。モデルのバイト数、面数、材質数、ノード数、透過面面積を記録し、SHA256を検査。
4. 3Dビューでは距離だけでなく画面投影サイズを参考にLOD切替する。最初は3段階・前後1マスでヒステリシスを試し、近接で突然切り替わらないよう評価。数字は**仮の試験値**。
5. プレイヤー位置に応じ、近接セルに十分な事前読み込み時間を与える。見えない物体でもcollisionやナビデータは必要に応じて維持する。
6. 静的・同材質・同一形状の繰り返しはInstancedMesh、同材質だが異形状はBatchedMesh候補、静的な小規模ジオメトリはセル内で結合。個別のカリングを失う巨大統合は避ける。
7. 透過カードはglTF MASK + alphaTestを基準に試験。MSAA有効時だけalphaToCoverageを比較。alpha BLENDやdoubleSidedは過描画、順序と描画回数に注意。
8. 差分比較は同じカメラ位置/照明・正面/側面/斜め/真上・ゲーム視点と、FPS/ドローコール/三角形/メモリと画質で判断。
9. 品質や性能の劣化が確認された場合は元モデルへ即時切り戻し。自動マージと正式素材昇格を行わない。

## 既存コードを先に再利用する

- developmentの field/field-3d-view.js はGLTFLoaderキャッシュ、品質設定に基づく解像度、WebGLRendererの診断窓（KotamaField3D.stats / renderInfo）を持つ。完全なLOD/セル単位ストリーミングが既にあるとは見なさない。
- developmentの field/field-3d-b1-sacred-trial.js は第1層opt-in試験で16m空間バケットとThree.js InstancedMeshを実装している。全階層への直接コピーは不可。既存契約・データ・置き場所を維持して検証する。
- 第6層 tree_mature V14（PR #452）の葉8967個は個別オブジェクトで生成され、ランタイムdraw callは未計測。まずノード/材質によるバッチ化を試す。
- RendererのBloomが有効な画質では、GPUカウンタは後処理分を含む。モデル単体と全フレームを分けて評価。

## 実装順

P0: ベースライン取得（複数端末）、V14原本保全、葉メッシュバッチ化、小規模LOD実演、ゲーム視点品質測定。
P1: 第1層実装済みの16m InstancedMeshを流用可能か調査し、汎用セルローダとLODレジストリを独立モジュールで試験。
P2: 6層樹木・草 → 1層樹海 → 3層遺跡 → 4層岩・溶岩 → 2層水辺 → 5層城/VFXへ段階適用。主役素材は承認必須。
P3: 多方向impostor、テクスチャアトラス、風アニメ、影の距離制御、圧縮KTX2/meshoptの効果を個別計測して適用。

## 重要な出典と限界

- Nintendo CEDEC2024 BotW 2Dグリッド/四分木とロード: https://gamemakers.jp/article/2024_09_04_78145/
- Cemuの tree billboard draw distance と grass blade density を分けたコミュニティ逆解析: https://github.com/cemu-project/cemu_graphic_packs/blob/master/src/BreathOfTheWild/Mods/DrawDistance/patch_DrawDistance.asm
- NVIDIA GPU Gemsの植生/葉束レンダリング: https://developer.nvidia.cn/gpugems/gpugems2/part-i-geometric-complexity/chapter-1-toward-photorealism-virtual-botany
- SpeedTree Alpha to CoverageとLOD: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-4-next-generation-speedtree-rendering
- Khronos glTF2.0 MASK: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Three.js API: https://threejs.org/docs/pages/InstancedMesh.html / https://threejs.org/docs/pages/BatchedMesh / https://threejs.org/manual/pages/optimize-lots-of-objects.html

BotWの正確な葉のポリゴン数、シェーダ、距離閾値、LODフェード式を断定できない。『任天堂の公式設計を完全再現』ではなく『確認された思想と公開された同等技術をコタマへ適用』と区別する。
## 制作・レビュー時のGitHub Actions利用ルール（2026-11-17 追加）
- 全3D制作のアセット検証時は、まずGLBの構造負荷監査Actionを実行し、メッシュ数・primitive数・面数・材質とファイル容量を記録する。従来型Action未対応のソースには理由を残す。
- 植生は元Blend保全＋材質別葉メッシュ結合＋同一視点レンダー比較を優先。岩／建築等の静的な不透明モデルは別の3段階LOD Actionを利用。樹木遠景は8方向Impostorをレビュー用に生成できる。
- LODのヒステリシス／2Dセル先読みの純粋関数はNodeテスト済みだが、各階層の実ゲームLODマネージャーやロードは**未接続**。自動適用済みと説明しない。
- glTF MASK／alphaTest／MSAAのAlpha to Coverageは**検証候補**。シェーダー、フレームレート、モバイル端末での実測なしに一括採用しない。
- 参照: [GitHub Actions運用と検証記録](SHARED_3D_ACTIONS_OPTIMIZATION_PLAYBOOK.md)、[共通引継ぎ](BLENDER_SHARED_EXECUTION_ENTRYPOINT.md)。

## 実装済みActions / 検証段階（2026-11-17）

共通実装の詳細: [GLOBAL_3D_OPTIMIZATION_ACTIONS_HANDOFF.md](GLOBAL_3D_OPTIMIZATION_ACTIONS_HANDOFF.md)、[PR #488](https://github.com/koda24-cell/kotama-no-bouken/pull/488)。ツールコードのみdevelopmentにマージ済み。ゲーム本番LOD・カリングへは**未統合**。

| 項目 | 実動作の証拠 | ゲーム反映 |
| --- | --- | --- |
| 全階層GLB構造監査・変更GLB自動監査 | 第1層48GLB [run 44058467063](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44058467063) 成功。GLB転送容量とmesh/triangle/材質情報の構造検証 | ツールのみ。実GPUドローコールは未計測 |
| 葉材質別メッシュ統合＋4視点比較 | 第6層成木V14 [run 44059729505](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44059729505) 成功。9108→145mesh nodes、trisと視点PNGほぼ同一 | **未承認**。原木を保持 |
| 岩・建築向けLOD0/1/2 GLB＋12PNG | 苔材質保護 [run 44062318352](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44062318352) 成功。3806→2431→1459 tris | **未承認**。崖・足場の破断シルエット検査が必要 |
| 8方向遠景Impostor RGBAアトラス | [run 44061467370](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44061467370) 成功。UV選択ユニットテストも成功 | Three.jsで角度・視距離・影・切替フェード未統合 |
| 2Dグリッド先読みとLODヒステリシス判定 | Nodeテスト [run 44063296917](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44063296917) 成功 | 独立した純粋関数のみ。ゲームの衝突/セーブ/視界を変更していない |

対応ロードマップ: アセット別ゲーム視点テスト（前後/角度/近景）、端末別WebGLの `renderer.info` とFPS計測、透過MASK/A2Cと色/影の実比較、段階適用・ユーザー承認。まだ全階層自動LODを実装済みとは主張しない。


## 標準適用範囲を全階層へ拡張（2026-11-17）
新規・変更GLBのPR／development更新に合わせて全階層のGLBを自動監査。静的・不透明なモデルだけ比較用LOD候補生成を行う。樹木・草・透過・VFX・キャラは専用方式を使う。GitHubへの保存前の未承認Artifactsは自動検知できないため、制作側が生成ワークフロー内で監査する。ゲーム内LOD自動表示の導入とは別作業で、画質検証と正式承認を要する。詳細は [ALL_FLOOR_AUTO_OPTIMIZATION_HANDOFF.md](ALL_FLOOR_AUTO_OPTIMIZATION_HANDOFF.md)。

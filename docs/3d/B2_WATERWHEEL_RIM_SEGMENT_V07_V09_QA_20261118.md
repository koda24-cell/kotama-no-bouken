# B2 水車・単体木製輪縁 V07–V09 Blender実反復・品質評価
更新: 2026-11-18 JST。**全候補未承認 (NOT_APPROVED)、既存ゲーム水車・羽根板変更なし、正式素材保存/マージなし。**

## 反復と検証済みAction
| 版 | Actions | 一時Artifact ID | 追加造形/テクスチャ | 美術検査 |
|---|---|---|---|---|
| V07 初回 | [44250236072](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44250236072) | なし | V05 Boolean加工後の頂点数が変化したことによる旧トポロジー固定assertで中止。DockerがBlender Python例外時でも0返却しうるため、workflowにTraceback/成功マーカー検出追加 | **実PNG未生成**。初回失敗は完成扱いしない |
| V07 修正成功 | [44250612575](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44250612575) | **14403597918** | 最良V05 BLENDを復元、実極座標で端部56頂点を最大0.01160m摩耗。元木栓・写真PBR維持 | V06の突起を回避、ただし木目の方向が横向きで不自然 |
| V08 | [44251227244](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44251227244) | **14403613694** | V07から表面UV 1672ループの向きを回し、**木目を木材長手方向へ修正**。木口はCC0写真素材70%＋人工年輪30%のブレンド | **V07から明確な質感改善**。木栓の白い円盤が残る |
| V09 | [44251856553](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44251856553) | **14404222844** | V08から木製木栓2本のUVに写真混合木口を割当て、木栓用リングの色も調整 | 木栓の白さは改善。ただし**黒い輪郭がまだ強く、最終美術は未合格** |

## 検証された成果物
- V07/V08/V09の各runは、**実際のBlender 5.3 / Cycles**により、編集用BLEND、ゲーム用GLB、正面・側面・斜め・裏の4方向PNG、SHA256 manifestを実生成した。GitHub Actionsの最終ステップ成功。
- Artifactをそれぞれダウンロード・展開し、6ファイルすべてのバイト長/ SHA256がmanifestと一致することをローカル検証した。画像を目視して木目の方向・木栓を比較した。
- V09のGLB構造確認は5メッシュ、**1,028三角形、埋め込み画像4枚、1,459,144 bytes**。V07/V08も同一1,028三角形。これらはファイル構造値でありGPU draw calls、FPS等の実測ではない。
- **Poly Haven Fine Grained Wood** (https://polyhaven.com/a/fine_grained_wood) のCC0写真Diffuse・OpenGL Normal・Roughnessは継承して使用。木口年輪画像は独自手続き生成であり撮影写真と混同しない。
- 既存輪縁半径2.55/14スポーク互換、V03元形状の保護バックアップが各Blendに存在。V08/V09は木材形状を再変更せずUVと木栓材質だけ変更している。
- V09編集用/GLBおよび4枚の実画像はArtifact 14404222844 `b2-waterwheel-single-rim-v09` に保存。一時保存期間は14日、**正式素材フォルダへ昇格していない**。
- 共有GLB Performance AuditとThree.js実機FPSはまだ未実施。小規模メッシュなのは確認したが実機高速化の主張は不可。

## 継続改善優先順位
1. V09木栓の黒い輪郭を弱め、実際の木材に食い込む質感を近景・背面で見直す。
2. 木材の端面を極端なBoolean切削やトゲ状破片に戻さず、木繊維方向の小さな削れと深さのある汚れに改善する。
3. CC0木材PBRの写真テクスチャ自体を正確にUV貼付した状態で冷たい2層照明を検証する。
4. ジオメトリ保持、GLTFLoader実機、共有Performance Audit等をユーザー承認前に追加検証する。

## 共有・承認ポリシー
- 開発統合先は`development`、PR [#503](https://github.com/koda24-cell/kotama-no-bouken/pull/503) はDraftのまま。元の`field/assets/b2-frozen-waterwheel-scene.js`を変更せず、`main`や正式アセットフォルダへ未承認ファイルは保存しない。
- 自動モデル美術評価AIは当セッションで未接続。評価は実PNGの目視とGLB構造・SHA照合に基づく。

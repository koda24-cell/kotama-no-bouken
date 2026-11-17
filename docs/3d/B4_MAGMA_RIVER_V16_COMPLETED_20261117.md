# 第4層 マグマ河川 V16 — 完成承認・正式保存記録

- **承認**: 2026-11-17、ユーザー「これでおｋとします」。V16の静止3D造形を正式採用。
- **元のレンダリング**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027612542 （success）
- **元のArtifact**: 14303622918 / `b4-magma-river-v16-review`。元runのソースSHA `d31c3fd88ff2ea5fdb942e193235e62647633690`。
- **正式GLB**: `assets/models/floor4/b4-magma-river-v16.glb`
- **正式レビュー一式**: `assets/models/floor4/reviews/b4-magma-river-v16/`（front/side/angle/top PNG、source.blend、manifest.json、source-manifest.json、SHA256SUMS.txt）
- **生成元コード**: `tools/floor4/magma_river/build_magma_river.py`。GitHubで編集・再生成可能。
- **元の参考設計**: `docs/3d/B4_MAGMA_RIVER_TRANSITION_DESIGN_20261117.md`
- **技術引継ぎ**: [B4_MAGMA_RIVER_V16_CLAUDE_HANDOFF.md](B4_MAGMA_RIVER_V16_CLAUDE_HANDOFF.md) とJSON版。
- **素材の扱い**: 第4層の「蛇行する河川・滝・岸・溜まり・冷却殻・岩盤」の複合環境1セット。独立して承認済みの溶岩溜まりC V3は別GLBとして維持。
- **非採用**: 以前の独立モジュールA/B/D/Eは引き続き不採用。これらを完成台帳に追加しない。
- **未実施**: Three.jsゲーム内配置、タイル継ぎ目、動的流動/VFX、実端末FPS。美術的完成とゲーム実装を混同しない。
- **統合先**: `development`。 `main` は変更しない。
- **保存検証**: ActionsがGitへ実ファイルをコミットした後、`development` 上のGLB/PNG/manifestの存在を再確認して完了判定する。コミット前の段階では正式保存済みと報告しない。

## 次の派生候補（V16を上書きしない）
1. **岩の隙間を流れる細い支流**: 1マス接続の左右・T字・蛇行、岸を黒く冷却させる
2. **段差のある溶岩瀑布**: 溶岩の厚み・岩への密着・落下先の滞留をセット化
3. **溶岩溜まり＋黒い冷却殻の岸**: 承認済みCの周囲に差し替え可能な地形を追加
4. **破断した玄武岩の岸・足場**: 岩の層理、割れ目、火山灰、赤熱する隙間を追加
5. **噴気・火の粉・熱揺らぎ**: VFXを別コンポーネントにし、流路形状とは分離

次の制作は別ブランチとPR。Pinterest参考画像は [引継ぎ](https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b4-magma-river-transition-20261117.md) を継続使用。外部画像は無断転用しない。

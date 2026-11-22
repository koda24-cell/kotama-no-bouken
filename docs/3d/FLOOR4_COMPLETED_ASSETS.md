# 第4層 完成3D素材一覧

## 完成承認済み
| 素材 | 版 | モデル | 3方向PNG・検証 | Claude引継ぎ | ゲーム統合 |
| --- | --- | --- | --- | --- | --- |
| 廃坑・鉱石トロッコ | V32 | `assets/models/floor4/b4-minecart-v32.glb` | `assets/models/floor4/reviews/b4-minecart-v32/` | `docs/3d/B4_MINECART_V32_COMPLETED_20261117.md` | 未実施 |

| 溶岩溜まり（単体Cのみ） | V3 | assets/models/floor4/b4-lava-pool-v3.glb | assets/models/floor4/reviews/b4-lava-pool-v3/ | docs/3d/B4_LAVA_POOL_V3_COMPLETED_20261117.md | 未実施 |

完成承認は2026-11-17。正式ファイルは承認済みPR #443でdevelopmentへ統合済み（merge commit 59ac281a0cdf9aa2f465d73fd456108828d4fa59）。制作途中のPR #431は別途Draftとして残す。ゲーム内の既存モデルはまだ置換していない。

次の制作候補: レール・枕木・分岐・破損レール。既存素材を保持して独立PRで制作する。

2026-11-17: 溶岩単体5候補のうち C（溶岩溜まり）のみ採用。A/B/D/Eは不採用。CのGLB/PNG/Blend/manifestを正式保存。ゲーム統合は未実施。

## マグマ河川 V16（2026-11-17 ユーザー完成承認）
| 素材 | 版 | 正式GLB | 4方向レビュー・manifest | Claude引継ぎ | ゲーム統合 |
| --- | --- | --- | --- | --- | --- |
| マグマ河川・岩盤・溶岩滝複合セット | V16 | [GLB](../../assets/models/floor4/b4-magma-river-v16.glb) | [レビュー](../../assets/models/floor4/reviews/b4-magma-river-v16/) | [MD](B4_MAGMA_RIVER_V16_CLAUDE_HANDOFF.md) / [JSON](B4_MAGMA_RIVER_V16_CLAUDE_HANDOFF.json) | 未実施 |

- 元のBlender成功run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027612542
- 完成記録: [B4_MAGMA_RIVER_V16_COMPLETED_20261117.md](B4_MAGMA_RIVER_V16_COMPLETED_20261117.md)
- 独立採用済みの溶岩溜まりC V3とトロッコV32は保持。A/B/D/E単体候補は不採用のまま。
- 正式保存の実体・developmentマージは別途検証。ゲーム内表示・動的VFXは未実装。

- **V16恒久保存検証済み**: Archive run [44028977940](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44028977940) success、正式保存PR [#477](https://github.com/koda24-cell/kotama-no-bouken/pull/477) developmentマージ成功（`65c5ff184adef4f7ccb9382313d3f5e3c4826c9a`）。GLB/Blend/4 PNG/承認manifestのGit実体を確認済み。
- 次の派生P1/P2/P3（細い支流・分岐岩岸・段差棚）は[試作PR #478](https://github.com/koda24-cell/kotama-no-bouken/pull/478)で管理。**未承認**、完成素材一覧には追加しない。

## マグマ河川派生 P1 V4 / P2 V4 / P3 V5（2026-11-17 ユーザー完成承認）
| 素材 | 正式GLB | Claude引継ぎ | ゲーム統合 |
| --- | --- | --- | --- |
| 細い支流・岩岸 P1 V4 | assets/models/floor4/b4-magma-river-p1-v4.glb | docs/3d/B4_MAGMA_BANK_P1_P2_P3_CLAUDE_HANDOFF.json | 未実施 |
| 分岐玄武岩岸 P2 V4 | assets/models/floor4/b4-magma-river-p2-v4.glb | 同上 | 未実施 |
| 玄武岩段差・第二溶岩滝 P3 V5 | assets/models/floor4/b4-magma-river-p3-v5.glb | 同上 | 未実施 |

GLB・Blend・4方向PNG・ハッシュ付きmanifestは各reviews/b4-magma-river-p*-v*/に恒久保存。承認済みV16本体は保持。ゲーム統合は別作業。

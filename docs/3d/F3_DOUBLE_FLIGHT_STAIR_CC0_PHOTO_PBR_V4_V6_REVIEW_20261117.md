# 第3層・二段折り返し階段 V4〜V6 写真PBRテクスチャの実装記録
更新: 2026-11-17 / 対象 PR #469 / NOT_APPROVED（ユーザー最終承認前）

## 素材と利用条件
Powered by Poly Haven — https://polyhaven.com/
CC0: https://polyhaven.com/license
Chipped Concrete: https://polyhaven.com/a/chipped_concrete
Concrete Moss: https://polyhaven.com/a/concrete_moss
GitHub Actionsが正式Poly Haven Public APIの/files/<asset>から1K JPG形式のDiffuse, Normal(GL), Roughnessを各3点ずつ取得。各公式提供MD5との照合に成功し、SHA-256・出典URLはpbr_sources/sources.jsonへ記録。
取得用コード: tools/floor3/double_flight/fetch_pbr_v4.py

## 実際に成功したBlenderレンダリング
| 版 | 成功run | artifact ID | 目視評価 |
| --- | --- | --- | --- |
| V4 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44026687666 | 14303880827 | 写真材質は導入成功、主な踏み板はまだ明るい |
| V5 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027118338 | 14303103521 | 苔の全面適用で緑色が強すぎる |
| V6 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44027680624 | 14303257909 | 2種写真を部分合成。緑を抑制できたが雨染みの局在はまだ弱い |

V4/V5/V6いずれも実Blenderレンダー正面・側面・斜め、GLB、Blend、manifest、PBR元写真6点、取得元JSONをArtifactに保存し、取得後のZIP内容確認済み。
V6実GLBをバイナリ解析し、画像5点すべてにglTF内部bufferViewがあることを確認。材質のBaseColor/Normal/Roughness画像参照あり。外部URL参照なしにGLBとして利用できる形。
Blender原本にも画像をpack。Poly Haven CC0の元テクスチャ6枚はArtifacts ZIPのpbr_sources/に含まれ、各画像のハッシュはsources.jsonに保持。
V6 GLBと画像・Blendの各SHA-256はArtifact内manifest.jsonと照合済み。

## アートレビュー・後続作業
- 元参考には二段階段の構造だけでなく、雨垂れ、柱下部の苔、階段の陰面の細かな汚れ、赤錆の流出がある。
- V6はコンクリートがまだ均一。局所的な湿り跡、接合点の劣化、輪郭の欠損とPBRの連動を強化する余地がある。
- 画像テクスチャの導入とレンダリングは技術的に成功しているが、参考像の美術的な完成判定は未到達。
- 既存ユーザー承認階段V8は変更しない。新しい大型二段階段は独立Draft PR #469のまま保持。
- Artifactsは14日間の一時保存。正式ゲーム素材としてのGLB/PNGのGit保存はユーザー承認後に実施。
- Claudeは承認後のGLB/PNG/manifestをThree.js側で読み込む。Blender操作は不要。

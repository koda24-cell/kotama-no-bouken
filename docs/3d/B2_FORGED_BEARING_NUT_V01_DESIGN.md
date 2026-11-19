# B2水車・手鍛造六角ナット一個 V01 設計
2026-11-19 JST / NOT_APPROVED

## 前提
- 直前の丸頭ボルトV04: Draft PR #596, nominal shaft diameter 70mm, 8 helix turns at distal end. Do not touch this original.
- 下部軸受けPR #568、上蓋PR #580、外輪・ハブ・羽根等は保持。ナット1個のみ独立制作。ユーザーが気にした四角い形は**ボルトの露出頭部**の問題であり、ナットは木材裏側の固定部とする。
- 設計前に development の AGENTS.md、Blender Docker handoff、Asset promotion、Blender entrypoint、tooling policyを読了。

## モデル詳細
- Z軸に沿う単体。厚さ0.066m（Z=-.033…+.033m）、外接円半径0.081m、近似対辺0.140mの**不規則な手鍛造六角**。ボルトの四角い頭を再現しない。
- 内側の実貫通穴は半径0.037m（既存軸R=.035mに対し2mm半径余裕）、内壁に微小な螺旋谷を近似形状で造る。実ねじ規格との螺合は**未検証**、ねじを回して締められると断言しない。
- 表裏の角に1〜6mm相当の異なる面取り、外周に小さな鍛造歪みと軽いへこみ。新しいナットのような完全対称六角にはしない。
- 色は暗い鉄が主体。茶色錆を散在させて黒鉄が埋まらないようにする。512²の独自画像をBlenderで生成しGLBへ埋込。第三者の参考写真はテクスチャに流用しない。
- 中距離では六角シルエットが読み取れ、近距離では酸化斑点・摩耗・螺旋を認識できること。単一GLBメッシュを想定し、ゲーム動作への適用はしない。

## 検査／保存境界
- GitHub Actions 上のBlender5.3.0 + ClamAV digest固定環境を第一候補。正面／側面／斜め／背面のCycles PNG、編集用Blend、GLB、元画像PNG、manifest SHAを生成。
- Mesh watertight/basic face count、穴のRと軸径、GLB画像埋込、SHA、ClamAV出力スキャン、視覚評価。ゲーム内FPS／実ボルトとの螺合／共通3D性能Actionについて、実行した範囲と未実行を区別する。
- 未承認のGLBを正式素材フォルダへ移動しない。PRはdevelopment向けDraft。main変更・マージ禁止。Artifactsは一時保存。
- 参考候補： https://www.portlandbolt.com/products/nuts/hex-nuts/ 、https://www.spab.org.uk/sites/default/files/Repair%20of%20Waterwheels%20v4%20FINAL.pdf 。Pinterestは参考候補の調査を別リポジトリに記録、未閲覧画像を実確認済みと言わない。

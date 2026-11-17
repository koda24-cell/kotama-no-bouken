# 第3層「遺跡都市」二段折り返し階段 V10 — 完成記録

- **完成承認:** 2026-11-17。ユーザーがV10の実レンダーを見て「おけとします」と明示し、正式保存・Claude用形式・完成メモを依頼。
- **アセットID:** `floor3_double_flight_stairs_v10`
- **状態:** 完成モデルをGitHub正式素材に保存。**ゲーム内実装は未着手**。
- **モデル(GLB):** `assets/models/floor3/double_flight/stairs_v10.glb`
- **Blender原本:** `assets/models/floor3/double_flight/sources/stairs_v10.blend`
- **レンダー画像:** `assets/models/floor3/double_flight/reviews/stairs_v10/front.png`、`side.png`、`angle.png`、`detail.png`
- **承認・SHA-256付き機械可読manifest:** `assets/models/floor3/double_flight/stairs_v10.manifest.json`
- **写真PBRの元画像と出典:** `assets/models/floor3/double_flight/textures/` （`sources.json`とDiffuse/Normal/Roughness画像6枚）
- **Blender再生成コード:** `tools/floor3/double_flight/build_v1.py`～`build_v10.py`、`fetch_pbr_v4.py`
- **成功した本番レンダー:** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44035057067
- **正式保存確認:** https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44051466058

## 完成範囲・品質
参考画像の朽ちた屋外二段階段を目標に、上下階段、踊り場、コンクリート柱/梁、錆びた鋼管手すり、実形状の欠け、苔・雨染みをV1～V10で制作。正面・側面・斜め・接写の4方向をBlenderで実レンダリング。

Poly Haven CC0の **Chipped Concrete / Concrete Moss** を採用。配布元 https://polyhaven.com/a/chipped_concrete / https://polyhaven.com/a/concrete_moss。実写のBaseColor/Normal/Roughness画像をGLB内部へ埋め込み、Blender原本にもpack済。原写真6枚と出典のSHA-256はGitHubにも保持。

元runのGLB・Blend・PNG4枚とPBR元画像6枚をハッシュ照合してから正式保存した。完成manifestは承認対象と原runを明記。

## 境界・注意
- **第3層の大型複合階段単体を承認。** 既存の2mモジュラー階段V8とは別物。
- ゲーム側のGLTFLoader読込、階段の原点・寸法、接続、衝突・歩行可能性、カメラや描画負荷は**未検証**。Claudeが別の独立PRで確認する。
- PR #469には旧版V1～V10および未承認時のワークフローが含まれるので、**PR #469をまとめてマージしない**。承認済みV10だけの独立PRをdevelopmentへマージする。
- 旧スロープのDraft PR #440と完成モジュラー階段V8を変更しない。mainは変更しない。
- GitHub Actions Artifactsは14日間の一時保存。**正式素材はGit内のGLB、Blend、PNG、PBR原本、manifest。**

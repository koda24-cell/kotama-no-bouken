# Claude向け｜第3層「遺跡都市」階段V8　正式素材の引き継ぎ
更新日: 2026-11-16
状態: ユーザー承認済・GLB/PNG Git保存済 / ゲーム本体の配置未実装

## 確定素材
- **GLB**: `assets/models/floor3/ruined_connector/stairs_v8.glb`
- **3方向PNG**: `assets/models/floor3/ruined_connector/reviews/stairs_v8/{front,side,angle}.png`
- **マシン可読manifest**: `assets/models/floor3/ruined_connector/stairs_v8.manifest.json`
- **Blender原本**: `assets/models/floor3/ruined_connector/sources/stairs_v8.blend`（Claudeによる操作不要）
- **Blender再生成ソース**: `tools/floor3/ruined_connector/build_stairs_v8.py`、依存するV1～V7スクリプト
- **元レンダリング証拠**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43858942490
- **モデルタイプ**: glTF 2.0 / GLB（埋込normalTextureあり）
- **既存タイル設計**: 水平フットプリント2 m × 2 m。進行方向は低い南端 y=-1 から高い北端 y=+1、想定床高 z=-0.45→+0.45（生成元スクリプト基準）。
- **品質**: 正面・側面・斜め実BlenderレンダリングとGLB技術検査済。完成の美術判断はユーザーがV8を明示承認。

## Claudeがする作業
1. このファイル・manifestの `approval.approved=true`、元run、ファイルSHA-256、GLB存在を確認。
2. `GLTFLoader` からGLBを読み、Three.jsで原寸の2m幅と方向・原点・高さを確認。正面/側面/斜めPNGと照合。
3. 既存第3層の高架橋/階段接続タイルと高さ・向き・道幅・衝突判定・奥行カメラ・クリッピングが一致するか確認。実装前に既存マップ生成を読む。
4. 破損した段差で通路の見た目と歩行可能判定が矛盾しないこと、UV/normal/材質とライトの見え方を実ブラウザで検査。
5. 実装が必要なら**独立featureブランチからdevelopment向けPR**へ。初期はゲームの本番表示を壊さない検証切替方式を推奨。mainには触れない。
6. 未承認スロープ・踊り場を誤って正式保存・統合しない。

## 実行境界
- ClaudeはBlenderを操作・レンダリングする担当ではない。
- GLB/PNGとmanifestは承認済みだが、**ゲーム内統合と実画面検証は未完了**。
- ユーザー承認後の正式保存と、ゲームの既存機能維持・実装判定を分ける。
- モデルを変更したり新しい撮影が必要ならGPT/Blender制作に戻す。

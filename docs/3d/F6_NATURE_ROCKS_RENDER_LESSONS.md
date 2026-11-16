# F6 岩3種：レンダリング起動問題と改善メモ（2026-11-14）

## 事実と未確認事項
- PR #364 の岩3種（小・中・大）にはBlender生成スクリプトとActionsワークフローがある。
- 以前のコミットに対するGitHub連携の `fetch_commit_workflow_runs` は空配列を返した。ただし、このAPIはPR起動のrunに絞られるため、**push起動のrunが存在しない証拠ではない**。以前の「起動していない」との断定は撤回する。
- この環境にはBlender実行バイナリがなく、外部DNSも利用できない。ここでは実レンダリング・PNGの目視確認はまだできていない。

## 今回の修正
1. `.github/workflows/f6-nature-rocks-render.yml` に `pull_request` → `development` を追加。PR #364 の更新時に実行されれば、PR起動runを確認できる。
2. Blenderインストール後に `blender --version` を出力し、実行環境を特定しやすくした。
3. `upload-artifact` に `if-no-files-found: error` を設定。PNG/GLBがないのに成果物アップロード成功と見なさない。
4. スクリプトのmanifest末尾を正しい改行エスケープ `'\\n'` に統一。
5. Blender 4.2以降では `BLENDER_EEVEE_NEXT`、旧版では `BLENDER_EEVEE` を選択するようにした。

## 次の検証（必須）
1. PR #364 の Checks / Actions で `F6 Nature Rocks Render` の実行有無・結果を確認。無ければリポジトリのActions設定、workflowファイル登録、PRの起動条件を確認。
2. `Check Python script`、`Install Blender`、`Export GLB and render four angles`、`Validate GLB PNG and manifest` の各ステップを確認し、失敗ログから原因を特定。
3. `f6-nature-rocks-v1-review` Artifactの3 GLB、12 PNG、3 manifestを取得し、画像を実際に開いて正面・側面・斜め・上面を確認する。
4. 苔が岩表面から浮いていないか、岩の底が地面に接しているか、3種類の差異が見えるか、1マス内に収まるかを評価。
5. 修正後は再レンダリング。ユーザーの画像承認までは正式素材フォルダへ昇格しない。

## 今後の再発防止
- Actionsの起動状態を単一のPR限定APIの空結果だけで判断しない。
- Blender/Pythonの構文チェック、実行ログ、成果物の存在、実画像の確認をそれぞれ別の検証段階として報告。
- Claudeへは完成GLB/PNG/manifestのみ渡す。ClaudeにBlenderを操作させない。

## 実ログによる原因確定（run #43607486089）
- GitHub Actions runnerにBlender **5.0.1** が正常インストールされた。
- `Export GLB and render four angles` で `TypeError: enum "BLENDER_EEVEE_NEXT" not found in ('BLENDER_EEVEE', 'BLENDER_WORKBENCH', 'CYCLES')` が発生。
- 原因はバージョン番号だけでEEVEE_NEXTを選んだこと。Blender 5.0.1では `BLENDER_EEVEE` が有効。
- `tools/floor6/nature_rocks_v1.py` の描画エンジンを `BLENDER_EEVEE` に変更した。修正後の成功・PNG出力はまだ未検証。
- 再発防止: バージョン番号から列挙値を推測せず、実行環境の利用可能な列挙値か実ログを根拠に設定する。

## 実行 #43608225715：EGLランタイム欠落
- Blender 5.0.1で最初のGLBエクスポートまでは成功。PNGレンダリング開始時に `Couldn't open libEGL.so.1`、exit 134。
- GitHub Actionsに `libegl1 libgl1 libopengl0 libgl1-mesa-dri` を追加し、`LIBGL_ALWAYS_SOFTWARE=1` と `EGL_PLATFORM=surfaceless` を設定。
- 原因と修正は実ログに基づく。修正後のPNG出力は別途成功確認が必要。

## V2 造形改善（未レンダリング検証）
- 既存のcore/fracture/shoulderメッシュは維持。岩の外周に5角錐ベースの不規則な突出岩片を追加し、丸い輪郭を崩す。
- 上面に不規則な7角扇形の薄い苔パッチを追加し、既存の苔粒を薄く小さくする。
- 残課題：パッチのZ座標は近似式のため岩肌から浮く可能性がある。次の4方向PNGで確認し、必要ならレイキャストによる表面追従に改める。亀裂溝の実造形はまだ未実装。
- このコミットは形状改善コードの保存のみ。Blender Actions成功と実画像目視まで品質改善を確定しない。

## V3：岩本体の割れ目・テクスチャ（実レンダリング待ち）
- V2の4方向PNGを目視し、輪郭が丸く、小中岩の変化が弱く、苔が粒に見えることを確認。
- 本体メッシュの角度方向の変形量を増やし、斜め方向に狭い凹みを作る関数で亀裂状の溝を追加。これは幾何学的な凹みであり、まだ本格的な破断面・ブーリアン切削ではない。
- テクスチャ選定：花園に合う落ち着いた灰色の花崗岩、暗色の石肌、温かい褐色岩、セージ／オリーブ苔の計5色調。ライセンス不明の外部画像は使わず、コードで128×128の色むら付きalbedo画像を生成する。GLBで参照可能な画像テクスチャノード＋UV展開を使用。
- 苔の粒状パーツ数を減らす。薄い面パッチの位置は近似式のため浮きの可能性あり。レイキャスト表面追従は未実装。
- 次のActionsでUV処理、GLBエクスポート、4方向PNG、画像内の割れ目とテクスチャ可視性を確認。未確認の成果を完成扱いしない。

## V3初回失敗（run #43614033509）
- Python構文チェックで54行目に `SyntaxError: unexpected character after line continuation character`。
- 原因：亀裂処理の追記時に実改行ではなく文字列 `\\n` がソース内へ混入。
- 実改行と適切なインデントへ修正。修正後のBlender実行・GLB/PNGは未確認。
- 再発防止：スクリプト更新直後に必ず `python3 -m py_compile` を実行し、GitHub Actionsの実行結果を確認する。

## V4：メッシュ高密度化とスムーズ化
- icosphereをsubdivisions=3（642頂点）から4（2,562頂点）に変更し、岩本体1個あたり約3.99倍の頂点を確保（3倍以上）。
- 各面にsmooth shadingを指定。頂点単位の独立した強い乱数変形を、位置に連続する正弦波ベースの微細凹凸へ変更し、三角面の不自然なギザギザを抑える。
- 既存の岩のサイズ・基本形状・亀裂・苔・GLB/PNG出力は保持。
- 注意：GLB容量と処理時間が増える。Actionsで構文・実レンダリング・4方向PNGを確認し、見た目とポリゴン数のバランスを評価する。正式素材昇格は承認後。

## V5：三角形モザイクの除去
- V4の実レンダリングでは、2,562頂点のスムーズシェーディングでも三角形ごとの色の切り替わりが残った。
- 原因は `rock_part` のポリゴンごとの `material_index` ランダム割り当て。V5では岩メッシュ単位で1つの画像テクスチャ付きマテリアルに統一し、全ポリゴンの `material_index=0` を指定。
- 既存の形状、苔、UV、GLB・PNG出力は保持。画像テクスチャ内の微細な色変化を利用する。
- V5の実レンダリング・見た目はActions成功とPNG目視確認まで未検証。

## V6：つるつるした岩肌の改善
- V5のレンダリングでは面ごとの三角模様は解消したが、粘土状の滑らかさが残る。
- Blenderの標準ShaderNodeNormalMapと128x128の生成画像を使い、岩の粗さを接線空間法線として表現。3周波数の高さ関数を差分してRGBノーマルを生成し、Non-Color画像としてパック。
- 色テクスチャとNormal MapをGLBに同梱する構成。形状とsmooth shadingは維持。Normal Mapの効果・glTF書き出し・実際のPNGはActionsで要検証。
- VFXは表面の粗さには使わず、将来の落ち葉・砂埃等に限定して検討。外部テクスチャのライセンス未確認素材は使用していない。

## V7：V6の暗部つぶれ・Normal Map過剰を修正
- V6 run 43726817444 は生成成功したが、実PNGでは小中岩が黒くつぶれ、岩面に強い不自然な陰影が出た。
- V7でNormal Mapの強度を0.85→0.28、微分振幅を0.85→0.22に下げる。
- 高さ関数を128pxの周期関数へ変更し、UV画像端の差分不連続による法線の飛びを抑制。
- 岩石Albedoを少し明るく調整。既存形状・苔・GLB出力を維持。
- V7はコード保存段階。Actionsの成功と4方向PNGの実際の質感確認が必要。

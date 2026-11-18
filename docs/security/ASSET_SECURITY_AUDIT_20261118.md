# 2026-11-18 素材セキュリティ追加監査（Draft / 未承認）

## 範囲
- 対象：`development` を起点にした監査用ブランチ `feature/asset-security-audit-20261118` に存在する `assets/**/*.blend` **27ファイル**。ユーザーPCのローカルファイルや全PRのArtifactsは対象外。
- 既存ゲーム素材は変更・削除していない。元データは保持。
- 監査の目的：マルウェアの既知パターンに加え、Blender保存データ内のPython、drivers、外部参照を確認できるか検証。**ウイルス感染ゼロの保証ではない**。

## 実施した検査と結果

| 検査 | 結果 | 根拠 |
|---|---|---|
| GitHub ActionsでClamAVマルウェア検査 | ゲーム側 1,206スキャン対象、検出0。ClamAV 1.5.4、定義3,628,278 | [Run #44280375905](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44280375905) |
| ネットワークなし・低権限DockerでBlender内部スクリプト検査 | 27/27ファイル読み込み失敗。**内部コード有無は判定不能** | [Run #44282254524](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44282254524) |
| Zstandard外装の判定 | 27/27ともZstandardラッパーの展開に成功 | [Header Run #44283083926](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44283083926) |
| 展開後のBlenderファイルヘッダー検査 | 27/27で**標準的なBlenderヘッダーに一致せず**。例 `BLENDER17-01v0503REND` / `BLENDER17-01v0500REND`。Blender 4.0.2では全件が読み込み不可。 | [Header Run #44283083926](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44283083926) / [Blender Run #44282254524](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44282254524) |
| 展開後バイナリの非実行型文字列走査 | 27/27展開成功。Python import / exec/eval / shell実行 / http(s) URL の単純パターン検出 **0件**。パスらしき断片198件（バイナリ誤検出の可能性が高い）。 | [静的検査 Run #44283318821](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44283318821) |

## 重要な評価
- 今回の検査では、**既知のマルウェア検出や分かりやすい実行コード文字列は確認されていない**。
- ただし `.blend` の実データは標準的なBlender保存ファイルとしては認識されず、Blenderが内部テキスト・drivers・外部参照を解析できなかった。**「スクリプトが入っていない」「すべて安全」とは断定できない**。
- パスらしき198断片の中には `/home/agent` や `/home/runner` が見えるが、多くはバイナリ配列の誤検出。外部通信、感染の証拠ではない。今後の調査で本当に外部参照なのか整理する。
- 今後実際にBlender作業素材として利用する場合は、**正規のBlenderから開けるか検証し、必要なら元モデル(GLB)と作成スクリプトから正規のBlendに再書き出し**してから正式素材とする。ユーザー承認と既存制作ルールは維持。

## 警告：現行Blender監査のActions成功表示について
`blend-embedded-code-audit.yml` の該当Runは、各コンテナプロセスがexit 0で終了し、ログをアップロードしたためジョブが「success」になっているが、個々の結果は **27件すべて status:error**。ワークフローの成功はファイル安全検証の成功を意味しない。後続修正でエラー発見時にジョブを失敗させる必要がある。

## 検査の限界
- ClamAVは既知シグネチャを主に見るため、未知の攻撃や正規Pythonを悪用する行為を全て否定できない。
- バイナリ内文字列検索は完全な解析ではなく、文字列の難読化・圧縮済サブデータ・スクリプトとして認識されない領域を見逃す可能性。
- .blendのモデルそのものの正常読み込みは不成立。安全な隔離コンテナ、Blender4.0.2のバージョン条件で検査。
- 素材保存の承認・本番導入・記事公開を行ったわけではない。

## 次の優先作業
1. 使用しているBlender生成プロセスが、なぜ通常の`.blend`ではないバイナリを保存しているのか制作ソースを追跡し、正規のBlendを生成/確認できるよう修正。元データは残す。
2. 全27ファイルは内部レビュー「未確認」、ネイティブファイル互換性「要修正」として扱う。
3. Blender監査Actionで解析失敗の検出をワークフロー失敗/警告として扱い、成功表示で誤解させない。

## 重要な訂正（2026-11-18）: Blender 5.x の正規ヘッダー
以前の報告で「`BLENDER17-01v0503` / `BLENDER17-01v0500` は標準形式ではない」と書いたのは誤り。**Blender 5.0以降で正規に採用された17バイトの新しいヘッダー形式**である。参照: https://projects.blender.org/blender/blender/issues/129309 、https://developer.blender.org/docs/release_notes/5.0/core/ 。
- 27件のファイルはZstandard圧縮に成功し、Blender 5.0 / 5.3 の新ヘッダーを保持。形式の一致は確認できるが、27件すべての正常読み込みを実測したわけではない。
- 読み込みに失敗した主原因は監査コンテナの **Blender 4.0.2がBlender 5.xの新ファイル形式に対応していないこと**と考えられる。ウイルス・ファイル破損の証拠ではない。
- 27件中、第1層の候補17件は`tools/f1-sacred-forest/pack_sources.py` にBlender自身の`save_as_mainfile`で保存し、再読み込みしてテクスチャ内包を検証したコードと、`assets/3d/dungeons/b1_sacred_forest_candidates/manifest.json` に`Blender 5.3.0`の記録がある。第4層は`.github/workflows/b4-magma-river-v16-approved-archive.yml`などで生成済みArtifactをハッシュ照合し保存する手順を確認。
- **真の内部Python監査・正常な再読み込み検証が必要なら、Blender 5.3の隔離環境で`--disable-autoexec`を用いて同じファイルを開く**。既存のBlender 4.0.2監査の27/27失敗は互換性不足の可能性が高いため、不正判定には使えない。
- この訂正は元の監査結果を消さず、記録の解釈を修正するもの。ClamAVのウイルス検出0件とは別の話。

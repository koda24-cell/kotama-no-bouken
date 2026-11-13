# キャラモデル制作の共通入口（マイカを含む）

更新日: 2026-11-14。GPT・Claudeとも、キャラクターの素体・顔・髪・服の制作前に本書を読む。

## 制作方針

- 毎回ゼロから人体を生成する前に、下記の再利用可能な素体・補助ツールを検討する。
- マイカを含む既存キャラの承認済み形状・頭身・ポーズは保持する。外部素体への置換は自動で行わず、新規キャラや比較用の別モデルに利用する。
- 素体は土台。アニメ顔の輪郭、目、まぶた、口、手、肩・股関節は目的の絵柄と変形に合わせて調整する。
- 最初に正面・側面・斜めの実モデルを確認し、次にリグ変形・衣服の貫通・GLB再読込を確認する。レンダリング未実行を成功扱いしない。
- 品質承認前は制作支援素材として扱い、ゲームの正式素材には統合しない。正式保存は ASSET_PROMOTION_POLICY.md を参照する。

## 取得済みの共通素体

`tools/character-modeling/vendor/mpfb/base.obj`

MakeHuman Community / MPFB公式Gitから取得した中立人体メッシュ。付属 SOURCE.json に取得コミットとSHA-256を記録。原本は編集せず作業コピーを作る。これはアニメ顔完成品でも、衣服・リグ付き完成キャラでもない。

メッシュはCC0。隣接する LICENSE.ASSETS.md と UPSTREAM_LICENSE.md を読む。MPFBプログラムのGPLと、メッシュのCC0を混同しない。今回はプログラム全体をこのゲームリポジトリへ同梱していない。

## 補助ツール・追加素材の候補

| 用途 | 候補・公式配布 | 使用上の判断 | 現在の状態 |
| --- | --- | --- | --- |
| 人体・顔の体型調整、リグ | [MPFB](https://github.com/makehumancommunity/mpfb2) | Blender 4.2以上。公式 script_samples に人体生成、体型調整、リグ、服適用のPython例あり。アドオンGPL、コア素材CC0 | 素体OBJのみ同梱。アドオン有効化・生成未検証 |
| 顔・手・人体の造形土台 | [Blender Human Base Meshes](https://download.blender.org/demo/asset-bundles/human-base-meshes/) | Blender StudioのCC0素体集。対象バージョンと同梱ライセンスを取得時に確認 | 配布先のみ記録、未取得 |
| デフォルメ人体・髪 | [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) | CC0。6素体、Humanoidリグ、髪20種。無料版とSource版の収録形式・有料部分を分けて確認する | 未取得・未導入 |
| 髪・服・目、表情や口形 | [MakeHuman asset packs](https://www.makehumancommunity.org/assets/assetpacks/index.html) | CC0と明記されたパックを優先。第三者素材を一括でCC0とみなさない。Hair editor / Faceunits / Visemesは候補 | 未取得・未導入 |
| アニメ調の髪束 | [HairMesh](https://github.com/riel-gab/hairmesh) | カーブから編集可能な髪束メッシュを作る。GPL-3.0-or-later。公式READMEはBlender 5.1以上と指定。今回の環境4.3.2ではそのまま導入しない | 調査のみ、互換性未検証 |
| アニメ顔・髪・衣服の一体制作 | [VRoid Studio](https://vroid.com/studio) / [規約](https://vroid.com/studio/guidelines) | 商用利用・他ソフトでの編集は原則可能。CC0ではなく独自規約。外部購入素材は個別規約。Git cloneできるオープンソースツールではない | 候補のみ。アプリ導入・VRM読込未検証 |
| 服の造形・身体への追従 | Blender標準のMirror / Shrinkwrap / Solidify / Cloth / Data Transfer | 身体から服の作業コピーを作り、厚み・縫い目・裾・ウェイトを調整。Clothは補助であり衣装デザインの自動完成ではない | Blender 4.3.2の存在のみ確認。服生成は未実行 |

## 今後の推奨順序

1. 新規素体は同梱OBJまたはBlender素体集を比較し、目的の頭身・シルエットへ調整する。
2. 既存マイカの改善では現モデルを読み、顔・手・肩・脚の不足を見極める。同梱素体で承認済みモデルを置換しない。
3. 髪はBlender標準カーブによる髪束を第一候補とし、HairMeshは対応Blenderの環境を整えてから評価する。
4. 服は別メッシュで作り、厚み・身体との隙間・関節変形を確認する。再利用する外部服は出典と規約を記録する。
5. 作業後に出典、ライセンス、使用バージョン、導入・レンダリング・動作の実確認結果、次の課題を本書または対象キャラの制作記録へ残す。

## 画像資料との区別

本書は使用可能なモデルデータ・制作ツールの入口。Pinterestの画像は参考資料であり、その画像をモデルデータとして再配布できる意味ではない。画像収集時は https://github.com/koda24-cell/pinterest-reference-library の AGENTS.md と引き継ぎ手順に従う。

## 読み込みの範囲

ルートAGENTS.mdから本書へ誘導している。リポジトリを読めるGPT・Claudeの制作開始時に参照するための指示であり、リポジトリへアクセスしない別チャットへ自動注入される設定ではない。新しいチャットでは「GitHubのAGENTS.mdとキャラ制作共通メモを読んで」と伝えると確実。

## 今回の検証結果

2026-11-14、Blender 4.3.2のバックグラウンド実行で同梱OBJを読み込み、1メッシュ・19,158頂点・18,486ポリゴンを確認。読込は成功。見た目のレンダリング、リグ、GLB出力、アドオンの生成動作は今回未検証。

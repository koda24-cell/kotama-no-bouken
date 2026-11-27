# ゲーム本体非公開化・無料制作基盤の分離（2026-11-28）

## 目的・状態
ゲーム本体を非公開にし、公開許可のある汎用ツールを独立して保守する。追加課金なし、既存機能・原本・履歴・main を保持する。これは移行計画であり、リポジトリの公開設定変更、素材の公開、ツール移管、実行検証が完了したという意味ではない。

監査基準 development: 20eaba1d4a27515a35d3bc4eba705a541902a1ec（PR #861）。確認サイトは予約ブランチ preview/refresh の push のみで配信。最新成功 run 46021906771 は旧トリガーでの検証。#861 マージSHAの run は取得した直近一覧にはない。次の明示的更新で新トリガーを検証する。

## 役割・公開境界
| リポジトリ | 現在 | 目標 |
|---|---|---|
| kotama-no-bouken | public、development の workflow 137本 | private、ゲームコード・固有モデル・資料・正式素材・個別制作 |
| 3d-asset-studio | private、17 workflow | private のまま、素材ライブラリと個別制作・復旧 |
| 2d-animation-studio | private | private のまま |
| music-ai-studio | private | private のまま |
| koda24-cell-illustration-ai-studio | public、11 workflow | 公開可能なモデル・入力・生成結果のみ。非公開入力は別の保護された実行経路 |
| kotama-3d-progress | public、6 workflow | 公開許可済みの閲覧用素材だけ。非公開の管理情報は保護側へ |
| kotama-official-site | public | 紹介サイト。公開ゲームは承認済み独立配信へ |
| 新規の汎用制作基盤（候補名 public-asset-toolkit） | 未作成 | public、公開可能な汎用コード・合成テストのみ |

## 無料利用と機密性
- 公式 GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- 2026-11-28 時点の GitHub Free は月 $12 相当の計算枠（標準 Linux 2-core $0.006/分なら2,000分）、500MBのArtifacts/Packages共有枠、リポジトリごと10GBキャッシュ。アカウントの契約・実残量は未確認。
- 公開リポジトリの標準ランナーは無料だが、再利用 workflow の料金は呼び出し側に帰属する: https://docs.github.com/en/actions/concepts/billing-and-usage 。private の caller から public workflow を呼ぶだけでは無料化できない。
- 公開ツールの CI/合成データ検証・本当に公開可能な素材制作のみ公開側で実行する。private のソース・入力・未公開出力・ログ・チェックポイント・キャッシュ・鍵・パスワードを公開 Actions に流さない。private ソースを公開 runner に読み込ませるための広いトークンを設定しない。利用規約に反する無料枠回避を行わない。
- private 固有の長時間制作は private の無料枠内に絞る。超過は停止。自己ホスト runner は GitHub の計算料金が不要でも PC/電気/運用負担があり、ユーザー明示時のみ別途検討。
- 追加課金ゼロを担保するため Billing & licensing の実利用残量、支払い方法、Actions/Packages/cache の支出停止設定を本人が確認。警告だけの予算は上限として扱わない。既存 private リポジトリも同じ所有者の枠を消費する。
- 認証付き Cloudflare は Pages Functions/Workers の枠も消費する。配信は確認時のみ、固定URL・事前事後ゲート・ロールバック維持。Cloudflare Free のまま。

## 最小の移管単位（公開候補のみ、要ライセンス・内容レビュー）
| 既存ファイル | 対応 |
|---|---|
| .github/docker/blender53-clamav/Dockerfile | 汎用依存のみ。source ラベルの新Repo化、Blender配布条件・ハッシュ確認 |
| .github/docker/blender-clamav/smoke.py | 合成キューブのPNG/GLB smoke。ゲーム入力なし |
| tools/security/clamav_scan_gate.sh | 汎用スキャン。外部取得前後・出力の検査維持 |
| .github/workflows/build-shared-blender53-clamav-image.yml | そのまま移さない。現状B4固有素材を参照。汎用 image build と合成 smoke のみに分離 |
| .github/workflows/shared-blender53-render.yml | 現行は caller repo の tools/ と出力に依存。ゲーム側の gateway は維持し、汎用公開 smoke のみ独立検証 |
| blender53-*、long-production-*、advanced-production-* | 固有パス・入力・ログ・状態保存の依存を確認して必要な共通部品だけ抽出。既存ジョブ一括移動なし |

新規公開 repo は空の履歴から作り、レビュー済みファイルだけを追加する。元repoの clone/mirror/fork を公開しない。GHCR の既存 digest を変更せず、新パッケージの利用条件・権限・実 smoke が成功してから段階移行。実際のGLB/PNG、ClamAV、manifestを検証し、旧環境は残す。

## 非公開化前に解決する実際の依存
1. **公開ゲーム**: kotama-official-site/main の site-config.js は現在 https://koda24-cell.github.io/kotama-no-bouken/ を指す。GitHub Free で本体を private にすると公開 Pages が停止し得る。承認済み公開範囲（樹海のみの既存方針）の実体・依存を確認し、別の公開配信先へ移す。管理者コード・未公開階層・内部資料を公開 bundle に入れない。旧URLを新公開URLに更新し PC/スマホ実プレイ確認。main を無断で変更しない。
2. **進捗サイト**: kotama-3d-progress/main の illustrations.html は原本の raw.githubusercontent.com 固定SHA画像を直接取得する。index.html の Three.js レビュー画像・元PR・compare API も本体に依存する。private 化で匿名取得不可。公開許可済み閲覧用画像だけ安全に独立保存し、元PR/commit比較は認証側へ。既存の許可済み画像以外は新たに公開しない。原本は保持。
3. **自動収集**: kotama-3d-progress の collect-kotama-artifacts.yml は毎時実行し SOURCE_REPO_READ_TOKEN または github.token で本体のArtifactを取得する。公開側に private 本体を読める新トークンを追加しない。保護側で検証後、公開許可済みPNGと必要最小限の公開メタデータのみ渡す方式に切替える。公開サイトが不要な内部情報を自動取得しないことを確認。
4. **制作復旧**: 3d-asset-studio の kotama-recovery-monitor/receiver/worker 等の跨Repo実行・既存Secrets・GHCRのアクセスを確認する。非公開変更前に、保護された側で短いテストを行い復旧経路を確認する。現在進行中のジョブを中断しない。
5. **費用・保存**: 直近30日間の各リポジトリの実ジョブ分数とストレージを Billing で確認し、非公開時の予算を計算。既存 137 workflow を重複テスト・個別制作・汎用 CI・公開配信・非公開配信に分類し、不要な定期起動は根拠を確認して個別変更。回復用checkpointは検証後保存する。不要な機能増設なし。
6. **公開履歴**: 既存 public fork・過去のキャッシュ・ダウンロード済みデータは非公開化でも回収不可。https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility

## 移行順序と合格条件
- [x] 現状確認、手動配信トリガーは #861 で development にマージ済み（新トリガーの実配信未検証）
- [ ] 無料枠と支出停止を本人が確認、新規空の公開汎用repo作成
- [ ] 汎用Blender環境の最小移管・合成 smoke、既存の固有制作の保護側経路と費用試算
- [ ] 公開版配信先・公式リンク・進捗サイトの画像を独立化し表示試験
- [ ] private 化の影響確認、ユーザーの GitHub Settings で visibility 変更（現 connector は設定変更非対応）
- [ ] private 後にログイン/匿名拒否・開発確認の更新・公開版・進捗サイト・素材制作/復旧を実測。必要なら移行前の保護されたバックアップから復旧し、安易な再公開はしない

進行中の開発を止めない。無理にすべての旧ワークフローを移す必要はない。安全な公開範囲と予算が両立しない固有制作については、無料枠内実行・明示許可のPC実行・制作量削減の選択が必要であり、無制限無料と報告しない。

# Cloudflare 非公開開発版（パスワード認証）設定・検証・手動配信 引継ぎ（2026-11-27, Claude）

PR #856（`feature/gpt-cloudflare-private-preview-preflight-20261127`）の続き。GPT・Claude・Codex 共通の引継ぎ資料。

## 方針変更（2026-11-27 22:10 JST、ユーザー決定）

Cloudflare Zero Trust（Access）は Free プランでもカード登録が必須で、ユーザーはカード登録をしない判断をした。**Access/メールOTPは使わず、Pages Functions（advanced mode の `_worker.js`）によるパスワード認証**に切替えた。Access 用に作った setup workflow・`access_admin.py`・`access-config.json` は削除。

- 無料枠: Workers Free 1日 100,000 リクエスト（全リクエストが Worker を通る）。超過時はエラーになるだけで Free では課金されない。カード不要。
- 仕組み: 各デプロイの出力に `tools/cloudflare-preview/worker/_worker.js` を同梱 → 固定URL・個別デプロイURL・ブランチ別名すべてで、ファイル配信前に Worker が認証。未ログインは 401 のログイン画面のみ。パスワード一致で HttpOnly/Secure/SameSite=Lax の HMAC 署名 Cookie（30日）。パスワード変更で全セッション失効。パスワード未設定なら全リクエスト 503（fail-closed）。
- パスワードは GitHub Secret `PREVIEW_PASSWORD`（12文字以上）→ Actions が Pages プロジェクトの secret 環境変数へ登録。チャット・ログ・リポジトリに出さない。
- 旧ダミーデプロイ（Worker なし）は認証なしで残るため、保護版の検証後に Actions が削除する。
- 制約: メール単位の許可・拒否はできない（合言葉を知る人は閲覧可）。総当たり対策は長いパスワード＋失敗時0.8秒遅延のみ。

## 現在の状態（実測のみ）

| 項目 | 状態 |
|---|---|
| ダミーサイト配信 | 済（run 45993372597） |
| 未認証アクセスの遮断 | **合格（Actions）** run 46006007953（2026-11-27 22:20 JST）: 固定URL・26005b45 の全5パスが Cookie なし/偽 Cookie で 401 ログイン画面、未使用サブドメイン 404、誤パスワード 401、正パスワードで全ファイル取得可。旧未保護デプロイ 6c71c3ab を削除。外部からの取得でも固定URL・6c71c3ab・probe-20261127 別名は本文を返さないことを確認 |
| `PREVIEW_PASSWORD` Secret | 登録済み（2026-11-27） |
| パスワード Worker | 作成・ローカル単体試験済み（未設定503 / 未ログイン401 / 偽Cookie401 / 誤パスワード401 / 正パスワード303+Cookie / 別パスワードのCookie401 / 外部リダイレクト拒否）。Cloudflare 上でも run 46006007953 で動作 |
| 2回目の更新後の認証維持 | 合格 run 46006356747（26005b45 → 4203a551、全ホスト検証 PASS） |
| ロールバック後の認証維持 | 合格 run 46007504826（固定URL 4203a551 → 26005b45、全ホスト検証 PASS） |
| ユーザー実機確認 | iPhone 合格（2026-11-27 22:27 JST: ログイン画面、誤パスワード不可、正パスワードで revision 4 表示・Interaction OK・画像表示）。PC 合格（2026-11-27 22:35 JST ユーザー報告） |
| ゲーム本体の配信 | 初回配信 run 46009323457 成功。最新確認 run 46021906771 成功（実プレイの全機能確認とは別） |

## ユーザー作業（これだけ）

1. https://github.com/koda24-cell/kotama-no-bouken/settings/secrets/actions → New repository secret → Name `PREVIEW_PASSWORD`、Secret に12文字以上のパスワード（パスワード管理アプリ等に保存）。
2. 登録を Claude/GPT に伝える → `update-check.json` の revision を上げて push。
3. Actions 成功後、iPhone・PC で https://kotama-private-probe-20261127.pages.dev を開き、ログイン画面→パスワード→「Update check revision N」とボタン「Interaction OK」・画像表示を確認。誤パスワードで入れないことも確認。

## Actions 一覧

| workflow | 起動 | 内容 |
|---|---|---|
| `cloudflare-protected-probe.yml` | feature ブランチで `tools/cloudflare-preview/update-check.json`（revision +1）か worker を変更して push | `update`: パスワード登録 → Worker 付きダミー配信 → 新デプロイ検証 → 旧・未保護デプロイ削除 → 全ホスト検証。`rollback`: 直前の保護済みデプロイへ戻し全ホスト検証 |
| `cloudflare-access-gate.yml`（名称は互換のため維持、中身はパスワードゲート） | 自身/`pages_gate.py` の変更 push、他 workflow から呼出 | 全デプロイの全ホスト×全パスを Cookie なし・偽 Cookie で取得し、Worker の 401 ログイン画面のみ合格（TLSエラー・リダイレクト・404・5xx・200 は不合格）。未使用ランダムサブドメインは 401/404 で可。各ホストで誤パスワード=401、正パスワード=ログイン後にファイル取得可を確認 |
| `cloudflare-dev-preview-deploy.yml` | 予約ブランチ `preview/refresh` への push のみ（通常は `refresh-stamp.txt` を変更。大規模差分で見落とさないよう paths フィルターなし）。**変数 `KOTAMA_GAME_PREVIEW_ENABLED=true` の時だけ** | 事前ゲート → 配信ファイル選別＋Worker 同梱 → 配信 → 事後ゲート → 失敗時は固定URLを戻し新デプロイ削除 → 成功時は保護済みデプロイを最新5件に整理 |

## 検証の進め方（順番厳守）

1. `PREVIEW_PASSWORD` 登録 → `update` 実行 → 全ホスト検証 PASS・旧デプロイ削除を run で確認。
2. ユーザーのスマホ・PC 確認（ログイン可・誤パスワード不可・刻印表示）。
3. revision を上げて再度 `update`（更新後も認証維持・固定URL反映）→ `rollback`（戻った後も認証維持）。
4. 合格後、PR #856 を development にマージ → `KOTAMA_GAME_PREVIEW_ENABLED=true` → 初回ゲーム配信と実プレイ確認。

## 2026-11-27 23:00 初回ゲーム配信後の指摘と対応

- ユーザー報告: BGMと画像が一部しか出ない／第1層3階が最新でない。
- 原因1（確認済み）: 選別ツールの文字列パス検出が英数字のファイル名しか拾わず、日本語・空白入りの BGM・画像（`assets/music/戦闘/*.mp3`、`Final Battle Arc.mp3` 等）を落としていた → 修正。
- 原因2（確認済み）: 第3層の `b3_industrial_candidates`（1.8GB）がフォルダ上限で丸ごと除外され、`catalog.json` 経由の読込が失敗 → 巨大フォルダは最上位の catalog/manifest JSON を同梱し、そこに列挙されたファイルを辿るよう修正。修正後: 966 ファイル / 約 1.0 GB（development 90cfa71）。
- 原因3（2026-11-28 ユーザー報告「効果音が出ない」）: `playSe("assets/se/senntou/ダメージ")` のように拡張子なしで書き実行時に `.mp3` を付けるため検出できていなかった → 拡張子なし `assets/...` 文字列に .mp3 等を補って探索、加えて `assets/se`・`assets/serihu` は常に丸ごと同梱。修正後 1005 ファイル（効果音・ボイス 39 件）。
- main にだけある「Add files via upload」の素材 31 件（BGM・GIF 等）は development のコードから参照されていないため、確認サイトの欠落原因ではない。
- 第1層3階: development は #849 で聖域の森 F3（game-layout-v6）を有効化済みで、その参照ファイルは全て同梱済み。ユーザーの言う「最新」が未マージ PR の可能性 → 「development ＋選択 PR」を表示する仕組み（AGENTS.md「確認サイトを更新して」）を追加。

## 配信ファイル選別（`tools/cloudflare-preview/build_runtime_bundle.py`）

`index.html` から HTML の src/href、CSS の url()/@import、JS の import と文字列パスを辿り、許可したトップ階層（`index.html` `style.css` `css/` `data/` `field/` `assets/` `shared-3d-library/`、ルートの .js/.css、runtime が import する `preview/` 内の個別ファイル）だけをコピーする。`docs/ references/ _trash/ tools/ prototypes/ render-output/ review-shots/ .github` と、アセット内の `verification/ renders/ metrics/ sources/`、`.md .py .blend .psd .zip .env .pem .key` 等は除外。実行時に `BASE + ファイル名` で組み立てる読込に対応するため、runtime JS 中のディレクトリ定数が指すフォルダの runtime 形式ファイルを含める（1フォルダ200MB上限）。25 MiB 超・LFS ポインタ・2万ファイル超・除外パス混入で失敗。

development `01ffc8604a47a68d0c6d1b59fc18b7146e65fea1` でのローカル実行結果（静的解析のみ。ブラウザ動作は未確認）:

- 705 ファイル / 約 432 MB（リポジトリ全体 約1.3 GB）。最大 20.9 MB（`b1_sacred_forest_candidates/scene/sacred_forest_scene.glb`）。上限違反・LFS なし。
- 内訳: assets/3d 177 MB、assets/models 74 MB、assets/textures 73 MB、music 34 MB、monsters 31 MB、battle-backgrounds 22 MB。
- 外部依存: three.js 0.180.0（cdn.jsdelivr.net、importmap）、Google Fonts（DotGothic16）。raw.githack / raw.githubusercontent 参照は runtime に無し。
- **development 側の既存欠落**: `field/field-3d-b4-b5-map.js` が読む `./field/assets/b5-distant/facade020c-windows.png` がリポジトリに存在しない（第5層遠景の窓テクスチャ）。配信前に修正か許容判断が必要。
- 実行時組立のため静的に断定できない参照（名前+接尾辞）: `field/b5v6` の `*_diff/_nor/_arm.jpg` はフォルダごと同梱済み。
- 認証付きプレビューには `admin-tools.js` も含まれる（index.html が読込むため）。公開版では除外が必要。
- `b1_sacred_forest_candidates/manifest.json` には内部の build スクリプト名・元 .blend 名が文字列として含まれる（ファイル自体は同梱しない）。

## 未完了・未検証（完了と扱わない）

- PR #856 は development にマージ済み。初回・最新配信の認証ゲートは成功。全階層・戦闘・保存等の実プレイ試験は別途必要。
- Access 案の調査記録（無料プランの条件・2アプリ必要）は git 履歴 88031b5 を参照。

## 2026-11-28 手動更新への切替・非公開化の前提

- 通常の development マージでは配信しない。ユーザーが確認を希望したときだけ AGENTS.md の手順で `preview/refresh` の `refresh-stamp.txt` を更新する。既存の PR 選択、認証ゲート、ロールバック、固定 URL を維持する。
- GitHub リポジトリの公開範囲と Cloudflare 認証は別。GitHub 本体の visibility 変更前に、公開版の移管、GitHub Pages・raw.githack 依存、公開進捗サイトの素材リンク、GitHub Actions の private 無料枠・課金停止設定を確認する。過去の公開 fork・キャッシュ・取得済み素材までは回収できない。追加課金・main 変更なし。
- この変更は配信トリガーの設定変更。新しい手動更新の実 Actions 成功は run で確認するまで未検証とする。

# Cloudflare Access 設定・検証・自動配信 引継ぎ（2026-11-27, Claude）

PR #856（`feature/gpt-cloudflare-private-preview-preflight-20261127`）の続き。GPT・Claude・Codex 共通の引継ぎ資料。

## 現在の状態（2026-11-27 21:00 JST 時点・実測のみ）

| 項目 | 状態 | 根拠 |
|---|---|---|
| ダミーサイト配信 | 済 | run 45993372597 |
| 未認証アクセスの遮断 | **未達（不合格）** | run 45994360351、および 2026-11-27 に固定URLを外部から取得しダミー本文が返ることを確認 |
| Zero Trust 組織（チーム名・Free プラン） | 未確認 | Claude からは Cloudflare に到達できない |
| Access アプリ・ポリシー | 未作成 | — |
| Access 用トークン / 許可メール Secret | 未登録 | — |
| 設定・検証 Actions | 作成済み・**未実行** | 本資料「Actions 一覧」 |
| ゲーム配信ファイル選別 | ローカル静的解析済み（development 01ffc860） | 本資料「配信ファイル選別」 |
| ゲーム本体の配信 | **未実施（禁止中）** | Access 合格まで変数で無効化 |

## 無料プランの条件（公式・2026-11-27 確認）

- Zero Trust Free: 50ユーザーまで $0。超過・有料機能を使わない限り課金なし。
- オンボーディングで支払い方法の登録を求められる場合がある（Free でも）。登録の可否はユーザー判断。有料プランは選ばない。
- Pages の Access は「本番 `*.pages.dev`」と「プレビュー `*.<project>.pages.dev`」を**別アプリ**で保護する必要がある（Pages known issues）。

## ユーザー作業（ブラウザ・最小限）

1. **Zero Trust 有効化**: dash.cloudflare.com → Zero Trust → チーム名を決める → **Free** を選択。有料プランは選ばない。
2. **ワンタイムPIN確認**: Zero Trust → Settings → Authentication → Login methods に「One-time PIN」があること（無ければ Add new → One-time PIN）。
3. **Access 専用 API トークン作成**（既存の Pages トークンとは別。最小権限）:
   - My Profile → API Tokens → Create Custom Token
   - Account / **Access: Apps and Policies** / **Edit**
   - Account / **Access: Organizations, Identity Providers, and Groups** / **Read**（任意。OTP 有無の自動確認用）
   - Account Resources: 対象アカウントのみ。期限: 2026-12-27 程度
4. **GitHub Secrets 追加**（Settings → Secrets and variables → Actions）:
   - `CLOUDFLARE_ACCESS_TOKEN` … 手順3のトークン
   - `ACCESS_ALLOWED_EMAILS` … 許可するメール（複数はカンマ区切り、最大5件）。**公開リポジトリなのでファイルには書かない**。ログにも出さない実装。
5. Actions 実行後、**許可メールで** iPhone・PC から固定URLを開き、メールのコードでログイン → 「Interaction OK」、CSS/画像表示を確認。
6. **許可していないメール**を入力 → コードが届かず閲覧できないことを確認。

## Actions 一覧

| workflow | 起動 | 内容 |
|---|---|---|
| `cloudflare-access-setup.yml` | feature ブランチで `tools/cloudflare-preview/access-config.json` を変更して push（`revision` を +1） | 許可メールのみの再利用ポリシーを作成/更新し、固定URLとワイルドカードの2アプリに適用 → 監査 → 遮断ゲート |
| `cloudflare-access-gate.yml` | 上記・各 workflow から呼出／自身の変更 push | ①設定監査（allow＋メール規則のみ、bypass・everyone・ドメイン/IP規則なし、Secret外のメールなし、両ホスト網羅）②未認証で全ホスト×全パスを取得し、**自組織の `*.cloudflareaccess.com/cdn-cgi/access/` へのリダイレクトのみ合格**。偽 Cookie 付きも検査。存在しないランダムサブドメインも検査。TLSエラー・通常リダイレクト・404・5xx は不合格 |
| `cloudflare-probe-update-rollback.yml` | `tools/cloudflare-preview/update-check.json` を変更して push | `action: update` で刻印付きダミーを配信し固定URLの配信IDが切替ったことを API で確認、`action: rollback` で直前の本番配信へ戻す。前後でゲート実行 |
| `cloudflare-dev-preview-deploy.yml` | development への push（docs 等除く）。**リポジトリ変数 `KOTAMA_GAME_PREVIEW_ENABLED=true` の時だけ** | ゲート合格 → 配信ファイル選別 → アップロード → 再ゲート。失敗時は固定URLを直前配信へロールバック |

注意: `cloudflare-dev-preview-deploy.yml` は PR #856 が development にマージされて初めて有効になる。マージ前に `KOTAMA_GAME_PREVIEW_ENABLED` を設定しないこと。

## 検証の進め方（順番厳守）

1. ユーザー作業 1〜4 → `access-config.json` の `revision` を上げて push → setup run が監査・ゲートとも PASS。
2. ユーザー作業 5・6（ログイン可／拒否）を実施し結果を本資料に記録。
3. `update-check.json` を `update` → スマホで刻印表示を確認 → `rollback` → 刻印が消えることを確認。両 run のゲート PASS を記録。
4. 以上すべて合格後、PR #856 を development にマージ → `KOTAMA_GAME_PREVIEW_ENABLED=true` → 初回ゲーム配信 run とスマホ・PC 実プレイ確認。

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

- Zero Trust 組織作成、Access アプリ作成、遮断ゲート PASS、ログイン可否、更新・ロールバック後の認証維持、ゲーム配信と実プレイ — すべて未実施。
- このブランチへの push 権限が今回の Claude セッションに無かったため、変更は PR #856 への適用待ち（パッチ）として渡した。

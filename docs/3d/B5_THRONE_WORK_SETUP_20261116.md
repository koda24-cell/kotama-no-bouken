# 玉座: Work設定と通常チャットへの引き継ぎ

2026-11-16 JST。全候補 NOT_APPROVED。正式素材への保存・ゲーム統合なし。

## 今回の確認
指定5資料とPR #383/#395/#397/#398を読み、#398がdevelopmentへマージ済みと確認。
run 43794997803 の両ジョブsuccess、resume-passログの反復1→2とNOT_APPROVED、Artifact 14194068097の存在を確認。今回そのZIPのローカル取得は未完了（CLI未認証）。
今回のローカルBlender 4.3.2で現行モデルを3方向実レンダー。旧use_auto_smooth属性による失敗を修正後、追加造形版も3方向レンダー成功。
背面厚み、座面下の支持、曲線状の上部組石を追加。元メッシュは保持。元の直線アーチも残る。石材bumpはBlender表示のみ、GLBへ未ベイク。美観未承認。

## 接続設定（未設定・実AI通信未検証）
GitHub Settings → Secrets and variables → Actions:
- Secrets: VISION_API_URL（HTTPSの完全なchat/completions URL）、VISION_API_KEY。
- Variables: VISION_MODEL（画像入力対応モデルの正確なID）。
接続先・料金条件・キーが未提供のため、この3値は登録できていない。キーをチャットやGitへ書かない。
既存GitHub連携ツールにはActions Secrets/Variables設定機能がない。外部API課金は行っていない。GitHub Models APIは使用しない。

## Work以外で実行する
生成処理はGitHub ActionsまたはBlender CLIで動くため、Workを開き続ける必要はない。
ブランチ: feature/gpt-b5-throne-work-setup-20261116。
通常チャットには「このブランチと本書を読み、玉座自動反復を続けて。未承認のまま」と依頼する。

### GitHub Actions
このブランチのtools/b5-throne/**変更pushで実行（外部AIは必ずOFF）。
workflow_dispatchが利用できる場合は B5 Throne Bounded Auto QA Loop を選択し、対象ブランチ、max_iterations（1～8）、必要ならresume_run_idを指定。
画像AIは設定が済み、提供元の費用条件に同意した場合だけenable_vision=trueを選ぶ。
デフォルトブランチ未登録のため手動起動UI/APIが利用できない場合がある。mainへ勝手に導入しない。OFFのpush起動経路は利用可能。

### CLI（BlenderとPython/Pillowがある環境）
リポジトリルートで実行:
```sh
python3 tools/b5-throne/vision_review.py --check-config
python3 tools/b5-throne/auto_loop.py --iterations 4 --minutes 35
```
ENABLE_VISIONの既定値はfalse。環境変数でtrueと3設定を渡せる。設定チェックは通信なし。
Windowsはpython3をpythonへ、BlenderがPATHに無ければ --blender に実行ファイルのパスを指定。
新規生成は空のrender-output/b5-throne-autoで開始。再開は同じソースのcheckpoint一式を戻す。変更後ソースに旧checkpointを流用しない。

## 安全性・成果物
- falseまたは未設定で外部通信なし。trueで設定不足ならレンダー前にエラー。
- 非有限数/非数値は無効化、数値は固定上限でclamp。API異常は手動修正待ち。実AI出力の造形反映は未検証。
- Blender子プロセスへVISION_*秘密値を渡さない。
- 出力: progress.json/summary.json、各反復のGLB/3PNG/blend/log/geometry/manifest。
- ClaudeへはGLB/PNG/manifestのみ。未承認ではレビュー用途のみ。blendは内部再現用。
- 反復最大8、時間最大45分。強制終了時のArtifact保存や次ジョブ自動起動は保証しない。
- 実AI接続完了と呼べる条件: 設定登録、許可された実API評価、画像からの応答確認、次反復へのclamp済み反映、実3方向PNG/ログ/Artifactの照合。

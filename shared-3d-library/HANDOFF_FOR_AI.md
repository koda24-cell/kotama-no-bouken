# 3D共通制作環境 — GPT / Claude / 別チャット引き継ぎ

最終整理: 2026-11-14

## 目的
コタマ専用ではなく、他の作品からも使える3D素材・アドオン・テクスチャ・キャラクター制作・3Dアニメーションの共通ライブラリを整備する。制作前にこのファイルと README.md、および該当する各カタログを読む。

## 現在の保存先（重要）
- リポジトリ: https://github.com/koda24-cell/kotama-no-bouken
- 作業ブランチ: feature/shared-3d-library-20261114
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/347 （development向け、マージ状態はGitHubで確認）
- フォルダ: shared-3d-library/
- **独立したGitHubリポジトリは未作成**。現在はコタマ内の独立用途の作業フォルダ。将来、ディレクトリ構造を保って別リポジトリへ移す。

## カタログ
- addons/ADDON_CATALOG.md — HairMesh、Blender Geometry Nodes、Rokoko
- textures/TEXTURE_CATALOG.md — ambientCG、Poly Haven
- animation/ANIMATION_CATALOG.md — Quaternius、Mixamo、Rokoko、DeepMotion
- characters/CHARACTER_CATALOG.md — 頭部・髪・人体・衣装の制作要件
- workflows/USAGE.md — 入手、ライセンス、ハッシュ、Blender実動作、レンダ、正式採用

## 現状と未完了
- フォルダと**リンク・利用方針の文書**はGitHubにコミット済み。
- 外部アドオン本体、PBRテクスチャ、アニメーションアーカイブのこのフォルダへの取り込みは**未実施**。
- HairMeshの上流要求はBlender 5.1+。Blender 5.0.1でimport/register/unregisterのスモークテスト成功（run #43600753519）、ただし毛束生成機能の動作は未検証。GBH Toolは直接registerでKeyErrorが出たため通常のアドオン有効化経路で再検証が必要。
- 過去のQuaterniusアニメーションZIP分割・PR #328の状況は別途GitHub最新状態を確認すること。ここに本体があると仮定しない。
- コタマのアサシン髪の作業はPR #335、別ブランチ feature/vroid-cc0-shibu-base-20261114。V8の4方向実レンダ成功（run #43602563759）、V9は元の髪を非表示にした再生成をコミット済み。V9の実行状態・画像はその都度確認。いずれも未承認。

## 次の作業（優先順）
1. 独立した3D専用GitHubリポジトリの作成方法を確認し、作成できる環境でこのフォルダを移行。作成前に移行完了と報告しない。
2. HairMeshの毛束生成オペレーターとGBH Toolの通常登録をBlenderで実行検証。単なるimport/register成功と実造形を区別する。
3. Quaternius等の既存アニメーション本体をGitHub上で再確認し、SHA-256を検証して共通ライブラリへ移行。
4. CC0 PBRテクスチャを実体取得し、ライセンス・原本URL・ハッシュを保存。
5. キャラ用の髪・顔・衣装・人体生成補助を増やし、Blenderで3方向の実レンダリングとGLB再読込を確認。

## 運用ルール
- カタログ登録 ≠ 実ファイル保存 ≠ Blender検証済み。状態を混同しない。
- アドオン/素材ごとに版、ライセンス、配布条件、URL、SHA-256、導入テスト結果を残す。
- 第三者素材を無断で再配布しない。GitHub Actions Artifactsは一時保管。
- コタマの素材へ反映する際は AGENTS.md、docs/3d/BLENDER_DOCKER_HANDOFF.md、docs/3d/ASSET_PROMOTION_POLICY.md を確認し、ユーザー承認前に正式採用しない。
- GPT/Claudeは3D制作開始前にこの入口を参照し、変更・失敗原因・引き継ぎを追記する。

## 他チャットへの依頼例
「GitHub koda24-cell/kotama-no-bouken の feature/shared-3d-library-20261114 にある shared-3d-library/HANDOFF_FOR_AI.md と README.md を読み、PR #347の最新状態を確認して、3D共通ライブラリの素材実体取得・検証・独立リポジトリ移行を続けてください。」

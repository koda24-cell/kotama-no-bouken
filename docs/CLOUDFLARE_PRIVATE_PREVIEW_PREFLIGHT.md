# Cloudflare Pages + Access — private development preview preflight (2026-11-27)

Status: planning and repository tree audit only. No Cloudflare account, deployment, authentication or game runtime test has been verified. Do not publish real game data until access checks pass. No paid service, no change to main, no repository visibility change.

2026-11-27 更新: Zero Trust のカード必須により Access をやめ、Pages Functions のパスワード認証へ切替。検証 Actions と配信ファイル選別ツールを追加（未実行）。最新の状態とユーザー作業は `docs/CLOUDFLARE_ACCESS_SETUP.md` を参照。

## Source audit
Development tree 536bb2f0f1013db9a80493c2088ba14ed5ad3055: Git tree response not truncated; 3,217 tracked blobs, 1,290,433,939 bytes total; zero tracked blobs above 26,214,400 bytes (25 MiB); largest tracked blob 20,939,944 bytes, assets/3d/dungeons/b1_sacred_forest_candidates/scene/sacred_forest_scene.glb. assets/ contains 1,570 blobs, 968,526,069 bytes. These are Git blob metadata, not deployed output or expanded LFS objects. Exclude build/research files. Do not use entire repository root as deployment output. Audit actual output separately before deployment.

## Free plan / references
- https://developers.cloudflare.com/pages/platform/limits/ : 500 builds/month, 20,000 files/site, 25 MiB per file; static files free/unlimited per https://developers.cloudflare.com/pages/functions/pricing/.
- https://developers.cloudflare.com/pages/get-started/git-integration/ : private GitHub repository supported.
- https://developers.cloudflare.com/pages/configuration/preview-deployments/ : preview URL is public by default, built-in Access policy only protects previews.
- https://developers.cloudflare.com/pages/platform/known-issues/ : secure production pages.dev hostname AND wildcard preview host with two separate Access applications; do not assume one covers both.
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/ : email OTP can be configured; allow only expressly approved addresses.
- Zero Trust onboarding may require payment details even for Free: https://developers.cloudflare.com/learning-paths/cybersafe/account-creation/create-zero-trust-org/ . Do not activate paid plans or provide payment information without user action.

## Safe probe procedure
1. User signs in to Cloudflare and authorizes GitHub only for this repository (or uploads only dummy probe files). Choose free Pages/Zero Trust. No real data upload yet.
2. For Git integration, select the feature branch containing this document as production branch for a temporary probe project; framework None, no build command, output tools/cloudflare-preview/probe; disable automatic preview branches. Or use Direct Upload with the four dummy files only. Do not switch the existing repo's default branch.
3. Enable Access policy. Configure production hostname and wildcard preview hostname separately per known-issues documentation. Configure approved-email Allow, deny all others by default, no Bypass rule. No custom domain required; if added, secure it separately. Preview URLs and previous deployment URLs must also be protected.
4. Test signed-out/incognito GET of /, /index.html, /probe.js, /probe.css and /probe.svg on production and all preview/alias hosts. Expect authentication redirect or denial, never dummy asset body. Test unknown email cannot reach site. Test permitted email login on iPhone and desktop, button changes result to Interaction OK and CSS/SVG load. No credentials in logs.
5. Test a harmless content update and fixed URL refresh. Check Access policies still apply after deploy; verify rollback preserves authentication. No sensitive data until all tests pass.
6. Prepare real runtime-only output with explicit allowlist and dependency audit. Check absolute URLs to raw GitHub/raw.githack and external assets, missing files, LFS, size, MIME, Three.js imports, loading, battle, storage, all floors, admin tools only in authenticated preview. Keep original repo and existing workflows unchanged; auto update only from development after build checks. Review private Actions quota separately. No public release migration until private preview works.
7. Record actual deployment URL, deploy ID, source SHA, authorization/denial HTTP results, browser test evidence and free-plan status. No secrets. Never report pass from a configuration screenshot alone.

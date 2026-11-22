# Notion image bridge (experimental)

GitHub Actions fetches the first file from the Notion page's `写真` property using the Notion REST API. No PC required.

## Setup
1. Give a Notion integration read access to the target page/database.
2. Store its token as repository Actions secret `NOTION_TOKEN` (never commit the token).
3. Trigger the workflow on the feature branch, or push a change to this folder.
4. Check the run and the `notion-reference-verified` artifact. This artifact is temporary and is not approved for redistribution or game use.

The script checks HTTPS, max 20 MiB, JPEG/PNG/WebP signatures, and optional `SHA256` property. If a SHA256 exists and differs, it fails.

## Limitations
This proves Notion -> GitHub Actions -> image bytes only after a successful run. It does **not** pass images to ChatGPT's image generator. Signed Notion URLs are not committed. Do not publish private or third-party reference images as public repository files. A successful run and hash match are required before claiming retrieval works.

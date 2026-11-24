# Gallery export contract
Use tools/3d-progress/export_gallery_manifest.py after successful output QA and explicit publication clearance. Select PNGs by exact relative path; never export reference-only images or private materials. Use stable model ID and explicit version. Example:
```sh
python3 tools/3d-progress/export_gallery_manifest.py --id b2-waterwheel-beam --name '水車横梁' --floor '第2層' --version V03 --kind progress --source render-output/model --dest gallery-output/model --image 正面 front.png --publication-cleared
```
Upload gallery-output/model as a separate artifact named gallery-<model-id>-<stage>-<version>. Use kind design, progress or render. The exporter always emits NOT_APPROVED; game approval is separate. Do not add publication clearance automatically to legacy workflows. Existing artifacts and production assets remain unchanged. Gallery collector: https://github.com/koda24-cell/kotama-3d-progress/pull/5. This helper is not yet connected to every producer.

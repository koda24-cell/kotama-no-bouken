# B2 iron bolt head redesign V03–V04 real QA, 2026-11-19

**User feedback:** 「頭が四角いのが気になる。違うくない？」

## Archaeological and craft evidence
- A square bolt head is not intrinsically ahistorical: period waterwheel restorations use square headed bolts. Blacksmith evidence: https://kelloggblacksmithshop.blogspot.com/2012/02/blacksmith-made-bolts-bolt-header-tool.html
- But historic carriage bolts in timber can use a **low domed round head and concealed square neck** to prevent rotation. Sources: https://www.spab.org.uk/sites/default/files/Repair%20of%20Waterwheels%20v4%20FINAL.pdf and https://www.portlandbolt.com/products/bolts/carriage/ . Hammered round head reference (image for study only): https://oldwestiron.com/products/hcb-08-h-1-2-carriage-bolt-hammered
- Aesthetic decision: keep V02 square original as optional historic variant but make **V04 low handmade dome** the preferred candidate for this specific fantasy waterwheel.

## Actual builds
- V03 Actions [44513028042](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44513028042) complete success, artifact **14524830060**. ZIP downloaded, GLB/Blend/4 Cycles PNG/original 512px rust PNG SHA and byte sizes all 7 match. Facecount 1339. Outer square head replaced by 64-sided irregular shallow dome, concealed short square neck; old shaft and 8-turn thread retained. Render revealed overstrong radial fluting/pumpkin texture; V03 aesthetic not accepted.
- V04 Actions [44513699470](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44513699470) complete success, artifact **14525220086**. ZIP downloaded, all seven file SHA256+sizes verified, Blender true four views inspected. Rounded 96-segment flatter dome; 1500 Blender polygons, 1 material, one GLB mesh and embedded original iron oxidation texture. Real visual inspection confirms removal of conspicuous square silhouette and reduced radial ridges.
- Existing V02 shape not overwritten, V03 preserved as comparative version, no game or current timber bearing geometry modified.
- Current preferred V04 appearance: historically plausible hammered shallow domed cap, but close-up forging dents and corrosion variation can still be improved. **NOT_APPROVED** pending user review.
- Nominal 0.07m bolt shaft, 8 thread turns and lower wooden bearing fastening design assumptions unchanged; no actual hole or assembly clearance checked.
- GitHub Actions Artifacts expire Dec 3, 2026. Formal asset folder promotion and development/main merge not performed.

## Evidence and links
- Source: `tools/b2-waterwheel-bolt/build_round_forged_bolt_v04.py`
- Workflow: `.github/workflows/b2-single-dome-bolt-v04.yml`
- Pinterest reference / GPT Claude handoff https://github.com/koda24-cell/pinterest-reference-library/pull/30, updated with technical sources and user's design change.

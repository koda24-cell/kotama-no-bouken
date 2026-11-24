# Blueprint-first design engine V1
Status: experimental, NOT_APPROVED. No game assets changed.
## Contract
Use millimetres, right-handed XYZ (Z up), stable part IDs, explicit revision and source provenance. Freeze design JSON and dimensioned SVG/PNG before production modeling. Store each revision separately; never overwrite. Manifest hashes bind images to source JSON. Artifacts are temporary; retain reviewed design images in a dedicated Git folder, separate from game assets.
## Implementation stages
1. Parameter dependency graph, positive finite dimensions, stable IDs and explicit constraints.
2. Orthographic front (XZ), side (YZ), top (XY) at common scale, dimension labels; section and exploded views for applicable assets.
3. Reference mesh measurements, section sampling, curves/loft/sweep, joints, interference, thickness, curvature and bidirectional surface distance.
4. Blender 5.3 conversion and real render comparison; checkpoint integration with PR #756 and #724 after verified compatibility. Gallery integration with PR #755 after its interface is verified.
## Research catalog
FreeCAD Sketcher/TechDraw https://wiki.freecad.org/Sketcher_Workbench ; CadQuery https://cadquery.readthedocs.io/ ; build123d https://build123d.readthedocs.io/ ; OCCT https://dev.opencascade.org/ ; Sverchok https://nortikin.github.io/sverchok/docs/nodes.html ; Trimesh https://trimesh.org/ ; Open3D https://www.open3d.org/docs/ ; CGAL https://doc.cgal.org/ ; SciPy https://docs.scipy.org/ ; SymPy https://docs.sympy.org/ ; OpenCV https://docs.opencv.org/ ; ezdxf https://ezdxf.readthedocs.io/ ; Blender Geometry Nodes https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/ .
All external dependencies are candidates, not installed or verified by this task. Check individual licenses and pin versions before adoption. No paid API.
## Acceptance
Missing or mismatched blueprint files block the new pipeline. Technical pass is not artistic approval. Keep original assets; no automatic promotion. Use synthetic fixtures before existing models. Record exact commit, run, logs and hashes. Do not claim untested features are available.

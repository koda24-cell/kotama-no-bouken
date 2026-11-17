#!/usr/bin/env python3
"""Read-only actual-GLB upward roof rays; this is not artistic approval.

Uses the clearance parser's complete ancestor transforms. Placement inverse
Y rotation/nonuniform scale maps each vertical ray into the actual source
geometry; projected triangle barycentrics recover its world-space hit height.
Only ceilingPlacements are tested: no wall/root/tree rescue of missing roofs.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

from verify_clearance import Geometry, ROOT, KIT, bounds, point, placement_matrix

LAYOUT = ROOT/KIT/'scene/game-layout-v3.json'
OUTPUT = ROOT/'docs/reviews/f1-closed-ruins-v3/roof-ray-coverage.json'
OFFSETS = [-.8, 0., .8]
EYE = 1.6


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def projected_triangles(geometry):
    result = []
    for index, (a, b, c) in enumerate(geometry.triangles):
        ux, uz, vx, vz = b[0]-a[0], b[2]-a[2], c[0]-a[0], c[2]-a[2]
        determinant = ux*vz-uz*vx
        if abs(determinant) < 1e-12:
            continue  # A vertical triangle has zero area for an upward ray.
        result.append((index, a, b, c, ux, uz, vx, vz, 1/determinant,
                       min(a[0], b[0], c[0]), max(a[0], b[0], c[0]),
                       min(a[2], b[2], c[2]), max(a[2], b[2], c[2])))
    return result


def cast(x, z, roofs, projections):
    nearest = None
    for row, box in roofs:
        if not (box[0][0]-1e-8 <= x <= box[1][0]+1e-8 and box[0][2]-1e-8 <= z <= box[1][2]+1e-8):
            continue
        px, py, pz = row['position']
        scale = row.get('scale', [1, 1, 1])
        if isinstance(scale, (float, int)):
            scale = [scale]*3
        sx, sy, sz = scale
        assert sx and sy and sz, 'Zero placement scale'
        angle = row.get('rotationY', 0.)
        cosine, sine = math.cos(angle), math.sin(angle)
        dx, dz = x-px, z-pz
        lx, lz = (cosine*dx-sine*dz)/sx, (sine*dx+cosine*dz)/sz
        for index, a, b, c, ux, uz, vx, vz, inv_det, xmin, xmax, zmin, zmax in projections[row['file']]:
            if lx < xmin-1e-8 or lx > xmax+1e-8 or lz < zmin-1e-8 or lz > zmax+1e-8:
                continue
            qx, qz = lx-a[0], lz-a[2]
            beta = (qx*vz-qz*vx)*inv_det
            gamma = (ux*qz-uz*qx)*inv_det
            alpha = 1-beta-gamma
            if min(alpha, beta, gamma) < -1e-8 or max(alpha, beta, gamma) > 1+1e-8:
                continue
            y = py+sy*(alpha*a[1]+beta*b[1]+gamma*c[1])
            if y <= EYE+1e-8 or (nearest and y >= nearest['worldY']):
                continue
            nearest = {'placement': row['id'], 'triangle': index, 'worldY': y}
    return nearest


def main():
    layout_raw = LAYOUT.read_bytes()
    layout = json.loads(layout_raw)
    pins = {}
    def pin(file, digest):
        assert len(digest) == 64, 'Missing source SHA: '+file
        assert file not in pins or pins[file] == digest, 'Source pins disagree: '+file
        pins[file] = digest
    manifest_path = ROOT/KIT/'manifest.json'
    for asset in json.loads(manifest_path.read_bytes())['assets']:
        pin(KIT+asset['file'], asset['sha256'])
    for row in layout.get('revisionSources', []):
        pin(row['file'], row['sha256'])
    for profile in layout.get('floorRenderProfiles', {}).values():
        pin(profile['sourceFile'], profile['sourceSha256'])
    for name in ['floorPlacements', 'ceilingPlacements', 'boundaryWallPlacements', 'dressingGroundPlacements', 'candidatePropPlacements']:
        for row in layout.get(name, []):
            if row.get('sourceSha256'):
                pin(row['file'], row['sourceSha256'])
            assert row['file'] in pins, 'Unpinned source: '+row['file']
    guarded_files = [LAYOUT, manifest_path, Path(__file__).resolve(),
                     Path(__file__).with_name('verify_clearance.py').resolve(),
                     ROOT/'data/field-maps.js', ROOT/'field/field-3d-view.js',
                     ROOT/'field/field-3d-b1-sacred-trial.js']
    before = {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in guarded_files}
    raw_sources = {}
    hashes = []
    for file, digest in sorted(pins.items()):
        path = (ROOT/file).resolve()
        assert path.is_relative_to(ROOT.resolve()), 'Source outside checkout'
        raw = path.read_bytes()
        actual = sha(raw)
        assert actual == digest, 'Source SHA mismatch: '+file
        raw_sources[file] = raw
        hashes.append({'file': file, 'sha256': actual, 'matchesPin': True})
        before[file] = actual
    assert sha(layout_raw) == before[str(LAYOUT.relative_to(ROOT))], 'Layout changed before guarded snapshot'
    sources = {row['file'] for row in layout['ceilingPlacements']}
    geometry = {file: Geometry(raw_sources[file], file) for file in sorted(sources)}
    projections = {file: projected_triangles(g) for file, g in geometry.items()}
    roofs = []
    for row in layout['ceilingPlacements']:
        lo, hi = geometry[row['file']].bounds
        matrix = placement_matrix(row)
        box = bounds([point(matrix, (x, y, z)) for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
        roofs.append((row, box))
    floor_samples, misses, hits = [], [], 0
    elevations = []
    for floor in layout['floorPlacements']:
        tx, tz = floor['tile']
        samples = []
        for dz in OFFSETS:
            for dx in OFFSETS:
                x, z = tx*4+dx, tz*4+dz
                hit = cast(x, z, roofs, projections)
                samples.append({'offsetXZ': [dx, dz], 'hit': hit})
                if hit:
                    hits += 1
                    elevations.append(hit['worldY'])
                else:
                    misses.append({'tile': [tx, tz], 'worldXYZ': [x, EYE, z]})
        floor_samples.append({'tile': [tx, tz], 'hits': sum(s['hit'] is not None for s in samples), 'rays': samples})
    opening_samples = []
    for tile in layout['closedRuinsV3']['roof']['openings']:
        tx, tz = tile
        central_hit = cast(tx*4, tz*4, roofs, projections)
        grid = []
        for dz in OFFSETS:
            for dx in OFFSETS:
                grid.append({'offsetXZ': [dx, dz], 'hit': cast(tx*4+dx, tz*4+dz, roofs, projections)})
        opening_samples.append({'tile': tile, 'centerXYZ': [tx*4, EYE, tz*4],
                                'centerHit': central_hit, 'centerTrulyOpen': central_hit is None,
                                'ninePointRoofHits': sum(s['hit'] is not None for s in grid), 'rays': grid})
    changed = [file for file, digest in before.items() if sha((ROOT/file).read_bytes()) != digest]
    total = len(floor_samples)*9
    fraction = hits/total if total else 0.
    report = {'scope': 'Actual ceiling geometry coverage only; not artistic approval, renderer alpha visibility or full-sky view certification.',
              'method': 'Vertical Y-positive rays from 1.6m. Exact projected-triangle barycentric test, complete glTF ancestor transforms, inverse placement Y rotation and nonuniform scale. Double-sided geometry; walls/trees/other props excluded.',
              'layout': str(LAYOUT.relative_to(ROOT)), 'layoutSha256': sha(layout_raw),
              'guardedInputs': before, 'inputsChangedDuringRun': changed, 'sourceHashes': hashes,
              'decodedRoofSources': sorted(sources), 'roofPlacements': len(roofs),
              'sampleGridOffsetsMeters': OFFSETS, 'eyeMeters': EYE,
              'summary': {'walkFloorCells': len(floor_samples), 'rays': total, 'roofHits': hits,
                          'roofMisses': len(misses), 'coverage': fraction,
                          'declaredOpenings': len(opening_samples),
                          'trulyOpenCenters': sum(s['centerTrulyOpen'] for s in opening_samples),
                          'nearestRoofWorldYRange': [min(elevations), max(elevations)] if elevations else None,
                          'guardedGLBCount': len(hashes)},
              'misses': misses, 'declaredOpeningRays': opening_samples, 'walkFloorRays': floor_samples,
              'acceptance': {'minimumWalkFloorCoverage': .9, 'allThreeDeclaredCentersMustBeOpen': True,
                             'allSourcePinsAndInputStabilityRequired': True},
              'limitations': ['3x3 samples are within 0.8m of floor centers, not a proof of every seam or all camera views.',
                             'Triangle geometry ignores alpha masks/backface culling. Shader/material/runtime visual review remains separate.',
                             'Opening-center rays may be sky-open even though surrounding roots/buildings visually fill other views.'],
              'passed': not changed and fraction >= .9 and len(opening_samples) == 3 and all(s['centerTrulyOpen'] for s in opening_samples)}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'passed': report['passed'], **report['summary'], 'output': str(OUTPUT)}, ensure_ascii=False))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())

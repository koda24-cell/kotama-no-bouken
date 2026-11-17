#!/usr/bin/env python3
"""Read actual embedded GLBs and conservatively test V3 body-height routes.

No Blender, renderer, physics, map edits or asset writes. Hash pins must agree
before geometry is read. glTF parent transforms, indexed/interleaved/sparse
accessors and placement nonuniform scales are retained. This is a 1.8m-wide,
Y=.12..2.1m body-band review, not the older 2x3m clearance certification.
"""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[2]
KIT = 'assets/3d/dungeons/b1_sacred_forest_candidates/'
IDENTITY = [1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.]
SOFT = {
    'v3_moss_veil': 'thin_moss_ground_accent',
    'v3_shade_understory': 'soft_understory',
    'hanging_forest_vines': 'soft_attached_vines',
    'forest_fern_cluster': 'soft_fern',
    'forest_shrub_cluster': 'soft_shrub',
    'white_wildflower_patch': 'soft_flowers',
    'ofuda_seal_cluster': 'thin_paper_dressing',
}
EPS = 1e-5


def multiply(a, b):
    return [sum(a[k*4+r]*b[c*4+k] for k in range(4))
            for c in range(4) for r in range(4)]


def point(matrix, p):
    return tuple(matrix[r]*p[0]+matrix[4+r]*p[1]+matrix[8+r]*p[2]+matrix[12+r]
                 for r in range(3))


def trs(node):
    if 'matrix' in node:
        assert len(node['matrix']) == 16, 'Bad glTF matrix'
        return node['matrix']
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    sx, sy, sz = node.get('scale', [1, 1, 1])
    tx, ty, tz = node.get('translation', [0, 0, 0])
    return [(1-2*(y*y+z*z))*sx, 2*(x*y+z*w)*sx, 2*(x*z-y*w)*sx, 0,
            2*(x*y-z*w)*sy, (1-2*(x*x+z*z))*sy, 2*(y*z+x*w)*sy, 0,
            2*(x*z+y*w)*sz, 2*(y*z-x*w)*sz, (1-2*(x*x+y*y))*sz, 0,
            tx, ty, tz, 1]


def placement_matrix(row):
    theta = row.get('rotationY', 0.)
    scale = row.get('scale', [1, 1, 1])
    if isinstance(scale, (int, float)):
        scale = [scale]*3
    return trs({'translation': row.get('position', [0, 0, 0]),
                'rotation': [0, math.sin(theta/2), 0, math.cos(theta/2)], 'scale': scale})


def bounds(points):
    return [tuple(min(p[i] for p in points) for i in range(3)),
            tuple(max(p[i] for p in points) for i in range(3))]


def overlap(a, b):
    return all(a[1][i] > b[0][i]+EPS and a[0][i] < b[1][i]-EPS for i in range(3))


class Geometry:
    COMPONENTS = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
                  5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
    WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

    def __init__(self, data, label):
        self.label = label
        assert len(data) >= 20, 'Truncated GLB: '+label
        magic, version, length = struct.unpack_from('<III', data)
        assert magic == 0x46546c67 and version == 2 and length == len(data), 'Invalid GLB2: '+label
        chunks = {}
        at = 12
        while at < length:
            size, kind = struct.unpack_from('<II', data, at)
            at += 8
            assert at+size <= length, 'Truncated GLB chunk: '+label
            assert kind not in chunks, 'Duplicate GLB chunk: '+label
            chunks[kind] = data[at:at+size]
            at += size
        self.doc = json.loads(chunks[0x4e4f534a])
        self.binary = chunks.get(0x004e4942, b'')
        assert len(self.doc.get('buffers', [])) == 1 and 'uri' not in self.doc['buffers'][0], 'Embedded single-buffer GLB required: '+label
        assert len(self.binary) >= self.doc['buffers'][0]['byteLength'], 'Short BIN: '+label
        self.cache = {}
        self.triangles = []
        nodes = self.doc.get('nodes', [])
        scenes = self.doc.get('scenes', [])
        if scenes:
            roots = scenes[self.doc.get('scene', 0)].get('nodes', [])
        else:
            children = {n for node in nodes for n in node.get('children', [])}
            roots = [i for i in range(len(nodes)) if i not in children]
        for index in roots:
            self.visit(index, IDENTITY, set())
        assert self.triangles, 'No triangle geometry: '+label
        self.bounds = bounds([p for triangle in self.triangles for p in triangle])

    def view_values(self, index, byte_offset, count, component_type, width, stride=None):
        view = self.doc['bufferViews'][index]
        assert view.get('buffer', 0) == 0 and not view.get('extensions'), 'Unsupported compressed/external buffer view'
        fmt, size = self.COMPONENTS[component_type]
        stride = stride or view.get('byteStride', size*width)
        assert stride >= size*width, 'Accessor stride too short'
        start = view.get('byteOffset', 0)+byte_offset
        limit = view.get('byteOffset', 0)+view['byteLength']
        assert count == 0 or start+(count-1)*stride+size*width <= limit, 'Accessor exceeds buffer view'
        unpack = struct.Struct('<'+fmt*width)
        return [unpack.unpack_from(self.binary, start+i*stride) for i in range(count)]

    def accessor(self, index):
        if index in self.cache:
            return self.cache[index]
        a = self.doc['accessors'][index]
        width = self.WIDTHS[a['type']]
        count, component = a['count'], a['componentType']
        if 'bufferView' in a:
            out = self.view_values(a['bufferView'], a.get('byteOffset', 0), count, component, width)
        else:
            out = [tuple([0]*width) for _ in range(count)]
        if a.get('sparse'):
            sparse = a['sparse']
            ix = sparse['indices']
            values = sparse['values']
            indices = self.view_values(ix['bufferView'], ix.get('byteOffset', 0), sparse['count'], ix['componentType'], 1)
            replacement = self.view_values(values['bufferView'], values.get('byteOffset', 0), sparse['count'], component, width)
            for sparse_index, value in zip(indices, replacement):
                assert 0 <= sparse_index[0] < count, 'Sparse index out of range'
                out[sparse_index[0]] = value
        if a.get('normalized') and component != 5126:
            signed = component in (5120, 5122)
            maximum = {5120: 127., 5121: 255., 5122: 32767., 5123: 65535., 5125: 4294967295.}[component]
            out = [tuple(max(-1., v/maximum) if signed else v/maximum for v in row) for row in out]
        assert all(math.isfinite(v) for row in out for v in row), 'Non-finite accessor'
        self.cache[index] = out
        return out

    def visit(self, index, parent, ancestors):
        assert index not in ancestors, 'glTF hierarchy cycle'
        node = self.doc['nodes'][index]
        matrix = multiply(parent, trs(node))
        if 'mesh' in node:
            assert 'skin' not in node, 'Skinned geometry requires posed collision export'
            for primitive in self.doc['meshes'][node['mesh']]['primitives']:
                assert not primitive.get('targets'), 'Morph geometry requires baked collision export'
                assert 'KHR_draco_mesh_compression' not in primitive.get('extensions', {}), 'Compressed mesh unsupported'
                positions = self.accessor(primitive['attributes']['POSITION'])
                assert all(len(p) == 3 for p in positions), 'POSITION must be VEC3'
                vertices = [point(matrix, p) for p in positions]
                indices = ([int(v[0]) for v in self.accessor(primitive['indices'])]
                           if 'indices' in primitive else list(range(len(vertices))))
                assert all(0 <= i < len(vertices) for i in indices), 'Primitive index out of range'
                mode = primitive.get('mode', 4)
                if mode == 4:
                    assert len(indices) % 3 == 0, 'Triangle index count invalid'
                    triples = [indices[i:i+3] for i in range(0, len(indices), 3)]
                elif mode == 5:
                    triples = [[indices[i], indices[i+1], indices[i+2]] for i in range(len(indices)-2)]
                elif mode == 6:
                    triples = [[indices[0], indices[i], indices[i+1]] for i in range(1, len(indices)-1)]
                else:
                    raise AssertionError('Non-triangle primitive in hard asset: '+self.label)
                self.triangles.extend(tuple(vertices[i] for i in tri) for tri in triples)
        for child in node.get('children', []):
            self.visit(child, matrix, ancestors | {index})


def route_sweeps(layout, half_width=.9):
    grid = layout['beforeFingerprint']['saveCriticalData']['map']
    width, height = len(grid[0]), len(grid)
    assert all(len(row) == width for row in grid), 'Nonrectangular map'
    solid = {tuple(t) for t in layout['navigation']['navigationSolidTiles']}
    assert all((x, z) in solid for z, row in enumerate(grid) for x, c in enumerate(row) if c in '#~'), 'Solid #/water metadata mismatch'
    rectangles = []
    for axis in ('row', 'column'):
        outer, inner = (height, width) if axis == 'row' else (width, height)
        for a in range(outer):
            start = None
            for b in range(inner+1):
                tile = (b, a) if axis == 'row' else (a, b)
                walk = b < inner and tile not in solid
                if walk and start is None:
                    start = b
                elif not walk and start is not None:
                    end = b-1
                    st, en = ((start, a), (end, a)) if axis == 'row' else ((a, start), (a, end))
                    lo = [st[0]*4-half_width, .12, st[1]*4-half_width]
                    hi = [en[0]*4+half_width, 2.1, en[1]*4+half_width]
                    rectangles.append({'axis': axis, 'startTile': st, 'endTile': en, 'bounds': [lo, hi]})
                    start = None
    assert rectangles, 'No walkable sweep'
    return rectangles


def verify(layout_path, out):
    data = layout_path.read_bytes()
    layout = json.loads(data)
    report = {'scope': 'V3 actual static GLB body-band conservative clearance',
              'layout': str(layout_path.relative_to(ROOT)), 'layoutSha256': hashlib.sha256(data).hexdigest(),
              'routeWidthMeters': 1.8, 'heightBandMeters': [.12, 2.1],
              'method': 'Every hard triangle AABB versus all row/column cardinal route sweeps, after complete glTF hierarchy and placement transforms.',
              'limitations': ['Conservative AABB conflicts can be false positives; review actual triangles before moving anything.',
                             'Soft foliage/paper and thin moss are excluded explicitly; this is not all-geometry 2x3m clearance.',
                             'Below-band shore triangles are ignored; above-band hard shoreline is checked.',
                             'Map/live-game identity, UV/normals and interactions are verified by separate runtime QA.'],
              'hashes': [], 'hashErrors': [], 'hardPlacements': [], 'exclusions': [], 'conflicts': [], 'passed': False}
    pin_catalog = {}
    def pin(file, digest):
        assert digest and len(digest) == 64, 'Missing source hash: '+file
        if file in pin_catalog:
            assert pin_catalog[file] == digest, 'Conflicting descriptor source pins: '+file
        pin_catalog[file] = digest
    manifest = json.loads((ROOT/KIT/'manifest.json').read_text())
    for asset in manifest['assets']:
        pin(KIT+asset['file'], asset['sha256'])
    for row in layout.get('revisionSources', []):
        pin(row['file'], row['sha256'])
    for profile in layout.get('floorRenderProfiles', {}).values():
        pin(profile['sourceFile'], profile['sourceSha256'])
    groups = ['floorPlacements', 'dressingGroundPlacements', 'boundaryWallPlacements',
              'ceilingPlacements', 'candidatePropPlacements']
    for group in groups:
        for row in layout.get(group, []):
            if row.get('sourceSha256'):
                pin(row['file'], row['sourceSha256'])
            assert row['file'] in pin_catalog, 'Unpinned placement source: '+row['file']
    source_bytes = {}
    for file, expected in sorted(pin_catalog.items()):
        path = (ROOT/file).resolve()
        assert path.is_relative_to(ROOT.resolve()), 'Source path outside checkout'
        if not path.exists():
            report['hashErrors'].append({'file': file, 'error': 'missing_source'})
            continue
        raw = path.read_bytes()
        actual = hashlib.sha256(raw).hexdigest()
        report['hashes'].append({'file': file, 'expected': expected, 'actual': actual, 'matches': actual == expected})
        if actual != expected:
            report['hashErrors'].append({'file': file, 'error': 'sha256_mismatch'})
        else:
            source_bytes[file] = raw
    sweeps = route_sweeps(layout)
    report['routeSweeps'] = sweeps
    if not report['hashErrors']:
        geometry_cache = {}
        for group in ['boundaryWallPlacements', 'ceilingPlacements', 'candidatePropPlacements']:
            for row in layout.get(group, []):
                excluded = SOFT.get(row.get('assetId'))
                if excluded:
                    report['exclusions'].append({'id': row['id'], 'assetId': row.get('assetId'), 'reason': excluded})
                    continue
                file = row['file']
                if file not in geometry_cache:
                    geometry_cache[file] = Geometry(source_bytes[file], file)
                geometry = geometry_cache[file]
                matrix = placement_matrix(row)
                lo, hi = geometry.bounds
                corners = [point(matrix, (x, y, z)) for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])]
                placement_bounds = bounds(corners)
                nearby = [(i, sweep) for i, sweep in enumerate(sweeps) if overlap(placement_bounds, sweep['bounds'])]
                bad_count, tested, examples, crossed = 0, 0, [], set()
                if nearby:
                    for index, triangle in enumerate(geometry.triangles):
                        world = tuple(point(matrix, p) for p in triangle)
                        box = bounds(world)
                        if box[1][1] <= .12+EPS or box[0][1] >= 2.1-EPS:
                            continue
                        tested += 1
                        hits = [i for i, sweep in nearby if overlap(box, sweep['bounds'])]
                        if hits:
                            bad_count += 1
                            crossed.update(hits)
                            if len(examples) < 5:
                                examples.append({'triangle': index, 'bounds': box, 'worldVertices': world, 'sweepIndices': hits})
                record = {'id': row['id'], 'assetId': row.get('assetId'), 'group': group,
                          'file': file, 'position': row.get('position'), 'rotationY': row.get('rotationY', 0),
                          'scale': row.get('scale', [1, 1, 1]), 'sourceTriangles': len(geometry.triangles),
                          'bodyBandTrianglesTested': tested, 'conflictingTriangles': bad_count,
                          'bounds': placement_bounds}
                report['hardPlacements'].append(record)
                if bad_count:
                    report['conflicts'].append({**record, 'sweepIndices': sorted(crossed), 'examples': examples,
                                                'recommendedAction': 'Review conservative witnesses; move/remove this placement within existing blocked/corner space. Never change map to conceal the conflict.'})
        report['geometrySourcesDecoded'] = len(geometry_cache)
    # Fail rather than certifying a stale snapshot if another task regenerated
    # the descriptor or any source during this read-only check.
    if layout_path.read_bytes() != data:
        report['hashErrors'].append({'file': str(layout_path.relative_to(ROOT)), 'error': 'layout_changed_during_check'})
    for file, raw in source_bytes.items():
        if hashlib.sha256((ROOT/file).read_bytes()).hexdigest() != hashlib.sha256(raw).hexdigest():
            report['hashErrors'].append({'file': file, 'error': 'source_changed_during_check'})
    report['summary'] = {'sourceHashes': len(report['hashes']), 'hashErrors': len(report['hashErrors']),
                         'routeSweeps': len(sweeps), 'hardPlacements': len(report['hardPlacements']),
                         'softExclusions': len(report['exclusions']), 'conflictingPlacements': len(report['conflicts']),
                         'conflictingTriangles': sum(c['conflictingTriangles'] for c in report['conflicts']),
                         'excludedByReason': dict(Counter(e['reason'] for e in report['exclusions']))}
    report['passed'] = not report['hashErrors'] and not report['conflicts']
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'passed': report['passed'], **report['summary'], 'output': str(out)}, ensure_ascii=False))
    return report['passed']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--layout', type=Path, default=ROOT/KIT/'scene/game-layout-v3.json')
    parser.add_argument('--output', type=Path, default=ROOT/'docs/reviews/f1-closed-ruins-v3/clearance.json')
    args = parser.parse_args()
    return 0 if verify(args.layout.resolve(), args.output.resolve()) else 1


if __name__ == '__main__':
    sys.exit(main())

"""Generate UV-island review images from embedded GLB geometry.

Supports GLB 2.0, embedded BIN buffer 0, float32 VEC2 TEXCOORD_0,
and triangle primitives. Unsupported accessor layouts fail explicitly.
"""
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

from PIL import Image, ImageDraw

COMPONENTS = {5121: ("B", 1), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}


def read_glb(path):
    raw = Path(path).read_bytes()
    if len(raw) < 20:
        raise ValueError("GLB is too short")
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total != len(raw):
        raise ValueError("Invalid GLB 2.0 header")
    chunks = {}
    pos = 12
    while pos < len(raw):
        if pos + 8 > len(raw):
            raise ValueError("Truncated GLB chunk header")
        length, kind = struct.unpack_from("<I4s", raw, pos)
        pos += 8
        end = pos + length
        if end > len(raw):
            raise ValueError("Truncated GLB chunk")
        if kind in chunks:
            raise ValueError("Duplicate GLB chunk")
        chunks[kind] = raw[pos:end]
        pos = end
    if b"JSON" not in chunks:
        raise ValueError("Missing GLB JSON chunk")
    doc = json.loads(chunks[b"JSON"].rstrip(b" \t\r\n\0"))
    if doc.get("asset", {}).get("version") != "2.0":
        raise ValueError("Expected glTF asset version 2.0")
    return raw, doc, chunks.get(b"BIN\0", b"")


def read_uv_accessor(doc, binary, accessor_index):
    accessors = doc.get("accessors", [])
    views = doc.get("bufferViews", [])
    if type(accessor_index) is not int or not 0 <= accessor_index < len(accessors):
        raise ValueError("Invalid UV accessor index")
    accessor = accessors[accessor_index]
    if accessor.get("type") != "VEC2" or accessor.get("componentType") != 5126:
        raise ValueError("TEXCOORD accessor must be float32 VEC2")
    if accessor.get("normalized") or "sparse" in accessor:
        raise ValueError("Normalized or sparse UV accessors are unsupported")
    view_index = accessor.get("bufferView")
    if type(view_index) is not int or not 0 <= view_index < len(views):
        raise ValueError("UV accessor has no valid bufferView")
    view = views[view_index]
    if view.get("buffer", 0) != 0:
        raise ValueError("Only embedded GLB buffer 0 is supported")
    count = accessor.get("count")
    if type(count) is not int or count < 1:
        raise ValueError("Invalid UV accessor count")
    stride = view.get("byteStride", 8)
    if type(stride) is not int or stride < 8 or stride % 4:
        raise ValueError("Invalid UV byteStride")
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    end = start + (count - 1) * stride + 8
    if start < 0 or end > len(binary):
        raise ValueError("UV accessor exceeds binary buffer")
    values = []
    for i in range(count):
        u, v = struct.unpack_from("<2f", binary, start + i * stride)
        if not math.isfinite(u) or not math.isfinite(v):
            raise ValueError("Non-finite UV coordinate")
        values.append((u, v))
    return values


def read_indices(doc, binary, accessor_index):
    accessors = doc.get("accessors", [])
    views = doc.get("bufferViews", [])
    if type(accessor_index) is not int or not 0 <= accessor_index < len(accessors):
        raise ValueError("Invalid index accessor")
    accessor = accessors[accessor_index]
    component = accessor.get("componentType")
    if accessor.get("type") != "SCALAR" or component not in (5121, 5123, 5125):
        raise ValueError("Indices must be unsigned byte/short/int SCALAR")
    if "sparse" in accessor:
        raise ValueError("Sparse index accessors are unsupported")
    view_index = accessor.get("bufferView")
    if type(view_index) is not int or not 0 <= view_index < len(views):
        raise ValueError("Index accessor has no valid bufferView")
    view = views[view_index]
    if view.get("buffer", 0) != 0:
        raise ValueError("Only embedded GLB buffer 0 is supported")
    fmt, width = COMPONENTS[component]
    count = accessor.get("count")
    stride = view.get("byteStride", width)
    if type(count) is not int or count < 1 or type(stride) is not int or stride < width:
        raise ValueError("Invalid index accessor layout")
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    end = start + (count - 1) * stride + width
    if start < 0 or end > len(binary):
        raise ValueError("Index accessor exceeds binary buffer")
    return [struct.unpack_from("<" + fmt, binary, start + i * stride)[0] for i in range(count)]



def polygon_area(poly):
    if len(poly) < 3:
        return 0.0
    return abs(sum(poly[i][0] * poly[(i + 1) % len(poly)][1] -
                   poly[(i + 1) % len(poly)][0] * poly[i][1]
                   for i in range(len(poly))) / 2.0)


def triangle_intersection_area(subject, clip):
    """Return the intersection area of two convex UV triangles."""
    polygon = list(subject)
    signed = sum(clip[i][0] * clip[(i + 1) % 3][1] -
                 clip[(i + 1) % 3][0] * clip[i][1] for i in range(3))
    orientation = 1.0 if signed >= 0 else -1.0
    eps = 1e-10
    for edge in range(3):
        a, b = clip[edge], clip[(edge + 1) % 3]
        def side(p):
            return orientation * ((b[0] - a[0]) * (p[1] - a[1]) -
                                  (b[1] - a[1]) * (p[0] - a[0]))
        result = []
        if not polygon:
            return 0.0
        previous = polygon[-1]
        previous_inside = side(previous) >= -eps
        for current in polygon:
            current_inside = side(current) >= -eps
            if current_inside != previous_inside:
                dx1, dy1 = current[0] - previous[0], current[1] - previous[1]
                dx2, dy2 = b[0] - a[0], b[1] - a[1]
                denom = dx1 * dy2 - dy1 * dx2
                if abs(denom) > eps:
                    t = ((a[0] - previous[0]) * dy2 -
                         (a[1] - previous[1]) * dx2) / denom
                    result.append((previous[0] + t * dx1,
                                   previous[1] + t * dy1))
            if current_inside:
                result.append(current)
            previous, previous_inside = current, current_inside
        polygon = result
    return polygon_area(polygon)


def analyze_uv_overlaps(uv, indices):
    """Detect positive-area overlaps between UV triangles; edge contact is ignored."""
    triangles = []
    for i in range(0, len(indices), 3):
        tri = [uv[indices[i]], uv[indices[i + 1]], uv[indices[i + 2]]]
        area = polygon_area(tri)
        if area <= 1e-12:
            continue
        xs, ys = [p[0] for p in tri], [p[1] for p in tri]
        triangles.append((i // 3, tri, (min(xs), min(ys), max(xs), max(ys))))
    ordered = sorted(triangles, key=lambda item: item[2][0])
    active = []
    pairs = []
    total_area = 0.0
    per_triangle = set()
    for current in ordered:
        tri_id, tri, bounds = current
        active = [item for item in active if item[2][2] > bounds[0] + 1e-10]
        for other_id, other, ob in active:
            if ob[3] <= bounds[1] + 1e-10 or bounds[3] <= ob[1] + 1e-10:
                continue
            area = triangle_intersection_area(tri, other)
            if area > 1e-8:
                pair = [min(tri_id, other_id), max(tri_id, other_id)]
                pairs.append({"triangles": pair, "intersection_area": area})
                total_area += area
                per_triangle.update(pair)
        active.append(current)
    return {
        "status": "OVERLAP_FOUND" if pairs else "NO_POSITIVE_AREA_OVERLAP",
        "overlap_pair_count": len(pairs),
        "overlapping_triangle_ids": sorted(per_triangle),
        "total_pairwise_intersection_area": total_area,
        "pairs": pairs,
        "note": "Positive-area UV triangle intersections only; shared edges are ignored. Overlap may be intentional (mirroring, stacking, or reuse) and requires visual review."
    }

def draw_uv(path, output, size=1024):
    if type(size) is not int or not 128 <= size <= 4096:
        raise ValueError("Image size must be 128..4096")
    raw, doc, binary = read_glb(path)
    out = Path(output)
    out.mkdir(parents=True, exist_ok=False)
    records = []
    margin = 24
    for mesh_index, mesh in enumerate(doc.get("meshes", [])):
        for primitive_index, primitive in enumerate(mesh.get("primitives", [])):
            attrs = primitive.get("attributes", {})
            if "TEXCOORD_0" not in attrs:
                records.append({"mesh": mesh_index, "primitive": primitive_index,
                                "status": "NO_TEXCOORD_0"})
                continue
            uv = read_uv_accessor(doc, binary, attrs["TEXCOORD_0"])
            mode = primitive.get("mode", 4)
            if mode != 4:
                records.append({"mesh": mesh_index, "primitive": primitive_index,
                                "status": "UNSUPPORTED_PRIMITIVE_MODE", "mode": mode})
                continue
            indices = read_indices(doc, binary, primitive["indices"]) if "indices" in primitive else list(range(len(uv)))
            if len(indices) % 3:
                raise ValueError("Triangle index count must be divisible by 3")
            if any(type(index) is not int or index < 0 or index >= len(uv) for index in indices):
                raise ValueError("Triangle index references a missing UV vertex")
            image = Image.new("RGB", (size, size), (248, 249, 252))
            draw = ImageDraw.Draw(image)
            min_u, min_v = min(p[0] for p in uv), min(p[1] for p in uv)
            max_u, max_v = max(p[0] for p in uv), max(p[1] for p in uv)
            span_u, span_v = max(max_u - min_u, 1e-6), max(max_v - min_v, 1e-6)
            available = size - margin * 2
            scale = min(available / span_u, available / span_v)
            offset_x = (size - span_u * scale) / 2
            offset_y = (size - span_v * scale) / 2
            def point(pair):
                u, v = pair
                return (offset_x + (u - min_u) * scale,
                        offset_y + (v - min_v) * scale)
            # Show the conventional 0..1 texture tile even when UVs extend
            # beyond it; fit the complete UV bounds into the image.
            tile_a, tile_b = point((0.0, 0.0)), point((1.0, 1.0))
            draw.rectangle((tile_a[0], tile_a[1], tile_b[0], tile_b[1]),
                           outline=(80, 100, 130), width=2)
            for tick in range(1, 10):
                u = tick / 10
                a, b = point((u, 0.0)), point((u, 1.0))
                c, d = point((0.0, u)), point((1.0, u))
                draw.line((a[0], min(a[1], b[1]), b[0], max(a[1], b[1])),
                          fill=(224, 229, 237), width=1)
                draw.line((min(c[0], d[0]), c[1], max(c[0], d[0]), d[1]),
                          fill=(224, 229, 237), width=1)
            overlap = analyze_uv_overlaps(uv, indices)
            overlap_ids = set(overlap["overlapping_triangle_ids"])
            for i in range(0, len(indices), 3):
                tri_id = i // 3
                tri = [point(uv[indices[i]]), point(uv[indices[i+1]]), point(uv[indices[i+2]])]
                fill = (250, 190, 185) if tri_id in overlap_ids else (196, 219, 245)
                outline = (180, 35, 35) if tri_id in overlap_ids else (25, 78, 135)
                draw.polygon(tri, fill=fill, outline=outline, width=2)
            filename = f"mesh-{mesh_index:03d}-primitive-{primitive_index:03d}.png"
            image.save(out / filename)
            records.append({"mesh": mesh_index, "primitive": primitive_index,
                            "status": "GENERATED", "uv_vertices": len(uv),
                            "triangles": len(indices)//3, "image": filename,
                            "uv_overlap": overlap,
                            "sha256": hashlib.sha256((out / filename).read_bytes()).hexdigest(),
                            "uv_bounds": [[min(p[0] for p in uv), min(p[1] for p in uv)],
                                          [max(p[0] for p in uv), max(p[1] for p in uv)]]})
    report = {"source_sha256": hashlib.sha256(raw).hexdigest(),
              "status": "REFERENCE_ONLY", "image_size": size,
              "coordinate_note": "Complete UV bounds are fitted to the image; the conventional 0..1 texture tile is outlined for reference. Coordinates outside 0..1 are preserved and visible.",
              "limitations": "First UV set only; triangle primitives; overlap detection is geometric and cannot determine whether overlap is intentional; no texture/material compositing or island packing analysis.",
              "primitives": records}
    (out / "uv-report.json").write_text(json.dumps(report, indent=2, allow_nan=False))
    return report


if __name__ == "__main__":
    draw_uv(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1024)

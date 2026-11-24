"""Plan independent render units without changing existing render scripts."""
def plan_tiles(width, height, columns, rows, views, frames=(1,)):
    if any(type(n) is not int or n <= 0 for n in (width,height,columns,rows)):
        raise ValueError("positive integer dimensions required")
    if columns > width or rows > height or columns*rows > 16:
        raise ValueError("invalid tile grid")
    views, frames = tuple(views), tuple(frames)
    if not views or not frames or len(set(views)) != len(views) or len(set(frames)) != len(frames):
        raise ValueError("unique views and frames required")
    if any(v not in ("front","side","back","angle") for v in views) or any(type(f) is not int or f < 0 for f in frames):
        raise ValueError("invalid view or frame")
    return [dict(id=f"{v}-{f}-{y}-{x}", view=v, frame=f,
                 bounds=(x*width//columns,y*height//rows,(x+1)*width//columns,(y+1)*height//rows))
            for v in views for f in frames for y in range(rows) for x in range(columns)]

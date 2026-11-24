"""Only repair explicitly recognized syntax issues; never execute log text."""
import ast
import re
def repair_source(source, error):
    if "TabError" not in error and "IndentationError" not in error:
        return None
    try:
        ast.parse(source)
        return None
    except (TabError,IndentationError):
        candidate="".join(re.sub(r"^[ \t]+",lambda m:m.group().expandtabs(8),line) for line in source.splitlines(keepends=True))
        try:
            ast.parse(candidate)
        except SyntaxError:
            return None
        return candidate if candidate!=source else None

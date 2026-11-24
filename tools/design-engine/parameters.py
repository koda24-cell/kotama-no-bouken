"""Restricted arithmetic parameter evaluator; not a general CAD constraint solver."""
import ast
import json
import math
import operator
import sys
from pathlib import Path

OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv}

def resolve_design(spec):
    definitions = spec["parameters"]
    resolved = {}
    active = set()
    def number(v):
        if type(v) not in (int, float) or not math.isfinite(v):
            raise ValueError("Expected finite number")
        return v
    def evaluate(v):
        if not isinstance(v, str):
            return number(v)
        if len(v)>512: raise ValueError("Expression too long")
        def walk(n):
            if isinstance(n, ast.Constant): return number(n.value)
            if isinstance(n, ast.Name): return parameter(n.id)
            if isinstance(n, ast.BinOp) and type(n.op) in OPS:
                return number(OPS[type(n.op)](walk(n.left),walk(n.right)))
            if isinstance(n, ast.UnaryOp) and isinstance(n.op,(ast.UAdd,ast.USub)):
                return number(walk(n.operand)*(-1 if isinstance(n.op,ast.USub) else 1))
            raise ValueError("Unsupported expression")
        return walk(ast.parse(v,mode="eval").body)
    def parameter(name):
        if name in resolved: return resolved[name]
        if name in active: raise ValueError("Cyclic parameter: "+name)
        if name not in definitions: raise ValueError("Unknown parameter: "+name)
        active.add(name)
        value=evaluate(definitions[name])
        active.remove(name)
        resolved[name]=value
        return value
    for name in definitions: parameter(name)
    for bound in spec.get("bounds",[]):
        value=parameter(bound["parameter"])
        if not evaluate(bound["min"])<=value<=evaluate(bound["max"]):
            raise ValueError("Parameter outside bounds: "+bound["parameter"])
    parts=[dict(p,origin=[evaluate(v) for v in p["origin"]],size=[evaluate(v) for v in p["size"]]) for p in spec["parts"]]
    return {"units":spec["units"],"revision":spec["revision"],"parameters":resolved,"parts":parts}

if __name__=="__main__":
    result=resolve_design(json.loads(Path(sys.argv[1]).read_text()))
    with Path(sys.argv[2]).open("x") as f: json.dump(result,f,indent=2,allow_nan=False)

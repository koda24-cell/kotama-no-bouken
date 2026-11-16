"""Verify the delivered scene through the real official stdio MCP server."""
import asyncio
import json
import os
from pathlib import Path
import shutil
import sys
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    root=Path(__file__).resolve().parents[2]
    scene=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'assets/3d/dungeons/b1_sacred_forest_candidates/scene/scene.blend'
    if not scene.is_file():raise FileNotFoundError(scene)
    command=os.environ.get('BLENDER_MCP_COMMAND') or shutil.which('blender-mcp')
    if not command and Path('/workspace/tools/mcp-venv/bin/blender-mcp').is_file():
        command='/workspace/tools/mcp-venv/bin/blender-mcp'
    if not command:raise RuntimeError('Install official Blender Lab MCP server first')
    code='import bpy\nbpy.ops.wm.open_mainfile(filepath='+repr(str(scene))+')\n'
    code+='result={"version":bpy.app.version_string,"file":bpy.data.filepath,"objects":len(bpy.context.scene.objects),"asset_ids":sorted({o.get("asset_id") for o in bpy.context.scene.objects if o.get("asset_id")}),"cameras":[o.name for o in bpy.context.scene.objects if o.type=="CAMERA"]}'
    env=dict(os.environ,BLENDER_MCP_HOST='127.0.0.1',BLENDER_MCP_PORT='9876')
    async with stdio_client(StdioServerParameters(command=command,env=env)) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize()
            response=await session.call_tool('execute_blender_code',{'code':code})
            result=response.structuredContent or response.model_dump()
            print(json.dumps(result,ensure_ascii=False,indent=2))
            if response.isError or result.get('status')!='ok':raise SystemExit(1)

asyncio.run(main())

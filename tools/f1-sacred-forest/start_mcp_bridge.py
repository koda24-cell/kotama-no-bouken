"""Start the separately installed official Blender Lab add-on, localhost only.

Run inside Blender: blender -b --online-mode --python this_file.py
BLENDER_MCP_ADDON points to the official repository's addon directory.
The add-on itself is not redistributed in this project.
"""
import os
import sys
from pathlib import Path
import bpy

addon=Path(os.environ.get('BLENDER_MCP_ADDON','/workspace/tools/blender_mcp/addon'))
if not (addon/'blender_mcp_addon/__init__.py').is_file():
    raise RuntimeError('Install official Blender Lab add-on first and set BLENDER_MCP_ADDON')
if not bpy.app.background or not bpy.app.online_access:
    raise RuntimeError('Use Blender --background --online-mode')
sys.path.insert(0,str(addon))
import blender_mcp_addon
blender_mcp_addon.register()
from blender_mcp_addon.cli import cli_execute
raise SystemExit(cli_execute(['--host','127.0.0.1','--port','9876']))

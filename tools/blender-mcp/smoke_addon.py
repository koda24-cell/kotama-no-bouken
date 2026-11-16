"""Blender Lab add-on import/registration smoke test; NOT an end-to-end MCP tool call."""
import bpy
import sys
sys.path.insert(0, '/tmp/blender_mcp/addon')
assert bpy.app.version[:2] == (5, 3), bpy.app.version_string
import blender_mcp_addon
print('BLENDER_MCP_ADDON_IMPORTED', blender_mcp_addon.__file__)
blender_mcp_addon.register()
print('BLENDER_MCP_ADDON_REGISTERED')
blender_mcp_addon.unregister()
print('BLENDER_MCP_ADDON_UNREGISTERED')

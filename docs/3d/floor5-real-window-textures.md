# B5 distant windows — real source texture proposal

The existing shader renders synthetic rectangular windows. Replace those with **actual CC0 night facade emission maps** while retaining the existing animated purple fog.

Verified source pages:
- https://ambientcg.com/view?id=Facade009
- https://ambientcg.com/view?id=Facade010
- https://ambientcg.com/view?id=Facade020C
- https://commons.wikimedia.org/wiki/File:Facade020C_8K_Emission.png

AmbientCG identifies these as CC0 and offers downloadable 1K/2K maps. The Wikimedia Commons copy of Facade020C Emission also states CC0. These are **procedural architectural textures**, not literal photographs; the lighting pattern is more realistic than the current simple grid, but should not be described as a photographed city.

Desired processing:
1. Fetch original CC0 emission map and retain its source URL, license and checksum.
2. Use the bright emission pixels as a mask; make walls completely transparent/black.
3. Mix multiple facade styles with sparse random patches, preserving the original window details.
4. Apply a dim amber-magenta tint and overlay independently animated purple cloud shader.
5. Verify two actual Chromium frames, preserve screenshots and compare to V1.
6. Never publish third-party texture binaries until download and licensing checks succeed.

The runtime's map visibility/occlusion logic must remain authoritative. **Game integration not yet implemented.**

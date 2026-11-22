// Review-only view/UV chooser for Blender's 8-direction tree atlas.
// Input azimuth is measured in Blender conventions: 0° = front (camera at -Y),
// positive 90° = camera at +X. Actual game conversion remains unintegrated.
export function chooseImpostorFrame(azimuthDegrees, metadata) {
  if (!Number.isFinite(azimuthDegrees)) throw new TypeError("invalid azimuth");
  if (!Array.isArray(metadata?.frames) || !Array.isArray(metadata?.atlas?.size_px)) throw new TypeError("missing atlas metadata");
  const [width,height] = metadata.atlas.size_px;
  if (!(width>0 && height>0)) throw new TypeError("invalid atlas dimensions");
  const degrees=((azimuthDegrees % 360)+360)%360;
  const distance=(a,b)=>Math.abs((((a-b)+540)%360)-180);
  const frame=metadata.frames.reduce((best,f)=>distance(f.yaw_degrees,degrees)<distance(best.yaw_degrees,degrees)?f:best);
  const [x,y,w,h]=frame.atlas_rect_px;
  if (![x,y,w,h].every(Number.isFinite) || x<0 || y<0 || w<=0 || h<=0 || x+w>width || y+h>height) throw new TypeError("invalid atlas rectangle");
  return {
    filename:frame.name,
    yaw_degrees:frame.yaw_degrees,
    // UV rect in glTF/Three.js texture coordinates, origin bottom-left.
    u0:x/width, v0:1-(y+h)/height, u1:(x+w)/width, v1:1-y/height
  };
}

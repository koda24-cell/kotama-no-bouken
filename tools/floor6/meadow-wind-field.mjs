/** Deterministic world-space meadow wind model (experiment only). */
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t=clamp01(x); return t*t*(3-2*t); };
export const DEFAULT_WIND=Object.freeze({directionDegrees:32,amplitude:0.048,gustAmplitude:0.038,waveLength:4.8,waveSpeed:1.05,gustFrequency:0.48,flutterFrequency:4.5,flutterAmplitude:0.006});
export function sampleMeadowWind({x,z,heightRatio,timeSeconds,plantPhase=0,stiffness=1},opts=DEFAULT_WIND){
 const {directionDegrees,amplitude,gustAmplitude,waveLength,waveSpeed,gustFrequency,flutterFrequency,flutterAmplitude}={...DEFAULT_WIND,...opts};
 const theta=directionDegrees*Math.PI/180,dx=Math.cos(theta),dz=Math.sin(theta);
 const along=x*dx+z*dz,cross=-x*dz+z*dx;
 const front=along*(Math.PI*2/Math.max(waveLength,0.01))-timeSeconds*waveSpeed;
 const broad=Math.sin(front+0.28*Math.sin(cross*0.7));
 const gust=smooth(0.5+0.5*Math.sin(front*0.57-timeSeconds*gustFrequency+0.45*Math.cos(cross*0.43)));
 const small=Math.sin(timeSeconds*flutterFrequency+along*2.7+plantPhase);
 const t=smooth(heightRatio),elasticity=Math.max(0,stiffness);
 const bend=t*t*elasticity*(amplitude*broad+gustAmplitude*gust);
 const flutter=t*t*t*elasticity*flutterAmplitude*small;
 return {dx:dx*bend-dz*flutter,dz:dz*bend+dx*flutter,gust,bend};
}
export const MEADOW_WIND_GLSL=`
vec2 kotamaMeadowWind(vec2 worldXZ,float leafHeight01,float timeSec,
float plantPhase,float stiffness,vec2 windDir){
 windDir=normalize(windDir);
 float along=dot(worldXZ,windDir);
 float crossWind=dot(worldXZ,vec2(-windDir.y,windDir.x));
 float front=along*(6.28318530718/4.8)-timeSec*1.05;
 float broad=sin(front+0.28*sin(crossWind*0.7));
 float rawGust=clamp(0.5+0.5*sin(front*0.57-timeSec*0.48+0.45*cos(crossWind*0.43)),0.0,1.0);
 float gust=rawGust*rawGust*(3.0-2.0*rawGust);
 float h=clamp(leafHeight01,0.0,1.0);
 float t=h*h*(3.0-2.0*h);
 float bend=t*t*max(0.0,stiffness)*(0.048*broad+0.038*gust);
 float flutter=t*t*t*max(0.0,stiffness)*0.006*sin(timeSec*4.5+along*2.7+plantPhase);
 return windDir*bend+vec2(-windDir.y,windDir.x)*flutter;
}
`;

function instrumentWebGL() {
 const log=window.__glDiag={phase:'init',uploads:0,phaseCounts:{},errors:[],recent:[],textureDeletes:[],bitmapCloses:[],bitmapCreates:[]};
 const glStates=new WeakMap(),ids=new WeakMap();let nextID=1;
 const id=x=>{if(!x)return null;if(!ids.has(x))ids.set(x,nextID++);return ids.get(x);};
 const summary=x=>{
  if(x===null||typeof x!=='object')return x;
  const o={type:x.constructor?.name,id:id(x)};
  for(const k of ['width','height','naturalWidth','naturalHeight','videoWidth','videoHeight','complete','byteLength','byteOffset','length','size'])if(typeof x[k]!=='undefined')o[k]=x[k];
  if(x.src)o.src=String(x.src).slice(0,170);
  if(x instanceof Blob)o.mime=x.type;
  return o;
 };
 const glState=gl=>{if(!glStates.has(gl))glStates.set(gl,{id:id(gl),active:33984,bindings:new Map(),textures:new Map()});return glStates.get(gl);};
 for(const Klass of [window.WebGLRenderingContext,window.WebGL2RenderingContext].filter(Boolean)){
  const p=Klass.prototype,getError=p.getError;
  for(const name of ['activeTexture','bindTexture','deleteTexture','texStorage2D','texImage2D','texSubImage2D']){
   const original=p[name];if(!original)continue;
   Object.defineProperty(p,name,{configurable:true,writable:true,value:function(...args){
    const state=glState(this);
    if(name==='activeTexture')state.active=args[0];
    if(name==='bindTexture')state.bindings.set(state.active+':'+args[0],args[1]);
    if(name==='deleteTexture'){log.textureDeletes.push({phase:log.phase,id:id(args[0])});return original.apply(this,args);}
    if(name==='activeTexture'||name==='bindTexture')return original.apply(this,args);
    const texture=state.bindings.get(state.active+':'+args[0]),textureID=id(texture),prior=getError.call(this);
    const call={phase:log.phase,method:name,context:state.id,unit:state.active,textureID,args:args.map(summary),priorError:prior};
    const existing=state.textures.get(textureID);if(existing)call.storage={...existing};
    let result,exception;
    try{result=original.apply(this,args);}catch(e){exception=String(e);}
    call.error=getError.call(this);
    if(name==='texStorage2D'&&!call.error)state.textures.set(textureID,{levels:args[1],internalFormat:args[2],width:args[3],height:args[4],immutable:true});
    log.uploads++;log.phaseCounts[log.phase]=(log.phaseCounts[log.phase]||0)+1;log.recent.push(call);if(log.recent.length>100)log.recent.shift();
    if(call.error||exception||prior){call.exception=exception;call.stack=new Error().stack;call.previous=log.recent.slice(-8,-1).map(x=>({...x,previous:undefined}));log.errors.push(call);}
    if(exception)throw Error(exception);
    return result;
   }});
  }
 }
 if(window.ImageBitmap){const close=ImageBitmap.prototype.close;ImageBitmap.prototype.close=function(){log.bitmapCloses.push({phase:log.phase,image:summary(this),stack:new Error().stack});return close.call(this);};}
 if(window.createImageBitmap){const create=window.createImageBitmap;window.createImageBitmap=function(...args){return create.apply(this,args).then(image=>{log.bitmapCreates.push({phase:log.phase,image:summary(image),source:summary(args[0])});return image;});};}
}

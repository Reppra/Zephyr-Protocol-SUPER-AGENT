/* ============================ SETTINGS ============================ */
const DEFAULT_SETTINGS={sens:1.0,sensX:1.0,sensY:1.0,deadzone:0.12,tapFire:true,fireZone:0.45,lefty:false,vol:0.5,invertY:false,minimap:true,music:true,quality:'auto',lang:'',reducedMotion:false,highContrast:false,colorblind:false,autotune:false,haptics:true,goldBiome:true};
const SETTINGS_KEY='sun011_settings',LEGACY_SETTINGS_KEYS=['sun010_settings','sun009_settings','sun008_settings','sun007_settings'];
function sanitizeSettings(o){
  const d=Object.assign({},DEFAULT_SETTINGS);
  try{
    if(!o||typeof o!=='object')return d;
    const num=v=>{const n=+v;return Number.isFinite(n)?n:null;};
    const sens=num(o.sens),vol=num(o.vol);
    if(sens!==null)d.sens=Math.min(2.5,Math.max(0.3,sens));
    if(vol!==null)d.vol=Math.min(1,Math.max(0,vol));
    if(typeof o.invertY==='boolean')d.invertY=o.invertY;
    if(typeof o.minimap==='boolean')d.minimap=o.minimap;
    if(typeof o.music==='boolean')d.music=o.music;
    if(typeof o.quality==='string'&&['auto','low','high'].indexOf(o.quality)>=0)d.quality=o.quality;
    if(typeof o.lang==='string'&&['','en','de'].indexOf(o.lang)>=0)d.lang=o.lang;
    if(typeof o.reducedMotion==='boolean')d.reducedMotion=o.reducedMotion;
    if(typeof o.highContrast==='boolean')d.highContrast=o.highContrast;
    if(typeof o.colorblind==='boolean')d.colorblind=o.colorblind;
    if(typeof o.autotune==='boolean')d.autotune=o.autotune;
    if(typeof o.haptics==='boolean')d.haptics=o.haptics;
    if(typeof o.goldBiome==='boolean')d.goldBiome=o.goldBiome;
    if(typeof o.tapFire==='boolean')d.tapFire=o.tapFire;
    const fz=num(o.fireZone);
    if(fz!==null)d.fireZone=Math.min(0.6,Math.max(0.25,fz));
    const sx=num(o.sensX),sy=num(o.sensY);
    if(sx!==null)d.sensX=Math.min(3,Math.max(0.2,sx));
    if(sy!==null)d.sensY=Math.min(3,Math.max(0.2,sy));
    const dz=num(o.deadzone);
    if(dz!==null)d.deadzone=Math.min(0.3,Math.max(0,dz));
    if(typeof o.lefty==='boolean')d.lefty=o.lefty;
  }catch(e){}
  return d;
}
function loadSettings(){
  try{
    let raw=localStorage.getItem(SETTINGS_KEY);
    for(let i=0;i<LEGACY_SETTINGS_KEYS.length&&!raw;i++){try{raw=localStorage.getItem(LEGACY_SETTINGS_KEYS[i]);}catch(e2){}}
    if(!raw){
      const d=Object.assign({},DEFAULT_SETTINGS);
      try{d.reducedMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e3){}
      return d;
    }
    return sanitizeSettings(JSON.parse(raw));
  }catch(e){return Object.assign({},DEFAULT_SETTINGS);}
}
function saveSettings(){
  if(benchRunning)return false;
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(SET));return true;}
  catch(e){return false;}
}
let SET=loadSettings();
sensitivity=SET.sens;
loadAch();
loadMeta();
function stickDeadzone(dx,dy,dz){
  try{
    const d=Math.min(0.3,Math.max(0,Number.isFinite(+dz)?+dz:0));
    const l=Math.hypot(dx,dy)||0;
    if(l<=d)return {ok:true,x:0,y:0,mag:0};
    const cl=Math.min(1,l),sc=Math.min(1,(cl-d)/(1-d))/l;
    return {ok:true,x:dx*sc,y:dy*sc,mag:Math.min(1,(cl-d)/(1-d))};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setVol(v){
  try{
    SET.vol=Math.min(1,Math.max(0,+v));if($('volVal'))$('volVal').textContent=(+SET.vol).toFixed(2);
    if($('pVolVal'))$('pVolVal').textContent=(+SET.vol).toFixed(2);
    if($('volRange'))$('volRange').value=SET.vol;if($('pVolRange'))$('pVolRange').value=SET.vol;
    applyGain();saveSettings();return {ok:true,vol:SET.vol};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setSens(v){
  try{
    SET.sens=Math.min(2.5,Math.max(0.3,+v));sensitivity=SET.sens;
    if($('sensVal'))$('sensVal').textContent=sensitivity.toFixed(1);
    if($('pSensVal'))$('pSensVal').textContent=sensitivity.toFixed(1);
    if($('sensRange'))$('sensRange').value=SET.sens;if($('pSensRange'))$('pSensRange').value=SET.sens;
    saveSettings();return {ok:true,sens:SET.sens};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setSensXY(x,y){
  try{
    const nx=+x,ny=+y;
    if(!Number.isFinite(nx)||!Number.isFinite(ny))return {ok:false,error:'bad sens axis'};
    SET.sensX=Math.min(3,Math.max(0.2,nx));SET.sensY=Math.min(3,Math.max(0.2,ny));
    if($('sensXVal'))$('sensXVal').textContent=SET.sensX.toFixed(1);
    if($('sensYVal'))$('sensYVal').textContent=SET.sensY.toFixed(1);
    if($('sensXRange'))$('sensXRange').value=SET.sensX;
    if($('sensYRange'))$('sensYRange').value=SET.sensY;
    saveSettings();return {ok:true,sensX:SET.sensX,sensY:SET.sensY};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setDeadzone(v){
  try{
    const n=+v;
    if(!Number.isFinite(n))return {ok:false,error:'bad deadzone'};
    SET.deadzone=Math.min(0.3,Math.max(0,n));
    if($('deadzoneVal'))$('deadzoneVal').textContent=SET.deadzone.toFixed(2);
    if($('deadzoneRange'))$('deadzoneRange').value=SET.deadzone;
    saveSettings();return {ok:true,deadzone:SET.deadzone};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function applyLefty(){
  try{
    const on=!!SET.lefty;
    if(document.body&&document.body.classList)document.body.classList.toggle('lefty',on);
    if($('leftyChk'))$('leftyChk').checked=on;
    return {ok:true,lefty:on};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setLefty(b){
  try{SET.lefty=!!b;applyLefty();saveSettings();return {ok:true,lefty:SET.lefty};}
  catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setMusic(b){
  try{
    SET.music=!!b;
    if($('musicChk'))$('musicChk').checked=SET.music;if($('pMusicChk'))$('pMusicChk').checked=SET.music;
    saveSettings();
    if(SET.music){if(AC&&!muted&&!benchRunning)startMusic();}else stopMusic();
    return {ok:true,music:SET.music};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function applySettingsUI(){
  try{
    $('sensRange').value=SET.sens;$('sensVal').textContent=(+SET.sens).toFixed(1);
    $('volRange').value=SET.vol;$('volVal').textContent=(+SET.vol).toFixed(2);
    $('invertYChk').checked=!!SET.invertY;$('minimapChk').checked=!!SET.minimap;$('musicChk').checked=!!SET.music;
    $('qualitySel').value=SET.quality;
    if($('pSensRange')){$('pSensRange').value=SET.sens;$('pSensVal').textContent=(+SET.sens).toFixed(1);}
    if($('pVolRange')){$('pVolRange').value=SET.vol;$('pVolVal').textContent=(+SET.vol).toFixed(2);}
    if($('pMusicChk'))$('pMusicChk').checked=!!SET.music;
    if($('langSel'))$('langSel').value=SET.lang||'';
    if($('a11yMotionChk'))$('a11yMotionChk').checked=!!SET.reducedMotion;
    if($('a11yContrastChk'))$('a11yContrastChk').checked=!!SET.highContrast;
    if($('a11yColorChk'))$('a11yColorChk').checked=!!SET.colorblind;
    if($('autotuneChk'))$('autotuneChk').checked=!!SET.autotune;
    if($('hapticChk'))$('hapticChk').checked=!!SET.haptics;
    if($('goldBiomeChk'))$('goldBiomeChk').checked=SET.goldBiome!==false;
    if($('tapFireChk'))$('tapFireChk').checked=SET.tapFire!==false;
    if($('fireZoneRange'))$('fireZoneRange').value=SET.fireZone;
    if($('fireZoneVal'))$('fireZoneVal').textContent=Math.round(SET.fireZone*100)+'%';
    if($('sensXRange'))$('sensXRange').value=SET.sensX;
    if($('sensXVal'))$('sensXVal').textContent=(+SET.sensX).toFixed(1);
    if($('sensYRange'))$('sensYRange').value=SET.sensY;
    if($('sensYVal'))$('sensYVal').textContent=(+SET.sensY).toFixed(1);
    if($('deadzoneRange'))$('deadzoneRange').value=SET.deadzone;
    if($('deadzoneVal'))$('deadzoneVal').textContent=(+SET.deadzone).toFixed(2);
    applyLefty();
    sensitivity=SET.sens;
    applyGain();applyA11y();
    return {ok:true};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


/* ============================ INPUT / POINTER LOCK ============================ */
let isPointerLocked=false,lastLockExit=0,lockErrors=0;
const LOCK_COOLDOWN_MS=1300;
/* VM mouse drivers + the Chromium pointer-lock re-entry bug can deliver NaN or 1e9-pixel deltas.
   Every raw pointer delta passes sanitizeDelta before it can reach player.yaw. */
const MAX_LOOK_DELTA=250;
const IN={sanN:0,sanMax:0,sanRec:0,lastTel:0,lockGrantAt:0,accX:0,accY:0,evHz:0,evCount:0,vmNoted:false};
const keys={};
const touch={mx:0,mz:0,lookX:0,lookY:0,fire:false,jump:false,active:false,stickId:null,lookId:null,fireId:null,fireTouch:false};
const TW={lastEvent:0,fireAt:0,lookAt:0,stickAt:0,ghosts:0,stale:0,idleMs:5000,staleMs:10000};
const LK={state:'UNLOCKED',requestedAt:0,TIMEOUT:300};
function lockStateGet(){
  try{
    const now=performance.now();
    if(LK.state==='REQUESTING'&&now-LK.requestedAt>LK.TIMEOUT){LK.state='UNLOCKED';}
    return {ok:true,state:LK.state,locked:isPointerLocked,ms:Math.round(now-LK.requestedAt),errors:lockErrors};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function requestLock(){
  try{
    const c=$('glcanvas');
    if(!gameStarted||gameOver||paused||G.mode==='playback')return {ok:false,state:LK.state,error:'not in active game'};
    if(!c)return {ok:false,state:LK.state,error:'no canvas'};
    if(document.pointerLockElement===c||isPointerLocked)return {ok:true,state:'LOCKED',error:null};
    const now=performance.now();
    if(LK.state==='REQUESTING'&&now-LK.requestedAt<LK.TIMEOUT)return {ok:false,state:'REQUESTING',error:'request in flight'};
    if(now-lastLockExit<LOCK_COOLDOWN_MS){
      const wait=Math.max(1,Math.ceil((LOCK_COOLDOWN_MS-(now-lastLockExit))/1000));
      showToast(t('cooldown')+' ('+wait+'s)');
      return {ok:false,state:LK.state,error:'lock cooldown'};
    }
    if(document.hidden)return {ok:false,state:LK.state,error:'document hidden'};
    LK.state='REQUESTING';LK.requestedAt=now;
    const pl=c.requestPointerLock();
    if(pl&&typeof pl.catch==='function')pl.catch(()=>{LK.state='UNLOCKED';lockErrors++;showToast(t('lockIssue')+' ('+lockErrors+')');});
    return {ok:true,state:'REQUESTING',error:null};
  }catch(e){LK.state='UNLOCKED';lockErrors++;showToast(t('lockIssue')+' ('+lockErrors+')');return {ok:false,error:String(e&&e.message||e)};}
}
function clearInput(){for(const k in keys)keys[k]=false;touch.fire=false;touch.fireTouch=false;touch.fireId=null;touch.jump=false;touch.mx=0;touch.mz=0;touch.stickId=null;touch.lookId=null;}
function sanitizeDelta(v,tag){
  try{
    if(!Number.isFinite(v)){IN.sanN++;return 0;}
    const a=Math.abs(v);
    if(a>MAX_LOOK_DELTA){IN.sanN++;if(a>IN.sanMax)IN.sanMax=a;return v>0?MAX_LOOK_DELTA:-MAX_LOOK_DELTA;}
    return v|0;
  }catch(e){IN.sanN++;return 0;}
}
function sanitizeTelemetry(now){
  try{
    if(IN.sanN>IN.sanRec&&now-IN.lastTel>10000){
      IN.lastTel=now;const n=IN.sanN-IN.sanRec;
      IN.sanRec=IN.sanN;
      telemetryRecord('input_sanitized',{n:n,max:IN.sanMax});
      return {ok:true,n:n,max:IN.sanMax};
    }
    return {ok:true,skipped:true};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
/* High-Hz mice (VM drivers emit 200-1000/s) previously ran camera math per event and starved the
   frame loop. Events now only accumulate; one flush per rendered frame does the work. */
function inputRateTick(now){
  try{
    if(now-IN.evWin>=1000){
      IN.evWin=now;IN.evHz=IN.evCount;IN.evCount=0;
      if(IN.evHz>240&&!IN.vmNoted){
        IN.vmNoted=true;
        telemetryRecord('input_high_hz',{hz:IN.evHz});
        if(!MC.on)mcToggle(true,30000);
      }
      return {ok:true,hz:IN.evHz};
    }
    return {ok:true,skipped:true};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function eventRate(){try{return {ok:true,hz:IN.evHz,count:IN.evCount};}catch(e){return {ok:false,error:String(e&&e.message||e)};}}
function lookFlush(k){
  try{
    if(IN.accX===0&&IN.accY===0)return {ok:true,applied:false};
    const dx=IN.accX,dy=IN.accY;
    IN.accX=0;IN.accY=0;
    const r=applyLook(dx,dy,k===undefined?0.0022:k);
    if(!r.ok)return {ok:false,applied:false,error:r.error};
    return {ok:true,applied:true,dx:dx,dy:dy,yaw:r.yaw,pitch:r.pitch};
  }catch(e){IN.accX=0;IN.accY=0;return {ok:false,error:String(e&&e.message||e)};}
}
function applyLook(dx,dy,k){
  try{
    if(!Number.isFinite(dx)||!Number.isFinite(dy)){IN.sanN++;return {ok:false,error:'non-finite look delta'};}
    if(replayLog){replayLook[0]+=dx;replayLook[1]+=dy;}
    const s=(k===undefined?0.0022:k)*sensitivity;
    player.yaw+=dx*s*SET.sensX;player.pitch=clamp(player.pitch-dy*s*SET.sensY*(SET.invertY?-1:1),-1.45,1.45);
    if(!Number.isFinite(player.yaw)||!Number.isFinite(player.pitch)){player.yaw=Number.isFinite(player.yaw)?player.yaw:0;player.pitch=Number.isFinite(player.pitch)?player.pitch:0;IN.sanN++;return {ok:false,error:'look accumulated to non-finite'};}
    return {ok:true,yaw:player.yaw,pitch:player.pitch};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function hapticsFireTap(){try{return hapticFire(8);}catch(e){return {ok:false,reason:'error'};}}
function tapFireZone(x,w){
  try{
    const ww=w||window.innerWidth||1;
    if(!SET.tapFire)return {ok:true,zone:'look',fire:false};
    const fire=x<ww*SET.fireZone;
    return {ok:true,zone:fire?'fire':'look',fire:fire};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setFireZone(v){
  try{
    const n=+v;
    if(!Number.isFinite(n))return {ok:false,error:'bad fire zone'};
    SET.fireZone=Math.min(0.6,Math.max(0.25,n));
    saveSettings();
    const el=$('fireZoneVal');if(el)el.textContent=Math.round(SET.fireZone*100)+'%';
    const rg=$('fireZoneRange');if(rg)rg.value=SET.fireZone;
    const pv=$('zonePreview');
    if(pv){pv.style.width=Math.round(SET.fireZone*100)+'%';pv.style.opacity='1';clearTimeout(pv._t);pv._t=setTimeout(()=>{pv.style.opacity='0';},1200);}
    return {ok:true,zone:SET.fireZone};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function zoneTouchStart(t){
  try{
    if(!gameStarted||paused||gameOver||G.mode==='playback')return {ok:true,skipped:true};
    if(!t)return {ok:false,error:'no touch'};
    meshTapBurst(t.identifier);phoneLockNotBoom();
    const w=window.innerWidth||1;
    const z=tapFireZone(t.clientX,w);
    if(z.ok&&z.fire&&touch.fireId===null&&t.identifier!==touch.lookId){
      touch.fireId=t.identifier;touch.fireTouch=true;TW.fireAt=performance.now();
      hapticsFireTap();
      return {ok:true,zone:'fire',id:t.identifier};
    }
    if(t.clientX>=w*SET.fireZone&&touch.lookId===null){
      touch.lookId=t.identifier;touch.lookX=t.clientX;touch.lookY=t.clientY;TW.lookAt=performance.now();
      return {ok:true,zone:'look',id:t.identifier};
    }
    return {ok:true,zone:'none',id:t.identifier};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function zoneTouchMove(t){
  try{
    if(G.mode==='playback'||!t)return {ok:true};
    if(t.identifier===touch.lookId){
      applyLook(t.clientX-touch.lookX,t.clientY-touch.lookY,0.005);
      touch.lookX=t.clientX;touch.lookY=t.clientY;
      return {ok:true,zone:'look',id:t.identifier};
    }
    return {ok:true,zone:'none',id:t.identifier};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function zoneTouchEnd(t){
  try{
    if(!t)return {ok:true};
    let cleared=null;
    if(t.identifier===touch.fireId){touch.fireId=null;touch.fireTouch=false;cleared='fire';}
    if(t.identifier===touch.lookId){touch.lookId=null;cleared=cleared?cleared+'+look':'look';}
    return {ok:true,cleared:cleared,id:t.identifier};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function touchCancel(t){
  try{
    const r=zoneTouchEnd(t);
    if(t&&t.identifier===touch.stickId){touch.stickId=null;touch.mx=0;touch.mz=0;const nub=$('stickNub');if(nub)nub.style.transform='translate(-50%,-50%)';}
    return {ok:true,cleared:r.cleared||null,id:t?t.identifier:null};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function touchWatchdog(now){
  try{
    const any=touch.fireTouch||touch.jump||touch.fireId!==null||touch.lookId!==null||touch.stickId!==null;
    if(!any&&!TW.lastEvent)return {ok:true,idle:true};
    let cleared=false;
    if(TW.lastEvent&&now-TW.lastEvent>TW.idleMs){
      TW.ghosts++;
      touch.fire=false;touch.fireTouch=false;touch.fireId=null;touch.jump=false;touch.lookId=null;touch.stickId=null;touch.mx=0;touch.mz=0;
      const nub=$('stickNub');if(nub)nub.style.transform='translate(-50%,-50%)';
      telemetryRecord('ghost_touch',{afterMs:Math.round(now-TW.lastEvent)});
      TW.lastEvent=0;cleared=true;
    }
    if(touch.fireId!==null&&now-TW.fireAt>TW.staleMs){touch.fireId=null;touch.fireTouch=false;TW.stale++;cleared=true;}
    if(touch.lookId!==null&&now-TW.lookAt>TW.staleMs){touch.lookId=null;TW.stale++;cleared=true;}
    if(touch.stickId!==null&&now-TW.stickAt>TW.staleMs){touch.stickId=null;touch.mx=0;touch.mz=0;TW.stale++;cleared=true;}
    return {ok:true,idle:false,cleared:cleared,ghosts:TW.ghosts,stale:TW.stale};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function bindInput(){
  document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===$('glcanvas');
    if(isPointerLocked&&!locked)lastLockExit=performance.now();
    isPointerLocked=locked;LK.state=locked?'LOCKED':'UNLOCKED';
    if(locked)IN.lockGrantAt=performance.now();});
  document.addEventListener('pointerlockerror',()=>{LK.state='UNLOCKED';lockErrors++;showToast(t('lockIssue')+' ('+lockErrors+')');});
  window.addEventListener('unhandledrejection',e=>{const msg=String(e.reason);if(/lock/i.test(msg)){lockErrors++;e.preventDefault();return;}showErr('REJECT: '+msg);});
  document.addEventListener('keydown',e=>{
    if(G.mode==='playback'){if(e.code==='Escape')endPlayback(true);else if(e.code==='KeyC'&&!e.repeat)pbCycleCam();return;}
    if(e.code==='Escape'){if(gameStarted&&!gameOver){togglePause();}return;}
    keys[e.code]=true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.code==='Enter'&&G.mode==='menu')startGame();
    if(e.code==='KeyM'&&gameStarted&&!gameOver&&!e.repeat){
      SET.minimap=!SET.minimap;saveSettings();$('minimapChk').checked=SET.minimap;
      showToast(SET.minimap?'MINIMAP ON':'MINIMAP OFF');
    }
    if(gameStarted&&!gameOver&&!paused&&!e.repeat){
      if(e.code==='Digit1'||e.code==='Digit2'||e.code==='Digit3'||e.code==='Digit4')setWeapon(+e.code.slice(5)-1);
      if(e.code==='KeyQ')setWeapon(player.wi+1);
    }
  });
  document.addEventListener('keyup',e=>{if(G.mode==='playback')return;keys[e.code]=false;});
  canvas.addEventListener('mousedown',e=>{if(G.mode==='playback'){if(PB&&PB.active&&PB.cam==='free'&&e.button===0){PB.drag={x:e.clientX,y:e.clientY};e.preventDefault();}return;}if(e.button===0){keys['Mouse0']=true;
    if(gameStarted&&!gameOver&&!paused&&!isPointerLocked)requestLock();}});
  document.addEventListener('mousemove',e=>{if(G.mode!=='playback'||!PB||!PB.drag)return;pbOrbit(e.clientX-PB.drag.x,e.clientY-PB.drag.y);PB.drag={x:e.clientX,y:e.clientY};});
  document.addEventListener('mouseup',()=>{if(PB)PB.drag=null;});
  canvas.addEventListener('wheel',e=>{if(G.mode==='playback'){if(PB&&PB.active&&PB.cam==='free'){e.preventDefault();pbZoom(e.deltaY);}return;}if(!gameStarted||gameOver||paused)return;e.preventDefault();setWeapon(player.wi+(e.deltaY>0?1:-1));},{passive:false});
  canvas.addEventListener('touchstart',e=>{if(G.mode!=='playback'||!PB||!PB.active||PB.cam!=='free')return;e.preventDefault();const ts=e.touches;
    if(ts.length===1){PB.drag={x:ts[0].clientX,y:ts[0].clientY};PB.pinch=0;}
    else if(ts.length===2){PB.drag=null;PB.pinch=Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);}},{passive:false});
  canvas.addEventListener('touchmove',e=>{if(G.mode!=='playback'||!PB||!PB.active||PB.cam!=='free')return;e.preventDefault();const ts=e.touches;
    if(ts.length===1&&PB.drag){pbOrbit(ts[0].clientX-PB.drag.x,ts[0].clientY-PB.drag.y);PB.drag={x:ts[0].clientX,y:ts[0].clientY};}
    else if(ts.length===2){const d=Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);if(PB.pinch>0&&d>0)pbZoom((PB.pinch-d)*4);PB.pinch=d;}},{passive:false});
  canvas.addEventListener('touchend',e=>{if(G.mode!=='playback'||!PB)return;
    if(e.touches.length===0){PB.drag=null;PB.pinch=0;}
    else if(e.touches.length===1){PB.pinch=0;PB.drag={x:e.touches[0].clientX,y:e.touches[0].clientY};}},{passive:false});
  document.addEventListener('mouseup',e=>{if(G.mode==='playback')return;if(e.button===0)keys['Mouse0']=false;});
  document.addEventListener('mousemove',e=>{if(isPointerLocked&&gameStarted&&!paused&&!gameOver&&G.mode!=='playback'){
    try{
      const now=performance.now();
      if(now-IN.lockGrantAt<50)return; // Chromium emits a giant first delta right after lock grant
      IN.evCount++;
      IN.accX+=sanitizeDelta(e.movementX);
      IN.accY+=sanitizeDelta(e.movementY);
      if(typeof e.buttons==='number')keys['Mouse0']=(e.buttons&1)===1;
      sanitizeTelemetry(now);
    }catch(err){IN.sanN++;}
  }});
  window.addEventListener('blur',clearInput);
  window.addEventListener('resize',resizeGL);
  // touch
  const stick=$('stick'),nub=$('stickNub');
  const stickRect=()=>stick.getBoundingClientRect();
  window.addEventListener('touchstart',()=>{TW.lastEvent=performance.now();},{passive:true,capture:true});
  window.addEventListener('touchmove',()=>{TW.lastEvent=performance.now();},{passive:true,capture:true});
  window.addEventListener('error',()=>{ST.errors++;});
  stick.addEventListener('touchstart',e=>{e.preventDefault();if(G.mode==='playback')return;touch.active=true;const t=e.changedTouches[0];touch.stickId=t.identifier;TW.stickAt=performance.now();moveStick(t);},{passive:false});
  stick.addEventListener('touchmove',e=>{e.preventDefault();if(G.mode==='playback')return;for(const t of e.changedTouches)if(t.identifier===touch.stickId){TW.stickAt=performance.now();moveStick(t);}},{passive:false});
  stick.addEventListener('touchend',e=>{e.preventDefault();if(G.mode==='playback')return;touch.mx=0;touch.mz=0;touch.stickId=null;nub.style.transform='translate(-50%,-50%)';},{passive:false});
  stick.addEventListener('touchcancel',e=>{e.preventDefault();touch.mx=0;touch.mz=0;touch.stickId=null;nub.style.transform='translate(-50%,-50%)';},{passive:false});
  function moveStick(t){const r=stickRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const dz=stickDeadzone((t.clientX-cx)/(r.width/2),(t.clientY-cy)/(r.height/2),SET.deadzone);
    touch.mx=dz.x;touch.mz=dz.y;nub.style.transform='translate(calc(-50% + '+dz.x*36+'px),calc(-50% + '+dz.y*36+'px))';}
  // touch: left zone fires, right zone looks (multi-touch — tap the mesh to shoot)
  canvas.addEventListener('touchstart',e=>{for(const t of e.changedTouches)zoneTouchStart(t);},{passive:true});
  canvas.addEventListener('touchmove',e=>{for(const t of e.changedTouches)zoneTouchMove(t);},{passive:true});
  canvas.addEventListener('touchend',e=>{for(const t of e.changedTouches)zoneTouchEnd(t);},{passive:true});
  canvas.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)touchCancel(t);},{passive:true});
  const hold=(el,on,off)=>{el.addEventListener('touchstart',e=>{e.preventDefault();TW.lastEvent=performance.now();if(G.mode==='playback')return;on();},{passive:false});
    el.addEventListener('touchend',e=>{e.preventDefault();if(G.mode==='playback')return;off();},{passive:false});
    el.addEventListener('touchcancel',e=>{e.preventDefault();off();},{passive:false});};
  hold($('fireBtn'),()=>{touch.fire=true;},()=>{touch.fire=false;});
  hold($('jumpBtn'),()=>{touch.jump=true;},()=>{});
  hold($('reloadBtn'),()=>{reload();},()=>{});
  const wn=$('wpnBtns');
  if(wn)wn.addEventListener('touchstart',e=>{if(G.mode==='playback')return;const b=e.target.closest('.wpn');if(!b)return;e.preventDefault();setWeapon(+b.dataset.w);syncWeaponBtns();},{passive:false});
}


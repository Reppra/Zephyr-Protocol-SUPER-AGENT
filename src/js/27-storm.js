/* ============================ STORM (INPUT ACCEPTANCE HARNESS) ============================ */
const ST={errors:0,mouse:null,touch:null};
function stormReport(){try{return {ok:true,mouse:ST.mouse,touch:ST.touch,errors:ST.errors};}catch(e){return {ok:false,error:String(e&&e.message||e)};}}
function fakeMouseEvent(dx,dy,btn){
  try{
    const ev=new Event('mousemove');
    Object.defineProperty(ev,'movementX',{get:()=>dx});
    Object.defineProperty(ev,'movementY',{get:()=>dy});
    Object.defineProperty(ev,'buttons',{get:()=>btn===undefined?0:btn});
    return ev;
  }catch(e){return null;}
}
/* Acceptance harness for the SUPERvm / SUPERphone incident: a mixed storm of sane, giant, NaN and
   undefined deltas must leave finite camera state. Also the sandbox stand-in for MESH MELTDOWN. */
function stormMouse(n){
  try{
    n=Math.max(1,n|0||2000);
    const bakG={l:isPointerLocked,g:gameStarted,p:paused,o:gameOver,m:G.mode,gat:IN.lockGrantAt};
    const bakIN={x:IN.accX,y:IN.accY,win:IN.evWin,faw:IN.accX};const y0=player.yaw,p0=player.pitch;
    const hadMouse0=keys['Mouse0'];
    const san0=IN.sanN,ev0=IN.evCount,err0=ST.errors;
    const bakSB=SANDBOX;SANDBOX=true;
    MC.driftMax=0;
    isPointerLocked=true;gameStarted=true;paused=false;gameOver=false;G.mode='play';IN.lockGrantAt=0;IN.accX=0;IN.accY=0;
    const t0=performance.now();
    try{
      for(let i=0;i<n;i++){
        const mode=i%7;
        const dx=mode===0?3+i:mode===1?1e9:mode===2?NaN:mode===3?undefined:mode===4?-1e9:mode===5?250.5:((i%5)-2);
        const dy=mode===6?NaN:((i%3)-1);
        const ev=fakeMouseEvent(dx,dy,(i&1)?1:0);
        if(ev)document.dispatchEvent(ev);
        if((i&255)===0)mcDeckFrame(performance.now());
      }
      lookFlush();
      mcDeckFrame(performance.now());
      const ms=performance.now()-t0;
      const finite=Number.isFinite(player.yaw)&&Number.isFinite(player.pitch);
      const accZero=IN.accX===0&&IN.accY===0;
      const sanitized=IN.sanN-san0;
      ST.mouse={n:n,ms:ms,sanitized:sanitized,finite:finite,errors:ST.errors-err0,at:performance.now()};
      return {ok:true,n:n,ms:ms,sanitized:sanitized,finite:finite,accZero:accZero,errors:ST.errors-err0};
    }finally{
      player.yaw=y0;player.pitch=p0;
      if(hadMouse0===undefined)delete keys['Mouse0'];else keys['Mouse0']=hadMouse0;
      IN.accX=bakIN.x;IN.accY=bakIN.y;IN.evWin=bakIN.win;IN.evCount=ev0;
      isPointerLocked=bakG.l;gameStarted=bakG.g;paused=bakG.p;gameOver=bakG.o;G.mode=bakG.m;IN.lockGrantAt=bakG.gat;
      SANDBOX=bakSB;
    }
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function stormTouch(n){
  try{
    n=Math.max(1,n|0||500);
    const bakG={g:gameStarted,p:paused,o:gameOver,m:G.mode};
    const bakT=Object.assign({},touch),bakW=Object.assign({},TW),bakS={tf:SET.tapFire,fz:SET.fireZone};
    const bakTP={times:TP.times.slice(),cap:TP.captured,id:TP.lastId,bs:TP.boomsSuppressed},bakLK=LK.state,bakSB=SANDBOX;
    const y0=player.yaw,p0=player.pitch,err0=ST.errors;
    SANDBOX=true;
    gameStarted=true;paused=false;gameOver=false;G.mode='play';SET.tapFire=true;SET.fireZone=0.45;
    Object.assign(touch,{fireId:null,fireTouch:false,lookId:null,stickId:null,fire:false,jump:false});
    const w=window.innerWidth||1;
    let cancels=0;
    const t0=performance.now();
    try{
      for(let i=0;i<n;i++){
        const id=1000+i;
        const x=(i%2===0)?w*0.2:w*0.8;
        zoneTouchStart({clientX:x,clientY:w*0.5,identifier:id});
        zoneTouchMove({clientX:x+3,clientY:w*0.5,identifier:id});
        if(i%3===0){touchCancel({identifier:id});cancels++;}
        else zoneTouchEnd({identifier:id});
      }
      zoneTouchEnd({identifier:-1});
      const ms=performance.now()-t0;
      const stuck=!!(touch.fireTouch||touch.fireId!==null||touch.lookId!==null||touch.stickId!==null);
      ST.touch={n:n,ms:ms,stuck:stuck,cancels:cancels,errors:ST.errors-err0};
      return {ok:true,n:n,ms:ms,stuck:stuck,cancels:cancels,errors:ST.errors-err0};
    }finally{
      player.yaw=y0;player.pitch=p0;
      Object.assign(touch,bakT);Object.assign(TW,bakW);SET.tapFire=bakS.tf;SET.fireZone=bakS.fz;
      TP.times=bakTP.times;TP.captured=bakTP.cap;TP.lastId=bakTP.id;TP.boomsSuppressed=bakTP.bs;LK.state=bakLK;SANDBOX=bakSB;
      gameStarted=bakG.g;paused=bakG.p;gameOver=bakG.o;G.mode=bakG.m;
    }
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


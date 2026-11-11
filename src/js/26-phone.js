/* ============================ PHONE ============================ */
/* work_010 P4: tap-burst tracker. The Pointer Lock API does not exist for touch, so the SUPERphone
   equivalent is setPointerCapture surfaced through LK as 'CAPTURED', with the boom shake suppressed. */
const TP={times:[],captured:false,lastId:null,boomsSuppressed:0};
function isSuperphone(){try{return ('ontouchstart' in window)||navigator.maxTouchPoints>0;}catch(e){return false;}}
function meshTapBurst(id){
  try{
    const now=performance.now();
    TP.times=TP.times.filter(x=>now-x<2000);
    TP.times.push(now);
    TP.lastId=(id===undefined)?null:id;
    return {ok:true,burst:TP.times.length};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function phoneLockNotBoom(){
  try{
    if(!(isSuperphone()&&SET.tapFire&&TP.times.length>=5&&!TP.captured))return {ok:true,skip:true};
    const c=$('glcanvas');
    if(c&&c.setPointerCapture&&TP.lastId!==null){try{c.setPointerCapture(TP.lastId);}catch(e){}}
    TP.captured=true;LK.state='CAPTURED';G.shake=0;TP.boomsSuppressed++;
    showToast(t('lockNotBoom'));
    telemetryRecord('phone_lock_not_boom',{burst:TP.times.length});
    return {ok:true,captured:true,burst:TP.times.length};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function phoneReleaseIfIdle(){
  try{
    if(!TP.captured)return {ok:true,idle:true};
    const now=performance.now();
    const live=TP.times.some(x=>now-x<2000);
    if(!live){
      TP.captured=false;
      if(LK.state==='CAPTURED')LK.state='UNLOCKED';
      const c=$('glcanvas');
      if(c&&c.releasePointerCapture&&TP.lastId!==null){try{c.releasePointerCapture(TP.lastId);}catch(e){}}
      return {ok:true,released:true};
    }
    return {ok:true};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


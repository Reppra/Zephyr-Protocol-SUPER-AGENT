/* ============================ HAPTICS ============================ */
function hapticGate(reducedMotion,vibrateFn){
  try{
    if(reducedMotion)return {ok:false,reason:'reduced-motion'};
    if(typeof vibrateFn!=='function')return {ok:false,reason:'unsupported'};
    return {ok:true,reason:'ready'};
  }catch(e){return {ok:false,reason:'error',error:String(e&&e.message||e)};}
}
function hapticFire(ms,nav){
  try{
    if(!SET.haptics)return {ok:false,reason:'disabled'};
    const n=nav||((typeof navigator!=='undefined')?navigator:{});
    const gate=hapticGate(!!SET.reducedMotion,n.vibrate);
    if(!gate.ok)return gate;
    const dur=Math.max(1,Math.min(80,ms|0||12));
    n.vibrate(dur);
    return {ok:true,ms:dur};
  }catch(e){return {ok:false,reason:'error',error:String(e&&e.message||e)};}
}


/* ============================ CRITICS ============================ */
/* work_010 P6: five always-on critics. Cards are findings, never heartbeats — an idle healthy game is silent. */
const CF={ring:[],max:60,key:'sun011_critic_card',schema:'sun011.critic_card.v1',runs:0,cards:0,last:{}};
const CRITIC_FLEET=[{id:'ALPHA',domain:'INPUT'},{id:'BRAVO',domain:'MESH'},{id:'CHARLIE',domain:'PHYSICS'},{id:'DELTA',domain:'PERF'},{id:'ECHO',domain:'SUPERPHONE'}];
const CRITIC_CHECK={ALPHA:function(){try{const ground=MC.on&&(MC.anchor.y>window.innerHeight*0.75);
  if(ground){MC.strikes++;if(MC.strikes>=3){MC.strikes=0;MC.fixed++;mcReAnchor();return {msg:'ground cheese x3 -> re-anchored to SUPERvm deck (auto-fix #'+MC.fixed+')',fix:'mcReAnchor'};}return {msg:'mouse still looks for GROUND cheese (strike '+MC.strikes+'/3)'};}
  if(isSuperphone()&&TP.times.length>=5&&LK.state!=='CAPTURED')return {msg:'tap burst '+TP.times.length+' without LOCK (C3 regression)'};
  MC.strikes=0;return null;}catch(e){return null;}},BRAVO:function(){try{if(isSuperphone()&&SANDBOX&&FW.nearMiss>0)return {msg:'FW nearMiss='+FW.nearMiss+' inside SUPERphone sandbox (C4 regression)'};
  if(isSuperphone()&&SANDBOX&&FW.cooledAt&&performance.now()-FW.cooledAt<1500&&!CF._cooledNote){CF._cooledNote=true;return {msg:'MESH COOLED engaged (sandbox safe mode confirmed)',fix:null};}return null;}catch(e){return null;}},CHARLIE:function(){try{if(MC.on&&MC.driftMax>1){const d=MC.driftMax;MC.driftMax=0;mcReAnchor();return {msg:'cheese drift '+d.toFixed(2)+'px vs SUPERvm deck (C2 regression)',fix:'mcReAnchor'};}return null;}catch(e){return null;}},DELTA:function(){try{const now=performance.now();if(!CF._fpsAt||now-CF._fpsAt>10000){CF._fpsRef=fpsShown;CF._fpsAt=now;}
  if((CF._fpsRef||0)>30&&(fpsShown||0)<CF._fpsRef*0.7&&now-(CF._fpsCard||0)>30000){CF._fpsCard=now;return {msg:'fps '+CF._fpsRef+' -> '+fpsShown+' (-'+Math.round(100*(1-fpsShown/CF._fpsRef))+'%)',fix:null};}return null;}catch(e){return null;}},ECHO:function(){try{if(CF._stale===undefined)CF._stale=TW.stale;if(TW.stale>CF._stale+5){const d=TW.stale-CF._stale;CF._stale=TW.stale;return {msg:'touch stale events +'+d+' (SUPERphone input health)',fix:null};}CF._stale=TW.stale;return null;}catch(e){return null;}}};
function pushCriticCard(id,domain,msg,fix){
  try{
    CF.ring.unshift({t:Date.now(),agent:id,domain:domain,msg:msg,fix:fix||null});
    if(CF.ring.length>CF.max)CF.ring.pop();
    CF.cards++;CF.last[id]=msg;
    console.log('[CRITIC:'+id+'] '+msg);
    telemetryRecord('critic_card',{agent:id,msg:msg});
    const b=$('criticBadge');
    if(b){const s=b.querySelector('[data-agent='+id.toLowerCase()+']');if(s)s.setAttribute('data-on','1');}
    return {ok:true,cards:CF.cards};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function runCritics(){
  try{
    CF.runs++;
    for(let i=0;i<CRITIC_FLEET.length;i++){
      const a=CRITIC_FLEET[i];
      try{const f=CRITIC_CHECK[a.id]();if(f)pushCriticCard(a.id,a.domain,f.msg,f.fix);}catch(e){}
    }
    return {ok:true,runs:CF.runs,cards:CF.cards};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
setInterval(runCritics,1000);


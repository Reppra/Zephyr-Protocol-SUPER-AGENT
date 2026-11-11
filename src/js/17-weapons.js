/* ============================ WEAPONS ============================ */
function fireArc(){
  try{
    const w=WEAPONS[3],ch=w.chain;
    const der=(player.derived&&player.derived[3])||{};
    const jumps=((G.derived&&G.derived.arcJumps)||ch.jumps)+(der.jumpAdd||0),dmgMul=der.dmgMul||1;
    const eye=[player.x,player.y+EYE_H,player.z],dir=forwardVec();
    const cand=rayHits(eye,dir,90);
    const firstT=cand.length?cand[0].t:90;
    const wallT=wallRayT(eye,dir,Math.min(firstT,90));
    const endT=Math.min(firstT,wallT);
    pushBeam([eye[0]+dir[0]*0.8,eye[1]-0.28,eye[2]+dir[2]*0.8],[eye[0]+dir[0]*endT,eye[1]+dir[1]*endT,eye[2]+dir[2]*endT],PAL.cyan);
    pushGlow(eye[0]+dir[0]*endT,eye[1]+dir[1]*endT,eye[2]+dir[2]*endT,PAL.cyan,1.6,0.25);
    const critCh=(G.derived&&G.derived.crit)||0;const crit=critCh>0&&rand01()<critCh;
    const base=Math.round(w.dmg*dmgMul*((G.derived&&G.derived.dmgMul)||1))*(player.dmgBoost>0?2:1)*(crit?2:1);
    const hitSet=new Set(),dmgLog=[];
    let landed=false;
    const first=cand.length&&cand[0].t<=wallT?cand[0].e:null;
    if(first){
      const r=applyDamage(first,base);
      if(r.dealt){landed=true;dmgLog.push(r.dealt);hitSet.add(first);burst(first.x,first.y,first.z,PAL.cyan,6,3);pushGlow(first.x,first.y,first.z,PAL.cyan,1.8,0.3);sfx('hit');}
    }
    let cur=first,prev=base;
    for(let j=0;cur&&j<jumps;j++){
      let next=null,best=ch.radius*ch.radius;
      for(const e of enemies){
        if(hitSet.has(e))continue;
        const ddx=e.x-cur.x,ddz=e.z-cur.z,d2=ddx*ddx+ddz*ddz;
        if(d2<best){best=d2;next=e;}
      }
      if(!next)break;
      const dmg=Math.round(prev*ch.falloff);prev=dmg;
      pushBeam([cur.x,cur.y,cur.z],[next.x,next.y,next.z],PAL.cyan);
      const r=applyDamage(next,dmg);
      if(r.dealt){landed=true;dmgLog.push(r.dealt);burst(next.x,next.y,next.z,PAL.cyan,5,3);pushGlow(next.x,next.y,next.z,PAL.cyan,1.5,0.25);}
      hitSet.add(next);cur=next;
    }
    if(landed)telemetryRecord('hit',3);
    if(landed&&crit)G.critMark=0.3;
    if(!benchRunning&&hitSet.size===4)unlockAch('chain4');
    return {ok:true,hits:hitSet.size,dmgLog};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function pushBeam(from,to,col){
  try{
    if(tracers.length>=BEAM_MAX)tracers.shift();
    tracers.push({x0:from[0],y0:from[1],z0:from[2],x1:to[0],y1:to[1],z1:to[2],life:0.12,col:col||PAL.cyan});
    return {ok:true,count:tracers.length};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
const WMODS={arcJump:{dmgMul:1,cdMul:1,jumpAdd:1}};
function recomputeDerived(mods){
  try{
    const list=mods||player.mods||[];
    const out=WEAPONS.map((w,i)=>{
      const m=list[i],d={dmgMul:1,cdMul:1,jumpAdd:0};
      if(m){d.dmgMul*=m.dmgMul===undefined?1:m.dmgMul;d.cdMul*=m.cdMul===undefined?1:m.cdMul;d.jumpAdd+=m.jumpAdd||0;}
      return d;
    });
    return {ok:true,derived:out};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function grantMod(wi,mod){
  try{
    const i=wi|0;
    if(i<0||i>=WEAPONS.length)return {ok:false,error:'bad weapon slot'};
    const m=typeof mod==='string'?WMODS[mod]:mod;
    if(!m)return {ok:false,error:'unknown mod'};
    player.mods=player.mods||WEAPONS.map(()=>null);
    player.mods[i]=m;
    const r=recomputeDerived(player.mods);
    if(!r.ok)return r;
    player.derived=r.derived;
    return {ok:true,wi:i,derived:player.derived[i]};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function setWeapon(n){
  try{
    const wi=((n|0)%WEAPONS.length+WEAPONS.length)%WEAPONS.length;
    player.reloading=0;player.reloadWi=wi;player.wi=wi;player.fireCd=Math.max(player.fireCd,0.12);
    if(wi===3&&!benchRunning)showToast(t('arcReady'));
    updateHUD(0);
    return {ok:true,wi};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


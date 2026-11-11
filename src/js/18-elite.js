/* ============================ ELITE ============================ */
function applyDamage(e,dmg){
  try{
    if(!e)return {ok:false,error:'no target'};
    if(e.boss&&e.shieldT>0){e.flash=0.06;return {ok:true,dealt:0,hp:e.hp,shield:0,absorbed:true};}
    let d=Math.max(0,Math.round(e.shielded?dmg*0.45:dmg));if(!d)return {ok:false,error:'zero damage'};
    let dealt=0;
    if(e.elite==='shield'&&e.shieldHp>0){
      const absorb=Math.min(e.shieldHp,d*0.5);
      e.shieldHp-=absorb;e.shieldCd=4;dealt+=absorb;d-=absorb;
    }
    if(d>0){e.hp-=d;dealt+=d;}
    e.flash=0.12;G.hitmark=1;
    if(e.hp<=0)killEnemy(e);
    return {ok:true,dealt:Math.round(dealt),hp:e.hp,shield:Math.round(e.shieldHp||0)};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}


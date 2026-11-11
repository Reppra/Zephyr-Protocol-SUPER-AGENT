/* ============================ TELEMETRY ============================ */
function telemetryRecord(kind,val){
  try{
    if(kind==='kill'){
      const e=val;if(!e||typeof e.type!=='number'||G.killsBy[e.type]===undefined)return {ok:false,error:'bad kill target'};
      G.killsBy[e.type]++;return {ok:true,type:e.type,count:G.killsBy[e.type]};
    }
    if(kind==='damage'){const n=Math.max(0,+val||0);G.dmgTaken+=n;return {ok:true,dmgTaken:G.dmgTaken};}
    if(kind==='shot'){const wi=val|0;if(G.wshots[wi]===undefined)return {ok:false,error:'bad weapon'};G.shots++;G.wshots[wi]++;return {ok:true,shots:G.shots};}
    if(kind==='hit'){const wi=val|0;if(G.whits[wi]===undefined)return {ok:false,error:'bad weapon'};G.hits++;G.whits[wi]++;return {ok:true,hits:G.hits};}
    if(kind==='lights_throttled'){G.lightsThrottled=(G.lightsThrottled||0)+1;return {ok:true,events:G.lightsThrottled,cap:val|0};}
    if(kind==='input_sanitized'||kind==='input_high_hz'||kind==='nan_firewall'||kind==='ghost_touch'){
      const key='tel_'+(kind==='input_sanitized'?'sanitized':kind==='input_high_hz'?'highhz':kind==='nan_firewall'?'nan':'ghost');
      G.flags[key]=(G.flags[key]||0)+1;
      return {ok:true,kind:kind,count:G.flags[key],val:val&&typeof val==='object'?Object.assign({},val):val};
    }
    return {ok:false,error:'unknown kind'};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function telemetrySummary(){
  try{
    const acc=wi=>{const s=G.wshots[wi]||0;return s?Math.round((G.whits[wi]||0)/s*100):0;};
    return {ok:true,shots:G.shots,hits:G.hits,acc:G.shots?Math.round(G.hits/G.shots*100):0,dmgTaken:Math.round(G.dmgTaken||0),
      kills:G.kills,killsBy:(G.killsBy||[]).slice(),wshots:(G.wshots||[]).slice(),whits:(G.whits||[]).slice(),lightsThrottled:G.lightsThrottled||0,
      weaponAcc:[acc(0),acc(1),acc(2),acc(3)]};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


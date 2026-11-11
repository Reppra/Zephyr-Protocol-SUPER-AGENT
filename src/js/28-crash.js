/* ============================ CRASH CARDS ============================ */
const CR={ring:[],max:60,last:null,key:'sun011_crash_card',schema:'sun011.crash_card.v1'};
function crashRecord(now){
  try{
    const f={t:Math.round(now||performance.now()),fps:fpsShown||0,ev:IN.evHz,san:IN.sanN,inst:instCount,beam:beamCount,lit:lightCount,nm:FW.nearMiss,mode:G.mode};
    CR.ring.push(f);
    if(CR.ring.length>CR.max)CR.ring.shift();
    return {ok:true,len:CR.ring.length};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function crashCapture(kind,reason,extra){
  try{
    const card={schema:CR.schema,ts:new Date().toISOString(),kind:String(kind||'unknown'),reason:String(reason||''),
      version:(typeof GAME_VERSION!=='undefined'?GAME_VERSION:'?'),gpu:GPU_RENDERER||'',kernel:K_WASM?'wasm':'js-fallback',
      ua:String((navigator&&navigator.userAgent)||'').slice(0,160),seed:G.runSeed|0,wave:G.wave|0,mode:G.mode,
      statusMessage:extra&&extra.statusMessage?String(extra.statusMessage).slice(0,200):'',
      fw:{nearMiss:FW.nearMiss,total:FW.total},san:IN.sanN,lock:LK.state,errors:ST.errors,
      ring:CR.ring.slice(),extra:extra?Object.assign({},extra):{}};
    CR.last=card;
    try{sessionStorage.setItem(CR.key,JSON.stringify(card));}catch(e){}
    window.__CRASH_CARD__=card;
    try{console.log('%c CRASH CARD '+card.kind+' ','background:#3a0000;color:#ff3b30;font-weight:bold;border:1px solid #ff3b30;padding:3px 8px','reason='+card.reason+' gpu='+card.gpu+' status='+(card.statusMessage||'-')+' seed='+card.seed);}catch(e){}
    return {ok:true,card:card};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function crashDump(){
  try{
    let raw=null;try{raw=sessionStorage.getItem(CR.key);}catch(e){}
    if(!raw)return {ok:true,card:CR.last,stored:false};
    return {ok:true,card:JSON.parse(raw),stored:true};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function downloadCrashCard(){
  try{
    const d=crashDump();
    if(!d.ok||!d.card)throw new Error('no crash card');
    const r=downloadJSON(d.card,'sun011_crash_card_'+Date.now()+'.json');
    if(!r.ok)showErr('EXPORT FAILED');
    return {ok:!!r.ok,error:r.error||null,card:d.card};
  }catch(e){showErr('EXPORT FAILED');return {ok:false,error:String(e&&e.message||e)};}
}


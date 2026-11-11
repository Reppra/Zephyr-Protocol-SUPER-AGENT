/* ============================ MC (MASCOT) ============================ */
/* work_010 P2/P3: MC.anchor is deck-relative, so the cheese rides the SUPERvm platform and never the ground (C1). */
const MC={on:false,mx:0,my:0,anchor:{x:0,y:0},strikes:0,fixed:0,driftMax:0,deckX:0,until:0,seeded:false};
const MC_DECK={w:150,h:46,cheeseOffX:118,cheeseOffY:-14};
function mcToggle(on,ms){
  try{
    MC.on=on===undefined?!MC.on:!!on;
    MC.until=performance.now()+(ms||30000);
    const d=$('vmDeck'),m=$('mouseMascot');
    if(d)d.classList.toggle('on',MC.on);
    if(m)m.classList.toggle('on',MC.on);
    if(MC.on)MC.seeded=false;else MC.strikes=0;
    return {ok:true,on:MC.on};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function updateMascot(dt){
  try{
    if(!MC.on||G.mode!=='play')return {ok:true,idle:true};
    const deck=$('vmDeck'),ch=$('cheese'),ms=$('mouseMascot');
    if(!deck||!ch||!ms)return {ok:false,error:'mc dom missing'};
    if(performance.now()>MC.until)mcToggle(false,0);
    MC.anchor.x=MC_DECK.cheeseOffX;MC.anchor.y=MC_DECK.cheeseOffY;
    const dr=deck.getBoundingClientRect();
    const tx=dr.left+MC.anchor.x,ty=dr.top+MC.anchor.y;
    if(!MC.seeded){MC.mx=tx-80;MC.my=ty;MC.seeded=true;}
    const sp=Math.min(1,(dt||0.016)*6);
    MC.mx+=(tx-MC.mx)*sp;MC.my+=(ty-MC.my)*sp;
    ms.style.transform='translate('+(MC.mx-7).toFixed(1)+'px,'+(MC.my-5).toFixed(1)+'px)';
    return {ok:true,mx:Math.round(MC.mx),my:Math.round(MC.my)};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function mcOverload(){
  try{return {ok:true,overload:(IN.evHz>240)||(!!ST.mouse&&ST.mouse.n>0&&performance.now()-(ST.mouse.at||0)<5000)};}
  catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function mcDeckFrame(now){
  try{
    const deck=$('vmDeck');
    if(!deck)return {ok:false,error:'no deck'};
    const o=mcOverload();
    MC.deckX=o.overload?Math.sin(now*0.0021)*42:0;
    deck.style.transform='translate('+MC.deckX.toFixed(2)+'px,'+(o.overload?Math.cos(now*0.0017)*8:0).toFixed(2)+'px)';
    const ch=$('cheese');
    if(ch&&deck.classList.contains('on')){
      const dr=deck.getBoundingClientRect(),cr=ch.getBoundingClientRect();
      const drift=Math.abs((cr.left-dr.left)-MC_DECK.cheeseOffX)+Math.abs((cr.top-dr.top)-MC_DECK.cheeseOffY);
      if(drift>MC.driftMax)MC.driftMax=drift;
    }
    return {ok:true,overload:o.overload,driftMax:+MC.driftMax.toFixed(2)};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function mcReAnchor(){
  try{
    const deck=$('vmDeck'),ch=$('cheese');
    if(deck&&ch&&ch.parentElement!==deck)deck.appendChild(ch);
    MC.driftMax=0;
    return {ok:true};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


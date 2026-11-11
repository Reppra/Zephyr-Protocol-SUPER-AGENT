/* ============================ MINIMAP ============================ */
let mmLayer=null,mmSeed=null,mmAcc=0;
function mmTerrain(seed){
  try{
    if(mmLayer&&mmSeed===seed)return mmLayer;
    const c=document.createElement('canvas');c.width=ARENA_W;c.height=ARENA_D;
    const g2=c.getContext('2d');if(!g2)return null;
    const img=g2.createImageData(ARENA_W,ARENA_D);
    for(let z=0;z<ARENA_D;z++)for(let x=0;x<ARENA_W;x++){
      const h=heights[hidx(x,z)];
      const t=Math.max(0,Math.min(1,(h-1)/(MAX_H-1)));
      const o=(z*ARENA_W+x)*4;
      img.data[o]=16+t*26;img.data[o+1]=34+t*58;img.data[o+2]=58+t*86;img.data[o+3]=235;
    }
    g2.putImageData(img,0,0);
    mmLayer=c;mmSeed=seed;return c;
  }catch(e){return null;}
}
function drawMinimap(){
  try{
    const cv=$('minimap');if(!cv)return {ok:false,error:'no minimap canvas'};
    if(!SET.minimap){cv.classList.remove('on');return {ok:true,hidden:true};}
    cv.classList.add('on');
    const ctx=cv.getContext('2d');if(!ctx)return {ok:false,error:'no 2d context'};
    const W2=cv.width,H2=cv.height,sx=W2/ARENA_W,sy=H2/ARENA_D;
    ctx.clearRect(0,0,W2,H2);
    const layer=mmTerrain(G.runSeed||0);
    if(layer){ctx.imageSmoothingEnabled=false;ctx.drawImage(layer,0,0,W2,H2);}
    else{ctx.fillStyle='rgba(20,34,60,.85)';ctx.fillRect(0,0,W2,H2);}
    ctx.fillStyle='#ffb84c';
    for(const p of pickups)ctx.fillRect(p.x*sx-1.5,p.z*sy-1.5,3,3);
    for(const e of enemies){
      if(e.boss){ctx.fillStyle=e.archetype==='lance'?'#b061ff':e.archetype==='hive'?'#ff3b8a':e.archetype==='pyre'?'#ff5a1f':'#ff8a3d';ctx.beginPath();ctx.arc(e.x*sx,e.z*sy,e.archetype==='hive'?4.5:e.archetype==='pyre'?5:3.5,0,6.283);ctx.fill();}
      else if(e.type===7){ctx.fillStyle='#ffd24c';ctx.fillRect(e.x*sx-1,e.z*sy-1,2,2);}
      else if(e.type===8){ctx.fillStyle='#b061ff';ctx.fillRect(e.x*sx-2,e.z*sy-2,4,4);}
      else if(e.type===9){ctx.fillStyle='#ff4cd9';ctx.fillRect(e.x*sx-1.5,e.z*sy-1.5,3,3);}
      else if(e.type===10){ctx.fillStyle='#ffb84c';ctx.fillRect(e.x*sx-2,e.z*sy-2,4,4);
        ctx.strokeStyle='rgba(255,184,76,.55)';ctx.beginPath();ctx.arc(e.x*sx,e.z*sy,(e.aura||6)*sx,0,6.283);ctx.stroke();}
      else{ctx.fillStyle='#ff3b30';ctx.fillRect(e.x*sx-1.5,e.z*sy-1.5,3,3);}
      if(e.elite){ctx.strokeStyle='#ffb84c';ctx.strokeRect(e.x*sx-3,e.z*sy-3,6,6);}
    }
    ctx.save();ctx.translate(player.x*sx,player.z*sy);ctx.rotate(player.yaw);
    ctx.fillStyle='#22e0ff';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(3.5,4);ctx.lineTo(-3.5,4);ctx.closePath();ctx.fill();
    ctx.restore();
    return {ok:true,w:W2,h:H2,sx,sy,px:player.x*sx,py:player.z*sy};
  }catch(e){
    try{$('minimap').classList.remove('on');}catch(e2){}
    return {ok:false,error:String(e&&e.message||e)};
  }
}


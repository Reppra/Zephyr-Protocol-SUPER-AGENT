/* ============================ HUD ============================ */
function showBanner(big,sub){G.banner=2.2;G.bannerText=big;G.bannerSub=sub;const b=$('waveBanner');$('waveBig').textContent=big;$('waveSub').textContent=sub;b.style.opacity='1';}
function showToast(txt){G.toast=1.6;G.toastText=txt;const t=$('powerToast');t.textContent=txt;t.style.opacity='1';}
let fpsAcc=0,fpsFrames=0,fpsShown=0;
function updateBossBar(){
  try{
    const bb=$('bossBar'),fi=$('bossFill');if(!bb||!fi)return {ok:false,error:'missing bossBar'};
    let boss=null;for(const e of enemies)if(e.boss){boss=e;break;}
    if(boss){bb.style.display='block';const pct=Math.max(0,Math.min(100,boss.hp/boss.maxhp*100));fi.style.width=pct+'%';
      const lbl=$('bossLbl');if(lbl)lbl.textContent=boss.archetype==='lance'?t('lance'):boss.archetype==='hive'?t('hive'):boss.archetype==='pyre'?t('pyre'):t('warden');
      return {ok:true,visible:true,width:pct};}
    bb.style.display='none';return {ok:true,visible:false,width:0};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function updateHUD(dt){
  fpsAcc+=dt;fpsFrames++;if(fpsAcc>=0.5){fpsShown=Math.round(fpsFrames/fpsAcc);fpsAcc=0;fpsFrames=0;}
  $('scoreVal').textContent=G.score;$('waveVal').textContent=Math.max(1,G.wave);$('comboVal').textContent='×'+G.combo;
  const hp=Math.max(0,Math.round(player.hp)),mx=(G.derived&&G.derived.maxHp)||100;$('hpFill').style.width=Math.min(100,hp/mx*100)+'%';$('hpTxt').textContent=hp;
  $('hpFill').classList.toggle('low',hp<30);
  const w=WEAPONS[player.wi];
  $('hudAmmo').innerHTML=player.reloading>0?'<b>RELOADING…</b>':
    '<span id="wpnName">'+w.name+'</span> <b id="magVal">'+player.mags[player.wi]+'</b>/'+w.mag+' R:<span id="resVal">'+(player.res[player.wi]===Infinity?'INF':player.res[player.wi])+'</span>';
  $('reloadHint').textContent=player.mags[player.wi]===0&&player.reloading<=0?'[R] reload':'';
  $('perfFps').textContent=fpsShown;$('perfQuads').textContent=quadCount;$('perfEnt').textContent=enemies.length;
  $('hudPos').textContent=Math.round(player.x)+','+Math.round(player.y)+','+Math.round(player.z);
  $('seedVal').textContent=G.runSeed;
  const evEl=$('hudEv');if(evEl)evEl.textContent=IN.evHz;
  const hb=$('hudBiome');if(hb)hb.textContent=biomeDef(biomeFor(G.runSeed|0)).name;
  updateBossBar();syncWeaponBtns();
}


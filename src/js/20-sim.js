/* ============================ SIM / GAMEPLAY ============================ */
const DIFF=[{name:'EASY',count:0.7,speed:0.8,hp:0.8,dmg:0.7},{name:'NORMAL',count:1,speed:1,hp:1,dmg:1},{name:'HARD',count:1.35,speed:1.2,hp:1.3,dmg:1.3}];
const WAVE_CADENCE=[{every:20,boss:'pyre',type:11},{every:15,boss:'hive',type:6},{every:10,boss:'lance',type:5},{every:5,boss:'warden',type:4}];
function waveCadence(w){
  try{
    const wave=Math.max(1,w|0);
    for(const c of WAVE_CADENCE)if(wave%c.every===0)return {ok:true,wave,boss:c.boss,type:c.type};
    return {ok:true,wave,boss:null,type:-1};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function waveSpawnCount(w){
  try{
    const wave=Math.max(1,w|0);
    const base=4+wave*2.2+(wave>=15?(wave-14)*1.5:0);
    return Math.round(base*(DIFF[difficulty]||DIFF[1]).count*(G.dynCount||1));
  }catch(e){return 0;}
}
// work_008 T01: types 8/9/10 (7 is taken by SWARM); plan's 7/8/9 remapped, logged deviation D-W8-01
const ETYPES={turret:{type:8,hp:34,speed:0,size:1.0,dmg:10,color:PAL.magenta,ranged:true},
  dash:{type:9,hp:22,speed:3.4,size:0.9,dmg:16,color:PAL.pink,charge:true},
  shielder:{type:10,hp:40,speed:0.9,size:1.1,dmg:6,color:PAL.amber,aura:6.0}};
const SPAWN_TABLE=[{wave:1,types:[1,2]},{wave:3,types:[1,2,9]},{wave:5,types:[1,2,9,8]},{wave:8,types:[1,2,9,8,10]}];
function spawnTableFor(w){
  try{
    const wave=Math.max(1,w|0);
    let row=SPAWN_TABLE[0];
    for(const s of SPAWN_TABLE)if(wave>=s.wave)row=s;
    return {ok:true,types:row.types.slice()};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function forwardVec(){const cp=Math.cos(player.pitch);return [Math.sin(player.yaw)*cp,Math.sin(player.pitch),-Math.cos(player.yaw)*cp];}
function spawnPlayer(){player.x=ARENA_W/2;player.z=ARENA_D/2;player.y=groundAt(player.x,player.z);player.vx=player.vy=player.vz=0;
  player.yaw=0;player.pitch=0;player.hp=100;player.wi=0;player.mags=WEAPONS.map(w=>w.mag);player.res=WEAPONS.map(w=>w.reserve);player.reloadWi=0;player.reloading=0;player.fireCd=0;player.grounded=true;
  player.rapid=0;player.shield=0;player.dmgBoost=0;player.hurtCd=0;player.mods=WEAPONS.map(()=>null);player.derived=recomputeDerived(player.mods).derived;}
function resetGame(){
  enemies=[];particles=[];pickups=[];tracers=[];eproj=[];glows=[];
  replayLog=null;replayCount=0;replayLook=[0,0];replayLastWi=-1;
  G.score=0;G.combo=1;G.comboTimer=0;G.kills=0;G.wave=0;G.waveState='intermission';G.waveTimer=2.0;
  G.toSpawn=0;G.spawnTimer=0;G.shots=0;G.hits=0;G.wshots=[0,0,0,0];G.whits=[0,0,0,0];G.dmgTaken=0;G.killsBy=[0,0,0,0,0,0,0,0,0,0,0,0];G.archKills={};G.tookDamage=false;G.time=0;G.shake=0;G.muzzle=0;G.hitmark=0;G.rng=G.runSeed||123456789;G.banner=0;G.toast=0;G.dynCount=1;G.waveDmg=0;G.lightsThrottled=0;lightSlowFrames=0;lightFastFrames=0;
  G.perks={};G.perkPending=null;G.noDmgT=0;G.critMark=0;recomputePerks();renderPerkList();
  if($('perkOverlay'))$('perkOverlay').classList.add('hidden');
  syncArenaMesh();
  spawnPlayer();
  G.flags={rerollUsed:false};
  if(!benchRunning){
    if(hasUnlock('startShield'))player.shield=25;
    if(hasUnlock('arcJumpMod'))grantMod(3,'arcJump');
  }
}
function startWave(){
  G.wave++;G.waveState='active';
  if(!benchRunning){
    if(G.wave>=5)unlockAch('wave5');
    if(G.wave>=3&&!G.tookDamage)unlockAch('untouched');
  }
  G.tookDamage=false;
  const d=DIFF[difficulty];
  if(SET.autotune){
    const dmgPrev=Math.max(0,G.dmgTaken-(G.waveDmg||0));
    G.dynCount=(dmgPrev===0&&G.wave>=5)?1.15:(player.hp<30?0.85:1);
    try{console.info('[tune] wave',G.wave,'dmg',Math.round(G.dmgTaken),'dynCount',G.dynCount);}catch(e){}
  }else G.dynCount=1;
  G.waveDmg=G.dmgTaken;
  G.toSpawn=waveSpawnCount(G.wave);
  G.spawnTimer=0.4;
  const cad=waveCadence(G.wave);
  if(cad.boss){spawnBoss();showBanner(t(cad.boss+'Protocol'),t(cad.boss+'Sub'));}
  else showBanner(t('wave')+' '+G.wave,t('hostilesInbound'));
  sfx('wave');
}
function spawnHive(){
  try{
    const d=DIFF[difficulty];
    let bx=ARENA_W/2,bz=ARENA_D*0.25;
    for(let i=0;i<10;i++){
      const tx=6+rand01()*(ARENA_W-12),tz=6+rand01()*(ARENA_D-12);
      if(canStand(tx,tz,groundAt(tx,tz))){bx=tx;bz=tz;break;}
    }
    const hp=(180+G.wave*18)*d.hp;
    enemies.push({x:bx,z:bz,y:groundAt(bx,bz)+1.1,type:6,boss:true,archetype:'hive',hp,maxhp:hp,speed:1.0,size:2.4,
      dmg:20*d.dmg,atkCd:0,bob:rand01()*6.28,flash:0,phase:0,spawnCd:5.5,maxSwarms:8,strafe:rand01()<0.5?-1:1});
    return {ok:true,arch:'hive',type:6,hp:enemies[enemies.length-1].hp};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function spawnPyre(){
  try{
    const d=DIFF[difficulty];
    let bx=ARENA_W/2,bz=ARENA_D*0.25;
    for(let i=0;i<10;i++){
      const tx=6+rand01()*(ARENA_W-12),tz=6+rand01()*(ARENA_D-12);
      if(canStand(tx,tz,groundAt(tx,tz))){bx=tx;bz=tz;break;}
    }
    const hp=520*d.hp;
    enemies.push({x:bx,z:bz,y:groundAt(bx,bz)+1.35,type:11,boss:true,archetype:'pyre',hp,maxhp:hp,speed:0.8,size:3.0,
      dmg:24*d.dmg,atkCd:0,bob:rand01()*6.28,flash:0,phase:1,burstCd:3.2,summonCd:6,shieldT:0,shieldCd:8,
      sweepT:0,sweepCd:7,sweepLock:0,sweepX:0,sweepZ:0,strafe:rand01()<0.5?-1:1});
    return {ok:true,arch:'pyre',type:11,hp:enemies[enemies.length-1].hp,phase:1};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function spawnBoss(){
  try{
    const cad=waveCadence(G.wave);
    if(cad.boss==='pyre')return spawnPyre();
    if(cad.boss==='hive')return spawnHive();
    const d=DIFF[difficulty];
    const lance=cad.boss==='lance';
    let bx=ARENA_W/2,bz=ARENA_D*0.25;
    for(let i=0;i<10;i++){
      const tx=6+rand01()*(ARENA_W-12),tz=6+rand01()*(ARENA_D-12);
      if(canStand(tx,tz,groundAt(tx,tz))){bx=tx;bz=tz;break;}
    }
    if(lance){
      const hp=(220+G.wave*22)*d.hp;
      enemies.push({x:bx,z:bz,y:groundAt(bx,bz)+1.1,type:5,boss:true,archetype:'lance',hp,maxhp:hp,speed:1.1,size:2.2,
        dmg:18*d.dmg,atkCd:0,bob:rand01()*6.28,flash:0,phase:0,beamCd:4,chargeT:0,aimX:0,aimZ:0,strafe:rand01()<0.5?-1:1});
      return {ok:true,arch:'lance',type:5,hp:enemies[enemies.length-1].hp};
    }
    const hp=(260+G.wave*30)*d.hp;
    enemies.push({x:bx,z:bz,y:groundAt(bx,bz)+1.1,type:4,boss:true,archetype:'warden',hp,maxhp:hp,speed:1.4,size:2.6,
      dmg:26*d.dmg,atkCd:0,bob:rand01()*6.28,flash:0,phase:0,volleyCd:6.5,slamCd:4});
    return {ok:true,arch:'warden',type:4,hp:enemies[enemies.length-1].hp};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function spawnEnemy(){
  try{
    const d=DIFF[difficulty];const edge=Math.floor(rand01()*4);let x,z;
    if(edge===0){x=3+rand01()*(ARENA_W-6);z=3;}else if(edge===1){x=3+rand01()*(ARENA_W-6);z=ARENA_D-3;}
    else if(edge===2){x=3;z=3+rand01()*(ARENA_D-6);}else{x=ARENA_W-3;z=3+rand01()*(ARENA_D-6);}
    const tbl=spawnTableFor(G.wave);
    const pool=tbl.ok?tbl.types.filter(v=>v>=8):[];
    if(pool.length&&rand01()<0.28){
      const ty=pool[Math.floor(rand01()*pool.length)];
      const arch=ty===8?'turret':ty===9?'dash':'shielder';
      return spawnEnemyArch(arch,x,z);
    }
    let type=0;const r=rand01();
    if(G.wave>=12){
      if(r<0.30)type=1;else if(r<0.60)type=3;else if(r<0.75)type=2;else type=0;
    }else{
      if(G.wave>=3&&r<0.22)type=1;if(G.wave>=5&&r>0.86)type=2;if(G.wave>=4&&r>=0.22&&r<0.42)type=3;
    }
    const hpScale=Math.min(1+G.wave*0.12,3.0),spScale=Math.min(1+G.wave*0.03,1.6);
    const baseHp=(type===2?70:type===3?16:type===1?24:40)*d.hp*hpScale;
    const speed=(type===1?3.4:type===2?1.9:type===3?1.6:2.3)*d.speed*spScale;
    const elite=G.wave>=6&&rand01()<0.12?['shield','vamp','split'][Math.floor(rand01()*3)]:null;
    enemies.push({x,z,y:groundAt(x,z)+1.1,type,hp:baseHp,maxhp:baseHp,speed,size:type===2?1.5:type===3?0.8:type===1?0.7:1.0,
      dmg:(type===2?22:type===3?6:type===1?8:12)*d.dmg,atkCd:0,bob:rand01()*6.28,flash:0,
      strafe:rand01()<0.5?-1:1,hold:10+rand01()*6,elite,
      shieldHp:elite==='shield'?40:0,shieldMax:40,shieldCd:elite==='shield'?4:0});
    return {ok:true,type,arch:null};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function spawnEnemyArch(arch,x,z){
  try{
    const def=ETYPES[arch];if(!def)return {ok:false,error:'unknown arch '+arch};
    const d=DIFF[difficulty];
    if(x===undefined||z===undefined){
      const edge=Math.floor(rand01()*4);
      if(edge===0){x=3+rand01()*(ARENA_W-6);z=3;}else if(edge===1){x=3+rand01()*(ARENA_W-6);z=ARENA_D-3;}
      else if(edge===2){x=3;z=3+rand01()*(ARENA_D-6);}else{x=ARENA_W-3;z=3+rand01()*(ARENA_D-6);}
    }
    x=clamp(x,3,ARENA_W-3);z=clamp(z,3,ARENA_D-3);
    const hpScale=Math.min(1+G.wave*0.12,3.0),spScale=Math.min(1+G.wave*0.03,1.6);
    const hp=def.hp*d.hp*hpScale;
    const elite=G.wave>=6&&rand01()<0.12?['shield','vamp','split'][Math.floor(rand01()*3)]:null;
    enemies.push({x,z,y:groundAt(x,z)+1.1,type:def.type,archetype:arch,hp,maxhp:hp,speed:def.speed*d.speed*spScale,size:def.size,
      dmg:def.dmg*d.dmg,atkCd:arch==='turret'?1.6:0,bob:rand01()*6.28,flash:0,strafe:rand01()<0.5?-1:1,hold:12,elite,
      shieldHp:elite==='shield'?40:0,shieldMax:40,shieldCd:elite==='shield'?4:0,
      ranged:!!def.ranged,aura:def.aura||0,dashState:'stalk',dashT:2.0,dashVec:[0,0],dashMul:4,windupFlash:0,shielded:false});
    return {ok:true,type:def.type,arch};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function burst(x,y,z,col,n,spd){for(let i=0;i<n;i++){const a=rand01()*6.283,e=(rand01()-0.5)*3.14;const s=spd*(0.4+rand01());
  particles.push({x,y,z,vx:Math.cos(a)*Math.cos(e)*s,vy:Math.sin(e)*s+1.5,vz:Math.sin(a)*Math.cos(e)*s,life:0.5+rand01()*0.5,max:1,size:0.12+rand01()*0.18,col,glow:1});}}
function wallRayT(eye,dir,maxT){
  for(let t=0.5;t<maxT;t+=0.4){const px=eye[0]+dir[0]*t,py=eye[1]+dir[1]*t,pz=eye[2]+dir[2]*t;
    if(blockAt(Math.floor(px),Math.floor(py),Math.floor(pz)))return t;}
  return maxT;
}
function rayHits(eye,dir,maxT){
  const hits=[];
  for(const e of enemies){
    const oc=[e.x-eye[0],e.y-eye[1],e.z-eye[2]];const t=v3dot(oc,dir);if(t<0||t>maxT)continue;
    const px=eye[0]+dir[0]*t,py=eye[1]+dir[1]*t,pz=eye[2]+dir[2]*t;
    const d2=(px-e.x)**2+(py-e.y)**2+(pz-e.z)**2;const rad=e.size*0.75+0.25;
    if(d2<rad*rad)hits.push({e,t});
  }
  hits.sort((a,b)=>a.t-b.t);
  return hits;
}
function fire(){
  try{
    if(player.reloading>0||player.fireCd>0)return {ok:false,error:'busy'};
    const w=WEAPONS[player.wi];
    if(player.mags[player.wi]<=0){reload();return {ok:false,error:'empty'};}
    player.mags[player.wi]--;
    telemetryRecord('shot',player.wi);
    player.fireCd=(player.rapid>0?Math.min(0.09,w.cd):w.cd)*((player.derived&&player.derived[player.wi]||{}).cdMul||1)*((G.derived&&G.derived.cdMul)||1);
    G.muzzle=1;G.shake=Math.min(G.shake+0.5,1.2);
    if(TP.captured&&(touch.fireTouch||touch.fire))G.shake=0;
    sfx(player.wi===1?'scatter':player.wi===2?'rail':player.wi===3?'arc':'shoot');
    if(player.wi===3){
      const ar=fireArc();
      if(player.mags[player.wi]<=0)reload();
      return ar.ok?{ok:true,wi:3,mag:player.mags[3],chain:ar.hits}:ar;
    }
    const eye=[player.x,player.y+EYE_H,player.z];const base=forwardVec();
    const drl=Math.hypot(base[0],base[2])||1;const mrx=-base[2]/drl,mrz=base[0]/drl;
    let landed=false,hitCount=0;
    const critCh=(G.derived&&G.derived.crit)||0;const crit=critCh>0&&rand01()<critCh;
    for(let p=0;p<w.pellets;p++){
      let dir=base;
      if(w.spread>0){
        const ang=(rand01()-0.5)*2*w.spread;
        const ca=Math.cos(ang),sa=Math.sin(ang);
        const rx=base[0]*ca-base[2]*sa,rz=base[0]*sa+base[2]*ca;
        dir=v3norm([rx,base[1]+(rand01()-0.5)*w.spread*0.5,rz]);
      }
      const cand=rayHits(eye,dir,90);
      const firstT=cand.length?cand[0].t:90;
      const wallT=wallRayT(eye,dir,Math.min(w.pierce?90:firstT,90));
      const endT=w.pierce?wallT:Math.min(firstT,wallT);
      const beams=w.pierce?3:1;
      for(let b=0;b<beams;b++){
        const off=(b-(beams-1)/2)*0.06;
        tracers.push({x0:eye[0]+dir[0]*0.8+mrx*off,y0:eye[1]-0.28,z0:eye[2]+dir[2]*0.8+mrz*off,
          x1:eye[0]+dir[0]*endT+mrx*off,y1:eye[1]+dir[1]*endT,z1:eye[2]+dir[2]*endT+mrz*off,life:w.pierce?0.12:0.07});
      }
      for(const h of cand){
        if(h.t>wallT)break;
        const dmg=Math.round((w.dmg+Math.floor(rand01()*w.dmgVar))*(player.dmgBoost>0?2:1)*((player.derived&&player.derived[player.wi]||{}).dmgMul||1)*((G.derived&&G.derived.dmgMul)||1)*(crit?2:1));
        const r=applyDamage(h.e,dmg);
        if(r.dealt){landed=true;hitCount++;sfx('hit');burst(h.e.x,h.e.y,h.e.z,PAL.amber,w.pierce?7:5,3);}
        if(!w.pierce)break;
      }
    }
    if(landed)telemetryRecord('hit',player.wi);
    if(landed&&crit)G.critMark=0.3;
    if(!benchRunning&&w.pierce&&hitCount>=3)unlockAch('triple');
    if(player.mags[player.wi]<=0)reload();
    return {ok:true,wi:player.wi,mag:player.mags[player.wi]};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function killEnemy(e){
  const i=enemies.indexOf(e);if(i<0)return;enemies.splice(i,1);
  G.kills++;G.combo=Math.min(G.combo+1,9);G.comboTimer=3+((G.derived&&G.derived.comboGrace)||0);telemetryRecord('kill',e);
  if(G.derived&&G.derived.vamp>0)player.hp=Math.min(G.derived.maxHp,player.hp+G.derived.vamp);
  if(!benchRunning){
    if(G.kills===1)unlockAch('firstblood');
    if(G.kills>=50)unlockAch('rampage50');
    if(e.boss)unlockAch('warden');
    if(G.combo>=8)unlockAch('chain8');
  }
  const pts=(e.type===10?110:e.type===8?90:e.type===9?70:e.type===7?70:e.type===3?80:e.type===2?150:e.type===1?60:40)*G.combo;G.score+=pts;
  burst(e.x,e.y,e.z,e.type===2?PAL.magenta:e.type===6?PAL.orange:e.type===7?PAL.amber:e.type===8?PAL.magenta:e.type===9?PAL.pink:e.type===10?PAL.amber:PAL.cyan,18,5);sfx('kill');G.shake=Math.min(G.shake+0.4,1.4);
  if(e.archetype&&ETYPES[e.archetype]&&!benchRunning){
    G.archKills=G.archKills||{};
    if(!G.archKills[e.archetype]){G.archKills[e.archetype]=1;showToast(t(e.archetype+'Name')+' '+t('archDown'));}
  }
  if(e.boss){
    const arch=e.archetype;
    G.score+=arch==='pyre'?400:arch==='hive'?350:arch==='lance'?300:250;
    pickups.push({x:e.x-1.2,z:e.z,y:groundAt(e.x-1.2,e.z)+0.7,kind:0,life:15+((G.derived&&G.derived.pickGrace)||0)});
    pickups.push({x:e.x+1.2,z:e.z,y:groundAt(e.x+1.2,e.z)+0.7,kind:arch==='lance'||arch==='pyre'?4:1,life:15+((G.derived&&G.derived.pickGrace)||0)});
    burst(e.x,e.y,e.z,PAL.orange,32,6);showToast(t(arch==='pyre'?'pyreDown':arch==='hive'?'hiveDown':arch==='lance'?'lanceDown':'wardenDown'));sfx('boss');hapticFire(40);
    if(arch==='pyre'&&!benchRunning)unlockAch('pyre');
  }
  if(e.elite==='split'&&!e.child){
    for(let i=0;i<2;i++){
      const cx=e.x+(i?0.8:-0.8),cz=e.z;
      enemies.push({x:cx,z:cz,y:groundAt(cx,cz)+1.1,type:e.type,hp:e.maxhp*0.4,maxhp:e.maxhp*0.4,speed:e.speed*1.1,
        size:e.size*0.75,dmg:e.dmg*0.6,atkCd:0,bob:rand01()*6.28,flash:0,strafe:rand01()<0.5?-1:1,
        hold:10+rand01()*6,elite:null,child:true,shieldHp:0,shieldMax:0,shieldCd:0});
    }
  }
  if(rand01()<0.16){const kind=Math.floor(rand01()*5);pickups.push({x:e.x,z:e.z,y:groundAt(e.x,e.z)+0.7,kind,life:12+((G.derived&&G.derived.pickGrace)||0)});}
}
function reload(){
  const w=WEAPONS[player.wi];
  if(player.reloading>0||player.mags[player.wi]>=w.mag)return;
  if(player.res[player.wi]<=0){showToast(t('noAmmo'));return;}
  player.reloadWi=player.wi;player.reloading=w.rel*((G.derived&&G.derived.relMul)||1);sfx('reload');
}
function damagePlayer(dmg){
  G.tookDamage=true;G.noDmgT=0;
  if(player.shield>0){player.shield=Math.max(0,player.shield-dmg*0.5);dmg*=0.3;}
  if(player.hurtCd>0)return;player.hurtCd=0.4;
  const hpBefore=player.hp;player.hp-=dmg;telemetryRecord('damage',Math.max(0,hpBefore-player.hp));G.combo=1;G.comboTimer=0;G.shake=Math.min(G.shake+0.8,1.6);sfx('hurt');hapticFire(24);
  const d=$('damage');d.style.opacity='0.9';setTimeout(()=>{d.style.opacity='0';},180);
  if(player.hp<=0){player.hp=0;endGame();}
}
function applyPickup(p){
  const mx=(G.derived&&G.derived.maxHp)||100;
  if(p.kind===0){player.hp=Math.min(mx,player.hp+30);showToast(t('pickupHealth'));}
  else if(p.kind===1){player.rapid=8;showToast(t('rapidFire'));}
  else if(p.kind===2){player.shield=60;showToast(t('shield'));}
  else if(p.kind===3){player.dmgBoost=8;showToast(t('doubleDamage'));}
  else{const gain=[0,12,3,6];for(let i=1;i<4;i++)player.res[i]+=Math.min(gain[i],Math.max(0,WEAPONS[i].max-player.res[i]));showToast(t('ammoCell'));}
  sfx('pickup');burst(p.x,p.y,p.z,PAL.green,12,4);
}
function canStand(x,z,refY){const ry=refY===undefined?player.y:refY;if(x<2.5||z<2.5||x>ARENA_W-2.5||z>ARENA_D-2.5)return false;
  const g=groundAt(x,z);return g-ry<=1.15;}
function updatePlayer(dt){
  const f=forwardVec();const fx=f[0],fz=f[2];const fl=Math.hypot(fx,fz)||1;
  const fwd=[fx/fl,0,fz/fl],right=[-fwd[2],0,fwd[0]];
  let ix=0,iz=0;
  if(keys['KeyW']||keys['ArrowUp'])iz+=1;if(keys['KeyS']||keys['ArrowDown'])iz-=1;
  if(keys['KeyD']||keys['ArrowRight'])ix+=1;if(keys['KeyA']||keys['ArrowLeft'])ix-=1;
  ix+=touch.mx;iz+=-touch.mz;
  const il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il;}
  const sprint=(keys['ShiftLeft']||keys['ShiftRight'])?1.6:1;
  const spd=6.2*sprint*((G.derived&&G.derived.moveMul)||1);
  const wx=(fwd[0]*iz+right[0]*ix)*spd,wz=(fwd[2]*iz+right[2]*ix)*spd;
  player.vx=lerp(player.vx,wx,Math.min(1,dt*12));player.vz=lerp(player.vz,wz,Math.min(1,dt*12));
  let nx=player.x+player.vx*dt,nz=player.z+player.vz*dt;
  if(canStand(nx,player.z))player.x=nx;else player.vx=0;
  if(canStand(player.x,nz))player.z=nz;else player.vz=0;
  const g=groundAt(player.x,player.z);
  if((keys['Space']||touch.jump)&&player.grounded){player.vy=7.2;player.grounded=false;touch.jump=false;}
  player.vy-=22*dt;player.y+=player.vy*dt;
  if(player.y<=g){player.y=g;player.vy=0;player.grounded=true;}
  if(player.y>g+0.05)player.grounded=false;
  player.fireCd=Math.max(0,player.fireCd-dt);player.hurtCd=Math.max(0,player.hurtCd-dt);
  player.rapid=Math.max(0,player.rapid-dt);player.dmgBoost=Math.max(0,player.dmgBoost-dt);
  G.noDmgT+=dt;
  const regen=(G.derived&&G.derived.shieldRegen)||0;
  if(regen>0&&G.noDmgT>=5)player.shield=Math.min(60,player.shield+regen*dt);
  else player.shield=Math.max(0,player.shield-dt*4);
  if(player.reloading>0){player.reloading-=dt;if(player.reloading<=0){
    const wi=player.reloadWi,w=WEAPONS[wi];
    const take=Math.min(w.mag-player.mags[wi],player.res[wi]);
    player.mags[wi]+=take;if(player.res[wi]!==Infinity)player.res[wi]-=take;
    player.reloading=0;
  }}
  if((keys['KeyR'])&&player.mags[player.wi]<WEAPONS[player.wi].mag)reload();
  if(touch.fire||touch.fireTouch||keys['Mouse0'])fire();
}
function spawnProjectile(x,y,z,vx,vy,vz,life,size,col){
  try{eproj.push({x,y,z,vx,vy,vz,life:life||2.5,size:size||0.16,col:col||PAL.magenta});return {ok:true,index:eproj.length-1};}
  catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function updateBoss(e,dt,dx,dz,d){
  try{
    const nx=e.x+(dx/d)*e.speed*dt,nz=e.z+(dz/d)*e.speed*dt;
    const g=groundAt(nx,nz);
    if(g-e.y<=2.8){e.x=nx;e.z=nz;}
    e.y=lerp(e.y,g+1.35,Math.min(1,dt*3));
    e.atkCd=Math.max(0,e.atkCd-dt);e.flash=Math.max(0,e.flash-dt);
    e.volleyCd-=dt;e.slamCd-=dt;
    if(e.volleyCd<=0){
      const base=Math.atan2(dz,dx);
      for(let i=0;i<8;i++){
        const a=base+i*Math.PI/4;
        spawnProjectile(e.x,Math.max(e.y,player.y)+1.0,e.z,Math.cos(a)*9,0,Math.sin(a)*9,2.6,0.22,PAL.orange);
      }
      e.volleyCd=6.5;burst(e.x,e.y,e.z,PAL.orange,10,4);sfx('stinger');
    }
    if(e.slamCd<=0){
      const tx=player.x-(dx/d)*6,tz=player.z-(dz/d)*6;
      if(canStand(tx,tz)){e.x=tx;e.z=tz;e.y=groundAt(tx,tz)+1.35;}
      burst(e.x,e.y,e.z,PAL.red,20,5);G.shake=1.2;e.slamCd=4;sfx('hurt');
    }
    if(d<e.size*0.6+1.0&&e.atkCd<=0){damagePlayer(e.dmg);e.atkCd=1.1;}
    return {ok:true};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updateTurret(e,dt,dx,dz,d){
  try{
    e.atkCd=Math.max(0,e.atkCd-dt);e.flash=Math.max(0,e.flash-dt);
    if(e.atkCd<=0&&d<30){
      const eye=[e.x,e.y+0.6,e.z];
      const dir=v3norm([player.x-e.x,(player.y+EYE_H*0.7)-(e.y+0.6),player.z-e.z]);
      if(wallRayT(eye,dir,d)>=d-0.5){
        const px=player.x+player.vx*0.35,pz=player.z+player.vz*0.35;
        const aim=v3norm([px-e.x,(player.y+1.0)-(e.y+0.6),pz-e.z]);
        spawnProjectile(e.x,e.y+0.6,e.z,aim[0]*12,aim[1]*12,aim[2]*12,2.8,0.18,PAL.magenta);
        e.atkCd=1.6;sfxAt('tshot',e.x,e.z);
      }else e.atkCd=0.4;
    }
    return {ok:true,immobile:true};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updateDash(e,dt,dx,dz,d){
  try{
    e.atkCd=Math.max(0,e.atkCd-dt);e.flash=Math.max(0,e.flash-dt);
    e.dashT=(e.dashT||0)-dt;
    if(e.dashState==='stalk'){
      const nx=e.x+(dx/d)*e.speed*dt,nz=e.z+(dz/d)*e.speed*dt;
      const g=groundAt(nx,nz);
      if(g-e.y<=2.2){e.x=nx;e.z=nz;}
      e.y=lerp(e.y,g+1.1,Math.min(1,dt*4));
      if(e.dashT<=0){e.dashState='windup';e.dashT=0.5;e.dashVec=[dx/d,dz/d];sfxAt('windup',e.x,e.z);}
    }else if(e.dashState==='windup'){
      e.windupFlash=0.5;
      if(e.dashT<=0){e.dashState='dash';e.dashT=0.35;}
    }else{
      const sp=e.speed*(e.dashMul||6);
      const nx=e.x+e.dashVec[0]*sp*dt,nz=e.z+e.dashVec[1]*sp*dt;
      const g=groundAt(nx,nz);
      if(g-e.y<=2.2){e.x=nx;e.z=nz;}
      e.y=lerp(e.y,g+1.1,Math.min(1,dt*4));
      const cd=Math.hypot(player.x-e.x,player.z-e.z);
      if(cd<e.size*0.6+0.8&&e.atkCd<=0){damagePlayer(e.dmg);e.atkCd=0.9;e.dashState='stalk';e.dashT=2.0;}
      else if(e.dashT<=0){e.dashState='stalk';e.dashT=2.0;}
    }
    e.windupFlash=Math.max(0,(e.windupFlash||0)-dt);
    return {ok:true,state:e.dashState};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updateShielder(e,dt){
  try{
    const a2=(e.aura||6)*(e.aura||6);
    let n=0;
    for(const o of enemies){
      if(o===e||o.boss)continue;
      const ddx=o.x-e.x,ddz=o.z-e.z;
      if(ddx*ddx+ddz*ddz<a2){o.shielded=true;n++;}
    }
    e.humCd=Math.max(0,(e.humCd||0)-dt);
    if(n>0&&e.humCd<=0){e.humCd=2.4;sfxAt('hum',e.x,e.z);}
    return {ok:true,shielded:n};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updateEnemies(dt){
  for(const e of enemies)e.shielded=false;
  for(const e of enemies){
    const dx=player.x-e.x,dz=player.z-e.z;const d=Math.hypot(dx,dz)||1;
    if(e.elite==='shield'){
      e.shieldCd=Math.max(0,(e.shieldCd||0)-dt);
      if(e.shieldCd<=0&&e.shieldHp<e.shieldMax)e.shieldHp=Math.min(e.shieldMax,e.shieldHp+8*dt);
    }
    if(e.boss){
      if(e.archetype==='lance')updateLance(e,dt,dx,dz,d);
      else if(e.archetype==='hive')updateHive(e,dt,dx,dz,d);
      else if(e.archetype==='pyre')updatePyre(e,dt,dx,dz,d);
      else updateBoss(e,dt,dx,dz,d);
      continue;
    }
    if(e.ranged){updateTurret(e,dt,dx,dz,d);continue;}
    if(e.archetype==='dash'){updateDash(e,dt,dx,dz,d);continue;}
    if(e.archetype==='shielder')updateShielder(e,dt);
    if(e.type===3){
      const keep=e.hold||13;
      const radial=d>keep+2?1:(d<keep-2?-1:0);
      let mx=(dx/d)*radial*0.65-(dz/d)*(e.strafe||1)*0.9,mz=(dz/d)*radial*0.65+(dx/d)*(e.strafe||1)*0.9;
      const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;
      const nx=e.x+mx*e.speed*dt,nz=e.z+mz*e.speed*dt;
      const g=groundAt(nx,nz);
      if(g-e.y<=2.2){e.x=nx;e.z=nz;}
      e.y=lerp(e.y,g+0.9,Math.min(1,dt*4));
      e.atkCd=Math.max(0,e.atkCd-dt);e.flash=Math.max(0,e.flash-dt);
      if(e.atkCd<=0&&d<26){
        const dir=v3norm([player.x-e.x,(player.y+EYE_H)-(e.y+0.6),player.z-e.z]);
        spawnProjectile(e.x,e.y+0.6,e.z,dir[0]*14,dir[1]*14,dir[2]*14,2.5,0.16,PAL.magenta);
        e.atkCd=2.2;sfx('stinger');
      }
      if(d<e.size*0.6+0.7&&e.atkCd<=0){damagePlayer(e.dmg);if(e.elite==='vamp'){e.hp=Math.min(e.maxhp,e.hp+15);e.flash=0.12;}e.atkCd=0.9;e.x-=(dx/d)*1.2;e.z-=(dz/d)*1.2;}
      continue;
    }
    const nx=e.x+(dx/d)*e.speed*dt,nz=e.z+(dz/d)*e.speed*dt;
    const g=groundAt(nx,nz);
    if(g-e.y<=2.2){e.x=nx;e.z=nz;}
    e.y=lerp(e.y,g+1.1,Math.min(1,dt*4));
    e.atkCd=Math.max(0,e.atkCd-dt);e.flash=Math.max(0,e.flash-dt);
    if(d<e.size*0.6+0.7&&e.atkCd<=0){damagePlayer(e.dmg);if(e.elite==='vamp'){e.hp=Math.min(e.maxhp,e.hp+15);e.flash=0.12;}e.atkCd=0.9;
      e.x-=(dx/d)*1.4;e.z-=(dz/d)*1.4;}
  }
}
function beamHit(x0,z0,x1,z1,px,pz,w){
  try{
    const dx=x1-x0,dz=z1-z0;const L2=dx*dx+dz*dz;
    let t=L2>0?((px-x0)*dx+(pz-z0)*dz)/L2:0;
    t=Math.max(0,Math.min(1,t));
    const cx=x0+dx*t,cz=z0+dz*t;
    return Math.hypot(px-cx,pz-cz)<=Math.max(0,+w||0);
  }catch(e){return false;}
}
function updateLance(e,dt,dx,dz,d){
  try{
    e.flash=Math.max(0,e.flash-dt);e.atkCd=Math.max(0,e.atkCd-dt);
    if(e.chargeT>0){
      e.chargeT+=dt;
      if(e.chargeT<0.75){e.aimX=player.x;e.aimZ=player.z;}
      tracers.push({x0:e.x,y0:e.y,z0:e.z,x1:e.aimX,y1:player.y+1,z1:e.aimZ,life:0.12,col:PAL.amber});
      if(e.chargeT>=1.0){
        const hit=beamHit(e.x,e.z,e.aimX,e.aimZ,player.x,player.z,1.2);
        tracers.push({x0:e.x,y0:e.y,z0:e.z,x1:e.aimX,y1:player.y+1,z1:e.aimZ,life:0.18,col:PAL.red});
        if(hit)damagePlayer(34*(DIFF[difficulty]||DIFF[1]).dmg);
        G.shake=Math.max(G.shake,1.0);sfx('rail');
        e.chargeT=0;e.beamCd=5;
      }
      return {ok:true,phase:'charge',t:e.chargeT};
    }
    const radial=d>20?1:(d<14?-1:0);
    let mx=(dx/d)*radial*0.8-(dz/d)*(e.strafe||1)*0.7;
    let mz=(dz/d)*radial*0.8+(dx/d)*(e.strafe||1)*0.7;
    const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;
    const nx=e.x+mx*e.speed*dt,nz=e.z+mz*e.speed*dt;
    const g=groundAt(nx,nz);
    if(g-e.y<=2.8){e.x=nx;e.z=nz;}
    e.y=lerp(e.y,groundAt(e.x,e.z)+1.35,Math.min(1,dt*3));
    e.beamCd-=dt;
    if(e.beamCd<=0){e.chargeT=0.0001;e.aimX=player.x;e.aimZ=player.z;}
    return {ok:true,phase:'reposition'};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updateHive(e,dt,dx,dz,d){
  try{
    e.flash=Math.max(0,e.flash-dt);e.atkCd=Math.max(0,e.atkCd-dt);
    const radial=d>22?1:(d<16?-1:0);
    let mx=(dx/d)*radial*0.7-(dz/d)*(e.strafe||1)*0.6,mz=(dz/d)*radial*0.7+(dx/d)*(e.strafe||1)*0.6;
    const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;
    const nx=e.x+mx*e.speed*dt,nz=e.z+mz*e.speed*dt;
    const g=groundAt(nx,nz);
    if(g-e.y<=2.8){e.x=nx;e.z=nz;}
    e.y=lerp(e.y,groundAt(e.x,e.z)+1.35,Math.min(1,dt*3));
    e.spawnCd=(e.spawnCd===undefined?5.5:e.spawnCd)-dt;
    const swarmAlive=enemies.filter(x=>x.swarm).length;
    if(e.spawnCd<=0&&swarmAlive<(e.maxSwarms||8)){
      const hpScale=Math.min(1+G.wave*0.12,3.0);
      for(let i=0;i<3;i++){
        const a=(i/3)*6.283+rand01()*0.5,r=2.2+rand01()*1.2;
        const sx=Math.max(2.6,Math.min(ARENA_W-2.6,e.x+Math.cos(a)*r));
        const sz=Math.max(2.6,Math.min(ARENA_D-2.6,e.z+Math.sin(a)*r));
        enemies.push({x:sx,z:sz,y:groundAt(sx,sz)+0.75,type:7,hp:10*hpScale,maxhp:10*hpScale,speed:3.8,size:0.55,
          dmg:4*(DIFF[difficulty]||DIFF[1]).dmg,atkCd:0,bob:rand01()*6.28,flash:0,strafe:rand01()<0.5?-1:1,
          hold:8,elite:null,swarm:true,shieldHp:0,shieldMax:0,shieldCd:0});
      }
      e.spawnCd=5.5;burst(e.x,e.y,e.z,PAL.amber,14,4);sfx('stinger');
    }
    if(d<e.size*0.6+1.0&&e.atkCd<=0){damagePlayer(e.dmg);e.atkCd=1.2;}
    return {ok:true,swarm:swarmAlive,spawnCd:e.spawnCd};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updatePyre(e,dt,dx,dz,d){
  try{
    e.flash=Math.max(0,e.flash-dt);e.atkCd=Math.max(0,e.atkCd-dt);
    const frac=e.hp/e.maxhp;
    const ph=frac>0.66?1:frac>0.33?2:3;
    if(ph!==e.phase){
      e.phase=ph;
      if(ph===2){e.speed=1.4;showBanner(t('pyre')+' · '+t('pyreEnrage'),t('pyreSub'));}
      if(ph===3){e.speed=1.0;e.shieldCd=Math.min(e.shieldCd,2);}
      burst(e.x,e.y,e.z,PAL.red,24,6);sfx('boss');
    }
    const nx=e.x+(dx/d)*e.speed*dt,nz=e.z+(dz/d)*e.speed*dt;
    const g=groundAt(nx,nz);
    if(g-e.y<=2.8){e.x=nx;e.z=nz;}
    e.y=lerp(e.y,g+1.35,Math.min(1,dt*3));
    e.burstCd-=dt;
    if(e.burstCd<=0){
      const n=e.phase>=2?16:10,base=rand01()*6.283;
      for(let i=0;i<n;i++){
        const a=base+i*6.283/n;
        spawnProjectile(e.x,e.y+1.0,e.z,Math.cos(a)*8.5,0,Math.sin(a)*8.5,3.0,0.22,PAL.orange);
      }
      e.burstCd=3.2;burst(e.x,e.y,e.z,PAL.orange,12,4);sfx('stinger');
    }
    e.summonCd-=dt;
    const summons=enemies.filter(x=>x.summoned).length;
    if(e.summonCd<=0&&summons<6){
      if(e.phase<3){
        for(let i=0;i<2&&summons+i<6;i++){const r=spawnEnemyArch('dash',e.x+(i?2.5:-2.5),e.z+2);if(r.ok)enemies[enemies.length-1].summoned=true;}
        e.summonCd=6;
      }else{
        if(summons<5){
          const a=spawnEnemyArch('shielder',e.x+2.5,e.z+2);if(a.ok)enemies[enemies.length-1].summoned=true;
          const b=spawnEnemyArch('turret',e.x-2.5,e.z+2);if(b.ok)enemies[enemies.length-1].summoned=true;
        }
        e.summonCd=8;
      }
      burst(e.x,e.y,e.z,PAL.amber,10,4);
    }
    if(e.phase>=2){
      e.sweepCd-=dt;
      if(e.sweepT>0){
        e.sweepT-=dt;
        if(e.sweepT>0.4){e.sweepX=player.x;e.sweepZ=player.z;}
        else if(!e.sweepHit){
          e.sweepHit=true;
          if(beamHit(e.x,e.z,e.sweepX,e.sweepZ,player.x,player.z,1.2))damagePlayer(25*(DIFF[difficulty]||DIFF[1]).dmg);
          burst(e.sweepX,groundAt(e.sweepX,e.sweepZ)+0.5,e.sweepZ,PAL.red,16,5);sfxAt('sweep',e.x,e.z);
        }
        tracers.push({x0:e.x,y0:e.y+0.8,z0:e.z,x1:e.sweepX,y1:groundAt(e.sweepX,e.sweepZ)+0.4,z1:e.sweepZ,life:0.08});
        if(e.sweepT<=0){e.sweepT=0;e.sweepHit=false;e.sweepCd=7;}
      }else if(e.sweepCd<=0){e.sweepT=1.9;e.sweepHit=false;e.sweepX=player.x;e.sweepZ=player.z;sfx('stinger');}
    }
    if(e.phase===3){
      e.shieldCd-=dt;
      if(e.shieldT>0)e.shieldT=Math.max(0,e.shieldT-dt);
      else if(e.shieldCd<=0){e.shieldT=1.5;e.shieldCd=8;burst(e.x,e.y,e.z,PAL.cyan,14,4);}
    }
    if(d<e.size*0.6+1.0&&e.atkCd<=0){damagePlayer(e.dmg);e.atkCd=1.2;}
    return {ok:true,phase:e.phase,shield:e.shieldT>0,summons};
  }catch(err){return {ok:false,error:String(err&&err.message||err)};}
}
function updateProjectiles(dt){
  for(let i=eproj.length-1;i>=0;i--){
    const p=eproj[i];p.life-=dt;
    if(p.life<=0){eproj.splice(i,1);continue;}
    const spd=Math.hypot(p.vx,p.vy,p.vz)||1;
    const steps=Math.max(1,Math.ceil(spd*dt/0.25));
    let gone=false;
    for(let s=0;s<steps;s++){
      p.x+=p.vx*dt/steps;p.y+=p.vy*dt/steps;p.z+=p.vz*dt/steps;
      if(p.y<groundAt(p.x,p.z)||blockAt(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z))){gone=true;break;}
      const ty=player.y+1.0;
      if(Math.abs(p.y-ty)<1.1&&Math.hypot(p.x-player.x,p.z-player.z)<0.55+p.size){
        damagePlayer(9*DIFF[difficulty].dmg);burst(p.x,p.y,p.z,PAL.magenta,6,3);gone=true;break;
      }
    }
    if(gone)eproj.splice(i,1);
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}
    p.vy-=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.size*=0.985;}
  for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0)tracers.splice(i,1);}
  for(let i=glows.length-1;i>=0;i--){glows[i].life-=dt;if(glows[i].life<=0)glows.splice(i,1);}
  for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;if(p.life<=0){pickups.splice(i,1);continue;}
    if(Math.hypot(p.x-player.x,p.z-player.z)<1.3+((G.derived&&G.derived.pickGrace)>0?2:0)&&Math.abs(p.y-player.y)<2.5){applyPickup(p);pickups.splice(i,1);}}
}
function updateWaves(dt){
  if(G.waveState==='intermission'){G.waveTimer-=dt;if(G.waveTimer<=0)startWave();return;}
  if(G.toSpawn>0){
    if(enemies.length>=Math.round(24*DIFF[difficulty].count)){G.spawnTimer=0.25;return;}
    G.spawnTimer-=dt;if(G.spawnTimer<=0){spawnEnemy();G.toSpawn--;G.spawnTimer=Math.max(0.25,1.1-G.wave*0.05);}
  }
  else if(enemies.length===0){G.waveState='intermission';G.waveTimer=3.2;G.score+=G.wave*50;
    player.hp=Math.min((G.derived&&G.derived.maxHp)||100,player.hp+12);showBanner(t('wave')+' '+G.wave+' '+t('waveCleared'),'+'+(G.wave*50)+' '+t('bonus'));sfx('wave');
    if(!benchRunning&&!gameOver&&G.mode!=='playback'){const r=rollPerks();if(r.ok&&r.choices.length){G.perkPending=r.choices;paused=true;G.mode='paused';duckMusic(true);if(document.pointerLockElement)document.exitPointerLock();clearInput();showPerkOverlay(r.choices);}}}
}
function updateFX(dt){
  G.shake=Math.max(0,G.shake-dt*3);G.muzzle=Math.max(0,G.muzzle-dt*8);G.hitmark=Math.max(0,G.hitmark-dt*4);G.critMark=Math.max(0,(G.critMark||0)-dt*3);
  G.comboTimer=Math.max(0,G.comboTimer-dt);if(G.comboTimer<=0&&G.combo>1)G.combo=1;
  if(MD.on)setIntensity(computeIntensity());
  if(G.banner>0){G.banner-=dt;if(G.banner<=0)$('waveBanner').style.opacity='0';}
  if(G.toast>0){G.toast-=dt;if(G.toast<=0)$('powerToast').style.opacity='0';}
  $('hitmarker').style.opacity=G.hitmark>0?String(G.hitmark):'0';
  $('hitmarker').style.transform='translate(-50%,-50%) rotate(45deg) scale('+(G.critMark>0?1.6:1)+')';
  $('lowhp').style.opacity=player.hp<30&&gameStarted&&!gameOver?'1':'0';
}
function updateGame(dt){
  G.time+=dt;
  recordReplayFrame(dt);
  updatePlayer(dt);updateEnemies(dt);updateProjectiles(dt);updateParticles(dt);updateWaves(dt);updateFX(dt);
}
function endGame(){
  const inPB=G.mode==='playback';
  gameOver=true;if(!inPB)G.mode='gameover';sfx('over');hapticFire(60);stopMusicDirector();duckMusic(false);
  if(replayLog)replayLog.summary={score:G.score,kills:G.kills,waves:G.wave,time:+G.time.toFixed(3)};
  if(document.pointerLockElement)document.exitPointerLock();
  if(!inPB)bestScore=Math.max(bestScore,G.score);
  if(!benchRunning&&!inPB){
    saveScore({score:G.score,wave:Math.max(1,G.wave),kills:G.kills,diff:(DIFF[difficulty]||DIFF[1]).name,seed:G.runSeed,dmg:Math.round(G.dmgTaken),kb:(G.killsBy||[]).slice(),date:new Date().toISOString().slice(0,10)});
    renderScores();
    metaAward(G.score,G.wave,G.kills,!!G.daily);
  }
  $('goScore').textContent=G.score;$('goWave').textContent=G.wave;$('goKills').textContent=G.kills;
  $('goAcc').textContent=(G.shots?Math.round(G.hits/G.shots*100):0)+'%';$('goTime').textContent=Math.floor(G.time)+'s';$('goBest').textContent=bestScore;
  $('goSeed').textContent=G.runSeed;$('goDmg').textContent=Math.round(G.dmgTaken);
  const kb=G.killsBy||[0,0,0,0,0,0,0,0,0,0,0,0],wa=telemetrySummary().weaponAcc||[0,0,0];
  $('goDetail').textContent='KILLS  GRUNT '+kb[0]+'  RUNNER '+kb[1]+'  BRUTE '+kb[2]+'  STINGER '+kb[3]+'  WARDEN '+kb[4]+'  LANCE '+(kb[5]||0)+'  HIVE '+(kb[6]||0)+'  SWARM '+(kb[7]||0)+'  '+t('turretName')+' '+(kb[8]||0)+'  '+t('dashName')+' '+(kb[9]||0)+'  '+t('shielderName')+' '+(kb[10]||0)+'  '+t('pyre')+' '+(kb[11]||0)+'\nACC  PULSE '+wa[0]+'%  SCATTER '+wa[1]+'%  RAIL '+wa[2]+'%  ARC '+(wa[3]||0)+'%';
  if(!inPB){
    $('gameOverOverlay').classList.remove('hidden');$('hud').classList.remove('on');$('crosshair').classList.remove('on');$('touch').classList.remove('on');$('pauseBtn').style.display='none';
    if($('photoBtn'))$('photoBtn').style.display='none';
  }
  if($('watchBtn'))$('watchBtn').style.display=(!inPB&&replayLog&&replayLog.frames.length)?'inline-flex':'none';
  if(G.daily&&!inPB&&!benchRunning){
    const dr=dailySeedAt(),sc=makeShareCode(G.runSeed,G.score,G.kills,G.wave);
    if(dr.ok&&sc.ok){
      saveDaily({date:dr.ymd,score:G.score,kills:G.kills,waves:G.wave,hash:sc.hash,code:sc.code});
      if($('goDailyWrap')){$('goDailyWrap').style.display='';$('goDailyCode').textContent=sc.code;}
    }
  }else if($('goDailyWrap'))$('goDailyWrap').style.display='none';
}


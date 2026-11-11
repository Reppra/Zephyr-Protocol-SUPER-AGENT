/* ============================ CORE (shared constants + run state) ============================ */
const $=id=>document.getElementById(id);
const DEBUG=new URLSearchParams(location.search).get('debug')==='1';
const GAME_VERSION='0.8.1';
const ARENA_W=48, ARENA_D=48, MAX_H=14;
const EYE_H=1.62, FOV=72*Math.PI/180, NEAR=0.08, FAR=220;
const MAG=12;
const WEAPONS=[
  {name:'PULSE',mag:12,cd:0.18,rel:1.1,dmg:18,dmgVar:8,pellets:1,spread:0,pierce:false,reserve:Infinity,max:Infinity},
  {name:'SCATTER',mag:6,cd:0.7,rel:1.5,dmg:6,dmgVar:4,pellets:7,spread:0.09,pierce:false,reserve:24,max:48},
  {name:'RAIL',mag:3,cd:0.9,rel:1.8,dmg:55,dmgVar:16,pellets:1,spread:0,pierce:true,reserve:9,max:18},
  {name:'ARC',mag:8,cd:0.32,rel:1.3,dmg:14,dmgVar:6,pellets:1,spread:0,pierce:false,reserve:16,max:32,chain:{jumps:3,radius:9,falloff:0.65}}];
const PAL={cyan:[0.13,0.88,1],red:[1,0.23,0.19],orange:[1,0.42,0.17],green:[0.36,1,0.55],amber:[1,0.69,0.13],magenta:[0.69,0.38,1],pink:[1,0.3,0.85]};
let bootReady=false,gameStarted=false,gameOver=false,paused=false;
let benchmarkDone=false,benchmarkPass=false,benchRunning=false;
/* work_010 P5: true while the acceptance harness runs. stormMouse/stormTouch are the sandbox stand-in
   for the hardware-only MESH MELTDOWN signal; SUPERphone + sandbox degrades to MESH COOLED instead. */
let SANDBOX=false;
let difficulty=1,sensitivity=1.0,muted=false;
let bestScore=0;
const player={x:24,y:3,z:24,vx:0,vy:0,vz:0,yaw:0,pitch:0,hp:100,wi:0,mags:WEAPONS.map(w=>w.mag),res:WEAPONS.map(w=>w.reserve),reloadWi:0,reloading:0,fireCd:0,grounded:true,
  rapid:0,shield:0,dmgBoost:0,hurtCd:0};
let enemies=[],particles=[],pickups=[],tracers=[],eproj=[];
const G={mode:'menu',score:0,combo:1,comboTimer:0,kills:0,wave:0,waveState:'intermission',waveTimer:2.5,
  toSpawn:0,spawnTimer:0,shots:0,hits:0,wshots:[0,0,0,0],whits:[0,0,0,0],dmgTaken:0,killsBy:[0,0,0,0,0,0,0,0,0,0,0,0],tookDamage:false,time:0,shake:0,muzzle:0,hitmark:0,rng:123456789,runSeed:123456789,banner:0,bannerText:'',bannerSub:'',toast:0,toastText:'',dynCount:1,waveDmg:0,daily:false,lightsThrottled:0,flags:{}};
function downloadJSON(obj,filename){
  try{
    const json=JSON.stringify(obj);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename||('sun011_export_'+Date.now()+'.json');
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    return {ok:true,bytes:json.length};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


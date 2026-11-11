/* ============================ RELEASE CHECKLIST ============================ */
function releaseChecklist(){
  try{
    const brandEl=document.querySelector('.brand');
    const checks={
      title:/SUN_011/.test(document.title),
      brand:/SUN_011/.test(brandEl?brandEl.textContent:''),
      version:GAME_VERSION==='0.8.1',
      verStamp:($('verVal')?$('verVal').textContent:'')==='0.8.1',
      replaySchema:REPLAY_SCHEMAS[0]==='sun011.replay.v2'&&REPLAY_SCHEMAS.indexOf('sun010.replay.v2')>=0,
      benchSchema:BENCH_SCHEMA==='SUN_011.benchmark.v1',
      storage:[SCORES_KEY,SETTINGS_KEY,ACH_KEY,META_KEY,DAILY_KEY,CR.key].every(k=>k.indexOf('sun011_')===0),
      legacy:LEGACY_SCORES_KEYS.indexOf('sun010_scores')>=0&&LEGACY_SETTINGS_KEYS.indexOf('sun010_settings')>=0&&LEGACY_ACH_KEYS.indexOf('sun010_ach')>=0&&LEGACY_META_KEYS.indexOf('sun010_meta')>=0&&LEGACY_DAILY_KEYS.indexOf('sun010_daily')>=0,
      photo:/^sun011_photo_/.test(photoFilename(1)),
      i18n:!!strParity().ok
    };
    const failed=Object.keys(checks).filter(k=>!checks[k]);
    return {ok:failed.length===0,checks,failed};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


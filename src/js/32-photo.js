/* ============================ PHOTO ============================ */
function photoFilename(ts){
  try{
    const n=Number(ts);
    const stamp=Number.isFinite(n)&&n>0?Math.floor(n):Date.now();
    return 'sun011_photo_'+stamp+'.png';
  }catch(e){return 'sun011_photo_'+Date.now()+'.png';}
}
function photoEncode(){
  try{
    if(!canvas||typeof canvas.toDataURL!=='function')return {ok:false,error:'no canvas'};
    if(contextLost)return {ok:false,error:'context lost'};
    let url='';
    try{url=canvas.toDataURL('image/png');}catch(e1){url='';}
    if((!url||url.length<100)&&gameStarted&&!gameOver&&!paused){
      try{drawScene();url=canvas.toDataURL('image/png');}catch(e2){}
    }
    if(typeof url!=='string'||url.indexOf('data:image/png')!==0)return {ok:false,error:'capture failed',bytes:url?url.length:0};
    if(url.length<100)return {ok:false,error:'empty capture',bytes:url.length};
    return {ok:true,url,bytes:url.length,w:canvas.width,h:canvas.height};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function photoSave(){
  try{
    const r=photoEncode();
    if(!r.ok){showToast(t('photoFailed'));return r;}
    const a=document.createElement('a');a.href=r.url;a.download=photoFilename();
    document.body.appendChild(a);a.click();a.remove();
    showToast(t('photoSaved'));
    return {ok:true,bytes:r.bytes,w:r.w,h:r.h};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}


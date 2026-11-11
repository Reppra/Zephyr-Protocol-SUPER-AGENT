/* ============================ A11Y ============================ */
function applyA11y(){
  try{
    if(!document.body)return {ok:false,error:'no body'};
    document.body.classList.toggle('a11y-motion',!!SET.reducedMotion);
    document.body.classList.toggle('a11y-contrast',!!SET.highContrast);
    document.body.classList.toggle('a11y-color',!!SET.colorblind);
    return {ok:true,motion:!!SET.reducedMotion,contrast:!!SET.highContrast,color:!!SET.colorblind};
  }catch(e){return {ok:false,error:String(e&&e.message||e)};}
}
function shakeAmp(){
  try{return (Number(G&&G.shake)||0)*(SET.reducedMotion?0.15:1);}catch(e){return 0;}
}
function shapeSpec(type,elite){
  try{
    if(!SET.colorblind)return [];
    const out=[];
    if(type===1){out.push([-0.9,0,0,0.42],[0.9,0,0,0.42]);}
    else if(type===2){out.push([-0.7,0,-0.7,0.4],[0.7,0,-0.7,0.4],[-0.7,0,0.7,0.4],[0.7,0,0.7,0.4]);}
    else if(type===3){out.push([0,1.05,0,0.55],[0,-1.05,0,0.55],[1.05,0,0,0.4],[-1.05,0,0,0.4]);}
    else if(type===5){out.push([-1.1,0,0,0.45],[1.1,0,0,0.45],[0,0.95,0,0.35]);}
    else if(type===4){out.push([0,1.0,0,0.4]);}
    else if(type===6){out.push([0,1.1,0,0.42],[-0.85,0,0,0.36],[0.85,0,0,0.36]);}
    else if(type===7){out.push([0,1.0,0,0.3]);}
    else if(type===8){out.push([-1.0,0,0,0.4],[1.0,0,0,0.4],[0,-0.9,0,0.4]);}
    else if(type===9){out.push([0,1.15,0,0.3],[0,-1.15,0,0.3]);}
    else if(type===10){out.push([-1.0,0,-1.0,0.3],[1.0,0,-1.0,0.3],[-1.0,0,1.0,0.3],[1.0,0,1.0,0.3]);}
    else if(type===11){out.push([0,1.2,0,0.5],[-1.1,0,0,0.4],[1.1,0,0,0.4],[0,0,1.1,0.4],[0,0,-1.1,0.4]);}
    return out;
  }catch(e){return [];}
}


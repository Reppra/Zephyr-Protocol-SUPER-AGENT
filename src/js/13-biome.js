/* ============================ BIOMES ============================ */
const GOLD={name:'GOLD',amp:1.35,border:[0.42,0.30,0.04],accentA:[0.52,0.40,0.06],accentB:[0.46,0.28,0.04],
  baseA:[0.20,0.14,0.03],baseB:[0.32,0.24,0.05],fog:[0.12,0.09,0.02],
  sky:{top:[0.08,0.06,0.01],mid:[0.20,0.15,0.03],bot:[0.16,0.10,0.04],glow:[0.92,0.72,0.12]}};
function biomeDef(i){try{const n=i|0;return (n===1&&hasUnlock('goldBiome')&&SET.goldBiome!==false)?GOLD:(BIOMES[n]||BIOMES[0]);}catch(e){return BIOMES[i]||BIOMES[0];}}
const BIOMES=[
  {name:'NEON',amp:1.0,border:[0.06,0.32,0.42],accentA:[0.30,0.12,0.45],accentB:[0.10,0.30,0.40],
   baseA:[0.07,0.10,0.20],baseB:[0.12,0.16,0.30],fog:[0.04,0.06,0.13],
   sky:{top:[0.03,0.05,0.12],mid:[0.06,0.09,0.20],bot:[0.10,0.06,0.16],glow:[0.13,0.5,0.7]}},
  {name:'EMBER',amp:1.35,border:[0.40,0.16,0.06],accentA:[0.46,0.20,0.05],accentB:[0.40,0.10,0.06],
   baseA:[0.20,0.08,0.04],baseB:[0.30,0.14,0.06],fog:[0.14,0.05,0.03],
   sky:{top:[0.10,0.03,0.02],mid:[0.20,0.07,0.03],bot:[0.16,0.04,0.06],glow:[0.70,0.35,0.10]}},
  {name:'VOID',amp:0.55,border:[0.16,0.06,0.32],accentA:[0.36,0.10,0.55],accentB:[0.10,0.06,0.40],
   baseA:[0.08,0.05,0.18],baseB:[0.16,0.10,0.28],fog:[0.06,0.03,0.14],
   sky:{top:[0.02,0.02,0.08],mid:[0.05,0.03,0.14],bot:[0.08,0.03,0.12],glow:[0.45,0.25,0.80]}}];
function biomeFor(seed){
  const s=seed>>>0;
  if(s===123456789)return 0;
  return s%3;
}


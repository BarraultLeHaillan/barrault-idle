// ════════════════════════════════════════════════════════
// engine.js — Formules, calculs et logique cœur du jeu
// Dépend de : state.js
// ════════════════════════════════════════════════════════

// Multiplicateur franchise : additif, min 1 avant tout prestige
function fm() { return Math.max(1, S.franchiseMultiplier); }

function fmt(v) {
  if (v >= 1e9)  return v.toExponential(2).replace('e+','e')+'€';
  if (v >= 1e6)  return (v/1e6).toFixed(2)+' M€';
  if (v >= 1000) return Math.round(v/100)/10+' k€';
  return Math.round(v)+' €';
}

function hireCost() { return Math.round(10000*Math.pow(2,S.team.length)); }

function upgCost(k) {
  return Math.floor(S.upg[k].baseCost * Math.pow(S.upg[k].mult, S.upg[k].level));
}
function toolCost(id) {
  const u=TOOL_UPGRADES.find(x=>x.id===id); if (!u) return 0;
  return S.effects.toolDiscount ? Math.floor(u.cost/2) : u.cost;
}

function availableSellers() { return Object.keys(SELLERS_DEF).filter(k=>!S.team.includes(k)); }

// ── XP — courbe équilibrée ──
function calcXP() {
  return S.xpFromUpgrades + S.xpFromClients;
}
function xpToLevel(xp) {
  const t = [0];
  for (let i=1; i<=60; i++) t.push(t[i-1]+Math.floor(100*Math.pow(1.20,i-1)));
  let lv=1;
  for (let i=1; i<=60; i++) { if (xp>=t[i]) lv=i+1; else break; }
  lv = Math.min(lv,60);
  return { level:lv, curr:xp-t[lv-1], next:t[lv]-t[lv-1] };
}

// ── Effets vendeurs & manager ────────────────────────────
function recalcEffects() {
  S.effects = { partBasket:0, partFreq:0, partMult:0, proBasket:0, proFreq:0, proMult:0, globalMult:0, toolDiscount:false };
  for (const k of S.team) SELLERS_DEF[k].effect(S);
  if (S.upg.marketing.level>0) S.effects.proFreq += S.upg.marketing.level*0.15;
  S.effects.globalMult += S.supplierGlobalBoost + S.supplierTeamBoost;
}

// ── Revenus passifs — malus/bonus par vendeur individuel ─
function ips() {
  const cat = S.upg.catalog;
  let base = 0;
  for (const k of S.team) {
    let contrib = 3 * (1 + cat.level * 0.3);
    if ((S.malusPerSeller[k]||0) > 0)      contrib *= 0.5;
    else if ((S.bonusPerSeller[k]||0) > 0) contrib *= 1.5;
    base += contrib;
  }
  if (S.globalMalus > 0) base *= 0.80;
  const tool    = 1 + S.toolEffects.teamBoost;
  const global  = 1 + S.effects.globalMult + S.toolEffects.globalBoost;
  const mgrTeam = 1 + S.manager.teamBoost;
  const zdBoost = (S.franchisesOwned >= 2 && S.zoneDirector.active) ? (1 + S.zoneDirector.boostPct) : 1;
  const clickB  = S.clickBoost > 0 ? 2.5 : 1;
  return (base * tool * global * mgrTeam * zdBoost * clickB) * fm();
}

// ── Valeur d'un clic ─────────────────────────────────────
function clickValue() {
  let base = S.clickBonus;
  const tool   = 1 + S.toolEffects.clickBoost;
  const global = 1 + S.effects.globalMult + S.toolEffects.globalBoost;
  let val = Math.floor(base * tool * global * fm());
  if (S.clickQuad)        val *= 4;
  else if (S.clickDouble) val *= 2;
  return val;
}

// ── Types de clients ─────────────────────────────────────
function clientTypes() {
  const lv=S.upg.catalog.level, pw=10+S.effects.proFreq*100;
  if (lv>=12) return [{label:'Pro',min:200,max:800,w:Math.min(pw,60)},{label:'Part.',min:20,max:80,w:100}];
  if (lv>=6)  return [{label:'Pro',min:100,max:400,w:Math.min(pw,35)},{label:'Part.',min:15,max:60,w:80}];
  return [{label:'Part.',min:8,max:35,w:100}];
}
function pickClient() {
  const types=clientTypes();
  let r=Math.random()*types.reduce((a,t)=>a+t.w,0);
  for (const t of types) { r-=t.w; if (r<=0) return t; }
  return types[0];
}

// ── Calendrier ───────────────────────────────────────────
function advanceTime(dt) {
  S.timeAccum += dt;
  const spd  = S.monthDuration / WORKING_DAYS_PER_MONTH;
  const days = Math.floor(S.timeAccum / spd);
  if (days <= 0) return;
  S.timeAccum -= days * spd;
  for (let i=0; i<days; i++) {
    if (S.dayOfWeek === 4) { S.gameDay+=3; S.dayOfWeek=0; }
    else                   { S.gameDay+=1; S.dayOfWeek++; }
    if (S.gameDay > WORKING_DAYS_PER_MONTH) {
      S.gameDay=1; S.dayOfWeek=0; S.gameMonth++;
      if (S.gameMonth > 12) {
        S.gameMonth=1; S.gameYear++;
        addLog(`<span class="lb">🎆 Bonne année ${S.gameYear} !</span>`);
      }
      payMonthlyCA();
    }
  }
}

// ── CA mensuel (sans salaires ni charges) ────────────────
function payMonthlyCA() {
  S.clicksThisMonth = 0;

  // CA équipe vendeurs
  if (S.team.length > 0) {
    const caBase  = S.team.reduce((sum,k) => sum + (S.sellerCosts[k]||10000)*2, 0);
    const caTotal = Math.round(caBase * fm());
    S.money += caTotal; S.totalEarned += caTotal;
    addLog(`<span class="lg">💼 CA mensuel équipe : +${fmt(caTotal)} (${S.team.length} vendeur${S.team.length>1?'s':''})</span>`);
  }

  // CA manager
  if (S.manager.hired && S.manager.monthlyCa > 0) {
    const mCa = Math.round(S.manager.monthlyCa * fm());
    S.money += mCa; S.totalEarned += mCa;
    addLog(`<span class="ly">🧑‍💼 CA Manager : +${fmt(mCa)}</span>`);
  }

  // CA commerciaux
  for (const key of ['jerome','pascal']) {
    const c = S.commercials[key]; if (!c.hired) continue;
    const p = COMMERCIAL_PROFILES[key];
    const factor = 0.70 + Math.random() * 0.80;
    const ca = Math.round(c.caObjective * factor * fm());
    S.money += ca; S.totalEarned += ca;
    addLog(`<span class="lb">💼 ${p.name} — CA ${fmt(ca)}</span>`);
  }

  // CA Pub TV (franchise palier 4)
  if (S.franchisesOwned >= 10 && S.tvAds.monthlyCa > 0) {
    const tvCa = Math.round(S.tvAds.monthlyCa * fm());
    S.money += tvCa; S.totalEarned += tvCa;
    addLog(`<span class="ly">📺 Pub TV — +${fmt(tvCa)}</span>`);
  }

  buildRoster();
}

// ── Ticks malus & bonus par vendeur ──────────────────────
function tickMalusBonus(dt) {
  for (const k of Object.keys(S.malusPerSeller))
    if (S.malusPerSeller[k] > 0) S.malusPerSeller[k] = Math.max(0, S.malusPerSeller[k] - dt);
  for (const k of Object.keys(S.bonusPerSeller))
    if (S.bonusPerSeller[k] > 0) S.bonusPerSeller[k] = Math.max(0, S.bonusPerSeller[k] - dt);
  if (S.globalMalus > 0) S.globalMalus = Math.max(0, S.globalMalus - dt);
}

function tickBonusTimers(dt) {
  for (const k of S.team) {
    if (S.bonusTimers[k] === undefined) S.bonusTimers[k] = 180 + Math.random()*180;
    S.bonusTimers[k] -= dt;
    if (S.bonusTimers[k] <= 0) { S.bonusTimers[k] = 180 + Math.random()*180; S.pendingBonusQueue.push(k); }
  }
  for (const k of Object.keys(S.bonusTimers)) if (!S.team.includes(k)) delete S.bonusTimers[k];
  if (!S.bonusModalOpen && !S.eventModalOpen && !S.raiseModalOpen && S.pendingBonusQueue.length > 0)
    openBonusModal(S.pendingBonusQueue.shift());
}

// ── Centrale d'appel (outil t5) ──────────────────────────
function tickToolClient(dt) {
  if (!S.toolEffects.proInterval) return;
  S.toolEffects.proTimer -= dt;
  if (S.toolEffects.proTimer <= 0) {
    S.toolEffects.proTimer = S.toolEffects.proInterval;
    spawnVIPClient();
  }
}

function tickEventTimer(dt) {
  S.eventTimer -= dt;
  if (S.eventTimer <= 0) {
    S.eventTimer = 120 + Math.random()*60;
    S.pendingEventQueue.push(EVENTS[Math.floor(Math.random()*EVENTS.length)]);
  }
  if (!S.bonusModalOpen && !S.eventModalOpen && !S.raiseModalOpen && S.pendingEventQueue.length > 0)
    openEventModal(S.pendingEventQueue.shift());
}

// ── Zones franchise ───────────────────────────────────────

// Labo : génère XP pour chaque k€ produit
function tickLab(dt) {
  if (S.franchisesOwned < 1) return;
  const revenue = ips() * 4 * dt; // revenu estimé (ips × 4 = revenu réel/s)
  S.lab.moneyAccum += revenue;
  while (S.lab.moneyAccum >= 1000) {
    S.lab.moneyAccum -= 1000;
    S.xpFromClients += S.lab.xpPer1k;
  }
}

// Directeur de zone : boost temporaire activable
function tickZoneDirector(dt) {
  if (S.franchisesOwned < 2 || !S.zoneDirector.active) return;
  S.zoneDirector.timer -= dt;
  if (S.zoneDirector.timer <= 0) {
    S.zoneDirector.active = false;
    addLog(`<span class="lw">🏆 Directeur de Zone — boost terminé</span>`);
    if (typeof refreshZoneDirectorSection === 'function') refreshZoneDirectorSection();
  }
}

function activateZoneDirector() {
  if (S.zoneDirector.active || S.franchisesOwned < 2) return;
  S.zoneDirector.active = true;
  S.zoneDirector.timer  = 60;
  addLog(`<span class="ly">🏆 Directeur de Zone activé — +${Math.round(S.zoneDirector.boostPct*100)}% production (60s) !</span>`);
  if (typeof refreshZoneDirectorSection === 'function') refreshZoneDirectorSection();
}

// Centrale d'appel : génère €/s et XP/s en continu
function tickCallCenter(dt) {
  if (S.franchisesOwned < 5) return;
  const gain = S.callCenter.incomeRate * fm() * dt;
  S.money += gain; S.totalEarned += gain;
  S.xpFromClients += S.callCenter.xpRate * dt;
}

// ── Achievements ─────────────────────────────────────────
function checkAchievements() {
  let newUnlock = false;
  for (const a of ACHIEVEMENTS) {
    if (S.achUnlocked.has(a.id)) continue;
    if (!a.check(S)) continue;
    S.achUnlocked.add(a.id);
    S.xpFromUpgrades += a.xp;
    if (a.bonus > 0) { S.money += a.bonus; S.totalEarned += a.bonus; }
    addLog(`<span class="ly">🏆 ${a.name}</span> débloqué ! +${a.xp} XP${a.bonus>0?' +'+fmt(a.bonus):''}`);
    playSound('achievement');
    showAchToast(a);
    newUnlock = true;
  }
  if (newUnlock) {
    const btn = document.getElementById('ach-btn');
    if (btn) btn.textContent = `🏆 ${S.achUnlocked.size}`;
  }
}

function showAchToast(a) {
  const t = document.createElement('div');
  t.className = 'ach-toast';
  t.innerHTML = `🏆 ${a.icon} <strong>${a.name}</strong><br><span>+${a.xp} XP${a.bonus>0?' · +'+fmt(a.bonus):''}</span>`;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); },400); }, 3000);
}

// ── Fournisseurs catalogue ────────────────────────────────
function checkSupplierUnlocks() {
  const lv = S.upg.catalog.level;
  [3,6,10,15].forEach(threshold => {
    if (lv >= threshold && !S.supplierUnlocked[threshold]) {
      S.supplierUnlocked[threshold] = true;
      openSupplierModal(threshold);
    }
  });
}

// ── Sons (fichiers MP3) ──────────────────────────────────
const _sfxFiles = {
  coin:         'sfx/coins.mp3',
  notification: 'sfx/prime.mp3',
  danger:       'sfx/bad_event.mp3',
  positive:     'sfx/good_event.mp3',
  achievement:  'sfx/achievement.mp3',
  level:        'sfx/level.mp3',
};
// Volumes : coins très subtil car cliqué souvent
const _sfxVolumes = {
  coin: 0.10, notification: 0.7, danger: 0.7,
  positive: 0.7, achievement: 0.8, level: 0.8,
};
function playSound(type) {
  if (window._sfxMuted) return;
  const src = _sfxFiles[type]; if (!src) return;
  try {
    const a = new Audio(src);
    a.volume = _sfxVolumes[type] ?? 0.7;
    a.play().catch(() => {});
  } catch(e) {}
}

// ── Thème de fond selon palier franchise ─────────────────
function updateBgTheme() {
  const n = S.franchisesOwned;
  const theme = n >= 10 ? 'theme-4' : n >= 5 ? 'theme-3' : n >= 2 ? 'theme-2' : n >= 1 ? 'theme-1' : 'theme-0';
  document.body.className = theme;
}

// ── Log ──────────────────────────────────────────────────
function addLog(html) {
  const p = document.getElementById('log');
  const d = document.createElement('div'); d.className = 'log-entry'; d.innerHTML = html;
  p.insertBefore(d, p.firstChild);
  while (p.children.length > 60) p.removeChild(p.lastChild);
}

// ── Avatar ───────────────────────────────────────────────
function makeAvatar(key, size, defOverride) {
  const c = document.createElement('canvas'); c.width=size; c.height=size; c.style.imageRendering='pixelated';
  const ctx = c.getContext('2d'), def=defOverride||(key?SELLERS_DEF[key]:null)||{colors:{body:'#1B5EAB',hair:'#111'}}, sc=size/16;
  ctx.fillStyle='#111827'; ctx.fillRect(0,0,size,size);
  ctx.fillStyle=def.colors.body;  ctx.fillRect(3*sc,8*sc,10*sc,8*sc);
  ctx.fillStyle='#f5c5a0';        ctx.fillRect(4*sc,1*sc,8*sc,8*sc);
  ctx.fillStyle=def.colors.hair;  ctx.fillRect(4*sc,1*sc,8*sc,3*sc);
  ctx.fillStyle='#111'; ctx.fillRect(5*sc,4.5*sc,1.5*sc,1.5*sc); ctx.fillRect(9*sc,4.5*sc,1.5*sc,1.5*sc);
  ctx.fillStyle='#cc8866'; ctx.fillRect(6.5*sc,7.5*sc,3*sc,0.5*sc);
  ctx.fillStyle='#333'; ctx.fillRect(3*sc,14*sc,4*sc,2*sc); ctx.fillRect(9*sc,14*sc,4*sc,2*sc);
  ctx.fillStyle='#fff'; ctx.fillRect(6.5*sc,8*sc,3*sc,2*sc);
  if (key==='Laetitia') { ctx.fillStyle=def.colors.hair; ctx.fillRect(12*sc,2*sc,2*sc,5*sc); }
  if (key==='Thomas')   { ctx.fillStyle='#ffd700'; ctx.fillRect(5*sc,0,1.5*sc,1.5*sc); ctx.fillRect(9*sc,0,1.5*sc,1.5*sc); ctx.fillRect(7*sc,0,2*sc,1*sc); }
  if (key==='Seb')      { ctx.fillStyle='#aaa'; ctx.fillRect(4.5*sc,4*sc,2.5*sc,2*sc); ctx.fillRect(9*sc,4*sc,2.5*sc,2*sc); ctx.fillRect(7*sc,4.5*sc,2*sc,0.5*sc); }
  if (key==='Fabrice')  { ctx.fillStyle='#880010'; ctx.fillRect(7*sc,9*sc,2*sc,5*sc); }
  if (key==='Jonathan') { ctx.fillStyle='#ffaa00'; ctx.fillRect(3*sc,0,10*sc,2*sc); ctx.fillRect(3.5*sc,2*sc,9*sc,1*sc); }
  if (key==='Eddy')     { ctx.fillStyle='#333'; ctx.fillRect(3.5*sc,3*sc,1*sc,3*sc); ctx.fillRect(11.5*sc,3*sc,1*sc,3*sc); ctx.fillStyle='#4dc8ff'; ctx.fillRect(3*sc,5.5*sc,1.5*sc,1.5*sc); }
  return c;
}

// ── Spawn client ─────────────────────────────────────────
function spawnCustomer() {
  const area = document.getElementById('cust-area');
  const client = pickClient(), isPro = client.label === 'Pro';
  let earn = client.min + Math.random()*(client.max-client.min);
  if (isPro) earn *= (1+S.effects.proBasket) * (1+S.effects.proMult);
  else        earn *= (1+S.effects.partBasket) * (1+S.effects.partMult);
  earn *= (1+S.effects.globalMult+S.toolEffects.globalBoost);
  earn *= (1+S.toolEffects.basketBoost);
  earn *= fm();
  const tool  = 1 + S.toolEffects.teamBoost;
  const final = Math.round(earn * tool);
  S.money += final; S.totalEarned += final; S.clientsServed++;
  S.xpFromClients += (isPro?15:5) + S.supplierXpBonus;

  const el = document.createElement('canvas'); el.width=16; el.height=24;
  el.style.cssText = 'position:absolute;bottom:0;image-rendering:pixelated;pointer-events:none;';
  const x = 5 + Math.random()*80; el.style.left = x+'%';
  const ctx = el.getContext('2d');
  ctx.fillStyle = isPro?'#CC1020':'#1B5EAB'; ctx.fillRect(2,8,12,14);
  ctx.fillStyle = '#f5c5a0'; ctx.fillRect(4,0,8,9);
  ctx.fillStyle = isPro?'#3a0a0a':'#0a1a3a'; ctx.fillRect(4,0,8,3);
  ctx.fillStyle = '#111'; ctx.fillRect(5,4,2,2); ctx.fillRect(9,4,2,2);
  ctx.fillStyle = '#333'; ctx.fillRect(2,22,5,2); ctx.fillRect(9,22,5,2);
  area.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity 0.3s'; setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); },300); }, 2200+Math.random()*1200);

  const pop = document.createElement('div'); pop.className='coin-pop';
  pop.style.left = x+'%'; pop.style.bottom = '28px';
  pop.textContent = '+'+fmt(final);
  area.appendChild(pop);
  setTimeout(()=>{ if(pop.parentNode) pop.parentNode.removeChild(pop); },1100);
}

// ── Client pro prospecté par le manager ──────────────────
function spawnVIPClient() {
  if (!S.manager.hired || !S.manager.profile) return;
  const types = clientTypes();
  const proType = types.find(t=>t.label==='Pro') || {min:100,max:400};
  let earn = proType.min + Math.random()*(proType.max-proType.min);
  earn *= (1+S.effects.proBasket) * (1+S.effects.proMult);
  earn *= (1+S.effects.globalMult+S.toolEffects.globalBoost);
  earn *= (1+S.toolEffects.basketBoost);
  earn *= fm();
  const tool  = 1 + S.toolEffects.teamBoost;
  const final = Math.round(earn * tool);
  S.money += final; S.totalEarned += final; S.clientsServed++;
  S.xpFromClients += 15 + S.supplierXpBonus;
  const pName = MANAGER_PROFILES[S.manager.profile].name;
  addLog(`<span class="lb">🤝 ${pName} — client pro prospecté +${fmt(final)}</span>`);
  const area = document.getElementById('cust-area');
  const pop = document.createElement('div'); pop.className='coin-pop';
  pop.style.left='50%'; pop.style.bottom='28px'; pop.style.color='#ffdd44';
  pop.textContent = '🤝 +'+fmt(final);
  area.appendChild(pop);
  setTimeout(()=>{ if(pop.parentNode) pop.parentNode.removeChild(pop); },1100);
}

// ── Franchise (prestige) ──────────────────────────────────
function claimFranchise() {
  const obj = franchiseObjective(S.franchisesOwned);
  if (S.totalEarned < obj || S.franchisesOwned >= 99) return;

  // Conserver les zones franchise (persistantes)
  const savedLab    = { ...S.lab,          upgsBought: new Set(S.lab.upgsBought),          moneyAccum:0 };
  const savedZD     = { ...S.zoneDirector, upgsBought: new Set(S.zoneDirector.upgsBought), active:false, timer:0 };
  const savedCC     = { ...S.callCenter,   upgsBought: new Set(S.callCenter.upgsBought) };
  const savedTV     = { ...S.tvAds,        upgsBought: new Set(S.tvAds.upgsBought) };

  const excess   = Math.max(0, S.totalEarned - obj);
  const runBonus = 2 + excess / obj;
  const newMult  = parseFloat((S.franchiseMultiplier + runBonus).toFixed(4));
  const newOwned = S.franchisesOwned + 1;

  S.lifetimeEarned = (S.lifetimeEarned || 0) + S.totalEarned;
  S.money=500; S.totalEarned=0;
  S.clientsServed=0; S.clicks=0; S.clicksThisMonth=0; S.clickBoost=0; S.level=1;
  S.gameDay=1; S.gameMonth=1; S.gameYear=2026; S.dayOfWeek=0; S.timeAccum=0;
  S.team=[]; S.bonusTimers={}; S.malusPerSeller={}; S.bonusPerSeller={}; S.globalMalus=0; S.sellerCosts={};
  S.bonusModalOpen=false; S.eventModalOpen=false; S.raiseModalOpen=false;
  S.pendingBonusQueue=[]; S.pendingEventQueue=[]; S.pendingRaiseQueue=[];
  S.eventTimer=150+Math.random()*30;
  S.clickUpgsBought=new Set();
  S.clickBonus=5; S.clickChance=0.15; S.clickDouble=false; S.clickQuad=false;
  S.upgBought=0; S.xpFromUpgrades=0; S.xpFromClients=0; S.autoclickAccum=0;
  S.achUnlocked=new Set();
  S.supplierUnlocked={3:false,6:false,10:false,15:false};
  S.supplierXpBonus=0; S.supplierGlobalBoost=0; S.supplierTeamBoost=0;
  S.manager={hired:false,profile:null,autoclickRate:0,teamBoost:0,incomeBoost:0,monthlyCa:0,vipInterval:0,vipTimer:0,upgsBought:new Set()};
  S.toolsBought=new Set();
  S.toolEffects={teamBoost:0,clickBoost:0,globalBoost:0,clientFreq:0,basketBoost:0,proInterval:0,proTimer:0};
  S.commercials={
    jerome:{hired:false,level:1,caObjective:500000,xpsRate:15},
    pascal:{hired:false,level:1,caObjective:800000,xpsRate:25}
  };
  S.effects={partBasket:0,partFreq:0,partMult:0,proBasket:0,proFreq:0,proMult:0,globalMult:0,toolDiscount:false};
  S.upg={
    catalog:  {name:'CATALOGUE',level:1,baseCost:500, mult:1.8,icon:'📋',desc:'Références & paniers',reqLv:1,cap:15},
    marketing:{name:'MARKETING',level:0,baseCost:5000,mult:2.0,icon:'📢',desc:'Attire clients pro',  reqLv:8,cap:5 },
  };
  S.seniority={}; S.fired={};

  S.franchisesOwned  = newOwned;
  S.franchiseMultiplier = newMult;
  S.lab          = savedLab;
  S.zoneDirector = savedZD;
  S.callCenter   = savedCC;
  S.tvAds        = savedTV;

  if (typeof _mgrStateKey    !== 'undefined') _mgrStateKey    = null;
  if (typeof _commStateKey   !== 'undefined') _commStateKey   = null;
  if (typeof _hireState      !== 'undefined') _hireState      = null;
  if (typeof _lastClickUpgId !== 'undefined') _lastClickUpgId = null;

  recalcEffects();
  buildUpgrades(); buildRoster(); updateHireBtn(); buildManagerSection(); buildCommercialSection();
  buildFranchiseZoneSections();

  addLog(`<span class="ly">🏪 FRANCHISÉ #${newOwned} — Multiplicateur ×${newMult.toFixed(2)} actif !</span>`);
  addLog('<span class="lp">▶ Barrault Le Haillan — Janvier 2026 !</span>');
  addLog(`<span class="lb">💡 Tous vos revenus sont ×${newMult.toFixed(2)} !</span>`);
  if (typeof saveGame === 'function') saveGame();
}

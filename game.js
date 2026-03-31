// ════════════════════════════════════════════════════════
// game.js — Boucle principale, sauvegarde et initialisation
// Chargé EN DERNIER.
// ════════════════════════════════════════════════════════

const SAVE_KEY = 'barrault_save_v2';

// ── SAUVEGARDE ────────────────────────────────────────────
function saveGame() {
  try {
    const data = {
      money:              S.money,
      totalEarned:        S.totalEarned,
      lifetimeEarned:     S.lifetimeEarned,
      franchisesOwned:    S.franchisesOwned,
      franchiseMultiplier:S.franchiseMultiplier,
      clientsServed:      S.clientsServed,
      clicks:             S.clicks,
      level:              S.level,
      gameDay:            S.gameDay,
      gameMonth:          S.gameMonth,
      gameYear:           S.gameYear,
      dayOfWeek:          S.dayOfWeek,
      team:               [...S.team],
      clickUpgsBought:    [...S.clickUpgsBought],
      clickBonus:         S.clickBonus,
      clickChance:        S.clickChance,
      clickDouble:        S.clickDouble,
      clickQuad:          S.clickQuad,
      upgBought:          S.upgBought,
      xpFromUpgrades:     S.xpFromUpgrades,
      xpFromClients:      S.xpFromClients,
      achUnlocked:        [...S.achUnlocked],
      supplierUnlocked:   { ...S.supplierUnlocked },
      supplierXpBonus:    S.supplierXpBonus,
      supplierGlobalBoost:S.supplierGlobalBoost,
      supplierTeamBoost:  S.supplierTeamBoost,
      seniority:          { ...S.seniority },
      sellerCosts:        { ...S.sellerCosts },
      manager: {
        hired:        S.manager.hired,
        profile:      S.manager.profile,
        autoclickRate:S.manager.autoclickRate,
        teamBoost:    S.manager.teamBoost,
        incomeBoost:  S.manager.incomeBoost,
        monthlyCa:    S.manager.monthlyCa,
        vipInterval:  S.manager.vipInterval,
        upgsBought:   [...S.manager.upgsBought],
      },
      toolsBought:  [...S.toolsBought],
      toolEffects:  { ...S.toolEffects },
      commercials: {
        jerome: { ...S.commercials.jerome },
        pascal: { ...S.commercials.pascal },
      },
      upg: {
        catalog:   { level: S.upg.catalog.level },
        marketing: { level: S.upg.marketing.level },
      },
      lab: {
        xpPer1k:    S.lab.xpPer1k,
        moneyAccum: S.lab.moneyAccum,
        upgsBought: [...S.lab.upgsBought],
      },
      zoneDirector: {
        boostPct:   S.zoneDirector.boostPct,
        cooldown:   S.zoneDirector.cooldown,
        upgsBought: [...S.zoneDirector.upgsBought],
      },
      callCenter: {
        incomeRate: S.callCenter.incomeRate,
        xpRate:     S.callCenter.xpRate,
        upgsBought: [...S.callCenter.upgsBought],
      },
      tvAds: {
        monthlyCa:  S.tvAds.monthlyCa,
        upgsBought: [...S.tvAds.upgsBought],
      },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) {
    console.warn('[Save] Erreur sauvegarde :', e);
  }
}

// ── CHARGEMENT ────────────────────────────────────────────
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    const g = (val, def) => val !== undefined && val !== null ? val : def;

    S.money               = g(d.money, 500);
    S.totalEarned         = g(d.totalEarned, 0);
    S.lifetimeEarned      = g(d.lifetimeEarned, 0);
    S.franchisesOwned     = g(d.franchisesOwned, 0);
    S.franchiseMultiplier = g(d.franchiseMultiplier, 0);
    S.clientsServed       = g(d.clientsServed, 0);
    S.clicks              = g(d.clicks, 0);
    S.level               = g(d.level, 1);
    S.gameDay             = g(d.gameDay, 1);
    S.gameMonth           = g(d.gameMonth, 1);
    S.gameYear            = g(d.gameYear, 2026);
    S.dayOfWeek           = g(d.dayOfWeek, 0);
    S.team                = g(d.team, []);
    S.clickUpgsBought     = new Set(d.clickUpgsBought ?? []);
    S.clickBonus          = g(d.clickBonus, 5);
    S.clickChance         = g(d.clickChance, 0.15);
    S.clickDouble         = g(d.clickDouble, false);
    S.clickQuad           = g(d.clickQuad, false);
    S.upgBought           = g(d.upgBought, 0);
    S.xpFromUpgrades      = g(d.xpFromUpgrades, 0);
    S.xpFromClients       = g(d.xpFromClients, 0);
    S.achUnlocked         = new Set(d.achUnlocked ?? []);
    S.supplierUnlocked    = g(d.supplierUnlocked, { 3:false, 6:false, 10:false, 15:false });
    S.supplierXpBonus     = g(d.supplierXpBonus, 0);
    S.supplierGlobalBoost = g(d.supplierGlobalBoost, 0);
    S.supplierTeamBoost   = g(d.supplierTeamBoost, 0);
    if (d.seniority)   S.seniority   = d.seniority;
    if (d.sellerCosts) S.sellerCosts = d.sellerCosts;

    if (d.manager) {
      S.manager.hired         = g(d.manager.hired, false);
      S.manager.profile       = g(d.manager.profile, null);
      S.manager.autoclickRate = g(d.manager.autoclickRate, 0);
      S.manager.teamBoost     = g(d.manager.teamBoost, 0);
      S.manager.incomeBoost   = g(d.manager.incomeBoost, 0);
      S.manager.monthlyCa     = g(d.manager.monthlyCa, 0);
      S.manager.vipInterval   = g(d.manager.vipInterval, 0);
      S.manager.vipTimer      = g(d.manager.vipInterval, 0);
      S.manager.upgsBought    = new Set(d.manager.upgsBought ?? []);
    }

    S.toolsBought = new Set(d.toolsBought ?? []);
    if (d.toolEffects)  Object.assign(S.toolEffects, d.toolEffects);

    if (d.commercials) {
      if (d.commercials.jerome) Object.assign(S.commercials.jerome, d.commercials.jerome);
      if (d.commercials.pascal) Object.assign(S.commercials.pascal, d.commercials.pascal);
    }

    if (d.upg) {
      if (d.upg.catalog)   S.upg.catalog.level   = g(d.upg.catalog.level, 1);
      if (d.upg.marketing) S.upg.marketing.level = g(d.upg.marketing.level, 0);
    }

    if (d.lab) {
      S.lab.xpPer1k    = g(d.lab.xpPer1k, 2);
      S.lab.moneyAccum = g(d.lab.moneyAccum, 0);
      S.lab.upgsBought = new Set(d.lab.upgsBought ?? []);
    }
    if (d.zoneDirector) {
      S.zoneDirector.boostPct   = g(d.zoneDirector.boostPct, 0.50);
      S.zoneDirector.cooldown   = g(d.zoneDirector.cooldown, 300);
      S.zoneDirector.upgsBought = new Set(d.zoneDirector.upgsBought ?? []);
    }
    if (d.callCenter) {
      S.callCenter.incomeRate = g(d.callCenter.incomeRate, 500);
      S.callCenter.xpRate     = g(d.callCenter.xpRate, 5);
      S.callCenter.upgsBought = new Set(d.callCenter.upgsBought ?? []);
    }
    if (d.tvAds) {
      S.tvAds.monthlyCa  = g(d.tvAds.monthlyCa, 5000000);
      S.tvAds.upgsBought = new Set(d.tvAds.upgsBought ?? []);
    }

    recalcEffects();
    return true;
  } catch(e) {
    console.warn('[Save] Erreur chargement :', e);
    return false;
  }
}

// ── INITIALISATION ────────────────────────────────────────
S.eventTimer = 150 + Math.random()*30;

const hasSave = loadGame();

buildUpgrades();
buildRoster();
updateHireBtn();
buildManagerSection();
buildCommercialSection();
buildFranchiseZoneSections();
updateFranchiseZoneVisibility();
refreshClickPanel();

if (hasSave) {
  addLog('<span class="lp">✅ Partie sauvegardée chargée !</span>');
} else {
  addLog('<span class="lp">▶ Barrault Le Haillan — Janvier 2026 !</span>');
  addLog('💡 Cliquez pour générer des gains. Recrutez pour des revenus passifs.');
  addLog('🔊 Activez la musique avec le bouton en haut !');
}

// Autosave toutes les 30 s + à la fermeture de la page
setInterval(saveGame, 30000);
window.addEventListener('beforeunload', saveGame);

// ── BOUCLE PRINCIPALE ─────────────────────────────────────
let last=Date.now(), clientT=0;

function tick() {
  const now=Date.now(), dt=Math.min((now-last)/1000, 0.1);
  last=now;

  if (S.clickBoost>0) S.clickBoost=Math.max(0,S.clickBoost-dt);

  tickMalusBonus(dt);
  S.xpFromClients += dt;

  // ── Revenus passifs équipe + manager incomeBoost
  const rate = ips();
  if (rate > 0) { const gain=rate*dt*0.25; S.money+=gain; S.totalEarned+=gain; }

  if (S.team.length>0) {
    clientT+=dt;
    const freqBoost=1+S.effects.partFreq+S.effects.proFreq+S.toolEffects.clientFreq;
    const interval=Math.max(1.5, 10/(1+S.team.length*0.35)/freqBoost)*(S.clickBoost>0?0.4:1);
    if (clientT>=interval) { clientT=0; spawnCustomer(); }
    tickBonusTimers(dt);
  }

  // ── Manager : auto-clic
  if (S.manager.hired && S.manager.autoclickRate>0) {
    S.autoclickAccum += S.manager.autoclickRate*dt;
    while (S.autoclickAccum >= 1) {
      S.autoclickAccum -= 1;
      const val = clickValue(); S.money+=val; S.totalEarned+=val;
      showManagerAutoClick(val);
    }
  }

  // ── Manager : prospection VIP
  if (S.manager.hired && S.manager.vipInterval>0) {
    S.manager.vipTimer -= dt;
    if (S.manager.vipTimer <= 0) { S.manager.vipTimer=S.manager.vipInterval; spawnVIPClient(); }
  }

  // ── Outil : centrale d'appel (t5)
  tickToolClient(dt);

  // ── Commerciaux : XP/s
  for (const key of ['jerome','pascal']) {
    if (S.commercials[key].hired) S.xpFromClients += S.commercials[key].xpsRate * dt;
  }

  // ── Zones franchise
  tickLab(dt);
  tickZoneDirector(dt);
  tickCallCenter(dt);

  tickEventTimer(dt);
  advanceTime(dt);
  checkAchievements();
  updateUI();

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

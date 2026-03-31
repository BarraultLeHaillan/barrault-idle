// ════════════════════════════════════════════════════════
// game.js — Boucle principale et initialisation
// Chargé EN DERNIER.
// ════════════════════════════════════════════════════════

S.eventTimer = 150 + Math.random()*30;

buildUpgrades();
buildRoster();
updateHireBtn();
buildManagerSection();
buildCommercialSection();
buildFranchiseZoneSections();

addLog('<span class="lp">▶ Barrault Le Haillan — Janvier 2026 !</span>');
addLog('💡 Cliquez pour générer des gains. Recrutez pour des revenus passifs.');
addLog('🔊 Activez la musique avec le bouton en haut !');

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

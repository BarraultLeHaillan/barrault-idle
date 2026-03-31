// ════════════════════════════════════════════════════════
// cheat.js — Panneau Admin / Beta Test
// Activer / masquer : touche  `  (backtick, à gauche du 1)
// ════════════════════════════════════════════════════════

(function () {

  // ── XP cumulatif pour atteindre le niveau N ───────────
  function xpForLevel(n) {
    const t = [0];
    for (let i = 1; i <= 60; i++) t.push(t[i - 1] + Math.floor(100 * Math.pow(1.20, i - 1)));
    return t[Math.max(0, n - 1)] || 0;
  }

  // ── Refresh global ────────────────────────────────────
  function fullRefresh() {
    recalcEffects();
    buildUpgrades();
    refreshUpgrades();
    buildRoster();
    updateHireBtn();
    buildManagerSection();
    buildCommercialSection();
    refreshClickPanel();
    updateFranchiseWidget();
    updateFranchiseZoneVisibility();
    buildFranchiseZoneSections();
    updateUI();
  }

  // ── Actions ───────────────────────────────────────────
  const ACTIONS = [

    // ARGENT
    { label: '+10 000€',    cat: 'argent', fn: () => { S.money += 10000;       updateUI(); } },
    { label: '+100 000€',   cat: 'argent', fn: () => { S.money += 100000;      updateUI(); } },
    { label: '+1 000 000€', cat: 'argent', fn: () => { S.money += 1000000;     updateUI(); } },
    { label: '+100 M€',     cat: 'argent', fn: () => { S.money += 100000000;   updateUI(); } },

    // NIVEAU
    { label: 'Niv. 5',  cat: 'niveau', fn: () => { S.xpFromUpgrades = xpForLevel(5);  fullRefresh(); } },
    { label: 'Niv. 10', cat: 'niveau', fn: () => { S.xpFromUpgrades = xpForLevel(10); fullRefresh(); } },
    { label: 'Niv. 20', cat: 'niveau', fn: () => { S.xpFromUpgrades = xpForLevel(20); fullRefresh(); } },
    { label: 'Niv. 35', cat: 'niveau', fn: () => { S.xpFromUpgrades = xpForLevel(35); fullRefresh(); } },
    { label: 'Niv. 50', cat: 'niveau', fn: () => { S.xpFromUpgrades = xpForLevel(50); fullRefresh(); } },

    // ÉQUIPE
    {
      label: 'Recruter toute l\'équipe', cat: 'equipe', fn: () => {
        Object.keys(SELLERS_DEF).forEach(k => { if (!S.team.includes(k)) S.team.push(k); });
        recalcEffects(); buildRoster(); updateHireBtn(); updateUI();
        addLog('<span class="ly">👥 [ADMIN] Toute l\'équipe recrutée.</span>');
      }
    },
    {
      label: 'Recruter Damien', cat: 'equipe', fn: () => {
        if (!S.manager.hired && S.level >= 10) {
          S.manager.hired = true; S.manager.profile = 'damien'; S.manager.autoclickRate = 1;
          recalcEffects(); buildManagerSection(); updateUI();
          addLog('<span class="ly">🧑‍💼 [ADMIN] Damien recruté.</span>');
        } else if (S.level < 10) {
          addLog('<span class="lr">[ADMIN] Niveau 10 requis pour le manager.</span>');
        }
      }
    },
    {
      label: 'Commerciaux (Jérôme + Pascal)', cat: 'equipe', fn: () => {
        if (S.level < 20) { addLog('<span class="lr">[ADMIN] Niveau 20 requis pour les commerciaux.</span>'); return; }
        S.commercials.jerome.hired = true;
        S.commercials.pascal.hired = true;
        buildCommercialSection(); updateUI();
        addLog('<span class="ly">💼 [ADMIN] Jérôme & Pascal embauchés.</span>');
      }
    },

    // UPGRADES MAGASIN
    {
      label: 'Catalogue max (niv.15)', cat: 'upgrades', fn: () => {
        S.upg.catalog.level = 15; recalcEffects(); buildUpgrades(); refreshUpgrades(); updateUI();
        addLog('<span class="ly">📋 [ADMIN] Catalogue max.</span>');
      }
    },
    {
      label: 'Marketing max (niv.5)', cat: 'upgrades', fn: () => {
        if (S.level < 8) { addLog('<span class="lr">[ADMIN] Niveau 8 requis pour Marketing.</span>'); return; }
        S.upg.marketing.level = 5; recalcEffects(); buildUpgrades(); refreshUpgrades(); updateUI();
        addLog('<span class="ly">📢 [ADMIN] Marketing max.</span>');
      }
    },
    {
      label: 'Amél. clic max', cat: 'upgrades', fn: () => {
        CLICK_UPGRADES.forEach(u => {
          if (!S.clickUpgsBought.has(u.id)) { S.clickUpgsBought.add(u.id); u.apply(S); }
        });
        recalcEffects(); refreshClickPanel(); updateUI();
        addLog('<span class="ly">🖱️ [ADMIN] Améliorations clic max.</span>');
      }
    },
    {
      label: 'Tous les outils', cat: 'upgrades', fn: () => {
        TOOL_UPGRADES.forEach(u => {
          if (!S.toolsBought.has(u.id)) { S.toolsBought.add(u.id); u.apply(S); }
        });
        recalcEffects(); updateUI();
        addLog('<span class="ly">🔧 [ADMIN] Tous les outils achetés.</span>');
      }
    },
    {
      label: 'Manager upgrades max', cat: 'upgrades', fn: () => {
        if (!S.manager.hired) { addLog('<span class="lr">[ADMIN] Manager requis d\'abord.</span>'); return; }
        const groups = {};
        MANAGER_UPGRADES.forEach(u => { (groups[u.branch] = groups[u.branch]||[]).push(u); });
        Object.values(groups).forEach(upgs => upgs.forEach(u => {
          if (!S.manager.upgsBought.has(u.id)) { S.manager.upgsBought.add(u.id); u.apply(S); }
        }));
        recalcEffects(); buildManagerSection(); updateUI();
        addLog('<span class="ly">🧑‍💼 [ADMIN] Upgrades manager max.</span>');
      }
    },

    // FRANCHISE
    {
      label: 'Débloquer Franchise ×1', cat: 'franchise', fn: () => {
        S.totalEarned = Math.max(S.totalEarned, franchiseObjective(0));
        S.franchisesOwned = Math.max(S.franchisesOwned, 1);
        S.franchiseMultiplier = Math.max(S.franchiseMultiplier, 2);
        updateFranchiseWidget(); updateFranchiseZoneVisibility(); buildFranchiseZoneSections(); updateUI();
        addLog('<span class="ly">🏪 [ADMIN] Franchise 1 débloquée.</span>');
      }
    },
    {
      label: 'Débloquer toutes les Zones', cat: 'franchise', fn: () => {
        S.franchisesOwned = Math.max(S.franchisesOwned, 10);
        S.franchiseMultiplier = Math.max(S.franchiseMultiplier, 6);
        updateFranchiseWidget(); updateFranchiseZoneVisibility(); buildFranchiseZoneSections(); updateUI();
        addLog('<span class="ly">🏪 [ADMIN] Toutes les zones débloquées.</span>');
      }
    },
    {
      label: '+100M€ totalEarned', cat: 'franchise', fn: () => {
        S.totalEarned += 100000000; updateFranchiseWidget(); updateUI();
        addLog('<span class="ly">💰 [ADMIN] +100M€ totalEarned.</span>');
      }
    },

    // MISC
    {
      label: 'Avancer 1 mois', cat: 'misc', fn: () => {
        payMonthlyCA(); updateUI();
        addLog('<span class="lw">⏩ [ADMIN] Mois avancé.</span>');
      }
    },
    {
      label: 'Forcer événement', cat: 'misc', fn: () => {
        S.eventTimer = 0; addLog('<span class="lw">⏩ [ADMIN] Prochain événement forcé.</span>');
      }
    },
    {
      label: '🔴 RESET COMPLET', cat: 'misc', fn: () => {
        if (!confirm('[ADMIN] Réinitialiser la partie ? (irréversible)')) return;
        location.reload();
      }
    },
  ];

  // ── Couleurs par catégorie ────────────────────────────
  const CAT = {
    argent:    { label: '💰 Argent',    color: '#4dff88' },
    niveau:    { label: '⬆️ Niveau',    color: '#4dc8ff' },
    equipe:    { label: '👥 Équipe',    color: '#ffdd44' },
    upgrades:  { label: '🔧 Upgrades',  color: '#ff9966' },
    franchise: { label: '🏪 Franchise', color: '#cc88ff' },
    misc:      { label: '⚙️ Misc',      color: '#a0a0a0' },
  };

  // ── Construction du panneau ───────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #admin-panel {
      display:none; position:fixed; top:12px; right:12px; z-index:9999;
      background:#0a0f1a; border:2px solid #CC1020; border-radius:12px;
      padding:10px 12px; width:270px; max-height:90vh; overflow-y:auto;
      flex-direction:column; gap:8px; font-family:'Exo 2',sans-serif;
      box-shadow:0 0 24px #CC102055;
    }
    #admin-panel-title {
      font-family:'Press Start 2P',monospace; font-size:8px; color:#CC1020;
      text-align:center; letter-spacing:1px; padding-bottom:6px;
      border-bottom:1px solid #CC102044; margin-bottom:2px;
    }
    .admin-cat-title {
      font-size:9px; font-weight:700; letter-spacing:1px; margin-top:4px; margin-bottom:3px;
    }
    .admin-btn-row { display:flex; flex-wrap:wrap; gap:5px; }
    .admin-btn {
      font-family:'Press Start 2P',monospace; font-size:6px; padding:5px 7px;
      border-radius:5px; cursor:pointer; transition:all 0.15s; border:1px solid;
      background:transparent; white-space:nowrap; line-height:1.5;
    }
    .admin-hint {
      font-size:8px; color:#4a7a9b; text-align:center; margin-top:2px;
      border-top:1px solid #1B5EAB22; padding-top:5px;
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'admin-panel';

  let html = `<div id="admin-panel-title">⚙ ADMIN / BETA TEST</div>`;

  Object.entries(CAT).forEach(([catKey, catMeta]) => {
    const items = ACTIONS.filter(a => a.cat === catKey);
    if (!items.length) return;
    html += `<div class="admin-cat-title" style="color:${catMeta.color}">${catMeta.label}</div>`;
    html += `<div class="admin-btn-row">`;
    items.forEach((a, i) => {
      html += `<button class="admin-btn" data-idx="${ACTIONS.indexOf(a)}"
        style="color:${catMeta.color};border-color:${catMeta.color}44;"
        onmouseover="this.style.background='${catMeta.color}';this.style.color='#000';"
        onmouseout="this.style.background='transparent';this.style.color='${catMeta.color}';"
      >${a.label}</button>`;
    });
    html += `</div>`;
  });

  html += `<div class="admin-hint">Touche &#96; pour afficher / masquer</div>`;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // ── Gestion des clics ─────────────────────────────────
  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-idx]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    if (ACTIONS[idx]) ACTIONS[idx].fn();
  });

  // ── Toggle avec la touche ` ───────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === '`' || e.key === '²') {
      panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    }
  });

})();

// ════════════════════════════════════════════════════════
// modals.js — Modals : Prime, Événement, Augmentation, Fournisseur
// Dépend de : state.js, engine.js, ui.js
// ════════════════════════════════════════════════════════

// ── Prime / Heist ─────────────────────────────────────────
function openBonusModal(sellerKey) {
  S.bonusModalOpen = true;
  playSound('notification');
  const def = SELLERS_DEF[sellerKey];
  const isHeist = Math.random() < 0.15;
  let amount, amountLabel, isPercent = false, pct = 0;

  if (isHeist) {
    // Braquage : 1–10% du CA total (totalEarned)
    pct = 0.01 + Math.random() * 0.09;
    amount = Math.round(S.totalEarned * pct);
    amountLabel = `${Math.round(pct*100)}% du CA = ${fmt(amount)}`;
    isPercent = true;
  } else {
    const mult = 0.5 + Math.random() * 2.5;
    amount = Math.round(SELLERS_DEF[sellerKey].baseSalary * mult);
    amountLabel = fmt(amount);
  }

  const box      = document.getElementById('bonus-box');
  const title    = document.getElementById('bonus-modal-title');
  const amountEl = document.getElementById('bonus-amount-disp');
  const speechEl = document.getElementById('bonus-speech-text');

  if (isHeist) {
    box.className    = 'modal-box bonus-box heist';
    title.className  = 'modal-title heist';
    title.textContent = '🚨 DEMANDE EXCEPTIONNELLE';
    amountEl.className = 'bonus-amount heist-amount';
    speechEl.className = 'bonus-speech heist-speech';
    speechEl.textContent = `"${HEIST_SPEECHES[Math.floor(Math.random()*HEIST_SPEECHES.length)]}"`;
  } else {
    box.className    = 'modal-box bonus-box';
    title.className  = 'modal-title bonus';
    title.textContent = '💰 DEMANDE DE PRIME';
    amountEl.className = 'bonus-amount';
    speechEl.className = 'bonus-speech';
    const ph = BONUS_SPEECHES[sellerKey];
    speechEl.textContent = `"${ph[Math.floor(Math.random()*ph.length)]}"`;
  }

  document.getElementById('bonus-seller-name').textContent = def.name;
  amountEl.textContent = amountLabel;
  document.getElementById('bonus-risk-text').innerHTML =
    `Accepter → <span style="color:#4dff88">+50% prod. (15s)</span> · Refus → <span class="risk-dm">40% malus −50% prod. (15s)</span> · 60% sans effet`;

  const av = makeAvatar(sellerKey, 68);
  const dc = document.getElementById('bonus-avatar');
  dc.width=68; dc.height=68; dc.getContext('2d').drawImage(av, 0, 0);
  document.getElementById('bonus-modal').style.display = 'flex';

  const acc = document.getElementById('bonus-accept');
  const ref = document.getElementById('bonus-refuse');
  const na  = acc.cloneNode(true);
  const nr  = ref.cloneNode(true);
  acc.parentNode.replaceChild(na, acc);
  ref.parentNode.replaceChild(nr, ref);

  na.addEventListener('click', () => {
    // Payer la prime (sur la trésorerie actuelle)
    const fa = isPercent ? Math.round(S.money * pct) : amount;
    S.money = Math.max(0, S.money - fa);
    // Bonus de production du vendeur (+50% pendant 15s)
    S.bonusPerSeller[sellerKey] = 15;
    addLog(`<span class="lp">✓ Prime accordée à ${def.name}</span> — ${fmt(fa)} · ⚡ +50% prod. 15s !`);
    buildRoster();
    closeBonusModal();
  });

  nr.addEventListener('click', () => {
    const roll = Math.random();
    if (roll < 0.40) {
      S.malusPerSeller[sellerKey] = 15;
      addLog(`<span class="lo">⚠ ${def.name} boude — prod. −50% (15s)</span>`);
      buildRoster();
    } else {
      addLog(`<span class="lw">${def.name} : prime refusée — sans conséquence.</span>`);
    }
    closeBonusModal();
  });
}

function closeBonusModal() {
  document.getElementById('bonus-modal').style.display = 'none';
  S.bonusModalOpen = false;
  if (S.pendingBonusQueue.length > 0)
    setTimeout(()=>{ if (!S.bonusModalOpen&&!S.eventModalOpen&&!S.raiseModalOpen) openBonusModal(S.pendingBonusQueue.shift()); }, 800);
}

// ── Événement ────────────────────────────────────────────
function openEventModal(ev) {
  S.eventModalOpen = true;
  playSound(ev.type === 'positive' ? 'positive' : 'danger');
  const impact = ev.impact(S.money);
  if (impact.money) { S.money=Math.max(0,S.money+impact.money); if (impact.money>0) S.totalEarned+=impact.money; }
  if (impact.tempMalus) S.globalMalus = 90;
  const box = document.getElementById('event-box');
  box.className = 'modal-box event-box '+(ev.type==='positive'?'positive':'negative');
  document.getElementById('event-title').className  = 'modal-title '+(ev.type==='positive'?'positive':'negative');
  document.getElementById('event-title').textContent = ev.icon+' '+ev.title;
  document.getElementById('event-icon').textContent  = ev.icon;
  document.getElementById('event-desc').className    = 'event-desc'+(ev.type==='negative'?' negative':'');
  document.getElementById('event-desc').textContent  = ev.desc;
  document.getElementById('event-impact').className  = 'event-impact '+(ev.type==='positive'?'positive':'negative');
  document.getElementById('event-impact').textContent = impact.label;
  const ok = document.getElementById('event-ok');
  ok.className = 'modal-btn event-ok'+(ev.type==='positive'?' positive':'');
  document.getElementById('event-modal').style.display = 'flex';
  addLog(`<span class="${ev.type==='positive'?'lg':'lr'}">${ev.icon} ${ev.title}</span> — ${impact.label}`);
  const nok = ok.cloneNode(true); ok.parentNode.replaceChild(nok, ok);
  nok.addEventListener('click', () => {
    document.getElementById('event-modal').style.display = 'none'; S.eventModalOpen = false;
    if (S.pendingEventQueue.length > 0)
      setTimeout(()=>{ if (!S.bonusModalOpen&&!S.eventModalOpen&&!S.raiseModalOpen) openEventModal(S.pendingEventQueue.shift()); }, 600);
  });
}

// ── Augmentation annuelle ────────────────────────────────
function openRaiseModal(sellerKey) {
  if (!S.team.includes(sellerKey)) { if (S.pendingRaiseQueue.length>0) openRaiseModal(S.pendingRaiseQueue.shift()); return; }
  S.raiseModalOpen = true;
  const def = SELLERS_DEF[sellerKey];
  const pct = Math.random()<0.70 ? 20+Math.floor(Math.random()*21) : 50+Math.floor(Math.random()*101);
  const ph  = RAISE_SPEECHES[sellerKey];
  document.getElementById('raise-seller-name').textContent  = def.name;
  document.getElementById('raise-amount-disp').textContent  = `+${pct}% ancienneté`;
  document.getElementById('raise-speech-text').textContent  = `"${ph[Math.floor(Math.random()*ph.length)]}"`;
  document.getElementById('raise-risk-text').textContent    = 'Refus → 50% de démission';
  const av = makeAvatar(sellerKey, 68);
  const dc = document.getElementById('raise-avatar'); dc.width=68; dc.height=68; dc.getContext('2d').drawImage(av, 0, 0);
  document.getElementById('raise-modal').style.display = 'flex';
  addLog(`<span class="lw">📈 ${def.name} demande reconnaissance (+${pct}%)</span>`);

  const acc = document.getElementById('raise-accept');
  const ref = document.getElementById('raise-refuse');
  const na  = acc.cloneNode(true);
  const nr  = ref.cloneNode(true);
  acc.parentNode.replaceChild(na, acc);
  ref.parentNode.replaceChild(nr, ref);

  na.addEventListener('click', () => {
    if (!S.seniority[sellerKey]) S.seniority[sellerKey]={years:1,salaryMult:1};
    S.seniority[sellerKey].salaryMult *= (1+pct/100);
    addLog(`<span class="lp">✓ Reconnaissance accordée à ${def.name}</span>`);
    closeRaiseModal(); buildRoster();
  });
  nr.addEventListener('click', () => {
    if (Math.random() < 0.50) {
      S.fired[sellerKey]=true; S.team=S.team.filter(k=>k!==sellerKey);
      delete S.bonusTimers[sellerKey]; delete S.malusPerSeller[sellerKey]; delete S.bonusPerSeller[sellerKey];
      recalcEffects();
      addLog(`<span class="lr">💀 ${def.name} DÉMISSIONNE — refus de reconnaissance !</span>`);
      buildRoster(); updateHireBtn();
    } else {
      addLog(`<span class="lw">${def.name} : refus accepté — reste en poste (pour l'instant).</span>`);
    }
    closeRaiseModal();
  });
}
function closeRaiseModal() {
  document.getElementById('raise-modal').style.display = 'none'; S.raiseModalOpen = false;
  if (S.pendingRaiseQueue.length > 0)
    setTimeout(()=>{ if (!S.bonusModalOpen&&!S.eventModalOpen&&!S.raiseModalOpen) openRaiseModal(S.pendingRaiseQueue.shift()); }, 800);
}

// ── Fournisseur catalogue ─────────────────────────────────
let _supplierThreshold = null, _supplierSelected = null;
function openSupplierModal(threshold) {
  _supplierThreshold = threshold; _supplierSelected = null;
  const pool = SUPPLIER_POOLS[threshold];
  document.getElementById('supplier-modal-title').textContent = `📦 CATALOGUE NIV.${threshold} — ACCORD FOURNISSEUR`;
  const grid = document.getElementById('supplier-grid'); grid.innerHTML = '';
  document.getElementById('supplier-confirm').disabled = true;
  pool.forEach((sup, i) => {
    const card = document.createElement('div'); card.className = 'supplier-card';
    card.innerHTML = `<div class="supplier-logo">${sup.logo}</div><div class="supplier-name">${sup.name}</div><div class="supplier-offer">✦ ${sup.offer}</div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.supplier-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected'); _supplierSelected = i;
      document.getElementById('supplier-confirm').disabled = false;
    });
    grid.appendChild(card);
  });
  document.getElementById('supplier-modal').style.display = 'flex';
}
function confirmSupplier() {
  if (_supplierSelected === null || _supplierThreshold === null) return;
  const sup = SUPPLIER_POOLS[_supplierThreshold][_supplierSelected];
  sup.effect(S); recalcEffects();
  addLog(`<span class="lb">📦 Accord signé avec ${sup.name}</span> — ${sup.offer}`);
  document.getElementById('supplier-modal').style.display = 'none';
  _supplierThreshold = null; _supplierSelected = null;
}

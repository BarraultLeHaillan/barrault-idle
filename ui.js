// ════════════════════════════════════════════════════════
// ui.js — Tout ce qui touche le DOM (hors modals)
// Dépend de : state.js, engine.js
// ════════════════════════════════════════════════════════

// ── Horloge ───────────────────────────────────────────────
function updateClock() {
  const dn=DAY_NAMES[S.dayOfWeek], mn=MONTHS_FR[S.gameMonth-1];
  document.getElementById('clock-badge').textContent=`${dn} ${S.gameDay} ${mn} ${S.gameYear}`;
}

// ── Niveau & XP ──────────────────────────────────────────
function updateLevelUI() {
  const xp=calcXP(), {level,curr,next}=xpToLevel(xp);
  if (level!==S.level) { if (level>S.level) { addLog(`<span class="lb">⬆ NIVEAU ${level} !</span>`); playSound('level'); } S.level=level; }
  const pct=Math.min(100,Math.round(curr/Math.max(1,next)*100));
  document.getElementById('lvl').textContent  = level;
  document.getElementById('lvl2').textContent = level;
  document.getElementById('lvl-bar').style.width = pct+'%';
  document.getElementById('lvl-next').textContent = `XP: ${Math.floor(curr)} / ${Math.floor(next)}`;
}

// ── Stats ────────────────────────────────────────────────
function updateUI() {
  document.getElementById('money-disp').textContent   = fmt(S.money);
  document.getElementById('clients-disp').textContent = S.clientsServed;
  document.getElementById('clicks-disp').textContent  = S.clicks+' clic'+(S.clicks>1?'s':'');
  const catEl=document.getElementById('cat-disp'); if(catEl) catEl.textContent=25+S.upg.catalog.level*5;
  const rcb=document.getElementById('roster-count-badge'); if(rcb) rcb.textContent=S.team.length+'/7';
  const shopImg=document.getElementById('shop-img'); if(shopImg) shopImg.src=S.team.length>0?'png/magasin_full.png':'png/magasin-empty.png';
  document.getElementById('click-val').textContent    = '+'+fmt(clickValue());
  document.getElementById('click-chance').textContent = Math.round(Math.min(90,S.clickChance*100))+'% client';

  const dc=document.getElementById('debt-card');
  dc.style.display='none';

  // Plus d'alertes de charges

  document.getElementById('boost-ind').style.display=S.clickBoost>0?'block':'none';
  const r=Math.round(ips()); document.getElementById('rate-disp').textContent=(r>0?'+':'')+fmt(r)+'/s';
  updateHireBtn(); updateClock(); refreshUpgrades(); refreshClickPanel(); updateLevelUI(); refreshManagerSection(); refreshCommercialSection();
  // Hub trésorerie
  const hub=document.getElementById('treasury-amt'); if(hub) hub.textContent=fmt(S.money);
  const hub2=document.getElementById('treasury-rate'); if(hub2) { const r=Math.round(ips()); hub2.textContent=(r>0?'+':'')+fmt(r)+'/s'; }
  const tdCharges=document.getElementById('td-charges'); if(tdCharges) tdCharges.textContent='—';
  if(document.getElementById('td-team-ca')) {
    const zdMult = (S.franchisesOwned>=2 && S.zoneDirector.active) ? (1+S.zoneDirector.boostPct) : 1;
    const ca = S.team.reduce((s,k)=>{
      let v=(S.sellerCosts[k]||10000)*2;
      if((S.malusPerSeller[k]||0)>0) v*=0.5;
      else if((S.bonusPerSeller[k]||0)>0) v*=1.5;
      return s+v;
    },0) * fm() * zdMult;
    document.getElementById('td-team-ca').textContent = S.team.length>0 ? '+'+fmt(Math.round(ca)) : '—';
  }
  // CA commerciaux
  const commCaRow=document.getElementById('td-comm-ca-row');
  if (commCaRow) {
    const totalCommCa=['jerome','pascal'].filter(k=>S.commercials[k].hired).reduce((s,k)=>s+S.commercials[k].caObjective*fm(),0);
    commCaRow.style.display=totalCommCa>0?'':'none';
    const commCaEl=document.getElementById('td-comm-ca'); if(commCaEl) commCaEl.textContent=totalCommCa>0?'+'+fmt(Math.round(totalCommCa)):'—';
  }
  // Revenus manager (monthlyCa) — masqué si Data Mining actif
  const mgrCaRow=document.getElementById('td-mgr-ca-row');
  if (mgrCaRow) {
    const mgrMonthly=S.manager.hired&&S.manager.monthlyCa>0&&!S.ultimes.dataMining ? Math.round(S.manager.monthlyCa*fm()) : 0;
    mgrCaRow.style.display=mgrMonthly>0?'':'none';
    const mgrCaEl=document.getElementById('td-mgr-ca'); if(mgrCaEl) mgrCaEl.textContent=mgrMonthly>0?'+'+fmt(mgrMonthly)+'/mois':'—';
  }
  // B800 IA /s
  const bioRow=document.getElementById('td-bionique-row');
  if (bioRow) {
    bioRow.style.display=S.ultimes.staffBionique?'':'none';
    const bioEl=document.getElementById('td-bionique'); if(bioEl&&S.ultimes.staffBionique) bioEl.textContent='+'+fmt(1e8*fm())+'/s';
  }
  // Data Center /s
  const dcRow=document.getElementById('td-datacenter-row');
  if (dcRow) {
    dcRow.style.display=S.ultimes.dataMining?'':'none';
    const dcEl=document.getElementById('td-datacenter'); if(dcEl&&S.ultimes.dataMining) dcEl.textContent='+'+fmt(1e9*fm())+'/s';
  }
  updateFranchiseWidget();
  const tdDebt=document.getElementById('td-debt-row'); if(tdDebt) tdDebt.style.display='none';
  const tdBoost=document.getElementById('td-boost-row'); if(tdBoost) tdBoost.style.display='none';
  const tdMalus=document.getElementById('td-malus-row'); if(tdMalus) tdMalus.style.display='none';
  updateFranchiseZoneVisibility();
  refreshZoneUpgButtons();
}

// ── Améliorations Magasin ────────────────────────────────
function buildUpgrades() {
  const list=document.getElementById('upg-list'); list.innerHTML='';
  // Catalogue et Marketing (système niveau)
  Object.keys(S.upg).forEach(key=>{
    const u=S.upg[key];
    const item=document.createElement('div'); item.className='upg-item unlocked'; item.id='upg-item-'+key;
    item.innerHTML=`<div class="upg-icon">${u.icon}</div><div class="upg-info"><div class="upg-name">${u.name}</div><div class="upg-desc">${u.desc}</div><div class="upg-lv" id="upg-lv-${key}">—</div></div><button class="upg-btn" id="upg-btn-${key}">...</button>`;
    list.appendChild(item);
    document.getElementById('upg-btn-'+key).addEventListener('click',()=>buyUpg(key));
  });
  // Outils (5 upgrades nommés)
  const toolItem=document.createElement('div'); toolItem.className='upg-item unlocked'; toolItem.id='upg-item-tools';
  toolItem.innerHTML=`<div class="upg-icon">💻</div><div class="upg-info"><div class="upg-name">OUTILS</div><div class="upg-desc">Logiciels & équipements</div><div class="upg-lv" id="upg-lv-tools">—</div></div><button class="upg-btn" id="upg-btn-tools">...</button>`;
  list.appendChild(toolItem);
  document.getElementById('upg-btn-tools').addEventListener('click', openToolModal);
}

function refreshUpgrades() {
  Object.keys(S.upg).forEach(key=>{
    const u=S.upg[key], c=upgCost(key), isMax=u.level>=u.cap, lvOk=S.level>=u.reqLv, can=S.money>=c&&!isMax&&lvOk;
    const btn=document.getElementById('upg-btn-'+key), lvEl=document.getElementById('upg-lv-'+key), itm=document.getElementById('upg-item-'+key);
    if (!btn) return;
    let lvTxt='';
    if (key==='catalog')   lvTxt=`${25+u.level*5} refs · Niv.${u.level}`;
    else if (key==='marketing') lvTxt=u.level>0?`Fréq. pro +${u.level*15}%`:'Non actif';
    lvEl.textContent=isMax?'✓ MAX':!lvOk?`🔒 Niv.${u.reqLv} requis`:lvTxt+` · Niv.${u.level}`;
    btn.textContent=isMax?'MAX':!lvOk?'VERROUILLÉ':fmt(c);
    btn.disabled=!can||isMax; btn.className='upg-btn'+(can&&!isMax?' ok':'');
    if (itm) itm.className='upg-item'+(lvOk?' unlocked':' locked-lv');
  });
  // Outils
  const toolBtn=document.getElementById('upg-btn-tools'), toolLv=document.getElementById('upg-lv-tools');
  if (!toolBtn) return;
  const bought=S.toolsBought.size, lvOkT=S.level>=5;
  const nextTool=TOOL_UPGRADES.find(u=>!S.toolsBought.has(u.id)&&S.level>=u.reqLv&&S.money>=toolCost(u.id));
  toolLv.textContent=bought>=5?'✓ MAX':!lvOkT?'🔒 Niv.5 requis':`${bought}/5 installés`;
  if (bought>=5) { toolBtn.textContent='MAX'; toolBtn.disabled=true; toolBtn.className='upg-btn'; }
  else { toolBtn.textContent=lvOkT?'CHOISIR':'🔒 Niv.5'; toolBtn.disabled=!lvOkT; toolBtn.className='upg-btn'+(nextTool?' ok':''); }
  document.getElementById('upg-item-tools').className='upg-item'+(lvOkT?' unlocked':' locked-lv');
}

function buyUpg(key) {
  const u=S.upg[key], c=upgCost(key);
  if (S.money<c||u.level>=u.cap||S.level<u.reqLv) return;
  S.money-=c; u.level++; S.upgBought++; S.xpFromUpgrades+=50*u.reqLv;
  recalcEffects();
  const msgs={catalog:'Catalogue étendu', marketing:'Marketing lancé'};
  addLog(`<span class="lp">▶ ${msgs[key]||key}</span> (Niv.${u.level})`);
  if (key==='catalog') {
    if (u.level===6) addLog(`<span class="lb">★ Clients pro débloqués !</span>`);
    checkSupplierUnlocks();
  }
}

// ── Manager auto-clic visuel ─────────────────────────────
function showManagerAutoClick(val) {
  const area=document.getElementById('cust-area'); if(!area) return;
  const pop=document.createElement('div'); pop.className='mgr-click-pop';
  pop.style.left=(20+Math.random()*60)+'%';
  pop.style.bottom=(30+Math.random()*25)+'px';
  pop.textContent='🖱️ +'+fmt(val);
  area.appendChild(pop);
  setTimeout(()=>{ pop.style.opacity='0'; pop.style.transition='opacity 0.3s'; setTimeout(()=>{ if(pop.parentNode) pop.parentNode.removeChild(pop); },300); },900);
}

// ── Widget franchise ──────────────────────────────────────
function updateFranchiseWidget() {
  const fill=document.getElementById('fran-prog-fill');
  const label=document.getElementById('fran-prog-label');
  const eligArea=document.getElementById('fran-eligible-area');
  const bonusPrev=document.getElementById('fran-bonus-preview');
  const claimBtn=document.getElementById('fran-claim-btn');
  const multDisp=document.getElementById('fran-mult-display');
  const multVal=document.getElementById('fran-mult-val');
  const countDisp=document.getElementById('fran-count-disp');
  if (!fill) return;

  const obj = franchiseObjective(S.franchisesOwned);
  const pct = Math.min(100, S.totalEarned / obj * 100);
  fill.style.width = pct.toFixed(1)+'%';
  label.textContent = fmt(S.totalEarned)+' / '+fmt(obj)+' gagnés';

  const canClaim = S.totalEarned >= obj && S.franchisesOwned < 99;
  eligArea.style.display = canClaim ? '' : 'none';
  if (canClaim) {
    const excess    = S.totalEarned - obj;
    const runBonus  = 2 + excess / obj;
    const nextMult  = (S.franchiseMultiplier + runBonus).toFixed(2);
    bonusPrev.textContent = '×'+runBonus.toFixed(2)+' → total ×'+nextMult;
  }

  if (S.franchisesOwned > 0) {
    multDisp.style.display = '';
    multVal.textContent = fm().toFixed(2);
    countDisp.style.display = '';
    countDisp.textContent = `${S.franchisesOwned} franchisé${S.franchisesOwned>1?'s':''} ouvert${S.franchisesOwned>1?'s':''}`;
  } else {
    multDisp.style.display = 'none';
    countDisp.style.display = 'none';
  }

  // Arbre de progression + thème fond
  updateFranchiseTree();
  updateBgTheme();
}

// ── Modal outils ─────────────────────────────────────────
function openToolModal() {
  if (S.level < 5) return;
  const grid=document.getElementById('tool-grid'); grid.innerHTML='';
  TOOL_UPGRADES.forEach(u=>{
    const bought=S.toolsBought.has(u.id), lvOk=S.level>=u.reqLv, c=toolCost(u.id), canBuy=!bought&&lvOk&&S.money>=c;
    const card=document.createElement('div'); card.className='tool-card'+(bought?' bought':lvOk?'':' locked');
    card.innerHTML=`<div class="tool-icon">${u.icon}</div><div class="tool-name">${u.name}</div><div class="tool-desc">${u.desc}</div><div class="tool-req">Niv.${u.reqLv}</div><button class="upg-btn${canBuy?' ok':''}" ${bought||!canBuy?'disabled':''}>${bought?'✓ INSTALLÉ':!lvOk?`🔒 Niv.${u.reqLv}`:fmt(c)}</button>`;
    if (!bought&&lvOk) card.querySelector('button').addEventListener('click',()=>buyTool(u.id));
    grid.appendChild(card);
  });
  document.getElementById('tool-modal').style.display='flex';
}

function buyTool(id) {
  const u=TOOL_UPGRADES.find(x=>x.id===id); if (!u) return;
  const c=toolCost(u.id);
  if (S.toolsBought.has(id)||S.level<u.reqLv||S.money<c) return;
  S.money-=c; S.toolsBought.add(id); u.apply(S);
  S.upgBought++; S.xpFromUpgrades+=50*u.reqLv;
  addLog(`<span class="lp">💻 ${u.name}</span> installé !`);
  document.getElementById('tool-modal').style.display='none';
  buildUpgrades();
}

// ── Section commerciaux ───────────────────────────────────
let _commStateKey = null;
function buildCommercialSection() {
  const el=document.getElementById('commercial-section'); if (!el) return;
  if (S.level<20) {
    el.innerHTML=`<div class="mgr-locked">🔒 Disponible au niveau 20<br><span class="mgr-locked-sub">Commerciaux — CA mensuel + XP/s</span></div>`;
    return;
  }
  let html='';
  for (const key of ['jerome','pascal']) {
    const p=COMMERCIAL_PROFILES[key], c=S.commercials[key];
    if (!c.hired) {
      const can=S.money>=p.hireCost;
      html+=`<div class="comm-card">
        <div class="comm-header"><span class="comm-name">${p.name}</span><span class="comm-spec">${p.spec}</span></div>
        <div class="comm-quote">${p.quote}</div>
        <div class="comm-stats">💼 Obj. ${fmt(p.baseCa)}/mois · 💰 ${fmt(p.salary)}/mois + ${Math.round(p.commPct*100)}% comm. · ⚡ ${p.baseXps} XP/s</div>
        <button class="upg-btn${can?' ok':''}" id="comm-hire-${key}" ${!can?'disabled':''}>${can?`RECRUTER — ${fmt(p.hireCost)}`:`Fonds insuffisants (${fmt(p.hireCost)})`}</button>
      </div>`;
    } else {
      const nextUpg=COMMERCIAL_UPGRADES.filter(u=>u.key===key&&u.level===c.level+1)[0];
      const canUpg=nextUpg&&S.money>=nextUpg.cost;
      const av=makeAvatar(null,32,p);
      html+=`<div class="comm-card hired">
        <div class="comm-header">
          <canvas id="comm-av-${key}" width="32" height="32" class="comm-avatar"></canvas>
          <div><span class="comm-name">${p.name}</span> <span class="comm-lvl">Niv.${c.level}</span><br><span class="comm-spec">${p.spec}</span></div>
        </div>
        <div class="comm-stats">💼 Obj. ${fmt(c.caObjective)}/mois · ⚡ ${c.xpsRate} XP/s</div>
        ${nextUpg?`<button class="upg-btn${canUpg?' ok':''}" id="comm-upg-${key}" ${!canUpg?'disabled':''}>${canUpg?`INVESTIR — ${fmt(nextUpg.cost)}`:fmt(nextUpg.cost)}<br><span style="font-size:5px;">${nextUpg.desc}</span></button>`:'<div style="color:#4dff88;font-size:8px;text-align:center;">✓ NIVEAU MAX</div>'}
      </div>`;
    }
  }
  // Ultime Chasseur de Têtes
  const uChasseur = ULTIMES_DEF.find(x=>x.id==='chasseurTetes');
  if (S.ultimes.chasseurTetes) {
    html+=`<div class="ultime-zone-active" style="margin-top:10px;">
      <div class="ultime-zone-active-header"><span>🎯</span><span class="ultime-zone-name">CHASSEUR DE TÊTES ACTIF</span><span class="ultime-zone-check">✓</span></div>
      <div class="ultime-zone-active-desc">Coule un concurrent toutes les 5–30s · +10 Md€</div>
    </div>`;
  } else if (uChasseur && uChasseur.unlock(S)) {
    const canAfford = S.money >= uChasseur.cost;
    html+=`<div class="ultime-zone-avail" style="margin-top:10px;">
      <div class="ultime-zone-avail-info">
        <div class="ultime-zone-tag">COMMERCIAUX ULTIME</div>
        <div class="ultime-zone-avail-name">🎯 CHASSEUR DE TÊTES</div>
        <div class="ultime-zone-avail-desc">Concurrent coulé toutes les 5–30s · +1 Bn€</div>
      </div>
      <button class="upg-btn${canAfford?' ok':''}" id="ultime-comm-buy-btn" ${!canAfford?'disabled':''}>${canAfford?'ACHETER — '+fmt(1e14):fmt(1e14)}</button>
    </div>`;
  }

  el.innerHTML=html;
  // Attacher listeners
  for (const key of ['jerome','pascal']) {
    const c=S.commercials[key];
    const hireBtn=document.getElementById('comm-hire-'+key);
    if (hireBtn) hireBtn.addEventListener('click',()=>hireCommercial(key));
    const upgBtn=document.getElementById('comm-upg-'+key);
    if (upgBtn) upgBtn.addEventListener('click',()=>upgradeCommercial(key));
    if (c.hired) {
      const cvs=document.getElementById('comm-av-'+key);
      if (cvs) { const p2=COMMERCIAL_PROFILES[key]; cvs.getContext('2d').drawImage(makeAvatar(null,32,p2),0,0); }
    }
  }
  const ultBtn = document.getElementById('ultime-comm-buy-btn');
  if (ultBtn) ultBtn.addEventListener('click', ()=>buyUltime('chasseurTetes'));
}

function refreshCommercialSection() {
  const key=`${S.level>=20}|${S.commercials.jerome.hired}|${S.commercials.pascal.hired}|${S.commercials.jerome.level}|${S.commercials.pascal.level}|${S.ultimes.chasseurTetes}`;
  if (key!==_commStateKey) { _commStateKey=key; buildCommercialSection(); return; }
  if (S.level<20) return;
  for (const k of ['jerome','pascal']) {
    const p=COMMERCIAL_PROFILES[k], c=S.commercials[k];
    const hb=document.getElementById('comm-hire-'+k);
    if (hb) { const can=S.money>=p.hireCost; hb.disabled=!can; hb.className='upg-btn'+(can?' ok':''); hb.textContent=can?`RECRUTER — ${fmt(p.hireCost)}`:`Fonds insuffisants (${fmt(p.hireCost)})`; }
    const ub=document.getElementById('comm-upg-'+k);
    if (ub) { const nu=COMMERCIAL_UPGRADES.find(u=>u.key===k&&u.level===c.level+1); if(nu){const can=S.money>=nu.cost;ub.disabled=!can;ub.className='upg-btn'+(can?' ok':'');} }
  }
  const ultBtn=document.getElementById('ultime-comm-buy-btn');
  if (ultBtn) { const can=S.money>=1e14; ultBtn.disabled=!can; ultBtn.className='upg-btn'+(can?' ok':''); ultBtn.textContent=can?'ACHETER — '+fmt(1e14):fmt(1e14); }
}

function hireCommercial(key) {
  const p=COMMERCIAL_PROFILES[key], c=S.commercials[key];
  if (c.hired||S.money<p.hireCost) return;
  S.money-=p.hireCost;
  c.hired=true; c.level=1; c.caObjective=p.baseCa; c.xpsRate=p.baseXps;
  S.xpFromUpgrades+=500;
  addLog(`<span class="lb">💼 ${p.name} recruté ! Obj. CA ${fmt(p.baseCa)}/mois · ${p.baseXps} XP/s</span>`);
  _commStateKey=null; buildCommercialSection();
}

function upgradeCommercial(key) {
  const c=S.commercials[key];
  const upg=COMMERCIAL_UPGRADES.find(u=>u.key===key&&u.level===c.level+1);
  if (!upg||S.money<upg.cost) return;
  S.money-=upg.cost; c.level=upg.level; c.caObjective+=upg.caBoost; c.xpsRate+=upg.xpsBoost;
  S.xpFromUpgrades+=500;
  addLog(`<span class="lb">💼 ${COMMERCIAL_PROFILES[key].name}</span> → Niv.${c.level} · Obj. CA ${fmt(c.caObjective)}/mois · ${c.xpsRate} XP/s`);
  _commStateKey=null; buildCommercialSection();
}

// ── Roster vendeurs ──────────────────────────────────────
function buildRoster() {
  const list=document.getElementById('team-roster-list');

  // Staff Bionique actif → B800 IA remplace tous les vendeurs
  if (S.ultimes.staffBionique) {
    const perSec = fmt(1e8 * fm());
    list.innerHTML=`<div class="bionique-card">
      <div class="bionique-icon">🤖</div>
      <div class="bionique-info">
        <div class="bionique-name">B800 IA</div>
        <div class="bionique-rate">+${perSec}/s</div>
        <div class="bionique-desc">CA continu — remplace l'équipe</div>
      </div>
      <span class="ultime-zone-check">✓</span>
    </div>`;
    return;
  }

  if (S.team.length===0) { list.innerHTML='<div style="font-size:10px;color:#4a7a9b;text-align:center;padding:0.8rem 0;font-style:italic;">Aucun vendeur</div>'; }
  else {
    list.innerHTML='';
    for (const key of S.team) {
      const def=SELLERS_DEF[key], card=document.createElement('div');
      const mal=(S.malusPerSeller[key]||0)>0, bon=(S.bonusPerSeller[key]||0)>0;
      let cls='seller-card', stCls='ok', stTxt='✓ En poste';
      if (mal)      { cls='seller-card s-malus';  stCls='malus'; stTxt=`⚡ Malus −50% (${Math.ceil(S.malusPerSeller[key])}s)`; }
      else if (bon) { cls='seller-card s-bonus';  stCls='bonus'; stTxt=`✨ Bonus +50% (${Math.ceil(S.bonusPerSeller[key])}s)`; }
      card.className=cls;
      const av=makeAvatar(key,32); av.className='seller-avatar';
      const yrs=S.seniority[key]?.years||0;
      card.innerHTML=`<div class="seller-info"><div class="seller-name">${def.name}</div><div class="seller-spec">${def.spec}</div><div class="seller-status ${stCls}">${stTxt}</div></div><div class="seller-right"><div class="seller-years">${yrs>0?yrs+' an'+(yrs>1?'s':''):''}</div></div>`;
      card.insertBefore(av,card.firstChild);
      list.appendChild(card);
    }
  }

  // Bouton ULTIME si conditions remplies
  const uStaff = ULTIMES_DEF.find(x=>x.id==='staffBionique');
  if (uStaff && uStaff.unlock(S)) {
    const canAfford = S.money >= uStaff.cost;
    const div = document.createElement('div');
    div.className = 'ultime-zone-avail'; div.style.marginTop='8px';
    div.innerHTML = `<div class="ultime-zone-avail-info">
      <div class="ultime-zone-tag">ÉQUIPE ULTIME</div>
      <div class="ultime-zone-avail-name">🤖 STAFF BIONIQUE</div>
      <div class="ultime-zone-avail-desc">B800 IA — CA mensuel en €/s continu</div>
    </div>
    <button class="upg-btn${canAfford?' ok':''}" id="ultime-equipe-buy-btn" ${!canAfford?'disabled':''}>${canAfford?'ACHETER — 10 Md€':'10 Md€'}</button>`;
    div.querySelector('#ultime-equipe-buy-btn')?.addEventListener('click', ()=>buyUltime('staffBionique'));
    list.appendChild(div);
  }
}

// ── Bouton recruter ──────────────────────────────────────
let _hireState = null;
function updateHireBtn() {
  const btn=document.getElementById('hire-btn');
  const full=S.team.length>=7||availableSellers().length===0;
  const maxT=MAX_TEAM_AT_LEVEL(S.level), lvLocked=S.team.length>=maxT&&S.team.length<7;
  const hc=hireCost(), canAfford=S.money>=hc;
  const nextLv=NEXT_TEAM_LEVEL[S.team.length+1]||'MAX';
  // Calculer l'état
  const state = full?'full':lvLocked?'locked:'+nextLv:canAfford?'ok:'+hc:'nok:'+hc;
  if (state===_hireState) return; // rien n'a changé
  _hireState=state;
  if (full)          { btn.disabled=true;  btn.innerHTML='✓ COMPLET'; }
  else if (lvLocked) { btn.disabled=true;  btn.innerHTML=`🔒 NIV.${nextLv}<br><span style="font-size:5px;color:#4a7a9b;">pour recruter</span>`; }
  else               { btn.disabled=!canAfford; btn.innerHTML=`+ RECRUTER<br><span style="color:${canAfford?'#4dff88':'#ff6677'}">${fmt(hc)}</span>`; }
}

// ── Panel amélioration clic (g. — simple bouton + arbre) ─
let _lastClickUpgId = null;
function refreshClickPanel() {
  const row=document.getElementById('click-upg-row');
  if (!row) return;

  // État : Ultime actif
  if (S.ultimes.vibromasseur) {
    if (row.dataset.state !== 'ultime-on') {
      row.dataset.state = 'ultime-on'; _lastClickUpgId = null;
      row.innerHTML = `<div class="ultime-zone-active" style="width:100%;">
        <div class="ultime-zone-active-header"><span>💥</span><span class="ultime-zone-name">VIBROMASSEUR ACTIF</span><span class="ultime-zone-check">✓</span></div>
        <div class="ultime-zone-active-desc">×10 clics manuels · +10 clics/s auto · +10% chance client</div>
      </div>`;
    }
    return;
  }

  const next=CLICK_UPGRADES.find(u=>!S.clickUpgsBought.has(u.id));

  // État : Toutes les amélios achetées → bouton ULTIME
  if (!next) {
    const canAfford = S.money >= 1e9;
    if (row.dataset.state !== 'ultime-btn') {
      row.dataset.state = 'ultime-btn'; _lastClickUpgId = null;
      row.innerHTML = `<div class="ultime-zone-avail" style="width:100%;">
        <div class="ultime-zone-avail-info">
          <div class="ultime-zone-tag">CLIC ULTIME</div>
          <div class="ultime-zone-avail-name">💥 VIBROMASSEUR</div>
          <div class="ultime-zone-avail-desc">×10 clics · +10 clics/s · +10% chance client</div>
        </div>
        <button class="upg-btn${canAfford?' ok':''}" id="ultime-clic-buy-btn" ${!canAfford?'disabled':''}>${canAfford?'ACHETER — 1 Md€':'1 Md€'}</button>
      </div>`;
      document.getElementById('ultime-clic-buy-btn')?.addEventListener('click', ()=>buyUltime('vibromasseur'));
    } else {
      const btn=document.getElementById('ultime-clic-buy-btn');
      if (btn) { btn.disabled=!canAfford; btn.className='upg-btn'+(canAfford?' ok':''); btn.textContent=canAfford?'ACHETER — 1 Md€':'1 Md€'; }
    }
    return;
  }

  // État : upgrade normale
  if (row.dataset.state==='ultime-btn'||row.dataset.state==='ultime-on') { row.dataset.state=''; _lastClickUpgId=null; }
  if (_lastClickUpgId !== next.id) {
    _lastClickUpgId = next.id; row.dataset.state='upg';
    row.innerHTML=`<div class="upg-icon" style="width:28px;height:28px;font-size:14px;flex-shrink:0;">${next.icon}</div><div class="upg-info" style="flex:1;min-width:0;"><div class="upg-name">${next.name}</div><div class="upg-desc">${next.desc}</div></div><button class="upg-btn" id="click-upg-btn" style="flex-shrink:0;min-width:68px;">${fmt(next.cost)}</button>`;
    document.getElementById('click-upg-btn').addEventListener('click', ()=>buyClickUpg(next.id));
  }
  const btn=document.getElementById('click-upg-btn');
  if (!btn) return;
  const can=S.money>=next.cost&&S.level>=next.reqLv;
  btn.disabled=!can; btn.className='upg-btn'+(can?' ok':'');
  btn.textContent=S.level<next.reqLv?'🔒 Niv.'+next.reqLv:fmt(next.cost);
}

function buyClickUpg(id) {
  const u=CLICK_UPGRADES.find(x=>x.id===id);
  if (!u||S.clickUpgsBought.has(id)||S.money<u.cost||S.level<u.reqLv) return;
  S.money-=u.cost; S.clickUpgsBought.add(id); S.upgBought++; S.xpFromUpgrades+=50*u.reqLv;
  u.apply(S);
  addLog(`<span class="lp">🖱️ ${u.name}</span> acheté !`);
}

// ── Modal arbre améliorations clic (lecture seule) ───────
function openClickTree() {
  const ol=document.getElementById('click-tree-modal');
  if (!ol) return;
  const list=document.getElementById('click-tree-list'); list.innerHTML='';
  CLICK_UPGRADES.forEach(u=>{
    const bought=S.clickUpgsBought.has(u.id);
    const isNext=!bought&&CLICK_UPGRADES.findIndex(x=>!S.clickUpgsBought.has(x.id))===CLICK_UPGRADES.indexOf(u);
    const item=document.createElement('div');
    item.className='tree-item'+(bought?' bought':isNext?' next':'');
    item.innerHTML=`
      <span style="font-size:16px;">${u.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Press Start 2P',monospace;font-size:6px;color:${bought?'#4dff88':isNext?'#ffdd44':'#6b8eb5'};">${u.name}</div>
        <div style="font-size:9px;color:#4a7a9b;margin-top:2px;">${u.desc} · ${fmt(u.cost)} · Niv.${u.reqLv}</div>
      </div>
      <span class="tree-badge ${bought?'done':isNext?'next':'locked'}">${bought?'✓':isNext?'SUIV.':'🔒'}</span>`;
    list.appendChild(item);
  });
  ol.style.display='flex';
}

// ── Manager UI — nouveau système ─────────────────────────
const BRANCH_META = {
  autoclick: { label:'AUTO-CLIC',   icon:'🖱️', color:'#4dc8ff' },
  team:      { label:'ÉQUIPE',      icon:'👥', color:'#4dff88' },
  income:    { label:'REVENUS',     icon:'💰', color:'#ffdd44' },
  prospect:  { label:'PROSPECTION', icon:'🤝', color:'#ffaa00' },
};

let _mgrStateKey = null;

function buildManagerSection() {
  const el = document.getElementById('manager-section-content');
  if (!el) return;

  // Data Mining actif → remplace manager + arbre entier
  if (S.ultimes.dataMining) {
    el.innerHTML = `<div class="ultime-zone-active">
      <div class="ultime-zone-active-header"><span>🖥️</span><span class="ultime-zone-name">DATA CENTER ACTIF</span><span class="ultime-zone-check">✓</span></div>
      <div class="ultime-zone-active-desc">+1 Md€/s · Clients désactivés</div>
    </div>`;
    return;
  }

  if (S.level < 10) {
    el.innerHTML = `<div class="mgr-locked">🔒 Disponible au niveau 10<br><span class="mgr-locked-sub">50 000€ · 1 clic/s automatique inclus</span></div>`;
    return;
  }

  if (!S.manager.hired) {
    const can = S.money >= 50000;
    const p = MANAGER_PROFILES.damien;
    el.innerHTML = `
      <div class="mgr-recruit-wrap">
        <div class="mgr-recruit-desc">Recrutez Damien pour automatiser votre magasin.</div>
        <div class="mgr-recruit-perk">✦ ${p.spec}</div>
        <div class="mgr-recruit-perk">✦ 1 clic/s automatique inclus dès l'achat</div>
        <div class="mgr-recruit-perk">✦ Arbre d'améliorations en 4 branches</div>
        <button class="upg-btn${can?' ok':''}" id="mgr-recruit-btn" ${!can?'disabled':''}>${can?'RECRUTER DAMIEN — 50 000€':'Fonds insuffisants (50 000€)'}</button>
      </div>`;
    document.getElementById('mgr-recruit-btn').addEventListener('click', () => {
      if (S.money < 50000) { addLog('<span class="lr">Fonds insuffisants !</span>'); return; }
      S.money -= 50000; S.manager.hired = true; S.manager.profile = 'damien';
      S.manager.autoclickRate = 1;
      recalcEffects(); S.upgBought++; S.xpFromUpgrades += 200;
      addLog(`<span class="ly">🧑‍💼 Damien recruté ! +1 clic/s automatique.</span>`);
      _mgrStateKey = null; buildManagerSection();
    });
    return;
  }

  const p = MANAGER_PROFILES[S.manager.profile];
  const vp = S.manager.vipInterval > 0 ? S.manager.vipInterval+'s' : '—';
  let html = `<div class="mgr-profile-bar">
    <canvas id="mgr-av-canvas" width="40" height="40" class="mgr-avatar"></canvas>
    <div class="mgr-profile-info">
      <div class="mgr-profile-name">${p.name}</div>
      <div class="mgr-profile-spec">${p.spec}</div>
      <div class="mgr-profile-stats">🖱️ ${S.manager.autoclickRate}/s &nbsp;·&nbsp; 👥 +${Math.round(S.manager.teamBoost*100)}% &nbsp;·&nbsp; 💰 ${S.manager.monthlyCa>0?'+'+fmt(S.manager.monthlyCa)+'/mois':'—'} &nbsp;·&nbsp; 🤝 ${vp}</div>
    </div>
  </div>
  <div class="mgr-tree">`;

  for (const branch of ['autoclick','team','income','prospect']) {
    const meta = BRANCH_META[branch];
    const upgs = MANAGER_UPGRADES.filter(u => u.branch === branch);
    html += `<div class="mgr-branch"><div class="mgr-branch-title" style="color:${meta.color}">${meta.icon} ${meta.label}</div>`;
    upgs.forEach((u, idx) => {
      const bought    = S.manager.upgsBought.has(u.id);
      const prevOk    = idx === 0 || S.manager.upgsBought.has(upgs[idx-1].id);
      const lvOk      = S.level >= u.reqLv;
      const can       = !bought && prevOk && lvOk && S.money >= u.cost;
      const nodeClass = bought ? 'mgr-upg-node bought' : prevOk ? 'mgr-upg-node available' : 'mgr-upg-node locked-prev';
      const btnTxt    = bought ? '✓ OK' : !prevOk ? '🔒' : !lvOk ? '🔒 Niv.'+u.reqLv : fmt(u.cost);
      html += `<div class="${nodeClass}">
        <div class="mgr-upg-head"><span class="mgr-upg-icon">${u.icon}</span><span class="mgr-upg-name">${u.name}</span></div>
        <div class="mgr-upg-desc">${u.desc}</div>
        <button class="upg-btn${can?' ok':''}" id="mgr-btn-${u.id}" ${bought||!can?'disabled':''}>${btnTxt}</button>
      </div>`;
      if (idx < upgs.length - 1) html += `<div class="mgr-upg-arrow">▼</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // Bouton ultime Data Mining (visible quand toutes upgrades achetées)
  const allMgrBought = S.manager.upgsBought.size >= MANAGER_UPGRADES.length;
  if (allMgrBought) {
    const canAfford = S.money >= 1e11;
    html += `<div class="ultime-zone-avail" style="margin-top:10px;">
      <div class="ultime-zone-avail-info">
        <div class="ultime-zone-tag">MANAGER ULTIME</div>
        <div class="ultime-zone-avail-name">🖥️ DATA MINING</div>
        <div class="ultime-zone-avail-desc">Data center +1 Md€/s · plus de clients</div>
      </div>
      <button class="upg-btn${canAfford?' ok':''}" id="ultime-mgr-buy-btn" ${!canAfford?'disabled':''}>${canAfford?'ACHETER — '+fmt(1e11):fmt(1e11)}</button>
    </div>`;
  }

  el.innerHTML = html;

  const avCvs = makeAvatar(null, 40, p);
  const cvs = document.getElementById('mgr-av-canvas');
  if (cvs) cvs.getContext('2d').drawImage(avCvs, 0, 0);

  for (const u of MANAGER_UPGRADES) {
    const btn = document.getElementById('mgr-btn-'+u.id);
    if (btn && !S.manager.upgsBought.has(u.id)) btn.addEventListener('click', ()=>buyManagerUpg(u.id));
  }
  const ultBtn = document.getElementById('ultime-mgr-buy-btn');
  if (ultBtn) ultBtn.addEventListener('click', ()=>buyUltime('dataMining'));
}

function refreshManagerSection() {
  const key = `${S.level>=10}|${S.manager.hired}|${S.manager.profile}|${S.manager.upgsBought.size}|${S.ultimes.dataMining}`;
  if (key !== _mgrStateKey) { _mgrStateKey = key; buildManagerSection(); return; }
  if (S.level < 10) return;
  if (!S.manager.hired) {
    const btn = document.getElementById('mgr-recruit-btn'); if (!btn) return;
    const can = S.money >= 50000;
    btn.disabled = !can; btn.className = 'upg-btn'+(can?' ok':'');
    btn.textContent = can ? 'CHOISIR UN MANAGER — 50 000€' : 'Fonds insuffisants (50 000€)';
    return;
  }
  for (const u of MANAGER_UPGRADES) {
    const btn = document.getElementById('mgr-btn-'+u.id); if (!btn) continue;
    const bought = S.manager.upgsBought.has(u.id);
    const upgs   = MANAGER_UPGRADES.filter(x => x.branch === u.branch);
    const idx    = upgs.indexOf(u);
    const prevOk = idx === 0 || S.manager.upgsBought.has(upgs[idx-1].id);
    const lvOk   = S.level >= u.reqLv;
    const can    = !bought && prevOk && lvOk && S.money >= u.cost;
    btn.disabled = bought || !can; btn.className = 'upg-btn'+(can?' ok':'');
    if (!bought) btn.textContent = !prevOk ? '🔒' : !lvOk ? '🔒 Niv.'+u.reqLv : fmt(u.cost);
  }
  // Mettre à jour stats profile
  const statsEl = document.querySelector('.mgr-profile-stats');
  if (statsEl) {
    const vp = S.manager.vipInterval > 0 ? S.manager.vipInterval+'s' : '—';
    const caStr = S.manager.monthlyCa>0 ? '+'+fmt(S.manager.monthlyCa)+'/mois' : '—';
    statsEl.textContent = `🖱️ ${S.manager.autoclickRate}/s · 👥 +${Math.round(S.manager.teamBoost*100)}% · 💰 ${caStr} · 🤝 ${vp}`;
  }
  // Rafraîchir le bouton ultime manager si présent (pas si dataMining actif)
  if (!S.ultimes.dataMining) {
    const ultBtn = document.getElementById('ultime-mgr-buy-btn');
    if (ultBtn) { const can=S.money>=1e11; ultBtn.disabled=!can; ultBtn.className='upg-btn'+(can?' ok':''); ultBtn.textContent=can?'ACHETER — '+fmt(1e11):fmt(1e11); }
  }
}

function buyManagerUpg(id) {
  const u = MANAGER_UPGRADES.find(x => x.id === id); if (!u || !S.manager.hired) return;
  const upgs = MANAGER_UPGRADES.filter(x => x.branch === u.branch);
  const idx  = upgs.indexOf(u);
  const prevOk = idx === 0 || S.manager.upgsBought.has(upgs[idx-1].id);
  if (!prevOk || S.manager.upgsBought.has(id) || S.money < u.cost || S.level < u.reqLv) return;
  S.money -= u.cost; u.apply(S); S.manager.upgsBought.add(id);
  S.upgBought++; S.xpFromUpgrades += 50*u.reqLv;
  addLog(`<span class="ly">🧑‍💼 ${u.name}</span> activé`);
  _mgrStateKey = null; buildManagerSection();
}

// ── Modal recrutement manager ─────────────────────────────
let _selectedManager = null;
function openManagerModal() {
  _selectedManager = null;
  const grid = document.getElementById('mgr-grid'); grid.innerHTML = '';
  document.getElementById('mgr-confirm').disabled = true;
  Object.keys(MANAGER_PROFILES).forEach(key => {
    const p = MANAGER_PROFILES[key];
    const card = document.createElement('div'); card.className = 'candidate-card';
    const av = makeAvatar(null, 52, p); av.className = 'cand-avatar';
    card.innerHTML = `<div class="cand-name">${p.name}</div><div class="cand-spec">${p.spec}</div><div class="cand-ability">✦ ${p.ability}</div><div class="cand-salary" style="color:#a8a060;font-style:italic;font-size:8px;text-align:center;">${p.quote}</div><div class="cand-salary">50 000€ · unique</div>`;
    card.insertBefore(av, card.children[1]);
    card.addEventListener('click', () => {
      document.querySelectorAll('#mgr-grid .candidate-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected'); _selectedManager = key;
      document.getElementById('mgr-confirm').disabled = false;
    });
    grid.appendChild(card);
  });
  document.getElementById('mgr-modal').style.display = 'flex';
}

function confirmManager() {
  if (!_selectedManager) return;
  if (S.money < 50000) { addLog('<span class="lr">Fonds insuffisants !</span>'); return; }
  S.money -= 50000; S.manager.hired = true; S.manager.profile = _selectedManager;
  S.manager.autoclickRate = 1;
  recalcEffects(); S.upgBought++; S.xpFromUpgrades += 200;
  addLog(`<span class="ly">🧑‍💼 ${MANAGER_PROFILES[_selectedManager].name} recruté ! +1 clic/s automatique.</span>`);
  document.getElementById('mgr-modal').style.display = 'none';
  _mgrStateKey = null; buildManagerSection();
}

// ── Hire Modal ───────────────────────────────────────────
let currentCandidates=[], selectedCandidate=null, rerollCost=1500;

document.getElementById('hire-btn').addEventListener('click',openHireModal);
document.getElementById('modal-confirm').addEventListener('click',confirmHire);
document.getElementById('modal-reroll').addEventListener('click',rerollCandidates);
document.getElementById('modal-cancel').addEventListener('click',()=>{ document.getElementById('hire-modal').style.display='none'; });

function openHireModal() {
  const maxT=MAX_TEAM_AT_LEVEL(S.level);
  if (S.team.length>=7) { addLog('<span class="lw">⚠ Équipe complète (7/7) !</span>'); return; }
  if (S.team.length>=maxT) { addLog(`<span class="lw">⚠ Niv.${NEXT_TEAM_LEVEL[S.team.length+1]||'MAX'} requis pour recruter !</span>`); return; }
  const hc=hireCost();
  if (S.money<hc) { addLog(`<span class="lw">⚠ Fonds insuffisants (${fmt(hc)} requis)</span>`); return; }
  selectedCandidate=null; rerollCost=1500; pickCandidates();
  document.getElementById('hire-modal').style.display='flex';
}

function pickCandidates() {
  // Toujours aléatoire — jamais le même ordre
  const avail=[...availableSellers()].sort(()=>Math.random()-0.5);
  currentCandidates=avail.slice(0,Math.min(3,avail.length));
  renderCandidates();
}

function renderCandidates() {
  const grid=document.getElementById('candidates-grid'); grid.innerHTML='';
  selectedCandidate=null; document.getElementById('modal-confirm').disabled=true;
  document.getElementById('modal-sub').textContent=`Équipe: ${S.team.length}/${MAX_TEAM_AT_LEVEL(S.level)} · Recrutement: ${fmt(hireCost())}`;
  for (const key of currentCandidates) {
    const def=SELLERS_DEF[key], unlockLv=SELLER_UNLOCK_LEVEL[key], isLocked=S.level<unlockLv;
    const card=document.createElement('div'); card.className='candidate-card'+(isLocked?' locked':'');
    const av=makeAvatar(key,52); av.className='cand-avatar';
    card.innerHTML=`<div class="cand-name">${def.name}</div><div class="cand-spec">${def.spec}</div><div class="cand-ability">✦ ${def.ability}</div>${isLocked?`<div class="cand-locked-msg">🔒 Niv.${unlockLv} requis</div>`:''}`;
    card.insertBefore(av,card.children[1]);
    if (!isLocked) card.addEventListener('click',()=>{ document.querySelectorAll('.candidate-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); selectedCandidate=key; document.getElementById('modal-confirm').disabled=false; });
    grid.appendChild(card);
  }
  const rr=document.getElementById('modal-reroll');
  rr.textContent=`🔄 RELANCER — ${fmt(rerollCost)}`;
  rr.disabled=S.money<rerollCost||availableSellers().length<=currentCandidates.length;
}

function confirmHire() {
  if (!selectedCandidate) return;
  const hc=hireCost();
  if (S.money<hc) { addLog(`<span class="lr">⚠ Plus assez d'argent !</span>`); document.getElementById('hire-modal').style.display='none'; return; }
  S.money-=hc; S.team.push(selectedCandidate);
  S.sellerCosts[selectedCandidate]=hc;
  S.bonusTimers[selectedCandidate]=180+Math.random()*120;
  if (!S.seniority[selectedCandidate]) S.seniority[selectedCandidate]={years:0,salaryMult:1};
  S.upgBought++; S.xpFromUpgrades+=50; recalcEffects();
  addLog(`<span class="lp">▶ ${SELLERS_DEF[selectedCandidate].name} recruté !</span>`);
  if (S.team.length===7) addLog(`<span class="lb">★ ÉQUIPE COMPLÈTE 7/7 !</span>`);
  document.getElementById('hire-modal').style.display='none';
  buildRoster(); updateHireBtn();
}

function rerollCandidates() {
  if (S.money<rerollCost) return;
  S.money-=rerollCost; rerollCost*=2;
  const excl=new Set(currentCandidates);
  const others=availableSellers().filter(k=>!excl.has(k)).sort(()=>Math.random()-0.5);
  if (others.length===0) { addLog('<span class="lw">Plus d\'autres candidats !</span>'); return; }
  currentCandidates=others.slice(0,Math.min(3,others.length)); renderCandidates();
}

// ── Achievements modal ───────────────────────────────────
function openAchModal() {
  const grid=document.getElementById('ach-grid'); grid.innerHTML='';
  const done=S.achUnlocked.size, total=ACHIEVEMENTS.length;
  document.getElementById('ach-modal-sub').textContent=`${done} / ${total} débloqués`;
  ACHIEVEMENTS.forEach(a=>{
    const isDone=S.achUnlocked.has(a.id);
    const item=document.createElement('div'); item.className='ach-item'+(isDone?' done':'');
    item.innerHTML=`<div class="ach-icon">${a.icon}</div><div class="ach-info"><div class="ach-name${isDone?' done':''}">${a.name}</div><div class="ach-desc">${isDone?'✓ Obtenu':a.desc}${a.bonus>0?' · +'+fmt(a.bonus):''}</div></div>`;
    grid.appendChild(item);
  });
  document.getElementById('ach-modal').style.display='flex';
}

// ── Musique ──────────────────────────────────────────────
let _audio=null, musicOn=false;
function initAudio() {
  if (_audio) return;
  _audio=new Audio('sfx/ost-memories.mp3'); _audio.loop=true;
  _audio.volume=parseFloat(document.getElementById('music-vol').value)/100;
}
function toggleMusic() {
  initAudio();
  if (musicOn) { _audio.pause(); musicOn=false; document.getElementById('music-btn').textContent='🔇'; }
  else { _audio.play().catch(()=>{}); musicOn=true; document.getElementById('music-btn').textContent='🔊'; }
}
function setVolume(v) { if (_audio) _audio.volume=v/100; }

// ── Clicker — popup gain corrigé ────────────────────────
document.getElementById('clicker').addEventListener('click', function(e) {
  S.clicks++; S.clicksThisMonth++; S.clickBoost=8;
  const vibroMult = S.ultimes.vibromasseur ? 10 : 1;
  const baseClicks = S.clickDouble?(S.clickQuad?4:2):1;
  const clicks = baseClicks * vibroMult;
  let totalVal=0;
  for (let i=0; i<clicks; i++) { const val=clickValue(); S.money+=val; S.totalEarned+=val; totalVal+=val; }
  if (totalVal > 0) playSound('coin');
  // Popup gain — position relative à la scène
  const sceneRect=this.getBoundingClientRect();
  const relX=e.clientX-sceneRect.left;
  const pct=Math.max(5,Math.min(85,relX/sceneRect.width*100));
  const pop=document.createElement('div');
  pop.className='coin-pop';
  pop.style.cssText=`left:${pct}%;bottom:60px;color:#4dff88;font-size:9px;text-shadow:1px 1px #000;`;
  pop.textContent='+'+fmt(totalVal);
  document.getElementById('cust-area').appendChild(pop);
  setTimeout(()=>{ if(pop.parentNode) pop.parentNode.removeChild(pop); },950);
  const extraChance = S.ultimes.vibromasseur ? 0.10 : 0;
  if (Math.random()<Math.min(0.90, S.clickChance+extraChance)) spawnCustomer();
});

// ════════════════════════════════════════════════════════
// AMÉLIORATIONS ULTIMES
// ════════════════════════════════════════════════════════

let _ultimesStateKey = null;

function buildUltimesSection() {
  const el = document.getElementById('ultimes-content');
  if (!el) return;
  let html = '';
  for (const u of ULTIMES_DEF) {
    const bought   = S.ultimes[u.id];
    const unlocked = u.unlock(S);
    const canAfford = S.money >= u.cost;
    const cls = bought ? 'ultime-card bought' : unlocked ? 'ultime-card unlocked' : 'ultime-card locked';
    const btnTxt = !unlocked ? '🔒 CONDITIONS' : !canAfford ? fmt(u.cost) : 'ACHETER — ' + fmt(u.cost);
    const btnCls = 'upg-btn' + (unlocked && canAfford && !bought ? ' ok' : '');
    html += `<div class="${cls}">
      <div class="ultime-header">
        <span class="ultime-icon">${u.icon}</span>
        <div class="ultime-info">
          <div class="ultime-tag">${u.category}</div>
          <div class="ultime-name">${u.name}</div>
        </div>
        ${bought ? '<span class="ultime-check">✓</span>' : ''}
      </div>
      <div class="ultime-desc">${u.desc}</div>
      ${!unlocked ? `<div class="ultime-req">🔒 ${u.unlockDesc}</div>` : ''}
      ${!bought ? `<button class="${btnCls}" id="ultime-btn-${u.id}" ${!unlocked || !canAfford ? 'disabled' : ''}>${btnTxt}</button>` : ''}
    </div>`;
  }
  el.innerHTML = html;
  for (const u of ULTIMES_DEF) {
    const btn = document.getElementById('ultime-btn-' + u.id);
    if (btn && !S.ultimes[u.id]) btn.addEventListener('click', () => buyUltime(u.id));
  }
}

function refreshUltimesSection() {
  const key = ULTIMES_DEF.map(u => `${u.unlock(S)}|${S.ultimes[u.id]}`).join('_');
  if (key !== _ultimesStateKey) { _ultimesStateKey = key; buildUltimesSection(); return; }
  for (const u of ULTIMES_DEF) {
    const btn = document.getElementById('ultime-btn-' + u.id);
    if (!btn) continue;
    if (S.ultimes[u.id]) continue;
    const unlocked = u.unlock(S);
    const canAfford = S.money >= u.cost;
    btn.disabled = !unlocked || !canAfford;
    btn.className = 'upg-btn' + (unlocked && canAfford ? ' ok' : '');
    btn.textContent = !unlocked ? '🔒 CONDITIONS' : !canAfford ? fmt(u.cost) : 'ACHETER — ' + fmt(u.cost);
  }
}

function buyUltime(id) {
  const u = ULTIMES_DEF.find(x => x.id === id);
  if (!u || !u.unlock(S) || S.money < u.cost || S.ultimes[id]) return;
  S.money -= u.cost;
  S.ultimes[id] = true;
  if (id === 'staffBionique') {
    S.bioniqueRate = S.team.reduce((sum, k) => sum + (S.sellerCosts[k] || 10000) * 2, 0);
    addLog(`<span class="ly">🤖 STAFF BIONIQUE activé ! B800 IA génère +${fmt(1e8 * fm())}/s</span>`);
    buildRoster();
  } else if (id === 'dataMining') {
    addLog(`<span class="ly">🖥️ DATA MINING activé ! Data center +${fmt(1e9 * fm())}/s · Clients désactivés</span>`);
  } else if (id === 'chasseurTetes') {
    S.headhunterTimer = 5 + Math.random() * 25;
    addLog(`<span class="ly">🎯 CHASSEUR DE TÊTES activé ! Concurrents dans le viseur.</span>`);
  } else if (id === 'vibromasseur') {
    addLog(`<span class="ly">💥 VIBROMASSEUR activé ! Chaque clic = 10 clics !</span>`);
  } else if (id === 'ultimeZoneDir') {
    const effectivePct = Math.round(S.zoneDirector.boostPct * Math.max(1, S.franchisesOwned) * 100);
    addLog(`<span class="ly">🏆 RÉSEAU BARRAULT actif ! Boost permanent +${effectivePct}% (×${Math.max(1,S.franchisesOwned)} franchises) !</span>`);
    buildZoneDirectorSection();
  }
  _ultimesStateKey = null;
  buildUltimesSection();
}

// ════════════════════════════════════════════════════════
// ZONES FRANCHISE
// ════════════════════════════════════════════════════════

// ── Arbre franchise (nœuds de progression) ───────────────
function updateFranchiseTree() {
  const tree = document.getElementById('franchise-tree-nodes');
  if (!tree) return;
  tree.innerHTML = '';
  // N'affiche que les nœuds déjà débloqués (surprise pour les prochains)
  const unlocked = FRANCHISE_TREE.filter(n => S.franchisesOwned >= n.threshold);
  if (unlocked.length === 0) return;
  for (const node of unlocked) {
    const div = document.createElement('div');
    div.className = 'ftree-node reached';
    div.title = node.desc;
    div.innerHTML = `<span class="ftree-icon">${node.icon}</span><span class="ftree-name">${node.name}</span><span class="ftree-badge">✓</span>`;
    tree.appendChild(div);
  }
}

// ── Visibilité des zones selon palier ────────────────────
function updateFranchiseZoneVisibility() {
  const zones = [
    { id:'zone-lab',           threshold:1 },
    { id:'zone-director',      threshold:2 },
    { id:'zone-callcenter',    threshold:5 },
    { id:'zone-tvads',         threshold:10 },
  ];
  for (const z of zones) {
    const el = document.getElementById(z.id);
    if (el) el.style.display = S.franchisesOwned >= z.threshold ? '' : 'none';
  }
}

function refreshZoneUpgButtons() {
  const sets = [
    { upgrades: LAB_UPGRADES,           bought: S.lab.upgsBought },
    { upgrades: ZONE_DIRECTOR_UPGRADES, bought: S.zoneDirector.upgsBought },
    { upgrades: CALL_CENTER_UPGRADES,   bought: S.callCenter.upgsBought },
    { upgrades: TV_ADS_UPGRADES,        bought: S.tvAds.upgsBought },
  ];
  for (const { upgrades, bought } of sets) {
    for (const u of upgrades) {
      const btn = document.getElementById('zbtn-' + u.id);
      if (!btn) continue;
      if (bought.has(u.id)) continue;
      const canBuy = S.money >= u.cost;
      btn.disabled = !canBuy;
      btn.className = 'upg-btn' + (canBuy ? ' ok' : '');
    }
  }
  // Bouton ultime ZD
  const ultZDBtn = document.getElementById('ultime-zd-buy-btn');
  if (ultZDBtn) {
    const can = S.money >= 1e17;
    ultZDBtn.disabled = !can;
    ultZDBtn.className = 'upg-btn' + (can ? ' ok' : '');
    ultZDBtn.textContent = can ? 'ACHETER — '+fmt(1e17) : fmt(1e17);
  }
}

function buildFranchiseZoneSections() {
  buildLabSection();
  buildZoneDirectorSection();
  buildCallCenterSection();
  buildTvAdsSection();
  updateFranchiseZoneVisibility();
}

// ── Zone Labo ─────────────────────────────────────────────
function buildLabSection() {
  const el = document.getElementById('zone-lab-content');
  if (!el) return;
  const xpRate = S.lab.xpPer1k;
  let html = `<div class="zone-desc">🔬 Pour chaque <b>1 000€</b> générés, le labo produit <b class="zone-val">${xpRate} XP</b></div>`;
  html += `<div class="zone-upgrades">`;
  for (const u of LAB_UPGRADES) {
    const bought = S.lab.upgsBought.has(u.id);
    const canBuy = !bought && S.money >= u.cost;
    html += `<div class="zone-upg${bought?' bought':''}">
      <div class="zone-upg-name">${u.name}</div>
      <div class="zone-upg-desc">${u.desc}</div>
      <button class="upg-btn${canBuy?' ok':''}" id="zbtn-${u.id}" ${bought||!canBuy?'disabled':''}>${bought?'✓ ACTIF':fmt(u.cost)}</button>
    </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
  for (const u of LAB_UPGRADES) {
    const btn = document.getElementById('zbtn-'+u.id);
    if (btn && !S.lab.upgsBought.has(u.id)) btn.addEventListener('click', () => buyLabUpgrade(u.id));
  }
}

function buyLabUpgrade(id) {
  const u = LAB_UPGRADES.find(x=>x.id===id); if (!u) return;
  if (S.lab.upgsBought.has(id) || S.money < u.cost) return;
  S.money -= u.cost; S.lab.upgsBought.add(id); S.lab.xpPer1k += u.xpBoost;
  S.xpFromUpgrades += 200;
  addLog(`<span class="lp">🔬 ${u.name}</span> activé ! +${u.xpBoost} XP/k€`);
  buildLabSection();
}

// ── Zone Directeurs de Zone ───────────────────────────────
function buildZoneDirectorSection() {
  const el = document.getElementById('zone-director-content');
  if (!el) return;
  const pct = Math.round(S.zoneDirector.boostPct * 100);
  const isActive = S.zoneDirector.active;
  const panel = el.closest('.zone-panel');
  if (panel) panel.classList.toggle('zd-boosting', isActive || S.ultimes.ultimeZoneDir);

  let html;
  if (S.ultimes.ultimeZoneDir) {
    const effectivePct = Math.round(S.zoneDirector.boostPct * Math.max(1, S.franchisesOwned) * 100);
    html = `<div class="zone-desc">🏆 Boost <b class="zone-val">PERMANENT</b> : +${pct}% × ${Math.max(1,S.franchisesOwned)} franchises = <b class="zone-val">+${effectivePct}%</b></div>
    <div class="ultime-zone-active" style="margin-bottom:8px;">
      <div class="ultime-zone-active-header"><span>🏆</span><span class="ultime-zone-name">RÉSEAU BARRAULT ACTIF</span><span class="ultime-zone-check">✓</span></div>
      <div class="ultime-zone-active-desc">+${pct}% × ${Math.max(1,S.franchisesOwned)} = +${effectivePct}% permanent</div>
    </div>`;
  } else {
    html = `<div class="zone-desc">🏆 Active un boost <b class="zone-val">+${pct}%</b> de production sur toute l'équipe pendant <b>60s</b></div>`;
    if (isActive) {
      html += `<div class="zd-active-display">
        <span class="zd-label">⚡ SUPER BOOST ACTIF ⚡</span>
        <span class="zd-timer">${Math.ceil(S.zoneDirector.timer)}s</span>
      </div>`;
    } else {
      html += `<button class="upg-btn ok zone-activate-btn" id="zd-activate-btn">▶ ACTIVER</button>`;
    }
  }

  html += `<div class="zone-upgrades" style="margin-top:8px;">`;
  for (const u of ZONE_DIRECTOR_UPGRADES) {
    const bought = S.zoneDirector.upgsBought.has(u.id);
    const canBuy = !bought && S.money >= u.cost;
    html += `<div class="zone-upg${bought?' bought':''}">
      <div class="zone-upg-name">${u.name}</div>
      <div class="zone-upg-desc">${u.desc}</div>
      <button class="upg-btn${canBuy?' ok':''}" id="zbtn-${u.id}" ${bought||!canBuy?'disabled':''}>${bought?'✓ ACTIF':fmt(u.cost)}</button>
    </div>`;
  }
  html += `</div>`;

  // Bouton ultime ZD si conditions remplies et non acheté
  if (!S.ultimes.ultimeZoneDir && S.franchisesOwned >= 2 && S.zoneDirector.upgsBought.size >= ZONE_DIRECTOR_UPGRADES.length) {
    const canAfford = S.money >= 1e17;
    html += `<div class="ultime-zone-avail" style="margin-top:10px;">
      <div class="ultime-zone-avail-info">
        <div class="ultime-zone-tag">ZONE DIRECTOR ULTIME</div>
        <div class="ultime-zone-avail-name">🏆 RÉSEAU BARRAULT</div>
        <div class="ultime-zone-avail-desc">Boost permanent · +${pct}% × franchises achetées</div>
      </div>
      <button class="upg-btn${canAfford?' ok':''}" id="ultime-zd-buy-btn" ${!canAfford?'disabled':''}>${canAfford?'ACHETER — '+fmt(1e17):fmt(1e17)}</button>
    </div>`;
  }

  el.innerHTML = html;
  if (!S.ultimes.ultimeZoneDir) {
    const actBtn = document.getElementById('zd-activate-btn');
    if (actBtn && !isActive) actBtn.addEventListener('click', activateZoneDirector);
  }
  for (const u of ZONE_DIRECTOR_UPGRADES) {
    const btn = document.getElementById('zbtn-'+u.id);
    if (btn && !S.zoneDirector.upgsBought.has(u.id)) btn.addEventListener('click', () => buyZoneDirectorUpgrade(u.id));
  }
  const ultZDBtn = document.getElementById('ultime-zd-buy-btn');
  if (ultZDBtn) ultZDBtn.addEventListener('click', () => buyUltime('ultimeZoneDir'));
}

function refreshZoneDirectorSection() { buildZoneDirectorSection(); }

function buyZoneDirectorUpgrade(id) {
  const u = ZONE_DIRECTOR_UPGRADES.find(x=>x.id===id); if (!u) return;
  if (S.zoneDirector.upgsBought.has(id) || S.money < u.cost) return;
  S.money -= u.cost; S.zoneDirector.upgsBought.add(id); S.zoneDirector.boostPct += u.boostBonus;
  S.xpFromUpgrades += 200;
  addLog(`<span class="lp">🏆 ${u.name}</span> activé ! Boost +${Math.round(u.boostBonus*100)}%`);
  buildZoneDirectorSection();
}

// ── Zone Centrale d'appel ────────────────────────────────
function buildCallCenterSection() {
  const el = document.getElementById('zone-callcenter-content');
  if (!el) return;
  let html = `<div class="zone-desc">📞 Génère <b class="zone-val">${fmt(S.callCenter.incomeRate)}/s</b> et <b class="zone-val">${S.callCenter.xpRate} XP/s</b> en continu</div>`;
  html += `<div class="zone-upgrades">`;
  for (const u of CALL_CENTER_UPGRADES) {
    const bought = S.callCenter.upgsBought.has(u.id);
    const canBuy = !bought && S.money >= u.cost;
    html += `<div class="zone-upg${bought?' bought':''}">
      <div class="zone-upg-name">${u.name}</div>
      <div class="zone-upg-desc">${u.desc}</div>
      <button class="upg-btn${canBuy?' ok':''}" id="zbtn-${u.id}" ${bought||!canBuy?'disabled':''}>${bought?'✓ ACTIF':fmt(u.cost)}</button>
    </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
  for (const u of CALL_CENTER_UPGRADES) {
    const btn = document.getElementById('zbtn-'+u.id);
    if (btn && !S.callCenter.upgsBought.has(u.id)) btn.addEventListener('click', () => buyCallCenterUpgrade(u.id));
  }
}

function buyCallCenterUpgrade(id) {
  const u = CALL_CENTER_UPGRADES.find(x=>x.id===id); if (!u) return;
  if (S.callCenter.upgsBought.has(id) || S.money < u.cost) return;
  S.money -= u.cost; S.callCenter.upgsBought.add(id);
  S.callCenter.incomeRate += u.incomeBoost; S.callCenter.xpRate += u.xpBoost;
  S.xpFromUpgrades += 200;
  addLog(`<span class="lp">📞 ${u.name}</span> activé ! +${fmt(u.incomeBoost)}/s +${u.xpBoost} XP/s`);
  buildCallCenterSection();
}

// ── Zone Pub TV ───────────────────────────────────────────
function buildTvAdsSection() {
  const el = document.getElementById('zone-tvads-content');
  if (!el) return;
  let html = `<div class="zone-desc">📺 Génère <b class="zone-val">${fmt(S.tvAds.monthlyCa)}/mois</b> de revenus publicitaires</div>`;
  html += `<div class="zone-upgrades">`;
  for (const u of TV_ADS_UPGRADES) {
    const bought = S.tvAds.upgsBought.has(u.id);
    const canBuy = !bought && S.money >= u.cost;
    html += `<div class="zone-upg${bought?' bought':''}">
      <div class="zone-upg-name">${u.name}</div>
      <div class="zone-upg-desc">${u.desc}</div>
      <button class="upg-btn${canBuy?' ok':''}" id="zbtn-${u.id}" ${bought||!canBuy?'disabled':''}>${bought?'✓ ACTIF':fmt(u.cost)}</button>
    </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
  for (const u of TV_ADS_UPGRADES) {
    const btn = document.getElementById('zbtn-'+u.id);
    if (btn && !S.tvAds.upgsBought.has(u.id)) btn.addEventListener('click', () => buyTvAdsUpgrade(u.id));
  }
}

function buyTvAdsUpgrade(id) {
  const u = TV_ADS_UPGRADES.find(x=>x.id===id); if (!u) return;
  if (S.tvAds.upgsBought.has(id) || S.money < u.cost) return;
  S.money -= u.cost; S.tvAds.upgsBought.add(id); S.tvAds.monthlyCa += u.caBoost;
  S.xpFromUpgrades += 200;
  addLog(`<span class="lp">📺 ${u.name}</span> activé ! +${fmt(u.caBoost)}/mois`);
  buildTvAdsSection();
}
// ── SFX mute toggle ──────────────────────────────────────
window._sfxMuted = false;
function toggleSfx() {
  window._sfxMuted = !window._sfxMuted;
  document.getElementById('sfx-btn').textContent = window._sfxMuted ? '🔕' : '🔔';
}

// ════════════════════════════════════════════════════════
// leaderboard.js — Pseudo, score Firebase, classement & attaques PvP
// ════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAo8Wqx4q1HjBQ2evBHzX1BLyPWcWJ0W10",
  authDomain:        "barrault-idle.firebaseapp.com",
  projectId:         "barrault-idle",
  storageBucket:     "barrault-idle.firebasestorage.app",
  messagingSenderId: "1051087288808",
  appId:             "1:1051087288808:web:712173f990e1148bc4cc5d",
};

// ── Init ────────────────────────────────────────────────
let _db = null;
function initFirebase() {
  try {
    if (!firebase || !firebase.initializeApp) return;
    firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
  } catch (e) {
    console.warn('[LB] Firebase init error:', e.message);
  }
}

// ── Identifiant joueur ──────────────────────────────────
function getPlayerId() {
  let id = localStorage.getItem('barrault_uid');
  if (!id) {
    id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('barrault_uid', id);
  }
  return id;
}
function getPlayerName() { return localStorage.getItem('barrault_pseudo') || null; }
function getGameScore() {
  if (typeof S === 'undefined') return 0;
  return Math.floor((S.lifetimeEarned || 0) + (S.totalEarned || 0));
}

// ── Utilitaires format ──────────────────────────────────
function fmtDuration(sec) {
  if (!sec || sec < 60) return 'moins d\'1m';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h === 0) return m + 'm';
  if (h < 24)  return h + 'h ' + (m > 0 ? m + 'm' : '');
  const d = Math.floor(h / 24), rh = h % 24;
  return d + 'j ' + (rh > 0 ? rh + 'h' : '');
}
function fmtClicks(n) {
  if (!n) return '0';
  if (n < 1000) return n.toString();
  if (n < 1e6)  return (n / 1000).toFixed(1) + 'k';
  return (n / 1e6).toFixed(2) + 'M';
}
function fmtScore(n) {
  if (n < 1e4)  return n.toLocaleString('fr-FR') + ' €';
  if (n < 1e6)  return (n / 1e3).toFixed(1) + 'k €';
  if (n < 1e9)  return (n / 1e6).toFixed(2) + 'M €';
  if (n < 1e12) return (n / 1e9).toFixed(2) + 'Md €';
  const exp = Math.floor(Math.log10(n));
  const man = (n / Math.pow(10, exp)).toFixed(2);
  return man + '×10<sup>' + exp + '</sup> €';
}
function durationSince(ts) {
  if (!ts) return null;
  const ms = ts.toMillis ? ts.toMillis() : Number(ts);
  const h  = (Date.now() - ms) / 3600000;
  if (h < 1)  return 'moins d\'1h';
  if (h < 48) return Math.floor(h) + 'h';
  const d = Math.floor(h / 24), rh = Math.floor(h % 24);
  return d + 'j ' + (rh > 0 ? rh + 'h' : '');
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════
// SCORE & PRÉSENCE
// ════════════════════════════════════════════════════════

let _lastSavedScore = -1;

async function saveScore() {
  if (!_db) return;
  const name = getPlayerName(); if (!name) return;
  const score        = getGameScore();
  const maxLevel     = (typeof S !== 'undefined') ? (S.level || 1) : 1;
  const totalClicks  = (typeof S !== 'undefined') ? ((S.lifetimeClicks||0)+(S.clicks||0)) : 0;
  const franchises   = (typeof S !== 'undefined') ? (S.franchisesOwned||0) : 0;
  const playtime     = (typeof S !== 'undefined') ? ((S.lifetimePlaytime||0)+(S.playtime||0)) : 0;
  const achievements = (typeof S !== 'undefined') ? ((S.lifetimeAchievements||0)+(S.achUnlocked?S.achUnlocked.size:0)) : 0;

  if (score <= _lastSavedScore) return;
  const playerId = getPlayerId();
  const docRef   = _db.collection('scores').doc(playerId);
  try {
    const existing  = await docRef.get();
    const prevScore = existing.exists ? (existing.data().score || 0) : 0;
    const prevLevel = existing.exists ? (existing.data().maxLevel || 1) : 1;
    if (prevScore >= score && prevLevel >= maxLevel) return;

    const topSnap   = await _db.collection('scores').orderBy('score','desc').limit(1).get();
    const currentTop = topSnap.empty ? null : topSnap.docs[0];
    const alreadyFirst = currentTop && currentTop.id === playerId;
    const becomesFirst = !currentTop || alreadyFirst || score > currentTop.data().score;

    const update = { playerName:name, score, maxLevel, totalClicks, franchises, playtime, achievements, updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    if (becomesFirst) {
      const hadFirstSince = existing.exists && existing.data().firstPlaceSince;
      if (!hadFirstSince || !alreadyFirst) update.firstPlaceSince = firebase.firestore.FieldValue.serverTimestamp();
    }
    await docRef.set(update, { merge:true });
    _lastSavedScore = score;
  } catch(e) { console.warn('[LB] Save error:', e.message); }
}

// Présence (money + lastActive) toutes les 30 s
async function savePresence() {
  if (!_db || !getPlayerName()) return;
  try {
    await _db.collection('scores').doc(getPlayerId()).set({
      money:      typeof S !== 'undefined' ? Math.floor(S.money || 0) : 0,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge:true });
  } catch(e) {}
}

setInterval(saveScore,    30000);
setInterval(savePresence, 30000);

// ════════════════════════════════════════════════════════
// SYSTÈME D'ATTAQUE PvP
// ════════════════════════════════════════════════════════

const ATTACK_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const _sessionStart      = Date.now();
let   _lbPlayers         = {}; // cache des données joueurs du classement

function canAttack() {
  return Date.now() - parseInt(localStorage.getItem('barrault_lastAttack') || '0') >= ATTACK_COOLDOWN_MS;
}
function cooldownRemaining() {
  const rem = ATTACK_COOLDOWN_MS - (Date.now() - parseInt(localStorage.getItem('barrault_lastAttack') || '0'));
  if (rem <= 0) return null;
  const m = Math.floor(rem / 60000), s = Math.ceil((rem % 60000) / 1000);
  return m + 'm ' + (s > 0 ? s + 's' : '');
}

// ── Envoi d'une attaque ───────────────────────────────
async function sendAttack(targetId) {
  if (!_db) return;
  const myId   = getPlayerId();
  const myName = getPlayerName();
  if (!myName || myId === targetId) return;

  const target = _lbPlayers[targetId];
  if (!target) return;

  // Vérif cooldown
  if (!canAttack()) {
    showAttackFeedback('cooldown', `Cooldown actif — encore <strong>${cooldownRemaining()}</strong> avant de pouvoir attaquer.`);
    return;
  }

  // Vérif présence cible (lastActive < 3 min)
  const laMs     = target.lastActive ? (target.lastActive.toMillis ? target.lastActive.toMillis() : Number(target.lastActive)) : 0;
  const isOnline = (Date.now() - laMs) < 3 * 60 * 1000;

  if (!isOnline) {
    showAttackFeedback('fail', 'Vous avez été découvert — votre attaque n\'a pas abouti, attention !');
    return;
  }

  const amount = Math.floor((target.money || 0) * 0.5);
  localStorage.setItem('barrault_lastAttack', Date.now().toString());
  document.getElementById('lb-modal').style.display = 'none';

  // Affiche "en cours"
  showAttackFeedback('pending', `Attaque lancée sur <strong>${escHtml(target.playerName)}</strong>… en attente de résolution.`);

  try {
    const ref = await _db.collection('attacks').add({
      from: myId, fromName: myName,
      to: targetId, toName: target.playerName,
      amount, status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    let resolved = false;
    const unsub = ref.onSnapshot(doc => {
      const d = doc.data();
      if (!d || d.status === 'pending') return;
      resolved = true; unsub();
      if (d.status === 'resolved') {
        const actual = d.actualAmount || 0;
        if (typeof S !== 'undefined') { S.money += actual; S.totalEarned += actual; }
        showAttackFeedback('success', `Succès ! Vous avez volé <strong>${typeof fmt==='function'?fmt(actual):actual+'€'}</strong> à <em>${escHtml(target.playerName)}</em> !`);
      } else {
        showAttackFeedback('fail', 'Vous avez été découvert — votre attaque n\'a pas abouti, attention !');
      }
    });

    // Timeout 30s si la cible ne répond pas
    setTimeout(() => {
      if (!resolved) { unsub(); showAttackFeedback('fail', 'La cible a quitté le jeu — attaque échouée.'); }
    }, 30000);

  } catch(e) {
    showAttackFeedback('fail', 'Erreur réseau — attaque annulée.');
    console.warn('[Attack]', e.message);
  }
}

// ── Écoute des attaques reçues (victime) ─────────────
function listenForAttacks() {
  if (!_db) return;
  const myId = getPlayerId();
  _db.collection('attacks')
    .where('to',     '==', myId)
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const doc = change.doc;
        const d   = doc.data();
        // Ignorer les attaques antérieures à la session
        const ts      = d.timestamp ? (d.timestamp.toMillis ? d.timestamp.toMillis() : Number(d.timestamp)) : 0;
        const isStale = ts > 0 && ts < (_sessionStart - 10000);
        if (isStale) { doc.ref.update({ status:'failed' }); return; }

        const actual = typeof S !== 'undefined' ? Math.min(d.amount || 0, Math.floor(S.money)) : 0;
        if (typeof S !== 'undefined') S.money = Math.max(0, S.money - actual);
        doc.ref.update({ status:'resolved', actualAmount:actual });
        showReceivedAttack(d.fromName, actual);
      });
    });
}

// ── Popups ────────────────────────────────────────────
function showAttackFeedback(type, message) {
  const popup = document.getElementById('attack-result-popup');
  const box   = document.getElementById('attack-result-box');
  const title = document.getElementById('attack-result-title');
  const body  = document.getElementById('attack-result-body');
  if (!popup) return;
  const styles = {
    success:  { border:'#4dff88', color:'#4dff88', label:'⚔ ATTAQUE RÉUSSIE' },
    fail:     { border:'#CC1020', color:'#CC1020', label:'⚔ ATTAQUE ÉCHOUÉE' },
    pending:  { border:'#ffdd44', color:'#ffdd44', label:'⚔ ATTAQUE EN COURS…' },
    cooldown: { border:'#4dc8ff', color:'#4dc8ff', label:'⏳ COOLDOWN' },
  };
  const st = styles[type] || styles.pending;
  box.style.borderColor = st.border;
  title.style.color     = st.color;
  title.textContent     = st.label;
  body.innerHTML = `<div class="attack-feedback-msg">${message}</div>`;
  popup.style.display = 'flex';
}

function showReceivedAttack(fromName, amount) {
  const popup = document.getElementById('attack-received-popup');
  const body  = document.getElementById('attack-received-body');
  if (!popup) return;
  body.innerHTML = `
    <div class="atk-recv-attacker">🔴 <strong>${escHtml(fromName)}</strong> vous a attaqué !</div>
    <div class="atk-recv-amount">−${typeof fmt==='function' ? fmt(amount) : amount+'€'}</div>
    <div class="atk-recv-sub">volés de votre trésorerie</div>`;
  popup.style.display = 'flex';
}

// ════════════════════════════════════════════════════════
// CLASSEMENT
// ════════════════════════════════════════════════════════

async function openLeaderboard() {
  const modal   = document.getElementById('lb-modal');
  const content = document.getElementById('lb-content');
  modal.style.display = 'flex';
  content.innerHTML = '<div class="lb-loading">⏳ Chargement…</div>';

  if (!_db) {
    content.innerHTML = '<div class="lb-error">⚠ Firebase non encore configuré.</div>';
    return;
  }
  try {
    const snap   = await _db.collection('scores').orderBy('score','desc').limit(5).get();
    const scores = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderLeaderboard(scores, content);
  } catch(e) {
    content.innerHTML = '<div class="lb-error">Erreur : ' + escHtml(e.message) + '</div>';
  }
}

function renderLeaderboard(scores, container) {
  _lbPlayers = {};
  const myId = getPlayerId();

  if (!scores.length) {
    container.innerHTML = '<div class="lb-empty">Aucun score enregistré.<br>Soyez le premier !</div>';
    return;
  }

  // Barre cooldown attaque
  const cdRem = cooldownRemaining();
  let html = `<div class="lb-attack-header">`;
  if (cdRem) {
    html += `<span class="lb-cd-badge">⏳ Prochain raid dans ${cdRem}</span>`;
  } else {
    html += `<span class="lb-cd-badge ready">⚔ Attaque disponible — choisissez votre cible</span>`;
  }
  html += `</div>`;

  scores.forEach((s, i) => {
    _lbPlayers[s.id] = s;
    const rank   = i + 1;
    const isMe   = s.id === myId;
    const meCls  = isMe ? ' lb-me' : '';
    const lvlBadge  = s.maxLevel ? `<span class="lb-lvl">NVL ${s.maxLevel}</span>` : '';
    const statsLine = `<div class="lb-stats-row">` +
      (s.totalClicks  !== undefined ? `<span>🖱 ${fmtClicks(s.totalClicks)} clics</span>` : '') +
      (s.franchises   !== undefined ? `<span>🏪 ${s.franchises} franchise${s.franchises>1?'s':''}</span>` : '') +
      (s.achievements !== undefined ? `<span>🏆 ${s.achievements} trophées</span>` : '') +
      (s.playtime     !== undefined ? `<span>⏱ ${fmtDuration(s.playtime)}</span>` : '') +
      `</div>`;

    // Bouton attaque
    const laMs     = s.lastActive ? (s.lastActive.toMillis ? s.lastActive.toMillis() : Number(s.lastActive)) : 0;
    const online   = !isMe && laMs && (Date.now() - laMs) < 3 * 60 * 1000;
    const tresoBadge = !isMe && s.money ? `<span class="lb-treso">💰 ${typeof fmt==='function'?fmt(s.money):s.money+'€'} en caisse</span>` : '';

    let attackBtn = '';
    if (!isMe) {
      if (!canAttack()) {
        attackBtn = `<button class="lb-attack-btn lb-attack-cd" disabled>⏳ ${cdRem}</button>`;
      } else if (!online) {
        attackBtn = `<button class="lb-attack-btn lb-attack-offline" disabled title="Joueur hors ligne">📴 HORS LIGNE</button>`;
      } else {
        attackBtn = `<button class="lb-attack-btn lb-attack-ok" id="lb-attack-${s.id}">⚔ ATTAQUER</button>`;
      }
    }

    if (rank === 1) {
      const dur = durationSince(s.firstPlaceSince);
      html += `<div class="lb-first${meCls}">
        <div class="lb-first-glow"></div>
        <div class="lb-first-top">
          <span class="lb-first-crown">👑</span>
          <span class="lb-first-rank">#1</span>
          <span class="lb-first-name">${escHtml(s.playerName)}${isMe?' <span class="lb-you">(toi)</span>':''}</span>
          ${lvlBadge}
        </div>
        <div class="lb-first-score">${fmtScore(s.score)}</div>
        ${dur ? `<div class="lb-first-duration">👑 Au sommet depuis <strong>${dur}</strong></div>` : ''}
        ${statsLine}
        ${tresoBadge ? `<div class="lb-attack-row">${tresoBadge}${attackBtn}</div>` : (attackBtn ? `<div class="lb-attack-row">${attackBtn}</div>` : '')}
      </div>`;

    } else if (rank === 2 || rank === 3) {
      const medals = { 2:'🥈', 3:'🥉' };
      const cls    = rank === 2 ? 'lb-silver' : 'lb-bronze';
      html += `<div class="lb-podium ${cls}${meCls}">
        <div class="lb-pod-main">
          <span class="lb-pod-medal">${medals[rank]}</span>
          <span class="lb-pod-rank">#${rank}</span>
          <span class="lb-pod-name">${escHtml(s.playerName)}${isMe?' <span class="lb-you">(toi)</span>':''}</span>
          ${lvlBadge}
          <span class="lb-pod-score">${fmtScore(s.score)}</span>
        </div>
        ${statsLine}
        ${tresoBadge ? `<div class="lb-attack-row">${tresoBadge}${attackBtn}</div>` : (attackBtn ? `<div class="lb-attack-row">${attackBtn}</div>` : '')}
      </div>`;

    } else {
      html += `<div class="lb-rest${meCls}">
        <div class="lb-rest-main">
          <span class="lb-rest-rank">#${rank}</span>
          <span class="lb-rest-name">${escHtml(s.playerName)}${isMe?' <span class="lb-you">(toi)</span>':''}</span>
          ${lvlBadge}
          <span class="lb-rest-score">${fmtScore(s.score)}</span>
        </div>
        ${statsLine}
        ${tresoBadge ? `<div class="lb-attack-row">${tresoBadge}${attackBtn}</div>` : (attackBtn ? `<div class="lb-attack-row">${attackBtn}</div>` : '')}
      </div>`;
    }
  });

  container.innerHTML = html;

  // Attacher les listeners attaque
  scores.forEach(s => {
    const btn = document.getElementById('lb-attack-' + s.id);
    if (btn) btn.addEventListener('click', () => sendAttack(s.id));
  });
}

// ════════════════════════════════════════════════════════
// PSEUDO MODAL
// ════════════════════════════════════════════════════════

function showPseudoModal() {
  const modal = document.getElementById('pseudo-modal');
  if (!modal) return;
  if (getPlayerName()) { modal.style.display='none'; return; }
  modal.style.display = 'flex';
}

function confirmPseudo() {
  const input = document.getElementById('pseudo-input');
  const name  = (input.value || '').trim().replace(/[<>"']/g,'').slice(0,20);
  if (!name) {
    input.classList.add('pseudo-error');
    input.placeholder = '⚠ Pseudo requis !';
    setTimeout(() => input.classList.remove('pseudo-error'), 800);
    return;
  }
  localStorage.setItem('barrault_pseudo', name);
  document.getElementById('pseudo-modal').style.display = 'none';
  saveScore();
  savePresence();
}

// ── Init au chargement ────────────────────────────────
window.addEventListener('load', () => {
  initFirebase();
  showPseudoModal();
  const inp = document.getElementById('pseudo-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key==='Enter') confirmPseudo(); });
  // Démarrer les listeners multijoueur après un court délai (Firebase init)
  setTimeout(() => {
    savePresence();
    listenForAttacks();
  }, 1500);
});

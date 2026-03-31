// ════════════════════════════════════════════════════════
// leaderboard.js — Pseudo, score Firebase & classement
// ════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  ⚠  REMPLACE CES VALEURS PAR CELLES DE TA CONSOLE
//     FIREBASE (Paramètres du projet > Tes applications)
// ══════════════════════════════════════════════════════
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

// ── Identifiant joueur persistent (localStorage UUID) ──
function getPlayerId() {
  let id = localStorage.getItem('barrault_uid');
  if (!id) {
    id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('barrault_uid', id);
  }
  return id;
}

function getPlayerName() {
  return localStorage.getItem('barrault_pseudo') || null;
}

// ── Score = totalEarned toutes franchises confondues ───
function getGameScore() {
  if (typeof S === 'undefined') return 0;
  return Math.floor((S.lifetimeEarned || 0) + (S.totalEarned || 0));
}

// ── Format durée (secondes → "2h 30m") ────────────────
function fmtDuration(sec) {
  if (!sec || sec < 60) return 'moins d\'1m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return m + 'm';
  if (h < 24)  return h + 'h ' + (m > 0 ? m + 'm' : '');
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return d + 'j ' + (rh > 0 ? rh + 'h' : '');
}

// ── Format clics ──────────────────────────────────────
function fmtClicks(n) {
  if (!n) return '0';
  if (n < 1000)  return n.toString();
  if (n < 1e6)   return (n / 1000).toFixed(1) + 'k';
  return (n / 1e6).toFixed(2) + 'M';
}

// ── Formatage notation scientifique ───────────────────
function fmtScore(n) {
  if (n < 1e4)  return n.toLocaleString('fr-FR') + ' €';
  if (n < 1e6)  return (n / 1e3).toFixed(1) + 'k €';
  if (n < 1e9)  return (n / 1e6).toFixed(2) + 'M €';
  if (n < 1e12) return (n / 1e9).toFixed(2) + 'Md €';
  const exp = Math.floor(Math.log10(n));
  const man = (n / Math.pow(10, exp)).toFixed(2);
  return man + '×10<sup>' + exp + '</sup> €';
}

// ── Durée depuis un Timestamp Firebase ────────────────
function durationSince(ts) {
  if (!ts) return null;
  const ms  = ts.toMillis ? ts.toMillis() : Number(ts);
  const h   = (Date.now() - ms) / 3600000;
  if (h < 1)   return 'moins d\'1h';
  if (h < 48)  return Math.floor(h) + 'h';
  const d  = Math.floor(h / 24);
  const rh = Math.floor(h % 24);
  return d + 'j ' + (rh > 0 ? rh + 'h' : '');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Sauvegarder le score ───────────────────────────────
let _lastSavedScore = -1;
async function saveScore() {
  if (!_db) return;
  const name = getPlayerName();
  if (!name) return;

  const score          = getGameScore();
  const maxLevel       = (typeof S !== 'undefined') ? (S.level || 1) : 1;
  const totalClicks    = (typeof S !== 'undefined') ? ((S.lifetimeClicks || 0) + (S.clicks || 0)) : 0;
  const franchises     = (typeof S !== 'undefined') ? (S.franchisesOwned || 0) : 0;
  const playtime       = (typeof S !== 'undefined') ? ((S.lifetimePlaytime || 0) + (S.playtime || 0)) : 0;
  const achievements   = (typeof S !== 'undefined') ? ((S.lifetimeAchievements || 0) + (S.achUnlocked ? S.achUnlocked.size : 0)) : 0;

  // Toujours sauvegarder si le score ou le niveau a progressé
  if (score <= _lastSavedScore) return;

  const playerId = getPlayerId();
  const docRef   = _db.collection('scores').doc(playerId);

  try {
    const existing    = await docRef.get();
    const prevScore   = existing.exists ? (existing.data().score || 0) : 0;
    const prevLevel   = existing.exists ? (existing.data().maxLevel || 1) : 1;

    // Mise à jour uniquement si progression
    if (prevScore >= score && prevLevel >= maxLevel) return;

    // Est-ce qu'on passe #1 ?
    const topSnap    = await _db.collection('scores').orderBy('score', 'desc').limit(1).get();
    const currentTop = topSnap.empty ? null : topSnap.docs[0];
    const alreadyFirst  = currentTop && currentTop.id === playerId;
    const becomesFirst  = !currentTop || alreadyFirst || score > currentTop.data().score;

    const update = {
      playerName   : name,
      score,
      maxLevel,
      totalClicks,
      franchises,
      playtime,
      achievements,
      updatedAt    : firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (becomesFirst) {
      const hadFirstSince = existing.exists && existing.data().firstPlaceSince;
      if (!hadFirstSince || !alreadyFirst) {
        update.firstPlaceSince = firebase.firestore.FieldValue.serverTimestamp();
      }
    }

    await docRef.set(update, { merge: true });
    _lastSavedScore = score;
  } catch (e) {
    console.warn('[LB] Save error:', e.message);
  }
}

// Autosave toutes les 30 s
setInterval(saveScore, 30000);

// ── Ouvrir le classement ──────────────────────────────
async function openLeaderboard() {
  const modal   = document.getElementById('lb-modal');
  const content = document.getElementById('lb-content');
  modal.style.display = 'flex';
  content.innerHTML = '<div class="lb-loading">⏳ Chargement…</div>';

  if (!_db) {
    content.innerHTML = '<div class="lb-error">⚠ Firebase non encore configuré.<br><span style="font-size:9px;color:#6b8eb5;">Suis le guide de déploiement.</span></div>';
    return;
  }

  try {
    const snap   = await _db.collection('scores').orderBy('score', 'desc').limit(5).get();
    const scores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLeaderboard(scores, content);
  } catch (e) {
    content.innerHTML = '<div class="lb-error">Erreur de chargement : ' + escHtml(e.message) + '</div>';
  }
}

// ── Rendu visuel ──────────────────────────────────────
function renderLeaderboard(scores, container) {
  const myId = getPlayerId();

  if (!scores.length) {
    container.innerHTML = '<div class="lb-empty">Aucun score enregistré.<br>Soyez le premier !</div>';
    return;
  }

  let html = '';

  scores.forEach((s, i) => {
    const rank  = i + 1;
    const isMe  = s.id === myId;
    const meCls = isMe ? ' lb-me' : '';

    const lvlBadge  = s.maxLevel   ? `<span class="lb-lvl">NVL ${s.maxLevel}</span>` : '';
    const statsLine = `<div class="lb-stats-row">` +
      (s.totalClicks  !== undefined ? `<span>🖱 ${fmtClicks(s.totalClicks)} clics</span>` : '') +
      (s.franchises   !== undefined ? `<span>🏪 ${s.franchises} franchise${s.franchises > 1 ? 's' : ''}</span>` : '') +
      (s.achievements !== undefined ? `<span>🏆 ${s.achievements} trophées</span>` : '') +
      (s.playtime     !== undefined ? `<span>⏱ ${fmtDuration(s.playtime)}</span>` : '') +
      `</div>`;

    if (rank === 1) {
      const dur = durationSince(s.firstPlaceSince);
      html += `
        <div class="lb-first${meCls}">
          <div class="lb-first-glow"></div>
          <div class="lb-first-top">
            <span class="lb-first-crown">👑</span>
            <span class="lb-first-rank">#1</span>
            <span class="lb-first-name">${escHtml(s.playerName)}${isMe ? ' <span class="lb-you">(toi)</span>' : ''}</span>
            ${lvlBadge}
          </div>
          <div class="lb-first-score">${fmtScore(s.score)}</div>
          ${dur ? `<div class="lb-first-duration">👑 Au sommet depuis <strong>${dur}</strong></div>` : ''}
          ${statsLine}
        </div>`;

    } else if (rank === 2 || rank === 3) {
      const medals = { 2: '🥈', 3: '🥉' };
      const cls    = rank === 2 ? 'lb-silver' : 'lb-bronze';
      html += `
        <div class="lb-podium ${cls}${meCls}">
          <div class="lb-pod-main">
            <span class="lb-pod-medal">${medals[rank]}</span>
            <span class="lb-pod-rank">#${rank}</span>
            <span class="lb-pod-name">${escHtml(s.playerName)}${isMe ? ' <span class="lb-you">(toi)</span>' : ''}</span>
            ${lvlBadge}
            <span class="lb-pod-score">${fmtScore(s.score)}</span>
          </div>
          ${statsLine}
        </div>`;

    } else {
      html += `
        <div class="lb-rest${meCls}">
          <div class="lb-rest-main">
            <span class="lb-rest-rank">#${rank}</span>
            <span class="lb-rest-name">${escHtml(s.playerName)}${isMe ? ' <span class="lb-you">(toi)</span>' : ''}</span>
            ${lvlBadge}
            <span class="lb-rest-score">${fmtScore(s.score)}</span>
          </div>
          ${statsLine}
        </div>`;
    }
  });

  container.innerHTML = html;
}

// ── Pseudo modal ──────────────────────────────────────
function showPseudoModal() {
  const modal = document.getElementById('pseudo-modal');
  if (!modal) return;
  if (getPlayerName()) { modal.style.display = 'none'; return; }
  modal.style.display = 'flex';
}

function confirmPseudo() {
  const input = document.getElementById('pseudo-input');
  const name  = (input.value || '').trim().replace(/[<>"']/g, '').slice(0, 20);
  if (!name) {
    input.classList.add('pseudo-error');
    input.placeholder = '⚠ Pseudo requis !';
    setTimeout(() => input.classList.remove('pseudo-error'), 800);
    return;
  }
  localStorage.setItem('barrault_pseudo', name);
  document.getElementById('pseudo-modal').style.display = 'none';
  saveScore();
}

// ── Init au chargement ────────────────────────────────
window.addEventListener('load', () => {
  initFirebase();
  showPseudoModal();

  // Enter dans le champ pseudo
  const inp = document.getElementById('pseudo-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') confirmPseudo(); });
});

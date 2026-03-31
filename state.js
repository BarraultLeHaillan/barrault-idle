// ════════════════════════════════════════════════════════
// state.js — Constantes, données et état du jeu (objet S)
// ════════════════════════════════════════════════════════

// Objectif franchise croissant (courbe exp, x1.7 par palier)
function franchiseObjective(n) {
  return Math.floor(150000000 * Math.pow(1.7, n));
}

const DAY_NAMES  = ['Lun','Mar','Mer','Jeu','Ven'];
const MONTHS_FR  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const WORKING_DAYS_PER_MONTH = 22;

const SELLERS_DEF = {
  Dylan:    { name:'Dylan',    baseSalary:1800, spec:'Vendeur Particuliers',  ability:'+30% panier part. +20% fréq.', colors:{body:'#1B5EAB',hair:'#3a2010'}, effect:S=>{S.effects.partBasket+=0.30;S.effects.partFreq+=0.20;} },
  Eddy:     { name:'Eddy',     baseSalary:1700, spec:'Expert Satisfaction',   ability:'+40% gains clients part.',     colors:{body:'#2a6a2a',hair:'#1a1a50'}, effect:S=>{S.effects.partMult+=0.40;} },
  Jonathan: { name:'Jonathan', baseSalary:2000, spec:'Logisticien',           ability:'+20% revenus passifs',         colors:{body:'#4a3a10',hair:'#111'},    effect:S=>{S.effects.globalMult+=0.20;} },
  Laetitia: { name:'Laetitia', baseSalary:2200, spec:'Commerciale Pro',       ability:'+50% fréquence clients pro',   colors:{body:'#8a2080',hair:'#3a0a3a'}, effect:S=>{S.effects.proFreq+=0.50;} },
  Fabrice:  { name:'Fabrice',  baseSalary:2400, spec:'Chargé Grands Comptes', ability:'+60% panier clients pro',      colors:{body:'#CC1020',hair:'#1a0505'}, effect:S=>{S.effects.proBasket+=0.60;} },
  Thomas:   { name:'Thomas',   baseSalary:2600, spec:'Chef Ambiance ⭐',       ability:'Tous gains ×1.5',             colors:{body:'#b8a000',hair:'#5a5000'}, effect:S=>{S.effects.globalMult+=0.50;} },
  Seb:      { name:'Seb',      baseSalary:1900, spec:'Négociateur Achats',    ability:'Coût Outils ÷ 2',             colors:{body:'#4a4a80',hair:'#2a2a50'}, effect:S=>{S.effects.toolDiscount=true;} }
};
const SELLER_UNLOCK_LEVEL = { Dylan:1, Eddy:1, Jonathan:3, Laetitia:6, Fabrice:10, Thomas:15, Seb:22 };
const NEXT_TEAM_LEVEL     = [0,1,3,6,10,15,22,30];
const MAX_TEAM_AT_LEVEL   = lv => lv>=30?7:lv>=22?6:lv>=15?5:lv>=10?4:lv>=6?3:lv>=3?2:1;

// ── Managers ────────────────────────────────────────────
const MANAGER_PROFILES = {
  damien: { name:'Damien', spec:'Responsable Logistique', ability:'Automation & cadence de clic', quote:'"On automatise, on optimise, on domine."', cost:50000, colors:{body:'#1B5EAB',hair:'#111'} },
};

const MANAGER_UPGRADES = [
  { id:'ma1', branch:'autoclick', icon:'🖱️', name:'CADENCE +1',      desc:'+1 clic automatique/s',      cost:15000,  reqLv:10, apply:S=>{ S.manager.autoclickRate+=1; } },
  { id:'ma2', branch:'autoclick', icon:'🖱️', name:'CADENCE +2',      desc:'+2 clics automatiques/s',    cost:60000,  reqLv:15, apply:S=>{ S.manager.autoclickRate+=2; } },
  { id:'ma3', branch:'autoclick', icon:'⚡',  name:'CADENCE MAX',     desc:'+5 clics automatiques/s',    cost:250000, reqLv:25, apply:S=>{ S.manager.autoclickRate+=5; } },
  { id:'mb1', branch:'team',      icon:'👥', name:'COACHING I',      desc:'Production équipe +20%',      cost:25000,  reqLv:12, apply:S=>{ S.manager.teamBoost+=0.20; } },
  { id:'mb2', branch:'team',      icon:'👥', name:'COACHING II',     desc:'Production équipe +40%',      cost:90000,  reqLv:18, apply:S=>{ S.manager.teamBoost+=0.40; } },
  { id:'mb3', branch:'team',      icon:'🌟', name:'COACHING MAX',    desc:'Production équipe +100%',     cost:350000, reqLv:28, apply:S=>{ S.manager.teamBoost+=1.00; } },
  { id:'mc1', branch:'income',    icon:'💰', name:'CONTRATS I',      desc:'+100k CA/mois permanents',    cost:30000,  reqLv:11, apply:S=>{ S.manager.monthlyCa+=100000; } },
  { id:'mc2', branch:'income',    icon:'💰', name:'CONTRATS II',     desc:'+500k CA/mois permanents',    cost:150000, reqLv:20, apply:S=>{ S.manager.monthlyCa+=500000; } },
  { id:'mc3', branch:'income',    icon:'💎', name:'CONTRATS MAX',    desc:'+2M CA/mois permanents',      cost:600000, reqLv:30, apply:S=>{ S.manager.monthlyCa+=2000000; } },
  { id:'md1', branch:'prospect',  icon:'🤝', name:'PROSPECTION I',   desc:'1 client pro toutes les 60s', cost:35000,  reqLv:13, apply:S=>{ S.manager.vipInterval=60;  S.manager.vipTimer=60; } },
  { id:'md2', branch:'prospect',  icon:'🤝', name:'PROSPECTION II',  desc:'1 client pro toutes les 30s', cost:120000, reqLv:22, apply:S=>{ S.manager.vipInterval=30;  S.manager.vipTimer=Math.min(S.manager.vipTimer,30); } },
  { id:'md3', branch:'prospect',  icon:'🏆', name:'PROSPECTION MAX', desc:'1 client pro toutes les 15s', cost:450000, reqLv:35, apply:S=>{ S.manager.vipInterval=15;  S.manager.vipTimer=Math.min(S.manager.vipTimer,15); } },
];

// ── Outils ───────────────────────────────────────────────
const TOOL_UPGRADES = [
  { id:'t1', name:'ORDINATEURS',         icon:'💻', cost:3000,   reqLv:5,  desc:'+40% revenus équipe · +30% valeur clic',    apply:S=>{ S.toolEffects.teamBoost+=0.40; S.toolEffects.clickBoost+=0.30; } },
  { id:'t2', name:'CLOUD',               icon:'☁️',  cost:15000,  reqLv:8,  desc:'+20% gains globaux permanents',             apply:S=>{ S.toolEffects.globalBoost+=0.20; } },
  { id:'t3', name:'TABLETTE & SCAN.',    icon:'📱', cost:45000,  reqLv:12, desc:'Fréquence clients +30%',                    apply:S=>{ S.toolEffects.clientFreq+=0.30; } },
  { id:'t4', name:'TRANSPALETTE ÉLEC.',  icon:'🔋', cost:130000, reqLv:16, desc:'Panier tous clients +60%',                  apply:S=>{ S.toolEffects.basketBoost+=0.60; } },
  { id:'t5', name:'CENTRALE D\'APPEL',   icon:'📞', cost:350000, reqLv:20, desc:'1 client pro auto toutes les 45s',          apply:S=>{ S.toolEffects.proInterval=45; S.toolEffects.proTimer=45; } },
];

// ── Commerciaux ──────────────────────────────────────────
const COMMERCIAL_PROFILES = {
  jerome: { name:'Jérôme', spec:'Commercial Régional',       salary:4500, commPct:0.08, hireCost:150000, baseCa:500000, baseXps:15, quote:'"J\'entretiens le réseau — les contacts font le business."', colors:{body:'#2a6a2a',hair:'#111'} },
  pascal: { name:'Pascal',  spec:'Commercial Grands Comptes', salary:5500, commPct:0.10, hireCost:250000, baseCa:800000, baseXps:25, quote:'"Un grand compte, c\'est une relation, pas une transaction."', colors:{body:'#4a3a10',hair:'#1a1000'} },
};
const COMMERCIAL_UPGRADES = [
  { id:'cj2', key:'jerome', level:2, cost:80000,   caBoost:300000,  xpsBoost:3,  reqLv:22, desc:'Obj. CA +300k/mois · +3 XP/s' },
  { id:'cj3', key:'jerome', level:3, cost:250000,  caBoost:800000,  xpsBoost:8,  reqLv:28, desc:'Obj. CA +800k/mois · +8 XP/s' },
  { id:'cj4', key:'jerome', level:4, cost:700000,  caBoost:2000000, xpsBoost:18, reqLv:35, desc:'Obj. CA +2M/mois · +18 XP/s' },
  { id:'cj5', key:'jerome', level:5, cost:2000000, caBoost:4000000, xpsBoost:40, reqLv:45, desc:'Obj. CA +4M/mois · +40 XP/s' },
  { id:'cp2', key:'pascal', level:2, cost:120000,  caBoost:500000,  xpsBoost:5,  reqLv:24, desc:'Obj. CA +500k/mois · +5 XP/s' },
  { id:'cp3', key:'pascal', level:3, cost:380000,  caBoost:1500000, xpsBoost:12, reqLv:30, desc:'Obj. CA +1.5M/mois · +12 XP/s' },
  { id:'cp4', key:'pascal', level:4, cost:1000000, caBoost:3000000, xpsBoost:25, reqLv:38, desc:'Obj. CA +3M/mois · +25 XP/s' },
  { id:'cp5', key:'pascal', level:5, cost:3000000, caBoost:6000000, xpsBoost:55, reqLv:50, desc:'Obj. CA +6M/mois · +55 XP/s' },
];

const CLICK_UPGRADES = [
  { id:'c1',  name:'CAISSE AMÉLIORÉE', icon:'💵', desc:'+5€ par clic',          cost:200,    reqLv:1,  apply:S=>{ S.clickBonus+=5; } },
  { id:'c2',  name:'MEILLEUR ACCUEIL', icon:'😊', desc:'+10% chance client',    cost:500,    reqLv:1,  apply:S=>{ S.clickChance+=0.10; } },
  { id:'c3',  name:'TICKET PREMIUM',   icon:'🎫', desc:'+15€ par clic',         cost:1500,   reqLv:3,  apply:S=>{ S.clickBonus+=15; } },
  { id:'c4',  name:'VITRINE EXPO',     icon:'🪟', desc:'+15% chance client',    cost:3000,   reqLv:5,  apply:S=>{ S.clickChance+=0.15; } },
  { id:'c5',  name:'DOUBLE VENTE',     icon:'✌️',  desc:'+30€ par clic',         cost:8000,   reqLv:8,  apply:S=>{ S.clickBonus+=30; } },
  { id:'c6',  name:'SERVICE EXPRESS',  icon:'⚡', desc:'+20% chance client',    cost:18000,  reqLv:12, apply:S=>{ S.clickChance+=0.20; } },
  { id:'c7',  name:'CLIC DOUBLE',      icon:'👆', desc:'Chaque clic = 2 clics', cost:40000,  reqLv:18, apply:S=>{ S.clickDouble=true; } },
  { id:'c8',  name:'VIP PROGRAM',      icon:'👑', desc:'+100€ par clic',        cost:90000,  reqLv:25, apply:S=>{ S.clickBonus+=100; } },
  { id:'c9',  name:'RÉSEAU PRO',       icon:'🤝', desc:'+30% chance client',    cost:200000, reqLv:32, apply:S=>{ S.clickChance+=0.30; } },
  { id:'c10', name:'MÉGA CLIC',        icon:'💥', desc:'Chaque clic = 4 clics', cost:500000, reqLv:40, apply:S=>{ S.clickQuad=true; } },
];

const SUPPLIER_POOLS = {
  3:  [ { name:'VALEO',   logo:'🔆', offer:'+10 XP par client servi',           effect:S=>{ S.supplierXpBonus+=10; } },
        { name:'TRW',     logo:'🔧', offer:'+25€ par clic',                     effect:S=>{ S.clickBonus+=25; } },
        { name:'PURFLUX', logo:'🌀', offer:'Production équipe ×1.5 permanent',  effect:S=>{ S.supplierGlobalBoost+=0.50; } } ],
  6:  [ { name:'BOSCH',   logo:'⚡', offer:'+50€ par clic',                     effect:S=>{ S.clickBonus+=50; } },
        { name:'NGK',     logo:'🔥', offer:'+20% gains clients pro',            effect:S=>{ S.effects.proMult+=0.20; } },
        { name:'HELLA',   logo:'💡', offer:'+15 XP par client servi',           effect:S=>{ S.supplierXpBonus+=15; } } ],
  10: [ { name:'CONTINENTAL', logo:'🏎️', offer:'+30% fréquence clients part.',  effect:S=>{ S.effects.partFreq+=0.30; } },
        { name:'DELPHI',  logo:'🛠️', offer:'+200€ par clic',                   effect:S=>{ S.clickBonus+=200; } },
        { name:'MANN',    logo:'🔩', offer:'+40% panier clients part.',         effect:S=>{ S.effects.partBasket+=0.40; } } ],
  15: [ { name:'SACHS',   logo:'🏆', offer:'+50% gains équipe permanent',       effect:S=>{ S.supplierTeamBoost+=0.50; } },
        { name:'SKF',     logo:'⚙️', offer:'+500€ par clic',                   effect:S=>{ S.clickBonus+=500; } },
        { name:'FEBI',    logo:'🌟', offer:'+100% panier pro + 25% fréquence', effect:S=>{ S.effects.proBasket+=1.0; S.effects.proFreq+=0.25; } } ],
};

const ACHIEVEMENTS = [
  { id:'cl1', icon:'👆', name:'PREMIER CLIC',       desc:'Cliquer 1 fois',           xp:10,   bonus:100,      check:S=>S.clicks>=1 },
  { id:'cl2', icon:'👆', name:'CLIQUEUR',            desc:'100 clics',                xp:100,   bonus:500,     check:S=>S.clicks>=100 },
  { id:'cl3', icon:'👆', name:'CLICKOMANE',          desc:'1 000 clics',              xp:1000,  bonus:5000,     check:S=>S.clicks>=1000 },
  { id:'cl4', icon:'💥', name:'MARATHON CLIC',       desc:'5 000 clics',              xp:5000,  bonus:25000,    check:S=>S.clicks>=5000 },
  { id:'cl5', icon:'💥', name:'MACHINE À CLICS',     desc:'10 000 clics',             xp:10000, bonus:50000,   check:S=>S.clicks>=10000 },
  { id:'cl6', icon:'⚡', name:'MOIS INTENSE',        desc:'300 clics en 1 mois',      xp:500,  bonus:10000,    check:S=>S.clicksThisMonth>=300 },
  { id:'lv1', icon:'⬆️', name:'DÉBUTANT',            desc:'Niveau 5',                 xp:0,   bonus:5000,     check:S=>S.level>=5 },
  { id:'lv2', icon:'⬆️', name:'CONFIRMÉ',            desc:'Niveau 10',                xp:0,  bonus:10000,    check:S=>S.level>=10 },
  { id:'lv3', icon:'⬆️', name:'EXPERT',              desc:'Niveau 15',                xp:0,  bonus:50000,    check:S=>S.level>=15 },
  { id:'lv4', icon:'🌟', name:'MAÎTRE',              desc:'Niveau 20',                xp:0, bonus:100000,   check:S=>S.level>=20 },
  { id:'lv5', icon:'🌟', name:'LÉGENDE',             desc:'Niveau 25',                xp:0, bonus:1000000,   check:S=>S.level>=25 },
  { id:'cu1', icon:'🧑', name:'PREMIER CLIENT',      desc:'1 client servi',           xp:10,   bonus:500,      check:S=>S.clientsServed>=1 },
  { id:'cu2', icon:'🧑', name:'ANIMATEUR',           desc:'100 clients',              xp:250,   bonus:5000,     check:S=>S.clientsServed>=100 },
  { id:'cu3', icon:'🧑', name:'COMMERCIAL',          desc:'500 clients',              xp:1000,  bonus:10000,    check:S=>S.clientsServed>=500 },
  { id:'cu4', icon:'🧑', name:'PRO DE LA VENTE',     desc:'1 000 clients',            xp:5000,  bonus:50000,    check:S=>S.clientsServed>=1000 },
  { id:'cu5', icon:'🧑', name:'LÉGENDE COMMERCIALE', desc:'5 000 clients',            xp:10000, bonus:100000,   check:S=>S.clientsServed>=5000 },
  { id:'up1', icon:'🖱️', name:'AFFILÉ DU CLIC',      desc:'10 amélios clic achetées', xp:8000,  bonus:60000,    check:S=>S.clickUpgsBought.size>=10 },
  { id:'up2', icon:'💻', name:'OUTILS MAÎTRISÉS',    desc:'5 outils achetés',         xp:5000,  bonus:40000,    check:S=>(S.toolsBought&&S.toolsBought.size>=5) },
  { id:'up3', icon:'📢', name:'MARKETING TOTAL',     desc:'Marketing niveau max',     xp:5000,  bonus:40000,    check:S=>(S.upg.marketing&&S.upg.marketing.level>=5) },
  { id:'te1', icon:'👥', name:'PREMIER VENDEUR',     desc:'1 vendeur recruté',        xp:100,   bonus:2000,     check:S=>S.team.length>=1 },
  { id:'te2', icon:'👥', name:'PETITE ÉQUIPE',       desc:'4 vendeurs',               xp:1000,  bonus:10000,    check:S=>S.team.length>=4 },
  { id:'te3', icon:'👥', name:'ÉQUIPE COMPLÈTE',     desc:'7 vendeurs',               xp:10000,  bonus:100000,    check:S=>S.team.length>=7 },
  { id:'mg1', icon:'🧑‍💼', name:'SOUS BONNE GARDE',  desc:'Recruter un manager',      xp:1000,  bonus:10000,    check:S=>S.manager.hired },
  { id:'mo1', icon:'💰', name:'PREMIÈRES ÉCONOMIES', desc:'1 000€ gagnés',            xp:25,   bonus:0,        check:S=>S.totalEarned>=1000 },
  { id:'mo2', icon:'💰', name:'EN BONNE SANTÉ',      desc:'50 000€ gagnés',           xp:500,  bonus:0,        check:S=>S.totalEarned>=50000 },
  { id:'mo3', icon:'💎', name:'MILLIONNAIRE',        desc:'1 000 000€ gagnés',        xp:1000,  bonus:0,        check:S=>S.totalEarned>=1000000 },
];

const EVENTS = [
  { type:'negative', icon:'🚨', title:'CAMBRIOLAGE !',        desc:"Le magasin a été vandalisé ce week-end. Stock et caisse partiellement pillés.",      impact:m=>{ const a=Math.round(m*0.35); return { money:-a, label:`−${fmt(a)} (−35% trésorerie)` }; } },
  { type:'negative', icon:'🌊', title:'DÉGÂT DES EAUX',       desc:"Une fuite dans l'entrepôt a endommagé une partie du stock.",                         impact:m=>{ const a=Math.round(m*0.20); return { money:-a, label:`−${fmt(a)} (−20% trésorerie)` }; } },
  { type:'negative', icon:'📋', title:'CONTRÔLE URSSAF',      desc:"Un inspecteur URSSAF débarque à l'improviste. Redressement.",                        impact:m=>{ const a=Math.round(m*0.12); return { money:-a, label:`−${fmt(a)} (redressement URSSAF)` }; } },
  { type:'negative', icon:'💻', title:'PANNE INFORMATIQUE',   desc:"Le serveur tombe en panne. Réparation urgente et perte de données.",                  impact:m=>{ const a=Math.round(500+Math.random()*800); return { money:-a, label:`−${fmt(a)} (réparation urgente)` }; } },
  { type:'negative', icon:'🏥', title:'ARRÊT MALADIE',        desc:"Un vendeur est en arrêt 2 semaines. Production ralentie.",                            impact:m=>{ return { money:0, tempMalus:true, label:`Production −20% pendant 90 secondes` }; } },
  { type:'negative', icon:'⚡', title:'COUPURE ÉLECTRIQUE',   desc:"Une surtension grille les équipements. Remplacement en urgence.",                     impact:m=>{ const a=Math.round(400+Math.random()*600); return { money:-a, label:`−${fmt(a)} (dommages électriques)` }; } },
  { type:'positive', icon:'🏆', title:"APPEL D'OFFRE GAGNÉ !", desc:"Vous remportez un contrat pour une flotte de véhicules !",                          impact:m=>{ const a=Math.round(2000+Math.random()*4000); return { money:a, label:`+${fmt(a)} (contrat signé)` }; } },
  { type:'positive', icon:'📻', title:'PASSAGE EN LOCAL !',   desc:"Radio Gironde parle de Barrault ! Afflux de nouveaux clients.",                       impact:m=>{ const a=Math.round(1000+Math.random()*2000); return { money:a, label:`+${fmt(a)} (nouveaux clients)` }; } },
  { type:'positive', icon:'🎁', title:'REMISE FOURNISSEUR',   desc:"Votre fournisseur accorde une remise exceptionnelle !",                               impact:m=>{ const a=Math.round(500+Math.random()*1500); return { money:a, label:`+${fmt(a)} (remise obtenue)` }; } },
  { type:'positive', icon:'⭐', title:'AVIS VIRAL',            desc:"Un avis 5 étoiles devient viral. 50 nouvelles demandes !",                           impact:m=>{ const a=Math.round(800+Math.random()*1800); return { money:a, label:`+${fmt(a)} (boom de clientèle)` }; } },
  { type:'positive', icon:'🔧', title:"LOT D'OCCASION",       desc:"Un garagiste ferme et revend son stock à prix cassé.",                               impact:m=>{ const a=Math.round(300+Math.random()*700); return { money:a, label:`+${fmt(a)} (stock récupéré)` }; } },
];

const BONUS_SPEECHES = {
  Dylan:    ["Patron, mes clients me réclament par nom. Je mérite une prime.", "J'ai ramené 3 nouveaux clients cette semaine. Un petit geste ?"],
  Eddy:     ["La satisfaction client c'est ma spécialité. Et la mienne ?", "Tout le monde est content… sauf mon compte en banque."],
  Jonathan: ["Le magasin tourne bien grâce à moi. Prime ?", "J'ai optimisé la logistique, je peux optimiser mon salaire ?"],
  Laetitia: ["Les pros demandent à me parler directement. Je vaux plus.", "J'ai signé 2 contrats pros ce mois. Un bonus s'impose."],
  Fabrice:  ["Mon grand compte vient de renouveler. Je veux ma part.", "Sans moi ce client partait chez la concurrence. Merci qui ?"],
  Thomas:   ["L'ambiance c'est moi qui la crée. L'ambiance se paie.", "Tout le monde est de bonne humeur grâce à moi. Sauf mon banquier."],
  Seb:      ["J'ai négocié 15% de remise. Je veux 10% pour moi.", "J'ai économisé plus que je coûte. La logique dit : prime."]
};
const HEIST_SPEECHES = [
  "Patron, une bonne part du CA ou je file chez Autodistribution.",
  "J'ai vu les comptes. Le chiffre est bon. Très bon. Je veux ma part.",
  "J'ai une offre d'un concurrent. 30% de plus. Vous faites quoi ?",
  "Mon beau-frère est inspecteur du travail. On pourrait avoir une conversation intéressante..."
];
const RAISE_SPEECHES = {
  Dylan:    ["Ça fait un an que je suis là. Il est temps de revoir ma rémunération.", "Un an de bons et loyaux services. Le marché a évolué."],
  Eddy:     ["Mes indicateurs sont excellents. Ça doit se refléter.", "Un an de sourires. À vous de sourire maintenant."],
  Jonathan: ["La logistique n'a jamais aussi bien tourné. Depuis un an.", "Un an à tenir la boutique. Mon compte vous remercie d'avance."],
  Laetitia: ["Mes clients pro sont fidèles depuis un an grâce à moi.", "Un an de chiffre pro en hausse. J'aimerais en profiter."],
  Fabrice:  ["Mon grand compte est là depuis un an. Ma loyauté aussi.", "Un an de grands comptes. Les miens doivent l'être aussi."],
  Thomas:   ["L'ambiance depuis un an n'a pas de prix. Enfin si.", "Un an que le moral est au beau fixe. Le mien aussi avec une augmentation."],
  Seb:      ["J'ai économisé des milliers depuis un an. Un peu pour moi ?", "Un an de négociations gagnantes. Il est temps de négocier la mienne."]
};

// ── Arbre de progression franchise ──────────────────────
const FRANCHISE_TREE = [
  { id:'ft1', threshold:1,  icon:'🔬', name:'LA RECHERCHE ÇA PAYE', unlock:'lab',          desc:'Débloque le Labo de Recherche' },
  { id:'ft2', threshold:2,  icon:'🏆', name:'BARRAULT A DU TALENT', unlock:'zoneDirector', desc:'Débloque les Directeurs de Zone' },
  { id:'ft3', threshold:5,  icon:'📞', name:'CALL CENTER',           unlock:'callCenter',   desc:'Débloque la Centrale d\'Appel' },
  { id:'ft4', threshold:10, icon:'📺', name:'SPOT TÉLÉ',            unlock:'tvAds',        desc:'Débloque la Pub TV' },
  { id:'ft5', threshold:15, icon:'🌐', name:'RÉSEAU NATIONAL',      desc:'15 franchises — Barrault couvre la France' },
  { id:'ft6', threshold:20, icon:'🏙️', name:'EMPIRE RÉGIONAL',      desc:'20 franchises — Un empire prend forme' },
  { id:'ft7', threshold:25, icon:'💡', name:'INNOVATION TOTALE',    desc:'25 franchises — La R&D au maximum' },
  { id:'ft8', threshold:30, icon:'🚀', name:'EXPANSION MAXIMALE',   desc:'30 franchises — France entière couverte' },
  { id:'ft9', threshold:40, icon:'⭐', name:'LÉGENDE DU MARCHÉ',    desc:'40 franchises — Référence nationale' },
  { id:'ft10',threshold:50, icon:'👑', name:'MONOPOLE BARRAULT',    desc:'50 franchises — Le sommet absolu' },
];

// ── Améliorations Ultimes ────────────────────────────────
const ULTIMES_DEF = [
  {
    id: 'vibromasseur',
    icon: '💥',
    name: 'VIBROMASSEUR',
    category: 'CLIC ULTIME',
    desc: '+10% chance client · chaque clic = 10 clics',
    cost: 1e9,
    unlockDesc: 'Acheter les 10 améliorations clic',
    unlock: S => S.clickUpgsBought.size >= CLICK_UPGRADES.length,
  },
  {
    id: 'staffBionique',
    icon: '🤖',
    name: 'STAFF BIONIQUE',
    category: 'ÉQUIPE ULTIME',
    desc: 'B800 IA — CA équipe généré en continu par seconde',
    cost: 1e10,
    unlockDesc: 'Équipe complète 7/7',
    unlock: S => S.team.length >= 7,
  },
  {
    id: 'dataMining',
    icon: '🖥️',
    name: 'DATA MINING',
    category: 'MANAGER ULTIME',
    desc: 'Data center — 1 Md€/s · plus de clients',
    cost: 1e10,
    unlockDesc: 'Toutes les améliorations manager achetées (12)',
    unlock: S => S.manager.hired && S.manager.upgsBought.size >= MANAGER_UPGRADES.length,
  },
  {
    id: 'chasseurTetes',
    icon: '🎯',
    name: 'CHASSEUR DE TÊTES',
    category: 'COMMERCIAUX ULTIME',
    desc: 'Coule un concurrent toutes les 5–30s · +10 Md€',
    cost: 1e11,
    unlockDesc: 'Jérôme niv.5 + Pascal niv.5',
    unlock: S => S.commercials.jerome.hired && S.commercials.jerome.level >= 5 && S.commercials.pascal.hired && S.commercials.pascal.level >= 5,
  },
];

// ── Upgrades zones franchise ─────────────────────────────
const LAB_UPGRADES = [
  { id:'lab1', cost:200000,   xpBoost:3,   name:'ÉQUIPEMENT NIV.2', desc:'+3 XP / k€ généré' },
  { id:'lab2', cost:800000,   xpBoost:10,  name:'RECHERCHE NIV.3',  desc:'+10 XP / k€ généré' },
  { id:'lab3', cost:3000000,  xpBoost:25,  name:'LABO AVANCÉ NIV.4',desc:'+25 XP / k€ généré' },
];
const ZONE_DIRECTOR_UPGRADES = [
  { id:'zd1', cost:500000,  boostBonus:0.25, name:'RÉSEAU NIV.2',      desc:'+25% au bonus activation' },
  { id:'zd2', cost:2000000, boostBonus:0.50, name:'EXPANSION NIV.3',   desc:'+50% au bonus activation' },
  { id:'zd3', cost:8000000, boostBonus:1.00, name:'DIRECTION MAX NIV.4',desc:'+100% au bonus activation' },
];
const CALL_CENTER_UPGRADES = [
  { id:'cc1', cost:1000000,  incomeBoost:2000,  xpBoost:15,  name:'CENTREX NIV.2',  desc:'+2 000€/s · +15 XP/s' },
  { id:'cc2', cost:5000000,  incomeBoost:8000,  xpBoost:50,  name:'CENTREX NIV.3',  desc:'+8 000€/s · +50 XP/s' },
  { id:'cc3', cost:20000000, incomeBoost:25000, xpBoost:150, name:'CENTREX MAX NIV.4',desc:'+25 000€/s · +150 XP/s' },
];
const TV_ADS_UPGRADES = [
  { id:'tv1', cost:2000000,  caBoost:10000000,  name:'CAMPAGNE NIV.2',  desc:'+10M€/mois de pub' },
  { id:'tv2', cost:8000000,  caBoost:30000000,  name:'PRIME TIME NIV.3',desc:'+30M€/mois de pub' },
  { id:'tv3', cost:30000000, caBoost:80000000,  name:'NATIONAL MAX NIV.4',desc:'+80M€/mois de pub' },
];

const S = {
  money:500, totalEarned:0, lifetimeEarned:0, playtime:0,
  lifetimeClicks:0, lifetimePlaytime:0, lifetimeAchievements:0,
  franchisesOwned:0, franchiseMultiplier:0,
  clientsServed:0, clicks:0, clicksThisMonth:0, clickBoost:0, level:1,
  gameDay:1, gameMonth:1, gameYear:2026, dayOfWeek:0,
  timeAccum:0, monthDuration:60,
  team:[], bonusTimers:{}, malusPerSeller:{}, bonusPerSeller:{},
  seniority:{}, fired:{}, globalMalus:0,
  sellerCosts:{},
  bonusModalOpen:false, eventModalOpen:false, raiseModalOpen:false,
  pendingBonusQueue:[], pendingEventQueue:[], pendingRaiseQueue:[],
  eventTimer:0,
  clickUpgsBought:new Set(),
  clickBonus:5, clickChance:0.15, clickDouble:false, clickQuad:false,
  upgBought:0, xpFromUpgrades:0, xpFromClients:0,
  autoclickAccum:0,
  achUnlocked:new Set(),
  supplierUnlocked:{3:false,6:false,10:false,15:false},
  supplierXpBonus:0, supplierGlobalBoost:0, supplierTeamBoost:0,
  manager:{ hired:false, profile:null, autoclickRate:0, teamBoost:0, incomeBoost:0, monthlyCa:0, vipInterval:0, vipTimer:0, upgsBought:new Set() },
  toolsBought:new Set(),
  toolEffects:{ teamBoost:0, clickBoost:0, globalBoost:0, clientFreq:0, basketBoost:0, proInterval:0, proTimer:0 },
  commercials:{
    jerome:{ hired:false, level:1, caObjective:500000, xpsRate:15 },
    pascal:{ hired:false, level:1, caObjective:800000, xpsRate:25 }
  },
  effects:{ partBasket:0, partFreq:0, partMult:0, proBasket:0, proFreq:0, proMult:0, globalMult:0, toolDiscount:false },
  upg:{
    catalog:   { name:'CATALOGUE', level:1, baseCost:500,  mult:1.8, icon:'📋', desc:'Références & paniers', reqLv:1, cap:15 },
    marketing: { name:'MARKETING', level:0, baseCost:5000, mult:2.0, icon:'📢', desc:'Attire clients pro',   reqLv:8, cap:5  },
  },
  // Zones franchise (persistantes à travers les prestiges)
  lab:          { xpPer1k:2,       upgsBought:new Set(), moneyAccum:0 },
  zoneDirector: { boostPct:0.50,   active:false, timer:0, cooldown:300, upgsBought:new Set() },
  callCenter:   { incomeRate:500,   xpRate:5,     upgsBought:new Set() },
  tvAds:        { monthlyCa:5000000, upgsBought:new Set() },
  // Améliorations Ultimes (persistantes à travers les prestiges)
  ultimes: { vibromasseur:false, staffBionique:false, dataMining:false, chasseurTetes:false },
  bioniqueRate: 0,
  headhunterTimer: 0,
  vibroAccum: 0,
};

require('dotenv').config();
const db = require('./index');
const bcrypt = require('bcryptjs');

const PRODUITS = [
  ['FARINE FLEUR DIAMANDA',      'TRIA GROUP', '25kg', 'Laminé',        'Aïn Sebaa - Casablanca',   93.75],
  ['FARINE LUXE DIAMANDA',       'TRIA GROUP', '25kg', 'Laminé',        'Aïn Sebaa - Casablanca',   82.50],
  ['FARINE FLEUR LAMLIH',        'TRIA GROUP', '25kg', 'Laminé',        'Aïn Sebaa - Casablanca',   93.75],
  ['FARINE LUXE LAMLIH',         'TRIA GROUP', '25kg', 'Laminé',        'Aïn Sebaa - Casablanca',   82.50],
  ['FARINE LUXE AMBRE',          'TRIA GROUP', '25kg', 'Laminé',        'Aïn Sebaa - Casablanca',   82.50],
  ['FARINE RONDE FINE LAMLIH',   'TRIA GROUP', '25kg', 'Plastique (PP)','Aïn Sebaa - Casablanca',   93.75],
  ['FARINE FLEUR DIAMANDA',      'TRIA GROUP', '10kg', 'Kraft',         'Aïn Sebaa - Casablanca',   39.50],
  ['FARINE FLEUR DIAMANDA',      'TRIA GROUP', '5kg',  'Kraft',         'Aïn Sebaa - Casablanca',   20.25],
  ['FARINE LUXE DIAMANDA',       'TRIA GROUP', '10kg', 'Laminé',        'Aïn Sebaa - Casablanca',   38.50],
  ['SON BLE TENDRE AIN SEBAA',   'TRIA GROUP', '40kg', 'Plastique (PP)','Aïn Sebaa - Casablanca',   78.94],
  ['FARINE RONDE GROSSE TRIA',   'TRIA GROUP', '25kg', 'Plastique (PP)','Hadsoualam - Casablanca',  93.75],
  ['FARINE RONDE GROSSE TRIA',   'TRIA GROUP', '25kg', 'Laminé',        'Hadsoualam - Casablanca',  92.50],
  ['FARINE BOULANGERE TRIA',     'TRIA GROUP', '25kg', 'Plastique (PP)','Hadsoualam - Casablanca',  85.00],
  ['FARINE LUXE TRIA',           'TRIA GROUP', '25kg', 'Laminé',        'Hadsoualam - Casablanca',  82.50],
  ['FARINE FLEUR TRIA',          'TRIA GROUP', '10kg', 'Kraft',         'Hadsoualam - Casablanca',  39.50],
  ['FARINE FLEUR TRIA',          'TRIA GROUP', '5kg',  'Kraft',         'Hadsoualam - Casablanca',  20.25],
  ['FARINE COMPLETE DE BT TRIA', 'TRIA GROUP', '25kg', 'Plastique (PP)','Hadsoualam - Casablanca',   1.25],
  ['SON BLE TENDRE',             'TRIA GROUP', '40kg', 'Plastique (PP)','Hadsoualam - Casablanca',  64.00],
  ['FARINE FLEUR MAYMOUNA',      'Maymouna',   '25kg', 'Laminé',        'Maymouna - Casablanca',    93.75],
  ['FARINE LUXE MAYMOUNA',       'Maymouna',   '25kg', 'Laminé',        'Maymouna - Casablanca',    82.50],
  ['FARINE RONDE MAYMOUNA',      'Maymouna',   '25kg', 'Plastique (PP)','Maymouna - Casablanca',    93.75],
  ['FARINE BOULANGERE MAYMOUNA', 'Maymouna',   '25kg', 'Plastique (PP)','Maymouna - Casablanca',    85.00],
];

const CLIENTS = [
  ['Yassini Simohammed',   'Khmisset',    'Bv Ibn Sina N°222',          ''],
  ['Abdelkarim Moussayer', 'Témara',      '412 Rue Caire Hay El Abbadi', ''],
  ['Abdelaziz Bensmail',   'Témara',      'Av Omar Al Khatabi',          ''],
  ['A.G Les Amicales',     'Tiznit',      'Rue Tarek',                   ''],
  ['Aayouni Mohamed',      'Salé',        'El Oued',                     ''],
  ['A.G Free Food',        'Casablanca',  'N 62 Rue Caporal Cups',       ''],
];

async function seed() {
  console.log('🌱 Initialisation des données...\n');

  // ── Admin / Responsable ──────────────────────────────────────────────────
  const hashAdmin = await bcrypt.hash('tct2024', 10);
  await db.query(`
    INSERT INTO users (nom, prenom, email, mot_de_passe, role)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING
  `, ['Ouchaib','Abdelaali','abdelaali@tct.ma', hashAdmin, 'responsable']);
  console.log('✅ Responsable : abdelaali@tct.ma / tct2024');

  // ── Chauffeurs (employes + user accounts) ───────────────────────────────
  const chauffeurs = [
    { prenom: 'Mohammed', nom: 'Chauffeur1', email: 'chauffeur1@tct.ma', mdp: 'chauffeur1', matricule: '00000-A-1' },
    { prenom: 'Hassan',   nom: 'Chauffeur2', email: 'chauffeur2@tct.ma', mdp: 'chauffeur2', matricule: '00000-A-2' },
  ];

  for (const c of chauffeurs) {
    // Insert employe
    const { rows: [emp] } = await db.query(`
      INSERT INTO employes (nom, prenom, role, matricule_camion)
      VALUES ($1,$2,'chauffeur',$3)
      ON CONFLICT DO NOTHING RETURNING id
    `, [c.nom, c.prenom, c.matricule]);

    // Create user account so chauffeur can log in and chat
    const hash = await bcrypt.hash(c.mdp, 10);
    await db.query(`
      INSERT INTO users (nom, prenom, email, mot_de_passe, role)
      VALUES ($1,$2,$3,$4,'chauffeur') ON CONFLICT (email) DO NOTHING
    `, [c.nom, c.prenom, c.email, hash]);

    console.log(`✅ Chauffeur : ${c.email} / ${c.mdp}  (matricule: ${c.matricule})`);
  }

  // ── Produits ─────────────────────────────────────────────────────────────
  for (const [nom, societe, poids, type_sac, point_chargement, prix_unitaire] of PRODUITS) {
    await db.query(`
      INSERT INTO produits (nom, societe, poids, type_sac, point_chargement, prix_unitaire)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
    `, [nom, societe, poids, type_sac, point_chargement, prix_unitaire]);
  }
  console.log(`\n✅ ${PRODUITS.length} produits créés (TRIA GROUP + Maymouna)`);

  // ── Clients ───────────────────────────────────────────────────────────────
  for (const [nom, ville, adresse, telephone] of CLIENTS) {
    await db.query(`
      INSERT INTO clients (nom, ville, adresse, telephone)
      VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
    `, [nom, ville, adresse, telephone]);
  }
  console.log(`✅ ${CLIENTS.length} clients exemples créés`);

  console.log('\n═══════════════════════════════════════');
  console.log('🚀 Base de données prête !');
  console.log('');
  console.log('👔 Responsable :');
  console.log('   Email    : abdelaali@tct.ma');
  console.log('   Mot passe: tct2024');
  console.log('');
  console.log('🚛 Chauffeurs (modifiez noms/matricules) :');
  console.log('   chauffeur1@tct.ma / chauffeur1');
  console.log('   chauffeur2@tct.ma / chauffeur2');
  console.log('═══════════════════════════════════════\n');
  process.exit(0);
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });

require('dotenv').config();
const db = require('./index');

async function initDB() {
  console.log('🔧 Création des tables PostgreSQL (Neon)...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      nom          VARCHAR(100) NOT NULL,
      prenom       VARCHAR(100) NOT NULL,
      email        VARCHAR(200) UNIQUE NOT NULL,
      mot_de_passe TEXT NOT NULL,
      role         VARCHAR(50) DEFAULT 'responsable',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employes (
      id               SERIAL PRIMARY KEY,
      nom              VARCHAR(100) NOT NULL,
      prenom           VARCHAR(100) NOT NULL,
      telephone        VARCHAR(30),
      age              INTEGER,
      role             VARCHAR(50) DEFAULT 'chauffeur',
      salaire          NUMERIC(10,2),
      numero_cnss      VARCHAR(50),
      matricule_camion VARCHAR(50),
      actif            BOOLEAN DEFAULT TRUE,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clients (
      id         SERIAL PRIMARY KEY,
      nom        VARCHAR(200) NOT NULL,
      ville      VARCHAR(100) NOT NULL,
      adresse    TEXT,
      telephone  VARCHAR(30),
      actif      BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS produits (
      id               SERIAL PRIMARY KEY,
      nom              VARCHAR(200) NOT NULL,
      societe          VARCHAR(100) NOT NULL,
      poids            VARCHAR(20) NOT NULL,
      type_sac         VARCHAR(50) NOT NULL,
      point_chargement VARCHAR(150),
      prix_unitaire    NUMERIC(10,2) DEFAULT 0,
      actif            BOOLEAN DEFAULT TRUE,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS factures (
      id               SERIAL PRIMARY KEY,
      numero_facture   VARCHAR(50) UNIQUE NOT NULL,
      client_id        INTEGER REFERENCES clients(id),
      nom_client       VARCHAR(200),
      ville_client     VARCHAR(100),
      chauffeur_id     INTEGER REFERENCES employes(id),
      nom_chauffeur    VARCHAR(200),
      matricule_camion VARCHAR(50),
      montant_total    NUMERIC(12,2) DEFAULT 0,
      mode_paiement    VARCHAR(30) DEFAULT 'Espèces',
      numero_cheque    VARCHAR(100),
      prime_chauffeur  NUMERIC(10,2) DEFAULT 0,
      statut           VARCHAR(30) DEFAULT 'En attente',
      date_facture     DATE DEFAULT CURRENT_DATE,
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lignes_facture (
      id            SERIAL PRIMARY KEY,
      facture_id    INTEGER REFERENCES factures(id) ON DELETE CASCADE,
      produit_id    INTEGER REFERENCES produits(id),
      nom_produit   VARCHAR(300),
      quantite_sacs INTEGER NOT NULL,
      prix_unitaire NUMERIC(10,2) NOT NULL,
      total_ligne   NUMERIC(12,2) GENERATED ALWAYS AS (quantite_sacs * prix_unitaire) STORED
    );

    -- TABLE MESSAGERIE
    CREATE TABLE IF NOT EXISTS messages (
      id           SERIAL PRIMARY KEY,
      expediteur_id   INTEGER NOT NULL,
      expediteur_type VARCHAR(20) NOT NULL DEFAULT 'employe',
      expediteur_nom  VARCHAR(200) NOT NULL,
      destinataire_id INTEGER,
      destinataire_type VARCHAR(20),
      contenu      TEXT NOT NULL,
      lu           BOOLEAN DEFAULT FALSE,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_messages_dest ON messages(destinataire_id, destinataire_type);
    CREATE INDEX IF NOT EXISTS idx_messages_exp  ON messages(expediteur_id, expediteur_type);
    CREATE INDEX IF NOT EXISTS idx_factures_date ON factures(date_facture DESC);
  `);

  console.log('✅ Tables créées avec succès !');
  process.exit(0);
}

initDB().catch(err => { console.error('❌ Erreur:', err.message); process.exit(1); });

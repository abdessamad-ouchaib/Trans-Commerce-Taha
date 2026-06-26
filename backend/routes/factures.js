const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Helper: generate facture number
async function genNumero() {
  const year = new Date().getFullYear();
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM factures WHERE numero_facture LIKE $1`,
    [`TCT-${year}-%`]
  );
  const num = parseInt(rows[0].cnt) + 1;
  return `TCT-${year}-${String(num).padStart(4, '0')}`;
}

// GET all factures with filters
router.get('/', auth, async (req, res) => {
  try {
    const { statut, limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = statut ? [`f.statut = $1`] : [];
    const params = statut ? [statut, limit, offset] : [limit, offset];
    const paramOffset = statut ? 1 : 0;

    const sql = `
      SELECT f.*,
             c.telephone AS client_telephone,
             e.matricule_camion AS chauffeur_matricule
      FROM factures f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN employes e ON f.chauffeur_id = e.id
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY f.date_facture DESC, f.created_at DESC
      LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}
    `;
    const { rows: factures } = await db.query(sql, params);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total FROM factures ${statut ? "WHERE statut=$1" : ''}`,
      statut ? [statut] : []
    );

    res.json({ factures, total: parseInt(countRows[0].total), pages: Math.ceil(countRows[0].total / limit) });
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

// GET stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        COUNT(*)                                             AS total_factures,
        COUNT(*) FILTER (WHERE statut='Payée')              AS payees,
        COUNT(*) FILTER (WHERE statut='En attente')         AS en_attente,
        COALESCE(SUM(montant_total) FILTER (WHERE statut='Payée'),    0) AS montant_paye,
        COALESCE(SUM(montant_total) FILTER (WHERE statut='En attente'),0) AS montant_attente
      FROM factures
    `);
    res.json(stats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single facture with lignes
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: [facture] } = await db.query(`
      SELECT f.*,
             c.telephone AS client_telephone, c.adresse AS client_adresse,
             e.telephone AS chauffeur_telephone
      FROM factures f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN employes e ON f.chauffeur_id = e.id
      WHERE f.id = $1
    `, [req.params.id]);

    if (!facture) return res.status(404).json({ message: 'Facture non trouvée.' });

    const { rows: lignes } = await db.query(`
      SELECT lf.*, p.societe, p.poids, p.type_sac, p.point_chargement
      FROM lignes_facture lf
      LEFT JOIN produits p ON lf.produit_id = p.id
      WHERE lf.facture_id = $1
      ORDER BY lf.id
    `, [req.params.id]);

    res.json({ ...facture, lignes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create facture
router.post('/', auth, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const {
      client_id, chauffeur_id, matricule_camion,
      mode_paiement, numero_cheque, prime_chauffeur,
      statut, date_facture, notes, lignes = []
    } = req.body;

    // Fetch client & chauffeur names
    const { rows: [cli] } = await client.query('SELECT nom, ville FROM clients WHERE id=$1', [client_id]);
    const { rows: [chauf] } = await client.query('SELECT prenom, nom, matricule_camion FROM employes WHERE id=$1', [chauffeur_id]);

    const numero = await genNumero();
    const montant_total = lignes.reduce((s, l) => s + (l.quantite_sacs * l.prix_unitaire), 0);

    const { rows: [facture] } = await client.query(`
      INSERT INTO factures
        (numero_facture, client_id, nom_client, ville_client,
         chauffeur_id, nom_chauffeur, matricule_camion,
         montant_total, mode_paiement, numero_cheque,
         prime_chauffeur, statut, date_facture, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      numero,
      client_id, cli?.nom || '', cli?.ville || '',
      chauffeur_id, chauf ? `${chauf.prenom} ${chauf.nom}` : '',
      matricule_camion || chauf?.matricule_camion || '',
      montant_total,
      mode_paiement || 'Espèces',
      numero_cheque || null,
      prime_chauffeur || 0,
      statut || 'En attente',
      date_facture || new Date().toISOString().split('T')[0],
      notes || null
    ]);

    // Insert lignes
    for (const l of lignes) {
      const { rows: [prod] } = await client.query('SELECT nom, poids, type_sac FROM produits WHERE id=$1', [l.produit_id]);
      await client.query(`
        INSERT INTO lignes_facture (facture_id, produit_id, nom_produit, quantite_sacs, prix_unitaire)
        VALUES ($1,$2,$3,$4,$5)
      `, [facture.id, l.produit_id,
          prod ? `${prod.nom} ${prod.poids} ${prod.type_sac}` : l.nom_produit,
          l.quantite_sacs, l.prix_unitaire]);
    }

    await client.query('COMMIT');

    const { rows: lignesResult } = await db.query(
      'SELECT lf.*, p.societe FROM lignes_facture lf LEFT JOIN produits p ON lf.produit_id=p.id WHERE lf.facture_id=$1',
      [facture.id]
    );
    res.status(201).json({ ...facture, lignes: lignesResult });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// PUT update facture
router.put('/:id', auth, async (req, res) => {
  const conn = await db.pool.connect();
  try {
    await conn.query('BEGIN');

    const {
      client_id, chauffeur_id, matricule_camion,
      mode_paiement, numero_cheque, prime_chauffeur,
      statut, date_facture, notes, lignes
    } = req.body;

    const updates = [];
    const vals = [];
    let i = 1;

    const addField = (col, val) => { updates.push(`${col}=$${i++}`); vals.push(val); };

    if (statut !== undefined)          addField('statut', statut);
    if (mode_paiement !== undefined)   addField('mode_paiement', mode_paiement);
    if (numero_cheque !== undefined)   addField('numero_cheque', numero_cheque);
    if (prime_chauffeur !== undefined) addField('prime_chauffeur', prime_chauffeur);
    if (date_facture !== undefined)    addField('date_facture', date_facture);
    if (notes !== undefined)           addField('notes', notes);
    if (matricule_camion !== undefined) addField('matricule_camion', matricule_camion);

    if (client_id !== undefined) {
      addField('client_id', client_id);
      const { rows: [cli] } = await conn.query('SELECT nom, ville FROM clients WHERE id=$1', [client_id]);
      if (cli) { addField('nom_client', cli.nom); addField('ville_client', cli.ville); }
    }
    if (chauffeur_id !== undefined) {
      addField('chauffeur_id', chauffeur_id);
      const { rows: [chauf] } = await conn.query('SELECT prenom, nom FROM employes WHERE id=$1', [chauffeur_id]);
      if (chauf) addField('nom_chauffeur', `${chauf.prenom} ${chauf.nom}`);
    }

    // Recalculate total if lignes provided
    if (lignes) {
      const montant_total = lignes.reduce((s, l) => s + (l.quantite_sacs * l.prix_unitaire), 0);
      addField('montant_total', montant_total);
      await conn.query('DELETE FROM lignes_facture WHERE facture_id=$1', [req.params.id]);
      for (const l of lignes) {
        const { rows: [prod] } = await conn.query('SELECT nom, poids, type_sac FROM produits WHERE id=$1', [l.produit_id]);
        await conn.query(
          'INSERT INTO lignes_facture (facture_id, produit_id, nom_produit, quantite_sacs, prix_unitaire) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, l.produit_id,
           prod ? `${prod.nom} ${prod.poids} ${prod.type_sac}` : l.nom_produit,
           l.quantite_sacs, l.prix_unitaire]
        );
      }
    }

    if (updates.length > 0) {
      vals.push(req.params.id);
      await conn.query(
        `UPDATE factures SET ${updates.join(', ')} WHERE id=$${i} RETURNING *`,
        vals
      );
    }

    await conn.query('COMMIT');
    const { rows: [updated] } = await db.query('SELECT * FROM factures WHERE id=$1', [req.params.id]);
    const { rows: lignesResult } = await db.query('SELECT lf.*, p.societe FROM lignes_facture lf LEFT JOIN produits p ON lf.produit_id=p.id WHERE lf.facture_id=$1', [req.params.id]);
    res.json({ ...updated, lignes: lignesResult });
  } catch (err) {
    await conn.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM factures WHERE id=$1', [req.params.id]);
    res.json({ message: 'Facture supprimée.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

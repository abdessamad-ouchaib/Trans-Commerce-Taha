const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM produits WHERE actif=TRUE ORDER BY societe, nom, poids'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { nom, societe, poids, type_sac, point_chargement, prix_unitaire } = req.body;
    if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });
    const { rows } = await db.query(
      `INSERT INTO produits (nom, societe, poids, type_sac, point_chargement, prix_unitaire)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nom, societe, poids, type_sac, point_chargement || null, prix_unitaire || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { nom, societe, poids, type_sac, point_chargement, prix_unitaire } = req.body;
    const { rows } = await db.query(
      `UPDATE produits SET nom=$1, societe=$2, poids=$3, type_sac=$4,
       point_chargement=$5, prix_unitaire=$6
       WHERE id=$7 AND actif=TRUE RETURNING *`,
      [nom, societe, poids, type_sac, point_chargement || null, prix_unitaire || 0, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Produit non trouvé.' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE produits SET actif=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Produit supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

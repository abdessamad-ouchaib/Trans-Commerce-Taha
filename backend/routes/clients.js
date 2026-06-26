const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM clients WHERE actif=TRUE ORDER BY nom'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { nom, ville, adresse, telephone } = req.body;
    if (!nom || !ville) return res.status(400).json({ message: 'Nom et ville sont requis.' });
    const { rows } = await db.query(
      `INSERT INTO clients (nom, ville, adresse, telephone)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [nom, ville, adresse || null, telephone || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { nom, ville, adresse, telephone } = req.body;
    const { rows } = await db.query(
      `UPDATE clients SET nom=$1, ville=$2, adresse=$3, telephone=$4
       WHERE id=$5 AND actif=TRUE RETURNING *`,
      [nom, ville, adresse || null, telephone || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Client non trouvé.' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE clients SET actif=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Client supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM employes WHERE actif = TRUE ORDER BY prenom, nom'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { nom, prenom, telephone, age, role, salaire, numero_cnss, matricule_camion } = req.body;
    const { rows } = await db.query(
      `INSERT INTO employes (nom, prenom, telephone, age, role, salaire, numero_cnss, matricule_camion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nom, prenom, telephone || null, age || null, role || 'chauffeur',
       salaire || null, numero_cnss || null, matricule_camion || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { nom, prenom, telephone, age, role, salaire, numero_cnss, matricule_camion } = req.body;
    const { rows } = await db.query(
      `UPDATE employes SET nom=$1, prenom=$2, telephone=$3, age=$4, role=$5,
       salaire=$6, numero_cnss=$7, matricule_camion=$8
       WHERE id=$9 AND actif=TRUE RETURNING *`,
      [nom, prenom, telephone || null, age || null, role,
       salaire || null, numero_cnss || null, matricule_camion || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Employé non trouvé.' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE employes SET actif=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Employé supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

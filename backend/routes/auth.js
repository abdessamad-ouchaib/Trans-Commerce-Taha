const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db');

// ── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user)
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });

    const valid = await bcrypt.compare(motDePasse, user.mot_de_passe);
    if (!valid)
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role },
      process.env.JWT_SECRET || 'tct_secret_2024',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ── Info responsable — PUBLIC (pas besoin de token) ──────────────────────────
// Utilisé par les chauffeurs pour connaître le vrai ID du responsable
router.get('/responsable-info', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nom, prenom, email FROM users WHERE role = 'responsable' LIMIT 1`
    );
    if (!rows[0])
      return res.status(404).json({ message: 'Responsable non trouvé.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Setup passwords ───────────────────────────────────────────────────────────
router.get('/setup-passwords', async (req, res) => {
  try {
    const h1 = await bcrypt.hash('tct2024',    10);
    const h2 = await bcrypt.hash('chauffeur1', 10);
    const h3 = await bcrypt.hash('chauffeur2', 10);

    await db.query('UPDATE users SET mot_de_passe=$1 WHERE email=$2', [h1, 'abdelaali@tct.ma']);
    await db.query('UPDATE users SET mot_de_passe=$1 WHERE email=$2', [h2, 'chauffeur1@tct.ma']);
    await db.query('UPDATE users SET mot_de_passe=$1 WHERE email=$2', [h3, 'chauffeur2@tct.ma']);

    const { rows } = await db.query('SELECT id, email, role FROM users ORDER BY id');
    res.json({ message: '✅ Mots de passe mis à jour !', users: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

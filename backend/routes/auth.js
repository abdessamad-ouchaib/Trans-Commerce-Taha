const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db');

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });

    const valid = await bcrypt.compare(motDePasse, user.mot_de_passe);
    if (!valid) return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });

    // Find matching employe record if chauffeur (for chat ID)
    let employe_id = null;
    if (user.role === 'chauffeur') {
      const { rows: empRows } = await db.query(
        'SELECT id FROM employes WHERE nom=$1 AND prenom=$2 AND actif=TRUE LIMIT 1',
        [user.nom, user.prenom]
      );
      employe_id = empRows[0]?.id || null;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom,
        role: user.role, employe_id },
      process.env.JWT_SECRET || 'tct_secret_2024',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom,
              email: user.email, role: user.role, employe_id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;

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
// Endpoint temporaire pour initialiser les mots de passe
router.get('/setup-passwords', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    const hash_tct2024     = await bcrypt.hash('tct2024', 10);
    const hash_chauffeur1  = await bcrypt.hash('chauffeur1', 10);
    const hash_chauffeur2  = await bcrypt.hash('chauffeur2', 10);

    await db.query(
      'UPDATE users SET mot_de_passe=$1 WHERE email=$2',
      [hash_tct2024, 'abdelaali@tct.ma']
    );
    await db.query(
      'UPDATE users SET mot_de_passe=$1 WHERE email=$2',
      [hash_chauffeur1, 'chauffeur1@tct.ma']
    );
    await db.query(
      'UPDATE users SET mot_de_passe=$1 WHERE email=$2',
      [hash_chauffeur2, 'chauffeur2@tct.ma']
    );

    res.json({ 
      message: 'Mots de passe initialisés !',
      comptes: [
        { email: 'abdelaali@tct.ma',  mdp: 'tct2024' },
        { email: 'chauffeur1@tct.ma', mdp: 'chauffeur1' },
        { email: 'chauffeur2@tct.ma', mdp: 'chauffeur2' }
      ]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;

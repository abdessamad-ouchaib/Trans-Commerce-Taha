const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../db');

// GET historique conversation entre deux utilisateurs
router.get('/', auth, async (req, res) => {
  try {
    const { avec_id, avec_type, limit = 100 } = req.query;
    const moi_id   = req.user.id;
    const moi_type = req.user.role || 'responsable';

    let rows;
    if (avec_id && avec_type) {
      // Conversation entre moi et une autre personne
      ({ rows } = await db.query(`
        SELECT * FROM messages
        WHERE
          (expediteur_id=$1 AND expediteur_type=$2
           AND destinataire_id=$3 AND destinataire_type=$4)
          OR
          (expediteur_id=$3 AND expediteur_type=$4
           AND destinataire_id=$1 AND destinataire_type=$2)
        ORDER BY created_at ASC
        LIMIT $5
      `, [moi_id, moi_type, avec_id, avec_type, limit]));

      // Marquer comme lus
      await db.query(`
        UPDATE messages SET lu=TRUE
        WHERE destinataire_id=$1 AND destinataire_type=$2
          AND expediteur_id=$3 AND expediteur_type=$4
          AND lu=FALSE
      `, [moi_id, moi_type, avec_id, avec_type]);
    } else {
      // Tous mes messages récents
      ({ rows } = await db.query(`
        SELECT * FROM messages
        WHERE (expediteur_id=$1 AND expediteur_type=$2)
           OR (destinataire_id=$1 AND destinataire_type=$2)
        ORDER BY created_at DESC
        LIMIT $3
      `, [moi_id, moi_type, limit]));
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET nombre de messages non lus
router.get('/non-lus', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS total FROM messages
       WHERE destinataire_id=$1 AND destinataire_type=$2 AND lu=FALSE`,
      [req.user.id, req.user.role || 'responsable']
    );
    res.json({ total: parseInt(rows[0].total) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST envoyer un message (REST fallback)
router.post('/', auth, async (req, res) => {
  try {
    const { destinataire_id, destinataire_type, contenu } = req.body;
    if (!contenu?.trim())
      return res.status(400).json({ message: 'Message vide.' });

    const exp_nom = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim();
    const exp_type = req.user.role || 'responsable';

    const { rows } = await db.query(`
      INSERT INTO messages
        (expediteur_id, expediteur_type, expediteur_nom,
         destinataire_id, destinataire_type, contenu)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [
      req.user.id, exp_type, exp_nom,
      destinataire_id || null,
      destinataire_type || null,
      contenu.trim()
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

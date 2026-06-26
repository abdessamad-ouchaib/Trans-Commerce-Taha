const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET conversation history between two users
// ?avec_id=X&avec_type=employe|responsable
router.get('/', auth, async (req, res) => {
  try {
    const { avec_id, avec_type, limit = 50 } = req.query;
    const moi_id = req.user.id;
    const moi_type = req.user.role || 'responsable';

    let rows;
    if (avec_id) {
      // Get conversation between two specific users
      ({ rows } = await db.query(`
        SELECT * FROM messages
        WHERE
          (expediteur_id=$1 AND expediteur_type=$2 AND destinataire_id=$3 AND destinataire_type=$4)
          OR
          (expediteur_id=$3 AND expediteur_type=$4 AND destinataire_id=$1 AND destinataire_type=$2)
        ORDER BY created_at ASC
        LIMIT $5
      `, [moi_id, moi_type, avec_id, avec_type, limit]));

      // Mark as read
      await db.query(`
        UPDATE messages SET lu=TRUE
        WHERE destinataire_id=$1 AND destinataire_type=$2
          AND expediteur_id=$3 AND expediteur_type=$4 AND lu=FALSE
      `, [moi_id, moi_type, avec_id, avec_type]);
    } else {
      // Get all recent messages involving this user
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

// GET list of conversations (contacts + last message + unread count)
router.get('/conversations', auth, async (req, res) => {
  try {
    const moi_id = req.user.id;
    const moi_type = req.user.role || 'responsable';

    const { rows } = await db.query(`
      WITH derniers AS (
        SELECT DISTINCT ON (
          LEAST(expediteur_id::text||expediteur_type, destinataire_id::text||COALESCE(destinataire_type,'')),
          GREATEST(expediteur_id::text||expediteur_type, destinataire_id::text||COALESCE(destinataire_type,''))
        )
          *,
          CASE
            WHEN expediteur_id=$1 AND expediteur_type=$2 THEN destinataire_id
            ELSE expediteur_id
          END AS contact_id,
          CASE
            WHEN expediteur_id=$1 AND expediteur_type=$2 THEN destinataire_type
            ELSE expediteur_type
          END AS contact_type,
          CASE
            WHEN expediteur_id=$1 AND expediteur_type=$2 THEN ''
            ELSE expediteur_nom
          END AS contact_nom_raw
        FROM messages
        WHERE (expediteur_id=$1 AND expediteur_type=$2)
           OR (destinataire_id=$1 AND destinataire_type=$2)
        ORDER BY
          LEAST(expediteur_id::text||expediteur_type, destinataire_id::text||COALESCE(destinataire_type,'')),
          GREATEST(expediteur_id::text||expediteur_type, destinataire_id::text||COALESCE(destinataire_type,'')),
          created_at DESC
      )
      SELECT
        d.*,
        (SELECT COUNT(*) FROM messages m2
         WHERE m2.destinataire_id=$1 AND m2.destinataire_type=$2
           AND m2.expediteur_id=d.contact_id AND m2.lu=FALSE) AS non_lus
      FROM derniers d
      ORDER BY d.created_at DESC
    `, [moi_id, moi_type]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET unread count
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

// POST send message (REST fallback if socket not available)
router.post('/', auth, async (req, res) => {
  try {
    const { destinataire_id, destinataire_type, contenu } = req.body;
    if (!contenu?.trim()) return res.status(400).json({ message: 'Message vide.' });
    const exp_nom = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim();
    const { rows } = await db.query(`
      INSERT INTO messages (expediteur_id, expediteur_type, expediteur_nom, destinataire_id, destinataire_type, contenu)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [req.user.id, req.user.role || 'responsable', exp_nom,
        destinataire_id || null, destinataire_type || null, contenu.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

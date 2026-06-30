require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const db         = require('./db');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/employes', require('./routes/employes'));
app.use('/api/produits', require('./routes/produits'));
app.use('/api/clients',  require('./routes/clients'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/messages', require('./routes/messages'));

app.get('/', (req, res) =>
  res.json({ message: '🚛 Trans Commerce TAHA API v2' })
);

// ── Keep-alive pour Render Free (évite la mise en veille) ────────────────────
setInterval(() => {
  console.log('💓 Keep-alive ping:', new Date().toISOString());
}, 10 * 60 * 1000); // toutes les 10 minutes

// ─── Socket.io ────────────────────────────────────────────────────────────────
// Map: userId_role → Set de socket.id (un user peut avoir plusieurs onglets)
const connected = new Map(); // "userId_role" → Set([socketId1, socketId2])

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Non authentifié'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'tct_secret_2024');
    next();
  } catch {
    next(new Error('Token invalide'));
  }
});

io.on('connection', (socket) => {
  const { id, role, nom, prenom } = socket.user;
  const userRole = role || 'chauffeur';
  const myKey    = `${id}_${userRole}`;

  // Ajouter ce socket à la map (supporte plusieurs onglets)
  if (!connected.has(myKey)) connected.set(myKey, new Set());
  connected.get(myKey).add(socket.id);

  console.log(`✅ [${new Date().toLocaleTimeString()}] Connecté: ${prenom} ${nom} (${userRole}) | key=${myKey} | socket=${socket.id}`);

  // Diffuser liste en ligne
  io.emit('users_online', Array.from(connected.keys()));

  // ── Envoyer un message ──────────────────────────────────────────────────
  socket.on('envoyer_message', async (data) => {
    const { destinataire_id, destinataire_type, contenu } = data;
    if (!contenu?.trim()) return;

    const exp_nom = `${prenom || ''} ${nom || ''}`.trim();

    try {
      // Sauvegarder en DB
      const { rows } = await db.query(`
        INSERT INTO messages
          (expediteur_id, expediteur_type, expediteur_nom,
           destinataire_id, destinataire_type, contenu)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [
        id, userRole, exp_nom,
        destinataire_id || null,
        destinataire_type || null,
        contenu.trim()
      ]);

      const msg = rows[0];
      console.log(`📨 [${new Date().toLocaleTimeString()}] ${myKey} → ${destinataire_id}_${destinataire_type}: "${contenu.slice(0,30)}"`);

      // 1. Confirmer à l'expéditeur
      socket.emit('nouveau_message', msg);

      // 2. Envoyer à TOUS les sockets du destinataire
      if (destinataire_id && destinataire_type) {
        const destKey     = `${destinataire_id}_${destinataire_type}`;
        const destSockets = connected.get(destKey);

        if (destSockets && destSockets.size > 0) {
          destSockets.forEach(socketId => {
            io.to(socketId).emit('nouveau_message', msg);
          });
          console.log(`   ✅ Livré à ${destKey} (${destSockets.size} socket(s))`);
        } else {
          console.log(`   💾 ${destKey} hors ligne — message en DB`);
        }
      }

    } catch (err) {
      console.error('❌ Erreur message:', err.message);
      socket.emit('erreur', { message: 'Erreur envoi message.' });
    }
  });

  // ── Typing ────────────────────────────────────────────────────────────────
  socket.on('en_train_decrire', ({ destinataire_id, destinataire_type }) => {
    const destKey     = `${destinataire_id}_${destinataire_type}`;
    const destSockets = connected.get(destKey);
    if (destSockets) {
      destSockets.forEach(sid => {
        io.to(sid).emit('utilisateur_ecrit', { id, role: userRole, nom: `${prenom} ${nom}` });
      });
    }
  });

  socket.on('arret_decrire', ({ destinataire_id, destinataire_type }) => {
    const destKey     = `${destinataire_id}_${destinataire_type}`;
    const destSockets = connected.get(destKey);
    if (destSockets) {
      destSockets.forEach(sid => {
        io.to(sid).emit('arret_ecriture', { id, role: userRole });
      });
    }
  });

  // ── Déconnexion ───────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const sockets = connected.get(myKey);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) connected.delete(myKey);
    }
    io.emit('users_online', Array.from(connected.keys()));
    console.log(`❌ [${new Date().toLocaleTimeString()}] Déconnecté: ${prenom} ${nom} | reason=${reason}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`✅ Serveur démarré sur le port ${PORT}`)
);

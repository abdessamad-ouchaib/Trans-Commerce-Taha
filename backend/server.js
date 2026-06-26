require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const jwt       = require('jsonwebtoken');
const db        = require('./db');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// REST routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/employes', require('./routes/employes'));
app.use('/api/produits', require('./routes/produits'));
app.use('/api/clients',  require('./routes/clients'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/messages', require('./routes/messages'));

app.get('/', (req, res) => res.json({ message: '🚛 Trans Commerce TAHA API — PostgreSQL + WebSocket' }));

// ─── Socket.io — Chat en temps réel ─────────────────────────────────────────
// Map: userId_type → socket.id
const connected = new Map();

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
  const key = `${id}_${role}`;
  connected.set(key, socket.id);
  console.log(`✅ Connecté: ${prenom} ${nom} (${role}) — socket: ${socket.id}`);

  // Broadcast online users list
  io.emit('users_online', Array.from(connected.keys()));

  // ── Envoyer un message ──────────────────────────────────────────────────
  socket.on('envoyer_message', async (data) => {
    const { destinataire_id, destinataire_type, contenu } = data;
    if (!contenu?.trim()) return;

    const exp_nom = `${prenom || ''} ${nom || ''}`.trim();

    try {
      // Save to PostgreSQL
      const { rows } = await db.query(`
        INSERT INTO messages
          (expediteur_id, expediteur_type, expediteur_nom,
           destinataire_id, destinataire_type, contenu)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [id, role, exp_nom,
          destinataire_id || null, destinataire_type || null,
          contenu.trim()]);

      const msg = rows[0];

      // Send to sender (confirmation)
      socket.emit('nouveau_message', msg);

      // Send to recipient if online
      if (destinataire_id && destinataire_type) {
        const destKey = `${destinataire_id}_${destinataire_type}`;
        const destSocketId = connected.get(destKey);
        if (destSocketId) {
          io.to(destSocketId).emit('nouveau_message', msg);
        }
      } else {
        // Broadcast to everyone (group message)
        socket.broadcast.emit('nouveau_message', msg);
      }
    } catch (err) {
      console.error('Erreur message:', err.message);
      socket.emit('erreur', { message: 'Erreur envoi message.' });
    }
  });

  // ── Typing indicator ───────────────────────────────────────────────────
  socket.on('en_train_decrire', ({ destinataire_id, destinataire_type }) => {
    const destKey = `${destinataire_id}_${destinataire_type}`;
    const destSocketId = connected.get(destKey);
    if (destSocketId) {
      io.to(destSocketId).emit('utilisateur_ecrit', {
        id, role, nom: `${prenom} ${nom}`
      });
    }
  });

  socket.on('arret_decrire', ({ destinataire_id, destinataire_type }) => {
    const destKey = `${destinataire_id}_${destinataire_type}`;
    const destSocketId = connected.get(destKey);
    if (destSocketId) {
      io.to(destSocketId).emit('arret_ecriture', { id, role });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    connected.delete(key);
    io.emit('users_online', Array.from(connected.keys()));
    console.log(`❌ Déconnecté: ${prenom} ${nom}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Serveur + WebSocket démarré sur le port ${PORT}`));

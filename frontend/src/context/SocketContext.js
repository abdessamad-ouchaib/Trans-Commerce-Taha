import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import API from '../utils/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef  = useRef(null);
  const pollingRef = useRef(null);
  const knownIds   = useRef(new Set());

  const [connected,       setConnected]      = useState(false);
  const [usersOnline,     setUsersOnline]    = useState([]);
  const [messages,        setMessages]       = useState({});
  const [nonLus,          setNonLus]         = useState(0);
  const [typing,          setTyping]         = useState({});
  const [newMessageAlert, setNewMessageAlert]= useState(null);

  // ── Clé de conversation entre moi et une autre personne ────────────────
  // La clé est toujours : "plusPetitId_type__plusGrandId_type" pour être symétrique
  const buildConvKey = useCallback((idA, typeA, idB, typeB) => {
    const a = `${idA}_${typeA}`;
    const b = `${idB}_${typeB}`;
    return a < b ? `${a}__${b}` : `${b}__${a}`;
  }, []);

  // ── Ajouter un message sans doublon ────────────────────────────────────
  const addMessage = useCallback((msg) => {
    if (!user) return;
    if (knownIds.current.has(msg.id)) return; // doublon
    knownIds.current.add(msg.id);

    const moi_id   = String(user.id);
    const moi_type = user.role || 'responsable';

    // Clé symétrique : même clé des deux côtés
    const convKey = buildConvKey(
      msg.expediteur_id,   msg.expediteur_type,
      msg.destinataire_id, msg.destinataire_type
    );

    setMessages(prev => ({
      ...prev,
      [convKey]: [...(prev[convKey] || []), msg]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }));

    // Notification si c'est un message reçu (pas envoyé par moi)
    const isMine = String(msg.expediteur_id) === moi_id &&
                   msg.expediteur_type === moi_type;

    if (!isMine) {
      setNonLus(n => n + 1);
      setNewMessageAlert({
        from: msg.expediteur_nom,
        text: msg.contenu.slice(0, 60)
      });
      setTimeout(() => setNewMessageAlert(null), 4000);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`💬 ${msg.expediteur_nom}`, {
          body: msg.contenu.slice(0, 80),
          icon: '/favicon.ico'
        });
      }
    }
  }, [user, buildConvKey]);

  // ── Polling fallback toutes les 4 secondes ──────────────────────────────
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await API.get('/messages?limit=30');
        if (Array.isArray(data)) {
          data.forEach(msg => addMessage(msg));
        }
      } catch { /* silencieux */ }
    }, 4000);
  }, [addMessage]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ── Connexion Socket.io ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const token      = localStorage.getItem('tct_token');
    const SOCKET_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
      .replace('/api', '');

    socketRef.current = io(SOCKET_URL, {
      auth:                { token },
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   1500,
      timeout:             20000
    });

    const s = socketRef.current;

    s.on('connect', () => {
      setConnected(true);
      stopPolling();
      console.log('✅ Socket connecté:', s.id);
    });

    s.on('disconnect', (reason) => {
      setConnected(false);
      startPolling();
      console.log('⚠️ Socket déconnecté:', reason);
    });

    s.on('connect_error', (err) => {
      setConnected(false);
      startPolling();
    });

    s.on('users_online', (list) => setUsersOnline(list));

    s.on('nouveau_message', (msg) => {
      console.log('📩 Reçu socket:', msg.id, msg.expediteur_nom, '→', msg.destinataire_type);
      addMessage(msg);
    });

    s.on('utilisateur_ecrit', ({ id, role, nom }) => {
      const key = `${id}_${role}`;
      setTyping(prev => ({ ...prev, [key]: nom }));
      setTimeout(() => setTyping(prev => {
        const n = { ...prev }; delete n[key]; return n;
      }), 3000);
    });

    s.on('arret_ecriture', ({ id, role }) => {
      setTyping(prev => { const n = { ...prev }; delete n[`${id}_${role}`]; return n; });
    });

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Démarrer le polling immédiatement comme backup
    startPolling();

    return () => {
      s.disconnect();
      stopPolling();
    };
  }, [user]);

  // ── sendMessage ─────────────────────────────────────────────────────────
  const sendMessage = useCallback((destinataire_id, destinataire_type, contenu) => {
    if (!contenu?.trim()) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('envoyer_message', {
        destinataire_id,
        destinataire_type,
        contenu
      });
    } else {
      // Fallback REST
      API.post('/messages', { destinataire_id, destinataire_type, contenu })
        .then(({ data }) => addMessage(data))
        .catch(console.error);
    }
  }, [addMessage]);

  const emitTyping = (destinataire_id, destinataire_type) => {
    socketRef.current?.emit('en_train_decrire', { destinataire_id, destinataire_type });
  };

  const emitStopTyping = (destinataire_id, destinataire_type) => {
    socketRef.current?.emit('arret_decrire', { destinataire_id, destinataire_type });
  };

  // ── loadHistory : charger l'historique avec la même clé symétrique ──────
  const loadHistory = useCallback((msgs, _convKeyIgnored, contactId, contactType) => {
    if (!user) return;
    const moi_id   = user.id;
    const moi_type = user.role || 'responsable';
    const convKey  = buildConvKey(moi_id, moi_type, contactId, contactType);

    msgs.forEach(msg => knownIds.current.add(msg.id));

    setMessages(prev => ({
      ...prev,
      [convKey]: [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }));
  }, [user, buildConvKey]);

  // ── getConvKey : pour que Chat.js puisse obtenir la bonne clé ───────────
  const getConvKey = useCallback((contactId, contactType) => {
    if (!user) return null;
    return buildConvKey(user.id, user.role || 'responsable', contactId, contactType);
  }, [user, buildConvKey]);

  const clearNonLus = () => setNonLus(0);
  const isOnline    = (id, type) => usersOnline.includes(`${id}_${type}`);

  return (
    <SocketContext.Provider value={{
      connected, usersOnline, messages, nonLus, typing,
      newMessageAlert, sendMessage, emitTyping, emitStopTyping,
      loadHistory, clearNonLus, isOnline, getConvKey
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import API from '../utils/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef   = useRef(null);
  const pollingRef  = useRef(null);
  const lastMsgId   = useRef(0);

  const [connected,       setConnected]       = useState(false);
  const [usersOnline,     setUsersOnline]      = useState([]);
  const [messages,        setMessages]         = useState({});
  const [nonLus,          setNonLus]           = useState(0);
  const [typing,          setTyping]           = useState({});
  const [newMessageAlert, setNewMessageAlert]  = useState(null);

  const moi_id   = user?.id;
  const moi_type = user?.role || 'responsable';
  const moi_key  = `${moi_id}_${moi_type}`;

  // ── Ajouter un message à l'état ────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    const expKey  = `${msg.expediteur_id}_${msg.expediteur_type}`;
    const destKey = `${msg.destinataire_id}_${msg.destinataire_type}`;
    const convKey = expKey === moi_key ? destKey : expKey;

    setMessages(prev => {
      const existing = prev[convKey] || [];
      // Éviter les doublons
      if (existing.find(m => m.id === msg.id)) return prev;
      return { ...prev, [convKey]: [...existing, msg] };
    });

    // Notification si reçu (pas envoyé par moi)
    if (expKey !== moi_key) {
      setNonLus(n => n + 1);
      setNewMessageAlert({ from: msg.expediteur_nom, text: msg.contenu.slice(0, 60) });
      setTimeout(() => setNewMessageAlert(null), 4000);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`💬 ${msg.expediteur_nom}`, {
          body: msg.contenu.slice(0, 80),
          icon: '/favicon.ico'
        });
      }
    }

    // Mettre à jour le dernier ID connu
    if (msg.id > lastMsgId.current) lastMsgId.current = msg.id;
  }, [moi_key]);

  // ── Polling fallback (vérifie les nouveaux messages toutes les 5s) ──────
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // déjà démarré
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await API.get(
          `/messages?limit=20`
        );
        if (Array.isArray(data)) {
          data.forEach(msg => {
            if (msg.id > lastMsgId.current) {
              addMessage(msg);
            }
          });
        }
      } catch (err) {
        // silencieux
      }
    }, 5000);
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
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   2000,
      timeout:             20000
    });

    const s = socketRef.current;

    s.on('connect', () => {
      console.log('✅ Socket connecté');
      setConnected(true);
      stopPolling(); // WebSocket actif, arrêter le polling
    });

    s.on('disconnect', (reason) => {
      console.log('⚠️ Socket déconnecté:', reason);
      setConnected(false);
      startPolling(); // Fallback polling
    });

    s.on('connect_error', (err) => {
      console.log('❌ Erreur socket:', err.message);
      setConnected(false);
      startPolling(); // Fallback polling
    });

    s.on('users_online', (list) => setUsersOnline(list));

    s.on('nouveau_message', (msg) => {
      console.log('📩 Message reçu par socket:', msg.id, msg.contenu?.slice(0, 20));
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

    // Demander permission notifications
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      s.disconnect();
      stopPolling();
    };
  }, [user, addMessage, startPolling, stopPolling]);

  const sendMessage = (destinataire_id, destinataire_type, contenu) => {
    if (!contenu?.trim()) return;

    if (socketRef.current?.connected) {
      // Envoi via WebSocket
      socketRef.current.emit('envoyer_message', {
        destinataire_id,
        destinataire_type,
        contenu
      });
    } else {
      // Fallback : envoi via REST API
      API.post('/messages', { destinataire_id, destinataire_type, contenu })
        .then(({ data }) => addMessage(data))
        .catch(console.error);
    }
  };

  const emitTyping = (destinataire_id, destinataire_type) => {
    socketRef.current?.emit('en_train_decrire', { destinataire_id, destinataire_type });
  };

  const emitStopTyping = (destinataire_id, destinataire_type) => {
    socketRef.current?.emit('arret_decrire', { destinataire_id, destinataire_type });
  };

  const loadHistory = (msgs, convKey) => {
    setMessages(prev => ({ ...prev, [convKey]: msgs }));
    if (msgs.length > 0) {
      const maxId = Math.max(...msgs.map(m => m.id));
      if (maxId > lastMsgId.current) lastMsgId.current = maxId;
    }
  };

  const clearNonLus = () => setNonLus(0);
  const isOnline    = (id, type) => usersOnline.includes(`${id}_${type}`);

  return (
    <SocketContext.Provider value={{
      connected, usersOnline, messages, nonLus, typing,
      newMessageAlert, sendMessage, emitTyping, emitStopTyping,
      loadHistory, clearNonLus, isOnline
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

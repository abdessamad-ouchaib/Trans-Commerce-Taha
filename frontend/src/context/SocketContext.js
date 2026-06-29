import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [usersOnline, setUsersOnline] = useState([]);
  const [messages, setMessages] = useState({});
  const [nonLus, setNonLus] = useState(0);
  const [typing, setTyping] = useState({});
  const [newMessageAlert, setNewMessageAlert] = useState(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('tct_token');
    const SOCKET_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
      .replace('/api', '');

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const s = socketRef.current;

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('users_online', (list) => setUsersOnline(list));

    s.on('nouveau_message', (msg) => {
      const moi_id   = String(user.id);
      const moi_type = user.role || 'responsable';
      const expKey   = `${msg.expediteur_id}_${msg.expediteur_type}`;
      const destKey  = `${msg.destinataire_id}_${msg.destinataire_type}`;
      const moi_key  = `${moi_id}_${moi_type}`;
      const convKey  = expKey === moi_key ? destKey : expKey;

      setMessages(prev => ({
        ...prev,
        [convKey]: [...(prev[convKey] || []), msg]
      }));

      // Si le message vient de quelqu'un d'autre → notification
      if (expKey !== moi_key) {
        setNonLus(n => n + 1);
        setNewMessageAlert({
          from: msg.expediteur_nom,
          text: msg.contenu.slice(0, 60)
        });
        // Effacer l'alerte après 4 secondes
        setTimeout(() => setNewMessageAlert(null), 4000);

        // Notification navigateur si permission accordée
        if (Notification.permission === 'granted') {
          new Notification(`💬 ${msg.expediteur_nom}`, {
            body: msg.contenu.slice(0, 80),
            icon: '/favicon.ico'
          });
        }
      }
    });

    s.on('utilisateur_ecrit', ({ id, role, nom }) => {
      const key = `${id}_${role}`;
      setTyping(prev => ({ ...prev, [key]: nom }));
      setTimeout(() => setTyping(prev => {
        const n = { ...prev }; delete n[key]; return n;
      }), 3000);
    });

    s.on('arret_ecriture', ({ id, role }) => {
      const key = `${id}_${role}`;
      setTyping(prev => { const n = { ...prev }; delete n[key]; return n; });
    });

    // Demander permission notifications navigateur
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { s.disconnect(); };
  }, [user]);

  const sendMessage = (destinataire_id, destinataire_type, contenu) => {
    if (!socketRef.current || !contenu.trim()) return;
    socketRef.current.emit('envoyer_message', {
      destinataire_id,
      destinataire_type,
      contenu
    });
  };

  const emitTyping = (destinataire_id, destinataire_type) => {
    socketRef.current?.emit('en_train_decrire', { destinataire_id, destinataire_type });
  };

  const emitStopTyping = (destinataire_id, destinataire_type) => {
    socketRef.current?.emit('arret_decrire', { destinataire_id, destinataire_type });
  };

  const loadHistory = (msgs, convKey) => {
    setMessages(prev => ({ ...prev, [convKey]: msgs }));
  };

  const clearNonLus = () => setNonLus(0);
  const isOnline = (id, type) => usersOnline.includes(`${id}_${type}`);

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

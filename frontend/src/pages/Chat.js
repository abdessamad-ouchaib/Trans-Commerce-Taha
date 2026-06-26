import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../utils/api';
import './Chat.css';

export default function Chat() {
  const { user } = useAuth();
  const { messages, sendMessage, emitTyping, emitStopTyping,
          loadHistory, clearNonLus, isOnline, typing } = useSocket();
  const { contactId, contactType } = useParams();
  const navigate = useNavigate();

  const [employes, setEmployes] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);

  const moi_id   = user?.id;
  const moi_type = user?.role || 'responsable';
  const moi_nom  = `${user?.prenom || ''} ${user?.nom || ''}`.trim();

  // Conv key for current contact
  const convKey = selectedContact
    ? `${selectedContact.id}_${selectedContact.type}`
    : null;

  const currentMessages = convKey ? (messages[convKey] || []) : [];

  // Load contacts (employes)
  useEffect(() => {
    API.get('/employes').then(({ data }) => {
      // Build contact list — exclude self if employee
      const contacts = data.map(e => ({
        id: e.id,
        type: e.role || 'chauffeur',
        nom: `${e.prenom} ${e.nom}`,
        role: e.role,
        matricule: e.matricule_camion
      }));

      // Add "Responsable" as contact if current user is not responsable
      if (moi_type !== 'responsable') {
        contacts.unshift({
          id: 1, // responsable always id=1 from seed
          type: 'responsable',
          nom: 'Abdelaali Ouchaib',
          role: 'responsable',
          matricule: null
        });
      }

      setEmployes(contacts);

      // Auto-select from URL param
      if (contactId && contactType) {
        const found = contacts.find(c => String(c.id) === contactId && c.type === contactType);
        if (found) setSelectedContact(found);
      }
    });
  }, [contactId, contactType, moi_type]);

  // Load message history when contact changes
  useEffect(() => {
    if (!selectedContact) return;
    setLoadingHistory(true);
    clearNonLus();
    API.get(`/messages?avec_id=${selectedContact.id}&avec_type=${selectedContact.type}&limit=100`)
      .then(({ data }) => {
        loadHistory(data, convKey);
      })
      .finally(() => setLoadingHistory(false));
  }, [selectedContact]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Handle send
  const handleSend = () => {
    if (!input.trim() || !selectedContact) return;
    sendMessage(selectedContact.id, selectedContact.type, input.trim());
    setInput('');
    emitStopTyping(selectedContact.id, selectedContact.type);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!selectedContact) return;
    emitTyping(selectedContact.id, selectedContact.type);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emitStopTyping(selectedContact.id, selectedContact.type);
    }, 2000);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' });
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  for (const msg of currentMessages) {
    const dateLabel = formatDate(msg.created_at);
    if (dateLabel !== lastDate) {
      grouped.push({ type: 'date', label: dateLabel });
      lastDate = dateLabel;
    }
    grouped.push({ type: 'msg', msg });
  }

  const isTyping = selectedContact && typing[convKey];

  const roleIcon = (r) => ({ chauffeur: '🚛', responsable: '👔', autre: '👤' }[r] || '👤');

  return (
    <div className={`chat-page ${selectedContact ? "contact-open" : ""}`}>
      {/* LEFT — Contacts */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2 className="chat-title">💬 Messages</h2>
        </div>

        <div className="contacts-list">
          {employes.length === 0 && (
            <div className="contacts-empty">
              <p>Aucun employé.</p>
              <button className="btn-primary btn-sm" onClick={() => navigate('/employes')}>
                Ajouter un employé
              </button>
            </div>
          )}
          {employes.map(contact => {
            const key = `${contact.id}_${contact.type}`;
            const online = isOnline(contact.id, contact.type);
            const unreadMsgs = (messages[key] || []).filter(
              m => m.expediteur_id !== moi_id && !m.lu
            ).length;
            const lastMsg = (messages[key] || []).slice(-1)[0];
            const isSelected = selectedContact?.id === contact.id && selectedContact?.type === contact.type;

            return (
              <button
                key={key}
                className={`contact-item ${isSelected ? 'contact-selected' : ''}`}
                onClick={() => {
                  setSelectedContact(contact);
                  navigate(`/chat/${contact.id}/${contact.type}`);
                }}
              >
                <div className="contact-avatar-wrap">
                  <div className="contact-avatar">
                    {contact.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`online-dot ${online ? 'dot-on' : 'dot-off'}`} />
                </div>
                <div className="contact-info">
                  <div className="contact-row">
                    <span className="contact-nom">
                      {roleIcon(contact.role)} {contact.nom}
                    </span>
                    {lastMsg && (
                      <span className="contact-time">{formatTime(lastMsg.created_at)}</span>
                    )}
                  </div>
                  <div className="contact-row">
                    <span className="contact-preview">
                      {lastMsg
                        ? (lastMsg.expediteur_id === moi_id ? 'Vous: ' : '') + lastMsg.contenu.slice(0, 35) + (lastMsg.contenu.length > 35 ? '...' : '')
                        : contact.matricule ? `🚛 ${contact.matricule}` : online ? 'En ligne' : 'Hors ligne'
                      }
                    </span>
                    {unreadMsgs > 0 && (
                      <span className="unread-badge">{unreadMsgs}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Conversation */}
      <div className="chat-main">
        {!selectedContact ? (
          <div className="chat-placeholder">
            <div className="placeholder-icon">💬</div>
            <h3>Sélectionnez un contact</h3>
            <p>Choisissez un employé ou chauffeur pour commencer à discuter</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button className="btn-back-mobile" onClick={() => setSelectedContact(null)}>←</button>
              <div className="chat-contact-avatar">
                {selectedContact.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="chat-contact-info">
                <span className="chat-contact-nom">
                  {roleIcon(selectedContact.role)} {selectedContact.nom}
                </span>
                <span className={`chat-contact-status ${isOnline(selectedContact.id, selectedContact.type) ? 'status-on' : 'status-off'}`}>
                  {isOnline(selectedContact.id, selectedContact.type) ? '● En ligne' : '○ Hors ligne'}
                  {selectedContact.matricule && ` · 🚛 ${selectedContact.matricule}`}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {loadingHistory && (
                <div className="loading-msgs">Chargement des messages...</div>
              )}

              {grouped.map((item, i) => {
                if (item.type === 'date') {
                  return (
                    <div key={`d-${i}`} className="date-separator">
                      <span>{item.label}</span>
                    </div>
                  );
                }

                const msg = item.msg;
                const isMine = String(msg.expediteur_id) === String(moi_id) &&
                               msg.expediteur_type === moi_type;

                return (
                  <div key={msg.id} className={`message-wrap ${isMine ? 'msg-mine' : 'msg-theirs'}`}>
                    {!isMine && (
                      <div className="msg-sender-avatar">
                        {msg.expediteur_nom.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div className={`message-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                      {!isMine && (
                        <span className="bubble-sender">{msg.expediteur_nom}</span>
                      )}
                      <p className="bubble-text">{msg.contenu}</p>
                      <span className="bubble-time">
                        {formatTime(msg.created_at)}
                        {isMine && <span className="msg-lu">{msg.lu ? ' ✓✓' : ' ✓'}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="message-wrap msg-theirs">
                  <div className="msg-sender-avatar">
                    {selectedContact.nom.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="message-bubble bubble-theirs typing-bubble">
                    <span className="typing-dots">
                      <span /><span /><span />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message à ${selectedContact.nom}...`}
                rows={1}
              />
              <button
                className={`btn-send ${input.trim() ? 'btn-send-active' : ''}`}
                onClick={handleSend}
                disabled={!input.trim()}
              >
                ➤
              </button>
            </div>
            <p className="input-hint">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
          </>
        )}
      </div>
    </div>
  );
}

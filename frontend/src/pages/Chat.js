import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../utils/api';
import './Chat.css';

export default function Chat() {
  const { user } = useAuth();
  const {
    messages, sendMessage, emitTyping, emitStopTyping,
    loadHistory, clearNonLus, isOnline, typing
  } = useSocket();
  const { contactId, contactType } = useParams();
  const navigate = useNavigate();

  const [contacts,          setContacts]          = useState([]);
  const [selectedContact,   setSelectedContact]   = useState(null);
  const [input,             setInput]             = useState('');
  const [loadingHistory,    setLoadingHistory]    = useState(false);
  const [showFactureModal,  setShowFactureModal]  = useState(false);
  const [factures,          setFactures]          = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);

  const moi_id        = user?.id;
  const moi_type      = user?.role || 'responsable';
  const isResponsable = moi_type === 'responsable';

  const convKey = selectedContact
    ? `${selectedContact.id}_${selectedContact.type}`
    : null;

  const currentMessages = convKey ? (messages[convKey] || []) : [];

  // ── Charger les contacts ──────────────────────────────────────────────────
  useEffect(() => {
    const loadContacts = async () => {
      try {
        if (isResponsable) {
          // Responsable → tous les employés
          const { data } = await API.get('/employes');
          const list = data.map(e => ({
            id:       e.id,
            type:     e.role || 'chauffeur',
            nom:      `${e.prenom} ${e.nom}`,
            role:     e.role,
            matricule: e.matricule_camion
          }));
          setContacts(list);

          // Auto-sélection depuis l'URL
          if (contactId && contactType) {
            const found = data.find(e => String(e.id) === String(contactId));
            if (found) {
              setSelectedContact({
                id:       found.id,
                type:     found.role || 'chauffeur',
                nom:      `${found.prenom} ${found.nom}`,
                role:     found.role,
                matricule: found.matricule_camion
              });
            }
          }
        } else {
          // Chauffeur → récupérer le vrai ID du responsable depuis l'API
          try {
            const { data: resp } = await API.get('/auth/responsable-info');
            const contact = {
              id:       resp.id,
              type:     'responsable',
              nom:      `${resp.prenom} ${resp.nom}`,
              role:     'responsable',
              matricule: null
            };
            setContacts([contact]);
            setSelectedContact(contact);
          } catch {
            // Fallback si l'endpoint échoue
            const contact = {
              id:   1,
              type: 'responsable',
              nom:  'Abdelaali Ouchaib',
              role: 'responsable',
              matricule: null
            };
            setContacts([contact]);
            setSelectedContact(contact);
          }
        }
      } catch (err) {
        console.error('Erreur chargement contacts:', err);
      }
    };

    loadContacts();
  }, [isResponsable, contactId, contactType]);

  // ── Charger les factures (responsable uniquement) ─────────────────────────
  useEffect(() => {
    if (isResponsable) {
      API.get('/factures?limit=50')
        .then(({ data }) => setFactures(data.factures || []))
        .catch(console.error);
    }
  }, [isResponsable]);

  // ── Charger l'historique quand le contact change ───────────────────────────
  useEffect(() => {
    if (!selectedContact || !convKey) return;
    setLoadingHistory(true);
    clearNonLus();
    API.get(
      `/messages?avec_id=${selectedContact.id}&avec_type=${selectedContact.type}&limit=100`
    )
      .then(({ data }) => loadHistory(data, convKey))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [selectedContact]);

  // ── Auto-scroll vers le bas ───────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // ── Envoyer un message ────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || !selectedContact) return;
    sendMessage(selectedContact.id, selectedContact.type, input.trim());
    setInput('');
    if (selectedContact) emitStopTyping(selectedContact.id, selectedContact.type);
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

  // ── Envoyer une facture dans le chat ──────────────────────────────────────
  const handleSendFacture = (facture) => {
    if (!selectedContact) return;
    const lignesText = (facture.lignes || [])
      .map(l => `  • ${l.nom_produit} x${l.quantite_sacs} sacs`)
      .join('\n');

    const msg =
      `📄 *Facture ${facture.numero_facture}*\n` +
      `👥 Client: ${facture.nom_client} — ${facture.ville_client}\n` +
      `📦 Produits:\n${lignesText || '  —'}\n` +
      `💰 Montant: ${Number(facture.montant_total || 0).toLocaleString('fr-MA')} MAD\n` +
      `🚛 Matricule: ${facture.matricule_camion || '—'}\n` +
      `💳 Paiement: ${facture.mode_paiement}\n` +
      `📅 Date livraison: ${facture.date_facture
        ? new Date(facture.date_facture).toLocaleDateString('fr-MA')
        : '—'}\n` +
      `🔗 Voir: ${window.location.origin}/factures/${facture.id}`;

    sendMessage(selectedContact.id, selectedContact.type, msg);
    setShowFactureModal(false);
  };

  // ── Sélectionner un contact ───────────────────────────────────────────────
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    const base = isResponsable ? '/chat' : '/chauffeur/messages';
    navigate(`${base}/${contact.id}/${contact.type}`);
  };

  // ── Formatage ─────────────────────────────────────────────────────────────
  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (ts) => {
    const d         = new Date(ts);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' });
  };

  // Grouper les messages par date
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

  const isTypingNow  = selectedContact && typing[convKey];
  const roleIcon     = (r) => ({ chauffeur: '🚛', responsable: '👔', autre: '👤' }[r] || '👤');

  return (
    <div className={`chat-page ${selectedContact ? 'contact-open' : ''}`}>

      {/* ── Modal Envoyer Facture ────────────────────────────────────────── */}
      {showFactureModal && (
        <div className="modal-overlay" onClick={() => setShowFactureModal(false)}>
          <div className="modal-card modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">📄 Envoyer une facture à {selectedContact?.nom}</h2>
              <button className="btn-delete" onClick={() => setShowFactureModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {factures.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
                  Aucune facture disponible.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {factures.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleSendFacture(f)}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', padding: '12px 14px',
                        border: '1px solid #e2e8f0', borderRadius: 8,
                        background: 'white', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div>
                        <strong style={{ color: '#1a3a5c', fontSize: 14 }}>
                          {f.numero_facture}
                        </strong>
                        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                          {f.nom_client} — {f.ville_client}
                        </p>
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                          🚛 {f.nom_chauffeur || '—'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <strong style={{ fontSize: 14 }}>
                          {Number(f.montant_total).toLocaleString('fr-MA')} MAD
                        </strong>
                        <p style={{ marginTop: 4 }}>
                          <span className={`badge ${f.statut === 'Payée' ? 'badge-green' : 'badge-orange'}`}>
                            {f.statut}
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT — Liste des contacts ────────────────────────────────────── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2 className="chat-title">💬 Messages</h2>
        </div>
        <div className="contacts-list">
          {contacts.length === 0 && (
            <div className="contacts-empty">
              <p>Aucun contact disponible.</p>
            </div>
          )}
          {contacts.map(contact => {
            const key        = `${contact.id}_${contact.type}`;
            const online     = isOnline(contact.id, contact.type);
            const convMsgs   = messages[key] || [];
            const unreadMsgs = convMsgs.filter(
              m => String(m.expediteur_id) !== String(moi_id) && !m.lu
            ).length;
            const lastMsg    = convMsgs.slice(-1)[0];
            const isSelected = selectedContact?.id === contact.id &&
                               selectedContact?.type === contact.type;

            return (
              <button
                key={key}
                className={`contact-item ${isSelected ? 'contact-selected' : ''}`}
                onClick={() => handleSelectContact(contact)}
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
                        ? (String(lastMsg.expediteur_id) === String(moi_id)
                            ? 'Vous: '
                            : '') +
                          lastMsg.contenu.slice(0, 35) +
                          (lastMsg.contenu.length > 35 ? '...' : '')
                        : contact.matricule
                          ? `🚛 ${contact.matricule}`
                          : online ? 'En ligne' : 'Hors ligne'}
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

      {/* ── RIGHT — Conversation ────────────────────────────────────────── */}
      <div className="chat-main">
        {!selectedContact ? (
          <div className="chat-placeholder">
            <div className="placeholder-icon">💬</div>
            <h3>Sélectionnez un contact</h3>
            <p>Choisissez un employé pour commencer à discuter</p>
          </div>
        ) : (
          <>
            {/* Header conversation */}
            <div className="chat-header">
              <button
                className="btn-back-mobile"
                onClick={() => setSelectedContact(null)}
              >←</button>

              <div className="chat-contact-avatar">
                {selectedContact.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>

              <div className="chat-contact-info" style={{ flex: 1 }}>
                <span className="chat-contact-nom">
                  {roleIcon(selectedContact.role)} {selectedContact.nom}
                </span>
                <span className={`chat-contact-status ${
                  isOnline(selectedContact.id, selectedContact.type)
                    ? 'status-on' : 'status-off'
                }`}>
                  {isOnline(selectedContact.id, selectedContact.type)
                    ? '● En ligne'
                    : '○ Hors ligne'}
                  {selectedContact.matricule && ` · 🚛 ${selectedContact.matricule}`}
                </span>
              </div>

              {/* Bouton envoyer facture — responsable uniquement */}
              {isResponsable && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setShowFactureModal(true)}
                  style={{ flexShrink: 0 }}
                >
                  📄 Envoyer facture
                </button>
              )}
            </div>

            {/* Zone des messages */}
            <div className="messages-area">
              {loadingHistory && (
                <div className="loading-msgs">Chargement des messages...</div>
              )}

              {grouped.length === 0 && !loadingHistory && (
                <div style={{
                  textAlign: 'center', color: '#94a3b8',
                  padding: '40px 20px', fontSize: 14
                }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>💬</p>
                  <p>Démarrez la conversation</p>
                </div>
              )}

              {grouped.map((item, i) => {
                if (item.type === 'date') {
                  return (
                    <div key={`d-${i}`} className="date-separator">
                      <span>{item.label}</span>
                    </div>
                  );
                }

                const msg    = item.msg;
                const isMine = String(msg.expediteur_id) === String(moi_id) &&
                               msg.expediteur_type === moi_type;

                return (
                  <div
                    key={msg.id}
                    className={`message-wrap ${isMine ? 'msg-mine' : 'msg-theirs'}`}
                  >
                    {!isMine && (
                      <div className="msg-sender-avatar">
                        {msg.expediteur_nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className={`message-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                      {!isMine && (
                        <span className="bubble-sender">{msg.expediteur_nom}</span>
                      )}
                      <p className="bubble-text" style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.contenu}
                      </p>
                      <span className="bubble-time">
                        {formatTime(msg.created_at)}
                        {isMine && (
                          <span className="msg-lu">{msg.lu ? ' ✓✓' : ' ✓'}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Indicateur "en train d'écrire" */}
              {isTypingNow && (
                <div className="message-wrap msg-theirs">
                  <div className="msg-sender-avatar">
                    {selectedContact.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
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

            {/* Zone de saisie */}
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
            <p className="input-hint">
              Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
            </p>
          </>
        )}
      </div>
    </div>
  );
}

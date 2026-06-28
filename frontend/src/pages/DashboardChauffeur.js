import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Dashboard.css';

export default function DashboardChauffeur() {
  const { user } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bonjour, {user?.prenom} 👋</h1>
          <p className="page-subtitle">Espace chauffeur · Trans Commerce TAHA</p>
        </div>
      </div>

      <div className="card" style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5082 100%)',
        color: 'white', border: 'none'
      }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: 64, height: 64, background: '#c9952a', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900, color: '#0f2240', flexShrink: 0
          }}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Cairo' }}>
              {user?.prenom} {user?.nom}
            </p>
            <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>🚛 Chauffeur · Trans Commerce TAHA</p>
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
              {connected
                ? <span style={{ color: '#2ecc71' }}>● En ligne</span>
                : <span style={{ color: '#95a5a6' }}>○ Hors ligne</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ border: '2px solid #fde68a', background: '#fffbeb' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
            Vos instructions viennent du responsable
          </h3>
          <p style={{ fontSize: 14, color: '#78350f', marginBottom: 20 }}>
            Abdelaali Ouchaib vous enverra vos commandes par message.
          </p>
          <button className="btn-gold" style={{ fontSize: 16, padding: '12px 32px' }}
            onClick={() => navigate('/chauffeur/messages')}>
            💬 Voir mes messages
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📞 Contact responsable</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, background: '#1a3a5c', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0
          }}>AO</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Abdelaali Ouchaib</p>
            <p style={{ fontSize: 13, color: '#64748b' }}>👔 Responsable · 06.61.31.69.57</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/chauffeur/messages')}>
            💬 Envoyer un message
          </button>
        </div>
      </div>
    </div>
  );
}

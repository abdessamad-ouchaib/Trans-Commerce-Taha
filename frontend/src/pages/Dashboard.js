import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentFactures, setRecentFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, facturesRes] = await Promise.all([
          API.get('/factures/stats'),
          API.get('/factures?limit=5')
        ]);
        setStats(statsRes.data);
        setRecentFactures(facturesRes.data.factures || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatMAD = (n) => `${Number(n || 0).toLocaleString('fr-MA')} MAD`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-MA');
  };

  if (loading) return <div className="loading-spinner">Chargement...</div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Trans Commerce TAHA · Témara · 06.61.31.69.57</p>
        </div>
        <button className="btn-gold" onClick={() => navigate('/factures/nouvelle')}>
          + Nouvelle facture
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-blue">📄</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.total_factures || 0}</span>
            <span className="stat-label">Total Factures</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-green">✅</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.payees || 0}</span>
            <span className="stat-label">Factures Payées</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-orange">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.en_attente || 0}</span>
            <span className="stat-label">En Attente</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-gold">💰</div>
          <div className="stat-info">
            <span className="stat-value stat-value-sm">{formatMAD(stats?.montant_attente)}</span>
            <span className="stat-label">Montant en Attente</span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="quick-actions card">
        <div className="card-header">
          <h2 className="card-title">Actions rapides</h2>
        </div>
        <div className="card-body quick-grid">
          {[
            { icon: '📄', label: 'Nouvelle facture',   to: '/factures/nouvelle', color: 'navy'  },
            { icon: '👥', label: 'Ajouter un client',  to: '/clients',           color: 'blue'  },
            { icon: '🌾', label: 'Gérer les produits', to: '/produits',          color: 'green' },
            { icon: '👤', label: 'Gérer les employés', to: '/employes',          color: 'gold'  },
          ].map(a => (
            <button
              key={a.to}
              className={`quick-btn quick-${a.color}`}
              onClick={() => navigate(a.to)}
            >
              <span className="quick-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Factures récentes */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Factures récentes</h2>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/factures')}>
            Voir toutes
          </button>
        </div>
        <div className="table-wrapper">
          {recentFactures.length === 0 ? (
            <div className="empty-state">
              <p>Aucune facture pour l'instant.</p>
              <button className="btn-primary" onClick={() => navigate('/factures/nouvelle')}>
                Créer la première facture
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Client</th>
                  <th>Ville</th>
                  <th>Chauffeur</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentFactures.map(f => (
                  <tr
                    key={f.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/factures/${f.id}`)}
                  >
                    <td>
                      <strong className="text-navy">
                        {f.numero_facture || '—'}
                      </strong>
                    </td>
                    <td>{f.nom_client    || '—'}</td>
                    <td>{f.ville_client  || '—'}</td>
                    <td>{f.nom_chauffeur || '—'}</td>
                    <td><strong>{formatMAD(f.montant_total)}</strong></td>
                    <td>
                      <span className={`badge ${f.statut === 'Payée' ? 'badge-green' : 'badge-orange'}`}>
                        {f.statut}
                      </span>
                    </td>
                    <td>{formatDate(f.date_facture)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

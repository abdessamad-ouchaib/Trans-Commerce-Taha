import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import './Dashboard.css';

export default function Factures() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchFactures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filtre) params.set('statut', filtre);
      const { data } = await API.get(`/factures?${params}`);
      setFactures(data.factures || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFactures(); }, [filtre]);

  const filtered = factures.filter(f =>
    !search ||
    (f.numero_facture  || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.nom_client      || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.ville_client    || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.nom_chauffeur   || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatMAD = (n) => `${Number(n || 0).toLocaleString('fr-MA')} MAD`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-MA');
  };

  const totalFiltre = filtered.reduce((s, f) => s + Number(f.montant_total || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Factures</h1>
          <p className="page-subtitle">
            {filtered.length} facture(s) · Total: {formatMAD(totalFiltre)}
          </p>
        </div>
        <button className="btn-gold" onClick={() => navigate('/factures/nouvelle')}>
          + Nouvelle facture
        </button>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher par numéro, client, ville, chauffeur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            className="form-control"
            value={filtre}
            onChange={e => setFiltre(e.target.value)}
            style={{ width: 'auto', minWidth: '180px' }}
          >
            <option value="">Toutes les factures</option>
            <option value="En attente">En attente</option>
            <option value="Payée">Payées</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: '40px' }}>📄</p>
              <p>Aucune facture trouvée.</p>
              <button className="btn-primary" onClick={() => navigate('/factures/nouvelle')}>
                Créer une facture
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Ville</th>
                  <th>Chauffeur</th>
                  <th>Camion</th>
                  <th>Montant</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() => navigate(`/factures/${f.id}`)}
                      >
                        <strong>{f.numero_facture || '—'}</strong>
                      </button>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(f.date_facture)}
                    </td>
                    <td>{f.nom_client || '—'}</td>
                    <td>{f.ville_client || '—'}</td>
                    <td>{f.nom_chauffeur || '—'}</td>
                    <td>
                      {f.matricule_camion
                        ? <code style={{ fontSize: '12px' }}>{f.matricule_camion}</code>
                        : '—'}
                    </td>
                    <td><strong>{formatMAD(f.montant_total)}</strong></td>
                    <td>
                      <span className={`badge ${f.mode_paiement === 'Chèque' ? 'badge-blue' : 'badge-green'}`}>
                        {f.mode_paiement || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${f.statut === 'Payée' ? 'badge-green' : 'badge-orange'}`}>
                        {f.statut}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => navigate(`/factures/${f.id}`)}
                        >
                          Voir
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => navigate(`/factures/${f.id}/modifier`)}
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
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

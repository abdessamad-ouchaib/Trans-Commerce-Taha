import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import './Dashboard.css';

const EMPTY = { nom: '', ville: '', adresse: '', telephone: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const { data } = await API.get('/clients');
    setClients(data);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing(null); setShowForm(true); setError(''); };
  const openEdit = (c) => { setForm({ nom: c.nom, ville: c.ville, adresse: c.adresse || '', telephone: c.telephone || '' }); setEditing(c._id); setShowForm(true); setError(''); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.nom || !form.ville) return setError('Nom et ville sont requis.');
    setLoading(true);
    try {
      if (editing) await API.put(`/clients/${editing}`, form);
      else await API.post('/clients', form);
      await fetch();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    await API.delete(`/clients/${id}`);
    await fetch();
  };

  const filtered = clients.filter(c =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.ville.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Clients</h1>
          <p className="page-subtitle">{clients.length} client(s)</p>
        </div>
        <button className="btn-gold" onClick={openNew}>+ Nouveau client</button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">{editing ? '✏️ Modifier le client' : '+ Nouveau client'}</h2>
              <button className="btn-delete" onClick={closeForm}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ margin: '0 20px' }}>{error}</div>}
            <div className="modal-body grid-2">
              {[
                { key: 'nom', label: 'Nom *', placeholder: 'Nom du client' },
                { key: 'ville', label: 'Ville *', placeholder: 'Témara' },
                { key: 'adresse', label: 'Adresse', placeholder: 'Adresse complète' },
                { key: 'telephone', label: 'Téléphone', placeholder: '06 XX XX XX XX' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-control" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeForm}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Sauvegarde...' : editing ? 'Sauvegarder' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <input type="text" className="form-control" placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>Aucun client.</p>
              <button className="btn-primary" onClick={openNew}>Ajouter un client</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Nom</th><th>Ville</th><th>Adresse</th><th>Téléphone</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c._id}>
                    <td><strong>{c.nom}</strong></td>
                    <td>{c.ville}</td>
                    <td>{c.adresse || '—'}</td>
                    <td>{c.telephone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary btn-sm" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn-danger btn-sm" onClick={() => handleDelete(c._id)}>🗑️</button>
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

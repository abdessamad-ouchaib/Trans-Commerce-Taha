import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import './Dashboard.css';

const EMPTY = { nom: '', ville: '', adresse: '', telephone: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    const { data } = await API.get('/clients');
    setClients(data);
  };

  useEffect(() => { fetchClients(); }, []);

  const openNew = () => {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (c) => {
    setForm({
      nom:       c.nom       || '',
      ville:     c.ville     || '',
      adresse:   c.adresse   || '',
      telephone: c.telephone || ''
    });
    setEditing(c.id);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
    setError('');
  };

  const handleSave = async () => {
    if (!form.nom || !form.ville)
      return setError('Nom et ville sont requis.');
    setLoading(true);
    try {
      if (editing) {
        await API.put(`/clients/${editing}`, form);
      } else {
        await API.post('/clients', form);
      }
      await fetchClients();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await API.delete(`/clients/${id}`);
      setDeleteConfirm(null);
      await fetchClients();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c =>
    !search ||
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.ville.toLowerCase().includes(search.toLowerCase())
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

      {/* Modal Formulaire */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {editing ? '✏️ Modifier le client' : '+ Nouveau client'}
              </h2>
              <button className="btn-delete" onClick={closeForm}>✕</button>
            </div>
            {error && (
              <div className="alert alert-error" style={{ margin: '0 20px' }}>
                {error}
              </div>
            )}
            <div className="modal-body grid-2">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-control" value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Nom du client" />
              </div>
              <div className="form-group">
                <label className="form-label">Ville *</label>
                <input className="form-control" value={form.ville}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                  placeholder="Témara" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Adresse</label>
                <input className="form-control" value={form.adresse}
                  onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                  placeholder="Adresse complète" />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-control" value={form.telephone}
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="06 XX XX XX XX" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeForm}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Sauvegarde...' : editing ? '💾 Sauvegarder' : '+ Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="card-title">🗑️ Confirmer la suppression</h2>
              <button className="btn-delete" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15 }}>
                Supprimer le client <strong>{deleteConfirm.nom}</strong> ?
              </p>
              <p style={{ fontSize: 13, color: '#ef4444', marginTop: 8 }}>
                ⚠️ Cette action est irréversible.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Annuler
              </button>
              <button className="btn-danger"
                onClick={() => handleDelete(deleteConfirm.id)} disabled={loading}>
                {loading ? 'Suppression...' : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <input type="text" className="form-control"
            placeholder="Rechercher un client..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>Aucun client.</p>
              <button className="btn-primary" onClick={openNew}>Ajouter</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Ville</th>
                  <th>Adresse</th>
                  <th>Téléphone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nom}</strong></td>
                    <td>{c.ville}</td>
                    <td>{c.adresse || '—'}</td>
                    <td>{c.telephone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary btn-sm"
                          onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn-danger btn-sm"
                          onClick={() => setDeleteConfirm(c)}>🗑️</button>
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

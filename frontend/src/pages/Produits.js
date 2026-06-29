import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import './Dashboard.css';

const SOCIETES = ['TRIA GROUP', 'Maymouna', 'Dalia', 'Autre'];
const POIDS    = ['1kg', '5kg', '10kg', '25kg', '40kg'];
const SACS     = ['Kraft', 'Plastique (PP)', 'Laminé'];
const POINTS   = [
  'Aïn Sebaa - Casablanca',
  'Hadsoualam - Casablanca',
  'Maymouna - Casablanca',
  'Autre'
];

const EMPTY = {
  nom: '', societe: 'TRIA GROUP', poids: '25kg',
  type_sac: 'Laminé', point_chargement: 'Aïn Sebaa - Casablanca',
  prix_unitaire: ''
};

export default function Produits() {
  const [produits, setProduits] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSoc, setFilterSoc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProduits = async () => {
    const { data } = await API.get('/produits');
    setProduits(data);
  };

  useEffect(() => { fetchProduits(); }, []);

  const openNew = () => {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (p) => {
    setForm({
      nom:              p.nom              || '',
      societe:          p.societe          || 'TRIA GROUP',
      poids:            p.poids            || '25kg',
      type_sac:         p.type_sac         || 'Laminé',
      point_chargement: p.point_chargement || 'Aïn Sebaa - Casablanca',
      prix_unitaire:    p.prix_unitaire    || ''
    });
    setEditing(p.id);
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
    if (!form.nom) return setError('Le nom est requis.');
    setLoading(true);
    try {
      if (editing) {
        await API.put(`/produits/${editing}`, form);
      } else {
        await API.post('/produits', form);
      }
      await fetchProduits();
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
      await API.delete(`/produits/${id}`);
      setDeleteConfirm(null);
      await fetchProduits();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = produits.filter(p =>
    (!search || p.nom.toLowerCase().includes(search.toLowerCase())) &&
    (!filterSoc || p.societe === filterSoc)
  );

  const socIcon = (s) => ({ 'TRIA GROUP': '🌾', 'Maymouna': '🌸' }[s] || '📦');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🌾 Produits</h1>
          <p className="page-subtitle">{produits.length} produit(s)</p>
        </div>
        <button className="btn-gold" onClick={openNew}>+ Nouveau produit</button>
      </div>

      {/* Modal Formulaire */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {editing ? '✏️ Modifier le produit' : '+ Nouveau produit'}
              </h2>
              <button className="btn-delete" onClick={closeForm}>✕</button>
            </div>
            {error && (
              <div className="alert alert-error" style={{ margin: '0 20px' }}>
                {error}
              </div>
            )}
            <div className="modal-body grid-2">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nom du produit *</label>
                <input className="form-control" value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="FARINE FLEUR DIAMANDA" />
              </div>
              <div className="form-group">
                <label className="form-label">Société</label>
                <select className="form-control" value={form.societe}
                  onChange={e => setForm(f => ({ ...f, societe: e.target.value }))}>
                  {SOCIETES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Poids du sac</label>
                <select className="form-control" value={form.poids}
                  onChange={e => setForm(f => ({ ...f, poids: e.target.value }))}>
                  {POIDS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type de sac</label>
                <select className="form-control" value={form.type_sac}
                  onChange={e => setForm(f => ({ ...f, type_sac: e.target.value }))}>
                  {SACS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Point de chargement</label>
                <select className="form-control" value={form.point_chargement}
                  onChange={e => setForm(f => ({ ...f, point_chargement: e.target.value }))}>
                  {POINTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Prix unitaire (MAD/sac)</label>
                <input type="number" className="form-control"
                  value={form.prix_unitaire}
                  onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                  placeholder="Ex: 93.75" min="0" step="0.25" />
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
                Supprimer <strong>{deleteConfirm.nom}</strong> ?
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
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input type="text" className="form-control"
            placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          <select className="form-control" value={filterSoc}
            onChange={e => setFilterSoc(e.target.value)}
            style={{ width: 'auto', minWidth: '160px' }}>
            <option value="">Toutes sociétés</option>
            {SOCIETES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>Aucun produit.</p>
              <button className="btn-primary" onClick={openNew}>Ajouter</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th>Société</th>
                  <th>Poids</th>
                  <th>Type Sac</th>
                  <th>Point de chargement</th>
                  <th>Prix/sac</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><strong>{socIcon(p.societe)} {p.nom}</strong></td>
                    <td><span className="badge badge-blue">{p.societe}</span></td>
                    <td>{p.poids}</td>
                    <td>{p.type_sac || '—'}</td>
                    <td>{p.point_chargement || '—'}</td>
                    <td>
                      {p.prix_unitaire > 0
                        ? `${Number(p.prix_unitaire).toLocaleString('fr-MA')} MAD`
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary btn-sm"
                          onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn-danger btn-sm"
                          onClick={() => setDeleteConfirm(p)}>🗑️</button>
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

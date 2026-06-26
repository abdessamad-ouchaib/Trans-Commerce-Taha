import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import './Dashboard.css';

const EMPTY = { nom: '', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Aïn Sebaa - Casablanca', prixUnitaire: 0 };

const SOCIETES = ['TRIA GROUP', 'Maymouna', 'Dalia', 'Autre'];
const POIDS = ['1kg', '5kg', '10kg', '25kg', '40kg'];
const SACS = ['Kraft', 'Plastique (PP)', 'Laminé'];
const POINTS = ['Aïn Sebaa - Casablanca', 'Hadsoualam - Casablanca', 'Maymouna - Casablanca', 'Autre'];

export default function Produits() {
  const [produits, setProduits] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSoc, setFilterSoc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const { data } = await API.get('/produits');
    setProduits(data);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing(null); setShowForm(true); setError(''); };
  const openEdit = (p) => { setForm({ nom: p.nom, societe: p.societe, poids: p.poids, typeSac: p.typeSac, pointChargement: p.pointChargement || '', prixUnitaire: p.prixUnitaire || 0 }); setEditing(p._id); setShowForm(true); setError(''); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.nom) return setError('Le nom est requis.');
    setLoading(true);
    try {
      if (editing) await API.put(`/produits/${editing}`, form);
      else await API.post('/produits', form);
      await fetch();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    await API.delete(`/produits/${id}`);
    await fetch();
  };

  const filtered = produits.filter(p =>
    (!search || p.nom.toLowerCase().includes(search.toLowerCase())) &&
    (!filterSoc || p.societe === filterSoc)
  );

  const socIcon = (s) => ({ 'TRIA GROUP': '🌾', 'Maymouna': '🌸', 'Dalia': '🌻' }[s] || '📦');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🌾 Produits</h1>
          <p className="page-subtitle">{produits.length} produit(s)</p>
        </div>
        <button className="btn-gold" onClick={openNew}>+ Nouveau produit</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">{editing ? '✏️ Modifier' : '+ Nouveau produit'}</h2>
              <button className="btn-delete" onClick={closeForm}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ margin: '0 20px' }}>{error}</div>}
            <div className="modal-body grid-2">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nom du produit *</label>
                <input className="form-control" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="FARINE FLEUR DIAMANDA" />
              </div>
              {[
                { key: 'societe', label: 'Société', opts: SOCIETES },
                { key: 'poids', label: 'Poids du sac', opts: POIDS },
                { key: 'typeSac', label: 'Type de sac', opts: SACS },
                { key: 'pointChargement', label: 'Point de chargement', opts: POINTS },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <select className="form-control" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Prix unitaire (MAD/sac)</label>
                <input type="number" className="form-control" value={form.prixUnitaire} onChange={e => setForm(f => ({ ...f, prixUnitaire: Number(e.target.value) }))} min="0" step="0.01" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeForm}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Sauvegarde...' : editing ? 'Sauvegarder' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input type="text" className="form-control" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          <select className="form-control" value={filterSoc} onChange={e => setFilterSoc(e.target.value)} style={{ width: 'auto', minWidth: '150px' }}>
            <option value="">Toutes sociétés</option>
            {SOCIETES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>Aucun produit.</p>
              <button className="btn-primary" onClick={openNew}>Ajouter un produit</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Désignation</th><th>Société</th><th>Poids</th><th>Type Sac</th><th>Point de chargement</th><th>Prix/sac</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id}>
                    <td><strong>{socIcon(p.societe)} {p.nom}</strong></td>
                    <td><span className="badge badge-blue">{p.societe}</span></td>
                    <td>{p.poids}</td>
                    <td>{p.typeSac}</td>
                    <td>{p.pointChargement || '—'}</td>
                    <td>{p.prixUnitaire > 0 ? `${p.prixUnitaire} MAD` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn-danger btn-sm" onClick={() => handleDelete(p._id)}>🗑️</button>
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

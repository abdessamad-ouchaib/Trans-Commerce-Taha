import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import './Dashboard.css';

const EMPTY = {
  nom: '', prenom: '', telephone: '', age: '',
  role: 'chauffeur', salaire: '', numero_cnss: '', matricule_camion: ''
};

export default function Employes() {
  const [employes, setEmployes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchEmployes = async () => {
    try {
      const { data } = await API.get('/employes');
      setEmployes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchEmployes(); }, []);

  const openNew = () => {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (e) => {
    setForm({
      nom:             e.nom             || '',
      prenom:          e.prenom          || '',
      telephone:       e.telephone       || '',
      age:             e.age             || '',
      role:            e.role            || 'chauffeur',
      salaire:         e.salaire         || '',
      numero_cnss:     e.numero_cnss     || '',
      matricule_camion: e.matricule_camion || ''
    });
    setEditing(e.id); // ← ID PostgreSQL correct
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
    if (!form.nom || !form.prenom)
      return setError('Nom et prénom sont requis.');
    setLoading(true);
    try {
      if (editing) {
        // MODIFIER — PUT avec l'ID correct
        await API.put(`/employes/${editing}`, form);
      } else {
        // CRÉER — POST
        await API.post('/employes', form);
      }
      await fetchEmployes();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await API.delete(`/employes/${id}`);
      setDeleteConfirm(null);
      await fetchEmployes();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (r) => ({
    chauffeur:   '🚛 Chauffeur',
    responsable: '👔 Responsable',
    autre:       '👤 Autre'
  }[r] || r);

  const roleBadge = (r) => ({
    chauffeur:   'badge-blue',
    responsable: 'badge-green',
    autre:       'badge-orange'
  }[r] || 'badge-blue');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Employés</h1>
          <p className="page-subtitle">
            {employes.length} employé(s) · Responsable: Abdelaali Ouchaib
          </p>
        </div>
        <button className="btn-gold" onClick={openNew}>+ Nouvel employé</button>
      </div>

      {/* ── Modal Formulaire ── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">
                {editing ? '✏️ Modifier l\'employé' : '+ Nouvel employé'}
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
                <label className="form-label">Prénom *</label>
                <input
                  className="form-control"
                  value={form.prenom}
                  onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  placeholder="Mohamed"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input
                  className="form-control"
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ouchaib"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select
                  className="form-control"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="chauffeur">🚛 Chauffeur</option>
                  <option value="responsable">👔 Responsable</option>
                  <option value="autre">👤 Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  className="form-control"
                  value={form.telephone}
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="06 XX XX XX XX"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Âge</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="35"
                  min="18" max="70"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Salaire (MAD)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.salaire}
                  onChange={e => setForm(f => ({ ...f, salaire: e.target.value }))}
                  placeholder="3000"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">N° CNSS</label>
                <input
                  className="form-control"
                  value={form.numero_cnss}
                  onChange={e => setForm(f => ({ ...f, numero_cnss: e.target.value }))}
                  placeholder="9541279"
                />
              </div>
              {form.role === 'chauffeur' && (
                <div className="form-group">
                  <label className="form-label">🚛 Matricule du camion</label>
                  <input
                    className="form-control"
                    value={form.matricule_camion}
                    onChange={e => setForm(f => ({ ...f, matricule_camion: e.target.value }))}
                    placeholder="Ex: 12345-A-1"
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeForm}>Annuler</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Sauvegarde...' : editing ? '💾 Sauvegarder' : '+ Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation Suppression ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="card-title">🗑️ Confirmer la suppression</h2>
              <button className="btn-delete" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15, color: '#374151' }}>
                Voulez-vous vraiment supprimer{' '}
                <strong>{deleteConfirm.prenom} {deleteConfirm.nom}</strong> ?
              </p>
              <p style={{ fontSize: 13, color: '#ef4444', marginTop: 8 }}>
                ⚠️ Cette action est irréversible.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Annuler
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={loading}
              >
                {loading ? 'Suppression...' : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Carte Responsable ── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0f2240 0%, #1a3a5c 100%)',
        color: 'white', border: 'none'
      }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 52, height: 52, background: '#c9952a', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: '#0f2240', flexShrink: 0
          }}>AO</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Cairo' }}>
              Abdelaali Ouchaib
            </p>
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              👔 Responsable · Trans Commerce TAHA
            </p>
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
              Tél: 06.61.31.69.57 · Témara · F.C: 96931 · Patente: 27951651 · CNSS: 9541279
            </p>
          </div>
        </div>
      </div>

      {/* ── Tableau des employés ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Liste des employés</h2>
        </div>
        <div className="table-wrapper">
          {employes.length === 0 ? (
            <div className="empty-state">
              <p>Aucun employé ajouté.</p>
              <button className="btn-primary" onClick={openNew}>
                Ajouter un employé
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Prénom & Nom</th>
                  <th>Rôle</th>
                  <th>Téléphone</th>
                  <th>Âge</th>
                  <th>Salaire</th>
                  <th>N° CNSS</th>
                  <th>Matricule</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employes.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.prenom} {e.nom}</strong></td>
                    <td>
                      <span className={`badge ${roleBadge(e.role)}`}>
                        {roleLabel(e.role)}
                      </span>
                    </td>
                    <td>{e.telephone || '—'}</td>
                    <td>{e.age ? `${e.age} ans` : '—'}</td>
                    <td>
                      {e.salaire
                        ? `${Number(e.salaire).toLocaleString('fr-MA')} MAD`
                        : '—'}
                    </td>
                    <td>{e.numero_cnss || '—'}</td>
                    <td>
                      {e.matricule_camion
                        ? <code style={{ fontSize: 12 }}>{e.matricule_camion}</code>
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => openEdit(e)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => setDeleteConfirm(e)}
                        >
                          🗑️
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

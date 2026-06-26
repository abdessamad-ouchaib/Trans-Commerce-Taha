import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import './Dashboard.css';

const EMPTY = { nom: '', prenom: '', telephone: '', age: '', role: 'chauffeur', salaire: '', numeroCNSS: '', matriculeCamion: '' };

export default function Employes() {
  const [employes, setEmployes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const { data } = await API.get('/employes');
    setEmployes(data);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing(null); setShowForm(true); setError(''); };
  const openEdit = (e) => {
    setForm({ nom: e.nom, prenom: e.prenom, telephone: e.telephone || '', age: e.age || '', role: e.role, salaire: e.salaire || '', numeroCNSS: e.numeroCNSS || '', matriculeCamion: e.matriculeCamion || '' });
    setEditing(e._id); setShowForm(true); setError('');
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.nom || !form.prenom) return setError('Nom et prénom sont requis.');
    setLoading(true);
    try {
      if (editing) await API.put(`/employes/${editing}`, form);
      else await API.post('/employes', form);
      await fetch();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet employé ?')) return;
    await API.delete(`/employes/${id}`);
    await fetch();
  };

  const roleLabel = (r) => ({ chauffeur: '🚛 Chauffeur', responsable: '👔 Responsable', autre: '👤 Autre' }[r] || r);
  const roleBadge = (r) => ({ chauffeur: 'badge-blue', responsable: 'badge-green', autre: 'badge-orange' }[r] || 'badge-blue');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Employés</h1>
          <p className="page-subtitle">{employes.length} employé(s) · Responsable: Abdelaali Ouchaib</p>
        </div>
        <button className="btn-gold" onClick={openNew}>+ Nouvel employé</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-card modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-title">{editing ? '✏️ Modifier' : '+ Nouvel employé'}</h2>
              <button className="btn-delete" onClick={closeForm}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ margin: '0 20px' }}>{error}</div>}
            <div className="modal-body grid-2">
              <div className="form-group">
                <label className="form-label">Prénom *</label>
                <input className="form-control" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Mohamed" />
              </div>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-control" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ouchaib" />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="chauffeur">🚛 Chauffeur</option>
                  <option value="responsable">👔 Responsable</option>
                  <option value="autre">👤 Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-control" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="06 XX XX XX XX" />
              </div>
              <div className="form-group">
                <label className="form-label">Âge</label>
                <input type="number" className="form-control" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="35" min="18" max="70" />
              </div>
              <div className="form-group">
                <label className="form-label">Salaire (MAD)</label>
                <input type="number" className="form-control" value={form.salaire} onChange={e => setForm(f => ({ ...f, salaire: e.target.value }))} placeholder="3000" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">N° Déclaration CNSS</label>
                <input className="form-control" value={form.numeroCNSS} onChange={e => setForm(f => ({ ...f, numeroCNSS: e.target.value }))} placeholder="CNSS 9541279" />
              </div>
              {(form.role === 'chauffeur') && (
                <div className="form-group">
                  <label className="form-label">🚛 Matricule du camion</label>
                  <input className="form-control" value={form.matriculeCamion} onChange={e => setForm(f => ({ ...f, matriculeCamion: e.target.value }))} placeholder="Ex: 12345-A-1" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeForm}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Sauvegarde...' : editing ? 'Sauvegarder' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Abdelaali card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%)', color: 'white', border: 'none' }}>
        <div className="card-body" style={{ display: 'flex', align: 'center', gap: '16px' }}>
          <div style={{ width: 52, height: 52, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: 'var(--navy-dark)', flexShrink: 0 }}>AO</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Cairo' }}>Abdelaali Ouchaib</p>
            <p style={{ fontSize: 13, opacity: 0.8 }}>👔 Responsable · Trans Commerce TAHA</p>
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Tél: 06.61.31.69.57 · Témara · F.C: 96931 · Patente: 27951651 · I.F: 3307915 · CNSS: 9541279</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">Liste des employés</h2></div>
        <div className="table-wrapper">
          {employes.length === 0 ? (
            <div className="empty-state">
              <p>Aucun employé ajouté.</p>
              <button className="btn-primary" onClick={openNew}>Ajouter un employé</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Prénom & Nom</th><th>Rôle</th><th>Téléphone</th><th>Âge</th><th>Salaire</th><th>N° CNSS</th><th>Matricule</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {employes.map(e => (
                  <tr key={e._id}>
                    <td><strong>{e.prenom} {e.nom}</strong></td>
                    <td><span className={`badge ${roleBadge(e.role)}`}>{roleLabel(e.role)}</span></td>
                    <td>{e.telephone || '—'}</td>
                    <td>{e.age ? `${e.age} ans` : '—'}</td>
                    <td>{e.salaire ? `${Number(e.salaire).toLocaleString('fr-MA')} MAD` : '—'}</td>
                    <td>{e.numeroCNSS || '—'}</td>
                    <td>{e.matriculeCamion ? <code style={{ fontSize: 12 }}>{e.matriculeCamion}</code> : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary btn-sm" onClick={() => openEdit(e)}>✏️</button>
                        <button className="btn-danger btn-sm" onClick={() => handleDelete(e._id)}>🗑️</button>
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

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import './NouvelleFacture.css';

export default function NouvelleFacture() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = window.location.pathname.includes('/modifier');

  const [clients, setClients] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    client: '',
    chauffeur: '',
    matriculeCamion: '',
    dateFacture: new Date().toISOString().split('T')[0],
    modePaiement: 'Espèces',
    numeroCheque: '',
    primeChauffeur: '',
    statut: 'En attente',
    notes: '',
    lignes: []
  });

  const [nouvelleClientMode, setNouvelleClientMode] = useState(false);
  const [nouveauClient, setNouveauClient] = useState({ nom: '', ville: '', telephone: '' });

  // Charger clients, employés, produits
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, eRes, pRes] = await Promise.all([
          API.get('/clients'),
          API.get('/employes'),
          API.get('/produits')
        ]);
        setClients(cRes.data);
        setEmployes(eRes.data.filter(e => e.role === 'chauffeur' || e.role === 'autre'));
        setProduits(pRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Charger facture existante si mode édition
  useEffect(() => {
    if (isEdit && id) {
      API.get(`/factures/${id}`).then(({ data }) => {
        setForm({
          client:          data.client_id || '',
          chauffeur:       data.chauffeur_id || '',
          matriculeCamion: data.matricule_camion || '',
          dateFacture:     data.date_facture
                             ? data.date_facture.split('T')[0]
                             : new Date().toISOString().split('T')[0],
          modePaiement:    data.mode_paiement || 'Espèces',
          numeroCheque:    data.numero_cheque || '',
          primeChauffeur:  data.prime_chauffeur || '',
          statut:          data.statut || 'En attente',
          notes:           data.notes || '',
          lignes: (data.lignes || []).map(l => ({
            produit:      l.produit_id || '',
            nomProduit:   l.nom_produit || '',
            quantiteSacs: l.quantite_sacs || 1,
            prixUnitaire: l.prix_unitaire || 0
          }))
        });
      });
    }
  }, [isEdit, id]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const addLigne = () => {
    setForm(f => ({
      ...f,
      lignes: [...f.lignes, { produit: '', nomProduit: '', quantiteSacs: 1, prixUnitaire: 0 }]
    }));
  };

  const updateLigne = (idx, key, value) => {
    setForm(f => ({
      ...f,
      lignes: f.lignes.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [key]: value };
        if (key === 'produit') {
          const p = produits.find(p => String(p.id) === String(value));
          if (p) {
            updated.nomProduit   = `${p.nom} ${p.poids} ${p.type_sac}`;
            updated.prixUnitaire = p.prix_unitaire || 0;
          }
        }
        return updated;
      })
    }));
  };

  const removeLigne = (idx) => {
    setForm(f => ({ ...f, lignes: f.lignes.filter((_, i) => i !== idx) }));
  };

  const montantTotal = form.lignes.reduce(
    (s, l) => s + (Number(l.quantiteSacs || 0) * Number(l.prixUnitaire || 0)), 0
  );

  const handleChauffeurChange = (chaufId) => {
    setField('chauffeur', chaufId);
    const chauf = employes.find(e => String(e.id) === String(chaufId));
    if (chauf?.matricule_camion) setField('matriculeCamion', chauf.matricule_camion);
  };

  const handleSubmit = async () => {
    if (!form.client && !nouvelleClientMode)
      return setError('Veuillez sélectionner un client.');
    if (!form.chauffeur)
      return setError('Veuillez sélectionner un chauffeur.');
    if (form.lignes.length === 0)
      return setError('Veuillez ajouter au moins un produit.');

    setLoading(true);
    setError('');
    try {
      let clientId = form.client;

      // Créer nouveau client si besoin
      if (nouvelleClientMode) {
        const { data: newClient } = await API.post('/clients', nouveauClient);
        clientId = newClient.id;
      }

      // Construire le payload PostgreSQL
      const payload = {
        client_id:        clientId,
        chauffeur_id:     form.chauffeur,
        matricule_camion: form.matriculeCamion,
        date_facture:     form.dateFacture,
        mode_paiement:    form.modePaiement,
        numero_cheque:    form.numeroCheque,
        prime_chauffeur:  form.primeChauffeur,
        statut:           form.statut,
        notes:            form.notes,
        lignes: form.lignes.map(l => ({
          produit_id:    l.produit,
          nom_produit:   l.nomProduit,
          quantite_sacs: parseInt(l.quantiteSacs) || 1,
          prix_unitaire: parseFloat(l.prixUnitaire) || 0
        }))
      };

      if (isEdit) {
        await API.put(`/factures/${id}`, payload);
        setSuccess('Facture modifiée avec succès !');
        setTimeout(() => navigate(`/factures/${id}`), 1500);
      } else {
        const { data: facture } = await API.post('/factures', payload);
        setSuccess(`Facture ${facture.numero_facture} créée avec succès !`);
        setTimeout(() => navigate(`/factures/${facture.id}`), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nouvelle-facture">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Modifier la facture' : 'Nouvelle facture'}
          </h1>
          <p className="page-subtitle">Trans Commerce TAHA</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>← Retour</button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="facture-grid">

        {/* ── COLONNE GAUCHE ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Client */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">👥 Client</h2>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setNouvelleClientMode(!nouvelleClientMode)}
              >
                {nouvelleClientMode ? 'Client existant' : '+ Nouveau client'}
              </button>
            </div>
            <div className="card-body">
              {nouvelleClientMode ? (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input
                      className="form-control"
                      value={nouveauClient.nom}
                      onChange={e => setNouveauClient(c => ({ ...c, nom: e.target.value }))}
                      placeholder="Nom du client"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ville *</label>
                    <input
                      className="form-control"
                      value={nouveauClient.ville}
                      onChange={e => setNouveauClient(c => ({ ...c, ville: e.target.value }))}
                      placeholder="Témara"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input
                      className="form-control"
                      value={nouveauClient.telephone}
                      onChange={e => setNouveauClient(c => ({ ...c, telephone: e.target.value }))}
                      placeholder="06 XX XX XX XX"
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Sélectionner un client *</label>
                  <select
                    className="form-control"
                    value={form.client}
                    onChange={e => setField('client', e.target.value)}
                  >
                    <option value="">-- Choisir un client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nom} — {c.ville}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Chauffeur */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🚛 Chauffeur & Camion</h2>
            </div>
            <div className="card-body grid-2">
              <div className="form-group">
                <label className="form-label">Chauffeur *</label>
                <select
                  className="form-control"
                  value={form.chauffeur}
                  onChange={e => handleChauffeurChange(e.target.value)}
                >
                  <option value="">-- Choisir --</option>
                  {employes.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.prenom} {e.nom}
                      {e.matricule_camion ? ` (${e.matricule_camion})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Matricule du camion</label>
                <input
                  className="form-control"
                  value={form.matriculeCamion}
                  onChange={e => setField('matriculeCamion', e.target.value)}
                  placeholder="Ex: 12345-A-1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Prime du chauffeur (MAD)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.primeChauffeur}
                  onChange={e => setField('primeChauffeur', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💰 Paiement</h2>
            </div>
            <div className="card-body grid-2">
              <div className="form-group">
                <label className="form-label">Date de facture</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateFacture}
                  onChange={e => setField('dateFacture', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mode de paiement</label>
                <select
                  className="form-control"
                  value={form.modePaiement}
                  onChange={e => setField('modePaiement', e.target.value)}
                >
                  <option>Espèces</option>
                  <option>Chèque</option>
                </select>
              </div>
              {form.modePaiement === 'Chèque' && (
                <div className="form-group">
                  <label className="form-label">N° Chèque</label>
                  <input
                    className="form-control"
                    value={form.numeroCheque}
                    onChange={e => setField('numeroCheque', e.target.value)}
                    placeholder="Numéro du chèque"
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select
                  className="form-control"
                  value={form.statut}
                  onChange={e => setField('statut', e.target.value)}
                >
                  <option>En attente</option>
                  <option>Payée</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Remarques optionnelles..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE — Produits ───────────── */}
        <div className="card produits-card">
          <div className="card-header">
            <h2 className="card-title">🌾 Produits livrés</h2>
            <button className="btn-primary btn-sm" onClick={addLigne}>+ Ajouter</button>
          </div>
          <div className="card-body">
            {form.lignes.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>Aucun produit ajouté.</p>
                <button className="btn-primary btn-sm" onClick={addLigne}>
                  + Ajouter un produit
                </button>
              </div>
            ) : (
              <div className="lignes-list">
                {form.lignes.map((ligne, idx) => (
                  <div key={idx} className="ligne-item">
                    <div className="ligne-header">
                      <span className="ligne-num">Produit {idx + 1}</span>
                      <button className="btn-delete" onClick={() => removeLigne(idx)}>✕</button>
                    </div>
                    <div className="grid-2">
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Produit *</label>
                        <select
                          className="form-control"
                          value={ligne.produit}
                          onChange={e => updateLigne(idx, 'produit', e.target.value)}
                        >
                          <option value="">-- Choisir un produit --</option>
                          {produits.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.societe === 'TRIA GROUP' ? '🌾' : '🌸'}{' '}
                              {p.nom} {p.poids} {p.type_sac} — {p.point_chargement || 'Casablanca'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantité (sacs) *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={ligne.quantiteSacs}
                          onChange={e => updateLigne(idx, 'quantiteSacs', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prix unitaire (MAD/sac)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={ligne.prixUnitaire}
                          onChange={e => updateLigne(idx, 'prixUnitaire', Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="ligne-total">
                      Total:{' '}
                      <strong>
                        {(Number(ligne.quantiteSacs || 0) * Number(ligne.prixUnitaire || 0))
                          .toLocaleString('fr-MA')} MAD
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totaux */}
            <div className="total-box">
              <div className="total-row">
                <span>Sous-total</span>
                <strong>{montantTotal.toLocaleString('fr-MA')} MAD</strong>
              </div>
              {Number(form.primeChauffeur) > 0 && (
                <div className="total-row total-prime">
                  <span>Prime chauffeur</span>
                  <span>{Number(form.primeChauffeur).toLocaleString('fr-MA')} MAD</span>
                </div>
              )}
              <div className="total-row total-grand">
                <span>MONTANT TOTAL</span>
                <strong className="total-amount">
                  {montantTotal.toLocaleString('fr-MA')} MAD
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? 'Sauvegarde...'
                  : isEdit ? '💾 Sauvegarder' : '✅ Créer la facture'}
              </button>
              <button className="btn-secondary" onClick={() => navigate(-1)}>
                Annuler
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import './NouvelleFacture.css';

const PRODUITS_DEFAUT = [
  { nom: 'FARINE FLEUR DIAMANDA', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE LUXE DIAMANDA', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE RONDE GROSSE TRIA', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Plastique (PP)', pointChargement: 'Hadsoualam - Casablanca' },
  { nom: 'FARINE BOULANGERE TRIA', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Plastique (PP)', pointChargement: 'Hadsoualam - Casablanca' },
  { nom: 'FARINE LUXE LAMLIH', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE FLEUR LAMLIH', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE LUXE AMBRE', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE FLEUR TRIA', societe: 'TRIA GROUP', poids: '10kg', typeSac: 'Kraft', pointChargement: 'Hadsoualam - Casablanca' },
  { nom: 'FARINE FLEUR TRIA', societe: 'TRIA GROUP', poids: '5kg', typeSac: 'Kraft', pointChargement: 'Hadsoualam - Casablanca' },
  { nom: 'FARINE FLEUR DIAMANDA', societe: 'TRIA GROUP', poids: '10kg', typeSac: 'Kraft', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE FLEUR DIAMANDA', societe: 'TRIA GROUP', poids: '5kg', typeSac: 'Kraft', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'FARINE RONDE FINE LAMLIH', societe: 'TRIA GROUP', poids: '25kg', typeSac: 'Plastique (PP)', pointChargement: 'Aïn Sebaa - Casablanca' },
  { nom: 'SON BLE TENDRE', societe: 'TRIA GROUP', poids: '40kg', typeSac: 'Plastique (PP)', pointChargement: 'Hadsoualam - Casablanca' },
  { nom: 'FARINE FLEUR MAYMOUNA', societe: 'Maymouna', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Maymouna - Casablanca' },
  { nom: 'FARINE LUXE MAYMOUNA', societe: 'Maymouna', poids: '25kg', typeSac: 'Laminé', pointChargement: 'Maymouna - Casablanca' },
];

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
        const prods = pRes.data.length > 0 ? pRes.data : PRODUITS_DEFAUT.map((p, i) => ({ ...p, _id: `default_${i}`, prixUnitaire: 0 }));
        setProduits(prods);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      API.get(`/factures/${id}`).then(({ data }) => {
        setForm({
          client: data.client?._id || data.client || '',
          chauffeur: data.chauffeur?._id || data.chauffeur || '',
          matriculeCamion: data.matriculeCamion || '',
          dateFacture: data.dateFacture ? data.dateFacture.split('T')[0] : new Date().toISOString().split('T')[0],
          modePaiement: data.modePaiement || 'Espèces',
          numeroCheque: data.numeroCheque || '',
          primeChauffeur: data.primeChauffeur || '',
          statut: data.statut || 'En attente',
          notes: data.notes || '',
          lignes: (data.lignes || []).map(l => ({
            produit: l.produit?._id || l.produit || '',
            nomProduit: l.nomProduit || '',
            quantiteSacs: l.quantiteSacs,
            prixUnitaire: l.prixUnitaire
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
          const p = produits.find(p => p._id === value);
          if (p) {
            updated.nomProduit = `${p.nom} ${p.poids} ${p.typeSac}`;
            updated.prixUnitaire = p.prixUnitaire || 0;
          }
        }
        return updated;
      })
    }));
  };

  const removeLigne = (idx) => {
    setForm(f => ({ ...f, lignes: f.lignes.filter((_, i) => i !== idx) }));
  };

  const montantTotal = form.lignes.reduce((s, l) => s + (Number(l.quantiteSacs || 0) * Number(l.prixUnitaire || 0)), 0);

  const handleChauffeurChange = (chaufId) => {
    setField('chauffeur', chaufId);
    const chauf = employes.find(e => String(e.id) === String(chaufId));
    if (chauf?.matriculeCamion) setField('matriculeCamion', chauf.matriculeCamion);
  };

  const handleSubmit = async () => {
    if (!form.client && !nouvelleClientMode) return setError('Veuillez sélectionner un client.');
    if (!form.chauffeur) return setError('Veuillez sélectionner un chauffeur.');
    if (form.lignes.length === 0) return setError('Veuillez ajouter au moins un produit.');

    setLoading(true);
    setError('');
    try {
      let clientId = form.client;
      if (nouvelleClientMode) {
        const { data: newClient } = await API.post('/clients', nouveauClient);
        clientId = newClient._id;
      }

      const payload = { ...form, client: clientId };
      if (isEdit) {
        await API.put(`/factures/${id}`, payload);
        setSuccess('Facture modifiée avec succès!');
      } else {
        const { data: facture } = await API.post('/factures', payload);
        setSuccess(`Facture ${facture.numeroFacture} créée avec succès!`);
        setTimeout(() => navigate(`/factures/${facture._id}`), 1500);
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
          <h1 className="page-title">{isEdit ? 'Modifier la facture' : 'Nouvelle facture'}</h1>
          <p className="page-subtitle">Trans Commerce TAHA</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>← Retour</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="facture-grid">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Client */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">👥 Client</h2>
              <button className="btn-secondary btn-sm" onClick={() => setNouvelleClientMode(!nouvelleClientMode)}>
                {nouvelleClientMode ? 'Client existant' : '+ Nouveau client'}
              </button>
            </div>
            <div className="card-body">
              {nouvelleClientMode ? (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nom du client *</label>
                    <input className="form-control" value={nouveauClient.nom} onChange={e => setNouveauClient(c => ({ ...c, nom: e.target.value }))} placeholder="Yassini Simohammed" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ville *</label>
                    <input className="form-control" value={nouveauClient.ville} onChange={e => setNouveauClient(c => ({ ...c, ville: e.target.value }))} placeholder="Khmisset" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className="form-control" value={nouveauClient.telephone} onChange={e => setNouveauClient(c => ({ ...c, telephone: e.target.value }))} placeholder="06 XX XX XX XX" />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Sélectionner un client *</label>
                  <select className="form-control" value={form.client} onChange={e => setField('client', e.target.value)}>
                   <option value="">-- Choisir un client --</option>
                     {clients.map(c => (
                   <option key={c.id} value={c.id}>{c.nom} — {c.ville}</option>
                    ))}
                 </select>
                </div>
              )}
            </div>
          </div>

          {/* Chauffeur */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">🚛 Chauffeur & Camion</h2></div>
            <div className="card-body grid-2">
              <div className="form-group">
                <label className="form-label">Chauffeur *</label>
                <select className="form-control" value={form.chauffeur} onChange={e => handleChauffeurChange(e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {employes.map(e => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom} {e.matriculeCamion ? `(${e.matriculeCamion})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Matricule du camion</label>
                <input className="form-control" value={form.matriculeCamion} onChange={e => setField('matriculeCamion', e.target.value)} placeholder="Ex: 12345-A-1" />
              </div>
              <div className="form-group">
                <label className="form-label">Prime du chauffeur (MAD)</label>
                <input type="number" className="form-control" value={form.primeChauffeur} onChange={e => setField('primeChauffeur', e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
          </div>

          {/* Paiement & Statut */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">💰 Paiement</h2></div>
            <div className="card-body grid-2">
              <div className="form-group">
                <label className="form-label">Date de facture</label>
                <input type="date" className="form-control" value={form.dateFacture} onChange={e => setField('dateFacture', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mode de paiement</label>
                <select className="form-control" value={form.modePaiement} onChange={e => setField('modePaiement', e.target.value)}>
                  <option>Espèces</option>
                  <option>Chèque</option>
                </select>
              </div>
              {form.modePaiement === 'Chèque' && (
                <div className="form-group">
                  <label className="form-label">N° Chèque</label>
                  <input className="form-control" value={form.numeroCheque} onChange={e => setField('numeroCheque', e.target.value)} placeholder="Numéro du chèque" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select className="form-control" value={form.statut} onChange={e => setField('statut', e.target.value)}>
                  <option>En attente</option>
                  <option>Payée</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Remarques optionnelles..." />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Produits */}
        <div className="card produits-card">
          <div className="card-header">
            <h2 className="card-title">🌾 Produits livrés</h2>
            <button className="btn-primary btn-sm" onClick={addLigne}>+ Ajouter</button>
          </div>
          <div className="card-body">
            {form.lignes.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>Aucun produit ajouté.</p>
                <button className="btn-primary btn-sm" onClick={addLigne}>+ Ajouter un produit</button>
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
                        <select className="form-control" value={ligne.produit} onChange={e => updateLigne(idx, 'produit', e.target.value)}>
                          <option value="">-- Choisir un produit --</option>
                          {produits.map(p => (
                           <option key={p.id} value={p.id}>
                              {p.societe === 'TRIA GROUP' ? '🌾' : '🌸'} {p.nom} {p.poids} {p.typeSac} — {p.pointChargement || 'Casablanca'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantité (sacs) *</label>
                        <input type="number" className="form-control" value={ligne.quantiteSacs} onChange={e => updateLigne(idx, 'quantiteSacs', Number(e.target.value))} min="1" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prix unitaire (MAD/sac)</label>
                        <input type="number" className="form-control" value={ligne.prixUnitaire} onChange={e => updateLigne(idx, 'prixUnitaire', Number(e.target.value))} min="0" step="0.01" />
                      </div>
                    </div>
                    <div className="ligne-total">
                      Total: <strong>{(Number(ligne.quantiteSacs || 0) * Number(ligne.prixUnitaire || 0)).toLocaleString('fr-MA')} MAD</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="total-box">
              <div className="total-row">
                <span>Sous-total</span>
                <strong>{montantTotal.toLocaleString('fr-MA')} MAD</strong>
              </div>
              {form.primeChauffeur > 0 && (
                <div className="total-row total-prime">
                  <span>Prime chauffeur</span>
                  <span>{Number(form.primeChauffeur).toLocaleString('fr-MA')} MAD</span>
                </div>
              )}
              <div className="total-row total-grand">
                <span>MONTANT TOTAL</span>
                <strong className="total-amount">{montantTotal.toLocaleString('fr-MA')} MAD</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Sauvegarde...' : isEdit ? '💾 Sauvegarder' : '✅ Créer la facture'}
              </button>
              <button className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

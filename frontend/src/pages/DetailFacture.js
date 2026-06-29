import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import './DetailFacture.css';

export default function DetailFacture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    API.get(`/factures/${id}`)
      .then(({ data }) => { setFacture(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleStatut = async (statut) => {
    const { data } = await API.put(`/factures/${id}`, { statut });
    setFacture(f => ({ ...f, statut: data.statut }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/factures/${id}`);
      navigate('/factures');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const formatMAD = (n) => `${Number(n || 0).toLocaleString('fr-MA')} MAD`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-MA', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // ── Générer le HTML de la facture ──────────────────────────────────────
  const getFactureHTML = () => {
    if (!facture) return '';
    const lignesHTML = (facture.lignes || []).map((l, i) => {
      const qte   = Number(l.quantite_sacs || 0);
      const prix  = Number(l.prix_unitaire || 0);
      const total = Number(l.total_ligne || qte * prix);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${l.nom_produit || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${l.poids || ''}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${qte}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${prix.toLocaleString('fr-MA')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${total.toLocaleString('fr-MA')}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Facture ${facture.numero_facture}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; color: #111; background: white; }
          .page { max-width: 800px; margin: 0 auto; padding: 40px 30px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #1a3a5c; margin-bottom: 28px; }
          .company-name { font-family: 'Cairo', sans-serif; font-size: 22px; font-weight: 900; color: #1a3a5c; }
          .company-info { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.6; }
          .facture-title { text-align: right; }
          .facture-num { font-size: 20px; font-weight: 700; color: #1a3a5c; }
          .facture-date { font-size: 13px; color: #64748b; margin-top: 4px; }
          .statut { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
          .statut-payee { background: #d1fae5; color: #065f46; }
          .statut-attente { background: #fef3c7; color: #92400e; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .info-box { background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .info-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .info-value { font-size: 14px; font-weight: 600; }
          .info-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #1a3a5c; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; }
          th:last-child, td:last-child { text-align: right; }
          .total-box { background: #0f2240; color: white; padding: 16px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .total-label { font-size: 13px; opacity: 0.8; }
          .total-amount { font-size: 26px; font-weight: 900; color: #e8b53e; font-family: 'Cairo', sans-serif; }
          .prime { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }
          .notes-box { background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
          .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.8; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="company-name">🚛 Trans Commerce TAHA</div>
              <div class="company-info">
                SARL · Res.Rif 2, Imm. A7, Appt. 2 – Témara<br>
                Tél: 06.61.31.69.57 · RC: 96931 · CNSS: 9541279
              </div>
            </div>
            <div class="facture-title">
              <div class="facture-num">FACTURE N° ${facture.numero_facture || '—'}</div>
              <div class="facture-date">Date: ${formatDate(facture.date_facture)}</div>
              <span class="statut ${facture.statut === 'Payée' ? 'statut-payee' : 'statut-attente'}">
                ${facture.statut}
              </span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">👥 Client</div>
              <div class="info-value">${facture.nom_client || '—'}</div>
              <div class="info-sub">${facture.ville_client || ''}</div>
              ${facture.client_telephone ? `<div class="info-sub">${facture.client_telephone}</div>` : ''}
            </div>
            <div class="info-box">
              <div class="info-label">🚛 Chauffeur</div>
              <div class="info-value">${facture.nom_chauffeur || '—'}</div>
              ${facture.matricule_camion ? `<div class="info-sub">Camion: ${facture.matricule_camion}</div>` : ''}
            </div>
            <div class="info-box">
              <div class="info-label">💰 Paiement</div>
              <div class="info-value">${facture.mode_paiement || '—'}</div>
              ${facture.numero_cheque ? `<div class="info-sub">Chèque N°: ${facture.numero_cheque}</div>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Désignation</th>
                <th>Poids</th>
                <th style="text-align:right">Qté (Sacs)</th>
                <th style="text-align:right">Prix/Sac (MAD)</th>
                <th style="text-align:right">Total (MAD)</th>
              </tr>
            </thead>
            <tbody>${lignesHTML}</tbody>
          </table>

          <div class="total-box">
            <div>
              <div class="total-label">MONTANT TOTAL TTC</div>
              ${Number(facture.prime_chauffeur) > 0
                ? `<div class="prime">Prime chauffeur: ${formatMAD(facture.prime_chauffeur)}</div>`
                : ''}
            </div>
            <div class="total-amount">${formatMAD(facture.montant_total)}</div>
          </div>

          ${facture.notes
            ? `<div class="notes-box"><strong>Notes:</strong> ${facture.notes}</div>`
            : ''}

          <div class="footer">
            Trans Commerce TAHA sarl · F.C: 96931 · Patente: 27951651 · I.F: 3307915 · CNSS: 9541279<br>
            Res.Rif 2, Imm. A7, Appt. 2 – Témara · Tél: 06.61.31.69.57
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // ── Imprimer ────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(getFactureHTML());
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  // ── Télécharger PDF ─────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const win = window.open('', '_blank');
    win.document.write(getFactureHTML());
    win.document.close();
    setTimeout(() => {
      win.print(); // Sur mobile/desktop, "Enregistrer en PDF" dans la boîte d'impression
      // Le navigateur propose automatiquement "Enregistrer en PDF"
    }, 600);
  };

  if (loading) return <div className="loading-spinner">Chargement...</div>;
  if (!facture) return <div className="alert alert-error">Facture introuvable.</div>;

  return (
    <div className="detail-facture">

      {/* ── Modal Confirmation Suppression ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="card-title">🗑️ Supprimer la facture</h2>
              <button className="btn-delete" onClick={() => setDeleteConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15 }}>
                Supprimer la facture{' '}
                <strong>{facture.numero_facture}</strong> ?
              </p>
              <p style={{ fontSize: 13, color: '#ef4444', marginTop: 8 }}>
                ⚠️ Cette action est irréversible.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(false)}>
                Annuler
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression...' : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barre d'actions ── */}
      <div className="action-bar no-print">
        <button className="btn-secondary" onClick={() => navigate('/factures')}>
          ← Retour
        </button>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {facture.statut === 'En attente' ? (
            <button className="btn-gold" onClick={() => handleStatut('Payée')}>
              ✅ Marquer Payée
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => handleStatut('En attente')}>
              ⏳ En attente
            </button>
          )}
          <button className="btn-primary"
            onClick={() => navigate(`/factures/${id}/modifier`)}>
            ✏️ Modifier
          </button>
          <button className="btn-primary" onClick={handlePrint}>
            🖨️ Imprimer
          </button>
          <button className="btn-primary" style={{ background: '#16a34a' }}
            onClick={handleDownloadPDF}>
            📥 PDF
          </button>
          <button className="btn-danger" onClick={() => setDeleteConfirm(true)}>
            🗑️ Supprimer
          </button>
        </div>
      </div>

      {/* ── Aperçu de la facture ── */}
      <div ref={printRef}>
        <div className="print-container">

          <div className="print-header">
            <div>
              <div className="company-name">🚛 Trans Commerce TAHA</div>
              <div className="company-sub">SARL · Res.Rif 2, Imm. A7, Appt. 2 – Témara</div>
              <div className="company-sub">Tél: 06.61.31.69.57 · RC: 96931 · CNSS: 9541279</div>
            </div>
            <div className="facture-title">
              <div className="facture-num">FACTURE N° {facture.numero_facture || '—'}</div>
              <div className="facture-date">Date: {formatDate(facture.date_facture)}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`statut-badge ${facture.statut === 'Payée' ? 'badge-green' : 'badge-orange'}`}>
                  {facture.statut}
                </span>
              </div>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-box">
              <div className="info-label">👥 Client</div>
              <div className="info-value">{facture.nom_client || '—'}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {facture.ville_client || ''}
              </div>
              {facture.client_telephone && (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {facture.client_telephone}
                </div>
              )}
            </div>
            <div className="info-box">
              <div className="info-label">🚛 Chauffeur</div>
              <div className="info-value">{facture.nom_chauffeur || '—'}</div>
              {facture.matricule_camion && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Camion: {facture.matricule_camion}
                </div>
              )}
            </div>
            <div className="info-box">
              <div className="info-label">💰 Paiement</div>
              <div className="info-value">{facture.mode_paiement || '—'}</div>
              {facture.numero_cheque && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Chèque N°: {facture.numero_cheque}
                </div>
              )}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Désignation du produit</th>
                <th>Poids</th>
                <th style={{ textAlign: 'right' }}>Qté (Sacs)</th>
                <th style={{ textAlign: 'right' }}>Prix/Sac (MAD)</th>
                <th style={{ textAlign: 'right' }}>Total (MAD)</th>
              </tr>
            </thead>
            <tbody>
              {(facture.lignes || []).map((l, i) => {
                const qte   = Number(l.quantite_sacs || 0);
                const prix  = Number(l.prix_unitaire || 0);
                const total = Number(l.total_ligne || qte * prix);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{l.nom_produit || '—'}</td>
                    <td>{l.poids || ''}</td>
                    <td style={{ textAlign: 'right' }}>{qte}</td>
                    <td style={{ textAlign: 'right' }}>{prix.toLocaleString('fr-MA')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {total.toLocaleString('fr-MA')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="total-section">
            <div>
              <div className="total-label">MONTANT TOTAL TTC</div>
              {Number(facture.prime_chauffeur) > 0 && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                  Prime chauffeur: {formatMAD(facture.prime_chauffeur)}
                </div>
              )}
            </div>
            <div className="total-amount">{formatMAD(facture.montant_total)}</div>
          </div>

          {facture.notes && (
            <div style={{
              marginTop: 16, padding: 12,
              background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a',
              fontSize: 13
            }}>
              <strong>Notes:</strong> {facture.notes}
            </div>
          )}

          <div className="footer">
            <p>Trans Commerce TAHA sarl · F.C: 96931 · Patente: 27951651 · I.F: 3307915 · CNSS: 9541279</p>
            <p style={{ marginTop: 4 }}>
              Res.Rif 2, Imm. A7, Appt. 2 – Témara · Tél: 06.61.31.69.57
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

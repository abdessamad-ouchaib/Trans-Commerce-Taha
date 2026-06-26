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

  useEffect(() => {
    API.get(`/factures/${id}`).then(({ data }) => {
      setFacture(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette facture ?')) return;
    await API.delete(`/factures/${id}`);
    navigate('/factures');
  };

  const handleStatut = async (statut) => {
    const { data } = await API.put(`/factures/${id}`, { statut });
    setFacture(f => ({ ...f, statut: data.statut }));
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Facture ${facture?.numeroFacture}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Cairo', sans-serif; color: #111; background: white; }
        .print-container { max-width: 800px; margin: 0 auto; padding: 30px; }
        .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 3px solid #1a3a5c; padding-bottom: 20px; }
        .company-name { font-family: 'Cairo', sans-serif; font-size: 22px; font-weight: 900; color: #1a3a5c; }
        .company-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
        .facture-title { text-align: right; }
        .facture-num { font-size: 20px; font-weight: 700; color: #1a3a5c; }
        .facture-date { font-size: 13px; color: #64748b; margin-top: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .info-box { background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .info-value { font-size: 14px; font-weight: 600; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #1a3a5c; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .total-section { background: #0f2240; color: white; padding: 16px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
        .total-label { font-size: 14px; opacity: 0.8; }
        .total-amount { font-size: 24px; font-weight: 900; color: #e8b53e; font-family: 'Cairo', sans-serif; }
        .statut-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-orange { background: #fef3c7; color: #92400e; }
        .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
        .prime-row { display: flex; justify-content: space-between; color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 8px; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) return <div className="loading-spinner">Chargement...</div>;
  if (!facture) return <div className="alert alert-error">Facture introuvable.</div>;

  const formatMAD = (n) => `${Number(n || 0).toLocaleString('fr-MA')} MAD`;

  return (
    <div className="detail-facture">
      {/* Action bar */}
      <div className="action-bar no-print">
        <button className="btn-secondary" onClick={() => navigate('/factures')}>← Retour</button>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {facture.statut === 'En attente' ? (
            <button className="btn-gold" onClick={() => handleStatut('Payée')}>✅ Marquer Payée</button>
          ) : (
            <button className="btn-secondary" onClick={() => handleStatut('En attente')}>⏳ Marquer En attente</button>
          )}
          <button className="btn-primary" onClick={() => navigate(`/factures/${id}/modifier`)}>✏️ Modifier</button>
          <button className="btn-primary" onClick={handlePrint}>🖨️ Imprimer</button>
          <button className="btn-danger" onClick={handleDelete}>🗑️ Supprimer</button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef}>
        <div className="print-container">
          {/* Header */}
          <div className="print-header">
            <div>
              <div className="company-name">🚛 Trans Commerce TAHA</div>
              <div className="company-sub">SARL · Res.Rif 2, Imm. A7, Appt. 2 – Témara</div>
              <div className="company-sub">Tél: 06.61.31.69.57 · RC: 96931 · CNSS: 9541279</div>
            </div>
            <div className="facture-title">
              <div className="facture-num">FACTURE N° {facture.numeroFacture}</div>
              <div className="facture-date">Date: {new Date(facture.dateFacture).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div style={{ marginTop: '8px' }}>
                <span className={`statut-badge ${facture.statut === 'Payée' ? 'badge-green' : 'badge-orange'}`}>
                  {facture.statut}
                </span>
              </div>
            </div>
          </div>

          {/* Info boxes */}
          <div className="info-grid">
            <div className="info-box">
              <div className="info-label">👥 Client</div>
              <div className="info-value">{facture.nomClient || facture.client?.nom}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{facture.villeClient || facture.client?.ville}</div>
              {facture.client?.telephone && <div style={{ fontSize: '12px', color: '#64748b' }}>{facture.client.telephone}</div>}
            </div>
            <div className="info-box">
              <div className="info-label">🚛 Chauffeur</div>
              <div className="info-value">{facture.nomChauffeur || `${facture.chauffeur?.prenom} ${facture.chauffeur?.nom}`}</div>
              {facture.matriculeCamion && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Camion: {facture.matriculeCamion}</div>}
            </div>
            <div className="info-box">
              <div className="info-label">💰 Paiement</div>
              <div className="info-value">{facture.modePaiement}</div>
              {facture.numeroCheque && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Chèque N°: {facture.numeroCheque}</div>}
            </div>
          </div>

          {/* Products table */}
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
                const prod = l.produit || {};
                const nomAffiche = l.nomProduit || `${prod.nom || ''} ${prod.poids || ''}`;
                const total = l.quantiteSacs * l.prixUnitaire;
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{nomAffiche}</td>
                    <td>{prod.poids || ''}</td>
                    <td style={{ textAlign: 'right' }}>{l.quantiteSacs}</td>
                    <td style={{ textAlign: 'right' }}>{Number(l.prixUnitaire).toLocaleString('fr-MA')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(total).toLocaleString('fr-MA')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Total */}
          <div className="total-section">
            <div>
              <div className="total-label">MONTANT TOTAL TTC</div>
              {facture.primeChauffeur > 0 && (
                <div className="prime-row">Prime chauffeur: {formatMAD(facture.primeChauffeur)}</div>
              )}
            </div>
            <div className="total-amount">{formatMAD(facture.montantTotal)}</div>
          </div>

          {facture.notes && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <strong>Notes:</strong> {facture.notes}
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>Trans Commerce TAHA sarl · F.C: 96931 · Patente: 27951651 · I.F: 3307915 · CNSS: 9541279</p>
            <p style={{ marginTop: '4px' }}>Res.Rif 2, Imm. A7, Appt. 2 – Témara · Tél: 06.61.31.69.57</p>
          </div>
        </div>
      </div>
    </div>
  );
}

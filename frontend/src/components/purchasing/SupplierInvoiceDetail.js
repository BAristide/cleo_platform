import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const stateLabels = {
  draft: { label: 'Brouillon', bg: '#e2e8f0', color: '#4a5568' },
  validated: { label: 'Validée', bg: '#bee3f8', color: '#2b6cb0' },
  paid: { label: 'Payée', bg: '#c6f6d5', color: '#276749' },
  cancelled: { label: 'Annulée', bg: '#fed7d7', color: '#9b2c2c' },
};

const typeLabels = {
  standard: { label: 'Standard', bg: '#bee3f8', color: '#2b6cb0' },
  credit_note: { label: 'Avoir', bg: '#fefcbf', color: '#975a16' },
};

export default function SupplierInvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [creditNotes, setCreditNotes] = useState([]);
  const [showCNModal, setShowCNModal] = useState(false);
  const [cnForm, setCnForm] = useState({ reason: 'Avoir fournisseur', return_to_stock: false, useFullAmount: true, amount: 0 });
  const [cnLoading, setCnLoading] = useState(false);

  const load = () => {
    axios.get(`/api/purchasing/supplier-invoices/${id}/`).then(r => {
      setInvoice(r.data);
      setCnForm(prev => ({ ...prev, amount: Math.abs(r.data.total) }));
    }).catch(console.error);
    axios.get(`/api/purchasing/supplier-invoices/${id}/credit_notes/`).then(r => setCreditNotes(r.data || [])).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  const handleValidate = () => {
    if (window.confirm('Valider cette facture fournisseur ?')) {
      axios.post(`/api/purchasing/supplier-invoices/${id}/validate/`).then(() => load()).catch(e => alert(e.response?.data?.detail || 'Erreur'));
    }
  };

  const handleCancel = () => {
    if (window.confirm('Annuler cette facture ?')) {
      axios.post(`/api/purchasing/supplier-invoices/${id}/cancel/`).then(() => load()).catch(e => alert(e.response?.data?.detail || 'Erreur'));
    }
  };

  const handleCreateCreditNote = async () => {
    setCnLoading(true);
    try {
      const payload = {
        reason: cnForm.reason,
        return_to_stock: cnForm.return_to_stock,
      };
      if (!cnForm.useFullAmount) {
        payload.amount = cnForm.amount;
      }
      await axios.post(`/api/purchasing/supplier-invoices/${id}/create_credit_note/`, payload);
      alert('Avoir fournisseur créé avec succès');
      setShowCNModal(false);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Erreur lors de la création de l'avoir");
    } finally {
      setCnLoading(false);
    }
  };

  if (!invoice) return <p>Chargement...</p>;
  const s = stateLabels[invoice.state] || {};
  const t = typeLabels[invoice.type] || typeLabels.standard;

  const fmt = (v) => parseFloat(v).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>
            {invoice.type === 'credit_note' ? 'Avoir' : 'Facture'} {invoice.number}
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: t.bg, color: t.color }}>{t.label}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {invoice.state === 'draft' && invoice.type !== 'credit_note' && (
            <button onClick={handleValidate} style={{
              padding: '8px 16px', background: '#38a169', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>Valider</button>
          )}
          {['validated', 'paid'].includes(invoice.state) && invoice.type !== 'credit_note' && (
            <button onClick={() => setShowCNModal(true)} style={{
              padding: '8px 16px', background: '#d69e2e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>Créer un avoir</button>
          )}
          {invoice.state === 'validated' && (
            <Link to={`/purchasing/payments/new?invoice=${id}`} style={{
              padding: '8px 16px', background: '#805ad5', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontSize: 14
            }}>Enregistrer paiement</Link>
          )}
          {['draft', 'validated'].includes(invoice.state) && (
            <button onClick={handleCancel} style={{
              padding: '8px 16px', background: '#e53e3e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>Annuler</button>
          )}
        </div>
      </div>

      {/* Lien facture d'origine pour les avoirs */}
      {invoice.type === 'credit_note' && invoice.parent_invoice_details && (
        <div style={{ background: '#fefcbf', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #f6e05e' }}>
          <strong>Avoir lié à :</strong>{' '}
          <Link to={`/purchasing/invoices/${invoice.parent_invoice_details.id}`}>
            Facture {invoice.parent_invoice_details.number}
          </Link>
          {' '}({fmt(invoice.parent_invoice_details.total)} {invoice.currency_code})
          {invoice.credit_note_reason && <span> — <em>{invoice.credit_note_reason}</em></span>}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Fournisseur</span><br /><strong>{invoice.supplier_name}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Réf. fournisseur</span><br /><strong>{invoice.supplier_reference || '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Date</span><br /><strong>{invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Échéance</span><br /><strong>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '—'}</strong></div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Lignes</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Produit / Description</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Quantité</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>P.U.</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>TVA</th>
              <th style={{ padding: '8px 12px', fontSize: 13, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{item.product_name || item.description}</td>
                <td style={{ padding: '8px 12px' }}>{item.quantity}</td>
                <td style={{ padding: '8px 12px' }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: '8px 12px' }}>{item.tax_rate}%</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#718096', fontSize: 13 }}>HT : {fmt(invoice.subtotal)}</div>
            <div style={{ color: '#718096', fontSize: 13 }}>TVA : {fmt(invoice.tax_amount)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Total : {fmt(invoice.total)} {invoice.currency_code}</div>
            <div style={{ fontSize: 14, color: '#e53e3e', marginTop: 4 }}>Reste dû : {fmt(invoice.amount_due)} {invoice.currency_code}</div>
          </div>
        </div>
      </div>

      {/* Section avoirs associés */}
      {invoice.type !== 'credit_note' && creditNotes.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#d69e2e' }}>Avoirs associés ({creditNotes.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontSize: 13 }}>Numéro</th>
                <th style={{ padding: '8px 12px', fontSize: 13 }}>Date</th>
                <th style={{ padding: '8px 12px', fontSize: 13 }}>Montant</th>
                <th style={{ padding: '8px 12px', fontSize: 13 }}>Motif</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.map(cn => (
                <tr key={cn.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/purchasing/invoices/${cn.id}`}>{cn.number}</Link>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{cn.date ? new Date(cn.date).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#e53e3e', fontWeight: 600 }}>{fmt(cn.total)} {invoice.currency_code}</td>
                  <td style={{ padding: '8px 12px' }}>{cn.credit_note_reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création avoir */}
      {showCNModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 500, maxHeight: '80vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Créer un avoir fournisseur</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Type d'avoir</label>
              <label style={{ marginRight: 16 }}>
                <input type="radio" checked={cnForm.useFullAmount} onChange={() => setCnForm(p => ({ ...p, useFullAmount: true }))} /> Avoir total
              </label>
              <label>
                <input type="radio" checked={!cnForm.useFullAmount} onChange={() => setCnForm(p => ({ ...p, useFullAmount: false }))} /> Avoir partiel
              </label>
            </div>

            {!cnForm.useFullAmount && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Montant ({invoice.currency_code})</label>
                <input
                  type="number" step="0.01" min="0.01" max={Math.abs(invoice.total)}
                  value={cnForm.amount}
                  onChange={e => setCnForm(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Motif</label>
              <textarea
                rows={3} value={cnForm.reason}
                onChange={e => setCnForm(p => ({ ...p, reason: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={cnForm.return_to_stock}
                  onChange={e => setCnForm(p => ({ ...p, return_to_stock: e.target.checked }))}
                  style={{ marginRight: 8 }}
                />
                Retourner les produits au fournisseur (sortie de stock)
              </label>
            </div>

            <div style={{ background: '#ebf8ff', padding: 12, borderRadius: 6, marginBottom: 20, fontSize: 13 }}>
              <strong>Résumé :</strong> Avoir de {cnForm.useFullAmount ? fmt(Math.abs(invoice.total)) : fmt(cnForm.amount)} {invoice.currency_code} sur la facture {invoice.number}.
              {cnForm.return_to_stock && ' Les produits seront retirés du stock.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCNModal(false)} style={{
                padding: '8px 20px', background: '#e2e8f0', color: '#4a5568',
                border: 'none', borderRadius: 6, cursor: 'pointer'
              }}>Annuler</button>
              <button onClick={handleCreateCreditNote} disabled={cnLoading} style={{
                padding: '8px 20px', background: '#d69e2e', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', opacity: cnLoading ? 0.6 : 1,
              }}>{cnLoading ? 'Création...' : "Créer l'avoir"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

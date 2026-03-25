import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { message } from 'antd';
import { handleApiError } from '../../utils/apiUtils';
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

const formatFileSize = (bytes) => {
  if (!bytes) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const mimeIcons = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLS',
  'application/vnd.ms-excel': 'XLS',
  'text/csv': 'XLS',
};

export default function SupplierInvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [creditNotes, setCreditNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCNModal, setShowCNModal] = useState(false);
  const [cnForm, setCnForm] = useState({
    reason: 'Avoir fournisseur',
    return_to_stock: false,
    useFullAmount: true,
    amount: 0,
  });
  const [cnLoading, setCnLoading] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    axios
      .get(`/api/purchasing/supplier-invoices/${id}/`)
      .then((r) => {
        setInvoice(r.data);
        setCnForm((prev) => ({ ...prev, amount: Math.abs(r.data.total) }));
        setDocuments(r.data.documents || []);
      })
      .catch(console.error);

    axios
      .get(`/api/purchasing/supplier-invoices/${id}/credit_notes/`)
      .then((r) => setCreditNotes(r.data || []))
      .catch(() => {});
  };

  const loadDocuments = () => {
    axios
      .get(`/api/purchasing/supplier-invoices/${id}/documents/`)
      .then((r) => {
        setDocuments(r.data || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleValidate = () => {
    if (window.confirm('Valider cette facture fournisseur ?')) {
      axios
        .post(`/api/purchasing/supplier-invoices/${id}/validate/`)
        .then(() => load())
        .catch((e) => handleApiError(e, null, 'Une erreur est survenue.'));
    }
  };

  const handleCancel = () => {
    if (window.confirm('Annuler cette facture ?')) {
      axios
        .post(`/api/purchasing/supplier-invoices/${id}/cancel/`)
        .then(() => load())
        .catch((e) => handleApiError(e, null, 'Une erreur est survenue.'));
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
      await axios.post(
        `/api/purchasing/supplier-invoices/${id}/create_credit_note/`,
        payload
      );
      message.success('Avoir fournisseur créé avec succès.');
      setShowCNModal(false);
      load();
    } catch (e) {
      handleApiError(e, null, "Impossible de créer l'avoir fournisseur.");
    } finally {
      setCnLoading(false);
    }
  };

  // ── Documents / Pièces jointes ─────────────────────────────────

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('description', '');
        await axios.post(
          `/api/purchasing/supplier-invoices/${id}/documents/`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );
      }
      loadDocuments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors du téléversement';
      message.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId, filename) => {
    if (!window.confirm(`Supprimer « ${filename} » ?`)) return;
    try {
      await axios.delete(
        `/api/purchasing/supplier-invoices/${id}/documents/${docId}/`
      );
      loadDocuments();
    } catch (err) {
      message.error('Erreur lors de la suppression.');
    }
  };

  if (!invoice)
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
        Chargement...
      </div>
    );

  const st = stateLabels[invoice.state] || stateLabels.draft;
  const tp = typeLabels[invoice.type] || typeLabels.standard;
  const fmt = (v) =>
    parseFloat(v || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const badgeStyle = (s) => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: s.bg,
    color: s.color,
  });

  const btnStyle = (bg, color = '#fff') => ({
    padding: '8px 18px',
    background: bg,
    color,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    marginRight: 8,
  });

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Facture {invoice.number}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={badgeStyle(st)}>{st.label}</span>
            <span style={badgeStyle(tp)}>{tp.label}</span>
          </div>
        </div>
        <div>
          {invoice.state === 'draft' && (
            <>
              <button onClick={handleValidate} style={btnStyle('#38a169')}>
                Valider
              </button>
              <Link to={`/purchasing/invoices/${id}/edit`}>
                <button style={btnStyle('#3182ce')}>Modifier</button>
              </Link>
              <button onClick={handleCancel} style={btnStyle('#e53e3e')}>
                Annuler
              </button>
            </>
          )}
          {['validated', 'paid'].includes(invoice.state) && invoice.type === 'standard' && (
            <>
              <Link to={`/purchasing/payments/new?invoice=${id}`}>
                <button style={btnStyle('#3182ce')}>Enregistrer paiement</button>
              </Link>
              <button
                onClick={() => setShowCNModal(true)}
                style={btnStyle('#d69e2e')}
              >
                Créer avoir
              </button>
            </>
          )}
          <Link to="/purchasing/invoices">
            <button style={btnStyle('#e2e8f0', '#4a5568')}>Retour</button>
          </Link>
        </div>
      </div>

      {/* ── Infos principales ──────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: 15, color: '#2d3748', marginBottom: 12 }}>
            Informations
          </h3>
          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0', width: 160 }}>
                  Fournisseur
                </td>
                <td style={{ fontWeight: 500 }}>{invoice.supplier_name}</td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>
                  Réf. fournisseur
                </td>
                <td>{invoice.supplier_reference || '—'}</td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>
                  Bon de commande
                </td>
                <td>
                  {invoice.purchase_order ? (
                    <Link to={`/purchasing/orders/${invoice.purchase_order}`}>
                      #{invoice.purchase_order}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>Date</td>
                <td>{invoice.date}</td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>Échéance</td>
                <td>{invoice.due_date || '—'}</td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>Devise</td>
                <td>{invoice.currency_code}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: 15, color: '#2d3748', marginBottom: 12 }}>
            Montants
          </h3>
          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0', width: 160 }}>
                  Sous-total HT
                </td>
                <td style={{ fontWeight: 500 }}>
                  {fmt(invoice.subtotal)} {invoice.currency_code}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>TVA</td>
                <td>
                  {fmt(invoice.tax_amount)} {invoice.currency_code}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ color: '#2d3748', padding: '8px 0', fontWeight: 600 }}>
                  Total TTC
                </td>
                <td style={{ fontWeight: 700, fontSize: 16 }}>
                  {fmt(invoice.total)} {invoice.currency_code}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>Payé</td>
                <td style={{ color: '#38a169' }}>
                  {fmt(invoice.amount_paid)} {invoice.currency_code}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#718096', padding: '4px 0' }}>Reste dû</td>
                <td
                  style={{
                    color:
                      parseFloat(invoice.amount_due) > 0 ? '#e53e3e' : '#38a169',
                    fontWeight: 600,
                  }}
                >
                  {fmt(invoice.amount_due)} {invoice.currency_code}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Parent / Avoirs ────────────────────────────────────── */}
      {invoice.parent_invoice_details && (
        <div
          style={{
            background: '#fffff0',
            border: '1px solid #f6e05e',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <strong>Avoir lié à la facture : </strong>
          <Link to={`/purchasing/invoices/${invoice.parent_invoice_details.id}`}>
            {invoice.parent_invoice_details.number}
          </Link>{' '}
          — Total : {fmt(invoice.parent_invoice_details.total)} {invoice.currency_code}
        </div>
      )}

      {creditNotes.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 15, color: '#2d3748', marginBottom: 12 }}>
            Avoirs associés
          </h3>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Numéro</th>
                <th style={{ padding: '8px 12px' }}>Date</th>
                <th style={{ padding: '8px 12px' }}>Montant</th>
                <th style={{ padding: '8px 12px' }}>Motif</th>
                <th style={{ padding: '8px 12px' }}>État</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.map((cn) => {
                const cnSt = stateLabels[cn.state] || stateLabels.draft;
                return (
                  <tr key={cn.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <Link to={`/purchasing/invoices/${cn.id}`}>{cn.number}</Link>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{cn.date}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {fmt(cn.total)} {invoice.currency_code}
                    </td>
                    <td style={{ padding: '8px 12px' }}>{cn.reason || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={badgeStyle(cnSt)}>{cnSt.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Lignes de facture ──────────────────────────────────── */}
      {invoice.items && invoice.items.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 15, color: '#2d3748', marginBottom: 12 }}>
            Lignes de facture
          </h3>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Produit / Description</th>
                <th style={{ padding: '8px 12px' }}>Réf</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qté</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>P.U. HT</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>TVA</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div>{item.product_name || <span style={{ color: '#94A3B8' }}>—</span>}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#718096' }}>
                    {item.product_reference || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {parseFloat(item.quantity)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {fmt(item.unit_price)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {parseFloat(item.tax_rate)}%
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>
                    {fmt(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pièces jointes ─────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 15, color: '#2d3748', margin: 0 }}>
            📎 Pièces jointes ({documents.length})
          </h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={btnStyle('#3182ce')}
            >
              {uploading ? 'Envoi en cours...' : 'Ajouter un fichier'}
            </button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 20px',
              color: '#a0aec0',
              border: '2px dashed #e2e8f0',
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
            <div>Aucune pièce jointe</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Cliquez sur &quot;Ajouter un fichier&quot; pour joindre un PDF, une image
              ou un tableau Excel
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Fichier</th>
                <th style={{ padding: '8px 12px' }}>Taille</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
                <th style={{ padding: '8px 12px' }}>Téléversé par</th>
                <th style={{ padding: '8px 12px' }}>Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ marginRight: 6 }}>
                      {mimeIcons[doc.mime_type] || '📁'}
                    </span>
                    {doc.filename}
                    {doc.description && (
                      <div style={{ fontSize: 12, color: '#a0aec0' }}>{doc.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#718096' }}>
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#718096' }}>
                    {(doc.mime_type || '').split('/').pop()?.toUpperCase() || '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{doc.uploaded_by_name || '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#718096' }}>
                    {doc.uploaded_at
                      ? new Date(doc.uploaded_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {doc.download_url ? (
                      <a
                        href={doc.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#3182ce',
                          textDecoration: 'none',
                          marginRight: 12,
                          fontWeight: 500,
                        }}
                      >
                        Télécharger
                      </a>
                    ) : (
                      <span style={{ marginRight: 12, color: '#a0aec0' }}>—</span>
                    )}
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e53e3e',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────────────── */}
      {invoice.notes && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: 15, color: '#2d3748', marginBottom: 8 }}>Notes</h3>
          <p style={{ color: '#4a5568', whiteSpace: 'pre-line' }}>{invoice.notes}</p>
        </div>
      )}

      {/* ── Modal Avoir ────────────────────────────────────────── */}
      {showCNModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 450, maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Créer un avoir fournisseur</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#4a5568' }}>Motif</label>
              <input
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  boxSizing: 'border-box',
                }}
                value={cnForm.reason}
                onChange={(e) => setCnForm({ ...cnForm, reason: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cnForm.useFullAmount}
                  onChange={(e) => setCnForm({ ...cnForm, useFullAmount: e.target.checked })}
                />
                Montant total ({fmt(Math.abs(invoice.total))} {invoice.currency_code})
              </label>
            </div>
            {!cnForm.useFullAmount && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#4a5568' }}>Montant partiel</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.abs(invoice.total)}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    boxSizing: 'border-box',
                  }}
                  value={cnForm.amount}
                  onChange={(e) => setCnForm({ ...cnForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cnForm.return_to_stock}
                  onChange={(e) => setCnForm({ ...cnForm, return_to_stock: e.target.checked })}
                />
                Retour en stock des articles
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCNModal(false)}
                style={btnStyle('#e2e8f0', '#4a5568')}
                disabled={cnLoading}
              >
                Annuler
              </button>
              <button onClick={handleCreateCreditNote} style={btnStyle('#d69e2e')} disabled={cnLoading}>
                {cnLoading ? 'Création...' : "Créer l'avoir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

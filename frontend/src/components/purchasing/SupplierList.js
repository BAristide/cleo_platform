import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    axios.get('/api/purchasing/suppliers/').then(r => setSuppliers(r.data.results || r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Fournisseurs</h1>
        <Link to="/purchasing/suppliers/new" style={{
          padding: '8px 16px', background: '#3182ce', color: '#fff',
          borderRadius: 6, textDecoration: 'none', fontSize: 14
        }}>+ Ajouter</Link>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Code</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Nom</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Contact</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Email</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Devise</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Statut</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{s.code}</td>
              <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.name}</td>
              <td style={{ padding: '12px 16px' }}>{s.contact_name || '—'}</td>
              <td style={{ padding: '12px 16px' }}>{s.email || '—'}</td>
              <td style={{ padding: '12px 16px' }}>{s.currency_code || '—'}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 12,
                  background: s.is_active ? '#c6f6d5' : '#fed7d7',
                  color: s.is_active ? '#276749' : '#9b2c2c'
                }}>{s.is_active ? 'Actif' : 'Inactif'}</span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <Link to={`/purchasing/suppliers/${s.id}/edit`} style={{ color: '#3182ce', fontSize: 13 }}>Modifier</Link>
              </td>
            </tr>
          ))}
          {suppliers.length === 0 && (
            <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: '#a0aec0' }}>Aucun fournisseur</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

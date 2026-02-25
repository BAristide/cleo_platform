import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/purchasing', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/purchasing/suppliers', label: 'Fournisseurs', icon: '🏭' },
  { to: '/purchasing/orders', label: 'Bons de commande', icon: '📋' },
  { to: '/purchasing/receptions', label: 'Réceptions', icon: '📦' },
  { to: '/purchasing/invoices', label: 'Factures fournisseur', icon: '🧾' },
  { to: '/purchasing/payments', label: 'Paiements', icon: '💳' },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240, background: '#1a202c', color: '#fff',
        padding: '20px 0', flexShrink: 0
      }}>
        <h2 style={{
          padding: '0 20px 20px', margin: 0, fontSize: 18,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          Module Achats
        </h2>
        <nav style={{ marginTop: 10 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', color: isActive ? '#63b3ed' : '#cbd5e0',
                textDecoration: 'none', fontSize: 14,
                background: isActive ? 'rgba(99,179,237,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #63b3ed' : '3px solid transparent',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24, background: '#f7fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}

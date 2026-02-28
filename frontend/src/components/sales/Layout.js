// src/components/sales/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, FileTextOutlined, ShoppingCartOutlined,
  BankOutlined, DollarOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/sales">Tableau de bord</Link> },
  { key: 'quotes', icon: <FileTextOutlined />, label: <Link to="/sales/quotes">Devis</Link> },
  { key: 'orders', icon: <ShoppingCartOutlined />, label: <Link to="/sales/orders">Commandes</Link> },
  { key: 'invoices', icon: <FileTextOutlined />, label: <Link to="/sales/invoices">Factures</Link> },
  { key: 'credit-notes', icon: <FileTextOutlined />, label: <Link to="/sales/credit-notes">Avoirs</Link> },
  { key: 'payments', icon: <DollarOutlined />, label: <Link to="/sales/payments">Paiements</Link> },
  { key: 'products', icon: <AppstoreOutlined />, label: <Link to="/catalog/products">Produits</Link> },
  { key: 'bank-accounts', icon: <BankOutlined />, label: <Link to="/sales/bank-accounts">Comptes bancaires</Link> },
];

const breadcrumbMap = {
  quotes: 'Devis', orders: 'Commandes', invoices: 'Factures',
  'credit-notes': 'Avoirs', payments: 'Paiements', products: 'Produits',
  'bank-accounts': 'Comptes bancaires',
};

const SalesLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Module Ventes" basePath="/sales" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default SalesLayout;

// src/components/purchasing/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, ShopOutlined, FileTextOutlined,
  InboxOutlined, AccountBookOutlined, DollarOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/purchasing">Tableau de bord</Link> },
  { key: 'suppliers', icon: <ShopOutlined />, label: <Link to="/purchasing/suppliers">Fournisseurs</Link> },
  { key: 'orders', icon: <FileTextOutlined />, label: <Link to="/purchasing/orders">Bons de commande</Link> },
  { key: 'receptions', icon: <InboxOutlined />, label: <Link to="/purchasing/receptions">Réceptions</Link> },
  { key: 'invoices', icon: <AccountBookOutlined />, label: <Link to="/purchasing/invoices">Factures fournisseur</Link> },
  { key: 'payments', icon: <DollarOutlined />, label: <Link to="/purchasing/payments">Paiements</Link> },
];

const breadcrumbMap = {
  suppliers: 'Fournisseurs', orders: 'Bons de commande', receptions: 'Réceptions',
  invoices: 'Factures fournisseur', payments: 'Paiements',
};

const PurchasingLayout = () => (
  <ModuleLayout moduleTitle="Module Achats" basePath="/purchasing" menuItems={menuItems} breadcrumbMap={breadcrumbMap} useOutlet />
);

export default PurchasingLayout;

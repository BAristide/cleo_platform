// src/components/inventory/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, HomeOutlined, BarChartOutlined, SwapOutlined,
  WarningOutlined, AuditOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/inventory">Tableau de bord</Link> },
  { key: 'warehouses', icon: <HomeOutlined />, label: <Link to="/inventory/warehouses">Entrepôts</Link> },
  { key: 'stock-levels', icon: <BarChartOutlined />, label: <Link to="/inventory/stock-levels">Niveaux de stock</Link> },
  { key: 'stock-moves', icon: <SwapOutlined />, label: <Link to="/inventory/stock-moves">Mouvements</Link> },
  { key: 'alerts', icon: <WarningOutlined />, label: <Link to="/inventory/alerts">Alertes</Link> },
  { key: 'inventories', icon: <AuditOutlined />, label: <Link to="/inventory/inventories">Inventaires</Link> },
  { key: 'categories', icon: <AppstoreOutlined />, label: <Link to="/inventory/categories">Catégories</Link> },
];

const breadcrumbMap = {
  warehouses: 'Entrepôts', 'stock-levels': 'Niveaux de stock', 'stock-moves': 'Mouvements',
  alerts: 'Alertes', inventories: 'Inventaires', categories: 'Catégories',
};

const InventoryLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Gestion des Stocks" basePath="/inventory" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default InventoryLayout;

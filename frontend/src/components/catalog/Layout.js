// src/components/catalog/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, AppstoreOutlined, TagsOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/catalog">Tableau de bord</Link> },
  { key: 'products', icon: <AppstoreOutlined />, label: <Link to="/catalog/products">Produits</Link> },
  { key: 'categories', icon: <TagsOutlined />, label: <Link to="/catalog/categories">Categories</Link> },
];

const breadcrumbMap = {
  products: 'Produits',
  categories: 'Categories',
};

const CatalogLayout = ({ children }) => (
  <ModuleLayout moduleTitle="Catalogue" basePath="/catalog" menuItems={menuItems} breadcrumbMap={breadcrumbMap}>
    {children}
  </ModuleLayout>
);

export default CatalogLayout;

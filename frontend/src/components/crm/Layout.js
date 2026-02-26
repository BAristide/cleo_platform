// src/components/crm/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardOutlined, UserOutlined, ShopOutlined, FundOutlined, ScheduleOutlined,
} from '@ant-design/icons';
import ModuleLayout from '../common/ModuleLayout';

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/crm/dashboard">Tableau de bord</Link> },
  { key: 'contacts', icon: <UserOutlined />, label: <Link to="/crm/contacts">Contacts</Link> },
  { key: 'companies', icon: <ShopOutlined />, label: <Link to="/crm/companies">Entreprises</Link> },
  { key: 'opportunities', icon: <FundOutlined />, label: <Link to="/crm/opportunities">Opportunités</Link> },
  { key: 'activities', icon: <ScheduleOutlined />, label: <Link to="/crm/activities">Activités</Link> },
];

const breadcrumbMap = {
  dashboard: 'Tableau de bord', contacts: 'Contacts', companies: 'Entreprises',
  opportunities: 'Opportunités', activities: 'Activités',
};

const CRMLayout = () => (
  <ModuleLayout moduleTitle="Module CRM" basePath="/crm" menuItems={menuItems} breadcrumbMap={breadcrumbMap} useOutlet />
);

export default CRMLayout;

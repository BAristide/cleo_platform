// src/components/crm/Routes.js - Mise à jour avec les nouveaux composants
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, Typography } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShopOutlined,
  FundOutlined,
  ScheduleOutlined,
  HomeOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';



// Import des composants CRM
import CRMDashboard from './Dashboard';
import ContactList from './ContactList';
import ContactDetail from './ContactDetail';
import ContactForm from './forms/ContactForm';
import CompanyList from './CompanyList';
import CompanyDetail from './CompanyDetail';
import CompanyForm from './forms/CompanyForm';
import OpportunityList from './OpportunityList';
import OpportunityDetail from './OpportunityDetail';
import OpportunityForm from './forms/OpportunityForm';
import ActivityList from './ActivityList';
import ActivityDetail from './ActivityDetail';
import ActivityForm from './forms/ActivityForm';

const { Content, Sider } = Layout;
const { Title } = Typography;
const CRMLayout = () => {
  const location = useLocation();

  // Déterminer la clé sélectionnée dans le menu
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/crm/contacts')) return '2';
    if (path.includes('/crm/companies')) return '3';
    if (path.includes('/crm/opportunities')) return '4';
    if (path.includes('/crm/activities')) return '5';
    return '1';
  };

  // Éléments du fil d'Ariane
  const getBreadcrumbItems = () => {
    const paths = location.pathname.split('/').filter(i => i);
    const result = [];

    result.push(
      <Breadcrumb.Item key="home">
        <Link to="/"><HomeOutlined /> Home</Link>
      </Breadcrumb.Item>
    );

    result.push(
      <Breadcrumb.Item key="crm">
        <Link to="/crm"><AppstoreOutlined /> CRM</Link>
      </Breadcrumb.Item>
    );

    if (paths.length > 1 && paths[0] === 'crm') {
      const module = paths[1];
      const moduleMap = {
        'dashboard': 'Tableau de bord',
        'contacts': 'Contacts',
        'companies': 'Entreprises',
        'opportunities': 'Opportunités',
        'activities': 'Activités',
      };
      if (module && moduleMap[module]) {
        result.push(
          <Breadcrumb.Item key={module}>
            <Link to={`/crm/${module}`}>{moduleMap[module]}</Link>
          </Breadcrumb.Item>
        );
      }

      if (paths.length > 2 && paths[2] === 'new') {
        result.push(<Breadcrumb.Item key="new">Nouveau</Breadcrumb.Item>);
      }
      if (paths.length > 2 && !['new', 'edit'].includes(paths[2])) {
        result.push(<Breadcrumb.Item key="detail">Détail</Breadcrumb.Item>);
      }
      if (paths.length > 3 && paths[3] === 'edit') {
        result.push(<Breadcrumb.Item key="edit">Modification</Breadcrumb.Item>);
      }
    }

    return result;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} className="site-layout-background" collapsible theme="dark">
        <div className="logo" style={{ height: '64px', padding: '16px', textAlign: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Cleo ERP</Title>
          </Link>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          style={{ height: '100%', borderRight: 0 }}
          theme="dark"
        >
          <Menu.Item key="1" icon={<DashboardOutlined />}>
            <Link to="/crm/dashboard">Tableau de bord</Link>
          </Menu.Item>
          <Menu.Item key="2" icon={<UserOutlined />}>
            <Link to="/crm/contacts">Contacts</Link>
          </Menu.Item>
          <Menu.Item key="3" icon={<ShopOutlined />}>
            <Link to="/crm/companies">Entreprises</Link>
          </Menu.Item>
          <Menu.Item key="4" icon={<FundOutlined />}>
            <Link to="/crm/opportunities">Opportunités</Link>
          </Menu.Item>
          <Menu.Item key="5" icon={<ScheduleOutlined />}>
            <Link to="/crm/activities">Activités</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content
          className="site-layout-background"
          style={{
            padding: 24,
            margin: 0,
            minHeight: 280,
          }}
        >
          <Breadcrumb style={{ marginBottom: '16px' }}>
            {getBreadcrumbItems()}
          </Breadcrumb>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

const CRMRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<CRMLayout />}>
        <Route index element={<Navigate to="/crm/dashboard" replace />} />
        <Route path="dashboard" element={<CRMDashboard />} />

        {/* Routes pour les contacts */}
        <Route path="contacts" element={<ContactList />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="contacts/new" element={<ContactForm />} />
        <Route path="contacts/:id/edit" element={<ContactForm />} />

        {/* Routes pour les entreprises */}
        <Route path="companies" element={<CompanyList />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="companies/new" element={<CompanyForm />} />
        <Route path="companies/:id/edit" element={<CompanyForm />} />
        <Route path="companies/:id/contacts" element={<ContactList />} />
        <Route path="companies/:id/opportunities" element={<OpportunityList />} />

        {/* Routes pour les opportunités */}
        <Route path="opportunities" element={<OpportunityList />} />
        <Route path="opportunities/:id" element={<OpportunityDetail />} />
        <Route path="opportunities/new" element={<OpportunityForm />} />
        <Route path="opportunities/:id/edit" element={<OpportunityForm />} />

        {/* Routes pour les activités */}
        <Route path="activities" element={<ActivityList />} />
        <Route path="activities/:id" element={<ActivityDetail />} />
        <Route path="activities/new" element={<ActivityForm />} />
        <Route path="activities/:id/edit" element={<ActivityForm />} />

        {/* Route par défaut pour les URL invalides */}
        <Route path="*" element={<Navigate to="/crm/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default CRMRoutes;
